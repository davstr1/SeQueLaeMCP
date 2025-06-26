# Action Plan: Database Backup Feature (pg_dump Only)

## Implementation of backup feature using strictly pg_dump - no fallback methods

### Phase 1: Core Types and Interfaces

- [x] Create `src/types/backup.ts` file
- [x] Define `BackupOptions` interface with format, tables, schemas, dataOnly, schemaOnly, compress, outputPath
- [x] Define `BackupResult` interface with success, outputPath, size, duration, error fields
- [x] Export types from main index.ts

### Phase 2: Core Backup Implementation

- [ ] Add `backup(options: BackupOptions): Promise<BackupResult>` method to SqlExecutor class
- [ ] Implement connection string parsing to extract host, port, database, user, password
- [ ] Build pg_dump command arguments based on options
- [ ] Implement pg_dump execution using child_process.spawn
- [ ] Handle PGPASSWORD environment variable for authentication
- [ ] Implement proper error handling with detailed messages
- [ ] Add output file size calculation
- [ ] Ensure proper cleanup on error

### Phase 3: MCP Tool Integration

- [ ] Add `sql_backup` tool definition to `tool-definition.ts`
- [ ] Define input schema with all backup options
- [ ] Add backup case to tool handler in `tool-handler.ts`
- [ ] Validate input parameters
- [ ] Call SqlExecutor.backup() method
- [ ] Format response for MCP protocol

### Phase 4: CLI Command Implementation

- [ ] Add 'backup' command to CLI switch statement
- [ ] Parse command line arguments for backup options
- [ ] Add `--tables`, `--schemas`, `--format`, `--output` flags
- [ ] Add `--data-only` and `--schema-only` flags
- [ ] Add `--compress` flag
- [ ] Implement progress indicator for long operations
- [ ] Display backup result summary

### Phase 5: Error Handling & Validation

- [ ] Check if pg_dump is available in PATH
- [ ] Validate output path is writable
- [ ] Handle special characters in database/table names
- [ ] Prevent directory traversal in output paths
- [ ] Add proper error messages for common failures
- [ ] Handle connection failures gracefully
- [ ] Validate mutually exclusive options (data-only vs schema-only)

### Phase 6: Advanced Features

- [ ] Support verbose mode with pg_dump progress
- [ ] Add backup file naming with timestamps
- [ ] Implement backup compression for plain format
- [ ] Support custom pg_dump options passthrough
- [ ] Add backup size estimation before starting
- [ ] Handle large database streaming properly

### Phase 7: Testing

- [ ] Add unit tests for BackupOptions validation
- [ ] Add unit tests for connection string parsing
- [ ] Add unit tests for pg_dump argument building
- [ ] Create mock for child_process.spawn in tests
- [ ] Add integration test for actual pg_dump execution
- [ ] Add E2E test for MCP tool invocation
- [ ] Add E2E test for CLI command
- [ ] Test error scenarios (missing pg_dump, bad connection, etc.)

### Phase 8: Documentation

- [ ] Update README with backup command examples
- [ ] Add backup section to EXAMPLES.md
- [ ] Document all backup options and formats
- [ ] Add troubleshooting section for common issues
- [ ] Update MCP.md with sql_backup tool documentation
- [ ] Add backup best practices guide

### Phase 9: Final Polish

- [ ] Code review and refactoring
- [ ] Performance optimization for large databases
- [ ] Security audit (credential handling, path validation)
- [ ] Update package version
- [ ] Update CHANGELOG.md
- [ ] Final testing pass