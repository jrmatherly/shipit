/**
 * Plugin Marketplace Service Port
 *
 * Interface for browsing and managing Claude Code plugins via a LiteLLM
 * proxy marketplace. All lifecycle operations delegate to the `claude` CLI.
 *
 * NOTE: PluginMarketplaceEntry and InstalledPlugin are external DTOs
 * (LiteLLM API response + Claude CLI output), not ShipIT domain entities.
 * Defining them as TS interfaces in the port is consistent with
 * AvailableTerminalEntry, AvailableEditorEntry patterns.
 */

export interface PluginSource {
  source: 'github' | 'url' | 'git-subdir';
  repo?: string;
  url?: string;
  path?: string;
}

export interface PluginMarketplaceEntry {
  name: string;
  description: string;
  version?: string;
  source: PluginSource;
  category?: string;
  keywords?: string[];
}

export interface InstalledPlugin {
  /** e.g., "superpowers@claude-plugins-official" */
  id: string;
  scope: 'user' | 'project' | 'local';
  version?: string;
  enabled: boolean;
  installedAt?: string;
}

export interface PluginOperationResult {
  success: boolean;
  error?: string;
}

export interface IPluginMarketplaceService {
  fetchCatalog(proxyBaseUrl: string, apiKey?: string): Promise<PluginMarketplaceEntry[]>;
  listInstalled(): Promise<InstalledPlugin[]>;
  installPlugin(
    pluginId: string,
    marketplace: string,
    scope?: string
  ): Promise<PluginOperationResult>;
  uninstallPlugin(pluginId: string, marketplace: string): Promise<PluginOperationResult>;
  togglePlugin(
    pluginId: string,
    marketplace: string,
    enabled: boolean
  ): Promise<PluginOperationResult>;
  addMarketplace(url: string): Promise<PluginOperationResult>;
}
