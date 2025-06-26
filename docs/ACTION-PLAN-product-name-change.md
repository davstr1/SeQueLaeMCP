# Action Plan: Product Name Change - sql-agent-cli → sequelae-mcp

## Atomic Steps for Implementation

### Step 1: Update package.json name field
- [x] Open package.json
- [x] Change "name" from "sql-agent-cli" to "sequelae-mcp"
- [x] Save file
- [x] Commit with message "Update package name to sequelae-mcp"

### Step 2: Update binary name in package.json
- [x] In package.json, change "sql-agent" key to "sequelae"
- [x] Update the value to "./bin/sequelae"
- [x] Save file
- [x] Commit with message "Update binary name to sequelae"

### Step 3: Update short alias in package.json
- [x] In package.json, change "ssql" key to "smcp"
- [x] Update the value to "./bin/sequelae"
- [x] Save file
- [x] Commit with message "Update short alias to smcp"

### Step 4: Rename binary file
- [x] Rename /bin/sql-agent to /bin/sequelae
- [x] Commit with message "Rename binary file to sequelae"

### Step 5: Update README.md title
- [x] Open README.md
- [x] Change "# sql-agent-cli" to "# sequelae-mcp"
- [x] Save file
- [x] Commit with message "Update README title"

### Step 6: Update README.md installation commands
- [x] Find all "npm install -D sql-agent-cli" in README.md
- [x] Replace with "npm install -D sequelae-mcp"
- [x] Save file
- [x] Commit with message "Update npm install commands in README"

### Step 7: Update README.md command examples
- [x] Find all "sql-agent" command examples in README.md
- [x] Replace with "sequelae"
- [x] Find all "ssql" command examples
- [x] Replace with "smcp"
- [x] Save file
- [x] Commit with message "Update command examples in README"

### Step 8: Update EXAMPLES.md command references
- [x] Open EXAMPLES.md
- [x] Replace all "sql-agent" with "sequelae"
- [x] Replace all "ssql" with "smcp"
- [x] Replace any "sql-agent-cli" package references with "sequelae-mcp"
- [x] Save file
- [x] Commit with message "Update command examples in EXAMPLES.md"

### Step 9: Update MCP.md references
- [x] Open MCP.md
- [x] Replace all "sql-agent-cli" with "sequelae-mcp"
- [x] Replace all "sql-agent" commands with "sequelae"
- [x] Save file
- [x] Commit with message "Update references in MCP.md"

### Step 10: Search for hardcoded references in source files
- [x] Search all .js/.ts files for "sql-agent-cli"
- [x] Replace with "sequelae-mcp" where found
- [x] Search for "sql-agent" in error messages or logs
- [x] Replace with "sequelae" where appropriate
- [x] Save any modified files
- [x] Commit with message "Update hardcoded references in source files"

### Step 11: Clean up CLAUDE.md
- [x] Open CLAUDE.md
- [x] Remove the "Gigarad Backend - AI Context" section
- [x] Remove all Gigarad-related content
- [x] Remove tuneb references
- [x] Add proper context for sequelae-mcp project
- [x] Save file
- [x] Commit with message "Clean up and update CLAUDE.md for sequelae-mcp"

### Step 12: Update dev-test package.json
- [x] Open dev-test/package.json
- [x] Update any references to "sql-agent-cli"
- [x] Change to "sequelae-mcp"
- [x] Save file
- [x] Commit with message "Update dev-test package.json"

### Step 13: Test the changes
- [x] Run npm install to verify package works
- [x] Test sequelae command works
- [x] Test smcp command works
- [x] Verify basic functionality
- [x] Commit any fixes if needed

## COMPLETED ✅

All steps have been successfully completed. The product name has been changed from "sql-agent-cli" to "sequelae-mcp" throughout the entire codebase.