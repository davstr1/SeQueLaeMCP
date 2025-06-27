# Review: Extending Test Coverage

## Current Coverage Status
- **Overall**: 73.93% statements, 64.48% branches
- **Target**: 85%+ coverage with meaningful tests

## Key Areas Needing Coverage

### 1. CLI Error Handling Paths (cli.ts - 60.72% coverage)

#### Missing File Path Error Handling
- **Lines 461-471**: Error when no file path provided
- **Lines 475-485**: File not found error handling
- **Value**: Tests prevent users seeing cryptic errors when files missing

#### Backup Command
- **Lines 679-752**: Entire backup command flow untested
- **Value**: Critical feature for data safety - needs integration tests
- **Test Ideas**:
  - Mock pg_dump execution
  - Test various backup options (--format, --tables, --compress)
  - Test backup failure scenarios
  - Verify output file creation

#### Direct SQL Command Recognition
- **Lines 671-678**: SQL keyword detection for direct commands
- **Value**: Tests ensure "SELECT * FROM users" works without "exec" prefix

### 2. SQL Executor Gaps (sql-executor.ts - 69.23% coverage)

#### Backup Implementation
- **Lines 480-539**: pg_dump execution and error handling
- **Test Ideas**:
  - Mock spawn() to simulate pg_dump success/failure
  - Test ENOENT error (pg_dump not installed)
  - Test file permission errors
  - Verify environment variable passing (PGPASSWORD)

#### Transaction Rollback
- **Lines 431-448**: Error handling during transactions
- **Value**: Ensures data integrity on errors

### 3. MCP Tool Handler (tool-handler.ts - 77.29% coverage)

#### Table Formatting
- **Lines 217-232**: Text table formatting for non-JSON output
- **Test Ideas**:
  - Test with various data types (nulls, strings, numbers)
  - Test empty result sets
  - Test wide columns and special characters

#### Backup Tool
- **Lines 325-382**: MCP backup tool implementation
- **Value**: AI agents need reliable backup capabilities

### 4. Logger Edge Cases (logger.ts - 72.91% coverage)

#### Disabled Logging
- **Lines 43-47**: When logger is disabled
- **Lines 83-89**: Error logging when disabled
- **Test Ideas**:
  - Create logger with enabled: false
  - Verify no output when disabled

#### Structured Logging
- **Lines 113-131**: JSON structured logging format
- **Value**: Important for production log aggregation

### 5. JSONB Analyzer (jsonb-analyzer.ts - 88.88% coverage)

#### formatJsonStructure Helper
- **Lines 20-31**: Internal formatting function
- **Test Ideas**:
  - Test recursive formatting with deep nesting
  - Test array type formatting

## High-Value Test Additions

### 1. Unit Tests for Backup (No DB Required)
```typescript
// In tests/backup.test.ts (UNIT TEST - runs in CI)
describe('Backup Command', () => {
  test('should create backup with pg_dump', async () => {
    // Mock spawn to simulate pg_dump - NO REAL DB CONNECTION
    const mockSpawn = jest.spyOn(child_process, 'spawn');
    mockSpawn.mockImplementation(() => {
      // Simulate successful pg_dump execution
      const proc = new EventEmitter() as any;
      proc.stderr = new EventEmitter();
      setTimeout(() => proc.emit('close', 0), 100);
      return proc;
    });
    // Test backup creation without real database
  });
});
```

### 2. Error Recovery Tests
```typescript
describe('Transaction Error Recovery', () => {
  test('should rollback on query error', async () => {
    // Test transaction rollback behavior
  });
});
```

### 3. CLI Direct SQL Tests
```typescript
// In tests/cli-behavior.test.ts (UNIT TEST with mocked DB)
describe('Direct SQL Commands', () => {
  test('should recognize SELECT without exec prefix', async () => {
    // Mock DATABASE_URL to avoid real connection
    process.env.DATABASE_URL = 'postgresql://mock:mock@localhost:5432/mock';
    const result = await execSequelae(['SELECT', '1']);
    expect(result.code).toBe(0);
  });
});
```

### 4. File Permission Tests
```typescript
describe('File Operations', () => {
  test('should handle read-only directories', async () => {
    // Test backup to read-only location
  });
});
```

## Testing Strategy

### 1. Mock External Dependencies
- Mock `child_process.spawn` for pg_dump tests
- Mock file system for permission tests
- Mock database connections for error scenarios

### 2. Test Real User Scenarios
- User forgets to install pg_dump
- Database connection drops mid-query
- Disk full during backup
- Invalid SQL syntax
- Network timeouts

### 3. Integration Test Isolation
**CRITICAL**: Integration tests requiring real database connections must:
- Be placed in separate test files (e.g., `*.integration.test.ts`)
- Be excluded from CI runs (`npm run test:ci` only runs unit tests)
- Only run locally with `npm run test:integration`
- Never run in GitHub Actions or npm publish workflows
- Use the `describeWithDb` helper from test-utils.ts

### 4. Parameterized Tests
```typescript
test.each([
  ['plain', '--format plain'],
  ['custom', '--format custom'],
  ['directory', '--format directory'],
])('backup format %s', async (format, flag) => {
  // Test each backup format
});
```

## Test Organization

### Unit Tests (Run in CI)
- Place in: `tests/*.test.ts` (excluding `*.integration.test.ts`)
- Mock all external dependencies
- No real database connections
- Run with: `npm run test:unit` or `npm run test:ci`

### Integration Tests (Local Only)
- Place in: `tests/*.integration.test.ts`
- Require real PostgreSQL database
- Use `describeWithDb` helper
- Run with: `npm run test:integration`
- **NEVER run in GitHub Actions**

## Recommended Test Priority

1. **Backup functionality** - Critical for data safety (mock pg_dump in unit tests)
2. **Error handling paths** - Improves user experience  
3. **Transaction rollback** - Ensures data integrity (mock in unit tests)
4. **Direct SQL commands** - Common usage pattern
5. **MCP tool responses** - AI agent integration

## Anti-Patterns to Avoid

- ❌ Testing implementation details (private methods)
- ❌ Testing mock behavior instead of real behavior
- ❌ 100% coverage for coverage's sake
- ❌ Brittle tests that break on refactoring

## Good Patterns to Follow

- ✅ Test user-facing behavior
- ✅ Test error messages users will see
- ✅ Test integration points (pg_dump, file system)
- ✅ Use test doubles only when necessary
- ✅ Focus on high-risk code paths

## Next Steps

1. Create backup integration tests with mocked pg_dump
2. Add transaction rollback tests
3. Test CLI error paths comprehensively
4. Add parameterized tests for formats/options
5. Create file permission edge case tests