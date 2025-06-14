# CLAUDE.md

## 🚨 READ THIS FIRST - Important Forewords

You have a natural tendency to:
- Overcomplicate simple solutions
- Overengineer straightforward tasks
- Reinvent the wheel instead of using existing tools
- Hide problems instead of addressing them directly
- Provide inaccurate or misleading results

**Curb that behavior.** Before modifying ANY code, always ask yourself:
- Does a simpler solution exist?
- Am I trying to shoot a fly with a bazooka?
- Is what I'm about to do aligned with the initial purpose?
- Will this change make the codebase easier or harder to maintain?

## 🎯 Project Context

This appears to be a **SQL Agent CLI tool** built with Node.js and TypeScript. The primary goal is to provide a command-line interface for SQL operations.

### Key Principles
- **Simplicity over complexity** - favor readable, maintainable code
- **TypeScript-first** - don't create .js files or manage /dist manually
- **Test-driven** - changes should be covered by tests
- **Purpose-driven** - every feature should serve the core SQL agent functionality

## 🛠 Tech Stack

- **Runtime**: Node.js
- **Language**: TypeScript (strict - no .js files or manual /dist management)
- **Testing**: Jest
- **CLI Framework**: (to be determined from codebase analysis)

## 🧪 Testing

Run tests with:
```bash
npm run test
```

For development/watch mode:
```bash
npm run test:watch
```

**Testing Guidelines:**
- Write tests BEFORE implementing features when possible
- Cover both happy path and edge cases
- E2E tests should simulate real CLI usage
- Unit tests should focus on individual functions/modules (like parseArguments)
- Keep tests focused and readable
- Check coverage reports in /coverage/lcov-report/index.html
- Aim for high test coverage on core business logic

## 📁 Project Structure

```
.
├── CLAUDE.md                    # 👋 You're reading this!
├── README.md                    # End user documentation
├── bin/
│   └── sql-agent                # CLI entry point
├── coverage/                    # 🚫 AUTO-GENERATED - Test coverage reports
│   ├── clover.xml
│   ├── coverage-final.json
│   ├── lcov-report/             # HTML coverage reports
│   │   ├── index.html           # Main coverage dashboard
│   │   └── *.html               # Per-file coverage details
│   └── lcov.info
├── dev-test/                    # Development testing environment
│   ├── README.md                # Testing instructions
│   ├── package.json             # Test dependencies
│   └── sql/
│       ├── create-tables.sql
│       └── seed-data.sql
├── dist/                        # 🚫 AUTO-GENERATED - Don't edit manually
│   ├── cli.js                   # Compiled CLI entry point
│   └── parseArguments.js        # Compiled argument parser
├── src/                         # 🎯 SOURCE CODE
│   ├── cli.ts                   # Main CLI implementation
│   └── parseArguments.ts        # Command-line argument parsing logic
├── tests/                       # Test suite
│   ├── e2e.test.ts              # End-to-end integration tests
│   ├── parseArguments.test.ts   # Unit tests for argument parsing
│   ├── setup.ts                 # Test configuration and setup
│   └── unit.test.ts             # General unit tests
├── jest.config.js               # Jest testing configuration
├── package.json                 # Dependencies and npm scripts
└── tsconfig.json                # TypeScript compiler configuration
```

## 🚀 Development Workflow

1. **Before Making Changes:**
   - Read the existing code to understand current patterns
   - Check if similar functionality already exists
   - Review tests to understand expected behavior

2. **When Adding Features:**
   - Start with the simplest implementation that works
   - Write or update tests
   - Ensure TypeScript compilation passes
   - Test manually using dev-test environment

3. **When Fixing Bugs:**
   - Reproduce the issue first
   - Write a failing test if possible
   - Implement the minimal fix
   - Verify the fix doesn't break existing functionality

## 🎯 CLI Design Principles

- **User-friendly**: Clear error messages and helpful output
- **Consistent**: Uniform command structure and options
- **Efficient**: Fast startup and execution times
- **Reliable**: Handle edge cases gracefully

## 🚫 What NOT to Do

- Don't create .js files manually
- Don't edit files in /dist or /coverage directories (auto-generated)
- Don't add dependencies without justification
- Don't implement features that duplicate existing functionality
- Don't commit without running tests
- Don't overcomplicate command-line interfaces
- Don't ignore test coverage - aim for high coverage on core logic

## 📝 Code Style Guidelines

- Use descriptive variable and function names
- Keep functions small and focused
- Handle errors explicitly, don't let them bubble silently
- Use TypeScript types effectively - avoid `any`
- Comment complex logic, not obvious code

## 🔍 When You Need Help

If you're unsure about:
- **Architecture decisions**: Look at existing patterns in src/cli.ts and src/parseArguments.ts
- **Testing approach**: Check tests/ directory for examples - note the separation between unit tests (parseArguments.test.ts, unit.test.ts) and e2e tests
- **CLI patterns**: Research the specific CLI framework being used, check parseArguments.ts for current argument handling patterns
- **SQL operations**: Check dev-test/sql/ for examples
- **Test coverage**: Open coverage/lcov-report/index.html in browser to see detailed coverage reports

## ✅ Definition of Done

Before considering any task complete:
- [ ] Code compiles without TypeScript errors
- [ ] All tests pass
- [ ] Manual testing completed using dev-test environment
- [ ] Code follows project patterns and style
- [ ] No unnecessary complexity introduced
- [ ] Documentation updated if needed

---

**Remember**: The goal is to build a robust, maintainable SQL agent CLI tool. Every decision should serve that purpose.