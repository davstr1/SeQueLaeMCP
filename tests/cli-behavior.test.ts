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
});
