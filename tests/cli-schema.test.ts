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
      const mockSchema = {
        success: true,
        tables: [
          {
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
            table_name: 'posts',
            columns: JSON.stringify([
              { column_name: 'id', data_type: 'integer', is_nullable: 'NO' },
              { column_name: 'title', data_type: 'text', is_nullable: 'YES' },
            ]),
            constraints: JSON.stringify([]),
          },
        ],
      };

      mockExecutor.getSchema.mockResolvedValue(mockSchema);

      process.argv = ['node', 'sequelae', 'schema'];
      const { main } = require('../src/cli');
      await main();

      expect(mockExecutor.getSchema).toHaveBeenCalledWith(undefined, false);

      // Should display both tables
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Table: users'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Table: posts'));
      expect(console.table).toHaveBeenCalledTimes(4); // 2 tables x 2 (columns + constraints)
      expect(process.exit).toHaveBeenCalledWith(0);
    });

    test('should show specific tables schema', async () => {
      const mockSchema = {
        success: true,
        tables: [
          {
            table_name: 'users',
            columns: JSON.stringify([
              { column_name: 'id', data_type: 'integer', is_nullable: 'NO' },
            ]),
            constraints: JSON.stringify([]),
          },
        ],
      };

      mockExecutor.getSchema.mockResolvedValue(mockSchema);

      process.argv = ['node', 'sequelae', 'schema', 'users,posts'];
      const { main } = require('../src/cli');
      await main();

      expect(mockExecutor.getSchema).toHaveBeenCalledWith(['users', 'posts'], false);
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Table: users'));
      expect(process.exit).toHaveBeenCalledWith(0);
    });

    test('should show schema in JSON mode', async () => {
      const mockSchema = {
        success: true,
        tables: [
          {
            table_name: 'users',
            columns: JSON.stringify([{ column_name: 'id', data_type: 'integer' }]),
            constraints: JSON.stringify([]),
          },
        ],
      };

      mockExecutor.getSchema.mockResolvedValue(mockSchema);

      process.argv = ['node', 'sequelae', '--json', 'schema'];
      const { main } = require('../src/cli');
      await main();

      expect(console.log).toHaveBeenCalledWith(JSON.stringify(mockSchema));
      expect(process.exit).toHaveBeenCalledWith(0);
    });

    test('should include system tables with --all flag', async () => {
      const mockSchema = {
        success: true,
        tables: [
          {
            table_name: 'pg_class',
            columns: JSON.stringify([]),
            constraints: JSON.stringify([]),
          },
        ],
      };

      mockExecutor.getSchema.mockResolvedValue(mockSchema);

      process.argv = ['node', 'sequelae', 'schema', '--all'];
      const { main } = require('../src/cli');
      await main();

      expect(mockExecutor.getSchema).toHaveBeenCalledWith(undefined, true);
      expect(process.exit).toHaveBeenCalledWith(0);
    });

    test('should handle non-existent table', async () => {
      const mockSchema = {
        success: true,
        tables: [],
      };

      mockExecutor.getSchema.mockResolvedValue(mockSchema);

      process.argv = ['node', 'sequelae', 'schema', 'nonexistent'];
      const { main } = require('../src/cli');
      await main();

      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('No tables found'));
      expect(process.exit).toHaveBeenCalledWith(0);
    });

    test('should handle schema retrieval error', async () => {
      mockExecutor.getSchema.mockRejectedValue(new Error('Permission denied'));

      process.argv = ['node', 'sequelae', 'schema'];
      const { main } = require('../src/cli');
      await main();

      expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Permission denied'));
      expect(process.exit).toHaveBeenCalledWith(1);
    });

    test('should parse table list with spaces', async () => {
      const mockSchema = {
        success: true,
        tables: [],
      };

      mockExecutor.getSchema.mockResolvedValue(mockSchema);

      process.argv = ['node', 'sequelae', 'schema', 'users, posts, comments'];
      const { main } = require('../src/cli');
      await main();

      expect(mockExecutor.getSchema).toHaveBeenCalledWith(['users', 'posts', 'comments'], false);
      expect(process.exit).toHaveBeenCalledWith(0);
    });
  });
});
