/**
 * MCP Tool Definition for SQL Agent
 * This defines the tool interface that MCP servers will use
 */

export interface McpPropertySchema {
  type: 'string' | 'boolean' | 'number' | 'array' | 'object';
  description?: string;
  default?: unknown;
  items?: {
    type: string;
  };
}

export interface McpToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, McpPropertySchema>;
    required?: string[];
  };
}

export const SQL_AGENT_TOOLS: McpToolDefinition[] = [
  {
    name: 'sql_exec',
    description: 'Execute a PostgreSQL SQL query and return results',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'The SQL query to execute',
        },
        json: {
          type: 'boolean',
          description: 'Return results in JSON format',
          default: true,
        },
        transaction: {
          type: 'boolean',
          description: 'Wrap query in a transaction (auto-commit on success, rollback on error)',
          default: true,
        },
        timeout: {
          type: 'number',
          description: 'Query timeout in milliseconds',
          default: 120000,
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'sql_file',
    description: 'Execute SQL commands from a file',
    inputSchema: {
      type: 'object',
      properties: {
        filepath: {
          type: 'string',
          description: 'Path to the SQL file to execute',
        },
        json: {
          type: 'boolean',
          description: 'Return results in JSON format',
          default: true,
        },
        transaction: {
          type: 'boolean',
          description:
            'Wrap file execution in a transaction (auto-commit on success, rollback on error)',
          default: true,
        },
        timeout: {
          type: 'number',
          description: 'Query timeout in milliseconds',
          default: 120000,
        },
      },
      required: ['filepath'],
    },
  },
  {
    name: 'sql_schema',
    description: 'Get database schema information for tables',
    inputSchema: {
      type: 'object',
      properties: {
        tables: {
          type: 'array',
          items: {
            type: 'string',
          },
          description: 'Specific table names to get schema for (empty for all tables)',
          default: [],
        },
        allSchemas: {
          type: 'boolean',
          description: 'Include all schemas, not just public',
          default: false,
        },
        json: {
          type: 'boolean',
          description: 'Return results in JSON format',
          default: true,
        },
      },
    },
  },
  {
    name: 'sql_backup',
    description: 'Create a backup of the PostgreSQL database using pg_dump',
    inputSchema: {
      type: 'object',
      properties: {
        format: {
          type: 'string',
          description: 'Backup format: plain (SQL), custom, directory, or tar',
          default: 'plain',
        },
        tables: {
          type: 'array',
          items: {
            type: 'string',
          },
          description: 'Specific tables to backup (empty for all tables)',
          default: [],
        },
        schemas: {
          type: 'array',
          items: {
            type: 'string',
          },
          description: 'Specific schemas to backup (empty for all schemas)',
          default: [],
        },
        dataOnly: {
          type: 'boolean',
          description: 'Backup only data, not schema',
          default: false,
        },
        schemaOnly: {
          type: 'boolean',
          description: 'Backup only schema, not data',
          default: false,
        },
        compress: {
          type: 'boolean',
          description: 'Enable compression (applies to custom format)',
          default: false,
        },
        outputPath: {
          type: 'string',
          description: 'Path to save the backup file (defaults to timestamped filename)',
        },
      },
    },
  },
  {
    name: 'sql_health',
    description: 'Check database connection health and get system information',
    inputSchema: {
      type: 'object',
      properties: {
        includeVersion: {
          type: 'boolean',
          description: 'Include database version information',
          default: true,
        },
        includeConnectionInfo: {
          type: 'boolean',
          description: 'Include connection pool statistics',
          default: true,
        },
        json: {
          type: 'boolean',
          description: 'Return results in JSON format',
          default: true,
        },
      },
    },
  },
];

/**
 * Get tool definition by name
 */
export function getToolDefinition(name: string): McpToolDefinition | undefined {
  return SQL_AGENT_TOOLS.find(tool => tool.name === name);
}

/**
 * Validate tool input against schema
 */
export function validateToolInput(
  toolName: string,
  input: Record<string, unknown>
): { valid: boolean; error?: string } {
  const tool = getToolDefinition(toolName);
  if (!tool) {
    return { valid: false, error: `Unknown tool: ${toolName}` };
  }

  const required = tool.inputSchema.required || [];
  for (const field of required) {
    if (!(field in input)) {
      return { valid: false, error: `Missing required field: ${field}` };
    }
  }

  // Type validation
  for (const [key, value] of Object.entries(input)) {
    const propSchema = tool.inputSchema.properties[key];
    if (!propSchema) {
      continue; // Allow extra properties
    }

    const expectedType = propSchema.type;
    const actualType = Array.isArray(value) ? 'array' : typeof value;

    if (expectedType !== actualType) {
      return {
        valid: false,
        error: `Invalid type for ${key}: expected ${expectedType}, got ${actualType}`,
      };
    }
  }

  return { valid: true };
}
