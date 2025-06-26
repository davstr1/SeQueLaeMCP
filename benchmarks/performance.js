#!/usr/bin/env node

/**
 * Performance benchmarks for sequelae-mcp
 * Measures query execution time and throughput
 */

const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

// Test configurations
const ITERATIONS = 100;
const CONCURRENCY_LEVELS = [1, 5, 10, 20];

// Test queries
const QUERIES = {
  simple: 'SELECT 1',
  medium: "SELECT * FROM pg_tables WHERE schemaname = 'public' LIMIT 10",
  complex: `
    SELECT 
      n.nspname as schema,
      c.relname as table,
      a.attname as column,
      t.typname as type
    FROM pg_catalog.pg_class c
    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
    JOIN pg_catalog.pg_attribute a ON a.attrelid = c.oid
    JOIN pg_catalog.pg_type t ON t.oid = a.atttypid
    WHERE c.relkind = 'r' 
      AND n.nspname NOT IN ('pg_catalog', 'information_schema')
      AND a.attnum > 0
    LIMIT 50
  `,
};

// Benchmark functions
async function measureLatency(query, iterations = ITERATIONS) {
  const times = [];

  for (let i = 0; i < iterations; i++) {
    const start = process.hrtime.bigint();
    try {
      await execAsync(`npx sequelae exec "${query}"`);
      const end = process.hrtime.bigint();
      const duration = Number(end - start) / 1_000_000; // Convert to milliseconds
      times.push(duration);
    } catch (error) {
      console.error(`Error in iteration ${i}:`, error.message);
    }
  }

  // Calculate statistics
  const sorted = times.sort((a, b) => a - b);
  const avg = times.reduce((a, b) => a + b, 0) / times.length;
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  const p50 = sorted[Math.floor(times.length * 0.5)];
  const p95 = sorted[Math.floor(times.length * 0.95)];
  const p99 = sorted[Math.floor(times.length * 0.99)];

  return { avg, min, max, p50, p95, p99, count: times.length };
}

async function measureThroughput(query, concurrency) {
  const start = process.hrtime.bigint();
  let completed = 0;
  let running = 0;

  async function runQuery() {
    try {
      await execAsync(`npx sequelae exec "${query}"`);
    } catch (_e) {
      // Ignore errors for throughput test
    }
    completed++;
    running--;
  }

  // Run queries with controlled concurrency
  while (completed < ITERATIONS) {
    while (running < concurrency && completed + running < ITERATIONS) {
      running++;
      runQuery();
    }
    await new Promise(resolve => setTimeout(resolve, 10));
  }

  const end = process.hrtime.bigint();
  const totalTime = Number(end - start) / 1_000_000_000; // Convert to seconds
  const throughput = ITERATIONS / totalTime; // Queries per second

  return { throughput, totalTime, concurrency };
}

// Main benchmark runner
async function runBenchmarks() {
  console.log('🚀 sequelae-mcp Performance Benchmarks\n');
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Database: ${process.env.DATABASE_URL ? 'Connected' : 'Not configured'}`);
  console.log(`Iterations per test: ${ITERATIONS}\n`);

  // Check if database is configured
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL not configured. Please set it in .env file.');
    process.exit(1);
  }

  // Test connection
  console.log('Testing database connection...');
  try {
    await execAsync('npx sequelae exec "SELECT 1"');
    console.log('✅ Database connection successful\n');
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    process.exit(1);
  }

  // Run latency benchmarks
  console.log('📊 LATENCY BENCHMARKS');
  console.log('='.repeat(80));

  for (const [name, query] of Object.entries(QUERIES)) {
    console.log(`\n${name.toUpperCase()} QUERY:`);
    console.log(`Query: ${query.trim().replace(/\s+/g, ' ').substring(0, 50)}...`);

    const stats = await measureLatency(query);
    console.log(`\nResults (${stats.count} iterations):`);
    console.log(`  Average: ${stats.avg.toFixed(2)}ms`);
    console.log(`  Min:     ${stats.min.toFixed(2)}ms`);
    console.log(`  Max:     ${stats.max.toFixed(2)}ms`);
    console.log(`  P50:     ${stats.p50.toFixed(2)}ms`);
    console.log(`  P95:     ${stats.p95.toFixed(2)}ms`);
    console.log(`  P99:     ${stats.p99.toFixed(2)}ms`);
  }

  // Run throughput benchmarks
  console.log('\n\n📊 THROUGHPUT BENCHMARKS');
  console.log('='.repeat(80));

  for (const concurrency of CONCURRENCY_LEVELS) {
    console.log(`\nConcurrency Level: ${concurrency}`);

    for (const [name, query] of Object.entries(QUERIES)) {
      const result = await measureThroughput(query, concurrency);
      console.log(`  ${name}: ${result.throughput.toFixed(2)} queries/sec`);
    }
  }

  // Memory usage
  console.log('\n\n📊 MEMORY USAGE');
  console.log('='.repeat(80));
  const memUsage = process.memoryUsage();
  console.log(`  RSS:       ${(memUsage.rss / 1024 / 1024).toFixed(2)} MB`);
  console.log(`  Heap Used: ${(memUsage.heapUsed / 1024 / 1024).toFixed(2)} MB`);
  console.log(`  External:  ${(memUsage.external / 1024 / 1024).toFixed(2)} MB`);

  console.log('\n✅ Benchmarks completed successfully!');
}

// Run benchmarks
runBenchmarks().catch(error => {
  console.error('Benchmark failed:', error);
  process.exit(1);
});
