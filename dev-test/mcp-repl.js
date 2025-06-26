#!/usr/bin/env node

const { spawn } = require('child_process');
const readline = require('readline');
const path = require('path');

// Load dotenv from parent directory
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

// Colors
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Start MCP server
log('\n🚀 Starting SQL Agent MCP REPL...', 'bright');
log('Type "help" for commands or JSON-RPC requests directly\n', 'dim');

const mcpServer = spawn('npx', ['sequelae', '--mcp'], {
  cwd: process.cwd(),
  env: process.env,
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

      // Pretty print response
      if (response.error) {
        log('\n❌ Error Response:', 'red');
        console.log(JSON.stringify(response, null, 2));
      } else if (response.content) {
        log('\n✅ Tool Response:', 'green');
        response.content.forEach(item => {
          if (item.type === 'text') {
            try {
              const parsed = JSON.parse(item.text);
              console.log(JSON.stringify(parsed, null, 2));
            } catch {
              console.log(item.text);
            }
          } else if (item.type === 'error') {
            log(`Error: ${item.error}`, 'red');
          }
        });
      } else {
        log('\n📥 Response:', 'cyan');
        console.log(JSON.stringify(response, null, 2));
      }
    } catch (_e) {
      // Not JSON
      console.log('Raw:', line);
    }
  });

  // Show prompt again
  process.stdout.write('\n> ');
});

mcpServer.stderr.on('data', data => {
  log(`\nServer Error: ${data}`, 'red');
  process.stdout.write('> ');
});

// Create readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: '> ',
});

// Helper commands
const commands = {
  help: () => {
    log('\nAvailable commands:', 'yellow');
    console.log('  help                - Show this help');
    console.log('  init                - Send initialize request');
    console.log('  tools               - List available tools');
    console.log('  exec <query>        - Execute SQL query');
    console.log('  schema [tables...]  - Get schema for tables');
    console.log('  file <path>         - Execute SQL file');
    console.log('  clear               - Clear screen');
    console.log('  exit                - Quit');
    console.log('\nOr send raw JSON-RPC:');
    console.log('  {"method":"tools/list","params":{}}');
  },

  init: () => {
    sendRequest('initialize');
  },

  tools: () => {
    sendRequest('tools/list');
  },

  exec: query => {
    if (!query) {
      log('Usage: exec <SQL query>', 'red');
      return;
    }
    sendRequest('tools/call', {
      name: 'sql_exec',
      arguments: { query },
    });
  },

  schema: tables => {
    const args = tables ? { tables: tables.split(' ') } : {};
    sendRequest('tools/call', {
      name: 'sql_schema',
      arguments: args,
    });
  },

  file: filepath => {
    if (!filepath) {
      log('Usage: file <path>', 'red');
      return;
    }
    sendRequest('tools/call', {
      name: 'sql_file',
      arguments: { filepath },
    });
  },

  clear: () => {
    console.clear();
    log('SQL Agent MCP REPL', 'bright');
  },
};

// Send request to server
function sendRequest(method, params = {}) {
  const request = {
    jsonrpc: '2.0',
    id: requestId++,
    method,
    params,
  };

  log(`\n📤 Sending: ${method}`, 'blue');
  mcpServer.stdin.write(JSON.stringify(request) + '\n');
}

// Handle input
rl.on('line', line => {
  const input = line.trim();

  if (!input) {
    rl.prompt();
    return;
  }

  // Check for exit
  if (input === 'exit' || input === 'quit') {
    rl.close();
    return;
  }

  // Try to parse as JSON first
  if (input.startsWith('{')) {
    try {
      const parsed = JSON.parse(input);
      sendRequest(parsed.method || 'unknown', parsed.params || {});
    } catch (_e) {
      log('Invalid JSON', 'red');
    }
  } else {
    // Parse as command
    const [cmd, ...args] = input.split(' ');
    const handler = commands[cmd];

    if (handler) {
      handler(args.join(' '));
    } else {
      log(`Unknown command: ${cmd}. Type "help" for commands.`, 'red');
    }
  }

  rl.prompt();
});

// Handle exit
rl.on('close', () => {
  log('\n👋 Shutting down...', 'yellow');
  mcpServer.kill();
  process.exit(0);
});

// Start REPL
commands.help();
rl.prompt();
