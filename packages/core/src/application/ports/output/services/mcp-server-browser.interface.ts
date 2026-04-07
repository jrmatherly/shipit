/**
 * MCP Server Browser Service Port
 *
 * Interface for browsing MCP servers and tools deployed on a LiteLLM proxy.
 * Read-only — no CRUD operations. All data comes from the proxy's public
 * hub endpoint and REST tools/list wrapper.
 *
 * NOTE: McpServerInfo and McpToolInfo are external DTOs (LiteLLM API response),
 * not ShipIT domain entities. Defining them as TS interfaces in the port is
 * consistent with PluginMarketplaceEntry, AvailableTerminalEntry patterns.
 */

export interface McpServerMcpInfo {
  server_name?: string;
  description?: string;
  mcp_server_cost_info?: Record<string, unknown>;
}

export interface McpServerInfo {
  server_id: string;
  name: string;
  alias?: string | null;
  server_name: string;
  url?: string;
  transport: string;
  spec_path?: string | null;
  auth_type?: string;
  mcp_info?: McpServerMcpInfo;
}

export interface McpToolInfo {
  name: string;
  title?: string;
  description?: string;
  inputSchema?: Record<string, unknown>;
}

export interface IMcpServerBrowserService {
  fetchServers(proxyBaseUrl: string, apiKey?: string): Promise<McpServerInfo[]>;
  fetchTools(proxyBaseUrl: string, apiKey?: string): Promise<McpToolInfo[]>;
}
