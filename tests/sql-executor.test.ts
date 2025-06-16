import { SqlExecutor } from '../src/core/sql-executor';
import { Pool } from 'pg';
import * as fs from 'fs';

// Mock pg module
jest.mock('pg', () => {
  const mockPool = {
    query: jest.fn(),
    end: jest.fn(),
  };
  return {
    Pool: jest.fn(() => mockPool),
  };
});

// Mock fs module
jest.mock('fs', () => ({
  readFileSync: jest.fn(),
  existsSync: jest.fn(),
}));

describe('SqlExecutor', () => {
  let executor: SqlExecutor;
  let mockPool: any;

  beforeEach(() => {
    jest.clearAllMocks();
    executor = new SqlExecutor('postgresql://test:test@localhost:5432/test');
    mockPool = (Pool as jest.MockedClass<typeof Pool>).mock.results[0].value;
  });

  describe('constructor', () => {
    test('should create pool with correct configuration', () => {
      expect(Pool).toHaveBeenCalledWith({
        connectionString: 'postgresql://test:test@localhost:5432/test',
        ssl: { rejectUnauthorized: false },
      });
    });
  });

  describe('executeQuery', () => {
    test('should execute query and return formatted result', async () => {
      const mockResult = {
        command: 'SELECT',
        rowCount: 2,
        rows: [
          { id: 1, name: 'Test' },
          { id: 2, name: 'Test2' },
        ],
      };
      mockPool.query.mockResolvedValue(mockResult);

      const result = await executor.executeQuery('SELECT * FROM users');

      expect(mockPool.query).toHaveBeenCalledWith('SELECT * FROM users');
      expect(result).toMatchObject({
        command: 'SELECT',
        rowCount: 2,
        rows: mockResult.rows,
      });
      expect(result.duration).toBeDefined();
      expect(typeof result.duration).toBe('number');
    });

    test('should handle empty result', async () => {
      const mockResult = {
        command: 'SELECT',
        rowCount: 0,
        rows: [],
      };
      mockPool.query.mockResolvedValue(mockResult);

      const result = await executor.executeQuery('SELECT * FROM users WHERE 1=0');

      expect(result).toMatchObject({
        command: 'SELECT',
        rowCount: 0,
        rows: [],
      });
    });

    test('should handle query errors', async () => {
      const error = new Error('Syntax error');
      mockPool.query.mockRejectedValue(error);

      await expect(executor.executeQuery('INVALID SQL')).rejects.toThrow('Syntax error');
    });
  });

  describe('executeFile', () => {
    test('should read and execute SQL from file', async () => {
      const sqlContent = 'SELECT * FROM users';
      const mockResult = {
        command: 'SELECT',
        rowCount: 1,
        rows: [{ id: 1 }],
      };

      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue(sqlContent);
      mockPool.query.mockResolvedValue(mockResult);

      const result = await executor.executeFile('test.sql');

      expect(fs.existsSync).toHaveBeenCalled();
      expect(fs.readFileSync).toHaveBeenCalledWith(expect.stringContaining('test.sql'), 'utf8');
      expect(mockPool.query).toHaveBeenCalledWith(sqlContent);
      expect(result).toMatchObject({
        command: 'SELECT',
        rowCount: 1,
        rows: mockResult.rows,
      });
    });

    test('should throw error if file does not exist', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      await expect(executor.executeFile('nonexistent.sql')).rejects.toThrow('File not found');
      expect(fs.readFileSync).not.toHaveBeenCalled();
      expect(mockPool.query).not.toHaveBeenCalled();
    });
  });

  describe('getSchema', () => {
    test('should get all tables schema', async () => {
      const mockResult = {
        rows: [
          {
            type: 'found',
            table_schema: 'public',
            table_name: 'users',
            columns: JSON.stringify([
              { column_name: 'id', data_type: 'integer', is_nullable: 'NO' },
            ]),
            constraints: JSON.stringify([
              { constraint_type: 'PRIMARY KEY', constraint_name: 'users_pkey', column_name: 'id' },
            ]),
          },
        ],
      };
      mockPool.query.mockResolvedValue(mockResult);

      const result = await executor.getSchema();

      expect(mockPool.query).toHaveBeenCalledWith(expect.stringContaining('table_info'));
      expect(result.tables).toHaveLength(1);
      expect(result.tables[0]).toMatchObject({
        schema: 'public',
        name: 'users',
        columns: [{ column_name: 'id', data_type: 'integer', is_nullable: 'NO' }],
        constraints: [
          { constraint_type: 'PRIMARY KEY', constraint_name: 'users_pkey', column_name: 'id' },
        ],
      });
    });

    test('should get specific tables schema', async () => {
      const mockResult = {
        rows: [
          {
            type: 'found',
            table_schema: 'public',
            table_name: 'users',
            columns: JSON.stringify([]),
            constraints: JSON.stringify([]),
          },
        ],
      };
      mockPool.query.mockResolvedValue(mockResult);

      const result = await executor.getSchema(['users', 'posts']);

      expect(mockPool.query).toHaveBeenCalledWith(expect.stringContaining("'users','posts'"));
      expect(result.tables).toHaveLength(1);
    });

    test('should include missing tables with suggestions', async () => {
      const mockResult = {
        rows: [
          {
            type: 'missing',
            missing_table: 'userz',
            suggestions: 'users, user_roles',
          },
        ],
      };
      mockPool.query.mockResolvedValue(mockResult);

      const result = await executor.getSchema(['userz']);

      expect(result.tables).toHaveLength(0);
      expect(result.missingTables).toHaveLength(1);
      expect(result.missingTables![0]).toMatchObject({
        table_name: 'userz',
        suggestions: ['users', 'user_roles'],
      });
    });

    test('should handle allSchemas parameter', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      await executor.getSchema([], true);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining("table_schema NOT IN ('pg_catalog', 'information_schema')")
      );
    });
  });

  describe('close', () => {
    test('should close the pool', async () => {
      await executor.close();
      expect(mockPool.end).toHaveBeenCalled();
    });
  });
});
