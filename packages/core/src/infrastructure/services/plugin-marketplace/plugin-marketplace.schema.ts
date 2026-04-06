/**
 * Zod Schemas for Plugin Marketplace Data Validation
 *
 * Validates all external data boundaries:
 * 1. LiteLLM proxy marketplace.json response
 * 2. `claude plugin list --json` CLI output
 *
 * All data from external sources is untrusted. Strings are capped
 * to prevent excessive memory use in UI rendering.
 */

import { z } from 'zod';

const PluginSourceSchema = z.object({
  source: z.enum(['github', 'url', 'git-subdir']),
  repo: z.string().optional(),
  url: z.string().optional(),
  path: z.string().optional(),
});

const PluginEntrySchema = z.object({
  name: z.string().transform((s) => s.slice(0, 100)),
  description: z
    .string()
    .default('')
    .transform((s) => s.slice(0, 2000)),
  version: z.string().optional(),
  source: PluginSourceSchema,
  category: z.string().optional(),
  keywords: z.array(z.string()).optional(),
});

export const MarketplaceCatalogSchema = z.object({
  name: z.string(),
  owner: z
    .object({
      name: z.string(),
      email: z.string(),
    })
    .optional(),
  plugins: z.array(PluginEntrySchema),
});

export const InstalledPluginSchema = z.object({
  id: z.string(),
  scope: z.enum(['user', 'project', 'local']),
  version: z.string().optional(),
  enabled: z.boolean(),
  installedAt: z.string().optional(),
});

export const InstalledPluginsListSchema = z.array(InstalledPluginSchema);

export type MarketplaceCatalog = z.infer<typeof MarketplaceCatalogSchema>;
export type ValidatedPluginEntry = z.infer<typeof PluginEntrySchema>;
