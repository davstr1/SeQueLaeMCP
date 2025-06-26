import { SqlExecutor } from '../core/sql-executor';
import { validateToolInput } from './tool-definition';
import * as packageJson from '../../package.json';

export interface McpToolRequest {
  tool: string;
  arguments: Record<string, unknown>;
}

export interface McpToolResponse {
  content: Array<{
    type: 'text' | 'error';
    text?: string;
    error?: string;
  }>;
}

export class McpToolHandler {
  private executor: SqlExecutor | null = null;

  constructor(private connectionString?: string) {
    // Connection string can be provided later via environment
  }

  async handleToolCall(request: McpToolRequest): Promise<McpToolResponse> {
    try {
      // Validate input
      const validation = validateToolInput(request.tool, request.arguments);
      if (!validation.valid) {
        return this.errorResponse(validation.error || 'Invalid input');
      }

      // Ensure we have a connection
      const connString = this.connectionString || process.env.DATABASE_URL;
      if (!connString) {
        return this.errorResponse('DATABASE_URL environment variable is not set');
      }

      // Initialize executor if needed
      if (!this.executor) {
        this.executor = new SqlExecutor(connString);
      }

      // Route to appropriate handler
      switch (request.tool) {
        case 'sql_exec':
          return this.handleSqlExec(request.arguments);
        case 'sql_file':
          return this.handleSqlFile(request.arguments);
        case 'sql_schema':
          return this.handleSqlSchema(request.arguments);
        case 'sql_backup':
          return this.handleSqlBackup(request.arguments);
        case 'sql_health':
          return this.handleSqlHealth(request.arguments);
        default:
          return this.errorResponse(`Unknown tool: ${request.tool}`);
      }
    } catch (error) {
      return this.errorResponse(error instanceof Error ? error.message : String(error));
    }
  }

  private async handleSqlExec(args: Record<string, unknown>): Promise<McpToolResponse> {
    const query = args.query as string;
    const jsonMode = args.json !== false; // Default true
    const useTransaction = args.transaction !== false; // Default true
    const timeout = args.timeout as number | undefined;

    // Set timeout environment variable if provided
    if (timeout) {
      process.env.POSTGRES_STATEMENT_TIMEOUT = timeout.toString();
    }

    try {
      if (!this.executor) {
        throw new Error('SqlExecutor not initialized');
      }
      const result = await this.executor.executeQuery(query, useTransaction, timeout);

      if (jsonMode) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: true,
                  command: result.command,
                  rowCount: result.rowCount,
                  rows: result.rows,
                  duration: result.duration,
                },
                null,
                2
              ),
            },
          ],
        };
      } else {
        // Format as table-like text
        let text = `Command: ${result.command}\n`;
        text += `Rows: ${result.rowCount}\n`;
        text += `Duration: ${result.duration}ms\n\n`;

        if (result.rows && result.rows.length > 0) {
          // Simple table formatting
          const headers = Object.keys(result.rows[0]);
          text += headers.join(' | ') + '\n';
          text += headers.map(() => '---').join(' | ') + '\n';

          for (const row of result.rows) {
            text += headers.map(h => String(row[h] ?? '')).join(' | ') + '\n';
          }
        }

        return {
          content: [
            {
              type: 'text',
              text,
            },
          ],
        };
      }
    } catch (error) {
      const err = error as Error & { position?: number };
      if (jsonMode) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: false,
                  error: err.message,
                  position: err.position,
                },
                null,
                2
              ),
            },
          ],
        };
      } else {
        return this.errorResponse(err.message);
      }
    }
  }

  private async handleSqlFile(args: Record<string, unknown>): Promise<McpToolResponse> {
    const filepath = args.filepath as string;
    const jsonMode = args.json !== false; // Default true
    const useTransaction = args.transaction !== false; // Default true
    const timeout = args.timeout as number | undefined;

    // Set timeout environment variable if provided
    if (timeout) {
      process.env.POSTGRES_STATEMENT_TIMEOUT = timeout.toString();
    }

    try {
      if (!this.executor) {
        throw new Error('SqlExecutor not initialized');
      }
      const result = await this.executor.executeFile(filepath, useTransaction, timeout);

      if (jsonMode) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: true,
                  command: result.command,
                  rowCount: result.rowCount,
                  rows: result.rows,
                  duration: result.duration,
                },
                null,
                2
              ),
            },
          ],
        };
      } else {
        // Format as table-like text
        let text = `Command: ${result.command}\n`;
        text += `Rows: ${result.rowCount}\n`;
        text += `Duration: ${result.duration}ms\n\n`;

        if (result.rows && result.rows.length > 0) {
          // Simple table formatting
          const headers = Object.keys(result.rows[0]);
          text += headers.join(' | ') + '\n';
          text += headers.map(() => '---').join(' | ') + '\n';

          for (const row of result.rows) {
            text += headers.map(h => String(row[h] ?? '')).join(' | ') + '\n';
          }
        }

        return {
          content: [
            {
              type: 'text',
              text,
            },
          ],
        };
      }
    } catch (error) {
      return this.errorResponse(error instanceof Error ? error.message : String(error));
    }
  }

  private async handleSqlSchema(args: Record<string, unknown>): Promise<McpToolResponse> {
    const tables = (args.tables as string[]) || [];
    const allSchemas = (args.allSchemas as boolean) || false;
    const jsonMode = args.json !== false; // Default true

    try {
      if (!this.executor) {
        throw new Error('SqlExecutor not initialized');
      }
      const result = await this.executor.getSchema(
        tables.length > 0 ? tables : undefined,
        allSchemas
      );

      if (jsonMode) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } else {
        // Format as readable text
        let text = 'DATABASE SCHEMA:\n\n';

        for (const table of result.tables) {
          text += `📋 ${table.schema}.${table.name}\n`;
          text += '  Columns:\n';

          for (const col of table.columns) {
            const nullable = col.is_nullable === 'YES' ? ' (nullable)' : '';
            const dataType = col.character_maximum_length
              ? `${col.data_type}(${col.character_maximum_length})`
              : col.data_type;
            const defaultVal = col.column_default ? ` DEFAULT ${col.column_default}` : '';
            text += `    - ${col.column_name}: ${dataType}${nullable}${defaultVal}\n`;
          }

          if (table.constraints.length > 0) {
            text += '  Constraints:\n';
            const constraintsByType = table.constraints.reduce(
              (acc, c) => {
                if (!acc[c.constraint_type]) acc[c.constraint_type] = [];
                acc[c.constraint_type].push(c.column_name);
                return acc;
              },
              {} as Record<string, string[]>
            );

            for (const [type, columns] of Object.entries(constraintsByType)) {
              text += `    - ${type}: ${columns.join(', ')}\n`;
            }
          }
          text += '\n';
        }

        if (result.missingTables && result.missingTables.length > 0) {
          text += '❌ TABLES NOT FOUND:\n';
          for (const missing of result.missingTables) {
            text += `  - "${missing.table_name}"`;
            if (missing.suggestions.length > 0) {
              text += ` (Did you mean: ${missing.suggestions.join(', ')}?)`;
            }
            text += '\n';
          }
        }

        return {
          content: [
            {
              type: 'text',
              text,
            },
          ],
        };
      }
    } catch (error) {
      return this.errorResponse(error instanceof Error ? error.message : String(error));
    }
  }

  private async handleSqlBackup(args: Record<string, unknown>): Promise<McpToolResponse> {
    try {
      if (!this.executor) {
        throw new Error('SqlExecutor not initialized');
      }

      // Validate mutually exclusive options
      if (args.dataOnly && args.schemaOnly) {
        return this.errorResponse('Cannot specify both dataOnly and schemaOnly options');
      }

      // Validate format option
      const validFormats = ['plain', 'custom', 'directory', 'tar'];
      if (args.format && !validFormats.includes(args.format as string)) {
        return this.errorResponse(`Invalid format. Must be one of: ${validFormats.join(', ')}`);
      }

      const result = await this.executor.backup({
        format: args.format as 'plain' | 'custom' | 'directory' | 'tar' | undefined,
        tables: args.tables as string[] | undefined,
        schemas: args.schemas as string[] | undefined,
        dataOnly: args.dataOnly as boolean | undefined,
        schemaOnly: args.schemaOnly as boolean | undefined,
        compress: args.compress as boolean | undefined,
        outputPath: args.outputPath as string | undefined,
      });

      if (result.success) {
        const sizeInfo = result.size ? ` (${(result.size / 1024 / 1024).toFixed(2)} MB)` : '';
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: true,
                  message: `Backup completed successfully`,
                  outputPath: result.outputPath,
                  size: result.size,
                  sizeFormatted: sizeInfo,
                  duration: result.duration,
                  durationFormatted: `${(result.duration / 1000).toFixed(2)}s`,
                },
                null,
                2
              ),
            },
          ],
        };
      } else {
        return this.errorResponse(result.error || 'Backup failed');
      }
    } catch (error) {
      return this.errorResponse(error instanceof Error ? error.message : String(error));
    }
  }

  private async handleSqlHealth(args: Record<string, unknown>): Promise<McpToolResponse> {
    const includeVersion = args.includeVersion !== false; // Default true
    const includeConnectionInfo = args.includeConnectionInfo !== false; // Default true
    const jsonMode = args.json !== false; // Default true

    try {
      if (!this.executor) {
        throw new Error('SqlExecutor not initialized');
      }

      const healthInfo: any = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
      };

      // Test database connection
      try {
        const testResult = await this.executor.executeQuery('SELECT 1 as test', false);
        healthInfo.connectionTest = {
          success: true,
          latency: testResult.duration,
        };
      } catch (error) {
        healthInfo.status = 'unhealthy';
        healthInfo.connectionTest = {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }

      // Get database version if requested
      if (includeVersion && healthInfo.status === 'healthy') {
        try {
          const versionResult = await this.executor.executeQuery('SELECT version()', false);
          if (versionResult.rows && versionResult.rows.length > 0) {
            healthInfo.database = {
              version: versionResult.rows[0].version,
            };
          }
        } catch (error) {
          healthInfo.database = {
            error: error instanceof Error ? error.message : 'Failed to get version',
          };
        }
      }

      // Get connection pool info if requested
      if (includeConnectionInfo) {
        const poolManager = (this.executor as any).poolManagerInstance;
        if (poolManager && poolManager.getStatus) {
          healthInfo.connectionPool = poolManager.getStatus();
        } else {
          healthInfo.connectionPool = {
            note: 'Pool statistics not available',
          };
        }
      }

      // Add tool information
      healthInfo.tool = {
        name: 'sequelae-mcp',
        version: packageJson.version,
      };

      if (jsonMode) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(healthInfo, null, 2),
            },
          ],
        };
      } else {
        // Format as readable text
        let text = `Health Check Report\n`;
        text += `==================\n\n`;
        text += `Status: ${healthInfo.status.toUpperCase()}\n`;
        text += `Timestamp: ${healthInfo.timestamp}\n\n`;

        text += `Connection Test:\n`;
        text += `  Success: ${healthInfo.connectionTest.success}\n`;
        if (healthInfo.connectionTest.latency) {
          text += `  Latency: ${healthInfo.connectionTest.latency}ms\n`;
        }
        if (healthInfo.connectionTest.error) {
          text += `  Error: ${healthInfo.connectionTest.error}\n`;
        }

        if (healthInfo.database) {
          text += `\nDatabase:\n`;
          if (healthInfo.database.version) {
            text += `  Version: ${healthInfo.database.version}\n`;
          }
          if (healthInfo.database.error) {
            text += `  Error: ${healthInfo.database.error}\n`;
          }
        }

        if (healthInfo.connectionPool) {
          text += `\nConnection Pool:\n`;
          if (healthInfo.connectionPool.note) {
            text += `  ${healthInfo.connectionPool.note}\n`;
          } else {
            text += `  Total: ${healthInfo.connectionPool.total || 'N/A'}\n`;
            text += `  Idle: ${healthInfo.connectionPool.idle || 'N/A'}\n`;
            text += `  Waiting: ${healthInfo.connectionPool.waiting || 'N/A'}\n`;
          }
        }

        text += `\nTool:\n`;
        text += `  Name: ${healthInfo.tool.name}\n`;
        text += `  Version: ${healthInfo.tool.version}\n`;

        return {
          content: [
            {
              type: 'text',
              text,
            },
          ],
        };
      }
    } catch (error) {
      return this.errorResponse(error instanceof Error ? error.message : String(error));
    }
  }

  private errorResponse(message: string): McpToolResponse {
    return {
      content: [
        {
          type: 'error',
          error: message,
        },
      ],
    };
  }

  async close(): Promise<void> {
    if (this.executor) {
      await this.executor.close();
      this.executor = null;
    }
  }
}
