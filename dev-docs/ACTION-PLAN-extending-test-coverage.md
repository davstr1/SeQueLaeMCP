# Action Plan: Extending Test Coverage

Based on: `/Users/imac1/Documents/code2024/sequelaemcp/dev-docs/REVIEW-extending-test-coverage.md`

## 🚨 CRITICAL: Test Isolation Strategy

### Database Tests MUST Be Isolated
- **NEVER** run database tests in CI/GitHub Actions
- **ALWAYS** use `.integration.test.ts` suffix for database tests
- **ALWAYS** use `describeWithDb` helper from `test-utils.ts`
- **NEVER** mix unit tests and integration tests in same file

### File Naming Convention
- `*.test.ts` - Unit tests (run in CI)
- `*.integration.test.ts` - Database tests (local only)
- CI automatically excludes `*.integration.test.ts` files

## Phase 1: Unit Tests for Backup Functionality

### 1.1 Create backup unit test file
- [ ] Create `tests/backup.test.ts` for unit tests (**NOT** backup.integration.test.ts)
- [ ] Import necessary mocking utilities from Jest
- [ ] Set up test structure with proper describe blocks
- [ ] **NO DATABASE CONNECTION** - mock everything

### 1.2 Mock child_process.spawn for pg_dump
- [ ] Create mock implementation of spawn
- [ ] Mock successful pg_dump execution
- [ ] Mock stderr and stdout streams
- [ ] Mock process exit codes

### 1.3 Test backup command parsing
- [ ] Test `--format` option parsing (plain, custom, directory, tar)
- [ ] Test `--tables` option with comma-separated values
- [ ] Test `--schemas` option parsing
- [ ] Test `--output` path resolution
- [ ] Test `--data-only` flag
- [ ] Test `--schema-only` flag
- [ ] Test `--compress` flag

### 1.4 Test backup error scenarios
- [ ] Test pg_dump not found (ENOENT error)
- [ ] Test pg_dump failure (non-zero exit code)
- [ ] Test output directory not writable
- [ ] Test invalid format option
- [ ] Test conflicting options (data-only + schema-only)

### 1.5 Test backup success scenarios
- [ ] Test successful backup creation
- [ ] Test file size calculation
- [ ] Test duration tracking
- [ ] Test JSON output mode
- [ ] Test text output mode with progress messages

## Phase 2: CLI Error Handling Coverage

### 2.1 Create CLI behavior tests
- [ ] Add tests to `tests/cli-behavior.test.ts`
- [ ] Mock DATABASE_URL for all tests
- [ ] Set up execSequelae helper if not present

### 2.2 Test file command errors
- [ ] Test missing file path error
- [ ] Test file not found error
- [ ] Test file read permission error
- [ ] Test empty file handling
- [ ] Test large file handling

### 2.3 Test direct SQL command recognition
- [ ] Test SELECT without exec prefix
- [ ] Test INSERT without exec prefix
- [ ] Test UPDATE without exec prefix
- [ ] Test DELETE without exec prefix
- [ ] Test CREATE without exec prefix
- [ ] Test DROP without exec prefix
- [ ] Test ALTER without exec prefix

### 2.4 Test unknown command handling
- [ ] Test completely unknown command
- [ ] Test command with typo (e.g., "selct" instead of "select")
- [ ] Test empty command
- [ ] Test command with special characters

## Phase 3: MCP Tool Handler Coverage

### 3.1 Create MCP formatting tests
- [ ] Add tests to `tests/mcp-tool-handler.test.ts`
- [ ] Set up mock query results

### 3.2 Test table formatting
- [ ] Test formatting with null values
- [ ] Test formatting with empty strings
- [ ] Test formatting with long strings
- [ ] Test formatting with special characters
- [ ] Test formatting with Unicode
- [ ] Test empty result set formatting
- [ ] Test single row formatting
- [ ] Test multiple rows formatting

### 3.3 Test MCP backup tool
- [ ] Test backup tool parameter validation
- [ ] Test backup tool execution
- [ ] Test backup tool error handling
- [ ] Test backup tool response formatting

## Phase 4: Transaction and Error Recovery

### 4.1 Create transaction tests
- [ ] Add to `tests/sql-executor.test.ts`
- [ ] Mock database client for transactions

### 4.2 Test transaction rollback
- [ ] Test rollback on query error
- [ ] Test rollback on connection loss
- [ ] Test rollback with multiple queries
- [ ] Test nested transaction handling

### 4.3 Test connection retry logic
- [ ] Test retry on connection failure
- [ ] Test max retry limit
- [ ] Test retry delay
- [ ] Test successful retry

## Phase 5: Logger and Utility Coverage

### 5.1 Test disabled logger
- [ ] Create logger with enabled: false
- [ ] Test all log methods when disabled
- [ ] Test structured logging when disabled

### 5.2 Test structured logging format
- [ ] Test JSON format with metadata
- [ ] Test timestamp formatting
- [ ] Test log levels
- [ ] Test error object logging

### 5.3 Test JSONB analyzer edge cases
- [ ] Test formatJsonStructure with deep nesting
- [ ] Test array type detection
- [ ] Test mixed type arrays
- [ ] Test circular reference handling

## Phase 6: Integration Test Updates (🚨 LOCAL ONLY - NEVER IN CI)

### 6.1 Update existing integration tests
- [ ] Rename any database test files to `*.integration.test.ts`
- [ ] Ensure all use `describeWithDb` helper
- [ ] Verify DATABASE_URL check at start
- [ ] Add skip message when no database
- [ ] **VERIFY** these files are in test:integration pattern
- [ ] **VERIFY** these files are NOT in test:unit pattern

### 6.2 Create new integration test files
- [ ] Create `tests/backup.integration.test.ts` (REAL pg_dump)
- [ ] Create `tests/transaction.integration.test.ts` (REAL database)
- [ ] Add real pg_dump execution tests (local only)
- [ ] Add real transaction rollback tests
- [ ] **MUST** use `describeWithDb` wrapper
- [ ] **MUST** check for DATABASE_URL

## Phase 7: Test Infrastructure

### 7.1 Update test scripts (🚨 CRITICAL FOR CI)
- [ ] Verify `test:unit` pattern EXCLUDES `*.integration.test.ts`
- [ ] Verify `test:integration` pattern INCLUDES ONLY `*.integration.test.ts`
- [ ] Verify `test:ci` = `test:unit` (NO DATABASE TESTS)
- [ ] Add `test:coverage:unit` script for unit test coverage only
- [ ] **TEST** by running `DATABASE_URL="" npm run test:ci` - should pass
- [ ] **TEST** GitHub Actions workflow uses `test:ci` NOT `test`

### 7.2 Create test utilities
- [ ] Create mock factory for spawn
- [ ] Create mock factory for database clients
- [ ] Create test data builders
- [ ] Create assertion helpers

## Phase 8: Documentation and CI

### 8.1 Update test documentation
- [ ] Document test organization strategy
- [ ] Document mocking approach
- [ ] Document how to run different test suites
- [ ] Add testing guide to README

### 8.2 Verify CI configuration (🚨 NO DATABASE IN CI)
- [ ] **AUDIT** `.github/workflows/ci.yml` - NO postgres service
- [ ] **AUDIT** `.github/workflows/test.yml` - NO postgres service  
- [ ] **VERIFY** workflows use `npm run test:ci` NOT `npm test`
- [ ] **VERIFY** no DATABASE_URL in CI environment
- [ ] Ensure coverage reports exclude integration tests
- [ ] Add coverage threshold checks
- [ ] Add coverage trend tracking

## Success Metrics

- [ ] Unit test coverage reaches 85%+ 
- [ ] All critical paths have tests
- [ ] Zero integration tests run in CI
- [ ] All tests are meaningful (not just coverage)
- [ ] Tests are maintainable and clear

## Notes

- **CRITICAL**: Integration tests with real DB connections are for LOCAL DEVELOPMENT ONLY
- Always mock external dependencies in unit tests
- Never require DATABASE_URL in unit tests
- Keep tests focused on behavior, not implementation
- Use descriptive test names that explain the scenario
- Group related tests in describe blocks

## Test File Checklist

Before creating ANY test file, ask:
1. Does this test need a real database? 
   - YES → Name it `*.integration.test.ts`
   - NO → Name it `*.test.ts`
2. Will this test run in CI?
   - YES → Must be `*.test.ts` with ALL mocks
   - NO → Must be `*.integration.test.ts`
3. Is DATABASE_URL required?
   - YES → Must use `describeWithDb` helper
   - NO → Regular `describe` is fine