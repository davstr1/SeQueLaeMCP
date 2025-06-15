#!/usr/bin/env node
import { Pool } from 'pg';
import { config } from 'dotenv';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import * as packageJson from '../package.json';

interface Constraint {
  constraint_type: string;
  constraint_name: string;
  column_name: string;
}

interface Column {
  column_name: string;
  data_type: string;
  is_nullable: string;
  column_default: string | null;
  character_maximum_length: number | null;
}

// Load .env from the package root (handles both root and subdirectory execution)
const envPath = resolve(__dirname, '../.env');
config({ path: envPath });

export function handleVersion(jsonMode: boolean): string {
  if (jsonMode) {
    return JSON.stringify({ version: packageJson.version });
  } else {
    return `sql-agent-cli v${packageJson.version}`;
  }
}

export function handleHelp(jsonMode: boolean): string {
  if (jsonMode) {
    return JSON.stringify({
      usage: [
        'sql-agent exec "SQL query"         Execute a SQL query',
        'sql-agent file path/to/query.sql   Execute SQL from file',
        'sql-agent schema                   Show all tables in public schema',
        'sql-agent schema [tables]          Show specific table(s) - comma separated',
        'sql-agent schema --all             Show all schemas including system tables',
        'sql-agent exit                     Exit sql-agent',
        'sql-agent --json                   Output results in JSON format',
      ],
      examples: [
        'sql-agent exec "SELECT * FROM users"',
        'sql-agent exec "CREATE TABLE posts (id serial primary key, title text)"',
        'sql-agent file migrations/001_init.sql',
        'sql-agent schema',
        'sql-agent schema users,posts',
        'sql-agent --json exec "SELECT * FROM users"',
      ],
    });
  } else {
    return `
Usage:
  sql-agent exec "SQL query"         Execute a SQL query
  sql-agent file path/to/query.sql   Execute SQL from file
  sql-agent schema                   Show all tables in public schema
  sql-agent schema [tables]          Show specific table(s) - comma separated
  sql-agent schema --all             Show all schemas including system tables
  sql-agent exit                     Exit sql-agent
  sql-agent --json                   Output results in JSON format
  
Examples:
  sql-agent exec "SELECT * FROM users"
  sql-agent exec "CREATE TABLE posts (id serial primary key, title text)"
  sql-agent file migrations/001_init.sql
  sql-agent schema
  sql-agent schema users,posts
  sql-agent --json exec "SELECT * FROM users"
    `;
  }
}

export function formatError(error: string, jsonMode: boolean, hint?: string): string {
  if (jsonMode) {
    return JSON.stringify({ error, ...(hint && { hint }) });
  } else {
    let output = `Error: ${error}`;
    if (hint) {
      output += `\n${hint}`;
    }
    return output;
  }
}

export function handleExit(jsonMode: boolean): string {
  if (jsonMode) {
    return JSON.stringify({ message: 'Goodbye!' });
  } else {
    return 'Goodbye!';
  }
}

export interface ParsedArguments {
  jsonMode: boolean;
  allSchemas: boolean;
  filteredArgs: string[];
}

export function parseArguments(args: string[]): ParsedArguments {
  const jsonMode = args.includes('--json');
  const allSchemas = args.includes('--all');
  const filteredArgs = args.filter(arg => arg !== '--json' && arg !== '--all');

  return {
    jsonMode,
    allSchemas,
    filteredArgs,
  };
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  // Parse arguments
  const { jsonMode, allSchemas, filteredArgs } = parseArguments(args);

  // Skip header when running in Jest or JSON mode
  if (typeof jest === 'undefined' && !jsonMode) {
    console.log('🔗 sql-agent-cli - PostgreSQL SQL executor\n');
  }

  // Handle no arguments
  if (filteredArgs.length === 0) {
    const output = formatError(
      'No command provided',
      jsonMode,
      'Run sql-agent --help for usage information'
    );
    if (jsonMode) {
      console.log(output);
    } else {
      console.error(output);
    }
    process.exit(1);
  }

  // Handle help
  if (filteredArgs[0] === '--help' || filteredArgs[0] === '-h') {
    const output = handleHelp(jsonMode);
    console.log(output);
    process.exit(0);
  }

  // Handle version
  if (filteredArgs[0] === '--version' || filteredArgs[0] === '-v') {
    const output = handleVersion(jsonMode);
    console.log(output);
    process.exit(0);
  }

  // Handle exit command
  if (filteredArgs[0] === 'exit' || filteredArgs[0] === 'quit') {
    const output = handleExit(jsonMode);
    console.log(output);
    process.exit(0);
  }

  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    if (jsonMode) {
      console.log(JSON.stringify({ error: 'DATABASE_URL environment variable is not set' }));
    } else {
      console.error('Error: DATABASE_URL environment variable is not set');
      console.error('Make sure you have a .env file with DATABASE_URL from your Supabase project');
    }
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false },
  });

  try {
    let sql: string;

    if (filteredArgs[0] === 'exec') {
      if (!filteredArgs[1]) {
        if (jsonMode) {
          console.log(JSON.stringify({ error: 'No SQL query provided' }));
        } else {
          console.error('Error: No SQL query provided');
        }
        process.exit(1);
      }
      sql = filteredArgs[1];
    } else if (filteredArgs[0] === 'file') {
      if (!filteredArgs[1]) {
        if (jsonMode) {
          console.log(JSON.stringify({ error: 'No file path provided' }));
        } else {
          console.error('Error: No file path provided');
        }
        process.exit(1);
      }
      const filepath = resolve(process.cwd(), filteredArgs[1]);

      // Check if file exists
      if (!existsSync(filepath)) {
        if (jsonMode) {
          console.log(JSON.stringify({ error: `File not found: ${filepath}` }));
        } else {
          console.error(`Error: File not found: ${filepath}`);
        }
        process.exit(1);
      }

      sql = readFileSync(filepath, 'utf8');
    } else if (filteredArgs[0] === 'schema') {
      // Schema command - show database structure
      // Join all remaining arguments as they might be space-separated table names
      const specificTables = filteredArgs.slice(1).join(' '); // Could be comma-separated list

      if (specificTables) {
        // Schema for specific tables
        const tableList = specificTables
          .split(',')
          .map(t => t.trim())
          .filter(t => t.length > 0); // Remove empty strings

        if (tableList.length === 0) {
          if (jsonMode) {
            console.log(JSON.stringify({ error: 'No table names provided' }));
          } else {
            console.error('Error: No table names provided');
          }
          process.exit(1);
        }

        const tableCondition = tableList.map(t => `'${t}'`).join(',');

        sql = `
        WITH requested_tables AS (
          SELECT unnest(ARRAY[${tableCondition}]) as table_name
        ),
        existing_tables AS (
          SELECT table_schema, table_name 
          FROM information_schema.tables 
          WHERE table_type = 'BASE TABLE' 
            AND ${allSchemas ? "table_schema NOT IN ('pg_catalog', 'information_schema')" : "table_schema = 'public'"}
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
          WHERE ${allSchemas ? "t.table_schema NOT IN ('pg_catalog', 'information_schema')" : "t.table_schema = 'public'"}
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
          WHERE ${allSchemas ? "tc.table_schema NOT IN ('pg_catalog', 'information_schema')" : "tc.table_schema = 'public'"}
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
      } else {
        // Show all tables
        sql = `
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
          WHERE ${allSchemas ? "t.table_schema NOT IN ('pg_catalog', 'information_schema')" : "t.table_schema = 'public'"}
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
          WHERE ${allSchemas ? "tc.table_schema NOT IN ('pg_catalog', 'information_schema')" : "tc.table_schema = 'public'"}
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
    } else if (filteredArgs[0] === 'exec' || filteredArgs[0] === 'file') {
      // Command recognized but missing argument
      if (jsonMode) {
        console.log(JSON.stringify({ error: `Missing argument for ${filteredArgs[0]} command` }));
      } else {
        console.error(`Error: Missing argument for ${filteredArgs[0]} command`);
      }
      process.exit(1);
    } else {
      // Check if it looks like a SQL command
      const sqlKeywords = ['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'CREATE', 'DROP', 'ALTER'];
      const firstWord = filteredArgs[0].toUpperCase();

      if (sqlKeywords.includes(firstWord)) {
        // Direct SQL command
        sql = filteredArgs.join(' ');
      } else {
        // Unknown command
        if (jsonMode) {
          console.log(JSON.stringify({ error: `Unknown command: ${filteredArgs[0]}` }));
        } else {
          console.error(`Error: Unknown command: ${filteredArgs[0]}`);
          console.error('Run sql-agent --help for usage information');
        }
        process.exit(1);
      }
    }

    // Execute the query
    const start = Date.now();
    const result = await pool.query(sql);
    const duration = Date.now() - start;

    // Display results
    if (jsonMode) {
      const output = {
        success: true,
        command: result.command || 'Query executed',
        rowCount: result.rowCount || 0,
        rows: result.rows || [],
        duration: duration,
      };
      console.log(JSON.stringify(output));
    } else {
      // Special handling for schema command
      if (filteredArgs[0] === 'schema' && result.rows && result.rows.length > 0) {
        console.log('DATABASE SCHEMA:\n');

        // Separate found and missing tables
        const foundTables = result.rows.filter(r => r.type === 'found');
        const missingTables = result.rows.filter(r => r.type === 'missing');

        // Display found tables
        for (const table of foundTables) {
          console.log(`📋 ${table.table_schema}.${table.table_name}`);

          // Display columns
          const columns: Column[] = JSON.parse(table.columns);
          console.log('  Columns:');
          for (const col of columns) {
            const nullable = col.is_nullable === 'YES' ? ' (nullable)' : '';
            const dataType = col.character_maximum_length
              ? `${col.data_type}(${col.character_maximum_length})`
              : col.data_type;
            const defaultVal = col.column_default ? ` DEFAULT ${col.column_default}` : '';
            console.log(`    - ${col.column_name}: ${dataType}${nullable}${defaultVal}`);
          }

          // Display constraints
          const constraints: Constraint[] = JSON.parse(table.constraints);
          if (constraints.length > 0) {
            console.log('  Constraints:');
            const constraintsByType = constraints.reduce(
              (acc: Record<string, Constraint[]>, c: Constraint) => {
                if (!acc[c.constraint_type]) acc[c.constraint_type] = [];
                acc[c.constraint_type].push(c);
                return acc;
              },
              {}
            );

            for (const [type, consts] of Object.entries(constraintsByType)) {
              const columns = consts.map(c => c.column_name).join(', ');
              console.log(`    - ${type}: ${columns}`);
            }
          }
          console.log('');
        }

        // Display missing tables with suggestions
        if (missingTables.length > 0) {
          console.log('❌ TABLES NOT FOUND:\n');
          for (const missing of missingTables) {
            console.log(`  - "${missing.missing_table}"`);
            if (missing.suggestions) {
              console.log(`    Did you mean: ${missing.suggestions}?`);
            }
          }
          console.log('');
        }
      } else if (result.rows && result.rows.length > 0) {
        console.table(result.rows);
      }

      // Show execution info
      const command = result.command || 'Query executed';
      console.log(
        `\n✓ ${command} ${result.rowCount ? `(${result.rowCount} rows)` : ''} - ${duration}ms`
      );
    }
  } catch (error) {
    const err = error as Error & { position?: number };
    if (jsonMode) {
      const errorOutput = {
        success: false,
        error: err.message,
        position: err.position,
      };
      console.log(JSON.stringify(errorOutput));
    } else {
      console.error('\nError:', err.message);
      if (err.position) {
        console.error(`Position: ${err.position}`);
      }
    }
    await pool.end();
    process.exit(1);
  }

  // Success - close pool and exit cleanly
  try {
    await pool.end();
  } catch (_e) {
    // Ignore pool cleanup errors
  }
  process.exit(0);
}

// Only run if this module is executed directly
if (require.main === module) {
  // Run main and handle unhandled errors
  main().catch(async error => {
    console.error(error);
    process.exit(1);
  });

  // Handle process errors - ignore db termination
  process.on('unhandledRejection', () => {});
  process.on('uncaughtException', () => {});
  process.on('error', () => {});
}
