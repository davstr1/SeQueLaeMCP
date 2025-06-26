#!/usr/bin/env node

import { SqlAgentMcpServer } from '../mcp';
import { logger } from '../utils/logger';
import { RateLimiterOptions } from '../utils/rate-limiter';

// Check if running in MCP mode
const args = process.argv.slice(2);
const isMcpMode = process.env.MCP_MODE === 'true' || args.includes('--mcp');

async function main(): Promise<void> {
  if (isMcpMode) {
    // Remove --mcp from args if present
    const filteredArgs = args.filter(arg => arg !== '--mcp');
    process.argv = [process.argv[0], process.argv[1], ...filteredArgs];

    // Configure rate limiting from environment variables
    let rateLimiterOptions: RateLimiterOptions | undefined;

    if (process.env.MCP_RATE_LIMIT_MAX_REQUESTS) {
      const maxRequests = parseInt(process.env.MCP_RATE_LIMIT_MAX_REQUESTS);
      const windowMs = parseInt(process.env.MCP_RATE_LIMIT_WINDOW_MS || '60000');

      if (!isNaN(maxRequests) && maxRequests > 0) {
        rateLimiterOptions = {
          maxRequests,
          windowMs,
        };

        // Parse tool-specific limits if provided
        if (process.env.MCP_RATE_LIMIT_TOOLS) {
          try {
            const toolLimits = JSON.parse(process.env.MCP_RATE_LIMIT_TOOLS);
            rateLimiterOptions.toolSpecificLimits = toolLimits;
          } catch (_e) {
            logger.warn('Invalid MCP_RATE_LIMIT_TOOLS format, ignoring tool-specific limits');
          }
        }

        logger.info('Rate limiting enabled:', {
          maxRequests,
          windowMs,
          hasToolLimits: !!rateLimiterOptions.toolSpecificLimits,
        });
      }
    }

    // Start MCP server
    const server = new SqlAgentMcpServer(rateLimiterOptions);
    await server.start();
  } else {
    // Run as CLI - import dynamically to avoid loading unnecessary code
    const { main: cliMain } = await import('../cli');
    await cliMain();
  }
}

main().catch(error => {
  logger.error('Fatal error:', error);
  process.exit(1);
});
