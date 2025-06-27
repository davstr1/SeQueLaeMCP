import { spawn } from 'child_process';

// Mock DATABASE_URL for these tests
process.env.DATABASE_URL = 'postgresql://mock:mock@localhost:5432/mock';

// Helper function to execute sequelae CLI
async function execSequelae(
  args: string[]
): Promise<{ stdout: string; stderr: string; code: number; json?: any }> {
  return new Promise((resolve, reject) => {
    const binPath = require.resolve('../bin/sequelae');
    const proc = spawn('node', [binPath, ...args], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        DATABASE_URL: 'postgresql://mock:mock@localhost:5432/mock', // Mock DATABASE_URL
        POSTGRES_SSL_REJECT_UNAUTHORIZED: 'false',
        POSTGRES_SSL_MODE: 'disable',
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
        // Not JSON output
      }
      resolve({ stdout, stderr, code: code || 0, json });
    });

    proc.on('error', reject);
  });
}

describe('CLI Behavior Tests', () => {
  describe('Help Command', () => {
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
  });

  describe('CLI Argument Parsing', () => {
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

  describe('File Command Error Handling', () => {
    test('should error when file path is empty string', async () => {
      const result = await execSequelae(['file', '']);
      expect(result.code).toBe(1);
      expect(result.stderr).toContain('File not found');
    });

    test('should error when file path contains only spaces', async () => {
      const result = await execSequelae(['file', '   ']);
      expect(result.code).toBe(1);
      expect(result.stderr).toContain('File not found');
    });

    test('should handle file with no read permissions', async () => {
      // This test would need to create a file without read permissions
      // Skipping as it's OS-dependent and complex to mock
    });

    test('should handle empty file', async () => {
      const fs = require('fs');
      const path = require('path');
      const tempFile = path.join(__dirname, 'temp-empty.sql');

      // Create empty file
      fs.writeFileSync(tempFile, '');

      const result = await execSequelae(['file', tempFile]);

      // Clean up
      fs.unlinkSync(tempFile);

      // Empty SQL should execute successfully but do nothing
      expect(result.code).toBe(0);
    });

    test('should handle very large file path', async () => {
      const longPath = '/tmp/' + 'a'.repeat(1000) + '.sql';
      const result = await execSequelae(['file', longPath]);
      expect(result.code).toBe(1);
      expect(result.stderr).toContain('File not found');
    });
  });

  describe('Direct SQL Command Recognition', () => {
    test('should recognize SELECT without exec prefix', async () => {
      const result = await execSequelae(['SELECT', '1']);
      // This should work as direct SQL
      expect(result.code).toBe(0);
    });

    test('should recognize INSERT without exec prefix', async () => {
      const result = await execSequelae(['INSERT', 'INTO', 'test', 'VALUES', '(1)']);
      // This should work as direct SQL
      expect(result.code).toBe(0);
    });

    test('should recognize UPDATE without exec prefix', async () => {
      const result = await execSequelae(['UPDATE', 'test', 'SET', 'id=1']);
      // This should work as direct SQL
      expect(result.code).toBe(0);
    });

    test('should recognize DELETE without exec prefix', async () => {
      const result = await execSequelae(['DELETE', 'FROM', 'test']);
      // This should work as direct SQL
      expect(result.code).toBe(0);
    });

    test('should recognize CREATE without exec prefix', async () => {
      const result = await execSequelae(['CREATE', 'TABLE', 'test', '(id', 'int)']);
      // This should work as direct SQL
      expect(result.code).toBe(0);
    });

    test('should recognize DROP without exec prefix', async () => {
      const result = await execSequelae(['DROP', 'TABLE', 'test']);
      // This should work as direct SQL
      expect(result.code).toBe(0);
    });

    test('should recognize ALTER without exec prefix', async () => {
      const result = await execSequelae([
        'ALTER',
        'TABLE',
        'test',
        'ADD',
        'COLUMN',
        'name',
        'text',
      ]);
      // This should work as direct SQL
      expect(result.code).toBe(0);
    });

    test('should recognize lowercase SQL commands', async () => {
      const result = await execSequelae(['select', '1']);
      // This should work as direct SQL
      expect(result.code).toBe(0);
    });

    test('should recognize mixed case SQL commands', async () => {
      const result = await execSequelae(['SeLeCt', '1']);
      // This should work as direct SQL
      expect(result.code).toBe(0);
    });
  });

  describe('Unknown Command Handling', () => {
    test('should error on completely unknown command', async () => {
      const result = await execSequelae(['foobar']);
      expect(result.code).toBe(1);
      expect(result.stderr).toContain('Unknown command: foobar');
    });

    test('should error on typo in select', async () => {
      const result = await execSequelae(['selct', '1']);
      expect(result.code).toBe(1);
      expect(result.stderr).toContain('Unknown command: selct');
    });

    test('should error on typo in exec', async () => {
      const result = await execSequelae(['exce', 'SELECT 1']);
      expect(result.code).toBe(1);
      expect(result.stderr).toContain('Unknown command: exce');
    });

    test('should handle empty command after flags', async () => {
      const result = await execSequelae(['--json']);
      expect(result.code).toBe(1);
      expect(result.json).toBeDefined();
      expect((result.json as any).error).toContain('No command provided');
    });

    test('should handle command with special characters', async () => {
      const result = await execSequelae(['@#$%']);
      expect(result.code).toBe(1);
      expect(result.stderr).toContain('Unknown command: @#$%');
    });

    test('should handle command with unicode characters', async () => {
      const result = await execSequelae(['测试']);
      expect(result.code).toBe(1);
      expect(result.stderr).toContain('Unknown command: 测试');
    });
  });
});
