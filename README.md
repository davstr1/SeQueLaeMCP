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

## 🧠 The Problem It Solves

While working with Claude in Cursor (Pro Max subscription), I found that Claude couldn't directly interact with a real database.

It kept trying to reinvent the wheel—generating bloated SQL adapters or mocking responses, which consumed a ton of tokens and time. I had to repeatedly paste queries manually and report results back.

**`sql-agent-cli` solves this by letting you run real SQL queries instantly from the CLI**, using the same `DATABASE_URL` Claude already knows.

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
git clone https://github.com/your-username/sql-agent-cli
cd sql-agent-cli
npm install
npm run build
```

---

## 🔧 Setup

### 1. Environment Configuration

Create a `.env` file in your project root:

```env
DATABASE_URL=postgresql://postgres.[project-ref]:[password]@[host]:5432/postgres
```

#### Provider-specific examples:

**Supabase:**
```env
DATABASE_URL=postgresql://postgres.abcdefg:[password]@aws-0-us-west-1.pooler.supabase.com:5432/postgres
```
*Find this in: Supabase Dashboard > Settings > Database > Connection string*

**Neon:**
```env
DATABASE_URL=postgresql://[user]:[password]@[host].neon.tech/[dbname]
```

**Railway:**
```env
DATABASE_URL=postgresql://postgres:[password]@[host].railway.app:5432/railway
```

**Local:**
```env
DATABASE_URL=postgresql://postgres:password@localhost:5432/mydatabase
```

### 2. CLAUDE.md Integration (Recommended)

Add this to your `CLAUDE.md` for seamless AI collaboration:

```markdown
### SQL Operations = One Source of Truth

1. Install sql-agent-cli:
```bash
npm install -D sql-agent-cli
```

2. Execute from file (migrations, complex queries):
```bash
npx sql-agent file migrations/001_init.sql
```

3. Execute directly (simple queries, data exploration):
```bash
npx sql-agent exec "SELECT * FROM users LIMIT 5"
```

**Note:** Direct SQL execution is currently unrestricted. Production safety controls coming soon.
```

---

## 🚀 Usage

### Basic Commands

#### Execute SQL directly
```bash
npx sql-agent exec "SELECT * FROM users"
```

#### Execute SQL from file
```bash
npx sql-agent file migrations/001_init.sql
```

#### Direct SQL (legacy syntax)
```bash
npx sql-agent "SELECT COUNT(*) FROM posts"
```

#### Short alias (if available)
```bash
npx ssql "SELECT * FROM products WHERE price > 100"
```

### Advanced Usage

#### Multiple statements from file
```bash
npx sql-agent file database/schema.sql
```

#### Complex queries with formatting
```bash
npx sql-agent exec "
SELECT 
  u.email,
  COUNT(p.id) as post_count,
  MAX(p.created_at) as last_post
FROM users u
LEFT JOIN posts p ON u.id = p.user_id
GROUP BY u.id, u.email
ORDER BY post_count DESC
LIMIT 10
"
```

---

## 📚 Examples

### Schema Management

**Create tables:**
```bash
npx sql-agent exec "CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  email text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now()
)"
```

**Add indexes:**
```bash
npx sql-agent exec "CREATE INDEX idx_users_email ON users(email)"
```

### Data Operations

**Insert data:**
```bash
npx sql-agent exec "INSERT INTO users (email) VALUES ('user@example.com') RETURNING *"
```

**Update records:**
```bash
npx sql-agent exec "UPDATE users SET email = 'new@example.com' WHERE id = '123'"
```

**Query with filters:**
```bash
npx sql-agent exec "SELECT * FROM users WHERE email LIKE '%@company.com' ORDER BY created_at DESC"
```

### Migration Workflows

**Run migration file:**
```bash
npx sql-agent file database/migrations/001_create_tables.sql
```

**Check migration status:**
```bash
npx sql-agent exec "SELECT version, applied_at FROM schema_migrations ORDER BY applied_at DESC"
```

### Data Analysis

**Quick stats:**
```bash
npx sql-agent exec "SELECT 
  COUNT(*) as total_users,
  COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days') as recent_users
FROM users"
```

**Performance monitoring:**
```bash
npx sql-agent exec "SELECT schemaname, tablename, n_tup_ins, n_tup_upd, n_tup_del FROM pg_stat_user_tables"
```

---

## ✨ Features

- 🎯 **Zero configuration** - Just set `DATABASE_URL`
- 📊 **Table formatting** - Results displayed clearly
- ⏱️ **Performance tracking** - Shows execution time
- 🎯 **Precise errors** - Clear error messages with position info
- 🔒 **SSL ready** - Secure connections by default
- 📁 **File execution** - Run complex migrations and scripts
- 🚀 **Fast startup** - Minimal overhead, instant execution
- 🔧 **TypeScript native** - Built with modern tooling

---

## 🛠 Development

### Running tests
```bash
npm test
```

### Watch mode
```bash
npm run test:watch
```

### Build
```bash
npm run build
```

### Coverage report
```bash
npm test
open coverage/lcov-report/index.html
```

---

## 🚨 Security Notes

- **Environment variables**: Never commit `.env` files
- **Production usage**: Be cautious with destructive operations
- **Access control**: Tool inherits database user permissions
- **SQL injection**: Always validate user inputs when building dynamic queries

---

## 🗺 Roadmap

- [ ] Query result export (JSON, CSV)
- [ ] Configuration file for safety restrictions
- [ ] Query history and favorites
- [ ] Interactive mode with autocomplete
- [ ] Connection pooling for better performance
- [ ] Support for other databases (MySQL, SQLite)

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