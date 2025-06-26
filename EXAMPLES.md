# Examples

## CLI Mode Examples

### Basic Queries
```bash
# Select data
npx sequelae exec "SELECT * FROM users WHERE active = true"

# Insert with returning
npx sequelae exec "INSERT INTO posts (title, content) VALUES ('Hello', 'World') RETURNING id"

# Update records
npx sequelae exec "UPDATE users SET last_login = NOW() WHERE id = 123"

# Delete with condition
npx sequelae exec "DELETE FROM sessions WHERE expired_at < NOW()"
```

### Schema Operations
```bash
# Create table
npx sequelae exec "CREATE TABLE comments (
  id SERIAL PRIMARY KEY,
  post_id INT REFERENCES posts(id),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
)"

# Add column
npx sequelae exec "ALTER TABLE users ADD COLUMN avatar_url TEXT"

# Create index
npx sequelae exec "CREATE INDEX idx_users_email ON users(email)"
```

### File Execution
```bash
# Run migration file
npx sequelae file db/migrations/001_init.sql

# Run seed file
npx sequelae file db/seeds/users.sql
```

### Schema Inspection
```bash
# All tables
npx sequelae schema

# Specific tables
npx sequelae schema users,posts,comments

# Export schema as JSON
npx sequelae schema --json > schema.json
```

### Database Backup
```bash
# Basic backup (creates timestamped .sql file)
npx sequelae backup

# Backup with custom filename
npx sequelae backup --output my_backup.sql

# Backup specific tables only
npx sequelae backup --tables users,posts,comments --output partial_backup.sql

# Custom format backup (more efficient, smaller)
npx sequelae backup --format custom --output db.dump

# Schema-only backup
npx sequelae backup --schema-only --output schema_backup.sql

# Data-only backup
npx sequelae backup --data-only --output data_backup.sql

# Compressed backup
npx sequelae backup --format custom --compress --output compressed.dump

# Backup specific schemas
npx sequelae backup --schemas public,auth --output multi_schema.sql

# Directory format (allows parallel restore)
npx sequelae backup --format directory --output backup_dir/
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

### Create Database Backup
```json
{"jsonrpc":"2.0","id":6,"method":"tools/call","params":{"name":"sql_backup","arguments":{"format":"custom","compress":true,"outputPath":"backup.dump"}}}
```

## Common Patterns

### Pagination
```bash
# Page 1
npx sequelae exec "SELECT * FROM posts ORDER BY created_at DESC LIMIT 10 OFFSET 0"

# Page 2
npx sequelae exec "SELECT * FROM posts ORDER BY created_at DESC LIMIT 10 OFFSET 10"
```

### Aggregations
```bash
# Count by status
npx sequelae exec "SELECT status, COUNT(*) FROM orders GROUP BY status"

# Daily stats
npx sequelae exec "SELECT DATE(created_at), COUNT(*) FROM users GROUP BY DATE(created_at) ORDER BY 1 DESC LIMIT 7"
```

### Joins
```bash
# User with posts count
npx sequelae exec "
  SELECT u.*, COUNT(p.id) as post_count
  FROM users u
  LEFT JOIN posts p ON u.id = p.user_id
  GROUP BY u.id
"
```