import { QueryResult as PgQueryResult } from 'pg';
import { PoolManager } from './pool-manager';
import { readFileSync, existsSync, statSync, accessSync, constants } from 'fs';
import { resolve, dirname, isAbsolute, normalize } from 'path';
import { spawn } from 'child_process';
import { BackupOptions, BackupResult } from '../types/backup';
import { logger } from '../utils/logger';

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
  private poolManager: PoolManager;
  private connectionString: string;

  constructor(connectionString: string) {
    this.connectionString = connectionString;
    this.poolManager = PoolManager.getInstance();

    // Configure SSL based on environment variables
    const sslMode = process.env.POSTGRES_SSL_MODE || 'require';
    const rejectUnauthorized = process.env.POSTGRES_SSL_REJECT_UNAUTHORIZED !== 'false';

    let sslConfig: boolean | { rejectUnauthorized: boolean } = false;

    if (sslMode !== 'disable') {
      sslConfig = {
        rejectUnauthorized: rejectUnauthorized,
      };

      // For verify-ca and verify-full modes, ensure rejectUnauthorized is true
      if (sslMode === 'verify-ca' || sslMode === 'verify-full') {
        sslConfig.rejectUnauthorized = true;
      }
    }

    // Configure connection timeout from environment or use default
    const connectionTimeoutMillis = process.env.POSTGRES_CONNECTION_TIMEOUT
      ? parseInt(process.env.POSTGRES_CONNECTION_TIMEOUT)
      : 30000; // 30 seconds default

    const idleTimeoutMillis = process.env.POSTGRES_IDLE_TIMEOUT
      ? parseInt(process.env.POSTGRES_IDLE_TIMEOUT)
      : 10000; // 10 seconds default

    const max = process.env.POSTGRES_MAX_CONNECTIONS
      ? parseInt(process.env.POSTGRES_MAX_CONNECTIONS)
      : 10; // 10 connections default

    const statementTimeout = process.env.POSTGRES_STATEMENT_TIMEOUT
      ? parseInt(process.env.POSTGRES_STATEMENT_TIMEOUT)
      : 120000; // 2 minutes default

    // Initialize pool manager if not already initialized
    if (!this.poolManager.isInitialized()) {
      this.poolManager.initialize({
        connectionString,
        ssl: sslConfig,
        maxConnections: max,
        idleTimeoutMillis,
        connectionTimeoutMillis,
        statementTimeout,
      });
    }
  }

  async executeQuery(
    sql: string,
    useTransaction: boolean = true,
    timeoutMs?: number
  ): Promise<QueryResult> {
    const start = Date.now();
    const pool = this.poolManager.getPool();
    const client = await pool.connect();

    // Set statement timeout if provided
    if (timeoutMs && timeoutMs > 0) {
      try {
        await client.query(`SET statement_timeout = ${timeoutMs}`);
      } catch (error) {
        client.release();
        throw error;
      }
    }

    try {
      if (useTransaction && !this.isTransactionCommand(sql)) {
        await client.query('BEGIN');
      }

      const result = await client.query(sql);

      if (useTransaction && !this.isTransactionCommand(sql)) {
        await client.query('COMMIT');
      }

      const duration = Date.now() - start;

      return {
        command: result.command,
        rowCount: result.rowCount || 0,
        rows: result.rows || [],
        duration,
      };
    } catch (error) {
      if (useTransaction && !this.isTransactionCommand(sql)) {
        try {
          await client.query('ROLLBACK');
        } catch (rollbackError) {
          logger.error('Error during rollback:', { error: rollbackError });
        }
      }
      throw error;
    } finally {
      client.release();
    }
  }

  private isTransactionCommand(sql: string): boolean {
    const trimmedSql = sql.trim().toUpperCase();
    return (
      trimmedSql.startsWith('BEGIN') ||
      trimmedSql.startsWith('COMMIT') ||
      trimmedSql.startsWith('ROLLBACK') ||
      trimmedSql.startsWith('START TRANSACTION')
    );
  }

  async executeFile(
    filepath: string,
    useTransaction: boolean = true,
    timeoutMs?: number
  ): Promise<QueryResult> {
    const resolvedPath = resolve(process.cwd(), filepath);

    if (!existsSync(resolvedPath)) {
      throw new Error(`File not found: ${resolvedPath}`);
    }

    const sql = readFileSync(resolvedPath, 'utf8');
    return this.executeQuery(sql, useTransaction, timeoutMs);
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

    const pool = this.poolManager.getPool();
    const result = await pool.query(sql);
    return this.parseSchemaResult(result);
  }

  async close(): Promise<void> {
    // Don't close the shared pool, just mark this executor as closed
    // The pool will be closed when the application exits
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

  async backup(options: BackupOptions = {}): Promise<BackupResult> {
    const start = Date.now();

    try {
      // Check if pg_dump is available
      const { execSync } = await import('child_process');
      try {
        execSync('which pg_dump', { stdio: 'ignore' });
      } catch (_error) {
        throw new Error(
          'pg_dump not found. Please ensure PostgreSQL client tools are installed.\n' +
            'Install with:\n' +
            '  - macOS: brew install postgresql\n' +
            '  - Ubuntu/Debian: apt-get install postgresql-client\n' +
            '  - RHEL/CentOS: yum install postgresql'
        );
      }

      // Validate mutually exclusive options
      if (options.dataOnly && options.schemaOnly) {
        throw new Error('Cannot specify both dataOnly and schemaOnly options');
      }

      // Parse connection string
      const url = new URL(this.connectionString);

      // Build pg_dump arguments
      const args: string[] = [
        '-h',
        url.hostname,
        '-p',
        url.port || '5432',
        '-U',
        url.username,
        '-d',
        url.pathname.slice(1),
        '--no-password',
      ];

      // Add format option
      if (options.format && options.format !== 'plain') {
        args.push('-F', options.format.charAt(0));
      }

      // Add table selections with proper quoting
      if (options.tables?.length) {
        options.tables.forEach(table => {
          // Quote table names that contain special characters
          const quotedTable =
            table.includes('.') || /[^a-zA-Z0-9_]/.test(table)
              ? `"${table.replace(/"/g, '""')}"`
              : table;
          args.push('-t', quotedTable);
        });
      }

      // Add schema selections with proper quoting
      if (options.schemas?.length) {
        options.schemas.forEach(schema => {
          // Quote schema names that contain special characters
          const quotedSchema = /[^a-zA-Z0-9_]/.test(schema)
            ? `"${schema.replace(/"/g, '""')}"`
            : schema;
          args.push('-n', quotedSchema);
        });
      }

      // Data/schema only options
      if (options.dataOnly) args.push('-a');
      if (options.schemaOnly) args.push('-s');

      // Compression for custom format
      if (options.compress && (!options.format || options.format === 'custom')) {
        args.push('-Z', '6');
      }

      // Output file validation and sanitization
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      const defaultExt =
        options.format === 'custom'
          ? 'dump'
          : options.format === 'tar'
            ? 'tar'
            : options.format === 'directory'
              ? ''
              : 'sql';
      let outputPath = options.outputPath || `backup_${timestamp}.${defaultExt}`;

      // Prevent directory traversal attacks
      outputPath = normalize(outputPath);
      if (outputPath.includes('..')) {
        throw new Error('Invalid output path: directory traversal not allowed');
      }

      // Make path absolute if not already
      if (!isAbsolute(outputPath)) {
        outputPath = resolve(process.cwd(), outputPath);
      }

      // Check if directory is writable
      const outputDir = dirname(outputPath);
      try {
        accessSync(outputDir, constants.W_OK);
      } catch (_error) {
        throw new Error(`Output directory not writable: ${outputDir}`);
      }

      if (options.format !== 'directory') {
        args.push('-f', outputPath);
      } else {
        args.push('-f', outputPath);
        args.push('-j', '4'); // Use 4 parallel jobs for directory format
      }

      // Execute pg_dump
      const env = { ...process.env, PGPASSWORD: url.password };

      return new Promise((resolve, reject) => {
        const proc = spawn('pg_dump', args, { env });
        let stderr = '';

        proc.stderr.on('data', data => {
          stderr += data.toString();
        });

        proc.on('close', code => {
          if (code === 0) {
            // Calculate file size
            let size: number | undefined;
            try {
              const stats = statSync(outputPath);
              size = stats.size;
            } catch (_e) {
              // Size calculation is optional
            }

            resolve({
              success: true,
              outputPath,
              size,
              duration: Date.now() - start,
            });
          } else {
            reject(new Error(`pg_dump failed with exit code ${code}: ${stderr}`));
          }
        });

        proc.on('error', error => {
          if (error.message.includes('ENOENT')) {
            reject(
              new Error('pg_dump not found. Please ensure PostgreSQL client tools are installed.')
            );
          } else {
            reject(new Error(`Failed to execute pg_dump: ${error.message}`));
          }
        });
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        outputPath: '',
        duration: Date.now() - start,
        error: errorMessage,
      };
    }
  }
}
