import { spawn } from 'child_process';
import { EventEmitter } from 'events';
import { existsSync, statSync, accessSync } from 'fs';
import { resolve, dirname, isAbsolute, normalize } from 'path';

// Mock all external dependencies
jest.mock('child_process');
jest.mock('fs');
jest.mock('path', () => ({
  ...jest.requireActual('path'),
  resolve: jest.fn(),
  dirname: jest.fn(),
  isAbsolute: jest.fn(),
  normalize: jest.fn(),
}));

const mockSpawn = spawn as jest.MockedFunction<typeof spawn>;
const mockExistsSync = existsSync as jest.MockedFunction<typeof existsSync>;
const mockStatSync = statSync as jest.MockedFunction<typeof statSync>;
const mockAccessSync = accessSync as jest.MockedFunction<typeof accessSync>;
const mockResolve = resolve as jest.MockedFunction<typeof resolve>;
const mockDirname = dirname as jest.MockedFunction<typeof dirname>;
const mockIsAbsolute = isAbsolute as jest.MockedFunction<typeof isAbsolute>;
const mockNormalize = normalize as jest.MockedFunction<typeof normalize>;

// Helper to create mock spawn process
function createMockProcess(exitCode: number = 0, stderr: string = '') {
  const proc = new EventEmitter() as any;
  proc.stderr = new EventEmitter();

  // Simulate process behavior
  setTimeout(() => {
    if (stderr) {
      proc.stderr.emit('data', Buffer.from(stderr));
    }
    proc.emit('close', exitCode);
  }, 10);

  return proc;
}

// Helper to create mock spawn that throws
function createMockSpawnError(error: Error) {
  const proc = new EventEmitter() as any;
  proc.stderr = new EventEmitter();

  setTimeout(() => {
    proc.emit('error', error);
  }, 10);

  return proc;
}

describe('Backup Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default mocks
    mockIsAbsolute.mockReturnValue(false);
    mockResolve.mockImplementation((_, path) => `/resolved/${path}`);
    mockDirname.mockReturnValue('/resolved');
    mockNormalize.mockImplementation(path => path); // Pass through by default
    mockAccessSync.mockImplementation(() => {}); // No error by default
    mockExistsSync.mockReturnValue(true);
    mockStatSync.mockReturnValue({ size: 1024 * 1024 } as any); // 1MB
  });

  describe('Backup Command Parsing', () => {
    // Import after mocks are set up
    let SqlExecutor: any;

    beforeEach(() => {
      jest.isolateModules(() => {
        SqlExecutor = require('../src/core/sql-executor').SqlExecutor;
      });
    });

    test('should parse --format option with plain format', async () => {
      mockSpawn.mockReturnValue(createMockProcess(0));

      const executor = new SqlExecutor('postgresql://user:pass@localhost:5432/test');
      const result = await executor.backup({ format: 'plain' });

      // Plain format doesn't add -F flag
      const spawnCall = mockSpawn.mock.calls[0];
      const args = spawnCall[1];
      expect(args).not.toContain('-F');
      expect(result.success).toBe(true);
    });

    test('should parse --format option with custom format', async () => {
      mockSpawn.mockReturnValue(createMockProcess(0));

      const executor = new SqlExecutor('postgresql://user:pass@localhost:5432/test');
      const result = await executor.backup({ format: 'custom' });

      expect(mockSpawn).toHaveBeenCalledWith(
        'pg_dump',
        expect.arrayContaining(['-F', 'c']),
        expect.any(Object)
      );
      expect(result.success).toBe(true);
    });

    test('should parse --format option with directory format', async () => {
      mockSpawn.mockReturnValue(createMockProcess(0));

      const executor = new SqlExecutor('postgresql://user:pass@localhost:5432/test');
      const result = await executor.backup({ format: 'directory' });

      expect(mockSpawn).toHaveBeenCalledWith(
        'pg_dump',
        expect.arrayContaining(['-F', 'd', '-j', '4']),
        expect.any(Object)
      );
      expect(result.success).toBe(true);
    });

    test('should parse --tables option with comma-separated values', async () => {
      mockSpawn.mockReturnValue(createMockProcess(0));

      const executor = new SqlExecutor('postgresql://user:pass@localhost:5432/test');
      const result = await executor.backup({ tables: ['users', 'posts', 'comments'] });

      const spawnCall = mockSpawn.mock.calls[0];
      const args = spawnCall[1];

      expect(args).toContain('-t');
      expect(args).toContain('users');
      expect(args).toContain('posts');
      expect(args).toContain('comments');
      expect(result.success).toBe(true);
    });

    test('should parse --schemas option', async () => {
      mockSpawn.mockReturnValue(createMockProcess(0));

      const executor = new SqlExecutor('postgresql://user:pass@localhost:5432/test');
      const result = await executor.backup({ schemas: ['public', 'custom'] });

      const spawnCall = mockSpawn.mock.calls[0];
      const args = spawnCall[1];

      expect(args).toContain('-n');
      expect(args).toContain('public');
      expect(args).toContain('custom');
      expect(result.success).toBe(true);
    });

    test('should parse --output path resolution', async () => {
      mockSpawn.mockReturnValue(createMockProcess(0));
      mockIsAbsolute.mockReturnValue(false);
      mockResolve.mockReturnValue('/home/user/backup.sql');

      const executor = new SqlExecutor('postgresql://user:pass@localhost:5432/test');
      const result = await executor.backup({ outputPath: 'backup.sql' });

      expect(mockResolve).toHaveBeenCalledWith(process.cwd(), 'backup.sql');
      expect(mockSpawn).toHaveBeenCalledWith(
        'pg_dump',
        expect.arrayContaining(['-f', '/home/user/backup.sql']),
        expect.any(Object)
      );
      expect(result.success).toBe(true);
      expect(result.outputPath).toBe('/home/user/backup.sql');
    });

    test('should handle --data-only flag', async () => {
      mockSpawn.mockReturnValue(createMockProcess(0));

      const executor = new SqlExecutor('postgresql://user:pass@localhost:5432/test');
      const result = await executor.backup({ dataOnly: true });

      expect(mockSpawn).toHaveBeenCalledWith(
        'pg_dump',
        expect.arrayContaining(['-a']),
        expect.any(Object)
      );
      expect(result.success).toBe(true);
    });

    test('should handle --schema-only flag', async () => {
      mockSpawn.mockReturnValue(createMockProcess(0));

      const executor = new SqlExecutor('postgresql://user:pass@localhost:5432/test');
      const result = await executor.backup({ schemaOnly: true });

      expect(mockSpawn).toHaveBeenCalledWith(
        'pg_dump',
        expect.arrayContaining(['-s']),
        expect.any(Object)
      );
      expect(result.success).toBe(true);
    });

    test('should handle --compress flag', async () => {
      mockSpawn.mockReturnValue(createMockProcess(0));

      const executor = new SqlExecutor('postgresql://user:pass@localhost:5432/test');
      const result = await executor.backup({ compress: true });

      expect(mockSpawn).toHaveBeenCalledWith(
        'pg_dump',
        expect.arrayContaining(['-Z', '6']),
        expect.any(Object)
      );
      expect(result.success).toBe(true);
    });
  });

  describe('Backup Error Scenarios', () => {
    let SqlExecutor: any;

    beforeEach(() => {
      jest.isolateModules(() => {
        SqlExecutor = require('../src/core/sql-executor').SqlExecutor;
      });
    });

    test('should handle pg_dump not found (ENOENT error)', async () => {
      const error = new Error('spawn pg_dump ENOENT') as any;
      error.code = 'ENOENT';
      error.errno = -2;
      error.syscall = 'spawn pg_dump';
      error.path = 'pg_dump';

      mockSpawn.mockReturnValue(createMockSpawnError(error));

      const executor = new SqlExecutor('postgresql://user:pass@localhost:5432/test');

      await expect(executor.backup({})).rejects.toThrow(
        'pg_dump not found. Please ensure PostgreSQL client tools are installed.'
      );
    });

    test('should handle pg_dump failure with non-zero exit code', async () => {
      mockSpawn.mockReturnValue(createMockProcess(1, 'pg_dump: error: connection failed'));

      const executor = new SqlExecutor('postgresql://user:pass@localhost:5432/test');

      await expect(executor.backup({})).rejects.toThrow(
        'pg_dump failed with exit code 1: pg_dump: error: connection failed'
      );
    });

    test('should handle output directory not writable', async () => {
      mockAccessSync.mockImplementation(() => {
        const error = new Error('Permission denied') as any;
        error.code = 'EACCES';
        throw error;
      });

      const executor = new SqlExecutor('postgresql://user:pass@localhost:5432/test');
      const result = await executor.backup({ outputPath: '/readonly/backup.sql' });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Output directory not writable: /resolved');
    });

    test('should handle invalid format option', async () => {
      const executor = new SqlExecutor('postgresql://user:pass@localhost:5432/test');

      // Invalid format results in pg_dump error
      mockSpawn.mockReturnValue(
        createMockProcess(
          1,
          'pg_dump: error: unrecognized archive format "i"; valid formats are "custom", "directory", "tar", and "plain"'
        )
      );

      await expect(executor.backup({ format: 'invalid' as any })).rejects.toThrow(
        'pg_dump failed with exit code 1'
      );
    });

    test('should return error for conflicting options (data-only + schema-only)', async () => {
      const executor = new SqlExecutor('postgresql://user:pass@localhost:5432/test');

      // The backup method returns an error result, doesn't throw
      const result = await executor.backup({
        dataOnly: true,
        schemaOnly: true,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Cannot specify both dataOnly and schemaOnly options');
    });

    test('should handle spawn error with generic message', async () => {
      const error = new Error('Unknown spawn error');
      mockSpawn.mockReturnValue(createMockSpawnError(error));

      const executor = new SqlExecutor('postgresql://user:pass@localhost:5432/test');

      await expect(executor.backup({})).rejects.toThrow(
        'Failed to execute pg_dump: Unknown spawn error'
      );
    });
  });

  describe('Backup Success Scenarios', () => {
    let SqlExecutor: any;

    beforeEach(() => {
      jest.isolateModules(() => {
        SqlExecutor = require('../src/core/sql-executor').SqlExecutor;
      });
    });

    test('should successfully create backup', async () => {
      mockSpawn.mockReturnValue(createMockProcess(0));
      mockStatSync.mockReturnValue({ size: 5 * 1024 * 1024 } as any); // 5MB

      const executor = new SqlExecutor('postgresql://user:pass@localhost:5432/test');
      const result = await executor.backup({ outputPath: 'backup.sql' });

      expect(result.success).toBe(true);
      expect(result.outputPath).toBe('/resolved/backup.sql');
      expect(result.size).toBe(5 * 1024 * 1024);
      expect(result.duration).toBeGreaterThan(0);
      expect(result.duration).toBeLessThan(1000); // Should complete quickly
    });

    test('should calculate file size correctly', async () => {
      mockSpawn.mockReturnValue(createMockProcess(0));
      mockStatSync.mockReturnValue({ size: 10485760 } as any); // 10MB

      const executor = new SqlExecutor('postgresql://user:pass@localhost:5432/test');
      const result = await executor.backup({});

      expect(mockStatSync).toHaveBeenCalledWith(expect.stringContaining('backup_'));
      expect(result.size).toBe(10485760);
    });

    test('should track duration correctly', async () => {
      // Create a process that takes 100ms
      const proc = new EventEmitter() as any;
      proc.stderr = new EventEmitter();
      setTimeout(() => proc.emit('close', 0), 100);

      mockSpawn.mockReturnValue(proc);

      const executor = new SqlExecutor('postgresql://user:pass@localhost:5432/test');
      const result = await executor.backup({});

      // Allow for timing variations in CI - check it's roughly 100ms (±20ms)
      expect(result.duration).toBeGreaterThanOrEqual(80);
      expect(result.duration).toBeLessThan(200);
    });

    test('should handle file size calculation error gracefully', async () => {
      mockSpawn.mockReturnValue(createMockProcess(0));
      mockStatSync.mockImplementation(() => {
        throw new Error('File not found');
      });

      const executor = new SqlExecutor('postgresql://user:pass@localhost:5432/test');
      const result = await executor.backup({});

      expect(result.success).toBe(true);
      expect(result.size).toBeUndefined();
    });

    test('should pass environment variables including PGPASSWORD', async () => {
      mockSpawn.mockReturnValue(createMockProcess(0));

      const executor = new SqlExecutor('postgresql://user:mypassword@localhost:5432/test');
      await executor.backup({});

      const spawnCall = mockSpawn.mock.calls[0];
      const options = spawnCall[2];

      expect(options.env).toMatchObject({
        ...process.env,
        PGPASSWORD: 'mypassword',
      });
    });

    test('should generate default output filename with timestamp', async () => {
      mockSpawn.mockReturnValue(createMockProcess(0));

      const executor = new SqlExecutor('postgresql://user:pass@localhost:5432/test');
      const result = await executor.backup({}); // No outputPath specified

      // Default format is plain (.sql), timestamp format: YYYY-MM-DDTHH-mm-ss
      expect(result.outputPath).toMatch(/backup_\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}\.sql$/);
    });
  });
});
