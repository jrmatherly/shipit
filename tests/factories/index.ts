/**
 * Shared Test Factories
 *
 * Central export point for all test factory functions.
 * Import from this module to access mock builders for domain entities.
 *
 * Available factories:
 * - `createMockFeature(overrides?)` — Feature entity
 * - `createMockAgentRun(overrides?)` — AgentRun entity
 * - `createMockRepository(overrides?)` — Repository entity
 * - `createMockAgentSession(overrides?)` — AgentSession entity
 * - `createMockAgentSessionMessage(overrides?)` — AgentSessionMessage value object
 * - `createMockPluginMarketplaceEntry(overrides?)` — PluginMarketplaceEntry DTO
 * - `createMockInstalledPlugin(overrides?)` — InstalledPlugin DTO
 *
 * For Settings, use `createDefaultSettings()` from
 * `@/domain/factories/settings-defaults.factory.js`.
 *
 * @example
 * ```typescript
 * import { createMockFeature, createMockAgentRun } from '@tests/factories/index.js';
 * ```
 */

export { createMockFeature } from './feature.factory.js';
export { createMockAgentRun } from './agent-run.factory.js';
export { createMockRepository } from './repository.factory.js';
export { createMockAgentSession, createMockAgentSessionMessage } from './agent-session.factory.js';
export { createMockPluginMarketplaceEntry, createMockInstalledPlugin } from './plugin.factory.js';
