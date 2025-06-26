# sequelae-mcp

MCP-enabled PostgreSQL tool that lets AI assistants execute SQL directly. Also works as a CLI for humans.

## 🤖 For AI Assistants (Primary Use)

sql-agent-cli implements the Model Context Protocol (MCP), allowing AI assistants like Claude to execute SQL queries directly on PostgreSQL databases.

### Quick Start
```bash
# Install
npm install -D sql-agent-cli

# Run as MCP server
npx sql-agent --mcp
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

**sql-agent-cli solves this by giving AI direct database access via MCP protocol.**

---

## ⚙️ Installation & Setup

### 1. Install
```bash
npm install -D sql-agent-cli
```

### 2. Configure Database
Create `.env` in your project root:
```env
DATABASE_URL=postgresql://[user]:[password]@[host]:[port]/[database]
```

**Examples:**
- **Supabase**: `postgresql://postgres.ref:[password]@aws-0-region.pooler.supabase.com:5432/postgres`
- **Neon**: `postgresql://user:[password]@host.neon.tech/dbname`
- **Local**: `postgresql://postgres:password@localhost:5432/mydb`

### 3. Add to AI Instructions
Add to your `CLAUDE.md` or AI instructions:
````markdown
## Database Access

Direct PostgreSQL access via MCP:
- Tool: sql-agent-cli
- Start: `npx sql-agent --mcp`
- Queries: Use `sql_exec` tool
- Schema: Use `sql_schema` tool
````

---

## 👤 CLI Mode (For Humans)

When not using MCP, sql-agent works as a traditional CLI:

### Basic Commands
```bash
# Execute SQL
npx sql-agent exec "SELECT * FROM users"

# Run SQL file
npx sql-agent file migrations/001_init.sql

# Get schema
npx sql-agent schema
npx sql-agent schema users,posts  # Specific tables

# JSON output
npx sql-agent exec "SELECT * FROM users" --json
```

### Examples
```bash
# Create table
npx sql-agent exec "CREATE TABLE posts (id serial PRIMARY KEY, title text)"

# Insert data
npx sql-agent exec "INSERT INTO posts (title) VALUES ('Hello') RETURNING *"

# Export data
npx sql-agent exec "SELECT * FROM posts" --json > posts.json
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
- No connection pooling
- No transaction support
- SSL certificate validation disabled by default

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