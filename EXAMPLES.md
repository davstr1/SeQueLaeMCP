# Examples

## CLI Mode Examples

### Basic Queries
```bash
# Select data
npx sql-agent exec "SELECT * FROM users WHERE active = true"

# Insert with returning
npx sql-agent exec "INSERT INTO posts (title, content) VALUES ('Hello', 'World') RETURNING id"

# Update records
npx sql-agent exec "UPDATE users SET last_login = NOW() WHERE id = 123"

# Delete with condition
npx sql-agent exec "DELETE FROM sessions WHERE expired_at < NOW()"
```

### Schema Operations
```bash
# Create table
npx sql-agent exec "CREATE TABLE comments (
  id SERIAL PRIMARY KEY,
  post_id INT REFERENCES posts(id),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
)"

# Add column
npx sql-agent exec "ALTER TABLE users ADD COLUMN avatar_url TEXT"

# Create index
npx sql-agent exec "CREATE INDEX idx_users_email ON users(email)"
```

### File Execution
```bash
# Run migration file
npx sql-agent file db/migrations/001_init.sql

# Run seed file
npx sql-agent file db/seeds/users.sql
```

### Schema Inspection
```bash
# All tables
npx sql-agent schema

# Specific tables
npx sql-agent schema users,posts,comments

# Export schema as JSON
npx sql-agent schema --json > schema.json
```

## MCP Mode Examples

### Initialize Connection
```json
{"jsonrpc":"2.0","id":1,"method":"initialize","params":{}}
```

### List Available Tools
```json
{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}
```

### Execute Queries
```json
{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"sql_exec","arguments":{"query":"SELECT id, email FROM users LIMIT 5"}}}
```

### Get Schema
```json
{"jsonrpc":"2.0","id":4,"method":"tools/call","params":{"name":"sql_schema","arguments":{"tables":["users"]}}}
```

### Run Migration File
```json
{"jsonrpc":"2.0","id":5,"method":"tools/call","params":{"name":"sql_file","arguments":{"filepath":"migrations/001.sql"}}}
```

## Common Patterns

### Pagination
```bash
# Page 1
npx sql-agent exec "SELECT * FROM posts ORDER BY created_at DESC LIMIT 10 OFFSET 0"

# Page 2
npx sql-agent exec "SELECT * FROM posts ORDER BY created_at DESC LIMIT 10 OFFSET 10"
```

### Aggregations
```bash
# Count by status
npx sql-agent exec "SELECT status, COUNT(*) FROM orders GROUP BY status"

# Daily stats
npx sql-agent exec "SELECT DATE(created_at), COUNT(*) FROM users GROUP BY DATE(created_at) ORDER BY 1 DESC LIMIT 7"
```

### Joins
```bash
# User with posts count
npx sql-agent exec "
  SELECT u.*, COUNT(p.id) as post_count
  FROM users u
  LEFT JOIN posts p ON u.id = p.user_id
  GROUP BY u.id
"
```