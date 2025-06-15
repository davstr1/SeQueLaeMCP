# CLAUDE.md

## 🎯 Project Context

**SQL Agent CLI** - A dead-simple PostgreSQL query executor for AI-assisted development.

**Core principle**: Keep it simple. Don't overcomplicate.

## 🛠 Tech Stack

- **Runtime**: Node.js
- **Language**: TypeScript (strict mode)
- **Testing**: Jest
- **Database**: PostgreSQL only

## 🧪 Testing

```bash
npm test              # Run all tests
npm run test:watch    # Watch mode
npm test -- --coverage # Coverage report
```


## 📁 Project Structure

```
src/
└── cli.ts              # Main CLI implementation

tests/
├── e2e.test.ts        # End-to-end tests
└── unit.test.ts       # Unit tests

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

## ✅ Before Committing

- [ ] TypeScript compiles without errors
- [ ] All tests pass
- [ ] Tested manually with dev-test environment

---

**Remember**: This tool solves one problem - executing SQL queries from the CLI for AI development. Every change should serve that purpose.