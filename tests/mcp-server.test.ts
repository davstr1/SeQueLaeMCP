import { SqlAgentMcpServer } from '../src/mcp';
import { McpToolHandler } from '../src/mcp/tool-handler';

// Mock the tool handler
jest.mock('../src/mcp/tool-handler');

describe('SqlAgentMcpServer', () => {
  let server: SqlAgentMcpServer;
  let mockHandler: jest.Mocked<McpToolHandler>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Create mock handler
    mockHandler = {
      handleToolCall: jest.fn(),
      close: jest.fn(),
    } as any;

    (McpToolHandler as jest.MockedClass<typeof McpToolHandler>).mockImplementation(
      () => mockHandler
    );

    server = new SqlAgentMcpServer();
  });

  describe('getServerInfo', () => {
    test('should return server information', () => {
      const info = server.getServerInfo();

      expect(info).toEqual({
        name: 'sequelae-mcp',
        version: '1.0.0',
        description: 'PostgreSQL query executor for AI assistants',
      });
    });
  });

  describe('listTools', () => {
    test('should return all available tools', () => {
      const response = server.listTools();

      expect(response.tools).toHaveLength(5);
      expect(response.tools.map(t => t.name)).toEqual([
        'sql_exec',
        'sql_file',
        'sql_schema',
        'sql_backup',
        'sql_health',
      ]);

      // Check first tool structure
      expect(response.tools[0]).toMatchObject({
        name: 'sql_exec',
        description: expect.any(String),
        inputSchema: {
          type: 'object',
          properties: expect.any(Object),
        },
      });
    });
  });

  describe('handleRequest', () => {
    test('should handle initialize request', async () => {
      const request = {
        method: 'initialize',
        params: {},
      };

      const response = await server.handleRequest(request);

      expect(response).toMatchObject({
        serverInfo: {
          name: 'sequelae-mcp',
          version: '1.0.0',
          description: 'PostgreSQL query executor for AI assistants',
        },
        capabilities: {
          tools: {},
        },
      });
    });

    test('should handle tools/list request', async () => {
      const request = {
        method: 'tools/list',
        params: {},
      };

      const response = await server.handleRequest(request);

      expect(response).toHaveProperty('tools');
      expect((response as any).tools).toHaveLength(5);
    });

    test('should handle tools/call request', async () => {
      const mockToolResponse = {
        content: [{ type: 'text' as const, text: 'Success' }],
      };
      mockHandler.handleToolCall.mockResolvedValue(mockToolResponse);

      const request = {
        method: 'tools/call',
        params: {
          name: 'sql_exec',
          arguments: { query: 'SELECT 1' },
        },
      };

      const response = await server.handleRequest(request);

      expect(mockHandler.handleToolCall).toHaveBeenCalledWith({
        tool: 'sql_exec',
        arguments: { query: 'SELECT 1' },
      });
      expect(response).toEqual(mockToolResponse);
    });

    test('should handle invalid tools/call parameters', async () => {
      const request = {
        method: 'tools/call',
        params: {
          // Missing required fields
        },
      };

      const response = await server.handleRequest(request);

      expect(response).toMatchObject({
        error: {
          code: -32603,
          message: 'Invalid tool call parameters',
        },
      });
    });

    test('should handle unknown method', async () => {
      const request = {
        method: 'unknown/method',
        params: {},
      };

      const response = await server.handleRequest(request);

      expect(response).toMatchObject({
        error: {
          code: -32601,
          message: 'Method not found: unknown/method',
        },
      });
    });

    test('should handle invalid request', async () => {
      const response = await server.handleRequest(null);

      expect(response).toMatchObject({
        error: {
          code: -32600,
          message: 'Invalid request',
        },
      });
    });

    test('should handle errors from tool handler', async () => {
      mockHandler.handleToolCall.mockRejectedValue(new Error('Database connection failed'));

      const request = {
        method: 'tools/call',
        params: {
          name: 'sql_exec',
          arguments: { query: 'SELECT 1' },
        },
      };

      const response = await server.handleRequest(request);

      expect(response).toMatchObject({
        error: {
          code: -32603,
          message: 'Database connection failed',
        },
      });
    });
  });

  describe('Rate limiting', () => {
    test('should enforce rate limits when configured', async () => {
      // Create server with rate limiting
      const rateLimitedServer = new SqlAgentMcpServer({
        maxRequests: 2,
        windowMs: 60000,
      });

      // Mock the handler
      const mockRateLimitedHandler = {
        handleToolCall: jest.fn().mockResolvedValue({
          content: [{ type: 'text' as const, text: 'Success' }],
        }),
        close: jest.fn(),
      } as any;
      (rateLimitedServer as any).handler = mockRateLimitedHandler;

      // First two requests should succeed
      for (let i = 0; i < 2; i++) {
        const response = await rateLimitedServer.handleRequest({
          method: 'tools/call',
          params: {
            name: 'sql_exec',
            arguments: { query: 'SELECT 1' },
          },
        });
        expect(response).not.toHaveProperty('error');
      }

      // Third request should be rate limited
      const response = await rateLimitedServer.handleRequest({
        method: 'tools/call',
        params: {
          name: 'sql_exec',
          arguments: { query: 'SELECT 1' },
        },
      });

      expect(response).toMatchObject({
        error: {
          code: -32000,
          message: 'Rate limit exceeded',
          data: {
            retryAfter: expect.any(Number),
            usage: expect.objectContaining({
              global: expect.objectContaining({
                used: 2,
                limit: 2,
              }),
            }),
          },
        },
      });

      await rateLimitedServer.close();
    });

    test('should not rate limit when not configured', async () => {
      // Mock successful response
      mockHandler.handleToolCall.mockResolvedValue({
        content: [{ type: 'text' as const, text: 'Success' }],
      });

      // Server without rate limiting (default behavior)
      const response = await server.handleRequest({
        method: 'tools/call',
        params: {
          name: 'sql_exec',
          arguments: { query: 'SELECT 1' },
        },
      });

      expect(mockHandler.handleToolCall).toHaveBeenCalled();
      expect(response).not.toHaveProperty('error');
    });
  });

  describe('start', () => {
    let mockStdin: any;
    let mockStdout: any;
    let stdinListeners: Record<string, (data: unknown) => void>;

    beforeEach(() => {
      stdinListeners = {};

      mockStdin = {
        setEncoding: jest.fn(),
        on: jest.fn((event, handler) => {
          stdinListeners[event] = handler;
        }),
      };

      mockStdout = {
        write: jest.fn(),
      };

      Object.defineProperty(process, 'stdin', {
        value: mockStdin,
        configurable: true,
      });

      Object.defineProperty(process, 'stdout', {
        value: mockStdout,
        configurable: true,
      });
    });

    test('should setup stdin/stdout for JSON-RPC communication', async () => {
      server.start();

      expect(mockStdin.setEncoding).toHaveBeenCalledWith('utf8');
      expect(mockStdin.on).toHaveBeenCalledWith('data', expect.any(Function));
      expect(mockStdin.on).toHaveBeenCalledWith('end', expect.any(Function));
    });

    test('should process JSON-RPC requests from stdin', async () => {
      server.start();

      const request = {
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/list',
        params: {},
      };

      // Simulate stdin data
      await stdinListeners['data'](JSON.stringify(request) + '\n');

      expect(mockStdout.write).toHaveBeenCalled();
      const response = JSON.parse(mockStdout.write.mock.calls[0][0]);

      expect(response).toMatchObject({
        jsonrpc: '2.0',
        id: 1,
        tools: expect.any(Array),
      });
    });

    test('should handle parse errors', async () => {
      server.start();

      // Send invalid JSON
      await stdinListeners['data']('invalid json\n');

      expect(mockStdout.write).toHaveBeenCalled();
      const response = JSON.parse(mockStdout.write.mock.calls[0][0]);

      expect(response).toMatchObject({
        jsonrpc: '2.0',
        id: null,
        error: {
          code: -32700,
          message: 'Parse error',
        },
      });
    });

    test('should close handler on stdin end', async () => {
      server.start();

      // Simulate stdin end
      await stdinListeners['end'](null);

      expect(mockHandler.close).toHaveBeenCalled();
    });
  });

  describe('close', () => {
    test('should close the handler', async () => {
      await server.close();

      expect(mockHandler.close).toHaveBeenCalled();
    });
  });
});
