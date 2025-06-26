# sequelae-mcp

MCP-enabled PostgreSQL tool that lets AI assistants execute SQL directly. Also works as a CLI for humans.

## 🤖 For AI Assistants (Primary Use)

sequelae-cli implements the Model Context Protocol (MCP), allowing AI assistants like Claude to execute SQL queries directly on PostgreSQL databases.

### Quick Start
```bash
# Install
npm install -D sequelae-mcp

# Run as MCP server
npx sequelae --mcp
```

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
- No connection pooling (each command creates new connection)
- No transaction support (each command auto-commits)
- Backup requires pg_dump installed locally

---

## 🛠 Development

```bash
npm test              # Run tests
npm run build         # Build TypeScript
npm test -- --coverage # Coverage report
```

---

## 📚 More Documentation

- [MCP Protocol Details](./MCP.md)
- [Examples](./EXAMPLES.md)
- [Contributing](./CONTRIBUTING.md)

---

## 📄 License

MIT - see [LICENSE](LICENSE) file

---

**Built for AI-first development.** No more copy-pasting SQL. No more stale schemas. Just direct database access for AI assistants.