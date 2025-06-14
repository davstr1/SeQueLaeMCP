# Supabase SQL Agent - Playground

This is a test playground for the `sql-agent-cli` module.

## Setup

1. Copy `.env.example` to `.env` and add your Supabase DATABASE_URL:
   ```bash
   cp .env.example .env
   ```

2. Install the local module:
   ```bash
   npm install
   ```

## Test Commands

### 1. Check help
```bash
npx sql-agent --help
```

### 2. Create tables
```bash
npx sql-agent file sql/create-tables.sql
```

### 3. Seed data
```bash
npx sql-agent file sql/seed-data.sql
```

### 4. Query data
```bash
# List all users
npx sql-agent exec "SELECT * FROM users_test_sql_agent"

# List all posts
npx sql-agent exec "SELECT p.*, u.name as author FROM posts_test_sql_agent p JOIN users_test_sql_agent u ON p.user_id = u.id"

# Count posts
npx ssql "SELECT COUNT(*) as total_posts FROM posts_test_sql_agent"
```

### 5. Insert data
```bash
npx sql-agent exec "INSERT INTO users_test_sql_agent (email, name) VALUES ('test@example.com', 'Test User') RETURNING *"
```

### 6. Update data
```bash
npx sql-agent exec "UPDATE posts_test_sql_agent SET published = true WHERE published = false RETURNING id, title"
```

### 7. Delete data
```bash
npx sql-agent exec "DELETE FROM users_test_sql_agent WHERE email = 'test@example.com' RETURNING *"
```

### 8. Test error handling
```bash
# This should show an error
npx sql-agent exec "SELECT * FROM non_existent_table"
```

## Direct SQL (without exec)
```bash
npx sql-agent "SELECT version()"
```