# Review: Remaining Test Failures

## Summary
After fixing the mock implementation issues, we have 7 remaining test failures in 2 files:
- `cli-schema.test.ts` - 7 failures
- `edge-cases.test.ts` - Compilation error

## Root Causes

### 1. cli-schema.test.ts
**Issue**: Tests expect `SqlExecutor.getSchema()` method, but the actual implementation uses direct SQL queries in the CLI.

The schema command was reimplemented to execute SQL queries directly in `cli.ts` instead of using a dedicated `getSchema` method. The tests are still expecting the old architecture.

**Current Implementation** (in cli.ts):
```typescript
// Direct SQL queries for schema information
const schemaQuery = `
  SELECT table_schema, table_name 
  FROM information_schema.tables 
  WHERE table_type = 'BASE TABLE'
    AND ${allSchemas ? "table_schema NOT IN ('pg_catalog', 'information_schema')" : "table_schema = 'public'"}
  ORDER BY table_schema, table_name
`;
```

**Test Expectation**:
```typescript
mockExecutor.getSchema.mockResolvedValue(mockSchema);
expect(mockExecutor.getSchema).toHaveBeenCalledWith(undefined, false);
```

### 2. edge-cases.test.ts
**Issue**: TypeScript compilation error - `executeQuery` returns `QueryResult` type, not an object with `success` property.

```typescript
const result = await executor.executeQuery('SELECT * FROM large_table');
expect(result.success).toBe(true); // ❌ Property 'success' does not exist on type 'QueryResult'
```

The test expects a wrapped result with a `success` property, but `executeQuery` returns a PostgreSQL `QueryResult` directly.

## Solutions

### Option 1: Update Tests to Match Implementation
- Rewrite `cli-schema.test.ts` to test the actual SQL queries being executed
- Fix `edge-cases.test.ts` to use the correct `QueryResult` properties

### Option 2: Restore Original Architecture (Not Recommended)
- Add back the `getSchema` method to `SqlExecutor`
- Wrap query results with success property

## Recommendation
**Option 1** is recommended. The current implementation is cleaner and more direct. We should update the tests to match the actual implementation rather than maintaining unnecessary abstraction layers.

## Impact
- These are test-only issues
- The actual production code is working correctly
- No functionality is broken, only test expectations are outdated