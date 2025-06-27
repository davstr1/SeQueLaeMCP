import { Pool } from 'pg';
import { spawn } from 'child_process';
import { DATABASE_URL, describeWithDb } from './test-utils';

// Test table names
const USERS_TABLE = 'users_e2e_test_sequelae';
const POSTS_TABLE = 'posts_e2e_test_sequelae';
const JSONB_TABLE = 'jsonb_e2e_test_sequelae';

describeWithDb('Sequelae E2E Tests', () => {
  let pool: Pool;

  beforeAll(async () => {
    if (!DATABASE_URL) return;

    pool = new Pool({
      connectionString: DATABASE_URL,
      ssl: process.env.POSTGRES_SSL_MODE === 'disable' ? false : { rejectUnauthorized: false },
      // Add connection timeout and idle timeout
      connectionTimeoutMillis: 10000,
      idleTimeoutMillis: 10000,
      max: 5, // Limit max connections
    });

    // Handle pool errors
    pool.on('error', err => {
      // Ignore connection termination errors during shutdown
      if (err.message && err.message.includes('db_termination')) {
        return;
      }
      console.error('Unexpected pool error:', err);
    });

    // Clean up any leftover tables from previous runs
    await pool.query(`DROP TABLE IF EXISTS ${POSTS_TABLE} CASCADE`);
    await pool.query(`DROP TABLE IF EXISTS ${USERS_TABLE} CASCADE`);
    await pool.query(`DROP TABLE IF EXISTS ${JSONB_TABLE} CASCADE`);
  });

  afterAll(async () => {
    if (!pool) return;

    try {
      // Clean up test tables
      await pool.query(`DROP TABLE IF EXISTS ${POSTS_TABLE} CASCADE`);
      await pool.query(`DROP TABLE IF EXISTS ${USERS_TABLE} CASCADE`);
      await pool.query(`DROP TABLE IF EXISTS ${JSONB_TABLE} CASCADE`);
    } catch (_error) {
      // Ignore errors during cleanup
    } finally {
      // Ensure pool is properly closed
      await pool.end();
    }
  });

  // Helper function to execute sequelae CLI
  async function execSequelae(
    args: string[]
  ): Promise<{ stdout: string; stderr: string; code: number; json?: any }> {
    return new Promise((resolve, reject) => {
      const binPath = require.resolve('../bin/sequelae');
      // Add --json flag to all test commands
      const proc = spawn('node', [binPath, '--json', ...args], {
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

  describe('Table Creation', () => {
    test('should create users table', async () => {
      const sql = `
        CREATE TABLE IF NOT EXISTS ${USERS_TABLE} (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          email text UNIQUE NOT NULL,
          name text,
          created_at timestamptz DEFAULT now()
        )
      `;

      const result = await execSequelae(['exec', sql]);
      expect(result.code).toBe(0);
      expect(result.json).toBeDefined();
      expect((result.json as any).success).toBe(true);
      expect((result.json as any).command).toContain('CREATE');

      // Verify table exists
      const checkTable = await pool.query(
        `
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = $1
        )
      `,
        [USERS_TABLE]
      );
      expect(checkTable.rows[0].exists).toBe(true);
    });

    test('should create posts table with foreign key', async () => {
      // Ensure users table exists first
      await pool.query(`
        CREATE TABLE IF NOT EXISTS ${USERS_TABLE} (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          email text UNIQUE NOT NULL,
          name text,
          created_at timestamptz DEFAULT now()
        )
      `);

      const sql = `
        CREATE TABLE IF NOT EXISTS ${POSTS_TABLE} (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id uuid REFERENCES ${USERS_TABLE}(id) ON DELETE CASCADE,
          title text NOT NULL,
          content text,
          published boolean DEFAULT false,
          created_at timestamptz DEFAULT now()
        )
      `;

      const result = await execSequelae(['exec', sql]);
      expect(result.code).toBe(0);
      expect(result.json).toBeDefined();
      expect((result.json as any).success).toBe(true);
      expect((result.json as any).command).toContain('CREATE');

      // Verify table exists and has foreign key
      const checkTable = await pool.query(
        `
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = $1
        )
      `,
        [POSTS_TABLE]
      );
      expect(checkTable.rows[0].exists).toBe(true);
    });
  });

  describe('Data Insertion', () => {
    beforeAll(async () => {
      // Ensure tables exist for data insertion tests
      await pool.query(`
        CREATE TABLE IF NOT EXISTS ${USERS_TABLE} (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          email text UNIQUE NOT NULL,
          name text,
          created_at timestamptz DEFAULT now()
        )
      `);
      await pool.query(`
        CREATE TABLE IF NOT EXISTS ${POSTS_TABLE} (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id uuid REFERENCES ${USERS_TABLE}(id) ON DELETE CASCADE,
          title text NOT NULL,
          content text,
          published boolean DEFAULT false,
          created_at timestamptz DEFAULT now()
        )
      `);
    });
    test('should insert users', async () => {
      const sql = `
        INSERT INTO ${USERS_TABLE} (email, name) VALUES
          ('alice@test.com', 'Alice Test'),
          ('bob@test.com', 'Bob Test')
        RETURNING *
      `;

      const result = await execSequelae(['exec', sql]);
      expect(result.code).toBe(0);
      expect(JSON.stringify((result.json as any).rows)).toContain('alice@test.com');
      expect(JSON.stringify((result.json as any).rows)).toContain('Bob Test');
      expect((result.json as any).rowCount).toBe(2);
    });

    test('should handle duplicate email constraint', async () => {
      const sql = `INSERT INTO ${USERS_TABLE} (email, name) VALUES ('alice@test.com', 'Another Alice')`;

      const result = await execSequelae(['exec', sql]);
      expect(result.code).toBe(1);
      expect((result.json as any).error).toContain('duplicate key value');
    });

    test('should insert posts', async () => {
      // First get a user ID
      const user = await pool.query(`SELECT id FROM ${USERS_TABLE} WHERE email = 'alice@test.com'`);
      const userId = user.rows[0].id;

      const sql = `
        INSERT INTO ${POSTS_TABLE} (user_id, title, content, published) VALUES
          ('${userId}', 'Test Post', 'This is a test post', true)
        RETURNING *
      `;

      const result = await execSequelae(['exec', sql]);
      expect(result.code).toBe(0);
      expect(JSON.stringify((result.json as any).rows)).toContain('Test Post');
      expect((result.json as any).rowCount).toBe(1);
    });
  });

  describe('Data Querying', () => {
    beforeAll(async () => {
      // Ensure tables and data exist for querying tests
      await pool.query(`
        CREATE TABLE IF NOT EXISTS ${USERS_TABLE} (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          email text UNIQUE NOT NULL,
          name text,
          created_at timestamptz DEFAULT now()
        )
      `);
      await pool.query(`
        CREATE TABLE IF NOT EXISTS ${POSTS_TABLE} (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id uuid REFERENCES ${USERS_TABLE}(id) ON DELETE CASCADE,
          title text NOT NULL,
          content text,
          published boolean DEFAULT false,
          created_at timestamptz DEFAULT now()
        )
      `);
      // Insert test data
      await pool.query(`
        INSERT INTO ${USERS_TABLE} (email, name) VALUES
          ('alice@test.com', 'Alice Test'),
          ('bob@test.com', 'Bob Test')
        ON CONFLICT (email) DO NOTHING
      `);
      const user = await pool.query(`SELECT id FROM ${USERS_TABLE} WHERE email = 'alice@test.com'`);
      if (user.rows.length > 0) {
        await pool.query(
          `
          INSERT INTO ${POSTS_TABLE} (user_id, title, content, published) VALUES
            ($1, 'Test Post', 'This is a test post', true)
          ON CONFLICT DO NOTHING
        `,
          [user.rows[0].id]
        );
      }
    });
    test('should query users', async () => {
      const result = await execSequelae(['exec', `SELECT * FROM ${USERS_TABLE} ORDER BY email`]);
      expect(result.code).toBe(0);
      expect(JSON.stringify((result.json as any).rows)).toContain('alice@test.com');
      expect(JSON.stringify((result.json as any).rows)).toContain('bob@test.com');
      expect((result.json as any).rowCount).toBe(2);
    });

    test('should query with joins', async () => {
      const sql = `
        SELECT p.title, u.name as author 
        FROM ${POSTS_TABLE} p 
        JOIN ${USERS_TABLE} u ON p.user_id = u.id
      `;

      const result = await execSequelae(['exec', sql]);
      expect(result.code).toBe(0);
      expect(JSON.stringify((result.json as any).rows)).toContain('Test Post');
      expect(JSON.stringify((result.json as any).rows)).toContain('Alice Test');
    });

    test('should handle empty results', async () => {
      const sql = `SELECT * FROM ${POSTS_TABLE} WHERE title = 'Non-existent'`;

      const result = await execSequelae(['exec', sql]);
      expect(result.code).toBe(0);
      expect((result.json as any).command).toContain('SELECT');
      expect((result.json as any).rowCount).toBe(0);
      expect((result.json as any).rows).toHaveLength(0);
    });
  });

  describe('Data Updates', () => {
    beforeAll(async () => {
      // Ensure tables and data exist for update tests
      await pool.query(`
        CREATE TABLE IF NOT EXISTS ${USERS_TABLE} (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          email text UNIQUE NOT NULL,
          name text,
          created_at timestamptz DEFAULT now()
        )
      `);
      await pool.query(`
        CREATE TABLE IF NOT EXISTS ${POSTS_TABLE} (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id uuid REFERENCES ${USERS_TABLE}(id) ON DELETE CASCADE,
          title text NOT NULL,
          content text,
          published boolean DEFAULT false,
          created_at timestamptz DEFAULT now()
        )
      `);
      // Clean up and insert fresh test data
      await pool.query(`DELETE FROM ${POSTS_TABLE}`);
      await pool.query(`DELETE FROM ${USERS_TABLE}`);
      await pool.query(`
        INSERT INTO ${USERS_TABLE} (email, name) VALUES
          ('alice@test.com', 'Alice Test')
      `);
      const user = await pool.query(`SELECT id FROM ${USERS_TABLE} WHERE email = 'alice@test.com'`);
      await pool.query(
        `
        INSERT INTO ${POSTS_TABLE} (user_id, title, content, published) VALUES
          ($1, 'Test Post', 'This is a test post', true)
      `,
        [user.rows[0].id]
      );
    });
    test('should update posts', async () => {
      const sql = `
        UPDATE ${POSTS_TABLE} 
        SET title = 'Updated Post', published = false 
        WHERE title = 'Test Post'
        RETURNING *
      `;

      const result = await execSequelae(['exec', sql]);
      expect(result.code).toBe(0);
      expect(JSON.stringify((result.json as any).rows)).toContain('Updated Post');
      expect((result.json as any).rowCount).toBe(1);
    });

    test('should handle update with no matches', async () => {
      const sql = `
        UPDATE ${POSTS_TABLE} 
        SET title = 'Never happens' 
        WHERE title = 'Non-existent'
        RETURNING *
      `;

      const result = await execSequelae(['exec', sql]);
      expect(result.code).toBe(0);
      expect((result.json as any).command).toContain('UPDATE');
      expect((result.json as any).rowCount).toBe(0);
      expect((result.json as any).rows).toHaveLength(0);
    });
  });

  describe('Data Deletion', () => {
    beforeAll(async () => {
      // Ensure tables and data exist for deletion tests
      await pool.query(`
        CREATE TABLE IF NOT EXISTS ${USERS_TABLE} (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          email text UNIQUE NOT NULL,
          name text,
          created_at timestamptz DEFAULT now()
        )
      `);
      await pool.query(`
        CREATE TABLE IF NOT EXISTS ${POSTS_TABLE} (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id uuid REFERENCES ${USERS_TABLE}(id) ON DELETE CASCADE,
          title text NOT NULL,
          content text,
          published boolean DEFAULT false,
          created_at timestamptz DEFAULT now()
        )
      `);
      // Clean up and insert fresh test data
      await pool.query(`DELETE FROM ${POSTS_TABLE}`);
      await pool.query(`DELETE FROM ${USERS_TABLE}`);
      await pool.query(`
        INSERT INTO ${USERS_TABLE} (email, name) VALUES
          ('alice@test.com', 'Alice Test'),
          ('bob@test.com', 'Bob Test')
      `);
      const user = await pool.query(`SELECT id FROM ${USERS_TABLE} WHERE email = 'alice@test.com'`);
      await pool.query(
        `
        INSERT INTO ${POSTS_TABLE} (user_id, title, content, published) VALUES
          ($1, 'Updated Post', 'This is a test post', false)
      `,
        [user.rows[0].id]
      );
    });
    test('should delete posts', async () => {
      const sql = `DELETE FROM ${POSTS_TABLE} WHERE title = 'Updated Post' RETURNING id`;

      const result = await execSequelae(['exec', sql]);
      expect(result.code).toBe(0);
      expect((result.json as any).command).toContain('DELETE');
      expect((result.json as any).rowCount).toBe(1);
    });

    test('should cascade delete when user is deleted', async () => {
      // First add a post for bob
      const user = await pool.query(`SELECT id FROM ${USERS_TABLE} WHERE email = 'bob@test.com'`);
      await pool.query(
        `
        INSERT INTO ${POSTS_TABLE} (user_id, title, content) 
        VALUES ($1, 'Bob Post', 'Content')
      `,
        [user.rows[0].id]
      );

      // Delete the user
      const sql = `DELETE FROM ${USERS_TABLE} WHERE email = 'bob@test.com' RETURNING email`;

      const result = await execSequelae(['exec', sql]);
      expect(result.code).toBe(0);
      expect(JSON.stringify((result.json as any).rows)).toContain('bob@test.com');

      // Verify post was cascade deleted
      const checkPost = await pool.query(
        `SELECT COUNT(*) FROM ${POSTS_TABLE} WHERE title = 'Bob Post'`
      );
      expect(checkPost.rows[0].count).toBe('0');
    });
  });

  describe('File Execution', () => {
    test('should execute SQL from file', async () => {
      // Create a temporary SQL file
      const fs = require('fs');
      const tmpFile = '/tmp/test-query.sql';
      fs.writeFileSync(tmpFile, `SELECT COUNT(*) as user_count FROM ${USERS_TABLE}`);

      const result = await execSequelae(['file', tmpFile]);
      expect(result.code).toBe(0);
      expect(JSON.stringify((result.json as any).rows)).toContain('user_count');

      // Clean up
      fs.unlinkSync(tmpFile);
    });

    test('should handle non-existent file', async () => {
      const result = await execSequelae(['file', '/tmp/non-existent-file.sql']);
      expect(result.code).toBe(1);
      expect((result.json as any).error).toContain('File not found');
    });
  });

  describe('Error Handling', () => {
    test('should handle SQL syntax errors', async () => {
      const result = await execSequelae(['exec', 'SELECT * FORM users']);
      expect(result.code).toBe(1);
      expect((result.json as any).error).toBeDefined();
      expect((result.json as any).error).toContain('syntax error');
    });

    test('should handle invalid table references', async () => {
      const result = await execSequelae(['exec', 'SELECT * FROM non_existent_table_xyz']);
      expect(result.code).toBe(1);
      expect((result.json as any).error).toContain('does not exist');
    });

    test('should show help', async () => {
      const result = await execSequelae(['--help']);
      expect(result.code).toBe(0);
      expect((result.json as any).usage).toBeDefined();
      expect((result.json as any).usage[0]).toContain('sequelae exec');
      expect((result.json as any).usage[1]).toContain('sequelae file');
    });

    test('should handle no command', async () => {
      const result = await execSequelae([]);
      expect(result.code).toBe(1);
      expect((result.json as any).error).toContain('No command provided');
    });
  });

  describe('Direct SQL Execution', () => {
    beforeAll(async () => {
      // Ensure tables exist for direct SQL tests
      await pool.query(`
        CREATE TABLE IF NOT EXISTS ${USERS_TABLE} (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          email text UNIQUE NOT NULL,
          name text,
          created_at timestamptz DEFAULT now()
        )
      `);
    });
    test('should execute direct SQL commands', async () => {
      const result = await execSequelae(['SELECT', 'version()']);
      expect(result.code).toBe(0);
      expect(JSON.stringify((result.json as any).rows)).toContain('PostgreSQL');
    });

    test('should handle multi-word SQL commands', async () => {
      const result = await execSequelae(['SELECT', 'COUNT(*)', 'FROM', USERS_TABLE]);
      expect(result.code).toBe(0);
      expect(JSON.stringify((result.json as any).rows)).toContain('count');
    });
  });

  describe('JSONB Schema Analysis', () => {
    beforeAll(async () => {
      // Create table with JSONB column
      await pool.query(`
        CREATE TABLE IF NOT EXISTS ${JSONB_TABLE} (
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

    test('should include JSONB columns in schema JSON output', async () => {
      const result = await execSequelae(['schema', JSONB_TABLE]);
      expect(result.code).toBe(0);
      expect(result.json).toBeDefined();

      const json = result.json as any;
      expect(json.success).toBe(true);
      expect(json.rows).toBeDefined();

      // Find our table in the results
      const tableRow = json.rows.find((r: any) => r.table_name === JSONB_TABLE);
      expect(tableRow).toBeDefined();
      expect(tableRow.columns).toBeDefined();

      // Parse columns and check JSONB types
      const columns = JSON.parse(tableRow.columns);
      const metadataColumn = columns.find((c: any) => c.column_name === 'metadata');
      const settingsColumn = columns.find((c: any) => c.column_name === 'settings');

      expect(metadataColumn).toBeDefined();
      expect(metadataColumn.data_type).toBe('jsonb');

      expect(settingsColumn).toBeDefined();
      expect(settingsColumn.data_type).toBe('jsonb');
    });

    test('should handle JSONB columns properly in JSON output', async () => {
      // Create empty table
      const EMPTY_JSONB_TABLE = 'empty_jsonb_e2e_test_sequelae';
      await pool.query(`DROP TABLE IF EXISTS ${EMPTY_JSONB_TABLE}`);
      await pool.query(`
        CREATE TABLE ${EMPTY_JSONB_TABLE} (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          data jsonb
        )
      `);

      const result = await execSequelae(['schema', EMPTY_JSONB_TABLE]);
      expect(result.code).toBe(0);
      expect(result.json).toBeDefined();

      const json = result.json as any;
      const tableRow = json.rows.find((r: any) => r.table_name === EMPTY_JSONB_TABLE);
      expect(tableRow).toBeDefined();

      const columns = JSON.parse(tableRow.columns);
      const dataColumn = columns.find((c: any) => c.column_name === 'data');
      expect(dataColumn.data_type).toBe('jsonb');

      // Clean up
      await pool.query(`DROP TABLE ${EMPTY_JSONB_TABLE}`);
    });
  });
});
