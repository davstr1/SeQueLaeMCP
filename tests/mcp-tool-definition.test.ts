import { SQL_AGENT_TOOLS, getToolDefinition, validateToolInput } from '../src/mcp/tool-definition';

describe('MCP Tool Definition', () => {
  describe('SQL_AGENT_TOOLS', () => {
    test('should define all required tools', () => {
      expect(SQL_AGENT_TOOLS).toHaveLength(4);

      const toolNames = SQL_AGENT_TOOLS.map(t => t.name);
      expect(toolNames).toContain('sql_exec');
      expect(toolNames).toContain('sql_file');
      expect(toolNames).toContain('sql_schema');
      expect(toolNames).toContain('sql_backup');
    });

    test('each tool should have required properties', () => {
      SQL_AGENT_TOOLS.forEach(tool => {
        expect(tool).toHaveProperty('name');
        expect(tool).toHaveProperty('description');
        expect(tool).toHaveProperty('inputSchema');
        expect(tool.inputSchema).toHaveProperty('type', 'object');
        expect(tool.inputSchema).toHaveProperty('properties');
      });
    });

    test('sql_exec tool should have correct schema', () => {
      const sqlExec = SQL_AGENT_TOOLS.find(t => t.name === 'sql_exec');
      expect(sqlExec).toBeDefined();
      expect(sqlExec!.inputSchema.properties).toHaveProperty('query');
      expect(sqlExec!.inputSchema.properties).toHaveProperty('json');
      expect(sqlExec!.inputSchema.required).toEqual(['query']);
    });

    test('sql_file tool should have correct schema', () => {
      const sqlFile = SQL_AGENT_TOOLS.find(t => t.name === 'sql_file');
      expect(sqlFile).toBeDefined();
      expect(sqlFile!.inputSchema.properties).toHaveProperty('filepath');
      expect(sqlFile!.inputSchema.properties).toHaveProperty('json');
      expect(sqlFile!.inputSchema.required).toEqual(['filepath']);
    });

    test('sql_schema tool should have correct schema', () => {
      const sqlSchema = SQL_AGENT_TOOLS.find(t => t.name === 'sql_schema');
      expect(sqlSchema).toBeDefined();
      expect(sqlSchema!.inputSchema.properties).toHaveProperty('tables');
      expect(sqlSchema!.inputSchema.properties).toHaveProperty('allSchemas');
      expect(sqlSchema!.inputSchema.properties).toHaveProperty('json');
      expect(sqlSchema!.inputSchema.required).toBeUndefined();
    });
  });

  describe('getToolDefinition', () => {
    test('should return tool definition by name', () => {
      const tool = getToolDefinition('sql_exec');
      expect(tool).toBeDefined();
      expect(tool!.name).toBe('sql_exec');
    });

    test('should return undefined for unknown tool', () => {
      const tool = getToolDefinition('unknown_tool');
      expect(tool).toBeUndefined();
    });
  });

  describe('validateToolInput', () => {
    test('should validate valid sql_exec input', () => {
      const result = validateToolInput('sql_exec', {
        query: 'SELECT * FROM users',
        json: true,
      });
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    test('should validate sql_exec with only required fields', () => {
      const result = validateToolInput('sql_exec', {
        query: 'SELECT 1',
      });
      expect(result.valid).toBe(true);
    });

    test('should reject sql_exec without required query', () => {
      const result = validateToolInput('sql_exec', {
        json: true,
      });
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Missing required field: query');
    });

    test('should validate valid sql_file input', () => {
      const result = validateToolInput('sql_file', {
        filepath: '/path/to/file.sql',
        json: false,
      });
      expect(result.valid).toBe(true);
    });

    test('should reject sql_file without required filepath', () => {
      const result = validateToolInput('sql_file', {
        json: true,
      });
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Missing required field: filepath');
    });

    test('should validate valid sql_schema input', () => {
      const result = validateToolInput('sql_schema', {
        tables: ['users', 'posts'],
        allSchemas: true,
        json: true,
      });
      expect(result.valid).toBe(true);
    });

    test('should validate sql_schema with no parameters', () => {
      const result = validateToolInput('sql_schema', {});
      expect(result.valid).toBe(true);
    });

    test('should reject invalid type for query', () => {
      const result = validateToolInput('sql_exec', {
        query: 123, // Should be string
        json: true,
      });
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid type for query: expected string, got number');
    });

    test('should reject invalid type for json flag', () => {
      const result = validateToolInput('sql_exec', {
        query: 'SELECT 1',
        json: 'yes', // Should be boolean
      });
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid type for json: expected boolean, got string');
    });

    test('should reject invalid type for tables array', () => {
      const result = validateToolInput('sql_schema', {
        tables: 'users,posts', // Should be array
      });
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid type for tables: expected array, got string');
    });

    test('should reject unknown tool', () => {
      const result = validateToolInput('unknown_tool', {});
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Unknown tool: unknown_tool');
    });

    test('should allow extra properties', () => {
      const result = validateToolInput('sql_exec', {
        query: 'SELECT 1',
        extra: 'property',
        another: 123,
      });
      expect(result.valid).toBe(true);
    });
  });
});
