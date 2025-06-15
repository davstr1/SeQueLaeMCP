#!/usr/bin/env node
import { Pool } from 'pg';
import { config } from 'dotenv';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Load .env from the package root (handles both root and subdirectory execution)
const envPath = resolve(__dirname, '../.env');
config({ path: envPath });

async function main() {
  const args = process.argv.slice(2);
  
  // Check for flags
  const jsonMode = args.includes('--json');
  const allSchemas = args.includes('--all');
  const filteredArgs = args.filter(arg => arg !== '--json' && arg !== '--all');
  
  // Skip header when running in Jest or JSON mode
  if (typeof jest === 'undefined' && !jsonMode) {
    console.log('🔗 sql-agent-cli - PostgreSQL SQL executor\n');
  }
  
  // Handle no arguments
  if (filteredArgs.length === 0) {
    if (jsonMode) {
      console.log(JSON.stringify({ error: 'No command provided' }));
    } else {
      console.error('Error: No command provided');
      console.error('Run sql-agent --help for usage information');
    }
    process.exit(1);
  }
  
  // Handle help
  if (filteredArgs[0] === '--help' || filteredArgs[0] === '-h') {
    if (jsonMode) {
      console.log(JSON.stringify({ 
        usage: [
          'sql-agent exec "SQL query"         Execute a SQL query',
          'sql-agent file path/to/query.sql   Execute SQL from file',
          'sql-agent schema                   Show database structure (public schema only)',
          'sql-agent schema --all             Show all schemas including system tables',
          'sql-agent exit                     Exit sql-agent',
          'sql-agent --json                   Output results in JSON format'
        ],
        examples: [
          'sql-agent exec "SELECT * FROM users"',
          'sql-agent exec "CREATE TABLE posts (id serial primary key, title text)"',
          'sql-agent file migrations/001_init.sql',
          'sql-agent schema',
          'sql-agent --json exec "SELECT * FROM users"'
        ]
      }));
    } else {
      console.log(`
Usage:
  sql-agent exec "SQL query"         Execute a SQL query
  sql-agent file path/to/query.sql   Execute SQL from file
  sql-agent schema                   Show database structure (public schema only)
  sql-agent schema --all             Show all schemas including system tables
  sql-agent exit                     Exit sql-agent
  sql-agent --json                   Output results in JSON format
  
Examples:
  sql-agent exec "SELECT * FROM users"
  sql-agent exec "CREATE TABLE posts (id serial primary key, title text)"
  sql-agent file migrations/001_init.sql
  sql-agent schema
  sql-agent --json exec "SELECT * FROM users"
    `);
    }
    process.exit(0);
  }
  
  // Handle version
  if (filteredArgs[0] === '--version' || filteredArgs[0] === '-v') {
    const packageJson = require('../package.json');
    if (jsonMode) {
      console.log(JSON.stringify({ version: packageJson.version }));
    } else {
      console.log(`sql-agent-cli v${packageJson.version}`);
    }
    process.exit(0);
  }

  // Handle exit command
  if (filteredArgs[0] === 'exit' || filteredArgs[0] === 'quit') {
    if (jsonMode) {
      console.log(JSON.stringify({ message: 'Goodbye!' }));
    } else {
      console.log('Goodbye!');
    }
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
    ssl: { rejectUnauthorized: false }
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
      const fs = require('fs');
      if (!fs.existsSync(filepath)) {
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
          ti.table_schema,
          ti.table_name,
          ti.columns,
          COALESCE(ci.constraints, '[]') as constraints
        FROM table_info ti
        LEFT JOIN constraint_info ci
          ON ti.table_schema = ci.table_schema
          AND ti.table_name = ci.table_name
        ORDER BY ti.table_schema, ti.table_name;
      `;
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
        duration: duration
      };
      console.log(JSON.stringify(output));
    } else {
      // Special handling for schema command
      if (filteredArgs[0] === 'schema' && result.rows && result.rows.length > 0) {
        console.log('DATABASE SCHEMA:\n');
        
        for (const table of result.rows) {
          console.log(`📋 ${table.table_schema}.${table.table_name}`);
          
          // Display columns
          const columns = JSON.parse(table.columns);
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
          const constraints = JSON.parse(table.constraints);
          if (constraints.length > 0) {
            console.log('  Constraints:');
            const constraintsByType = constraints.reduce((acc: any, c: any) => {
              if (!acc[c.constraint_type]) acc[c.constraint_type] = [];
              acc[c.constraint_type].push(c);
              return acc;
            }, {});
            
            for (const [type, consts] of Object.entries(constraintsByType)) {
              const columns = (consts as any[]).map(c => c.column_name).join(', ');
              console.log(`    - ${type}: ${columns}`);
            }
          }
          console.log('');
        }
      } else if (result.rows && result.rows.length > 0) {
        console.table(result.rows);
      }
      
      // Show execution info
      const command = result.command || 'Query executed';
      console.log(`\n✓ ${command} ${result.rowCount ? `(${result.rowCount} rows)` : ''} - ${duration}ms`);
    }
    
  } catch (error: any) {
    if (jsonMode) {
      const errorOutput = {
        success: false,
        error: error.message,
        position: error.position
      };
      console.log(JSON.stringify(errorOutput));
    } else {
      console.error('\nError:', error.message);
      if (error.position) {
        console.error(`Position: ${error.position}`);
      }
    }
    await pool.end();
    process.exit(1);
  }
  
  // Success - close pool and exit cleanly
  try {
    await pool.end();
  } catch (e) {
    // Ignore pool cleanup errors
  }
  process.exit(0);
}

// Run main and handle unhandled errors
main().catch(async (error) => {
  console.error(error);
  process.exit(1);
});

// Handle process errors - ignore db termination
process.on('unhandledRejection', () => {});
process.on('uncaughtException', () => {});
process.on('error', () => {});