#!/usr/bin/env node

import { SqlAgentMcpServer } from '../mcp';

// Check if running in MCP mode
const args = process.argv.slice(2);
const isMcpMode = process.env.MCP_MODE === 'true' || args.includes('--mcp');

async function main(): Promise<void> {
  if (isMcpMode) {
    // Remove --mcp from args if present
    const filteredArgs = args.filter(arg => arg !== '--mcp');
    process.argv = [process.argv[0], process.argv[1], ...filteredArgs];

    // Start MCP server
    const server = new SqlAgentMcpServer();
    await server.start();
  } else {
    // Run as CLI - import dynamically to avoid loading unnecessary code
    const { main: cliMain } = await import('../cli');
    await cliMain();
  }
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
