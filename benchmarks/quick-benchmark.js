#!/usr/bin/env node

/**
 * Quick performance benchmark for sequelae-mcp
 */

const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

async function benchmark() {
  console.log('🚀 sequelae-mcp Quick Performance Benchmark\n');
  
  // Check database connection
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL not configured');
    process.exit(1);
  }
  
  const tests = [
    { name: 'Simple SELECT', query: 'SELECT 1' },
    { name: 'Schema query', query: 'SELECT * FROM pg_tables LIMIT 5' },
    { name: 'Current time', query: 'SELECT NOW()' },
  ];
  
  console.log('Running 10 iterations per test...\n');
  
  for (const test of tests) {
    console.log(`📊 ${test.name}`);
    const times = [];
    
    for (let i = 0; i < 10; i++) {
      const start = Date.now();
      try {
        await execAsync(`npx sequelae exec "${test.query}"`);
        const duration = Date.now() - start;
        times.push(duration);
        process.stdout.write('.');
      } catch (error) {
        process.stdout.write('x');
      }
    }
    
    console.log('\n');
    
    const avg = times.reduce((a, b) => a + b, 0) / times.length;
    const min = Math.min(...times);
    const max = Math.max(...times);
    
    console.log(`  Average: ${avg.toFixed(0)}ms`);
    console.log(`  Min:     ${min}ms`);
    console.log(`  Max:     ${max}ms`);
    console.log('');
  }
  
  // Test MCP mode if available
  console.log('📊 MCP Mode Test');
  const start = Date.now();
  try {
    const result = await execAsync('echo \'{"method":"tools/list"}\' | npx sequelae --mcp');
    const duration = Date.now() - start;
    console.log(`  MCP tools/list: ${duration}ms`);
    console.log(`  Tools found: ${JSON.parse(result.stdout).tools?.length || 0}`);
  } catch (error) {
    console.log('  MCP mode test failed');
  }
  
  console.log('\n✅ Benchmark completed!');
}

benchmark().catch(error => {
  console.error('Benchmark failed:', error);
  process.exit(1);
});