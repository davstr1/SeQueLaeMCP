#!/usr/bin/env node

const { spawn } = require('child_process');
const readline = require('readline');

// Color codes for output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Load dotenv from parent directory
require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env') });

// Start MCP server
log('\n🚀 Starting SQL Agent in MCP mode...', 'bright');
const mcpServer = spawn('npx', ['sequelae', '--mcp'], {
  cwd: process.cwd(),
  env: process.env, // Pass environment variables including DATABASE_URL
});

let requestId = 1;

// Handle server output
mcpServer.stdout.on('data', data => {
  const lines = data
    .toString()
    .split('\n')
    .filter(line => line.trim());
  lines.forEach(line => {
    try {
      const response = JSON.parse(line);
      log('\n📥 Response:', 'green');
      console.log(JSON.stringify(response, null, 2));

      // Check if it's an error
      if (response.error) {
        log(`❌ Error: ${response.error.message}`, 'red');
      } else if (response.content) {
        // Parse the content if it's a tool response
        response.content.forEach(item => {
          if (item.type === 'text' && item.text) {
            try {
              const result = JSON.parse(item.text);
              log('\n📊 Result:', 'cyan');
              console.log(JSON.stringify(result, null, 2));
            } catch (e) {
              // Not JSON, just print as is
              log('\n📄 Result:', 'cyan');
              console.log(item.text);
            }
          } else if (item.type === 'error') {
            log(`\n❌ Tool Error: ${item.error}`, 'red');
          }
        });
      }
    } catch (e) {
      // Not JSON, print raw
      console.log('Raw output:', line);
    }
  });
});

mcpServer.stderr.on('data', data => {
  log(`\n❌ Server Error: ${data}`, 'red');
});

// Send a request to the server
function sendRequest(method, params = {}) {
  const request = {
    jsonrpc: '2.0',
    id: requestId++,
    method,
    params,
  };

  log(`\n📤 Request: ${method}`, 'blue');
  console.log(JSON.stringify(request, null, 2));

  mcpServer.stdin.write(JSON.stringify(request) + '\n');
}

// Test sequence
async function runTests() {
  // Wait for server to start
  await new Promise(resolve => setTimeout(resolve, 500));

  log('\n🧪 Running MCP Tests...', 'bright');

  // Test 1: Initialize
  log('\n1️⃣ Testing initialize...', 'yellow');
  sendRequest('initialize');
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Test 2: List tools
  log('\n2️⃣ Testing tools/list...', 'yellow');
  sendRequest('tools/list');
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Test 3: Execute a simple query
  log('\n3️⃣ Testing sql_exec with SELECT...', 'yellow');
  sendRequest('tools/call', {
    name: 'sql_exec',
    arguments: {
      query: 'SELECT COUNT(*) as count FROM users_test_sql_agent',
    },
  });
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Test 4: Get schema
  log('\n4️⃣ Testing sql_schema...', 'yellow');
  sendRequest('tools/call', {
    name: 'sql_schema',
    arguments: {
      tables: ['users_test_sql_agent', 'posts_test_sql_agent'],
    },
  });
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Test 5: Test error handling
  log('\n5️⃣ Testing error handling...', 'yellow');
  sendRequest('tools/call', {
    name: 'sql_exec',
    arguments: {
      query: 'SELECT * FROM non_existent_table',
    },
  });
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Test 6: Human-readable format
  log('\n6️⃣ Testing human-readable output...', 'yellow');
  sendRequest('tools/call', {
    name: 'sql_exec',
    arguments: {
      query: 'SELECT id, name FROM users_test_sql_agent LIMIT 3',
      json: false,
    },
  });
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Done
  log('\n✅ Tests complete! Press Ctrl+C to exit.', 'green');
}

// Handle exit
process.on('SIGINT', () => {
  log('\n👋 Shutting down MCP server...', 'yellow');
  mcpServer.kill();
  process.exit(0);
});

// Run tests
runTests().catch(error => {
  log(`\n❌ Test error: ${error}`, 'red');
  mcpServer.kill();
  process.exit(1);
});
