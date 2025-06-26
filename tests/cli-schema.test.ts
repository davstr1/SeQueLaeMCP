import { Pool } from 'pg';
import { SqlExecutor } from '../src/core/sql-executor';
// Import main is not needed - we'll test through process.argv

// Mock dependencies
jest.mock('pg');
jest.mock('../src/core/sql-executor');

const mockPool = {
  connect: jest.fn(),
  end: jest.fn(),
  on: jest.fn(),
  totalCount: 0,
  idleCount: 0,
  waitingCount: 0,
};

const mockExecutor = {
  executeQuery: jest.fn(),
  executeFile: jest.fn(),
  getSchema: jest.fn(),
  createBackup: jest.fn(),
  close: jest.fn().mockResolvedValue(undefined),
};

// Mock console methods
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
const originalConsoleTable = console.table;
const originalProcessExit = process.exit;

describe('CLI Schema Command', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    console.log = jest.fn();
    console.error = jest.fn();
    console.table = jest.fn();
    process.exit = jest.fn() as never;

    (Pool as jest.MockedClass<typeof Pool>).mockImplementation(() => mockPool as any);
    (SqlExecutor as jest.MockedClass<typeof SqlExecutor>).mockImplementation(
      () => mockExecutor as any
    );

    // Setup environment
    process.env.DATABASE_URL = 'postgresql://test:test@localhost/test';
  });

  afterEach(() => {
    console.log = originalConsoleLog;
    console.error = originalConsoleError;
    console.table = originalConsoleTable;
    process.exit = originalProcessExit;
  });

  describe('schema command', () => {
    test('should show full schema in text mode', async () => {
      const mockResult = {
        command: 'SELECT',
        rowCount: 2,
        rows: [
          {
            type: 'found',
            table_schema: 'public',
            table_name: 'users',
            columns: JSON.stringify([
              { column_name: 'id', data_type: 'integer', is_nullable: 'NO' },
              { column_name: 'email', data_type: 'varchar', is_nullable: 'NO' },
            ]),
            constraints: JSON.stringify([
              { constraint_type: 'PRIMARY KEY', constraint_name: 'users_pkey', column_name: 'id' },
            ]),
          },
          {
            type: 'found',
            table_schema: 'public',
            table_name: 'posts',
            columns: JSON.stringify([
              { column_name: 'id', data_type: 'integer', is_nullable: 'NO' },
              { column_name: 'title', data_type: 'text', is_nullable: 'YES' },
            ]),
            constraints: JSON.stringify([]),
          },
        ],
      };

      mockExecutor.executeQuery.mockResolvedValue(mockResult);

      process.argv = ['node', 'sequelae', 'schema'];
      const { main } = require('../src/cli');
      await main();

      expect(mockExecutor.executeQuery).toHaveBeenCalled();
      expect(mockExecutor.executeQuery.mock.calls[0][0]).toContain('information_schema.tables');

      // Should display both tables
      expect(console.log).toHaveBeenCalledWith('📋 public.users');
      expect(console.log).toHaveBeenCalledWith('📋 public.posts');
      expect(process.exit).toHaveBeenCalledWith(0);
    });

    test('should show specific tables schema', async () => {
      const mockResult = {
        command: 'SELECT',
        rowCount: 1,
        rows: [
          {
            type: 'found',
            table_schema: 'public',
            table_name: 'users',
            columns: JSON.stringify([
              { column_name: 'id', data_type: 'integer', is_nullable: 'NO' },
            ]),
            constraints: JSON.stringify([]),
          },
        ],
      };

      mockExecutor.executeQuery.mockResolvedValue(mockResult);

      process.argv = ['node', 'sequelae', 'schema', 'users,posts'];
      const { main } = require('../src/cli');
      await main();

      expect(mockExecutor.executeQuery).toHaveBeenCalled();
      // Check that the query includes the specific tables
      expect(mockExecutor.executeQuery.mock.calls[0][0]).toContain("'users'");
      expect(mockExecutor.executeQuery.mock.calls[0][0]).toContain("'posts'");
      expect(console.log).toHaveBeenCalledWith('📋 public.users');
      expect(process.exit).toHaveBeenCalledWith(0);
    });

    test('should show schema in JSON mode', async () => {
      const mockResult = {
        command: 'SELECT',
        rowCount: 1,
        rows: [
          {
            table_schema: 'public',
            table_name: 'users',
            columns: JSON.stringify([{ column_name: 'id', data_type: 'integer' }]),
            constraints: JSON.stringify([]),
          },
        ],
        duration: 50,
      };

      mockExecutor.executeQuery.mockResolvedValue(mockResult);

      process.argv = ['node', 'sequelae', '--json', 'schema'];
      const { main } = require('../src/cli');
      await main();

      const expectedOutput = {
        success: true,
        command: 'SELECT',
        rowCount: 1,
        rows: mockResult.rows,
        duration: 50,
      };
      expect(console.log).toHaveBeenCalledWith(JSON.stringify(expectedOutput));
      expect(process.exit).toHaveBeenCalledWith(0);
    });

    test('should include system tables with --all flag', async () => {
      const mockResult = {
        command: 'SELECT',
        rowCount: 1,
        rows: [
          {
            table_schema: 'pg_catalog',
            table_name: 'pg_class',
            columns: JSON.stringify([]),
            constraints: JSON.stringify([]),
          },
        ],
      };

      mockExecutor.executeQuery.mockResolvedValue(mockResult);

      process.argv = ['node', 'sequelae', 'schema', '--all'];
      const { main } = require('../src/cli');
      await main();

      // Check that query doesn't exclude system schemas
      expect(mockExecutor.executeQuery.mock.calls[0][0]).toContain(
        "table_schema NOT IN ('pg_catalog', 'information_schema')"
      );
      expect(process.exit).toHaveBeenCalledWith(0);
    });

    test('should handle non-existent table', async () => {
      const mockResult = {
        command: 'SELECT',
        rowCount: 1,
        rows: [
          {
            type: 'missing',
            missing_table: 'nonexistent',
            suggestions: 'users, posts',
          },
        ],
      };

      mockExecutor.executeQuery.mockResolvedValue(mockResult);

      process.argv = ['node', 'sequelae', 'schema', 'nonexistent'];
      const { main } = require('../src/cli');
      await main();

      expect(console.log).toHaveBeenCalledWith('❌ TABLES NOT FOUND:\n');
      expect(console.log).toHaveBeenCalledWith('  - "nonexistent"');
      expect(process.exit).toHaveBeenCalledWith(0);
    });

    test('should handle schema retrieval error', async () => {
      mockExecutor.executeQuery.mockRejectedValue(new Error('Permission denied'));

      process.argv = ['node', 'sequelae', 'schema'];
      const { main } = require('../src/cli');
      await main();

      expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Permission denied'));
      expect(process.exit).toHaveBeenCalledWith(1);
    });

    test('should parse table list with spaces', async () => {
      const mockResult = {
        command: 'SELECT',
        rowCount: 0,
        rows: [],
      };

      mockExecutor.executeQuery.mockResolvedValue(mockResult);

      process.argv = ['node', 'sequelae', 'schema', 'users, posts, comments'];
      const { main } = require('../src/cli');
      await main();

      // Check that all tables are included in the query
      const query = mockExecutor.executeQuery.mock.calls[0][0];
      expect(query).toContain("'users'");
      expect(query).toContain("'posts'");
      expect(query).toContain("'comments'");
      expect(process.exit).toHaveBeenCalledWith(0);
    });
  });
});
