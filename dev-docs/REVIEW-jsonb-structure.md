# REVIEW: JSONB Structure Analysis Feature

## Feature Overview
Add ability to analyze and display the structure of JSONB columns in PostgreSQL tables. This would help users understand the schema of JSON data without manually querying samples.

## Current State
- sequelae-mcp can execute queries on JSONB fields
- No automatic structure discovery for JSON data
- Users must manually query and inspect JSON data

## Proposed Solution

### Core Functionality
1. **Auto-detect JSONB columns** when showing schema
2. **Sample and analyze** JSON structure from actual data
3. **Display nested structure** with data types
4. **Show array patterns** and object compositions

### Implementation Approach

#### Method 1: Schema Extension (Simpler)
- Extend `sequelae schema` command
- When a column is JSONB, sample 10-100 rows
- Merge JSON structures to find common shape
- Display as nested tree under table schema

#### Method 2: New Command (More Flexible)
- Add `sequelae json-schema <table> <column>`
- Sample configurable number of rows
- Deep analysis with type inference
- Export as TypeScript interface or JSON Schema

### Technical Details
```sql
-- Sample query to get JSONB data
SELECT jsonb_column 
FROM table_name 
WHERE jsonb_column IS NOT NULL 
LIMIT 100;
```

Then analyze in TypeScript:
- Recursively traverse JSON objects
- Track all paths and their types
- Identify optional vs required fields
- Handle arrays and mixed types

## Benefits
- **Developer Experience**: Instant understanding of JSON structure
- **Type Safety**: Could generate TypeScript interfaces
- **Documentation**: Auto-document JSON schemas
- **AI-Friendly**: Better context for AI assistants

## MVP Implementation Checklist

### Phase 1: Basic Structure Display
- [ ] Detect JSONB columns in schema query
- [ ] Add sampling logic (10 rows default)
- [ ] Simple structure merger algorithm
- [ ] Display inline with schema output

### Phase 2: Enhanced Analysis
- [ ] Configurable sample size
- [ ] Type inference (string, number, boolean, null)
- [ ] Array pattern detection
- [ ] Optional field detection

### Phase 3: Export Options
- [ ] JSON Schema export
- [ ] TypeScript interface generation
- [ ] Markdown documentation format

## Example Output
```
Table: users
├── id (integer)
├── email (text)
└── preferences (jsonb)
    ├── theme: string
    ├── notifications: object
    │   ├── email: boolean
    │   └── push: boolean
    └── tags: array<string>
```

## Considerations
- Performance impact on large tables
- Handling diverse/inconsistent JSON data
- Privacy concerns with data sampling
- Memory usage for large JSON objects

## Recommendation
Start with Phase 1 MVP - extend existing schema command with basic JSONB structure display. This provides immediate value with minimal complexity. Later phases can be added based on user feedback.