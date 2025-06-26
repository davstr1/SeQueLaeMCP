# Product Name Change Review: sql-agent-cli → sequelae-mcp

## Overview
This review identifies all locations where the product name needs to be updated from "sql-agent-cli" to "sequelae-mcp" throughout the codebase.

## Current State Analysis

### Primary Product References
- **Current Name**: sql-agent-cli
- **New Name**: sequelae-mcp
- **Binary Names**: sql-agent, ssql (consider: sequelae, smcp)

### Actionable Checklist

#### Package Configuration
- [ ] Update `package.json` name field from "sql-agent-cli" to "sequelae-mcp"
- [ ] Update binary entries in `package.json`:
  - [ ] Change "sql-agent" to "sequelae" or keep as-is
  - [ ] Change "ssql" to "smcp" or another short alias
- [ ] Update npm package name in installation instructions

#### Binary Files
- [ ] Rename `/bin/sql-agent` to match new binary name
- [ ] Update shebang and references inside the binary file if needed

#### Documentation Updates
- [ ] Update README.md:
  - [ ] Change title from "# sql-agent-cli" to "# sequelae-mcp"
  - [ ] Update all npm install commands
  - [ ] Update all command examples (sql-agent → new binary name)
  - [ ] Update package description if needed
- [ ] Update EXAMPLES.md:
  - [ ] Replace all command line examples
  - [ ] Update any package references
- [ ] Update MCP.md:
  - [ ] Replace tool name references
  - [ ] Update any command examples

#### Code References
- [ ] Search and update any hardcoded references to "sql-agent-cli" in source files
- [ ] Update any error messages or logs that mention the product name
- [ ] Check for any API endpoints or service names that include the old name

#### Additional Considerations
- [ ] Update CLAUDE.md to remove unrelated project references (Gigarad, tuneb)
- [ ] Consider if directory name "sequelaemcp" should be renamed to "sequelae-mcp"
- [ ] Update any GitHub repository name/description if applicable
- [ ] Update any CI/CD configurations that reference the old name
- [ ] Update Docker configurations if they reference the product name

#### Testing After Changes
- [ ] Verify npm install works with new package name
- [ ] Test that binary commands execute properly
- [ ] Ensure all examples in documentation still work
- [ ] Check that all tests pass (if any exist)

## Priority Order
1. Package.json and binary files (core functionality)
2. Documentation (user-facing)
3. Code references (internal)
4. Clean up unrelated references in CLAUDE.md

## Notes
- The current CLAUDE.md contains references to "Gigarad" and "tuneb" which appear to be from a different project and should be cleaned up
- Consider keeping binary names simple and memorable
- Ensure backward compatibility or provide migration guide if this is already published