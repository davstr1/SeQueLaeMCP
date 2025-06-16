/**
 * MCP Tool Server for SQL Agent
 * This module handles tool discovery and registration for MCP protocol
 */

import { SQL_AGENT_TOOLS } from './tool-definition';
import { McpToolHandler } from './tool-handler';

export interface McpServerInfo {
  name: string;
  version: string;
  description: string;
}

export interface McpToolsListResponse {
  tools: Array<{
    name: string;
    description: string;
    inputSchema: Record<string, unknown>;
  }>;
}

export class SqlAgentMcpServer {
  private handler: McpToolHandler;

  constructor() {
    this.handler = new McpToolHandler();
  }

  /**
   * Get server information
   */
  getServerInfo(): McpServerInfo {
    return {
      name: 'sql-agent-mcp',
      version: '1.0.0',
      description: 'PostgreSQL query executor for AI assistants',
    };
  }

  /**
   * List available tools (for MCP discovery)
   */
  listTools(): McpToolsListResponse {
    return {
      tools: SQL_AGENT_TOOLS.map(tool => ({
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema as Record<string, unknown>,
      })),
    };
  }

  /**
   * Handle incoming MCP requests
   */
  async handleRequest(request: unknown): Promise<unknown> {
    // Validate request structure
    if (!request || typeof request !== 'object') {
      return {
        error: {
          code: -32600,
          message: 'Invalid request',
        },
      };
    }

    const req = request as Record<string, unknown>;
    const method = req.method as string;
    const params = req.params as Record<string, unknown>;

    try {
      switch (method) {
        case 'initialize':
          return {
            serverInfo: this.getServerInfo(),
            capabilities: {
              tools: {},
            },
          };

        case 'tools/list':
          return this.listTools();

        case 'tools/call':
          if (!params || !params.name || !params.arguments) {
            throw new Error('Invalid tool call parameters');
          }

          return await this.handler.handleToolCall({
            tool: params.name as string,
            arguments: params.arguments as Record<string, unknown>,
          });

        default:
          return {
            error: {
              code: -32601,
              message: `Method not found: ${method}`,
            },
          };
      }
    } catch (error) {
      return {
        error: {
          code: -32603,
          message: error instanceof Error ? error.message : 'Internal error',
        },
      };
    }
  }

  /**
   * Start the MCP server (stdio mode)
   */
  async start(): Promise<void> {
    process.stdin.setEncoding('utf8');

    let buffer = '';

    process.stdin.on('data', async chunk => {
      buffer += chunk;

      // Look for complete JSON-RPC messages
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.trim()) {
          try {
            const request = JSON.parse(line);
            const response = await this.handleRequest(request);

            // Add JSON-RPC fields
            const jsonRpcResponse = {
              jsonrpc: '2.0',
              id: (request as Record<string, unknown>).id || null,
              ...(response as object),
            };

            process.stdout.write(JSON.stringify(jsonRpcResponse) + '\n');
          } catch (_error) {
            const errorResponse = {
              jsonrpc: '2.0',
              id: null,
              error: {
                code: -32700,
                message: 'Parse error',
              },
            };
            process.stdout.write(JSON.stringify(errorResponse) + '\n');
          }
        }
      }
    });

    process.stdin.on('end', () => {
      this.close();
    });
  }

  /**
   * Close the server and cleanup
   */
  async close(): Promise<void> {
    await this.handler.close();
  }
}

// Export everything needed for MCP
export { SQL_AGENT_TOOLS } from './tool-definition';
export { McpToolHandler } from './tool-handler';
export type { McpToolRequest, McpToolResponse } from './tool-handler';
