import { Pool } from 'pg';
import { spawn } from 'child_process';
import { DATABASE_URL, describeWithDb } from './test-utils';

// Test table name
const JSONB_TABLE = 'jsonb_schema_test_sequelae';

describeWithDb('JSONB Schema Text Output Tests', () => {
  let pool: Pool;

  beforeAll(async () => {
    if (!DATABASE_URL) return;

    pool = new Pool({
      connectionString: DATABASE_URL,
      ssl: process.env.POSTGRES_SSL_MODE === 'disable' ? false : { rejectUnauthorized: false },
      connectionTimeoutMillis: 10000,
      idleTimeoutMillis: 10000,
      max: 5,
    });

    // Handle pool errors
    pool.on('error', err => {
      if (err.message && err.message.includes('db_termination')) {
        return;
      }
      console.error('Unexpected pool error:', err);
    });

    // Clean up and create test table
    await pool.query(`DROP TABLE IF EXISTS ${JSONB_TABLE} CASCADE`);
    await pool.query(`
      CREATE TABLE ${JSONB_TABLE} (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        metadata jsonb,
        settings jsonb,
        created_at timestamptz DEFAULT now()
      )
    `);

    // Insert diverse JSON data
    await pool.query(`
      INSERT INTO ${JSONB_TABLE} (metadata, settings) VALUES
      ('{"name": "Item 1", "type": "product", "price": 99.99, "tags": ["new", "featured"]}', '{"theme": "dark", "notifications": true}'),
      ('{"name": "Item 2", "type": "service", "price": 149.99, "description": "Premium service"}', '{"theme": "light", "notifications": false, "language": "en"}'),
      ('{"name": "Item 3", "type": "product", "price": 49.99, "tags": ["sale"], "discount": 10}', '{"theme": "dark"}'),
      ('{"name": "Item 4", "type": "bundle", "items": [{"id": 1, "qty": 2}, {"id": 2, "qty": 1}]}', '{"theme": "auto", "notifications": true}'),
      ('{"name": "Item 5", "type": "product", "price": null, "tags": []}', null),
      ('{"name": "Item 6", "nested": {"category": "electronics", "subcategory": {"name": "phones", "id": 123}}}', '{"advanced": {"api_key": "secret", "rate_limit": 100}}')
    `);
  });

  afterAll(async () => {
    if (!pool) return;

    try {
      // Clean up test table
      await pool.query(`DROP TABLE IF EXISTS ${JSONB_TABLE} CASCADE`);
    } catch (_error) {
      // Ignore errors during cleanup
    } finally {
      // Ensure pool is properly closed
      await pool.end();
    }
  });

  // Helper function to execute sequelae CLI without --json flag
  async function execSequelaeText(
    args: string[]
  ): Promise<{ stdout: string; stderr: string; code: number }> {
    return new Promise((resolve, reject) => {
      const binPath = require.resolve('../bin/sequelae');
      // Do NOT add --json flag for these tests
      const proc = spawn('node', [binPath, ...args], {
        cwd: process.cwd(),
        env: {
          ...process.env,
          POSTGRES_SSL_REJECT_UNAUTHORIZED: 'false',
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
        resolve({ stdout, stderr, code: code || 0 });
      });

      proc.on('error', reject);
    });
  }

  test('should show JSONB structure in text schema output', async () => {
    const result = await execSequelaeText(['schema', JSONB_TABLE]);
    expect(result.code).toBe(0);

    const output = result.stdout;

    // Check table is displayed
    expect(output).toContain(JSONB_TABLE);

    // Check JSONB columns are identified
    expect(output).toContain('metadata: jsonb');
    expect(output).toContain('settings: jsonb');

    // Check structure analysis for metadata column
    expect(output).toContain('Structure of metadata:');
    expect(output).toContain('- name: string');
    expect(output).toContain('- type?: string');
    expect(output).toContain('- price?: number | null');
    expect(output).toContain('- tags?: array<string>');
    expect(output).toContain('- description?: string');
    expect(output).toContain('- discount?: number');
    expect(output).toContain('- items?: array<object>');
    expect(output).toContain('- nested?: object');

    // Check structure analysis for settings column
    expect(output).toContain('Structure of settings:');
    expect(output).toContain('- theme?: string');
    expect(output).toContain('- notifications?: boolean');
    expect(output).toContain('- language?: string');
    expect(output).toContain('- advanced?: object');
  });

  test('should handle JSONB columns with no data', async () => {
    // Create empty table
    const EMPTY_JSONB_TABLE = 'empty_jsonb_schema_test';
    await pool.query(`DROP TABLE IF EXISTS ${EMPTY_JSONB_TABLE}`);
    await pool.query(`
      CREATE TABLE ${EMPTY_JSONB_TABLE} (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        data jsonb
      )
    `);

    const result = await execSequelaeText(['schema', EMPTY_JSONB_TABLE]);
    expect(result.code).toBe(0);

    const output = result.stdout;
    expect(output).toContain('data: jsonb');
    expect(output).toContain('(no data to analyze)');

    // Clean up
    await pool.query(`DROP TABLE ${EMPTY_JSONB_TABLE}`);
  });

  test('should show nested object structure with proper indentation', async () => {
    const result = await execSequelaeText(['schema', JSONB_TABLE]);
    expect(result.code).toBe(0);

    const output = result.stdout;

    // Check nested structure formatting with flexible whitespace matching
    expect(output).toMatch(/- nested\?: object/);
    expect(output).toMatch(/- category: string/);
    expect(output).toMatch(/- subcategory: object/);

    // The nested fields should be indented more
    const lines = output.split('\n');
    const nestedIndex = lines.findIndex(line => line.includes('- nested?: object'));
    const categoryIndex = lines.findIndex(line => line.includes('- category: string'));

    if (nestedIndex !== -1 && categoryIndex !== -1) {
      const nestedIndent = lines[nestedIndex].indexOf('-');
      const categoryIndent = lines[categoryIndex].indexOf('-');
      expect(categoryIndent).toBeGreaterThan(nestedIndent);
    }
  });

  test('should handle mixed arrays and show element types', async () => {
    const result = await execSequelaeText(['schema', JSONB_TABLE]);
    expect(result.code).toBe(0);

    const output = result.stdout;

    // Check array formatting
    expect(output).toContain('- tags?: array<string>');
    expect(output).toContain('- items?: array<object>');
  });
});
