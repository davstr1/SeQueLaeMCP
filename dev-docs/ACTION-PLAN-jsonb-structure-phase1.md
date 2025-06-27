# ACTION PLAN: JSONB Structure Analysis - Phase 1

## Overview
Implement basic JSONB structure display within the existing schema command. When displaying table schemas, automatically detect JSONB columns and show their common structure by sampling data.

## Implementation Steps

### Step 1: Update Schema Query to Identify JSONB Columns
- [ ] Modify the schema query in `src/cli.ts` to include data type information
- [ ] Add a flag or marker to identify which columns are JSONB type
- [ ] Ensure backward compatibility with existing schema output

### Step 2: Create JSONB Sampling Function
- [ ] Add new function `sampleJsonbColumn(table: string, column: string, limit: number = 10)`
- [ ] Execute query: `SELECT {column} FROM {table} WHERE {column} IS NOT NULL LIMIT {limit}`
- [ ] Handle errors gracefully (empty results, access permissions)
- [ ] Return array of JSON objects for analysis

### Step 3: Implement JSON Structure Analyzer
- [ ] Create function `analyzeJsonStructure(samples: any[]): JsonStructure`
- [ ] Recursively traverse JSON objects to build structure map
- [ ] Track property names and their types (string, number, boolean, object, array, null)
- [ ] Merge multiple samples to find common structure
- [ ] Handle nested objects and arrays

### Step 4: Create Structure Formatter
- [ ] Add function `formatJsonStructure(structure: JsonStructure, indent: number = 0): string`
- [ ] Format as tree structure with proper indentation
- [ ] Show property names with their detected types
- [ ] Handle arrays with element type notation (e.g., `array<string>`)
- [ ] Integrate with existing schema table formatting

### Step 5: Integrate with Schema Command
- [ ] Modify schema display logic to check for JSONB columns
- [ ] For each JSONB column, call sampling and analysis functions
- [ ] Append formatted structure below column name in schema output
- [ ] Add configuration option for sampling (default: enabled)

### Step 6: Add Unit Tests
- [ ] Test JSONB column detection in schema query
- [ ] Test JSON structure analyzer with various data shapes
- [ ] Test structure formatter output
- [ ] Test edge cases: empty data, null values, deeply nested objects
- [ ] Test performance with large JSON objects

### Step 7: Add Integration Tests
- [ ] Create test table with JSONB column
- [ ] Insert diverse JSON data samples
- [ ] Test full schema command with JSONB analysis
- [ ] Verify output format matches expected structure
- [ ] Test with real-world JSON patterns

### Step 8: Update Documentation
- [ ] Add JSONB structure feature to README
- [ ] Document sample size limitations
- [ ] Add example output to documentation
- [ ] Update CLI help text if needed

## Code Locations

### Files to Modify:
- `src/cli.ts` - Main CLI logic and schema command
- `tests/unit.test.ts` - Unit tests for new functions
- `tests/e2e.test.ts` - Integration tests
- `README.md` - Documentation updates

### New Functions to Add:
```typescript
// In src/cli.ts or new file src/jsonb-analyzer.ts
async function sampleJsonbColumn(client: Client, table: string, column: string, limit: number = 10): Promise<any[]>
function analyzeJsonStructure(samples: any[]): JsonStructure
function formatJsonStructure(structure: JsonStructure, indent: number = 0): string
```

## Test Cases

### Unit Tests:
1. **Structure Analysis**
   - Simple flat object: `{name: "John", age: 30}`
   - Nested object: `{user: {name: "John", address: {city: "NYC"}}}`
   - Arrays: `{tags: ["a", "b"], scores: [1, 2, 3]}`
   - Mixed types: `{value: "string" | 123 | null}`
   - Empty/null handling

2. **Formatting**
   - Proper indentation
   - Type notation accuracy
   - Array element types
   - Optional field detection

### Integration Tests:
1. Create test database with sample data
2. Run schema command and verify JSONB structure appears
3. Test with various PostgreSQL JSONB patterns
4. Performance test with 100+ row samples

## Success Criteria
- [ ] Schema command shows JSONB structure without breaking existing functionality
- [ ] Structure analysis handles 90% of common JSON patterns
- [ ] Performance impact < 200ms for typical tables
- [ ] All tests pass
- [ ] No regression in existing functionality

## Next Steps (Phase 2)
- Add dedicated `json-schema` command
- Configurable sampling size
- Type inference improvements
- Export formats (TypeScript, JSON Schema)