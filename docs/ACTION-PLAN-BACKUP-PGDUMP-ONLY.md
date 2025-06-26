# Action Plan: Database Backup Feature (pg_dump Only)

## Implementation of backup feature using strictly pg_dump - no fallback methods

### Phase 1: Core Types and Interfaces

- [x] Create `src/types/backup.ts` file
- [x] Define `BackupOptions` interface with format, tables, schemas, dataOnly, schemaOnly, compress, outputPath
- [x] Define `BackupResult` interface with success, outputPath, size, duration, error fields
- [x] Export types from main index.ts

### Phase 2: Core Backup Implementation

- [x] Add `backup(options: BackupOptions): Promise<BackupResult>` method to SqlExecutor class
- [x] Implement connection string parsing to extract host, port, database, user, password
- [x] Build pg_dump command arguments based on options
- [x] Implement pg_dump execution using child_process.spawn
- [x] Handle PGPASSWORD environment variable for authentication
- [x] Implement proper error handling with detailed messages
- [x] Add output file size calculation
- [x] Ensure proper cleanup on error

### Phase 3: MCP Tool Integration

- [x] Add `sql_backup` tool definition to `tool-definition.ts`
- [x] Define input schema with all backup options
- [x] Add backup case to tool handler in `tool-handler.ts`
- [x] Validate input parameters
- [x] Call SqlExecutor.backup() method
- [x] Format response for MCP protocol

### Phase 4: CLI Command Implementation

- [x] Add 'backup' command to CLI switch statement
- [x] Parse command line arguments for backup options
- [x] Add `--tables`, `--schemas`, `--format`, `--output` flags
- [x] Add `--data-only` and `--schema-only` flags
- [x] Add `--compress` flag
- [x] Implement progress indicator for long operations
- [x] Display backup result summary

### Phase 5: Error Handling & Validation

- [x] Check if pg_dump is available in PATH
- [x] Validate output path is writable
- [x] Handle special characters in database/table names
- [x] Prevent directory traversal in output paths
- [x] Add proper error messages for common failures
- [x] Handle connection failures gracefully
- [x] Validate mutually exclusive options (data-only vs schema-only)

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