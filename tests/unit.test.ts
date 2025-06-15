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
} from '../src/cli';

describe('SQL Agent Unit Tests', () => {
  // Helper function to execute sql-agent CLI
  async function execSqlAgent(
    args: string[]
  ): Promise<{ stdout: string; stderr: string; code: number; json?: any }> {
    return new Promise((resolve, reject) => {
      const binPath = require.resolve('../bin/sql-agent');
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
        expect(result).toMatch(/^sql-agent-cli v\d+\.\d+\.\d+$/);
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
        expect(result).toContain('sql-agent exec "SQL query"');
        expect(result).toContain('sql-agent file path/to/query.sql');
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
          'Run sql-agent --help for usage information'
        );
        expect(result).toBe(
          'Error: No command provided\nRun sql-agent --help for usage information'
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
          'Run sql-agent --help for usage information'
        );
        const parsed = JSON.parse(result);
        expect(parsed).toEqual({
          error: 'No command provided',
          hint: 'Run sql-agent --help for usage information',
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
  });

  describe('CLI Argument Parsing', () => {
    test('should show help with --help flag', async () => {
      const result = await execSqlAgent(['--help']);
      expect(result.code).toBe(0);
      expect(result.stdout).toContain('Usage:');
      expect(result.stdout).toContain('sql-agent exec "SQL query"');
      expect(result.stdout).toContain('sql-agent file path/to/query.sql');
    });

    test('should show help with -h flag', async () => {
      const result = await execSqlAgent(['-h']);
      expect(result.code).toBe(0);
      expect(result.stdout).toContain('Usage:');
    });

    test('should handle --json flag with help', async () => {
      const result = await execSqlAgent(['--json', '--help']);
      expect(result.code).toBe(0);
      expect(result.json).toBeDefined();
      expect((result.json as any).usage).toBeDefined();
      expect(Array.isArray((result.json as any).usage)).toBe(true);
    });

    test('should error when no command provided', async () => {
      const result = await execSqlAgent([]);
      expect(result.code).toBe(1);
      expect(result.stderr).toContain('No command provided');
    });

    test('should error when unknown command provided', async () => {
      const result = await execSqlAgent(['unknown']);
      expect(result.code).toBe(1);
      expect(result.stderr).toContain('Unknown command');
    });

    test('should handle missing SQL query for exec command', async () => {
      const result = await execSqlAgent(['exec']);
      expect(result.code).toBe(1);
      expect(result.stderr).toContain('No SQL query provided');
    });

    test('should handle missing file path for file command', async () => {
      const result = await execSqlAgent(['file']);
      expect(result.code).toBe(1);
      expect(result.stderr).toContain('No file path provided');
    });

    test('should handle exit command', async () => {
      const result = await execSqlAgent(['exit']);
      expect(result.code).toBe(0);
      expect(result.stdout).toContain('Goodbye!');
    });

    test('should handle quit command', async () => {
      const result = await execSqlAgent(['quit']);
      expect(result.code).toBe(0);
      expect(result.stdout).toContain('Goodbye!');
    });

    test('should show version with --version flag', async () => {
      const result = await execSqlAgent(['--version']);
      expect(result.code).toBe(0);
      expect(result.stdout).toContain('sql-agent-cli v');
    });

    test('should show version with -v flag', async () => {
      const result = await execSqlAgent(['-v']);
      expect(result.code).toBe(0);
      expect(result.stdout).toContain('sql-agent-cli v');
    });
  });

  describe('Error Output Formatting', () => {
    test('should format errors as JSON when --json flag is used', async () => {
      const result = await execSqlAgent(['--json', 'exec']);
      expect(result.code).toBe(1);
      expect(result.json).toBeDefined();
      expect((result.json as any).error).toBeDefined();
      expect(typeof (result.json as any).error).toBe('string');
    });

    test('should output plain text errors without --json flag', async () => {
      const result = await execSqlAgent(['exec']);
      expect(result.code).toBe(1);
      expect(result.stderr).toBeTruthy();
      expect(result.json).toBeUndefined();
    });

    test('should handle file not found error', async () => {
      const result = await execSqlAgent(['file', '/tmp/non-existent-file.sql']);
      expect(result.code).toBe(1);
      expect(result.stderr).toContain('File not found');
    });

    test('should handle file not found error in JSON mode', async () => {
      const result = await execSqlAgent(['--json', 'file', '/tmp/non-existent-file.sql']);
      expect(result.code).toBe(1);
      expect(result.json).toBeDefined();
      expect((result.json as any).error).toContain('File not found');
    });
  });

  describe('SQL Execution (with DATABASE_URL)', () => {
    // These tests assume DATABASE_URL is set in .env or environment
    // They will be skipped if no database is configured

    test('should execute simple SELECT', async () => {
      const result = await execSqlAgent(['exec', 'SELECT 1 as num']);
      expect(result.code).toBe(0);
      expect(result.stdout).toContain('num');
    });

    test('should execute SQL with --json flag', async () => {
      const result = await execSqlAgent(['--json', 'exec', 'SELECT 1 as num']);
      expect(result.code).toBe(0);
      expect(result.json).toBeDefined();
      expect((result.json as any).success).toBe(true);
      expect((result.json as any).rows).toHaveLength(1);
      expect((result.json as any).rows[0].num).toBe(1);
    });

    test('should handle SQL syntax errors', async () => {
      const result = await execSqlAgent(['exec', 'SELECT * FORM users']);
      expect(result.code).toBe(1);
      expect(result.stderr).toContain('syntax error');
    });

    test('should handle SQL syntax errors in JSON mode', async () => {
      const result = await execSqlAgent(['--json', 'exec', 'SELECT * FORM users']);
      expect(result.code).toBe(1);
      expect(result.json).toBeDefined();
      expect((result.json as any).success).toBe(false);
      expect((result.json as any).error).toContain('syntax error');
    });

    test('should execute direct SQL without exec command', async () => {
      const result = await execSqlAgent(['SELECT', '1', 'as', 'num']);
      expect(result.code).toBe(0);
      expect(result.stdout).toContain('num');
    });
  });
});
