import { spawn } from 'child_process';
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

describe('Sequelae Unit Tests', () => {
  // Helper function to execute sequelae CLI
  async function execSequelae(
    args: string[]
  ): Promise<{ stdout: string; stderr: string; code: number; json?: any }> {
    return new Promise((resolve, reject) => {
      const binPath = require.resolve('../bin/sequelae');
      const proc = spawn('node', [binPath, ...args], {
        cwd: process.cwd(),
        env: process.env,
      });

      let stdout = '';
      let stderr = '';

      proc.stdout.on('data', data => {
        stdout += data.toString();
      });

      proc.stderr.on('data', data => {
        stderr += data.toString();
      });

      proc.on('close', code => {
        let json;
        try {
          json = stdout ? JSON.parse(stdout) : undefined;
        } catch (_e) {
          // Not JSON output
        }
        resolve({ stdout, stderr, code: code || 0, json });
      });

      proc.on('error', reject);
    });
  }

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
          filteredArgs: [],
        });
      });

      test('should parse --json flag', () => {
        const result = parseArguments(['--json', 'exec', 'SELECT 1']);
        expect(result).toEqual({
          jsonMode: true,
          allSchemas: false,
          filteredArgs: ['exec', 'SELECT 1'],
        });
      });

      test('should parse --all flag', () => {
        const result = parseArguments(['schema', '--all']);
        expect(result).toEqual({
          jsonMode: false,
          allSchemas: true,
          filteredArgs: ['schema'],
        });
      });

      test('should parse both --json and --all flags', () => {
        const result = parseArguments(['--json', 'schema', '--all']);
        expect(result).toEqual({
          jsonMode: true,
          allSchemas: true,
          filteredArgs: ['schema'],
        });
      });

      test('should filter out flags from arguments', () => {
        const result = parseArguments(['--json', '--help', '--all']);
        expect(result).toEqual({
          jsonMode: true,
          allSchemas: true,
          filteredArgs: ['--help'],
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
    test('should show help with --help flag', async () => {
      const result = await execSequelae(['--help']);
      expect(result.code).toBe(0);
      expect(result.stdout).toContain('Usage:');
      expect(result.stdout).toContain('sequelae exec "SQL query"');
      expect(result.stdout).toContain('sequelae file path/to/query.sql');
    });

    test('should show help with -h flag', async () => {
      const result = await execSequelae(['-h']);
      expect(result.code).toBe(0);
      expect(result.stdout).toContain('Usage:');
    });

    test('should handle --json flag with help', async () => {
      const result = await execSequelae(['--json', '--help']);
      expect(result.code).toBe(0);
      expect(result.json).toBeDefined();
      expect((result.json as any).usage).toBeDefined();
      expect(Array.isArray((result.json as any).usage)).toBe(true);
    });

    test('should error when no command provided', async () => {
      const result = await execSequelae([]);
      expect(result.code).toBe(1);
      expect(result.stderr).toContain('No command provided');
    });

    test('should error when unknown command provided', async () => {
      const result = await execSequelae(['unknown']);
      expect(result.code).toBe(1);
      expect(result.stderr).toContain('Unknown command');
    });

    test('should handle missing SQL query for exec command', async () => {
      const result = await execSequelae(['exec']);
      expect(result.code).toBe(1);
      expect(result.stderr).toContain('No SQL query provided');
    });

    test('should handle missing file path for file command', async () => {
      const result = await execSequelae(['file']);
      expect(result.code).toBe(1);
      expect(result.stderr).toContain('No file path provided');
    });

    test('should handle exit command', async () => {
      const result = await execSequelae(['exit']);
      expect(result.code).toBe(0);
      expect(result.stdout).toContain('Goodbye!');
    });

    test('should handle quit command', async () => {
      const result = await execSequelae(['quit']);
      expect(result.code).toBe(0);
      expect(result.stdout).toContain('Goodbye!');
    });

    test('should show version with --version flag', async () => {
      const result = await execSequelae(['--version']);
      expect(result.code).toBe(0);
      expect(result.stdout).toContain('sequelae-mcp v');
    });

    test('should show version with -v flag', async () => {
      const result = await execSequelae(['-v']);
      expect(result.code).toBe(0);
      expect(result.stdout).toContain('sequelae-mcp v');
    });
  });

  describe('Error Output Formatting', () => {
    test('should format errors as JSON when --json flag is used', async () => {
      const result = await execSequelae(['--json', 'exec']);
      expect(result.code).toBe(1);
      expect(result.json).toBeDefined();
      expect((result.json as any).error).toBeDefined();
      expect(typeof (result.json as any).error).toBe('string');
    });

    test('should output plain text errors without --json flag', async () => {
      const result = await execSequelae(['exec']);
      expect(result.code).toBe(1);
      expect(result.stderr).toBeTruthy();
      expect(result.json).toBeUndefined();
    });

    test('should handle file not found error', async () => {
      const result = await execSequelae(['file', '/tmp/non-existent-file.sql']);
      expect(result.code).toBe(1);
      expect(result.stderr).toContain('File not found');
    });

    test('should handle file not found error in JSON mode', async () => {
      const result = await execSequelae(['--json', 'file', '/tmp/non-existent-file.sql']);
      expect(result.code).toBe(1);
      expect(result.json).toBeDefined();
      expect((result.json as any).error).toContain('File not found');
    });
  });

  describe('SQL Execution (with DATABASE_URL)', () => {
    // These tests assume DATABASE_URL is set in .env or environment
    // They will be skipped if no database is configured

    test('should execute simple SELECT', async () => {
      const result = await execSequelae(['exec', 'SELECT 1 as num']);
      expect(result.code).toBe(0);
      expect(result.stdout).toContain('num');
    });

    test('should execute SQL with --json flag', async () => {
      const result = await execSequelae(['--json', 'exec', 'SELECT 1 as num']);
      expect(result.code).toBe(0);
      expect(result.json).toBeDefined();
      expect((result.json as any).success).toBe(true);
      expect((result.json as any).rows).toHaveLength(1);
      expect((result.json as any).rows[0].num).toBe(1);
    });

    test('should handle SQL syntax errors', async () => {
      const result = await execSequelae(['exec', 'SELECT * FORM users']);
      expect(result.code).toBe(1);
      expect(result.stderr).toContain('syntax error');
    });

    test('should handle SQL syntax errors in JSON mode', async () => {
      const result = await execSequelae(['--json', 'exec', 'SELECT * FORM users']);
      expect(result.code).toBe(1);
      expect(result.json).toBeDefined();
      expect((result.json as any).success).toBe(false);
      expect((result.json as any).error).toContain('syntax error');
    });

    test('should execute direct SQL without exec command', async () => {
      const result = await execSequelae(['SELECT', '1', 'as', 'num']);
      expect(result.code).toBe(0);
      expect(result.stdout).toContain('num');
    });
  });
});
