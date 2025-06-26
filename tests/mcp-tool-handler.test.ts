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

      expect(mockExecutor.executeQuery).toHaveBeenCalledWith(
        'SELECT * FROM users',
        true,
        undefined
      );
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

      expect(mockExecutor.executeFile).toHaveBeenCalledWith('/path/to/file.sql', true, undefined);
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

  describe('sql_health tool', () => {
    // Mock require for package.json version
    beforeEach(() => {
      jest.mock('../../package.json', () => ({ version: '1.0.0' }), { virtual: true });
    });

    test('should return health check with all info by default', async () => {
      // Mock successful connection test
      mockExecutor.executeQuery.mockImplementation(async (query: string) => {
        if (query === 'SELECT 1 as test') {
          return {
            command: 'SELECT',
            rowCount: 1,
            rows: [{ test: 1 }],
            duration: 5,
          };
        }
        if (query === 'SELECT version()') {
          return {
            command: 'SELECT',
            rowCount: 1,
            rows: [{ version: 'PostgreSQL 14.5 on x86_64-pc-linux-gnu' }],
            duration: 3,
          };
        }
        throw new Error('Unexpected query');
      });

      // Mock pool manager
      const mockPoolManager = {
        getStatus: jest.fn().mockReturnValue({
          total: 10,
          idle: 8,
          waiting: 0,
        }),
      };
      Object.defineProperty(mockExecutor, 'poolManagerInstance', {
        get: () => mockPoolManager,
        configurable: true,
      });

      const response = await handler.handleToolCall({
        tool: 'sql_health',
        arguments: {},
      });

      expect(response.content[0].type).toBe('text');
      const result = JSON.parse(response.content[0].text!);

      expect(result).toMatchObject({
        status: 'healthy',
        connectionTest: {
          success: true,
          latency: 5,
        },
        database: {
          version: 'PostgreSQL 14.5 on x86_64-pc-linux-gnu',
        },
        connectionPool: {
          total: 10,
          idle: 8,
          waiting: 0,
        },
        tool: {
          name: 'sequelae-mcp',
          version: expect.any(String),
        },
      });
      expect(result.timestamp).toBeDefined();
    });

    test('should handle connection failure', async () => {
      mockExecutor.executeQuery.mockRejectedValue(new Error('Connection refused'));

      const response = await handler.handleToolCall({
        tool: 'sql_health',
        arguments: {},
      });

      expect(response.content[0].type).toBe('text');
      const result = JSON.parse(response.content[0].text!);

      expect(result).toMatchObject({
        status: 'unhealthy',
        connectionTest: {
          success: false,
          error: 'Connection refused',
        },
      });
      // Should not have database version info when connection fails
      expect(result.database).toBeUndefined();
    });

    test('should skip version info when includeVersion is false', async () => {
      mockExecutor.executeQuery.mockResolvedValue({
        command: 'SELECT',
        rowCount: 1,
        rows: [{ test: 1 }],
        duration: 5,
      });

      const response = await handler.handleToolCall({
        tool: 'sql_health',
        arguments: { includeVersion: false },
      });

      expect(response.content[0].type).toBe('text');
      const result = JSON.parse(response.content[0].text!);

      expect(result.connectionTest.success).toBe(true);
      expect(result.database).toBeUndefined();
      // Should only call executeQuery once (for connection test)
      expect(mockExecutor.executeQuery).toHaveBeenCalledTimes(1);
    });

    test('should skip connection info when includeConnectionInfo is false', async () => {
      mockExecutor.executeQuery.mockResolvedValue({
        command: 'SELECT',
        rowCount: 1,
        rows: [{ test: 1 }],
        duration: 5,
      });

      const response = await handler.handleToolCall({
        tool: 'sql_health',
        arguments: { includeConnectionInfo: false },
      });

      expect(response.content[0].type).toBe('text');
      const result = JSON.parse(response.content[0].text!);

      expect(result.connectionTest.success).toBe(true);
      expect(result.connectionPool).toBeUndefined();
    });

    test('should return text format when json is false', async () => {
      mockExecutor.executeQuery.mockImplementation(async (query: string) => {
        if (query === 'SELECT 1 as test') {
          return {
            command: 'SELECT',
            rowCount: 1,
            rows: [{ test: 1 }],
            duration: 10,
          };
        }
        if (query === 'SELECT version()') {
          return {
            command: 'SELECT',
            rowCount: 1,
            rows: [{ version: 'PostgreSQL 15.1' }],
            duration: 5,
          };
        }
        throw new Error('Unexpected query');
      });

      const response = await handler.handleToolCall({
        tool: 'sql_health',
        arguments: { json: false },
      });

      expect(response.content[0].type).toBe('text');
      expect(response.content[0].text).toContain('Health Check Report');
      expect(response.content[0].text).toContain('Status: HEALTHY');
      expect(response.content[0].text).toContain('Connection Test:');
      expect(response.content[0].text).toContain('Success: true');
      expect(response.content[0].text).toContain('Latency: 10ms');
      expect(response.content[0].text).toContain('Database:');
      expect(response.content[0].text).toContain('Version: PostgreSQL 15.1');
      expect(response.content[0].text).toContain('Tool:');
      expect(response.content[0].text).toContain('Name: sequelae-mcp');
    });

    test('should handle version query failure gracefully', async () => {
      mockExecutor.executeQuery.mockImplementation(async (query: string) => {
        if (query === 'SELECT 1 as test') {
          return {
            command: 'SELECT',
            rowCount: 1,
            rows: [{ test: 1 }],
            duration: 5,
          };
        }
        if (query === 'SELECT version()') {
          throw new Error('Permission denied');
        }
        throw new Error('Unexpected query');
      });

      const response = await handler.handleToolCall({
        tool: 'sql_health',
        arguments: {},
      });

      expect(response.content[0].type).toBe('text');
      const result = JSON.parse(response.content[0].text!);

      expect(result.status).toBe('healthy'); // Still healthy if only version fails
      expect(result.connectionTest.success).toBe(true);
      expect(result.database).toMatchObject({
        error: 'Permission denied',
      });
    });

    test('should handle missing pool manager gracefully', async () => {
      mockExecutor.executeQuery.mockResolvedValue({
        command: 'SELECT',
        rowCount: 1,
        rows: [{ test: 1 }],
        duration: 5,
      });

      // Remove pool manager
      Object.defineProperty(mockExecutor, 'poolManagerInstance', {
        get: () => undefined,
        configurable: true,
      });

      const response = await handler.handleToolCall({
        tool: 'sql_health',
        arguments: {},
      });

      expect(response.content[0].type).toBe('text');
      const result = JSON.parse(response.content[0].text!);

      expect(result.connectionPool).toMatchObject({
        note: 'Pool statistics not available',
      });
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
