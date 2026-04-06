/**
 * Fetch Plugin Catalog Use Case
 *
 * Retrieves the plugin marketplace catalog from the configured LiteLLM proxy
 * and merges it with the list of locally installed plugins.
 *
 * Business Rules:
 * - Reads proxy URL from settings via ISettingsReader
 * - If proxy not configured, returns empty catalog (not an error)
 * - Merges catalog entries with installed plugin state
 */

import { injectable, inject } from 'tsyringe';
import type { ISettingsReader } from '../../ports/output/services/settings-reader.interface.js';
import type {
  IPluginMarketplaceService,
  PluginMarketplaceEntry,
  InstalledPlugin,
} from '../../ports/output/services/plugin-marketplace.interface.js';

export interface FetchPluginCatalogResult {
  plugins: PluginMarketplaceEntry[];
  installedPlugins: InstalledPlugin[];
}

@injectable()
export class FetchPluginCatalogUseCase {
  constructor(
    @inject('ISettingsReader')
    private readonly settingsReader: ISettingsReader,
    @inject('IPluginMarketplaceService')
    private readonly marketplaceService: IPluginMarketplaceService
  ) {}

  async execute(): Promise<FetchPluginCatalogResult> {
    const settings = this.settingsReader.getSettings();

    const proxyUrl = settings?.litellmProxy?.baseUrl;
    if (!proxyUrl || !settings?.litellmProxy?.marketplaceEnabled) {
      return { plugins: [], installedPlugins: [] };
    }

    const apiKey = settings.litellmProxy.apiKey;
    const [plugins, installedPlugins] = await Promise.all([
      this.marketplaceService.fetchCatalog(proxyUrl, apiKey),
      this.marketplaceService.listInstalled(),
    ]);

    return { plugins, installedPlugins };
  }
}
