# sql-agent-cli

Dead-simple CLI tool that executes SQL queries on Postgres databases.

Supports:
- Supabase
- Neon
- Railway (PostgreSQL)
- Amazon RDS PostgreSQL
- Google Cloud SQL PostgreSQL
- Local PostgreSQL
- Any PostgreSQL-compatible database

---

## 🧠 The Problem It Solves

While working with Claude in Cursor (Pro Max subscription), I found that Claude couldn't directly interact with a real database.

It kept trying to reinvent the wheel—generating bloated SQL adapters or mocking responses, which consumed a ton of tokens and time. I had to repeatedly paste queries manually and report results back.

**`sql-agent-cli` solves this by letting you run real SQL queries instantly from the CLI**, using the same `DATABASE_URL` Claude already knows.

---

## ⚙️ Installation

```bash
npm install -D sql-agent-cli
```

## Setup

Create a `.env` file in your project with your Supabase database URL:

```env
DATABASE_URL=postgresql://postgres.[project-ref]:[password]@[host]:5432/postgres
```

You can find this in your Supabase project settings under Settings > Database > Connection string.

### CLAUDE.md (advised setup)
Add this to your CLAUDE.md
### Run any sql = one source of truth. 

1 - install sql-agent-cli
```bash
npm install -D sql-agent-cli
```
2 - use from a file
```bash
npx sql-agent file migrations/001_init.sql
```
3 - or use sql directly (only for selects)
```bash
npx sql-agent exec "SELECT * FROM users"
``` 

(TODO : add a settings.json that restricts this behavior)



## Usage

### Execute SQL directly

```bash
npx sql-agent exec "SELECT * FROM users"
```

### Execute SQL from file

```bash
npx sql-agent file migrations/001_init.sql
```

### Direct SQL (without subcommand)

```bash
npx sql-agent "SELECT COUNT(*) FROM posts"
```

### Short alias

```bash
npx ssql "INSERT INTO users (email) VALUES ('test@example.com') RETURNING *"
```

## Examples

Create a table:
```bash
npx sql-agent exec "CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  email text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now()
)"
```

Insert data:
```bash
npx sql-agent exec "INSERT INTO users (email) VALUES ('user@example.com')"
```

Query data:
```bash
npx sql-agent exec "SELECT * FROM users WHERE email LIKE '%@example.com'"
```

Run migrations from file:
```bash
npx sql-agent file database/migrations/001_create_tables.sql
```

## Features

- ✨ Simple CLI interface
- 📊 Results displayed in table format
- ⏱️ Shows execution time
- 📍 Clear error messages with position
- 🔒 SSL connection 
- 📁 Execute from files or inline
- 🚀 Zero configuration beyond DATABASE_URL

## tree
.
├── README.md
├── bin
│   └── sql-agent
├── dev-test
│   ├── README.md
│   ├── package.json
│   └── sql
│       ├── create-tables.sql
│       └── seed-data.sql
├── dist
│   └── cli.js
├── package.json
├── src
│   └── cli.ts
└── tsconfig.json


## License

MIT
