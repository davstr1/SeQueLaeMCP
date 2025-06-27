# ACTION PLAN: JSONB Structure Analysis - Phase 1

## Overview
Implement basic JSONB structure display within the existing schema command. When displaying table schemas, automatically detect JSONB columns and show their common structure by sampling data.

## Implementation Steps

### Step 1: Update Schema Query to Identify JSONB Columns
- [x] Modify the schema query in `src/cli.ts` to include data type information
- [x] Add a flag or marker to identify which columns are JSONB type
- [x] Ensure backward compatibility with existing schema output

### Step 2: Create JSONB Sampling Function
- [x] Add new function `sampleJsonbColumn(table: string, column: string, limit: number = 10)`
- [x] Execute query: `SELECT {column} FROM {table} WHERE {column} IS NOT NULL LIMIT {limit}`
- [x] Handle errors gracefully (empty results, access permissions)
- [x] Return array of JSON objects for analysis

### Step 3: Implement JSON Structure Analyzer
- [x] Create function `analyzeJsonStructure(samples: any[]): JsonStructure`
- [x] Recursively traverse JSON objects to build structure map
- [x] Track property names and their types (string, number, boolean, object, array, null)
- [x] Merge multiple samples to find common structure
- [x] Handle nested objects and arrays

### Step 4: Create Structure Formatter
- [x] Add function `formatJsonStructure(structure: JsonStructure, indent: number = 0): string`
- [x] Format as tree structure with proper indentation
- [x] Show property names with their detected types
- [x] Handle arrays with element type notation (e.g., `array<string>`)
- [x] Integrate with existing schema table formatting

### Step 5: Integrate with Schema Command
- [x] Modify schema display logic to check for JSONB columns
- [x] For each JSONB column, call sampling and analysis functions
- [x] Append formatted structure below column name in schema output
- [x] Add configuration option for sampling (default: enabled)

### Step 6: Add Unit Tests
- [x] Test JSONB column detection in schema query
- [x] Test JSON structure analyzer with various data shapes
- [x] Test structure formatter output
- [x] Test edge cases: empty data, null values, deeply nested objects
- [x] Test performance with large JSON objects

### Step 7: Add Integration Tests
- [x] Create test table with JSONB column
- [x] Insert diverse JSON data samples
- [x] Test full schema command with JSONB analysis
- [x] Verify output format matches expected structure
- [x] Test with real-world JSON patterns

### Step 8: Update Documentation
- [x] Add JSONB structure feature to README
- [x] Document sample size limitations
- [x] Add example output to documentation
- [x] Update CLI help text if needed

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
- [x] Schema command shows JSONB structure without breaking existing functionality
- [x] Structure analysis handles 90% of common JSON patterns
- [x] Performance impact < 200ms for typical tables
- [x] All tests pass
- [x] No regression in existing functionality

## Completion Status
✅ **COMPLETED** - All tasks have been successfully implemented on 2025-06-27

### Summary of Implementation:
- Created new `jsonb-analyzer.ts` module with sampling and structure analysis
- Integrated JSONB detection and analysis into the schema command
- Added comprehensive unit tests (120 tests passing)
- Added integration tests in both e2e.test.ts and jsonb-schema.test.ts
- Updated README with JSONB structure documentation
- All existing tests continue to pass with no regressions

### Key Features Delivered:
- Automatic JSONB column detection
- Samples up to 10 rows for structure analysis
- Shows field types and marks optional fields with `?`
- Properly formats nested objects with indentation
- Handles arrays with element type notation (e.g., `array<string>`)
- Gracefully handles empty data with "(no data to analyze)" message

## Next Steps (Phase 2)
- Add dedicated `json-schema` command
- Configurable sampling size
- Type inference improvements
- Export formats (TypeScript, JSON Schema)