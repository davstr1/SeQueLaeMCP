# Action Plan: Fix CI TypeScript Errors

## Objective
Fix CI test failures caused by TypeScript `any` warnings being treated as errors.

## Step-by-Step Action Plan

### Phase 1: Fix Test File Type Issues

#### cli-schema.test.ts
- [ ] Open `tests/cli-schema.test.ts`
- [ ] Navigate to line 40
- [ ] Identify the `any` type usage
- [ ] Replace with proper type (likely error object or jest mock type)
- [ ] Run `npm test tests/cli-schema.test.ts` to verify

#### cli-file.test.ts
- [ ] Open `tests/cli-file.test.ts`
- [ ] Navigate to line 45
- [ ] Fix the first `any` type
- [ ] Navigate to line 47
- [ ] Fix the second `any` type
- [ ] Run `npm test tests/cli-file.test.ts` to verify

#### cli-exec.test.ts
- [ ] Open `tests/cli-exec.test.ts`
- [ ] Navigate to line 40
- [ ] Fix the first `any` type
- [ ] Navigate to line 42
- [ ] Fix the second `any` type
- [ ] Run `npm test tests/cli-exec.test.ts` to verify

#### backup-basic.test.ts
- [ ] Open `tests/backup-basic.test.ts`
- [ ] Navigate to line 26
- [ ] Fix the `any` type
- [ ] Run `npm test tests/backup-basic.test.ts` to verify

### Phase 2: Fix Source File Type Issues

#### cli.ts
- [ ] Open `src/cli.ts`
- [ ] Navigate to line 40
- [ ] Fix the first `any` type (probably error handling)
- [ ] Navigate to line 44
- [ ] Fix the second `any` type
- [ ] Run `npm run build` to verify compilation

#### tool-handler.ts
- [ ] Open `src/mcp/tool-handler.ts`
- [ ] Navigate to line 368
- [ ] Fix the first `any` type (likely response or error object)
- [ ] Navigate to line 406
- [ ] Fix the second `any` type
- [ ] Run `npm run build` to verify compilation

### Phase 3: Verify All Fixes

#### Local Verification
- [ ] Run `npm run lint` to check all lint issues are resolved
- [ ] Run `npm test` to ensure all tests still pass
- [ ] Run `npm run build` to ensure TypeScript compilation succeeds

#### Type Safety Checks
- [ ] Review all changed types to ensure they're specific and accurate
- [ ] Ensure no `any` types remain in the flagged locations
- [ ] Verify error objects have proper type definitions

### Phase 4: Push and Monitor CI

#### Git Operations
- [ ] Stage all changes with `git add -A`
- [ ] Commit with message: "fix: resolve TypeScript any warnings causing CI failures"
- [ ] Push to trigger CI: `git push`

#### CI Monitoring
- [ ] Open GitHub Actions page
- [ ] Monitor the CI run progress
- [ ] Verify all checks pass (lint, test, build)
- [ ] Confirm exit code is 0 for all jobs

### Phase 5: Address Secrets Issue (Optional)

#### Investigate Missing Secrets
- [ ] Check GitHub repository settings → Secrets and variables → Actions
- [ ] Verify `CODECOV_TOKEN` exists and is spelled correctly
- [ ] Verify `NODE_AUTH_TOKEN` exists and is spelled correctly
- [ ] Check if secrets are repository-level (not environment-specific)
- [ ] Ensure no branch protection rules block secret access

## Success Criteria
- ✅ All TypeScript `any` warnings resolved
- ✅ CI pipeline passes without errors
- ✅ All tests continue to pass
- ✅ Type safety maintained throughout codebase
- ✅ No regression in functionality

## Rollback Plan
If issues arise:
- [ ] Revert commit with `git revert HEAD`
- [ ] Apply quick fix: Add `--max-warnings 100` to lint command in package.json
- [ ] Push to restore CI functionality
- [ ] Revisit type fixes with more time