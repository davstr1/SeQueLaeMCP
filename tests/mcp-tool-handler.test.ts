import { McpToolHandler } from '../src/mcp/tool-handler';
import { SqlExecutor } from '../src/core/sql-executor';

// Mock SqlExecutor
jest.mock('../src/core/sql-executor');

describe('McpToolHandler', () => {
  let handler: McpToolHandler;
  let mockExecutor: jest.Mocked<SqlExecutor>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mock executor
    mockExecutor = {
      executeQuery: jest.fn(),
      executeFile: jest.fn(),
      getSchema: jest.fn(),
      close: jest.fn(),
    } as any;

    (SqlExecutor as jest.MockedClass<typeof SqlExecutor>).mockImplementation(() => mockExecutor);

    // Set DATABASE_URL for tests
    process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';

    handler = new McpToolHandler();
  });

  afterEach(() => {
    delete process.env.DATABASE_URL;
  });

  describe('handleToolCall', () => {
    test('should validate tool input', async () => {
      const response = await handler.handleToolCall({
        tool: 'sql_exec',
        arguments: {}, // Missing required 'query'
      });

      expect(response.content[0].type).toBe('error');
      expect(response.content[0].error).toBe('Missing required field: query');
    });

    test('should require DATABASE_URL', async () => {
      delete process.env.DATABASE_URL;
      handler = new McpToolHandler(); // Recreate without DB URL

      const response = await handler.handleToolCall({
        tool: 'sql_exec',
        arguments: { query: 'SELECT 1' },
      });

      expect(response.content[0].type).toBe('error');
      expect(response.content[0].error).toBe('DATABASE_URL environment variable is not set');
    });

    test('should handle unknown tool', async () => {
      const response = await handler.handleToolCall({
        tool: 'unknown_tool',
        arguments: {},
      });

      expect(response.content[0].type).toBe('error');
      expect(response.content[0].error).toBe('Unknown tool: unknown_tool');
    });
  });

  describe('sql_exec tool', () => {
    test('should execute query and return JSON by default', async () => {
      const mockResult = {
        command: 'SELECT',
        rowCount: 2,
        rows: [
          { id: 1, name: 'Alice' },
          { id: 2, name: 'Bob' },
        ],
        duration: 100,
      };
      mockExecutor.executeQuery.mockResolvedValue(mockResult);

      const response = await handler.handleToolCall({
        tool: 'sql_exec',
        arguments: { query: 'SELECT * FROM users' },
      });

      expect(mockExecutor.executeQuery).toHaveBeenCalledWith('SELECT * FROM users', true);
      expect(response.content[0].type).toBe('text');

      const result = JSON.parse(response.content[0].text!);
      expect(result).toMatchObject({
        success: true,
        command: 'SELECT',
        rowCount: 2,
        rows: mockResult.rows,
        duration: 100,
      });
    });

    test('should return text format when json is false', async () => {
      const mockResult = {
        command: 'SELECT',
        rowCount: 1,
        rows: [{ id: 1, name: 'Alice' }],
        duration: 50,
      };
      mockExecutor.executeQuery.mockResolvedValue(mockResult);

      const response = await handler.handleToolCall({
        tool: 'sql_exec',
        arguments: { query: 'SELECT * FROM users', json: false },
      });

      expect(response.content[0].type).toBe('text');
      expect(response.content[0].text).toContain('Command: SELECT');
      expect(response.content[0].text).toContain('Rows: 1');
      expect(response.content[0].text).toContain('Duration: 50ms');
      expect(response.content[0].text).toContain('id | name');
      expect(response.content[0].text).toContain('1 | Alice');
    });

    test('should handle SQL errors in JSON mode', async () => {
      const error = new Error('Syntax error') as Error & { position?: number };
      error.position = 15;
      mockExecutor.executeQuery.mockRejectedValue(error);

      const response = await handler.handleToolCall({
        tool: 'sql_exec',
        arguments: { query: 'INVALID SQL' },
      });

      expect(response.content[0].type).toBe('text');
      const result = JSON.parse(response.content[0].text!);
      expect(result).toMatchObject({
        success: false,
        error: 'Syntax error',
        position: 15,
      });
    });

    test('should handle SQL errors in text mode', async () => {
      mockExecutor.executeQuery.mockRejectedValue(new Error('Table not found'));

      const response = await handler.handleToolCall({
        tool: 'sql_exec',
        arguments: { query: 'SELECT * FROM nonexistent', json: false },
      });

      expect(response.content[0].type).toBe('error');
      expect(response.content[0].error).toBe('Table not found');
    });
  });

  describe('sql_file tool', () => {
    test('should execute file and return results', async () => {
      const mockResult = {
        command: 'CREATE TABLE',
        rowCount: 0,
        rows: [],
        duration: 75,
      };
      mockExecutor.executeFile.mockResolvedValue(mockResult);

      const response = await handler.handleToolCall({
        tool: 'sql_file',
        arguments: { filepath: '/path/to/file.sql' },
      });

      expect(mockExecutor.executeFile).toHaveBeenCalledWith('/path/to/file.sql', true);
      expect(response.content[0].type).toBe('text');

      const result = JSON.parse(response.content[0].text!);
      expect(result).toMatchObject({
        success: true,
        command: 'CREATE TABLE',
        rowCount: 0,
        rows: [],
      });
    });

    test('should handle file errors', async () => {
      mockExecutor.executeFile.mockRejectedValue(new Error('File not found: /bad/path.sql'));

      const response = await handler.handleToolCall({
        tool: 'sql_file',
        arguments: { filepath: '/bad/path.sql' },
      });

      expect(response.content[0].type).toBe('error');
      expect(response.content[0].error).toBe('File not found: /bad/path.sql');
    });
  });

  describe('sql_schema tool', () => {
    test('should get all tables schema', async () => {
      const mockResult = {
        tables: [
          {
            schema: 'public',
            name: 'users',
            columns: [
              {
                column_name: 'id',
                data_type: 'integer',
                is_nullable: 'NO',
                column_default: null,
                character_maximum_length: null,
              },
            ],
            constraints: [
              { constraint_type: 'PRIMARY KEY', constraint_name: 'users_pkey', column_name: 'id' },
            ],
          },
        ],
      };
      mockExecutor.getSchema.mockResolvedValue(mockResult);

      const response = await handler.handleToolCall({
        tool: 'sql_schema',
        arguments: {},
      });

      expect(mockExecutor.getSchema).toHaveBeenCalledWith(undefined, false);
      expect(response.content[0].type).toBe('text');

      const result = JSON.parse(response.content[0].text!);
      expect(result).toMatchObject(mockResult);
    });

    test('should get specific tables schema', async () => {
      const mockResult = { tables: [] };
      mockExecutor.getSchema.mockResolvedValue(mockResult);

      await handler.handleToolCall({
        tool: 'sql_schema',
        arguments: { tables: ['users', 'posts'], allSchemas: true },
      });

      expect(mockExecutor.getSchema).toHaveBeenCalledWith(['users', 'posts'], true);
    });

    test('should format schema as text when json is false', async () => {
      const mockResult = {
        tables: [
          {
            schema: 'public',
            name: 'users',
            columns: [
              {
                column_name: 'id',
                data_type: 'integer',
                is_nullable: 'NO',
                column_default: null,
                character_maximum_length: null,
              },
              {
                column_name: 'name',
                data_type: 'varchar',
                is_nullable: 'YES',
                column_default: null,
                character_maximum_length: 100,
              },
            ],
            constraints: [
              { constraint_type: 'PRIMARY KEY', constraint_name: 'users_pkey', column_name: 'id' },
            ],
          },
        ],
        missingTables: [
          {
            table_name: 'userz',
            suggestions: ['users', 'user_roles'],
          },
        ],
      };
      mockExecutor.getSchema.mockResolvedValue(mockResult);

      const response = await handler.handleToolCall({
        tool: 'sql_schema',
        arguments: { json: false },
      });

      expect(response.content[0].type).toBe('text');
      expect(response.content[0].text).toContain('📋 public.users');
      expect(response.content[0].text).toContain('- id: integer');
      expect(response.content[0].text).toContain('- name: varchar(100) (nullable)');
      expect(response.content[0].text).toContain('PRIMARY KEY: id');
      expect(response.content[0].text).toContain('❌ TABLES NOT FOUND:');
      expect(response.content[0].text).toContain('"userz" (Did you mean: users, user_roles?)');
    });
  });

  describe('close', () => {
    test('should close executor if exists', async () => {
      // Initialize executor by making a call
      mockExecutor.executeQuery.mockResolvedValue({ rows: [], rowCount: 0, duration: 0 });
      await handler.handleToolCall({
        tool: 'sql_exec',
        arguments: { query: 'SELECT 1' },
      });

      await handler.close();
      expect(mockExecutor.close).toHaveBeenCalled();
    });

    test('should not throw if no executor exists', async () => {
      await expect(handler.close()).resolves.not.toThrow();
    });
  });
});
