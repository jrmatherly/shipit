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
  /**
   * Fetch tools for a specific MCP server via JSON-RPC.
   *
   * LiteLLM exposes each MCP server at `{proxyBaseUrl}/{serverName}/mcp` and
   * accepts standard MCP JSON-RPC requests. This method POSTs a
   * `{"jsonrpc":"2.0","id":1,"method":"tools/list"}` body and parses the
   * `result.tools` array from the response.
   */
  fetchTools(proxyBaseUrl: string, serverName: string, apiKey?: string): Promise<McpToolInfo[]>;
}
