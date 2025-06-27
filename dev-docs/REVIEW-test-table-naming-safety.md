# Review: Test Table Naming Safety

## Issue
Test tables currently use names that could be mistaken for real application tables (e.g., `users`, `posts`), creating potential for accidental data loss if tests are run against production databases.

## Current State

### Actual Test Tables (Good - Already Suffixed)
- `users_e2e_test_sequelae`
- `posts_e2e_test_sequelae` 
- `jsonb_e2e_test_sequelae`
- `jsonb_schema_test_sequelae`
- `empty_jsonb_e2e_test_sequelae`

### Problematic References in Test Code
1. **unit.test.ts:412** - Example SQL uses `CREATE TABLE users`
2. **unit.test.ts:618** - Test case uses `CREATE TABLE users (id INT)`
3. **cli-help.test.ts:24** - Help text example shows `CREATE TABLE posts`

## Risk Assessment
- **Low Risk**: Actual test tables already have suffixes (`_test_sequelae`)
- **Medium Risk**: Example SQL in tests uses common table names without prefixes
- **Mitigation**: Tests use conditional execution (skip if no DATABASE_URL)

## Recommendations

### 1. Standardize Test Table Prefix (MVP Priority)
- Change all test tables to use prefix: `TEST_SQLMCP_`
- Examples:
  - `TEST_SQLMCP_users_e2e`
  - `TEST_SQLMCP_posts_e2e`
  - `TEST_SQLMCP_jsonb_schema`

### 2. Update Example SQL in Tests
- Replace `CREATE TABLE users` with `CREATE TABLE TEST_SQLMCP_users`
- Replace `CREATE TABLE posts` with `CREATE TABLE TEST_SQLMCP_posts`

### 3. Add Safety Check Function
```typescript
function ensureTestTableName(tableName: string): void {
  if (!tableName.startsWith('TEST_SQLMCP_')) {
    throw new Error(`Test table must start with TEST_SQLMCP_ prefix: ${tableName}`);
  }
}
```

## Action Items
- [ ] Update all test table constants to use `TEST_SQLMCP_` prefix
- [ ] Update example SQL in unit tests
- [ ] Update help text examples
- [ ] Add table name validation in test setup
- [ ] Document test table naming convention in README

## Conclusion
While current test tables have some protection via suffixes, adopting a clear `TEST_SQLMCP_` prefix would make it immediately obvious these are test tables and reduce any risk of confusion with production data.