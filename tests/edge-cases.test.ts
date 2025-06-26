import { SqlExecutor } from '../src/core/sql-executor';
import { Pool } from 'pg';

// Create mocks that can be accessed in tests
const mockClient = {
  query: jest.fn(),
  release: jest.fn(),
  on: jest.fn(),
};

const mockPool = {
  connect: jest.fn().mockResolvedValue(mockClient),
  end: jest.fn().mockResolvedValue(undefined),
  query: jest.fn(),
  on: jest.fn(),
  totalCount: 0,
  idleCount: 0,
  waitingCount: 0,
};

// Mock pg module
jest.mock('pg', () => ({
  Pool: jest.fn(() => mockPool),
}));

describe('Edge Case Tests', () => {
  let executor: SqlExecutor;

  // Helper to mock query with transaction
  const mockQueryWithTransaction = (result: any) => {
    mockClient.query
      .mockResolvedValueOnce({ command: 'BEGIN' })
      .mockResolvedValueOnce(result)
      .mockResolvedValueOnce({ command: 'COMMIT' });
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset PoolManager singleton
    const { PoolManager } = require('../src/core/pool-manager');
    PoolManager.reset();

    process.env.DATABASE_URL = 'postgresql://test:test@localhost/test';
    executor = new SqlExecutor(process.env.DATABASE_URL);
    mockPool.connect.mockResolvedValue(mockClient);
  });

  afterEach(async () => {
    if (executor) {
      await executor.close();
    }
  });

  describe('Large Result Sets', () => {
    test('should handle result with 1000+ rows', async () => {
      const largeResult = {
        command: 'SELECT',
        rowCount: 5000,
        rows: Array(5000)
          .fill(null)
          .map((_, i) => ({
            id: i,
            name: `User ${i}`,
            email: `user${i}@example.com`,
            created_at: new Date().toISOString(),
            data: 'x'.repeat(100), // Some data to increase size
          })),
        fields: [
          { name: 'id', dataTypeID: 23 },
          { name: 'name', dataTypeID: 25 },
          { name: 'email', dataTypeID: 25 },
          { name: 'created_at', dataTypeID: 1114 },
          { name: 'data', dataTypeID: 25 },
        ],
      };

      mockQueryWithTransaction(largeResult);

      const result = await executor.executeQuery('SELECT * FROM large_table');

      expect(result).toBeDefined();
      expect(result.rowCount).toBe(5000);
      expect(result.rows?.length).toBe(5000);

      // Verify memory usage is reasonable (result should be streamable)
      const estimatedSize = JSON.stringify(result).length;
      expect(estimatedSize).toBeGreaterThan(100000); // At least 100KB
    });

    test('should handle very wide tables (many columns)', async () => {
      const columns = Array(100)
        .fill(null)
        .map((_, i) => ({
          name: `column_${i}`,
          dataTypeID: 25,
        }));

      const wideResult = {
        command: 'SELECT',
        rowCount: 10,
        rows: Array(10)
          .fill(null)
          .map(() => {
            const row: any = {};
            columns.forEach((col, i) => {
              row[col.name] = `value_${i}`;
            });
            return row;
          }),
        fields: columns,
      };

      mockQueryWithTransaction(wideResult);

      const result = await executor.executeQuery('SELECT * FROM wide_table');

      expect(result).toBeDefined();
      expect(result.rows?.length).toBe(10);
      expect(Object.keys(result.rows?.[0] || {}).length).toBe(100);
    });

    test('should handle empty result sets', async () => {
      const emptyResult = {
        command: 'SELECT',
        rowCount: 0,
        rows: [],
        fields: [
          { name: 'id', dataTypeID: 23 },
          { name: 'name', dataTypeID: 25 },
        ],
      };

      mockQueryWithTransaction(emptyResult);

      const result = await executor.executeQuery('SELECT * FROM users WHERE 1=0');

      expect(result).toBeDefined();
      expect(result.rowCount).toBe(0);
      expect(result.rows).toEqual([]);
    });
  });

  describe('Concurrent Executions', () => {
    test('should handle multiple queries in parallel', async () => {
      const queries = ['SELECT 1', 'SELECT 2', 'SELECT 3', 'SELECT 4', 'SELECT 5'];

      // Mock different results for each query - need to set up all mocks in advance
      const allMocks: any[] = [];
      queries.forEach((_, i) => {
        allMocks.push({ command: 'BEGIN' });
        allMocks.push({
          command: 'SELECT',
          rowCount: 1,
          rows: [{ result: i + 1 }],
          fields: [{ name: 'result', dataTypeID: 23 }],
        });
        allMocks.push({ command: 'COMMIT' });
      });

      allMocks.forEach(mock => {
        mockClient.query.mockResolvedValueOnce(mock);
      });

      // Execute all queries in parallel
      const promises = queries.map(q => executor.executeQuery(q));
      const results = await Promise.all(promises);

      // Verify all succeeded
      results.forEach((result, i) => {
        expect(result).toBeDefined();
        expect(result.rows?.[0]?.result).toBe(i + 1);
      });

      // Verify pool handled concurrent connections
      expect(mockPool.connect).toHaveBeenCalledTimes(5);
    });

    test('should handle connection pool exhaustion gracefully', async () => {
      // Simulate pool exhaustion
      mockPool.connect
        .mockResolvedValueOnce(mockClient)
        .mockResolvedValueOnce(mockClient)
        .mockRejectedValueOnce(new Error('Connection pool timeout'));

      const promises = [
        executor.executeQuery('SELECT 1'),
        executor.executeQuery('SELECT 2'),
        executor.executeQuery('SELECT 3'), // This should fail
      ];

      const results = await Promise.allSettled(promises);

      expect(results[0].status).toBe('fulfilled');
      expect(results[1].status).toBe('fulfilled');
      expect(results[2].status).toBe('rejected');

      if (results[2].status === 'rejected') {
        expect(results[2].reason.message).toContain('Connection pool timeout');
      }
    });
  });

  describe('Timeout Scenarios', () => {
    test('should handle query timeout', async () => {
      // Simulate a query that times out
      mockClient.query.mockRejectedValueOnce(new Error('Query timeout after 5000ms'));

      await expect(executor.executeQuery('SELECT pg_sleep(10)', true, 5000)).rejects.toThrow(
        'Query timeout'
      );
    });

    test('should handle connection timeout', async () => {
      // Simulate connection timeout
      mockPool.connect.mockRejectedValueOnce(new Error('Connection timeout'));

      await expect(executor.executeQuery('SELECT 1')).rejects.toThrow('Connection timeout');
    });

    test('should complete fast queries before timeout', async () => {
      const fastResult = {
        command: 'SELECT',
        rowCount: 1,
        rows: [{ result: 42 }],
        fields: [{ name: 'result', dataTypeID: 23 }],
      };

      mockQueryWithTransaction(fastResult);

      const result = await executor.executeQuery('SELECT 42', true, 5000);

      expect(result).toBeDefined();
      expect(result.rows?.[0]?.result).toBe(42);
    });
  });

  describe('Connection Failures', () => {
    test('should handle invalid connection string', async () => {
      // const badExecutor = new SqlExecutor('invalid://connection'); - not used

      // Mock constructor to throw
      (Pool as jest.MockedClass<typeof Pool>).mockImplementationOnce(() => {
        throw new Error('Invalid connection string');
      });

      // Executor creation should fail
      expect(() => new SqlExecutor('invalid://connection')).toThrow();
    });

    test('should handle network timeouts', async () => {
      mockPool.connect.mockRejectedValueOnce(new Error('ETIMEDOUT'));

      await expect(executor.executeQuery('SELECT 1')).rejects.toThrow('ETIMEDOUT');
    });

    test('should handle authentication failures', async () => {
      mockPool.connect.mockRejectedValueOnce(
        new Error('password authentication failed for user "test"')
      );

      await expect(executor.executeQuery('SELECT 1')).rejects.toThrow(
        'password authentication failed'
      );
    });

    test('should handle connection drops during query', async () => {
      // Simulate connection drop mid-query
      mockClient.query.mockImplementationOnce(() => {
        // Emit error event on client
        setTimeout(() => {
          const errorHandler = mockClient.on.mock.calls.find(call => call[0] === 'error')?.[1];
          if (errorHandler) {
            errorHandler(new Error('Connection terminated'));
          }
        }, 10);

        return new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Connection terminated')), 20);
        });
      });

      await expect(executor.executeQuery('SELECT pg_sleep(5)')).rejects.toThrow(
        'Connection terminated'
      );
    });
  });

  describe('Special Data Types', () => {
    test('should handle NULL values correctly', async () => {
      const nullResult = {
        command: 'SELECT',
        rowCount: 1,
        rows: [
          {
            id: 1,
            name: null,
            data: null,
            flag: false,
            zero: 0,
            empty: '',
          },
        ],
        fields: [
          { name: 'id', dataTypeID: 23 },
          { name: 'name', dataTypeID: 25 },
          { name: 'data', dataTypeID: 25 },
          { name: 'flag', dataTypeID: 16 },
          { name: 'zero', dataTypeID: 23 },
          { name: 'empty', dataTypeID: 25 },
        ],
      };

      mockQueryWithTransaction(nullResult);

      const result = await executor.executeQuery('SELECT * FROM test');

      expect(result.rows?.[0]?.name).toBeNull();
      expect(result.rows?.[0]?.data).toBeNull();
      expect(result.rows?.[0]?.flag).toBe(false);
      expect(result.rows?.[0]?.zero).toBe(0);
      expect(result.rows?.[0]?.empty).toBe('');
    });

    test('should handle unicode and special characters', async () => {
      const unicodeResult = {
        command: 'SELECT',
        rowCount: 1,
        rows: [
          {
            emoji: '🔥💀☠️',
            chinese: '你好世界',
            arabic: 'مرحبا بالعالم',
            special: '\n\r\t\0',
            quotes: 'It\'s a "test"',
          },
        ],
        fields: [
          { name: 'emoji', dataTypeID: 25 },
          { name: 'chinese', dataTypeID: 25 },
          { name: 'arabic', dataTypeID: 25 },
          { name: 'special', dataTypeID: 25 },
          { name: 'quotes', dataTypeID: 25 },
        ],
      };

      mockQueryWithTransaction(unicodeResult);

      const result = await executor.executeQuery('SELECT * FROM unicode_test');

      expect(result.rows?.[0]?.emoji).toBe('🔥💀☠️');
      expect(result.rows?.[0]?.chinese).toBe('你好世界');
      expect(result.rows?.[0]?.arabic).toBe('مرحبا بالعالم');
    });

    test('should handle very long strings', async () => {
      const longString = 'x'.repeat(1000000); // 1MB string

      const longResult = {
        command: 'SELECT',
        rowCount: 1,
        rows: [{ data: longString }],
        fields: [{ name: 'data', dataTypeID: 25 }],
      };

      mockQueryWithTransaction(longResult);

      const result = await executor.executeQuery('SELECT * FROM long_text');

      expect((result.rows?.[0]?.data as string)?.length).toBe(1000000);
    });
  });

  describe('Transaction Edge Cases', () => {
    test('should handle nested transaction attempts', async () => {
      // PostgreSQL doesn't support nested transactions, uses savepoints instead
      mockClient.query
        .mockResolvedValueOnce({ command: 'BEGIN' })
        .mockRejectedValueOnce(new Error('current transaction is aborted'));

      await expect(
        executor.executeQuery('BEGIN; BEGIN;') // Invalid nested transaction
      ).rejects.toThrow();
    });

    test('should rollback on any error in transaction', async () => {
      mockClient.query
        .mockResolvedValueOnce({ command: 'BEGIN' })
        .mockResolvedValueOnce({ command: 'INSERT', rowCount: 1 })
        .mockRejectedValueOnce(new Error('constraint violation'))
        .mockResolvedValueOnce({ command: 'ROLLBACK' });

      await expect(
        executor.executeQuery('INSERT INTO users VALUES (1); INSERT INTO users VALUES (1);')
      ).rejects.toThrow('constraint violation');

      // Verify rollback was called
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });
  });
});
