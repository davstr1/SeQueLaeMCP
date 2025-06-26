import { Pool } from 'pg';
import { SqlExecutor } from '../src/core/sql-executor';
// Import main is not needed - we'll test through spawn

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

describe('CLI Exec Command', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    console.log = jest.fn();
    console.error = jest.fn();
    console.table = jest.fn();
    process.exit = jest.fn() as never;

    (Pool as jest.MockedClass<typeof Pool>).mockImplementation(() => mockPool as unknown as Pool);
    (SqlExecutor as jest.MockedClass<typeof SqlExecutor>).mockImplementation(
      () => mockExecutor as unknown as SqlExecutor
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

  describe('exec command', () => {
    test('should execute successful query in text mode', async () => {
      const mockResult = {
        success: true,
        command: 'SELECT',
        rowCount: 2,
        rows: [
          { id: 1, name: 'Alice' },
          { id: 2, name: 'Bob' },
        ],
        fields: [
          { name: 'id', dataTypeID: 23 },
          { name: 'name', dataTypeID: 25 },
        ],
        duration: 50,
      };

      mockExecutor.executeQuery.mockResolvedValue(mockResult);

      // This test needs to be rewritten to use spawn or mock process.argv
      process.argv = ['node', 'sequelae', 'exec', 'SELECT * FROM users'];
      const { main } = require('../src/cli');
      await main();

      expect(mockExecutor.executeQuery).toHaveBeenCalledWith(
        'SELECT * FROM users',
        true,
        undefined
      );
      expect(console.table).toHaveBeenCalledWith(mockResult.rows);
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('2 rows'));
      expect(process.exit).toHaveBeenCalledWith(0);
    });

    test('should execute successful query in JSON mode', async () => {
      const mockResult = {
        success: true,
        command: 'SELECT',
        rowCount: 1,
        rows: [{ count: '42' }],
        fields: [{ name: 'count', dataTypeID: 20 }],
        duration: 25,
      };

      mockExecutor.executeQuery.mockResolvedValue(mockResult);

      process.argv = ['node', 'sequelae', '--json', 'exec', 'SELECT COUNT(*) FROM users'];
      const { main } = require('../src/cli');
      await main();

      expect(mockExecutor.executeQuery).toHaveBeenCalledWith(
        'SELECT COUNT(*) FROM users',
        true,
        undefined
      );
      const expectedResult = {
        success: true,
        command: 'SELECT',
        rowCount: 1,
        rows: [{ count: '42' }],
        duration: 25,
      };
      expect(console.log).toHaveBeenCalledWith(JSON.stringify(expectedResult));
      expect(process.exit).toHaveBeenCalledWith(0);
    });

    test('should handle query with syntax error', async () => {
      const mockError = new Error('syntax error at or near "SELCT"') as Error & {
        position?: number;
      };
      mockError.position = 1;

      mockExecutor.executeQuery.mockRejectedValue(mockError);

      process.argv = ['node', 'sequelae', 'exec', 'SELCT * FROM users'];
      const { main } = require('../src/cli');
      await main();

      expect(console.error).toHaveBeenCalledWith(expect.stringContaining('syntax error'));
      expect(process.exit).toHaveBeenCalledWith(1);
    });

    test('should handle query with empty results', async () => {
      const mockResult = {
        success: true,
        command: 'SELECT',
        rowCount: 0,
        rows: [],
        fields: [
          { name: 'id', dataTypeID: 23 },
          { name: 'name', dataTypeID: 25 },
        ],
        duration: 30,
      };

      mockExecutor.executeQuery.mockResolvedValue(mockResult);

      process.argv = ['node', 'sequelae', 'exec', 'SELECT * FROM users WHERE id = -1'];
      const { main } = require('../src/cli');
      await main();

      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('SELECT  - 30ms'));
      expect(process.exit).toHaveBeenCalledWith(0);
    });

    test('should handle INSERT/UPDATE/DELETE commands', async () => {
      const mockResult = {
        success: true,
        command: 'INSERT',
        rowCount: 1,
        rows: [],
        fields: [],
        duration: 40,
      };

      mockExecutor.executeQuery.mockResolvedValue(mockResult);

      process.argv = ['node', 'sequelae', 'exec', "INSERT INTO users (name) VALUES ('Charlie')"];
      const { main } = require('../src/cli');
      await main();

      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('INSERT (1 rows) - 40ms'));
      expect(process.exit).toHaveBeenCalledWith(0);
    });

    test('should handle query with timeout', async () => {
      const mockResult = {
        success: true,
        command: 'SELECT',
        rowCount: 1,
        rows: [{ id: 1 }],
        fields: [{ name: 'id', dataTypeID: 23 }],
        duration: 100,
      };

      mockExecutor.executeQuery.mockResolvedValue(mockResult);

      process.argv = ['node', 'sequelae', '--timeout', '5000', 'exec', 'SELECT * FROM users'];
      const { main } = require('../src/cli');
      await main();

      expect(mockExecutor.executeQuery).toHaveBeenCalledWith('SELECT * FROM users', true, 5000);
      expect(process.exit).toHaveBeenCalledWith(0);
    });

    test('should handle no-transaction flag', async () => {
      const mockResult = {
        success: true,
        command: 'CREATE',
        rowCount: 0,
        rows: [],
        fields: [],
        duration: 60,
      };

      mockExecutor.executeQuery.mockResolvedValue(mockResult);

      process.argv = ['node', 'sequelae', '--no-transaction', 'exec', 'CREATE TABLE test (id int)'];
      const { main } = require('../src/cli');
      await main();

      expect(mockExecutor.executeQuery).toHaveBeenCalledWith(
        'CREATE TABLE test (id int)',
        false,
        undefined
      );
      expect(process.exit).toHaveBeenCalledWith(0);
    });

    test('should require SQL query argument', async () => {
      process.argv = ['node', 'sequelae', 'exec'];
      const { main } = require('../src/cli');
      await main();

      expect(console.error).toHaveBeenCalledWith('Error: No SQL query provided');
      expect(process.exit).toHaveBeenCalledWith(1);
    });

    test('should handle database connection errors', async () => {
      mockExecutor.executeQuery.mockRejectedValue(new Error('Connection refused'));

      process.argv = ['node', 'sequelae', 'exec', 'SELECT 1'];
      const { main } = require('../src/cli');
      await main();

      expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Connection refused'));
      expect(process.exit).toHaveBeenCalledWith(1);
    });
  });
});
