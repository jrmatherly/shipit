/**
 * Plugin Test Factory
 *
 * Shared builder functions for creating plugin marketplace test fixtures.
 * These are external DTOs (not domain entities) matching LiteLLM and Claude CLI output.
 *
 * @example
 * ```typescript
 * const entry = createMockPluginMarketplaceEntry();
 * const installed = createMockInstalledPlugin({ enabled: false });
 * ```
 */

import type {
  PluginMarketplaceEntry,
  InstalledPlugin,
} from '@shipit-ai/core/application/ports/output/services/plugin-marketplace.interface';

export function createMockPluginMarketplaceEntry(
  overrides?: Partial<PluginMarketplaceEntry>
): PluginMarketplaceEntry {
  return {
    name: 'test-plugin',
    description: 'A test plugin for unit tests',
    version: '1.0.0',
    source: { source: 'github', repo: 'org/test-plugin' },
    category: 'productivity',
    keywords: ['test', 'automation'],
    ...overrides,
  };
}

export function createMockInstalledPlugin(overrides?: Partial<InstalledPlugin>): InstalledPlugin {
  return {
    id: 'test-plugin@test-marketplace',
    scope: 'user',
    version: '1.0.0',
    enabled: true,
    installedAt: '2026-04-01T00:00:00Z',
    ...overrides,
  };
}
