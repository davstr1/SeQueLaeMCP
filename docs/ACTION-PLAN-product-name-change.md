# Action Plan: Product Name Change - sql-agent-cli → sequelae-mcp

## Atomic Steps for Implementation

### Step 1: Update package.json name field
- [ ] Open package.json
- [ ] Change "name" from "sql-agent-cli" to "sequelae-mcp"
- [ ] Save file
- [ ] Commit with message "Update package name to sequelae-mcp"

### Step 2: Update binary name in package.json
- [ ] In package.json, change "sql-agent" key to "sequelae"
- [ ] Update the value to "./bin/sequelae"
- [ ] Save file
- [ ] Commit with message "Update binary name to sequelae"

### Step 3: Update short alias in package.json
- [ ] In package.json, change "ssql" key to "smcp"
- [ ] Update the value to "./bin/sequelae"
- [ ] Save file
- [ ] Commit with message "Update short alias to smcp"

### Step 4: Rename binary file
- [ ] Rename /bin/sql-agent to /bin/sequelae
- [ ] Commit with message "Rename binary file to sequelae"

### Step 5: Update README.md title
- [ ] Open README.md
- [ ] Change "# sql-agent-cli" to "# sequelae-mcp"
- [ ] Save file
- [ ] Commit with message "Update README title"

### Step 6: Update README.md installation commands
- [ ] Find all "npm install -D sql-agent-cli" in README.md
- [ ] Replace with "npm install -D sequelae-mcp"
- [ ] Save file
- [ ] Commit with message "Update npm install commands in README"

### Step 7: Update README.md command examples
- [ ] Find all "sql-agent" command examples in README.md
- [ ] Replace with "sequelae"
- [ ] Find all "ssql" command examples
- [ ] Replace with "smcp"
- [ ] Save file
- [ ] Commit with message "Update command examples in README"

### Step 8: Update EXAMPLES.md command references
- [ ] Open EXAMPLES.md
- [ ] Replace all "sql-agent" with "sequelae"
- [ ] Replace all "ssql" with "smcp"
- [ ] Replace any "sql-agent-cli" package references with "sequelae-mcp"
- [ ] Save file
- [ ] Commit with message "Update command examples in EXAMPLES.md"

### Step 9: Update MCP.md references
- [ ] Open MCP.md
- [ ] Replace all "sql-agent-cli" with "sequelae-mcp"
- [ ] Replace all "sql-agent" commands with "sequelae"
- [ ] Save file
- [ ] Commit with message "Update references in MCP.md"

### Step 10: Search for hardcoded references in source files
- [ ] Search all .js/.ts files for "sql-agent-cli"
- [ ] Replace with "sequelae-mcp" where found
- [ ] Search for "sql-agent" in error messages or logs
- [ ] Replace with "sequelae" where appropriate
- [ ] Save any modified files
- [ ] Commit with message "Update hardcoded references in source files"

### Step 11: Clean up CLAUDE.md
- [ ] Open CLAUDE.md
- [ ] Remove the "Gigarad Backend - AI Context" section
- [ ] Remove all Gigarad-related content
- [ ] Remove tuneb references
- [ ] Add proper context for sequelae-mcp project
- [ ] Save file
- [ ] Commit with message "Clean up and update CLAUDE.md for sequelae-mcp"

### Step 12: Update dev-test package.json
- [ ] Open dev-test/package.json
- [ ] Update any references to "sql-agent-cli"
- [ ] Change to "sequelae-mcp"
- [ ] Save file
- [ ] Commit with message "Update dev-test package.json"

### Step 13: Test the changes
- [ ] Run npm install to verify package works
- [ ] Test sequelae command works
- [ ] Test smcp command works
- [ ] Verify basic functionality
- [ ] Commit any fixes if needed