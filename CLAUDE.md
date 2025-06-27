NEVER FUCKING SAY AGAIN "You're absolutely right"


# sequelae-mcp - AI Context

## Project Overview
sequelae-mcp is an MCP-enabled PostgreSQL tool that lets AI assistants execute SQL directly. It provides a bridge between AI agents (Claude, Cursor, etc.) and PostgreSQL databases, allowing them to run real SQL queries without copy-pasting or hallucinated database adapters.

## User Commands (prefix with --):

--GCP  
Check git status then if any changes, add Commit and push all changes.

--MIND  
Before any action, remind yourself:  
- This isn't fucking enterprise. We're indiehackers, building MVPs—move fast, stay practical.
- DRY (Don't Repeat Yourself)
- KISS (Keep It Simple, Stupid)
- YAGNI (You Aren't Gonna Need It)
- SOLID (Single responsibility, Open-closed, Liskov, Interface segregation, Dependency inversion)
- FCP (Favor Composition over Inheritance)
- PoLA (Principle of Least Astonishment)
- SoT (Single Source of Truth)

--WD  
Run --X and --MIND and --GCP.
Do a quick, MVP-level review of the codebase. regarding what's described along with the command. 
Write an actionable checklist in /dev-docs/REVIEW-***.md.  
Don't touch code or other docs.  
When done, --GCP and output the doc path.

--AP  
Run --X and --MIND and --GCP    
Take the latest review and break it down into a simple, step-by-step action plan with checkboxes—keep splitting steps until atomic.  
Save as /dev-docs/ACTION-PLAN-***.md, then --GCP.

--EXE  
Run --MIND and --GCP   then execute the action plan (from file), checking off steps as you go.  
Commit and push (--GCP) after each step.

--TERMINATOR  
Run --EXE, then --DS.

--CD  
Run --MIND + --GCP    
Find and delete obsolete .md files, then --GCP.

--DS  
Don't stop until the process is totally finished.

--PUB
--MIND, --GPC then run the tests, correct any error then --GPC and npm publish

--X  
Don't touch the codebase, except for the one file specified (if any).

--READY? --MIND --X --GCP  then --WD about is this codebase 100% production ready, and what's still lacking if not ? 
- Is error handling robust and consistent?
- Is test coverage meaningful and adequate?
- Do the tests catch real issues, or are they just for show?
- Are tests run pre-commit?
- Is the README clear, concise, and covers install/run/debug basics?
- Do we have legacy code, dead code, forgotten todos rotting somewhere ?
- Do we have deprecation warnings or other warnings somewhere ?
- Are all the dependencies up to date ?

---

### General Notes

- Reviews and action plans must stay light and MVP-focused—no enterprise BS unless explicitly asked.
- Output file paths for every relevant action.


## Tech Stack
- **Language**: TypeScript/Node.js
- **Database**: PostgreSQL (any version)
- **Protocol**: Model Context Protocol (MCP)
- **CLI Framework**: Custom built
- **Testing**: Jest
- **Build**: TypeScript compiler

## Key Features
- **MCP Mode**: Primary mode for AI assistants
- **CLI Mode**: Human-friendly command line interface
- **Query Execution**: Direct SQL execution with formatted output
- **Schema Inspection**: View database structure
- **Transaction Support**: Automatic rollback on errors
- **Multiple Output Formats**: Table (default) or JSON

## Project Structure
```
/
├── src/
│   ├── cli.ts           # CLI entry point and main logic
│   ├── mcp/             # MCP protocol implementation
│   │   ├── index.ts     # MCP server
│   │   ├── tool-definition.ts
│   │   └── tool-handler.ts
│   └── bin/
│       └── sequelae.ts  # Binary entry point
├── tests/               # Test suite
├── bin/
│   └── sequelae         # Executable script
└── dist/                # Compiled JavaScript
```

## Development Commands
```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Run tests
npm test

# Run specific tests
npm run test:unit
npm run test:e2e

# Linting
npm run lint
npm run lint:fix

# Formatting
npm run format
npm run format:check
```

## Testing
- Unit tests in `tests/unit.test.ts`
- E2E tests in `tests/e2e.test.ts`
- MCP tests in `tests/mcp-server.test.ts`
- Dual mode tests in `tests/dual-mode.test.ts`

## Usage Examples
```bash
# Execute query
sequelae exec "SELECT * FROM users"

# Run from file
sequelae file queries/report.sql

# Show schema
sequelae schema

# JSON output
sequelae --json exec "SELECT count(*) FROM orders"

# Short alias
smcp exec "INSERT INTO logs (message) VALUES ('test')"
```

## Environment Configuration
- Requires `DATABASE_URL` environment variable
- Supports `.env` file in project root
- Format: `postgresql://user:pass@host:port/database`

## Important Notes
1. **Binary Names**: Main command is `sequelae`, short alias is `smcp`
2. **MCP Support**: Full Model Context Protocol implementation for AI agents
3. **Error Handling**: Automatic transaction rollback on errors
4. **Security**: Never logs or exposes database credentials
5. **Compatibility**: Works with any PostgreSQL database

## Common Tasks
- To add new MCP tools: Update `src/mcp/tool-definition.ts`
- To modify CLI commands: Edit `src/cli.ts`
- To update output formatting: Modify the formatting functions in `cli.ts`
- To add new tests: Add to appropriate test file in `tests/`

## Architecture Decisions
- Single responsibility: Separate MCP and CLI modes
- Type safety: Full TypeScript with strict mode
- Error resilience: Graceful error handling and recovery
- Minimal dependencies: Only pg and dotenv required
- Protocol compliance: Strict MCP protocol implementation