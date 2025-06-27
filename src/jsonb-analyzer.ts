import { Client, PoolClient } from 'pg';

export interface JsonStructure {
  [key: string]: JsonFieldInfo;
}

export interface JsonFieldInfo {
  types: Set<string>;
  optional: boolean;
  arrayElementTypes?: Set<string>;
  nestedStructure?: JsonStructure;
}

export async function sampleJsonbColumn(
  client: Client | PoolClient,
  table: string,
  column: string,
  limit: number = 10
): Promise<any[]> {
  try {
    const query = `
      SELECT ${column} 
      FROM ${table} 
      WHERE ${column} IS NOT NULL 
      LIMIT $1
    `;
    const result = await client.query(query, [limit]);
    return result.rows.map(row => row[column]);
  } catch (error) {
    console.error(`Error sampling JSONB column ${table}.${column}:`, error);
    return [];
  }
}

export function analyzeJsonStructure(samples: any[]): JsonStructure {
  const structure: JsonStructure = {};
  const totalSamples = samples.length;

  if (totalSamples === 0) return structure;

  // Count occurrences of each field
  const fieldCounts: { [key: string]: number } = {};

  // Analyze each sample
  for (const sample of samples) {
    if (sample && typeof sample === 'object' && !Array.isArray(sample)) {
      analyzeObject(sample, structure, fieldCounts);
    }
  }

  // Mark fields as optional if they don't appear in all samples
  for (const [field, info] of Object.entries(structure)) {
    info.optional = (fieldCounts[field] || 0) < totalSamples;
  }

  return structure;
}

function analyzeObject(
  obj: any,
  structure: JsonStructure,
  fieldCounts: { [key: string]: number }
): void {
  for (const [key, value] of Object.entries(obj)) {
    // Track field occurrence
    fieldCounts[key] = (fieldCounts[key] || 0) + 1;

    // Initialize field info if not exists
    if (!structure[key]) {
      structure[key] = {
        types: new Set<string>(),
        optional: false,
      };
    }

    const fieldInfo = structure[key];
    const valueType = getJsonType(value);
    fieldInfo.types.add(valueType);

    // Handle arrays
    if (Array.isArray(value)) {
      if (!fieldInfo.arrayElementTypes) {
        fieldInfo.arrayElementTypes = new Set<string>();
      }
      for (const element of value) {
        fieldInfo.arrayElementTypes.add(getJsonType(element));
      }
    }

    // Handle nested objects
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      if (!fieldInfo.nestedStructure) {
        fieldInfo.nestedStructure = {};
      }
      const nestedCounts: { [key: string]: number } = {};
      analyzeObject(value, fieldInfo.nestedStructure, nestedCounts);
    }
  }
}

function getJsonType(value: any): string {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  const type = typeof value;
  if (type === 'object') return 'object';
  return type;
}

export function formatJsonStructure(structure: JsonStructure, indent: number = 0): string {
  if (Object.keys(structure).length === 0) {
    return '    (no data to analyze)';
  }

  const lines: string[] = [];
  const indentStr = '    ' + '  '.repeat(indent);

  for (const [field, info] of Object.entries(structure)) {
    const types = Array.from(info.types);
    const optional = info.optional ? '?' : '';

    let typeStr: string;
    if (types.length === 1 && types[0] === 'array' && info.arrayElementTypes) {
      const elementTypes = Array.from(info.arrayElementTypes).join(' | ');
      typeStr = `array<${elementTypes}>`;
    } else {
      typeStr = types.join(' | ');
    }

    lines.push(`${indentStr}- ${field}${optional}: ${typeStr}`);

    // Format nested structure
    if (info.nestedStructure && types.includes('object')) {
      const nestedLines = formatJsonStructure(info.nestedStructure, indent + 1);
      if (nestedLines.trim()) {
        lines.push(nestedLines);
      }
    }
  }

  return lines.join('\n');
}
