/**
 * Fetch MCP Servers Use Case
 *
 * Retrieves the list of MCP servers from the configured LiteLLM proxy's
 * public hub endpoint.
 *
 * Business Rules:
 * - Reads proxy URL from settings via ISettingsReader
 * - If proxy not configured or mcpServers flag disabled, returns empty array
 * - Delegates to IMcpServerBrowserService for HTTP retrieval
 */

import { injectable, inject } from 'tsyringe';
import type { ISettingsReader } from '../../ports/output/services/settings-reader.interface.js';
import type {
  IMcpServerBrowserService,
  McpServerInfo,
} from '../../ports/output/services/mcp-server-browser.interface.js';

export interface FetchMcpServersResult {
  servers: McpServerInfo[];
}

@injectable()
export class FetchMcpServersUseCase {
  constructor(
    @inject('ISettingsReader')
    private readonly settingsReader: ISettingsReader,
    @inject('IMcpServerBrowserService')
    private readonly browserService: IMcpServerBrowserService
  ) {}

  async execute(): Promise<FetchMcpServersResult> {
    const settings = this.settingsReader.getSettings();

    const proxyUrl = settings?.litellmProxy?.baseUrl;
    if (!proxyUrl) {
      return { servers: [] };
    }

    const apiKey = settings.litellmProxy?.apiKey;
    const servers = await this.browserService.fetchServers(proxyUrl, apiKey);

    return { servers };
  }
}
