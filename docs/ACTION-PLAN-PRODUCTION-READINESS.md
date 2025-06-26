# Action Plan - Production Readiness for sequelae-mcp

## Phase 1: Quick Wins (1-2 hours)

### 1. Fix Coverage Directory Issue
- [ ] Add `/coverage/` to `.gitignore`
- [ ] Remove coverage directory from git tracking
- [ ] Commit changes

### 2. Fix TypeScript "any" Warnings
- [ ] Review the 20 ESLint warnings about `any` types
- [ ] Replace `any` with proper types in src/cli.ts
- [ ] Run `npm run lint` to verify fixes
- [ ] Commit type improvements

## Phase 2: Critical Test Coverage (4-6 hours)

### 3. Improve CLI Test Coverage (Current: 34%)
- [ ] Create test file for CLI help command
  - [ ] Test text mode output format
  - [ ] Test JSON mode output format
  - [ ] Test all help sections appear
- [ ] Create tests for CLI exec command
  - [ ] Test successful query execution
  - [ ] Test query with syntax error
  - [ ] Test query with empty results
  - [ ] Test JSON output mode
- [ ] Create tests for CLI schema command
  - [ ] Test full schema output
  - [ ] Test specific table filtering
  - [ ] Test non-existent table handling
- [ ] Create tests for CLI file command
  - [ ] Test reading valid SQL file
  - [ ] Test non-existent file error
  - [ ] Test empty file handling
- [ ] Run coverage and verify >70% for CLI module

### 4. Add Security Tests
- [ ] Create security test suite
  - [ ] Test SQL injection attempts in exec command
  - [ ] Test path traversal in file command
  - [ ] Test malformed input handling
  - [ ] Test extremely long query handling
- [ ] Verify all tests pass

### 5. Add Edge Case Tests
- [ ] Test large result sets (1000+ rows)
  - [ ] Create test with mock large dataset
  - [ ] Verify memory usage stays reasonable
  - [ ] Test output truncation if needed
- [ ] Test concurrent executions
  - [ ] Run multiple queries in parallel
  - [ ] Verify no connection conflicts
- [ ] Test timeout scenarios
  - [ ] Mock slow query
  - [ ] Verify timeout error handling
- [ ] Test connection failures
  - [ ] Test invalid connection string
  - [ ] Test network timeout
  - [ ] Test auth failures

## Phase 3: Production Features (3-4 hours)

### 6. Implement Query Timeout Configuration
- [ ] Add `--timeout` CLI flag
- [ ] Add `QUERY_TIMEOUT` environment variable
- [ ] Update SqlExecutor to use statement_timeout
- [ ] Add timeout parameter to MCP tools
- [ ] Test timeout functionality
- [ ] Update README with timeout docs

### 7. Add Connection Pooling
- [ ] Research pg.Pool implementation
- [ ] Create connection pool manager
- [ ] Update SqlExecutor to use pool
- [ ] Add pool configuration options
  - [ ] Max connections
  - [ ] Idle timeout
  - [ ] Connection timeout
- [ ] Test pool behavior
- [ ] Update documentation

### 8. Implement Structured Logging
- [ ] Choose logging library (winston vs pino)
- [ ] Create logger module
- [ ] Replace all console.log statements
- [ ] Add log levels (debug, info, warn, error)
- [ ] Add JSON log format option
- [ ] Test logging output
- [ ] Document logging configuration

## Phase 4: Documentation & Operations (2-3 hours)

### 9. Create Production Deployment Guide
- [ ] Write deployment prerequisites
- [ ] Add environment variable reference
- [ ] Create systemd service example
- [ ] Add Docker deployment option
- [ ] Include security best practices
- [ ] Add monitoring recommendations

### 10. Add Troubleshooting Section to README
- [ ] Common connection errors
- [ ] SSL/TLS configuration issues
- [ ] Permission problems
- [ ] Performance troubleshooting
- [ ] Debug mode instructions

### 11. Create CI/CD Pipeline
- [ ] Set up GitHub Actions workflow
  - [ ] Run tests on PR
  - [ ] Check lint and format
  - [ ] Generate coverage report
  - [ ] Run on multiple Node versions
- [ ] Add build status badge to README

## Phase 5: Nice-to-Have Enhancements (Optional)

### 12. Add Health Check for MCP Mode
- [ ] Implement health check tool in MCP
- [ ] Add database connectivity check
- [ ] Return version information
- [ ] Document health check usage

### 13. Implement Rate Limiting
- [ ] Add rate limiter for MCP mode
- [ ] Configure limits per tool
- [ ] Add rate limit headers
- [ ] Document rate limits

### 14. Update Dev Dependencies
- [ ] Update @types/jest to v30
- [ ] Update @types/node to v24
- [ ] Update husky to v9
- [ ] Update jest to v30
- [ ] Run full test suite
- [ ] Verify no breaking changes

## Completion Checklist
- [ ] All Phase 1 items complete
- [ ] All Phase 2 items complete
- [ ] All Phase 3 items complete
- [ ] All Phase 4 items complete
- [ ] Test coverage > 80%
- [ ] All tests passing
- [ ] No lint warnings
- [ ] Documentation updated
- [ ] Deployed to test environment
- [ ] Performance benchmarks run

## Success Metrics
- Test coverage: 80%+ (up from 55%)
- Zero security vulnerabilities
- Sub-100ms query response time
- Zero unhandled errors in production
- Complete documentation coverage