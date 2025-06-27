<div align="center">
  <img src="./src/assets/logo.-sequelae-mcp.png" alt="sequelae-mcp logo" width="200" />
</div>

# sequelae-mcp

[![CI](https://github.com/davstr1/SeQueLaeMCP/actions/workflows/ci.yml/badge.svg)](https://github.com/davstr1/SeQueLaeMCP/actions/workflows/ci.yml)
[![Coverage Status](https://coveralls.io/repos/github/davstr1/SeQueLaeMCP/badge.svg?branch=main)](https://coveralls.io/github/davstr1/SeQueLaeMCP?branch=main)
[![codecov](https://codecov.io/gh/davstr1/SeQueLaeMCP/branch/main/graph/badge.svg)](https://codecov.io/gh/davstr1/SeQueLaeMCP)
[![MCP](https://img.shields.io/badge/MCP-Compatible-green.svg)](https://modelcontextprotocol.io)

MCP-enabled PostgreSQL tool that lets AI assistants execute SQL directly. Also works as a CLI for humans.

**This is for the brave and the bold, the kind of person who enjoy their Claude Code rides with `--dangerously-skip-permissions`**

## 🤖 For AI Assistants (Primary Use)

sequelae-cli implements the Model Context Protocol (MCP), allowing AI assistants like Claude to execute SQL queries directly on PostgreSQL databases.

### Quick Start

1. **Install sequelae-mcp in your project:**
   Navigate to your project directory and run:
   ```bash
   npm install sequelae-mcp
   ```

2. **Set your database connection:**
   Create a `.env` file in your project root:
   ```env
   DATABASE_URL=postgresql://user:password@localhost:5432/mydb
   ```

3. **Configure your AI tool:**

   **For Claude Desktop:**
   Add to `~/Library/Application Support/Claude/claude_desktop_config.json` (Mac):
   ```json
   {
     "mcpServers": {
       "sequelae": {
         "command": "npx",
         "args": ["sequelae-mcp", "--mcp"],
         "cwd": "/Users/username/projects/myproject"
       }
     }
   }
   ```
   
   **For Claude Code (CLI):**
   ```bash
   claude mcp add sequelae npx sequelae-mcp --mcp
   ```
   
   From now on, just start Claude Code:
   ```bash
   claude
   ```
   Claude automatically launches sequelae when it starts!
   
   Optional: Check MCP server status
   ```
   /mcp
   ```
   Should show: `sequelae: connected ✓`

   **For Cursor.AI:**
   Create `.cursor/mcp.json` in your home directory or project:
   ```json
   {
     "mcpServers": {
       "sequelae": {
         "command": "npx",
         "args": ["-y", "sequelae-mcp", "--mcp"],
         "cwd": "/path/to/your/project"
       }
     }
   }
   ```
   
   Or use Cursor Settings UI:
   - Open Command Palette (Ctrl/Cmd + Shift + P)
   - Search for "Cursor Settings"
   - Navigate to MCP Servers section
   - Add sequelae-mcp with the project path
   
   **Important**: You don't need to manually launch sequelae! Claude Desktop, Claude Code, and Cursor all automatically start the MCP server when they need it.

### Available MCP Tools

#### `sql_exec` - Execute SQL queries
```json
{
  "name": "sql_exec",
  "arguments": {
    "query": "SELECT * FROM users WHERE active = true"
  }
}
```

#### `sql_schema` - Get database schema
```json
{
  "name": "sql_schema",
  "arguments": {
    "tables": ["users", "posts"]  // Optional: specific tables
  }
}
```

**Note**: In MCP mode, JSONB column structures are not analyzed. Use the CLI directly to see JSONB structures.

#### `sql_file` - Execute SQL from files
```json
{
  "name": "sql_file",
  "arguments": {
    "filepath": "migrations/001_init.sql"
  }
}
```

#### `sql_backup` - Create database backups
```json
{
  "name": "sql_backup",
  "arguments": {
    "format": "custom",      // plain, custom, tar, directory
    "compress": true,        // Enable compression
    "outputPath": "backup.dump"
  }
}
```

#### `sql_health` - Check database health
```json
{
  "name": "sql_health",
  "arguments": {
    "includeVersion": true,      // Include database version info
    "includeConnectionInfo": true // Include connection pool stats
  }
}
```

### Example MCP Session
```json
// Request
{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"sql_exec","arguments":{"query":"SELECT COUNT(*) FROM users"}}}

// Response
{"jsonrpc":"2.0","id":1,"content":[{"type":"text","text":"{\"success\":true,\"command\":\"SELECT\",\"rowCount\":1,\"rows\":[{\"count\":42}],\"duration\":23}"}]}
```

---

## 🧠 Why This Exists

AI assistants like Claude are supposed to build entire apps, but they can't directly query databases. This leads to:
- 🔄 Copy-pasting SQL between AI and terminal
- 📚 Outdated schema documentation
- 🏗️ AI building complex DB adapters that fail
- 😤 Frustration and wasted tokens

**sequelae-cli solves this by giving AI direct database access via MCP protocol.**

---

## ⚡ Performance

### Query Latency
| Query Type | Expected Latency | Notes |
|------------|-----------------|--------|
| Simple SELECT | 5-15ms | Connection pooling minimizes overhead |
| Schema queries | 10-30ms | Depends on table count |
| Complex queries | 20-100ms | Limited by PostgreSQL performance |

### Key Features
- **Connection pooling**: Persistent connections reduce overhead from ~50ms to <1ms
- **Query timeout**: Default 120s, configurable per-query
- **Rate limiting**: Token bucket algorithm with <1ms overhead (MCP mode)
- **Memory efficient**: 30-50MB base + 1-2MB per connection

### Performance Tuning
```bash
# High concurrency setup
export POSTGRES_MAX_CONNECTIONS=20
export QUERY_TIMEOUT=30000

# MCP rate limiting
export MCP_RATE_LIMIT_MAX_REQUESTS=1000
export MCP_RATE_LIMIT_WINDOW_MS=60000
```

---

## ⚙️ Installation & Setup

### 1. Install
```bash
npm install -D sequelae-mcp
```

### 2. Configure Database
Create `.env` in your project root:
```env
DATABASE_URL=postgresql://[user]:[password]@[host]:[port]/[database]

# Optional SSL Configuration
POSTGRES_SSL_MODE=require                # disable, require (default), verify-ca, verify-full
POSTGRES_SSL_REJECT_UNAUTHORIZED=true    # true (default) or false for self-signed certs

# Optional Rate Limiting (MCP mode only)
MCP_RATE_LIMIT_MAX_REQUESTS=100         # Max requests per window (default: unlimited)
MCP_RATE_LIMIT_WINDOW_MS=60000          # Time window in ms (default: 60000)
MCP_RATE_LIMIT_TOOLS='{"sql_exec":{"maxRequests":50,"windowMs":60000}}'  # Tool-specific limits
```

**Examples:**
- **Supabase**: `postgresql://postgres.ref:[password]@aws-0-region.pooler.supabase.com:5432/postgres`
- **Neon**: `postgresql://user:[password]@host.neon.tech/dbname`
- **Local**: `postgresql://postgres:password@localhost:5432/mydb`

**SSL Configuration:**
- `POSTGRES_SSL_MODE=require` - Default, requires SSL but allows self-signed certificates
- `POSTGRES_SSL_MODE=disable` - No SSL (for local development)
- `POSTGRES_SSL_MODE=verify-full` - Full SSL verification (production recommended)
- `POSTGRES_SSL_REJECT_UNAUTHORIZED=false` - Allow self-signed certificates

### 3. Add to AI Instructions
Add to your `CLAUDE.md` or AI instructions:
````markdown
## Database Access

Direct PostgreSQL access via MCP:
- Tool: sequelae-cli
- Start: `npx sequelae --mcp`
- Queries: Use `sql_exec` tool
- Schema: Use `sql_schema` tool
- Backups: Use `sql_backup` tool
````

---

## 👤 CLI Mode (For Humans)

When not using MCP, sequelae works as a traditional CLI:

### Basic Commands
```bash
# Execute SQL
npx sequelae exec "SELECT * FROM users"

# Run SQL file
npx sequelae file migrations/001_init.sql

# Get schema
npx sequelae schema
npx sequelae schema users,posts  # Specific tables

# JSON output
npx sequelae exec "SELECT * FROM users" --json

# Create backup
npx sequelae backup
npx sequelae backup --output my_backup.sql
```

### Examples
```bash
# Create table
npx sequelae exec "CREATE TABLE posts (id serial PRIMARY KEY, title text)"

# Insert data
npx sequelae exec "INSERT INTO posts (title) VALUES ('Hello') RETURNING *"

# Export data
npx sequelae exec "SELECT * FROM posts" --json > posts.json

# Backup database
npx sequelae backup --tables users,posts --format custom
```

### JSONB Structure Analysis

sequelae automatically analyzes JSONB columns when displaying schema:

```bash
# View schema with JSONB structure
npx sequelae schema

# Output example:
# 📋 public.users
#   Columns:
#     - id: uuid DEFAULT gen_random_uuid()
#     - email: text
#     - metadata: jsonb (nullable)
#       Structure of metadata:
#         - name: string
#         - age?: number
#         - tags?: array<string>
#         - address?: object
#           - street: string
#           - city: string
#           - zip?: string
```

The JSONB analyzer:
- Samples up to 10 rows to determine structure
- Shows field types (string, number, boolean, object, array, null)
- Marks optional fields with `?`
- Displays nested object structures with indentation
- Shows array element types (e.g., `array<string>`)

---

## 🔧 Supported Databases

- ✅ Supabase
- ✅ Neon
- ✅ Railway PostgreSQL
- ✅ Amazon RDS PostgreSQL
- ✅ Google Cloud SQL PostgreSQL
- ✅ Azure Database for PostgreSQL
- ✅ Local PostgreSQL
- ✅ Any PostgreSQL-compatible database

---

## ⚠️ Limitations

- PostgreSQL only
- Backup requires pg_dump installed locally

---

## 🛠 Development

```bash
npm test              # Run tests
npm run build         # Build TypeScript
npm test -- --coverage # Coverage report
npm run lint          # Run linter
npm run format        # Format code
```

---

## 🚨 Troubleshooting

### Connection Issues

**Error: `ECONNREFUSED`**
- Check if PostgreSQL is running
- Verify DATABASE_URL is correct
- Check firewall/security group settings

**Error: `ETIMEDOUT`**
- Increase timeout: `--timeout 30000`
- Check network connectivity
- Verify PostgreSQL accepts remote connections

**SSL Certificate Errors**
```bash
# For self-signed certificates
export POSTGRES_SSL_REJECT_UNAUTHORIZED=false

# Or disable SSL (development only)
export POSTGRES_SSL_MODE=disable
```

### Query Issues

**Query Timeout**
```bash
# Increase timeout to 5 minutes
npx sequelae --timeout 300000 exec "SELECT pg_sleep(60)"

# Set default timeout
export QUERY_TIMEOUT=300000
```

**Large Result Sets**
- Use LIMIT for large tables
- Consider pagination for exports
- JSON mode is more memory efficient

### MCP Mode Issues

**MCP Server Not Starting**
- Check DATABASE_URL is set
- Verify Node.js version (14+)
- Check for port conflicts

**AI Assistant Can't Connect**
- Ensure `--mcp` flag is used
- Check MCP configuration in AI tool
- Verify firewall allows connections

### Common Solutions

1. **Reset connection pool**
   ```bash
   # Restart the application
   pm2 restart sequelae-mcp
   ```

2. **Test connection**
   ```bash
   npx sequelae exec "SELECT 1"
   ```

3. **Check environment**
   ```bash
   node -e "console.log(process.env.DATABASE_URL)"
   ```

4. **Enable debug logging**
   ```bash
   export LOG_LEVEL=debug
   npx sequelae exec "SELECT * FROM users"
   ```

### Advanced Configuration Example

```bash
# Production setup with SSL, pooling, and rate limiting
cat > .env << EOF
DATABASE_URL=postgresql://user:pass@prod.db.com:5432/myapp
POSTGRES_SSL_MODE=verify-full
POSTGRES_MAX_CONNECTIONS=25
POSTGRES_IDLE_TIMEOUT=30000
POSTGRES_CONNECTION_TIMEOUT=10000
QUERY_TIMEOUT=60000
MCP_RATE_LIMIT_MAX_REQUESTS=500
MCP_RATE_LIMIT_WINDOW_MS=60000
MCP_RATE_LIMIT_TOOLS='{
  "sql_exec": {"maxRequests": 100, "windowMs": 60000},
  "sql_backup": {"maxRequests": 5, "windowMs": 3600000}
}'
LOG_LEVEL=info
EOF
```

---

## 📚 More Documentation

- [Production Deployment Guide](./docs/PRODUCTION-DEPLOYMENT.md)
- [MCP Protocol Details](./MCP.md)
- [Examples](./EXAMPLES.md)
- [Contributing](./CONTRIBUTING.md)

---

## 📄 License

MIT - see [LICENSE](LICENSE) file

---

**Built for AI-first development.** No more copy-pasting SQL. No more stale schemas. Just direct database access for AI assistants.