import { spawn } from 'child_process';
import { resolve } from 'path';

describe('Dual Mode Entry Point', () => {
  const binPath = resolve(__dirname, '../bin/sql-agent');

  // Helper to run the CLI
  async function runCli(
    args: string[],
    env?: Record<string, string>
  ): Promise<{
    stdout: string;
    stderr: string;
    code: number;
  }> {
    return new Promise((resolve, reject) => {
      const proc = spawn('node', [binPath, ...args], {
        env: { ...process.env, ...env },
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
        resolve({ stdout, stderr, code: code || 0 });
      });

      proc.on('error', reject);
    });
  }

  describe('CLI Mode', () => {
    test('should run in CLI mode by default', async () => {
      const result = await runCli(['--help']);

      expect(result.code).toBe(0);
      // Help might be in stdout or stderr depending on how it's output
      const output = result.stdout + result.stderr;
      expect(output).toContain('Usage:');
      expect(output).toContain('sql-agent exec');
    });

    test('should handle version in CLI mode', async () => {
      const result = await runCli(['--version']);

      expect(result.code).toBe(0);
      const output = result.stdout + result.stderr;
      expect(output).toContain('sql-agent-cli v');
    });
  });

  describe('MCP Mode', () => {
    test('should run in MCP mode with --mcp flag', async () => {
      const proc = spawn('node', [binPath, '--mcp']);

      let stdout = '';
      let gotResponse = false;

      proc.stdout.on('data', data => {
        stdout += data.toString();
        if (stdout.includes('jsonrpc')) {
          gotResponse = true;
          proc.kill();
        }
      });

      // Send an initialize request
      const request = {
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {},
      };

      proc.stdin.write(JSON.stringify(request) + '\n');

      // Wait for response or timeout
      await new Promise(resolve => {
        const timeout = setTimeout(() => {
          proc.kill();
          resolve(null);
        }, 2000);

        proc.on('close', () => {
          clearTimeout(timeout);
          resolve(null);
        });
      });

      expect(gotResponse).toBe(true);
      expect(stdout).toContain('serverInfo');
    });

    test('should run in MCP mode with MCP_MODE env var', async () => {
      const proc = spawn('node', [binPath], {
        env: { ...process.env, MCP_MODE: 'true' },
      });

      let stdout = '';
      let gotResponse = false;

      proc.stdout.on('data', data => {
        stdout += data.toString();
        if (stdout.includes('jsonrpc')) {
          gotResponse = true;
          proc.kill();
        }
      });

      // Send a tools/list request
      const request = {
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/list',
        params: {},
      };

      proc.stdin.write(JSON.stringify(request) + '\n');

      // Wait for response or timeout
      await new Promise(resolve => {
        const timeout = setTimeout(() => {
          proc.kill();
          resolve(null);
        }, 2000);

        proc.on('close', () => {
          clearTimeout(timeout);
          resolve(null);
        });
      });

      expect(gotResponse).toBe(true);
      expect(stdout).toContain('sql_exec');
      expect(stdout).toContain('sql_file');
      expect(stdout).toContain('sql_schema');
    });
  });
});
