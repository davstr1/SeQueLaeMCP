# Action Plan: Fix Remaining Test Failures

## Objective
Fix the 7 remaining test failures to achieve 100% test pass rate.

## Tasks

### 1. Fix edge-cases.test.ts TypeScript Compilation Error
- [ ] Read edge-cases.test.ts to understand all test cases
- [ ] Check QueryResult type definition from pg module
- [ ] Update test assertions to use correct QueryResult properties:
  - [ ] Change `result.success` to check result existence
  - [ ] Change `result.rowCount` to `result.rowCount`
  - [ ] Change `result.rows` to `result.rows`
  - [ ] Remove any other references to wrapped result properties
- [ ] Ensure all TypeScript errors are resolved

### 2. Fix cli-schema.test.ts Test Failures
- [ ] Read the current schema command implementation in cli.ts
- [ ] Remove all references to `mockExecutor.getSchema`
- [ ] Update test to check for direct SQL query execution:
  - [ ] Mock `executeQuery` to return schema query results
  - [ ] Update test assertions to check console output format
  - [ ] Ensure table parsing and display logic is tested
- [ ] Fix "show full schema in text mode" test
- [ ] Fix "show specific tables schema" test
- [ ] Fix "show schema in JSON mode" test
- [ ] Fix "include system tables with --all flag" test
- [ ] Fix "handle non-existent table" test
- [ ] Fix "handle schema retrieval error" test
- [ ] Fix "parse table list with spaces" test

### 3. Verify All Tests Pass
- [ ] Run full test suite to confirm all 264 tests pass
- [ ] Check for any new TypeScript compilation errors
- [ ] Ensure no regression in previously fixed tests

### 4. Commit Final Fixes
- [ ] Stage all changes
- [ ] Commit with message: "fix: resolve remaining test failures for schema and edge cases"
- [ ] Push changes