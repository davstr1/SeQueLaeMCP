# Action Plan: Production Readiness - sequelae-mcp

## Priority: CRITICAL (Must Fix Before Production)

### 1. Update Node.js Version Support ⚠️ CRITICAL
- [ ] Open package.json
- [ ] Change `"node": ">=14.0.0"` to `"node": ">=18.0.0"`
- [ ] Open .github/workflows/test.yml
- [ ] Remove Node 14.x from test matrix
- [ ] Keep Node 16.x, 18.x, 20.x in test matrix
- [ ] Commit with message: "Update minimum Node.js version to 18.x LTS"

### 2. Fix Repository URLs in package.json
- [ ] Open package.json
- [ ] Update `"url": "https://github.com/yourusername/sequelae-mcp.git"` to correct GitHub URL
- [ ] Update `"homepage": "https://github.com/yourusername/sequelae-mcp#readme"` to correct URL
- [ ] Update `"bugs.url": "https://github.com/yourusername/sequelae-mcp/issues"` to correct URL
- [ ] Verify all three URLs are consistent and correct
- [ ] Commit with message: "Fix repository URLs in package.json"

### 3. Update Outdated Dev Dependencies
- [ ] Run `npm update @types/jest@latest`
- [ ] Run `npm update @types/node@latest`
- [ ] Run `npm update husky@latest`
- [ ] Run `npm update jest@latest`
- [ ] Run `npm test` to ensure tests still pass
- [ ] Run `npm run build` to ensure build still works
- [ ] Commit with message: "Update outdated dev dependencies"

### 4. Add Connection Retry Logic
- [ ] Open src/utils/pool-manager.ts
- [ ] Create new method `connectWithRetry` with exponential backoff
- [ ] Add retry configuration constants (MAX_RETRIES = 3, INITIAL_DELAY = 1000)
- [ ] Implement exponential backoff logic (delay * Math.pow(2, attempt))
- [ ] Update `getClient()` method to use `connectWithRetry`
- [ ] Add logging for retry attempts
- [ ] Write unit test for retry logic in tests/unit.test.ts
- [ ] Test with simulated connection failures
- [ ] Commit with message: "Add connection retry logic with exponential backoff"

## Priority: HIGH (Nice to Have)

### 5. Improve Test Coverage for sql-executor.ts
- [ ] Open tests/unit.test.ts
- [ ] Add test for successful query execution
- [ ] Add test for query with parameters
- [ ] Add test for transaction rollback on error
- [ ] Add test for timeout handling
- [ ] Add test for large result set handling
- [ ] Run coverage report to verify improvement
- [ ] Commit with message: "Add tests for sql-executor.ts"

### 6. Improve Test Coverage for pool-manager.ts
- [ ] Add test for pool initialization
- [ ] Add test for client acquisition and release
- [ ] Add test for concurrent client requests
- [ ] Add test for pool exhaustion scenario
- [ ] Add test for pool cleanup on shutdown
- [ ] Run coverage report to verify improvement
- [ ] Commit with message: "Add tests for pool-manager.ts"

### 7. Add Backup Functionality Tests
- [ ] Create mock for pg_dump execution
- [ ] Add test for successful backup creation
- [ ] Add test for backup with specific tables
- [ ] Add test for backup format options
- [ ] Add test for backup failure handling
- [ ] Add test for output path validation
- [ ] Commit with message: "Add tests for backup functionality"

### 8. Add Performance Benchmarks to README
- [ ] Open README.md
- [ ] Find appropriate section (after "Why This Exists")
- [ ] Add "## Performance" section
- [ ] Copy key benchmarks from performance documentation
- [ ] Include query performance metrics
- [ ] Include connection pool efficiency
- [ ] Include memory usage stats
- [ ] Commit with message: "Add performance benchmarks to README"

### 9. Add Advanced Configuration Examples
- [ ] Open README.md
- [ ] Add section "## Advanced Configuration"
- [ ] Add example for connection pooling configuration
- [ ] Add example for custom rate limiting per tool
- [ ] Add example for SSL certificate configuration
- [ ] Add example for environment-specific configs
- [ ] Commit with message: "Add advanced configuration examples to README"

### 10. Fix TypeScript 'any' Warnings in Tests
- [ ] Run `npx tsc --noEmit --strict` to list all warnings
- [ ] Open test files with warnings
- [ ] Add proper types for test data structures
- [ ] Add types for mock objects
- [ ] Add types for assertion helpers
- [ ] Run type check again to verify fixes
- [ ] Commit with message: "Fix TypeScript any warnings in tests"

## Priority: LOW (Optional Enhancements)

### 11. Add Stress/Load Tests
- [ ] Create new file tests/stress.test.ts
- [ ] Add test for 100 concurrent connections
- [ ] Add test for 1000 rapid queries
- [ ] Add test for memory usage under load
- [ ] Add test for connection pool recovery
- [ ] Add npm script for stress tests (separate from regular tests)
- [ ] Document stress test requirements in README
- [ ] Commit with message: "Add stress and load tests"

### 12. Standardize Error Response Format
- [ ] Create src/utils/error-formatter.ts
- [ ] Define consistent error response interface
- [ ] Add error code enum
- [ ] Update CLI error handling to use formatter
- [ ] Update MCP error handling to use formatter
- [ ] Add tests for error formatter
- [ ] Commit with message: "Standardize error response format"

## Completion Checklist
- [ ] All CRITICAL items completed
- [ ] Tests passing after all changes
- [ ] Build successful with no errors
- [ ] Linting passes with no errors
- [ ] Documentation updated where needed
- [ ] Final commit: "Complete production readiness improvements"

## Time Estimates
- CRITICAL tasks: ~45 minutes
- HIGH priority tasks: ~60 minutes
- LOW priority tasks: ~45 minutes
- Total: ~2.5 hours (can do CRITICAL only in <1 hour)