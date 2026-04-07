/**
 * Fetch MCP Server Tools Use Case
 *
 * Retrieves the list of MCP tools for a specific server from the configured
 * LiteLLM proxy via JSON-RPC (POST {proxyUrl}/{serverName}/mcp).
 *
 * Business Rules:
 * - Reads proxy URL from settings via ISettingsReader
 * - If proxy not configured, returns empty array
 * - Requires a server name to target a specific MCP server
 * - Delegates to IMcpServerBrowserService for HTTP retrieval
 */

import { injectable, inject } from 'tsyringe';
import type { ISettingsReader } from '../../ports/output/services/settings-reader.interface.js';
import type {
  IMcpServerBrowserService,
  McpToolInfo,
} from '../../ports/output/services/mcp-server-browser.interface.js';

export interface FetchMcpServerToolsInput {
  serverName: string;
}

export interface FetchMcpServerToolsResult {
  tools: McpToolInfo[];
}

@injectable()
export class FetchMcpServerToolsUseCase {
  constructor(
    @inject('ISettingsReader')
    private readonly settingsReader: ISettingsReader,
    @inject('IMcpServerBrowserService')
    private readonly browserService: IMcpServerBrowserService
  ) {}

  async execute(input: FetchMcpServerToolsInput): Promise<FetchMcpServerToolsResult> {
    const settings = this.settingsReader.getSettings();

    const proxyUrl = settings?.litellmProxy?.baseUrl;
    if (!proxyUrl || !input.serverName) {
      return { tools: [] };
    }

    const apiKey = settings.litellmProxy?.apiKey;
    const tools = await this.browserService.fetchTools(proxyUrl, input.serverName, apiKey);

    return { tools };
  }
}
