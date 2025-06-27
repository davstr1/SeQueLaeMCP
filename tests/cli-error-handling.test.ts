import { spawn } from 'child_process';

// Helper to execute CLI with mocked database
async function execCli(args: string[]): Promise<{
  stdout: string;
  stderr: string;
  code: number;
  json?: any;
}> {
  return new Promise(resolve => {
    const binPath = require.resolve('../bin/sequelae');
    const proc = spawn('node', [binPath, ...args], {
      env: {
        ...process.env,
        DATABASE_URL: 'postgresql://mock:mock@localhost:5432/mock',
      },
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
        // Not JSON
      }
      resolve({ stdout, stderr, code: code || 0, json });
    });

    proc.on('error', () => {
      resolve({ stdout, stderr, code: 1 });
    });
  });
}

describe('CLI Error Handling Unit Tests', () => {
  describe('File Command Errors', () => {
    test('should error when file path is empty string', async () => {
      const result = await execCli(['file', '']);
      expect(result.code).toBe(1);
      expect(result.stderr).toContain('No file path provided');
    });

    test('should error when file path contains only spaces', async () => {
      const result = await execCli(['file', '   ']);
      expect(result.code).toBe(1);
      expect(result.stderr).toContain('File not found');
    });

    test('should handle non-existent file', async () => {
      const result = await execCli(['file', '/tmp/definitely-does-not-exist-1234567890.sql']);
      expect(result.code).toBe(1);
      expect(result.stderr).toContain('File not found');
    });

    test('should handle very long file path', async () => {
      const longPath = '/tmp/' + 'a'.repeat(1000) + '.sql';
      const result = await execCli(['file', longPath]);
      expect(result.code).toBe(1);
      expect(result.stderr).toContain('File not found');
    });

    test('should handle file path with special characters', async () => {
      const result = await execCli(['file', '/tmp/test@#$%.sql']);
      expect(result.code).toBe(1);
      expect(result.stderr).toContain('File not found');
    });

    test('should handle relative file path that does not exist', async () => {
      const result = await execCli(['file', './non-existent.sql']);
      expect(result.code).toBe(1);
      expect(result.stderr).toContain('File not found');
    });

    test('should handle directory instead of file', async () => {
      const result = await execCli(['file', '/tmp']);
      expect(result.code).toBe(1);
      // Attempting to read a directory as a file should fail
    });
  });

  describe('Exec Command Errors', () => {
    test('should error when no SQL provided', async () => {
      const result = await execCli(['exec']);
      expect(result.code).toBe(1);
      expect(result.stderr).toContain('No SQL query provided');
    });

    test('should error when SQL is empty string', async () => {
      const result = await execCli(['exec', '']);
      expect(result.code).toBe(1);
      // Empty SQL might execute successfully or fail depending on implementation
    });

    test('should error when SQL contains only spaces', async () => {
      const result = await execCli(['exec', '   ']);
      expect(result.code).toBe(1);
      // Whitespace-only SQL should fail
    });
  });

  describe('Unknown Command Errors', () => {
    test('should error on misspelled exec', async () => {
      const result = await execCli(['exce', 'SELECT 1']);
      expect(result.code).toBe(1);
      expect(result.stderr).toContain('Unknown command: exce');
    });

    test('should error on misspelled file', async () => {
      const result = await execCli(['fiel', 'test.sql']);
      expect(result.code).toBe(1);
      expect(result.stderr).toContain('Unknown command: fiel');
    });

    test('should error on misspelled schema', async () => {
      const result = await execCli(['shcema']);
      expect(result.code).toBe(1);
      expect(result.stderr).toContain('Unknown command: shcema');
    });

    test('should error on random text', async () => {
      const result = await execCli(['randomcommand']);
      expect(result.code).toBe(1);
      expect(result.stderr).toContain('Unknown command: randomcommand');
    });

    test('should error on numbers as command', async () => {
      const result = await execCli(['12345']);
      expect(result.code).toBe(1);
      expect(result.stderr).toContain('Unknown command: 12345');
    });
  });

  describe('Flag Parsing Errors', () => {
    test('should handle invalid timeout value', async () => {
      const result = await execCli(['--timeout', 'invalid', 'exec', 'SELECT 1']);
      // Invalid timeout is not a number, so 'invalid' is not consumed as timeout value
      // This leaves 'exec' as the timeout value and 'SELECT 1' as unknown command
      expect(result.code).toBe(1);
    });

    test('should handle negative timeout value', async () => {
      const result = await execCli(['--timeout', '-100', 'exec', 'SELECT 1']);
      // Negative timeout should be ignored since it's invalid
      expect(result.code).toBe(1); // Will fail trying to connect to mock database
    });

    test('should handle timeout without value', async () => {
      const result = await execCli(['--timeout', 'exec', 'SELECT 1']);
      // Timeout consumes 'exec' as its value, leaving 'SELECT 1' as unknown command
      expect(result.code).toBe(1);
      expect(result.stderr).toContain('Unknown command: SELECT 1');
    });

    test('should handle multiple conflicting flags', async () => {
      // --all is only valid with schema command but doesn't break exec
      const result = await execCli(['--all', 'exec', 'SELECT 1']);
      expect(result.code).toBe(1); // Will fail trying to connect to mock database
    });
  });

  describe('Environment Variable Errors', () => {
    test('should error when DATABASE_URL is not set', async () => {
      const binPath = require.resolve('../bin/sequelae');
      const proc = spawn('node', [binPath, 'exec', 'SELECT 1'], {
        env: {
          PATH: process.env.PATH, // Keep PATH but remove DATABASE_URL
          NODE_ENV: 'test',
        },
      });

      const result = await new Promise<{ stdout: string; stderr: string; code: number }>(
        resolve => {
          let stdout = '';
          let stderr = '';

          proc.stdout.on('data', data => {
            stdout += data.toString();
          });

          proc.stderr.on('data', data => {
            stderr += data.toString();
          });

          proc.on('close', code => {
            resolve({ stdout, stderr, code: code || 0 });
          });
        }
      );

      expect(result.code).toBe(1);
      // The error might be about SSL certificate or DATABASE_URL depending on environment
      expect(result.stderr.toLowerCase()).toMatch(/database_url|certificate|ssl/);
    });
  });

  describe('JSON Mode Error Formatting', () => {
    test('should format file not found error as JSON', async () => {
      const result = await execCli(['--json', 'file', '/tmp/not-found.sql']);
      expect(result.code).toBe(1);
      expect(result.json).toBeDefined();
      expect(result.json.error).toContain('File not found');
    });

    test('should format no command error as JSON', async () => {
      const result = await execCli(['--json']);
      expect(result.code).toBe(1);
      expect(result.json).toBeDefined();
      expect(result.json.error).toContain('No command provided');
    });

    test('should format unknown command error as JSON', async () => {
      const result = await execCli(['--json', 'badcommand']);
      expect(result.code).toBe(1);
      expect(result.json).toBeDefined();
      expect(result.json.error).toContain('Unknown command: badcommand');
    });

    test('should include hint in JSON error when available', async () => {
      const result = await execCli(['--json']);
      expect(result.code).toBe(1);
      expect(result.json).toBeDefined();
      expect(result.json.hint).toBeDefined();
    });
  });
});
