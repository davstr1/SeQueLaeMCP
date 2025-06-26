import { SqlExecutor } from '../core/sql-executor';
import { validateToolInput } from './tool-definition';

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

    try {
      if (!this.executor) {
        throw new Error('SqlExecutor not initialized');
      }
      const result = await this.executor.executeQuery(query);

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

    try {
      if (!this.executor) {
        throw new Error('SqlExecutor not initialized');
      }
      const result = await this.executor.executeFile(filepath);

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
