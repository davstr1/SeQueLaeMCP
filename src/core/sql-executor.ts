import { Pool, QueryResult as PgQueryResult } from 'pg';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

export interface QueryResult {
  command?: string;
  rowCount?: number;
  rows?: Record<string, unknown>[];
  duration?: number;
}

export interface SchemaResult {
  tables: TableInfo[];
  missingTables?: MissingTableInfo[];
}

export interface TableInfo {
  schema: string;
  name: string;
  columns: ColumnInfo[];
  constraints: ConstraintInfo[];
}

export interface ColumnInfo {
  column_name: string;
  data_type: string;
  is_nullable: string;
  column_default: string | null;
  character_maximum_length: number | null;
}

export interface ConstraintInfo {
  constraint_type: string;
  constraint_name: string;
  column_name: string;
}

export interface MissingTableInfo {
  table_name: string;
  suggestions: string[];
}

export class SqlExecutor {
  private pool: Pool;

  constructor(connectionString: string) {
    this.pool = new Pool({
      connectionString,
      ssl: { rejectUnauthorized: false },
    });
  }

  async executeQuery(sql: string): Promise<QueryResult> {
    const start = Date.now();
    const result = await this.pool.query(sql);
    const duration = Date.now() - start;

    return {
      command: result.command,
      rowCount: result.rowCount || 0,
      rows: result.rows || [],
      duration,
    };
  }

  async executeFile(filepath: string): Promise<QueryResult> {
    const resolvedPath = resolve(process.cwd(), filepath);

    if (!existsSync(resolvedPath)) {
      throw new Error(`File not found: ${resolvedPath}`);
    }

    const sql = readFileSync(resolvedPath, 'utf8');
    return this.executeQuery(sql);
  }

  async getSchema(tables?: string[], allSchemas = false): Promise<SchemaResult> {
    const schemaCondition = allSchemas
      ? "table_schema NOT IN ('pg_catalog', 'information_schema')"
      : "table_schema = 'public'";

    let sql: string;

    if (tables && tables.length > 0) {
      const tableCondition = tables.map(t => `'${t}'`).join(',');
      sql = this.buildSpecificTablesQuery(tableCondition, schemaCondition);
    } else {
      sql = this.buildAllTablesQuery(schemaCondition);
    }

    const result = await this.pool.query(sql);
    return this.parseSchemaResult(result);
  }

  async close(): Promise<void> {
    await this.pool.end();
  }

  private buildSpecificTablesQuery(tableCondition: string, schemaCondition: string): string {
    return `
      WITH requested_tables AS (
        SELECT unnest(ARRAY[${tableCondition}]) as table_name
      ),
      existing_tables AS (
        SELECT table_schema, table_name 
        FROM information_schema.tables 
        WHERE table_type = 'BASE TABLE' 
          AND ${schemaCondition}
      ),
      table_info AS (
        SELECT 
          t.table_schema,
          t.table_name,
          json_agg(
            json_build_object(
              'column_name', c.column_name,
              'data_type', c.data_type,
              'is_nullable', c.is_nullable,
              'column_default', c.column_default,
              'character_maximum_length', c.character_maximum_length
            ) ORDER BY c.ordinal_position
          )::text as columns
        FROM information_schema.tables t
        JOIN information_schema.columns c 
          ON t.table_schema = c.table_schema 
          AND t.table_name = c.table_name
        JOIN requested_tables rt ON t.table_name = rt.table_name
        WHERE ${schemaCondition}
          AND t.table_type = 'BASE TABLE'
        GROUP BY t.table_schema, t.table_name
      ),
      constraint_info AS (
        SELECT 
          tc.table_schema,
          tc.table_name,
          json_agg(
            json_build_object(
              'constraint_name', tc.constraint_name,
              'constraint_type', tc.constraint_type,
              'column_name', kcu.column_name
            )
          )::text as constraints
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        JOIN requested_tables rt ON tc.table_name = rt.table_name
        WHERE ${schemaCondition}
        GROUP BY tc.table_schema, tc.table_name
      ),
      missing_tables AS (
        SELECT rt.table_name as missing_table,
               string_agg(et.table_name, ', ') as suggestions
        FROM requested_tables rt
        LEFT JOIN existing_tables et ON rt.table_name = et.table_name
        WHERE et.table_name IS NULL
        GROUP BY rt.table_name
      )
      SELECT 
        'found' as type,
        ti.table_schema,
        ti.table_name,
        ti.columns,
        COALESCE(ci.constraints, '[]') as constraints,
        NULL as missing_table,
        NULL as suggestions
      FROM table_info ti
      LEFT JOIN constraint_info ci
        ON ti.table_schema = ci.table_schema
        AND ti.table_name = ci.table_name
      UNION ALL
      SELECT 
        'missing' as type,
        NULL as table_schema,
        NULL as table_name,
        NULL as columns,
        NULL as constraints,
        mt.missing_table,
        (SELECT string_agg(tn, ', ') FROM (
           SELECT table_name as tn
           FROM existing_tables
           WHERE LOWER(table_name) LIKE LOWER(LEFT(mt.missing_table, 3) || '%')
              OR LOWER(table_name) LIKE '%' || LOWER(LEFT(mt.missing_table, 3)) || '%'
           ORDER BY 
             CASE WHEN LOWER(table_name) LIKE LOWER(LEFT(mt.missing_table, 3) || '%') THEN 0 ELSE 1 END,
             LENGTH(table_name)
           LIMIT 3
         ) s) as suggestions
      FROM missing_tables mt
      ORDER BY type, table_schema, table_name;
    `;
  }

  private buildAllTablesQuery(schemaCondition: string): string {
    return `
      WITH table_info AS (
        SELECT 
          t.table_schema,
          t.table_name,
          json_agg(
            json_build_object(
              'column_name', c.column_name,
              'data_type', c.data_type,
              'is_nullable', c.is_nullable,
              'column_default', c.column_default,
              'character_maximum_length', c.character_maximum_length
            ) ORDER BY c.ordinal_position
          )::text as columns
        FROM information_schema.tables t
        JOIN information_schema.columns c 
          ON t.table_schema = c.table_schema 
          AND t.table_name = c.table_name
        WHERE ${schemaCondition}
          AND t.table_type = 'BASE TABLE'
        GROUP BY t.table_schema, t.table_name
      ),
      constraint_info AS (
        SELECT 
          tc.table_schema,
          tc.table_name,
          json_agg(
            json_build_object(
              'constraint_name', tc.constraint_name,
              'constraint_type', tc.constraint_type,
              'column_name', kcu.column_name
            )
          )::text as constraints
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        WHERE ${schemaCondition}
        GROUP BY tc.table_schema, tc.table_name
      )
      SELECT 
        'found' as type,
        ti.table_schema,
        ti.table_name,
        ti.columns,
        COALESCE(ci.constraints, '[]') as constraints,
        NULL as missing_table,
        NULL as suggestions
      FROM table_info ti
      LEFT JOIN constraint_info ci
        ON ti.table_schema = ci.table_schema
        AND ti.table_name = ci.table_name
      ORDER BY ti.table_schema, ti.table_name;
    `;
  }

  private parseSchemaResult(result: PgQueryResult): SchemaResult {
    const tables: TableInfo[] = [];
    const missingTables: MissingTableInfo[] = [];

    for (const row of result.rows) {
      if (row.type === 'found') {
        tables.push({
          schema: row.table_schema as string,
          name: row.table_name as string,
          columns: JSON.parse(row.columns as string),
          constraints: JSON.parse(row.constraints as string),
        });
      } else if (row.type === 'missing') {
        missingTables.push({
          table_name: row.missing_table as string,
          suggestions: row.suggestions ? (row.suggestions as string).split(', ') : [],
        });
      }
    }

    return {
      tables,
      ...(missingTables.length > 0 && { missingTables }),
    };
  }
}
