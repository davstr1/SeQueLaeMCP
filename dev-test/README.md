# SQL Agent CLI - Test Environment

Local testing environment for `sql-agent-cli` development.

## Setup

1. Ensure you have a `.env` file in the **root directory** (not in dev-test) with your DATABASE_URL:
   ```bash
   # From this directory:
   cd .. && cp .env.example .env  # If needed
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

## Basic Testing

### 1. Create test tables
```bash
npx sql-agent file sql/create-tables.sql
```

### 2. Seed test data
```bash
npx sql-agent file sql/seed-data.sql
```

### 3. Query data
```bash
# List users
npx sql-agent exec "SELECT * FROM users_test_sql_agent"

# List posts with authors
npx sql-agent exec "SELECT p.*, u.name as author FROM posts_test_sql_agent p JOIN users_test_sql_agent u ON p.user_id = u.id"

# JSON output
npx sql-agent exec "SELECT * FROM users_test_sql_agent" --json
```

### 4. Test CRUD operations
```bash
# Insert
npx sql-agent exec "INSERT INTO users_test_sql_agent (email, name) VALUES ('test@example.com', 'Test User') RETURNING *"

# Update
npx sql-agent exec "UPDATE posts_test_sql_agent SET published = true WHERE id = 1 RETURNING *"

# Delete
npx sql-agent exec "DELETE FROM users_test_sql_agent WHERE email = 'test@example.com' RETURNING *"
```

### 5. Test error handling
```bash
# Non-existent table
npx sql-agent exec "SELECT * FROM non_existent_table"

# Syntax error
npx sql-agent exec "SELECT * FORM users_test_sql_agent"
```

## Other Commands

```bash
npx sql-agent --help     # Show help
npx sql-agent --version  # Show version
```

## Cleanup

Drop test tables when done:
```bash
npx sql-agent exec "DROP TABLE IF EXISTS posts_test_sql_agent, users_test_sql_agent CASCADE"
```