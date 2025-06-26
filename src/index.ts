/**
 * Main export for sequelae-mcp npm package
 */

// Export MCP server and related types
export { SqlAgentMcpServer } from './mcp';
export { SQL_AGENT_TOOLS, getToolDefinition, validateToolInput } from './mcp/tool-definition';
export { McpToolHandler, McpToolRequest, McpToolResponse } from './mcp/tool-handler';
export type { McpToolDefinition, McpPropertySchema } from './mcp/tool-definition';
export type { McpServerInfo, McpToolsListResponse } from './mcp';

// Export SQL executor
export { SqlExecutor } from './core/sql-executor';
export type {
  QueryResult,
  SchemaResult,
  TableInfo,
  ColumnInfo,
  ConstraintInfo,
  MissingTableInfo,
} from './core/sql-executor';

// Export backup types
export type { BackupOptions, BackupResult } from './types/backup';

// Export CLI utilities (for programmatic use)
export { main as runCli } from './cli';
