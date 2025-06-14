## general directions : important forewords.
You have a natural tendency to overcomplicate, overengeenir, reinvent the wheel, and put the shit under the carpet.
Curb that. Before modifying the code, Always ask yourself if a simpler solution don't exist.
And if what you're about to do is aligned with the purpose.

## Tech stack
node 
typescript (so don't bother .js files and /dist folders)


## tests

npm run test

or 
npm run test:watch


## arbo

.
├── CLAUDE.md - Claude, i see you ! read thi first !!!
├── README.md - for end user
├── bin
│   └── sql-agent
├── dev-test - for live testing the current codebase
│   ├── README.md
│   ├── package.json
│   └── sql
│       ├── create-tables.sql
│       └── seed-data.sql
├── dist
│   └── cli.js - the actual cli file
├── jest.config.js
├── package.json
├── src
│   └── cli.ts
├── tests
│   ├── e2e.test.ts
│   └── setup.ts
└── tsconfig.json
