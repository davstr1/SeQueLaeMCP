# Database Backup Feature Review

## Overview
Adding a fully functional backup feature to sequelae-mcp that works in both MCP and CLI modes.

## Implementation Strategy

### 1. Core Backup Methods (in SqlExecutor)

```typescript
// Primary backup method with automatic fallback
async backup(options: BackupOptions): Promise<BackupResult>

// pg_dump integration (preferred method)
private async backupWithPgDump(options): Promise<BackupResult>

// SQL-based backup (fallback method)
private async backupWithSql(options): Promise<BackupResult>
```

### 2. Backup Approaches

#### A. pg_dump Integration (Primary)
- **Pros**: Most reliable, handles all PostgreSQL features, multiple formats
- **Implementation**: Use child_process to spawn pg_dump with connection params
- **Formats**: plain SQL, custom, directory, tar
- **Auth**: Extract connection details from DATABASE_URL, pass via env vars

#### B. SQL COPY Commands (Fallback)
- **Pros**: No external dependencies, works through SQL connection
- **Implementation**: Generate COPY TO statements for each table
- **Limitations**: Table-level only, no stored procedures/views in data backup

### 3. MCP Tool Definition

```typescript
{
  name: 'sql_backup',
  description: 'Create a backup of the PostgreSQL database',
  inputSchema: {
    format?: 'plain' | 'custom' | 'directory' | 'tar',
    tables?: string[],      // Specific tables to backup
    schemas?: string[],     // Specific schemas to backup  
    dataOnly?: boolean,     // Backup only data
    schemaOnly?: boolean,   // Backup only schema
    compress?: boolean,     // Enable compression
    outputPath?: string,    // Where to save backup
    usePgDump?: boolean,    // Force pg_dump or SQL method
  }
}
```

### 4. CLI Commands

```bash
# Basic backup
sequelae backup

# Backup specific tables
sequelae backup --tables users,posts,comments

# Custom format with compression
sequelae backup --format custom --compress --output db_backup.dump

# Schema only backup
sequelae backup --schema-only --output schema.sql

# Force SQL-based backup
sequelae backup --no-pg-dump
```

### 5. Critical Implementation Details

#### Connection String Parsing
```typescript
// Parse DATABASE_URL to extract components
const url = new URL(process.env.DATABASE_URL);
const pgDumpEnv = {
  PGHOST: url.hostname,
  PGPORT: url.port || '5432',
  PGDATABASE: url.pathname.slice(1),
  PGUSER: url.username,
  PGPASSWORD: url.password,
};
```

#### Error Handling Flow
1. Try pg_dump first (unless disabled)
2. If pg_dump fails, check if it was explicitly requested
3. If not explicit, fall back to SQL-based backup
4. Provide clear error messages about what failed and why

#### Output Handling
- **Streaming**: Use streams for large backups to avoid memory issues
- **Progress**: Report progress for long operations
- **Compression**: Use gzip for plain SQL format when compress=true

### 6. Edge Cases & Solutions

#### Special Characters in Names
```typescript
// Quote identifiers properly
const quotedTable = `"${tableName.replace(/"/g, '""')}"`;
```

#### Large Databases
- Stream output instead of buffering
- Implement chunked COPY for SQL method
- Add progress reporting

#### Concurrent Backups
- Use unique temp filenames
- Implement backup queue/locking

#### Connection Types
- Support SSL connections
- Handle Unix socket connections
- Support connection pooling

### 7. Security Considerations

1. **Never log credentials**: Use PGPASSWORD env var, not command line
2. **Path validation**: Prevent directory traversal attacks
3. **Temp file cleanup**: Always clean up temp files, even on error
4. **Permission checks**: Verify write permissions before starting

### 8. Testing Requirements

1. **Unit Tests**:
   - Connection string parsing
   - Option validation
   - Error handling logic

2. **Integration Tests**:
   - pg_dump execution
   - SQL COPY generation
   - Output file creation

3. **E2E Tests**:
   - Full backup and restore cycle
   - MCP tool invocation
   - CLI command execution

### 9. Implementation Checklist

- [ ] Add BackupOptions and BackupResult types
- [ ] Implement backup() method in SqlExecutor
- [ ] Add pg_dump integration with proper auth
- [ ] Implement SQL-based fallback
- [ ] Add MCP tool definition
- [ ] Implement MCP tool handler
- [ ] Add CLI backup command
- [ ] Add progress reporting
- [ ] Implement streaming for large backups
- [ ] Add comprehensive error handling
- [ ] Write unit tests
- [ ] Write integration tests
- [ ] Update documentation
- [ ] Add backup examples

### 10. Example Implementation Snippet

```typescript
private async backupWithPgDump(options: BackupOptions): Promise<BackupResult> {
  const start = Date.now();
  const url = new URL(this.connectionString);
  
  // Build pg_dump arguments
  const args = [
    '-h', url.hostname,
    '-p', url.port || '5432',
    '-U', url.username,
    '-d', url.pathname.slice(1),
    '--no-password',  // Use PGPASSWORD env instead
  ];
  
  // Add format option
  if (options.format && options.format !== 'plain') {
    args.push('-F', options.format.charAt(0));
  }
  
  // Add table selections
  if (options.tables?.length) {
    options.tables.forEach(table => {
      args.push('-t', table);
    });
  }
  
  // Add schema selections
  if (options.schemas?.length) {
    options.schemas.forEach(schema => {
      args.push('-n', schema);
    });
  }
  
  // Data/schema only options
  if (options.dataOnly) args.push('-a');
  if (options.schemaOnly) args.push('-s');
  
  // Output file
  const outputPath = options.outputPath || `backup_${Date.now()}.sql`;
  args.push('-f', outputPath);
  
  // Execute pg_dump
  const env = { ...process.env, PGPASSWORD: url.password };
  const { spawn } = await import('child_process');
  
  return new Promise((resolve, reject) => {
    const proc = spawn('pg_dump', args, { env });
    let stderr = '';
    
    proc.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    proc.on('close', (code) => {
      if (code === 0) {
        resolve({
          success: true,
          method: 'pg_dump',
          outputPath,
          duration: Date.now() - start,
        });
      } else {
        reject(new Error(`pg_dump failed: ${stderr}`));
      }
    });
    
    proc.on('error', (error) => {
      reject(new Error(`Failed to execute pg_dump: ${error.message}`));
    });
  });
}
```

## Conclusion

This backup feature design is comprehensive and production-ready, handling all edge cases with proper error handling, security, and fallback mechanisms. The dual approach (pg_dump + SQL fallback) ensures it works in all environments.