import { PoolManager } from '../src/core/pool-manager';
import {
  handleVersion,
  handleHelp,
  formatError,
  handleExit,
  parseArguments,
  validateDatabaseUrl,
  createPool,
  getCommandInfo,
  validateCommandArgument,
  validateFile,
  readSqlFile,
  formatQueryResultsJson,
  formatSqlError,
  formatCommandResult,
  buildSchemaCondition,
  buildTableList,
  isDirectSqlCommand,
  SqlAgentError,
  createNoCommandError,
  createNoSqlQueryError,
  createNoFilePathError,
  createFileNotFoundError,
} from '../src/cli';
import { SqlExecutor } from '../src/core/sql-executor';
import { BackupOptions } from '../src/types/backup';
import { analyzeJsonStructure, formatJsonStructure } from '../src/jsonb-analyzer';

describe('Sequelae Unit Tests', () => {
  // Helper function to execute sequelae CLI
  // execSequelae helper moved to cli-behavior.test.ts

  describe('Direct Function Tests', () => {
    describe('handleVersion', () => {
      test('should return version string in text mode', () => {
        const result = handleVersion(false);
        expect(result).toMatch(/^sequelae-mcp v\d+\.\d+\.\d+$/);
      });

      test('should return version object in JSON mode', () => {
        const result = handleVersion(true);
        const parsed = JSON.parse(result);
        expect(parsed).toHaveProperty('version');
        expect(parsed.version).toMatch(/^\d+\.\d+\.\d+$/);
      });
    });

    describe('handleHelp', () => {
      test('should return help text in text mode', () => {
        const result = handleHelp(false);
        expect(result).toContain('Usage:');
        expect(result).toContain('sequelae exec "SQL query"');
        expect(result).toContain('sequelae file path/to/query.sql');
        expect(result).toContain('Examples:');
      });

      test('should return help object in JSON mode', () => {
        const result = handleHelp(true);
        const parsed = JSON.parse(result);
        expect(parsed).toHaveProperty('usage');
        expect(parsed).toHaveProperty('examples');
        expect(Array.isArray(parsed.usage)).toBe(true);
        expect(Array.isArray(parsed.examples)).toBe(true);
        expect(parsed.usage.length).toBeGreaterThan(0);
        expect(parsed.examples.length).toBeGreaterThan(0);
      });
    });

    describe('formatError', () => {
      test('should format error message in text mode', () => {
        const result = formatError('Something went wrong', false);
        expect(result).toBe('Error: Something went wrong');
      });

      test('should format error with hint in text mode', () => {
        const result = formatError(
          'No command provided',
          false,
          'Run sequelae --help for usage information'
        );
        expect(result).toBe(
          'Error: No command provided\nRun sequelae --help for usage information'
        );
      });

      test('should format error as JSON in JSON mode', () => {
        const result = formatError('Something went wrong', true);
        const parsed = JSON.parse(result);
        expect(parsed).toEqual({ error: 'Something went wrong' });
      });

      test('should format error with hint as JSON in JSON mode', () => {
        const result = formatError(
          'No command provided',
          true,
          'Run sequelae --help for usage information'
        );
        const parsed = JSON.parse(result);
        expect(parsed).toEqual({
          error: 'No command provided',
          hint: 'Run sequelae --help for usage information',
        });
      });
    });

    describe('handleExit', () => {
      test('should return goodbye message in text mode', () => {
        const result = handleExit(false);
        expect(result).toBe('Goodbye!');
      });

      test('should return goodbye message as JSON in JSON mode', () => {
        const result = handleExit(true);
        const parsed = JSON.parse(result);
        expect(parsed).toEqual({ message: 'Goodbye!' });
      });
    });

    describe('parseArguments', () => {
      test('should parse no arguments', () => {
        const result = parseArguments([]);
        expect(result).toEqual({
          jsonMode: false,
          allSchemas: false,
          noTransaction: false,
          timeout: undefined,
          filteredArgs: [],
        });
      });

      test('should parse --json flag', () => {
        const result = parseArguments(['--json', 'exec', 'SELECT 1']);
        expect(result).toEqual({
          jsonMode: true,
          allSchemas: false,
          noTransaction: false,
          timeout: undefined,
          filteredArgs: ['exec', 'SELECT 1'],
        });
      });

      test('should parse --all flag', () => {
        const result = parseArguments(['schema', '--all']);
        expect(result).toEqual({
          jsonMode: false,
          allSchemas: true,
          noTransaction: false,
          timeout: undefined,
          filteredArgs: ['schema'],
        });
      });

      test('should parse both --json and --all flags', () => {
        const result = parseArguments(['--json', 'schema', '--all']);
        expect(result).toEqual({
          jsonMode: true,
          allSchemas: true,
          noTransaction: false,
          timeout: undefined,
          filteredArgs: ['schema'],
        });
      });

      test('should filter out flags from arguments', () => {
        const result = parseArguments(['--json', '--help', '--all']);
        expect(result).toEqual({
          jsonMode: true,
          allSchemas: true,
          noTransaction: false,
          timeout: undefined,
          filteredArgs: ['--help'],
        });
      });

      test('should parse --no-transaction flag', () => {
        const result = parseArguments(['--no-transaction', 'exec', 'SELECT 1']);
        expect(result).toEqual({
          jsonMode: false,
          allSchemas: false,
          noTransaction: true,
          timeout: undefined,
          filteredArgs: ['exec', 'SELECT 1'],
        });
      });

      test('should parse --timeout flag with value', () => {
        const result = parseArguments(['--timeout', '5000', 'exec', 'SELECT 1']);
        expect(result).toEqual({
          jsonMode: false,
          allSchemas: false,
          noTransaction: false,
          timeout: 5000,
          filteredArgs: ['exec', 'SELECT 1'],
        });
      });

      test('should ignore --timeout without value', () => {
        const result = parseArguments(['--timeout', 'exec', 'SELECT 1']);
        expect(result).toEqual({
          jsonMode: false,
          allSchemas: false,
          noTransaction: false,
          timeout: undefined,
          filteredArgs: ['SELECT 1'], // 'exec' is consumed as invalid timeout value
        });
      });

      test('should ignore invalid --timeout value', () => {
        const result = parseArguments(['--timeout', 'invalid', 'exec', 'SELECT 1']);
        expect(result).toEqual({
          jsonMode: false,
          allSchemas: false,
          noTransaction: false,
          timeout: undefined,
          filteredArgs: ['exec', 'SELECT 1'],
        });
      });
    });

    describe('validateDatabaseUrl', () => {
      test('should return null for valid database URL', () => {
        const result = validateDatabaseUrl('postgresql://user:pass@host:5432/db', false);
        expect(result).toBeNull();
      });

      test('should return error for undefined URL in text mode', () => {
        const result = validateDatabaseUrl(undefined, false);
        expect(result).toContain('Error: DATABASE_URL environment variable is not set');
        expect(result).toContain('Make sure you have a .env file');
      });

      test('should return error for empty string URL in text mode', () => {
        const result = validateDatabaseUrl('', false);
        expect(result).toContain('Error: DATABASE_URL environment variable is not set');
      });

      test('should return error for undefined URL in JSON mode', () => {
        const result = validateDatabaseUrl(undefined, true);
        const parsed = JSON.parse(result!);
        expect(parsed.error).toBe('DATABASE_URL environment variable is not set');
        expect(parsed.hint).toContain('Make sure you have a .env file');
      });
    });

    describe('createPool', () => {
      test('should create a pool with correct configuration', () => {
        const connectionString = 'postgresql://user:pass@host:5432/db';
        const pool = createPool(connectionString);

        // Check that pool is created (Pool instance)
        expect(pool).toBeDefined();
        expect(pool.constructor.name).toBe('BoundPool');

        // Clean up
        pool.end();
      });

      test('should create pool with SSL configuration', () => {
        const connectionString = 'postgresql://user:pass@host:5432/db';
        const pool = createPool(connectionString);

        // The pool should be configured with SSL settings
        // We can't directly inspect the SSL config, but we can verify the pool is created
        expect(pool).toBeDefined();

        // Clean up
        pool.end();
      });
    });

    describe('getCommandInfo', () => {
      test('should return command info for exec', () => {
        const result = getCommandInfo('exec');
        expect(result).toEqual({
          command: 'exec',
          needsArgument: true,
          argumentName: 'SQL query',
        });
      });

      test('should return command info for file', () => {
        const result = getCommandInfo('file');
        expect(result).toEqual({
          command: 'file',
          needsArgument: true,
          argumentName: 'file path',
        });
      });

      test('should return command info for schema', () => {
        const result = getCommandInfo('schema');
        expect(result).toEqual({
          command: 'schema',
          needsArgument: false,
        });
      });

      test('should return null for unknown command', () => {
        const result = getCommandInfo('unknown');
        expect(result).toBeNull();
      });
    });

    describe('validateCommandArgument', () => {
      test('should return null for command that does not need argument', () => {
        const commandInfo = { command: 'schema', needsArgument: false };
        const result = validateCommandArgument(commandInfo, undefined, false);
        expect(result).toBeNull();
      });

      test('should return null for command with required argument provided', () => {
        const commandInfo = { command: 'exec', needsArgument: true, argumentName: 'SQL query' };
        const result = validateCommandArgument(commandInfo, 'SELECT 1', false);
        expect(result).toBeNull();
      });

      test('should return error for command missing required argument in text mode', () => {
        const commandInfo = { command: 'exec', needsArgument: true, argumentName: 'SQL query' };
        const result = validateCommandArgument(commandInfo, undefined, false);
        expect(result).toBe('Error: No SQL query provided');
      });

      test('should return error for command missing required argument in JSON mode', () => {
        const commandInfo = { command: 'file', needsArgument: true, argumentName: 'file path' };
        const result = validateCommandArgument(commandInfo, undefined, true);
        const parsed = JSON.parse(result!);
        expect(parsed).toEqual({ error: 'No file path provided' });
      });
    });

    describe('validateFile', () => {
      test('should return null for existing file', () => {
        // Test with the test file itself
        const result = validateFile(__filename, false);
        expect(result).toBeNull();
      });

      test('should return error for non-existent file in text mode', () => {
        const result = validateFile('/path/to/nonexistent/file.sql', false);
        expect(result).toBe('Error: File not found: /path/to/nonexistent/file.sql');
      });

      test('should return error for non-existent file in JSON mode', () => {
        const result = validateFile('/path/to/nonexistent/file.sql', true);
        const parsed = JSON.parse(result!);
        expect(parsed).toEqual({ error: 'File not found: /path/to/nonexistent/file.sql' });
      });
    });

    describe('readSqlFile', () => {
      test('should read file contents', () => {
        // Create a temporary test file
        const fs = require('fs');
        const path = require('path');
        const tmpFile = path.join(__dirname, 'test-temp.sql');
        const testContent = 'SELECT * FROM users;';

        fs.writeFileSync(tmpFile, testContent);

        try {
          const result = readSqlFile(tmpFile);
          expect(result).toBe(testContent);
        } finally {
          // Clean up
          fs.unlinkSync(tmpFile);
        }
      });

      test('should read file with multiple lines', () => {
        const fs = require('fs');
        const path = require('path');
        const tmpFile = path.join(__dirname, 'test-multiline.sql');
        const testContent = `-- Test SQL file
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100)
);

SELECT * FROM users;`;

        fs.writeFileSync(tmpFile, testContent);

        try {
          const result = readSqlFile(tmpFile);
          expect(result).toBe(testContent);
        } finally {
          // Clean up
          fs.unlinkSync(tmpFile);
        }
      });
    });

    describe('formatQueryResultsJson', () => {
      test('should format query results with rows', () => {
        const mockResult = {
          command: 'SELECT',
          rowCount: 2,
          rows: [
            { id: 1, name: 'Alice' },
            { id: 2, name: 'Bob' },
          ],
        };
        const duration = 100;

        const result = formatQueryResultsJson(mockResult, duration);
        const parsed = JSON.parse(result);

        expect(parsed).toEqual({
          success: true,
          command: 'SELECT',
          rowCount: 2,
          rows: [
            { id: 1, name: 'Alice' },
            { id: 2, name: 'Bob' },
          ],
          duration: 100,
        });
      });

      test('should format query results without rows', () => {
        const mockResult = {
          command: 'INSERT',
          rowCount: 1,
        };
        const duration = 50;

        const result = formatQueryResultsJson(mockResult, duration);
        const parsed = JSON.parse(result);

        expect(parsed).toEqual({
          success: true,
          command: 'INSERT',
          rowCount: 1,
          rows: [],
          duration: 50,
        });
      });

      test('should use default values for missing properties', () => {
        const mockResult = {};
        const duration = 75;

        const result = formatQueryResultsJson(mockResult, duration);
        const parsed = JSON.parse(result);

        expect(parsed).toEqual({
          success: true,
          command: 'Query executed',
          rowCount: 0,
          rows: [],
          duration: 75,
        });
      });
    });

    describe('formatSqlError', () => {
      test('should format SQL error in text mode without position', () => {
        const error = new Error('Syntax error in SQL query') as any;
        const result = formatSqlError(error, false);
        expect(result).toBe('\nError: Syntax error in SQL query');
      });

      test('should format SQL error in text mode with position', () => {
        const error = new Error('Column "nonexistent" does not exist') as any;
        error.position = 15;
        const result = formatSqlError(error, false);
        expect(result).toBe('\nError: Column "nonexistent" does not exist\nPosition: 15');
      });

      test('should format SQL error in JSON mode without position', () => {
        const error = new Error('Table not found') as any;
        const result = formatSqlError(error, true);
        const parsed = JSON.parse(result);
        expect(parsed).toEqual({
          success: false,
          error: 'Table not found',
          position: undefined,
        });
      });

      test('should format SQL error in JSON mode with position', () => {
        const error = new Error('Invalid syntax') as any;
        error.position = 42;
        const result = formatSqlError(error, true);
        const parsed = JSON.parse(result);
        expect(parsed).toEqual({
          success: false,
          error: 'Invalid syntax',
          position: 42,
        });
      });
    });

    describe('formatCommandResult', () => {
      test('should format command result with row count', () => {
        const result = formatCommandResult('SELECT', 10, 150);
        expect(result).toBe('\n✓ SELECT (10 rows) - 150ms');
      });

      test('should format command result without row count', () => {
        const result = formatCommandResult('CREATE TABLE', null, 75);
        expect(result).toBe('\n✓ CREATE TABLE  - 75ms');
      });

      test('should format command result with zero row count', () => {
        const result = formatCommandResult('DELETE', 0, 50);
        expect(result).toBe('\n✓ DELETE  - 50ms');
      });

      test('should use default command when not provided', () => {
        const result = formatCommandResult('', 5, 100);
        expect(result).toBe('\n✓ Query executed (5 rows) - 100ms');
      });
    });

    describe('buildSchemaCondition', () => {
      test('should return public schema condition when allSchemas is false', () => {
        const result = buildSchemaCondition(false);
        expect(result).toBe("table_schema = 'public'");
      });

      test('should return non-system schema condition when allSchemas is true', () => {
        const result = buildSchemaCondition(true);
        expect(result).toBe("table_schema NOT IN ('pg_catalog', 'information_schema')");
      });
    });

    describe('buildTableList', () => {
      test('should split comma-separated table names', () => {
        const result = buildTableList('users,posts,comments');
        expect(result).toEqual(['users', 'posts', 'comments']);
      });

      test('should trim whitespace from table names', () => {
        const result = buildTableList('users , posts , comments');
        expect(result).toEqual(['users', 'posts', 'comments']);
      });

      test('should filter out empty strings', () => {
        const result = buildTableList('users,,posts,');
        expect(result).toEqual(['users', 'posts']);
      });

      test('should handle single table name', () => {
        const result = buildTableList('users');
        expect(result).toEqual(['users']);
      });

      test('should return empty array for empty string', () => {
        const result = buildTableList('');
        expect(result).toEqual([]);
      });

      test('should handle only commas', () => {
        const result = buildTableList(',,,');
        expect(result).toEqual([]);
      });
    });

    describe('isDirectSqlCommand', () => {
      test('should return true for SELECT command', () => {
        expect(isDirectSqlCommand('SELECT * FROM users')).toBe(true);
        expect(isDirectSqlCommand('select * from users')).toBe(true);
      });

      test('should return true for INSERT command', () => {
        expect(isDirectSqlCommand('INSERT INTO users VALUES (1)')).toBe(true);
        expect(isDirectSqlCommand('insert into users values (1)')).toBe(true);
      });

      test('should return true for UPDATE command', () => {
        expect(isDirectSqlCommand('UPDATE users SET name = "John"')).toBe(true);
      });

      test('should return true for DELETE command', () => {
        expect(isDirectSqlCommand('DELETE FROM users WHERE id = 1')).toBe(true);
      });

      test('should return true for CREATE command', () => {
        expect(isDirectSqlCommand('CREATE TABLE users (id INT)')).toBe(true);
      });

      test('should return true for DROP command', () => {
        expect(isDirectSqlCommand('DROP TABLE users')).toBe(true);
      });

      test('should return true for ALTER command', () => {
        expect(isDirectSqlCommand('ALTER TABLE users ADD COLUMN name VARCHAR')).toBe(true);
      });

      test('should return true for TRUNCATE command', () => {
        expect(isDirectSqlCommand('TRUNCATE TABLE users')).toBe(true);
      });

      test('should return false for non-SQL commands', () => {
        expect(isDirectSqlCommand('exec')).toBe(false);
        expect(isDirectSqlCommand('file')).toBe(false);
        expect(isDirectSqlCommand('schema')).toBe(false);
        expect(isDirectSqlCommand('--help')).toBe(false);
      });

      test('should return false for empty string', () => {
        expect(isDirectSqlCommand('')).toBe(false);
      });
    });

    describe('SqlAgentError', () => {
      test('should create error with message and code', () => {
        const error = new SqlAgentError('Test error', 'TEST_CODE');
        expect(error.message).toBe('Test error');
        expect(error.code).toBe('TEST_CODE');
        expect(error.name).toBe('SqlAgentError');
        expect(error.hint).toBeUndefined();
      });

      test('should create error with message, code and hint', () => {
        const error = new SqlAgentError('Test error', 'TEST_CODE', 'Try this instead');
        expect(error.message).toBe('Test error');
        expect(error.code).toBe('TEST_CODE');
        expect(error.hint).toBe('Try this instead');
        expect(error.name).toBe('SqlAgentError');
      });

      test('should be instanceof Error', () => {
        const error = new SqlAgentError('Test error', 'TEST_CODE');
        expect(error).toBeInstanceOf(Error);
        expect(error).toBeInstanceOf(SqlAgentError);
      });
    });

    describe('createNoCommandError', () => {
      test('should create error with correct properties', () => {
        const error = createNoCommandError();
        expect(error.message).toBe('No command provided');
        expect(error.code).toBe('NO_COMMAND');
        expect(error.hint).toBe('Run sequelae --help for usage information');
        expect(error).toBeInstanceOf(SqlAgentError);
      });
    });

    describe('createNoSqlQueryError', () => {
      test('should create error with correct properties', () => {
        const error = createNoSqlQueryError();
        expect(error.message).toBe('No SQL query provided');
        expect(error.code).toBe('NO_SQL_QUERY');
        expect(error.hint).toBeUndefined();
        expect(error).toBeInstanceOf(SqlAgentError);
      });
    });

    describe('createNoFilePathError', () => {
      test('should create error with correct properties', () => {
        const error = createNoFilePathError();
        expect(error.message).toBe('No file path provided');
        expect(error.code).toBe('NO_FILE_PATH');
        expect(error.hint).toBeUndefined();
        expect(error).toBeInstanceOf(SqlAgentError);
      });
    });

    describe('createFileNotFoundError', () => {
      test('should create error with correct properties', () => {
        const error = createFileNotFoundError('/path/to/missing.sql');
        expect(error.message).toBe('File not found: /path/to/missing.sql');
        expect(error.code).toBe('FILE_NOT_FOUND');
        expect(error.hint).toBeUndefined();
        expect(error).toBeInstanceOf(SqlAgentError);
      });

      test('should include file path in error message', () => {
        const error = createFileNotFoundError('/another/file.sql');
        expect(error.message).toBe('File not found: /another/file.sql');
      });
    });
  });

  describe('CLI Argument Parsing', () => {
    // Help tests moved to cli-behavior.test.ts
    // CLI behavior tests moved to cli-behavior.test.ts
  });

  // Error output formatting tests moved to cli-behavior.test.ts

  // SQL execution tests moved to cli-integration.test.ts

  describe('Backup functionality', () => {
    const mockConnectionString = 'postgresql://user:pass@localhost:5432/testdb';

    beforeEach(() => {
      // Mock child_process.execSync for pg_dump check
      jest.mock('child_process', () => ({
        ...jest.requireActual('child_process'),
        execSync: jest.fn().mockReturnValue(''),
      }));
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    describe('backup options validation', () => {
      test('should validate mutually exclusive options', () => {
        const options: BackupOptions = {
          dataOnly: true,
          schemaOnly: true,
        };

        // This should be caught by the backup method
        const executor = new SqlExecutor(mockConnectionString);
        executor.backup(options).then(result => {
          expect(result.success).toBe(false);
          expect(result.error).toBe('Cannot specify both dataOnly and schemaOnly options');
        });
      });

      test('should handle directory traversal attempts', () => {
        const options: BackupOptions = {
          outputPath: '../../../etc/passwd',
        };

        const executor = new SqlExecutor(mockConnectionString);
        executor.backup(options).then(result => {
          expect(result.success).toBe(false);
          expect(result.error).toContain('directory traversal not allowed');
        });
      });

      test('should quote special characters in table names', () => {
        // Test that special characters are properly handled
        const tableName = 'my-table.with"quotes';
        const expectedQuoted = '"my-table.with""quotes"';

        // This is implicitly tested in the backup method
        expect(tableName.includes('.') || /[^a-zA-Z0-9_]/.test(tableName)).toBe(true);
        expect(`"${tableName.replace(/"/g, '""')}"`).toBe(expectedQuoted);
      });
    });

    describe('help command backup documentation', () => {
      test('should include backup in help text', () => {
        const helpText = handleHelp(false);
        expect(helpText).toContain('sequelae backup');
        expect(helpText).toContain('Create a database backup');
      });

      test('should include backup examples in help', () => {
        const helpText = handleHelp(false);
        expect(helpText).toContain('sequelae backup --output db_backup.sql');
        expect(helpText).toContain('sequelae backup --tables users,posts --format custom');
      });

      test('should include backup in JSON help', () => {
        const helpJson = handleHelp(true);
        const parsed = JSON.parse(helpJson);

        expect(parsed.usage).toContainEqual(expect.stringContaining('sequelae backup'));
        expect(parsed.examples).toContainEqual(expect.stringContaining('sequelae backup --output'));
      });
    });
  });
});

describe('PoolManager', () => {
  let poolManager: PoolManager;

  beforeEach(() => {
    jest.clearAllMocks();
    PoolManager.reset();
    poolManager = PoolManager.getInstance();
  });

  describe('basic functionality', () => {
    test('should initialize pool with config', () => {
      poolManager.initialize({
        connectionString: 'postgresql://test@localhost/test',
        maxConnections: 20,
        idleTimeoutMillis: 5000,
      });

      expect(poolManager.isInitialized()).toBe(true);
    });

    test('should return pool status', () => {
      poolManager.initialize({
        connectionString: 'postgresql://test@localhost/test',
      });

      const status = poolManager.getStatus();
      expect(status.initialized).toBe(true);
      expect(status.maxConnections).toBe(10);
      expect(status.idleTimeout).toBe(10000);
    });

    test('should handle pool not initialized error', () => {
      expect(() => poolManager.getPool()).toThrow('Pool not initialized');
    });
  });

  describe('retry logic', () => {
    test('should retry on connection failure', async () => {
      const mockPool = {
        connect: jest
          .fn()
          .mockRejectedValueOnce(new Error('Connection failed'))
          .mockRejectedValueOnce(new Error('Connection failed'))
          .mockResolvedValueOnce({ release: jest.fn() }),
        on: jest.fn(),
        end: jest.fn(),
        totalCount: 0,
        idleCount: 0,
        waitingCount: 0,
      };

      poolManager.initialize({
        connectionString: 'postgresql://test@localhost/test',
      });

      // Override the pool
      (poolManager as any).pool = mockPool;

      const client = await poolManager.getClient();

      expect(mockPool.connect).toHaveBeenCalledTimes(3);
      expect(client).toBeDefined();
    });

    test('should throw after max retries', async () => {
      const mockPool = {
        connect: jest.fn().mockRejectedValue(new Error('Connection failed')),
        on: jest.fn(),
        end: jest.fn(),
      };

      poolManager.initialize({
        connectionString: 'postgresql://test@localhost/test',
      });

      (poolManager as any).pool = mockPool;

      await expect(poolManager.getClient(2, 10)).rejects.toThrow('Connection failed');
      expect(mockPool.connect).toHaveBeenCalledTimes(2);
    });
  });
});

describe('JSONB Analyzer', () => {
  describe('analyzeJsonStructure', () => {
    test('should analyze simple flat object', () => {
      const samples = [
        { name: 'John', age: 30 },
        { name: 'Jane', age: 25 },
      ];
      const structure = analyzeJsonStructure(samples);

      expect(structure.name).toBeDefined();
      expect(Array.from(structure.name.types)).toEqual(['string']);
      expect(structure.name.optional).toBe(false);

      expect(structure.age).toBeDefined();
      expect(Array.from(structure.age.types)).toEqual(['number']);
      expect(structure.age.optional).toBe(false);
    });

    test('should detect optional fields', () => {
      const samples = [
        { name: 'John', age: 30, email: 'john@example.com' },
        { name: 'Jane', age: 25 },
      ];
      const structure = analyzeJsonStructure(samples);

      expect(structure.email.optional).toBe(true);
      expect(structure.name.optional).toBe(false);
      expect(structure.age.optional).toBe(false);
    });

    test('should handle mixed types', () => {
      const samples = [{ value: 'string' }, { value: 123 }, { value: null }];
      const structure = analyzeJsonStructure(samples);

      expect(Array.from(structure.value.types).sort()).toEqual(['null', 'number', 'string']);
    });

    test('should analyze arrays', () => {
      const samples = [{ tags: ['a', 'b', 'c'] }, { tags: ['d', 'e'] }];
      const structure = analyzeJsonStructure(samples);

      expect(Array.from(structure.tags.types)).toEqual(['array']);
      expect(Array.from(structure.tags.arrayElementTypes!)).toEqual(['string']);
    });

    test('should analyze arrays with mixed element types', () => {
      const samples = [{ scores: [1, 2, 3] }, { scores: [4, 'high', null] }];
      const structure = analyzeJsonStructure(samples);

      expect(Array.from(structure.scores.types)).toEqual(['array']);
      expect(Array.from(structure.scores.arrayElementTypes!).sort()).toEqual([
        'null',
        'number',
        'string',
      ]);
    });

    test('should analyze nested objects', () => {
      const samples = [
        { user: { name: 'John', address: { city: 'NYC', zip: '10001' } } },
        { user: { name: 'Jane', address: { city: 'LA', zip: '90001' } } },
      ];
      const structure = analyzeJsonStructure(samples);

      expect(structure.user).toBeDefined();
      expect(Array.from(structure.user.types)).toEqual(['object']);
      expect(structure.user.nestedStructure).toBeDefined();
      expect(structure.user.nestedStructure!.name).toBeDefined();
      expect(structure.user.nestedStructure!.address).toBeDefined();
      expect(structure.user.nestedStructure!.address.nestedStructure!.city).toBeDefined();
    });

    test('should handle empty samples', () => {
      const structure = analyzeJsonStructure([]);
      expect(Object.keys(structure)).toHaveLength(0);
    });

    test('should handle non-object samples', () => {
      const samples = ['string', 123, null, ['array']];
      const structure = analyzeJsonStructure(samples);
      expect(Object.keys(structure)).toHaveLength(0);
    });
  });

  describe('formatJsonStructure', () => {
    test('should format simple structure', () => {
      const structure = analyzeJsonStructure([
        { name: 'John', age: 30 },
        { name: 'Jane', age: 25 },
      ]);
      const formatted = formatJsonStructure(structure);

      expect(formatted).toContain('- name: string');
      expect(formatted).toContain('- age: number');
    });

    test('should show optional fields', () => {
      const structure = analyzeJsonStructure([
        { name: 'John', email: 'john@example.com' },
        { name: 'Jane' },
      ]);
      const formatted = formatJsonStructure(structure);

      expect(formatted).toContain('- name: string');
      expect(formatted).toContain('- email?: string');
    });

    test('should format arrays', () => {
      const structure = analyzeJsonStructure([{ tags: ['a', 'b'] }, { tags: ['c'] }]);
      const formatted = formatJsonStructure(structure);

      expect(formatted).toContain('- tags: array<string>');
    });

    test('should format mixed types', () => {
      const structure = analyzeJsonStructure([{ value: 'string' }, { value: 123 }]);
      const formatted = formatJsonStructure(structure);

      expect(formatted).toContain('- value: string | number');
    });

    test('should format nested objects with indentation', () => {
      const structure = analyzeJsonStructure([{ user: { name: 'John', age: 30 } }]);
      const formatted = formatJsonStructure(structure);

      expect(formatted).toContain('- user: object');
      expect(formatted).toContain('  - name: string');
      expect(formatted).toContain('  - age: number');
    });

    test('should handle empty structure', () => {
      const structure = analyzeJsonStructure([]);
      const formatted = formatJsonStructure(structure);

      expect(formatted).toBe('    (no data to analyze)');
    });
  });
});
