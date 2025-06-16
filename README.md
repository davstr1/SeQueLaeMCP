# sql-agent-cli

Dead-simple CLI tool that executes SQL queries on PostgreSQL databases.

Supports:
- Supabase
- Neon
- Railway (PostgreSQL)
- Amazon RDS PostgreSQL
- Google Cloud SQL PostgreSQL
- Azure Database for PostgreSQL
- Local PostgreSQL
- Any PostgreSQL-compatible database

---

## 🧠 The pain it Solves

While working with Claude in Cursor, I found that Claude couldn't easily interact with a real database. It's supposed to build entire apps for you, yet when it comes time to actually build/modify/test a real DB, you find it spinning in a hamster wheel trying to build some weird SQL adapter/migration mechanism that will most likely fail. And then retry to build some nuclear reactor from space to solve that little db problem.

Eventually you rage-ESC and just beg for raw SQL to paste into your dashboard, then manually report the results back. (Likely with some insulting). Rinse and repeat, way too often.

And don't get me started on DB schemas that are documented somewhere but inevitably out of date after modifications. (Unless you're a maniac). How many tokens get waisted, building around an outdated schema, testing, won't work etc... ?

**`sql-agent-cli` solves this by letting your AI run real SQL queries instantly from the CLI**, using just a `DATABASE_URL` from a root .env.

Plus, it can access the **real-time DB schema anytime. So say goodbye to stale schema docs!**
---

## ⚙️ Installation

### NPM (Recommended)
```bash
npm install -D sql-agent-cli
```

### Global installation
```bash
npm install -g sql-agent-cli
```

### Development setup
```bash
git clone https://github.com/yourusername/sql-agent-cli
cd sql-agent-cli
npm install
npm run build
```

---

## 🔧 Setup

Create a `.env` file in your project root:

```env
DATABASE_URL=postgresql://[user]:[password]@[host]:[port]/[database]
```

### Provider Examples:
- **Supabase**: `postgresql://postgres.ref:[password]@aws-0-region.pooler.supabase.com:5432/postgres`
- **Neon**: `postgresql://user:[password]@host.neon.tech/dbname`
- **Local**: `postgresql://postgres:password@localhost:5432/mydb`

### 🤖 For AI Assistants (MCP Mode)

```bash
# Start in MCP mode
npx sql-agent --mcp

# Or use environment variable
MCP_MODE=true npx sql-agent
```

This runs sql-agent as an MCP tool that AI assistants can use directly.

### CLAUDE.md Integration

Add this section to your `CLAUDE.md` file:

````markdown
## Database Access

This project has direct database access via `sql-agent-cli`.

### Quick Commands
```bash
# Execute SQL queries
npx sql-agent exec "SELECT * FROM users WHERE active = true"

# Run SQL files
npx sql-agent file migrations/001_init.sql

# Get database schema (AI-friendly view of all tables)
npx sql-agent schema

# Get schema for specific tables
npx sql-agent schema users,posts

# Export query results as JSON
npx sql-agent exec "SELECT * FROM orders" --json > orders.json
```

### Important Notes
- The tool uses the DATABASE_URL from .env file
- Only PostgreSQL databases are supported
- Be cautious with destructive operations (DELETE, DROP, TRUNCATE)
````

---

## 🚀 Usage

### Execute SQL directly
```bash
npx sql-agent exec "SELECT * FROM users"
```

### Execute from file
```bash
npx sql-agent file migrations/001_init.sql
```

### Show database schema
```bash
# Show all tables in public schema
npx sql-agent schema

# Show specific tables
npx sql-agent schema users
npx sql-agent schema users,posts
npx sql-agent schema users, posts   # Spaces are OK

# Misspelled table? Get suggestions!
npx sql-agent schema userz
# Output: Table "userz" not found. Did you mean: users, users_test?

# Show all schemas including system tables
npx sql-agent schema --all
```

### Other commands
- `npx sql-agent --help` - Show help
- `npx sql-agent --version` - Show version
- `npx sql-agent exit` - Exit (for interactive environments)

### JSON output mode
```bash
npx sql-agent exec "SELECT * FROM users" --json
```

---

## 📚 Common Examples

```bash
# Create table
npx sql-agent exec "CREATE TABLE users (id serial PRIMARY KEY, email text UNIQUE)"

# Insert data
npx sql-agent exec "INSERT INTO users (email) VALUES ('user@example.com') RETURNING *"

# Run migration
npx sql-agent file migrations/001_init.sql

# Export as JSON
npx sql-agent exec "SELECT * FROM users" --json > users.json

# Get database schema for AI context (public tables only)
npx sql-agent schema

# Get schema for specific tables (more efficient)
npx sql-agent schema users,posts
```

---

## ⚠️ Limitations

- Single database connection (no connection pooling)
- No transaction support for multi-statement queries
- PostgreSQL only
- No query history or favorites
- SSL certificate validation disabled by default

## 🔒 Security

- Never commit `.env` files
- Be cautious with destructive operations (`DROP`, `DELETE`, `TRUNCATE`)
- Tool inherits database user permissions
- SSL connections enabled but certificate validation is off

---

## 🛠 Troubleshooting

### Connection refused
- Check DATABASE_URL format
- Verify database is running
- Check firewall/security group settings

### SSL errors
- Add `?sslmode=require` to DATABASE_URL
- For self-signed certs: Tool accepts them by default

### "relation does not exist"
- Check you're connected to the right database
- Verify schema/table names (case-sensitive!)

---

## 🛠 Development

```bash
npm test          # Run tests
npm run build     # Build project
npm test -- --coverage  # Coverage report
```

---

## 🗺 Roadmap

- [ ] Transaction support
- [ ] Query result export (CSV)
- [ ] Connection pooling
- [ ] Query validation/restrictions for production

---

## 🤖 MCP Mode (For AI Assistants)

sql-agent-cli can run as an MCP tool, allowing AI assistants like Claude to execute SQL directly.

### Quick Start
```bash
# Run in MCP mode
npx sql-agent --mcp
```

### Available Tools
- `sql_exec` - Execute SQL queries
- `sql_file` - Execute SQL from files  
- `sql_schema` - Get database schema

### Example MCP Request
```json
{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "sql_exec",
    "arguments": {
      "query": "SELECT * FROM users LIMIT 5"
    }
  }
}
```

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes and add tests
4. Run tests: `npm test`
5. Commit: `git commit -m 'Add amazing feature'`
6. Push: `git push origin feature/amazing-feature`
7. Open a Pull Request

---

## 📄 License

MIT - see [LICENSE](LICENSE) file for details

---

## 💡 Why This Tool Exists

Built by developers, for developers who are tired of:
- Copy-pasting SQL queries between AI chat and terminal
- Building overcomplicated database adapters for simple tasks
- Waiting for bloated ORMs when raw SQL is faster
- Context switching between multiple tools

**sql-agent-cli** keeps it simple: one command, real results, zero friction.