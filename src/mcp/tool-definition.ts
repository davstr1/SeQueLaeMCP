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
