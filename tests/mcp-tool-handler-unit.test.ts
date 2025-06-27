import { McpToolHandler } from '../src/mcp/tool-handler';
import { SqlExecutor } from '../src/core/sql-executor';

// Mock SqlExecutor
jest.mock('../src/core/sql-executor');

// Mock package.json
jest.mock('../package.json', () => ({ version: '1.0.0' }));

describe('MCP Tool Handler Unit Tests', () => {
  let handler: McpToolHandler;
  let mockExecutor: jest.Mocked<SqlExecutor>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mock executor
    mockExecutor = {
      executeQuery: jest.fn(),
      executeFile: jest.fn(),
      getSchema: jest.fn(),
      backup: jest.fn(),
      close: jest.fn(),
      poolManagerInstance: undefined,
    } as any;

    (SqlExecutor as jest.MockedClass<typeof SqlExecutor>).mockImplementation(() => mockExecutor);

    // Set DATABASE_URL for tests
    process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';

    handler = new McpToolHandler();
  });

  afterEach(() => {
    delete process.env.DATABASE_URL;
    delete process.env.POSTGRES_STATEMENT_TIMEOUT;
  });

  describe('Error Handling', () => {
    test('should handle general errors in handleToolCall', async () => {
      // Force an error by making validateToolInput throw
      const response = await handler.handleToolCall({
        tool: null as any, // This will cause an error
        arguments: {},
      });

      expect(response.content[0].type).toBe('error');
      expect(response.content[0].error).toBeDefined();
    });

    test('should handle unknown tool name', async () => {
      const response = await handler.handleToolCall({
        tool: 'sql_unknown' as any,
        arguments: {},
      });

      expect(response.content[0].type).toBe('error');
      expect(response.content[0].error).toBe('Unknown tool: sql_unknown');
    });
  });

  describe('sql_exec with timeout', () => {
    test('should set timeout environment variable when provided', async () => {
      mockExecutor.executeQuery.mockResolvedValue({
        command: 'SELECT',
        rowCount: 1,
        rows: [{ test: 1 }],
        duration: 50,
      });

      await handler.handleToolCall({
        tool: 'sql_exec',
        arguments: { query: 'SELECT 1', timeout: 5000 },
      });

      expect(process.env.POSTGRES_STATEMENT_TIMEOUT).toBe('5000');
      expect(mockExecutor.executeQuery).toHaveBeenCalledWith('SELECT 1', true, 5000);
    });
  });

  describe('sql_exec text table formatting', () => {
    test('should format empty results in text mode', async () => {
      mockExecutor.executeQuery.mockResolvedValue({
        command: 'SELECT',
        rowCount: 0,
        rows: [],
        duration: 10,
      });

      const response = await handler.handleToolCall({
        tool: 'sql_exec',
        arguments: { query: 'SELECT * FROM empty', json: false },
      });

      expect(response.content[0].type).toBe('text');
      expect(response.content[0].text).toContain('Command: SELECT');
      expect(response.content[0].text).toContain('Rows: 0');
      expect(response.content[0].text).not.toContain('|'); // No table headers
    });

    test('should handle null values in text table', async () => {
      mockExecutor.executeQuery.mockResolvedValue({
        command: 'SELECT',
        rowCount: 1,
        rows: [{ id: 1, name: null, active: true }],
        duration: 15,
      });

      const response = await handler.handleToolCall({
        tool: 'sql_exec',
        arguments: { query: 'SELECT * FROM users', json: false },
      });

      expect(response.content[0].type).toBe('text');
      expect(response.content[0].text).toContain('id | name | active');
      expect(response.content[0].text).toContain('1 |  | true'); // null shows as empty
    });

    test('should handle special characters in text table', async () => {
      mockExecutor.executeQuery.mockResolvedValue({
        command: 'SELECT',
        rowCount: 1,
        rows: [{ text: 'Line 1\nLine 2', emoji: '🚀' }],
        duration: 20,
      });

      const response = await handler.handleToolCall({
        tool: 'sql_exec',
        arguments: { query: 'SELECT * FROM test', json: false },
      });

      expect(response.content[0].type).toBe('text');
      expect(response.content[0].text).toContain('text | emoji');
      expect(response.content[0].text).toContain('Line 1\nLine 2 | 🚀');
    });
  });

  describe('sql_file tool', () => {
    test('should set timeout for file execution', async () => {
      mockExecutor.executeFile.mockResolvedValue({
        command: 'CREATE TABLE',
        rowCount: 0,
        rows: [],
        duration: 100,
      });

      await handler.handleToolCall({
        tool: 'sql_file',
        arguments: { filepath: '/path/to/file.sql', timeout: 30000 },
      });

      expect(process.env.POSTGRES_STATEMENT_TIMEOUT).toBe('30000');
      expect(mockExecutor.executeFile).toHaveBeenCalledWith('/path/to/file.sql', true, 30000);
    });

    test('should format file results as text table', async () => {
      mockExecutor.executeFile.mockResolvedValue({
        command: 'SELECT',
        rowCount: 2,
        rows: [
          { id: 1, status: 'active' },
          { id: 2, status: 'inactive' },
        ],
        duration: 25,
      });

      const response = await handler.handleToolCall({
        tool: 'sql_file',
        arguments: { filepath: '/path/to/query.sql', json: false },
      });

      expect(response.content[0].type).toBe('text');
      expect(response.content[0].text).toContain('Command: SELECT');
      expect(response.content[0].text).toContain('Rows: 2');
      expect(response.content[0].text).toContain('id | status');
      expect(response.content[0].text).toContain('1 | active');
      expect(response.content[0].text).toContain('2 | inactive');
    });
  });

  describe('sql_schema tool', () => {
    test('should handle schema errors', async () => {
      mockExecutor.getSchema.mockRejectedValue(new Error('Permission denied'));

      const response = await handler.handleToolCall({
        tool: 'sql_schema',
        arguments: { tables: ['secret_table'] },
      });

      expect(response.content[0].type).toBe('error');
      expect(response.content[0].error).toBe('Permission denied');
    });
  });

  describe('sql_backup tool', () => {
    test('should handle backup with all options', async () => {
      mockExecutor.backup.mockResolvedValue({
        success: true,
        outputPath: '/backups/db_backup.dump',
        size: 1048576, // 1MB
        duration: 2000,
      });

      const response = await handler.handleToolCall({
        tool: 'sql_backup',
        arguments: {
          format: 'custom',
          tables: ['users', 'posts'],
          schemas: ['public', 'auth'],
          dataOnly: false,
          schemaOnly: false,
          compress: true,
          outputPath: '/backups/db_backup.dump',
        },
      });

      expect(mockExecutor.backup).toHaveBeenCalledWith({
        format: 'custom',
        tables: ['users', 'posts'],
        schemas: ['public', 'auth'],
        dataOnly: false,
        schemaOnly: false,
        compress: true,
        outputPath: '/backups/db_backup.dump',
      });

      expect(response.content[0].type).toBe('text');
      const result = JSON.parse(response.content[0].text!);
      expect(result).toMatchObject({
        success: true,
        message: 'Backup completed successfully',
        outputPath: '/backups/db_backup.dump',
        size: 1048576,
        sizeFormatted: ' (1.00 MB)',
        duration: 2000,
        durationFormatted: '2.00s',
      });
    });

    test('should handle conflicting backup options', async () => {
      const response = await handler.handleToolCall({
        tool: 'sql_backup',
        arguments: {
          dataOnly: true,
          schemaOnly: true,
        },
      });

      expect(response.content[0].type).toBe('error');
      expect(response.content[0].error).toBe('Cannot specify both dataOnly and schemaOnly options');
    });

    test('should validate backup format', async () => {
      const response = await handler.handleToolCall({
        tool: 'sql_backup',
        arguments: {
          format: 'invalid',
        },
      });

      expect(response.content[0].type).toBe('error');
      expect(response.content[0].error).toContain('Invalid format');
    });

    test('should handle backup failure', async () => {
      mockExecutor.backup.mockResolvedValue({
        success: false,
        outputPath: '',
        duration: 500,
        error: 'pg_dump not found',
      });

      const response = await handler.handleToolCall({
        tool: 'sql_backup',
        arguments: {},
      });

      expect(response.content[0].type).toBe('error');
      expect(response.content[0].error).toBe('pg_dump not found');
    });

    test('should handle backup without size info', async () => {
      mockExecutor.backup.mockResolvedValue({
        success: true,
        outputPath: '/backups/test.sql',
        size: undefined,
        duration: 1500,
      });

      const response = await handler.handleToolCall({
        tool: 'sql_backup',
        arguments: {},
      });

      const result = JSON.parse(response.content[0].text!);
      expect(result.sizeFormatted).toBe('');
    });

    test('should handle backup exceptions', async () => {
      mockExecutor.backup.mockRejectedValue(new Error('Disk full'));

      const response = await handler.handleToolCall({
        tool: 'sql_backup',
        arguments: {},
      });

      expect(response.content[0].type).toBe('error');
      expect(response.content[0].error).toBe('Disk full');
    });
  });

  describe('sql_health tool', () => {
    test('should handle general exceptions in health check', async () => {
      // The general error catch is already tested in the Error Handling section
      // This test was trying to test line 87-88 which is already covered by
      // "should handle general errors in handleToolCall"
      // Let's test a specific health check error instead

      mockExecutor.executeQuery.mockImplementation(async () => {
        throw new Error('Database is in recovery mode');
      });

      const response = await handler.handleToolCall({
        tool: 'sql_health',
        arguments: {},
      });

      // The error is caught and returned as an error response
      expect(response.content[0].type).toBe('text');
      const result = JSON.parse(response.content[0].text!);
      expect(result.status).toBe('unhealthy');
      expect(result.connectionTest.error).toBe('Database is in recovery mode');
    });

    test('should format unhealthy status in text mode', async () => {
      mockExecutor.executeQuery.mockRejectedValue(new Error('Connection timeout'));

      const response = await handler.handleToolCall({
        tool: 'sql_health',
        arguments: { json: false },
      });

      expect(response.content[0].type).toBe('text');
      expect(response.content[0].text).toContain('Status: UNHEALTHY');
      expect(response.content[0].text).toContain('Success: false');
      expect(response.content[0].text).toContain('Error: Connection timeout');
    });

    test('should handle missing latency in text mode', async () => {
      mockExecutor.executeQuery.mockImplementation(async () => ({
        command: 'SELECT',
        rowCount: 1,
        rows: [{ test: 1 }],
        duration: 0, // No latency
      }));

      const response = await handler.handleToolCall({
        tool: 'sql_health',
        arguments: { json: false },
      });

      expect(response.content[0].type).toBe('text');
      expect(response.content[0].text).toContain('Success: true');
      // Should not include latency line when it's 0
    });

    test('should display database error in text mode', async () => {
      mockExecutor.executeQuery.mockImplementation(async (query: string) => {
        if (query === 'SELECT 1 as test') {
          return {
            command: 'SELECT',
            rowCount: 1,
            rows: [{ test: 1 }],
            duration: 5,
          };
        }
        throw new Error('Function does not exist');
      });

      const response = await handler.handleToolCall({
        tool: 'sql_health',
        arguments: { json: false },
      });

      expect(response.content[0].text).toContain('Database:');
      expect(response.content[0].text).toContain('Error: Function does not exist');
    });

    test('should handle pool stats in text mode', async () => {
      mockExecutor.executeQuery.mockResolvedValue({
        command: 'SELECT',
        rowCount: 1,
        rows: [{ test: 1 }],
        duration: 5,
      });

      // Use Object.defineProperty to set readonly property
      Object.defineProperty(mockExecutor, 'poolManagerInstance', {
        get: () => ({
          getStatus: () => ({
            initialized: true,
            total: 10,
            idle: 8,
            waiting: 2,
            maxConnections: 20,
            idleTimeout: 10000,
            connectionTimeout: 5000,
          }),
        }),
        configurable: true,
      });

      const response = await handler.handleToolCall({
        tool: 'sql_health',
        arguments: { json: false },
      });

      expect(response.content[0].text).toContain('Connection Pool:');
      expect(response.content[0].text).toContain('Total: 10');
      expect(response.content[0].text).toContain('Idle: 8');
      expect(response.content[0].text).toContain('Waiting: 2');
    });
  });
});
