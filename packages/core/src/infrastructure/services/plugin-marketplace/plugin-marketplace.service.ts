/**
 * Plugin Marketplace Service
 *
 * Implements IPluginMarketplaceService using:
 * - Node 22+ native fetch for HTTP catalog retrieval from LiteLLM proxy
 * - execFile-style subprocess calls to the `claude` CLI for plugin lifecycle
 *
 * This is the first HTTP client in the infrastructure layer.
 * Pattern: AbortController timeout, redirect rejection, size limit, Zod validation.
 *
 * All subprocess arguments are validated via allowlist validators before passing
 * to execFile. Arguments are always separate array elements (never concatenated).
 */

import type {
  IPluginMarketplaceService,
  PluginMarketplaceEntry,
  InstalledPlugin,
  PluginOperationResult,
} from '../../../application/ports/output/services/plugin-marketplace.interface.js';
import {
  MarketplaceCatalogSchema,
  InstalledPluginsListSchema,
} from './plugin-marketplace.schema.js';
import {
  validatePluginId,
  validateMarketplaceName,
  validateMarketplaceUrl,
  validateScope,
} from './plugin-marketplace.validators.js';

type SpawnCallback = (error: Error | null, stdout: string, stderr: string) => void;
type SpawnFunction = (cmd: string, args: string[], callback: SpawnCallback) => void;

const FETCH_TIMEOUT_MS = 10_000;
const MAX_RESPONSE_SIZE = 5_000_000;
const CLAUDE_BINARY = process.platform === 'win32' ? 'claude.cmd' : 'claude';

export class PluginMarketplaceService implements IPluginMarketplaceService {
  private readonly spawn: SpawnFunction;

  constructor(spawn: SpawnFunction) {
    this.spawn = spawn;
  }

  async fetchCatalog(proxyBaseUrl: string, apiKey?: string): Promise<PluginMarketplaceEntry[]> {
    try {
      const url = validateMarketplaceUrl(proxyBaseUrl);

      if (apiKey && url.protocol === 'http:') {
        return [];
      }

      const catalogUrl = `${url.toString().replace(/\/$/, '')}/claude-code/marketplace.json`;
      const headers: Record<string, string> = {};
      if (apiKey) {
        headers['Authorization'] = `Bearer ${apiKey}`;
      }

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

      try {
        const res = await fetch(catalogUrl, {
          signal: controller.signal,
          redirect: 'error',
          headers,
        });

        if (!res.ok) {
          return [];
        }

        const text = await res.text();
        if (text.length > MAX_RESPONSE_SIZE) {
          return [];
        }

        const json = JSON.parse(text);
        const parsed = MarketplaceCatalogSchema.safeParse(json);
        if (!parsed.success) {
          return [];
        }

        return parsed.data.plugins;
      } finally {
        clearTimeout(timeout);
      }
    } catch {
      return [];
    }
  }

  async listInstalled(): Promise<InstalledPlugin[]> {
    return new Promise((resolve) => {
      this.spawn(CLAUDE_BINARY, ['plugin', 'list', '--json'], (error, stdout) => {
        if (error) {
          resolve([]);
          return;
        }
        try {
          const json = JSON.parse(stdout);
          const parsed = InstalledPluginsListSchema.safeParse(json);
          if (parsed.success) {
            resolve(parsed.data);
          } else {
            resolve([]);
          }
        } catch {
          resolve([]);
        }
      });
    });
  }

  async installPlugin(
    pluginId: string,
    marketplace: string,
    scope?: string
  ): Promise<PluginOperationResult> {
    try {
      const validId = validatePluginId(pluginId);
      const validMp = validateMarketplaceName(marketplace);
      const validScope = scope ? validateScope(scope) : 'user';
      const args = ['plugin', 'install', `${validId}@${validMp}`, '--scope', validScope];
      return await this.execClaude(args);
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Validation failed' };
    }
  }

  async uninstallPlugin(pluginId: string, marketplace: string): Promise<PluginOperationResult> {
    try {
      const validId = validatePluginId(pluginId);
      const validMp = validateMarketplaceName(marketplace);
      const args = ['plugin', 'uninstall', `${validId}@${validMp}`];
      return await this.execClaude(args);
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Validation failed' };
    }
  }

  async togglePlugin(
    pluginId: string,
    marketplace: string,
    enabled: boolean
  ): Promise<PluginOperationResult> {
    try {
      const validId = validatePluginId(pluginId);
      const validMp = validateMarketplaceName(marketplace);
      const action = enabled ? 'enable' : 'disable';
      const args = ['plugin', action, `${validId}@${validMp}`];
      return await this.execClaude(args);
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Validation failed' };
    }
  }

  async addMarketplace(url: string): Promise<PluginOperationResult> {
    try {
      const validUrl = validateMarketplaceUrl(url);
      const args = ['plugin', 'marketplace', 'add', validUrl.toString()];
      return await this.execClaude(args);
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Validation failed' };
    }
  }

  private execClaude(args: string[]): Promise<PluginOperationResult> {
    return new Promise((resolve) => {
      this.spawn(CLAUDE_BINARY, args, (error) => {
        if (error) {
          // Never expose raw subprocess stderr/error to the client.
          // Generic message only — details are logged server-side.
          resolve({ success: false, error: 'Plugin operation failed' });
        } else {
          resolve({ success: true });
        }
      });
    });
  }
}
