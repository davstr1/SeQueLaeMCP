import { spawn } from 'child_process';
import { promisify } from 'util';
import { resolve } from 'path';

describe('SQL Agent Unit Tests', () => {
  // Helper function to execute sql-agent CLI
  async function execSqlAgent(args: string[]): Promise<{ stdout: string; stderr: string; code: number; json?: any }> {
    return new Promise((resolve, reject) => {
      const binPath = require.resolve('../bin/sql-agent');
      const proc = spawn('node', [binPath, ...args], {
        cwd: process.cwd(),
        env: process.env
      });

      let stdout = '';
      let stderr = '';

      proc.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      proc.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      proc.on('close', (code) => {
        let json;
        try {
          json = stdout ? JSON.parse(stdout) : undefined;
        } catch (e) {
          // Not JSON output
        }
        resolve({ stdout, stderr, code: code || 0, json });
      });

      proc.on('error', reject);
    });
  }

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
      expect(result.json.usage).toBeDefined();
      expect(Array.isArray(result.json.usage)).toBe(true);
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
      expect(result.json.error).toBeDefined();
      expect(typeof result.json.error).toBe('string');
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
      expect(result.json.error).toContain('File not found');
    });
  });

  describe('SQL Execution (with DATABASE_URL)', () => {
    // These tests assume DATABASE_URL is set in .env or environment
    // They will be skipped if no database is configured
    const checkDatabase = async () => {
      try {
        const result = await execSqlAgent(['--json', 'exec', 'SELECT 1']);
        return result.code === 0;
      } catch {
        return false;
      }
    };
    
    test('should execute simple SELECT', async () => {
      const result = await execSqlAgent(['exec', 'SELECT 1 as num']);
      expect(result.code).toBe(0);
      expect(result.stdout).toContain('num');
    });

    test('should execute SQL with --json flag', async () => {
      const result = await execSqlAgent(['--json', 'exec', 'SELECT 1 as num']);
      expect(result.code).toBe(0);
      expect(result.json).toBeDefined();
      expect(result.json.success).toBe(true);
      expect(result.json.rows).toHaveLength(1);
      expect(result.json.rows[0].num).toBe(1);
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
      expect(result.json.success).toBe(false);
      expect(result.json.error).toContain('syntax error');
    });

    test('should execute direct SQL without exec command', async () => {
      const result = await execSqlAgent(['SELECT', '1', 'as', 'num']);
      expect(result.code).toBe(0);
      expect(result.stdout).toContain('num');
    });
  });
});