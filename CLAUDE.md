# CLAUDE.md

## 🎯 Project Context

**SQL Agent CLI** - A dead-simple PostgreSQL query executor for AI-assisted development.

**Core principle**: Keep it simple. Don't overcomplicate.

## 🛠 Tech Stack

- **Runtime**: Node.js
- **Language**: TypeScript (strict mode)
- **Testing**: Jest
- **Database**: PostgreSQL only
- **MCP**: Model Context Protocol support

## 🧪 Testing

```bash
npm test              # Run all tests
npm run test:watch    # Watch mode
npm test -- --coverage # Coverage report
```


## 📁 Project Structure

```
src/
├── cli.ts              # Main CLI implementation
├── core/
│   └── sql-executor.ts # Core SQL execution logic
├── mcp/                # MCP protocol implementation
│   ├── index.ts        # MCP server
│   ├── tool-definition.ts # Tool schemas
│   └── tool-handler.ts # Tool execution
└── bin/
    └── sql-agent.ts    # Dual-mode entry point

tests/
├── e2e.test.ts        # End-to-end tests
├── unit.test.ts       # Unit tests
└── mcp tests          # MCP-specific tests

dev-test/              # Local testing environment
└── sql/              # Sample SQL files
```

## 🚀 Key Commands

```bash
# Direct SQL execution
npx sql-agent exec "SELECT * FROM users"

# File execution
npx sql-agent file migrations/001_init.sql

# JSON output
npx sql-agent exec "SELECT * FROM users" --json

# Get full database schema (VERY USEFUL!)
npx sql-agent schema

# Get schema for specific tables (more efficient)
npx sql-agent schema users,posts

# MCP mode (for AI assistants)
npx sql-agent --mcp
```

## 🚫 What NOT to Do

- Don't create .js files or edit /dist manually
- Don't add features that don't serve core SQL execution
- Don't implement connection pooling or transactions (not supported yet)
- Don't forget to run tests before committing

## 📝 Code Conventions

- Use existing patterns from `cli.ts`
- Handle errors explicitly with clear messages
- Keep functions small and focused
- TypeScript strict mode - no `any` types
- Review and update the README.md after every modification.

## ✅ Before Committing

- [ ] TypeScript compiles without errors
- [ ] All tests pass
- [ ] Tested manually with dev-test environment

---

**Remember**: This tool solves one problem - executing SQL queries from the CLI for AI development. Every change should serve that purpose.