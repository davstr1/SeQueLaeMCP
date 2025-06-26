# Action Plan - Production Readiness

Based on: `/dev-docs/REVIEW-PRODUCTION-READINESS-100.md`  
Created: 2025-06-26  
Priority: **CRITICAL** - Must complete Phase 1 before any production deployment

## Phase 1: Critical Fixes (1-2 days)

### 1. Fix Dangerous Error Handlers
- [ ] Open `src/cli.ts`
- [ ] Find lines 788-790 with empty error handlers
- [ ] Remove the empty handlers completely
- [ ] Add proper error logging instead
- [ ] Test that errors are now visible

### 2. Add Database Cleanup to All Exit Points
- [ ] Search for all `process.exit()` calls in `src/cli.ts`
- [ ] Create a `cleanup()` function that closes the pool
- [ ] Add cleanup before line 310 exit
- [ ] Add cleanup before line 317 exit
- [ ] Add cleanup before line 324 exit
- [ ] Add cleanup before line 331 exit
- [ ] Add cleanup before line 343 exit
- [ ] Add cleanup before line 361 exit
- [ ] Add cleanup before line 373 exit
- [ ] Add cleanup before line 386 exit
- [ ] Add cleanup before line 408 exit
- [ ] Add cleanup before line 569 exit
- [ ] Add cleanup before line 629 exit
- [ ] Add cleanup before line 641 exit
- [ ] Add cleanup before line 650 exit
- [ ] Add cleanup before line 662 exit
- [ ] Test each exit path works correctly

### 3. Fix Error Swallowing
- [ ] Find line 770-772 in `src/cli.ts`
- [ ] Replace empty catch with error logging
- [ ] Log the actual error for debugging
- [ ] Test that pool errors are logged

### 4. Implement Basic Transaction Support
- [ ] Add `BEGIN` before query execution
- [ ] Add `COMMIT` on success
- [ ] Add `ROLLBACK` on error
- [ ] Add `--no-transaction` flag to disable
- [ ] Update MCP tool to support transactions
- [ ] Test rollback works on errors

### 5. Add Connection Timeout
- [ ] Add timeout option to pg.Pool config
- [ ] Set default timeout to 30 seconds
- [ ] Add `--timeout` CLI flag
- [ ] Add timeout to MCP tool options
- [ ] Test timeout actually works

## Phase 2: Stability Improvements (2-3 days)

### 6. Increase Test Coverage
- [ ] Add tests for all error scenarios
- [ ] Add tests for connection failures
- [ ] Add tests for timeout handling
- [ ] Add tests for transaction rollback
- [ ] Add tests for all CLI commands
- [ ] Add tests for edge cases
- [ ] Achieve 80% coverage minimum

### 7. Add Proper Error Logging
- [ ] Create error logging module
- [ ] Add log levels (error, warn, info, debug)
- [ ] Log all database errors
- [ ] Log all connection issues
- [ ] Add `--log-level` flag
- [ ] Test logging works correctly

### 8. Implement Retry Logic
- [ ] Add retry wrapper for connections
- [ ] Add exponential backoff
- [ ] Add max retry attempts (default 3)
- [ ] Add `--retries` flag
- [ ] Test retry logic works

### 9. Add Graceful Shutdown
- [ ] Add SIGTERM handler
- [ ] Add SIGINT handler
- [ ] Close pool on shutdown
- [ ] Wait for active queries
- [ ] Add shutdown timeout
- [ ] Test graceful shutdown

## Phase 3: Production Hardening (3-5 days)

### 10. Add Monitoring/Observability
- [ ] Add metrics collection
- [ ] Track query duration
- [ ] Track error rates
- [ ] Track connection pool stats
- [ ] Add health check endpoint
- [ ] Export metrics format

### 11. Implement Rate Limiting
- [ ] Add query rate limiter
- [ ] Add concurrent query limit
- [ ] Add per-connection limits
- [ ] Add `--rate-limit` flag
- [ ] Test under load

### 12. Add Performance Tests
- [ ] Create performance test suite
- [ ] Test with 1000 queries
- [ ] Test with large result sets
- [ ] Test connection pool limits
- [ ] Benchmark vs direct psql
- [ ] Document performance limits

### 13. Security Hardening
- [ ] Sanitize all error messages
- [ ] Remove file paths from errors
- [ ] Hide connection details
- [ ] Add query size limits
- [ ] Add result size limits
- [ ] Security audit

### 14. Operational Documentation
- [ ] Create runbook for common issues
- [ ] Document monitoring setup
- [ ] Document backup procedures
- [ ] Document recovery steps
- [ ] Add troubleshooting guide
- [ ] Create deployment checklist

## Quick Wins (Can do anytime)

### 15. Update Dependencies
- [ ] Update @types/jest to v30
- [ ] Update @types/node to v24
- [ ] Update husky to v9
- [ ] Update jest to v30
- [ ] Run tests after updates

### 16. Improve Pre-commit Hooks
- [ ] Add test running to pre-commit
- [ ] Add build check to pre-commit
- [ ] Ensure hooks can't be skipped
- [ ] Test hooks work correctly

## Success Criteria

- [ ] All Phase 1 items complete
- [ ] No critical issues in error handling
- [ ] Test coverage > 80%
- [ ] All connections properly cleaned up
- [ ] Production deployment checklist ready
- [ ] Monitoring in place
- [ ] Zero npm audit vulnerabilities

## Notes

- Complete Phase 1 before ANY production use
- Phase 2 recommended for staging environments
- Phase 3 required for high-traffic production
- Keep this plan updated as work progresses
- Each checkbox should be a single commit