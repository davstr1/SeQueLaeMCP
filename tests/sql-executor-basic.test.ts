import { SqlExecutor } from '../src/core/sql-executor';
import { PoolManager } from '../src/core/pool-manager';

jest.mock('../src/core/pool-manager');

describe('SqlExecutor Basic Tests', () => {
  let executor: SqlExecutor;
  let mockPoolManager: jest.Mocked<PoolManager>;
  let mockClient: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockClient = {
      query: jest.fn(),
      release: jest.fn(),
    };

    mockPoolManager = {
      initialize: jest.fn(),
      getClient: jest.fn().mockResolvedValue(mockClient),
      getPool: jest.fn(),
      isInitialized: jest.fn().mockReturnValue(true),
      getStats: jest.fn().mockReturnValue({ total: 0, idle: 0, waiting: 0 }),
      getStatus: jest.fn(),
      close: jest.fn(),
    } as any;

    (PoolManager.getInstance as jest.Mock).mockReturnValue(mockPoolManager);

    executor = new SqlExecutor('postgresql://test@localhost/test');
  });

  describe('executeQuery', () => {
    test('should execute simple SELECT query', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [] }); // BEGIN
      mockClient.query.mockResolvedValueOnce({
        command: 'SELECT',
        rowCount: 2,
        rows: [{ id: 1 }, { id: 2 }],
      });
      mockClient.query.mockResolvedValueOnce({ rows: [] }); // COMMIT

      const result = await executor.executeQuery('SELECT * FROM users');

      expect(result.command).toBe('SELECT');
      expect(result.rowCount).toBe(2);
      expect(result.rows).toEqual([{ id: 1 }, { id: 2 }]);
      expect(mockClient.release).toHaveBeenCalled();
    });

    test('should handle query with timeout', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [] }); // SET statement_timeout
      mockClient.query.mockResolvedValueOnce({ rows: [] }); // BEGIN
      mockClient.query.mockResolvedValueOnce({
        command: 'SELECT',
        rowCount: 1,
        rows: [{ count: 42 }],
      });
      mockClient.query.mockResolvedValueOnce({ rows: [] }); // COMMIT

      const result = await executor.executeQuery('SELECT COUNT(*) FROM logs', true, 5000);

      expect(mockClient.query).toHaveBeenCalledWith('SET statement_timeout = 5000');
      expect(result.rowCount).toBe(1);
      expect(mockClient.release).toHaveBeenCalled();
    });

    test('should not wrap transaction commands', async () => {
      mockClient.query.mockResolvedValueOnce({
        command: 'BEGIN',
        rowCount: 0,
        rows: [],
      });

      const result = await executor.executeQuery('BEGIN');

      expect(result.command).toBe('BEGIN');
      expect(mockClient.query).toHaveBeenCalledTimes(1);
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.release).toHaveBeenCalled();
    });

    test('should handle INSERT/UPDATE/DELETE operations', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [] }); // BEGIN
      mockClient.query.mockResolvedValueOnce({
        command: 'INSERT',
        rowCount: 1,
        rows: [{ id: 123, name: 'Test' }],
      });
      mockClient.query.mockResolvedValueOnce({ rows: [] }); // COMMIT

      const result = await executor.executeQuery(
        "INSERT INTO users (name) VALUES ('Test') RETURNING *"
      );

      expect(result.command).toBe('INSERT');
      expect(result.rowCount).toBe(1);
      expect(result.rows[0]).toEqual({ id: 123, name: 'Test' });
      expect(mockClient.release).toHaveBeenCalled();
    });

    test('should rollback on error', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [] }); // BEGIN
      mockClient.query.mockRejectedValueOnce(new Error('Constraint violation'));
      mockClient.query.mockResolvedValueOnce({ rows: [] }); // ROLLBACK

      await expect(executor.executeQuery('INSERT INTO users (id) VALUES (1)')).rejects.toThrow(
        'Constraint violation'
      );

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });

    test('should handle rollback failure gracefully', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [] }); // BEGIN
      mockClient.query.mockRejectedValueOnce(new Error('Query error'));
      mockClient.query.mockRejectedValueOnce(new Error('Rollback failed')); // ROLLBACK fails

      await expect(executor.executeQuery('DELETE FROM important_table')).rejects.toThrow(
        'Query error'
      );

      expect(mockClient.release).toHaveBeenCalled();
    });

    test('should work with transaction disabled', async () => {
      mockClient.query.mockResolvedValueOnce({
        command: 'DELETE',
        rowCount: 5,
        rows: [],
      });

      const result = await executor.executeQuery('DELETE FROM logs WHERE old = true', false);

      expect(result.command).toBe('DELETE');
      expect(result.rowCount).toBe(5);
      expect(mockClient.query).toHaveBeenCalledTimes(1);
      expect(mockClient.query).not.toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).not.toHaveBeenCalledWith('COMMIT');
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('getSchema', () => {
    test('should get schema for specific tables', async () => {
      mockClient.query.mockResolvedValueOnce({
        rows: [
          { table_name: 'users', column_name: 'id', data_type: 'integer' },
          { table_name: 'users', column_name: 'name', data_type: 'text' },
        ],
      });

      const result = await executor.getSchema(['users']);

      expect(result).toContain('users');
      expect(result).toContain('id');
      expect(result).toContain('integer');
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('cleanup', () => {
    test('should close pool manager on cleanup', async () => {
      await executor.cleanup();
      expect(mockPoolManager.close).toHaveBeenCalled();
    });
  });
});
