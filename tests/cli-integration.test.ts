import { spawn } from 'child_process';
import { describeWithDb } from './test-utils';

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
        POSTGRES_SSL_REJECT_UNAUTHORIZED: 'false',
        POSTGRES_SSL_MODE: process.env.POSTGRES_SSL_MODE || 'disable',
        DATABASE_URL: process.env.DATABASE_URL,
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

describeWithDb('CLI Integration Tests', () => {
  describe('SQL Execution (with DATABASE_URL)', () => {
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
      expect((result.json as any).rows[0]).toEqual({ num: 1 });
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
