# MCP Mode

sequelae-mcp supports the Model Context Protocol (MCP), allowing AI assistants to execute SQL directly.

## Quick Start

```bash
# Start MCP server
npx sequelae --mcp

# Or use environment variable
MCP_MODE=true npx sequelae
```

## Available Tools

### sql_exec
Execute a SQL query
```json
{
  "name": "sql_exec",
  "arguments": {
    "query": "SELECT * FROM users",
    "json": true
  }
}
```

### sql_file
Execute SQL from a file
```json
{
  "name": "sql_file", 
  "arguments": {
    "filepath": "migrations/001.sql",
    "json": true
  }
}
```

### sql_schema
Get database schema
```json
{
  "name": "sql_schema",
  "arguments": {
    "tables": ["users", "posts"],
    "json": true
  }
}
```

### sql_backup
Create a database backup using pg_dump
```json
{
  "name": "sql_backup",
  "arguments": {
    "format": "custom",       // plain, custom, tar, directory
    "tables": ["users"],      // specific tables (optional)
    "schemas": ["public"],    // specific schemas (optional)
    "dataOnly": false,        // backup only data
    "schemaOnly": false,      // backup only schema
    "compress": true,         // enable compression
    "outputPath": "backup.dump"
  }
}
```

## Full Example

Request:
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "sql_exec",
    "arguments": {
      "query": "SELECT COUNT(*) FROM users"
    }
  }
}
```

Response:
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "content": [{
    "type": "text",
    "text": "{\"success\":true,\"command\":\"SELECT\",\"rowCount\":1,\"rows\":[{\"count\":42}],\"duration\":23}"
  }]
}
```

## Tips

- All tools return JSON by default
- Set `"json": false` for human-readable output
- The server reads from stdin and writes to stdout
- One request per line (newline-delimited JSON)