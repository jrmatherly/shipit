import { describe, it, expect } from 'vitest';
import {
  MarketplaceCatalogSchema,
  InstalledPluginSchema,
} from '@/infrastructure/services/plugin-marketplace/plugin-marketplace.schema.js';

describe('Plugin Marketplace Schemas', () => {
  describe('MarketplaceCatalogSchema', () => {
    it('should accept a valid catalog', () => {
      const result = MarketplaceCatalogSchema.safeParse({
        name: 'test-marketplace',
        plugins: [
          {
            name: 'my-plugin',
            source: { source: 'github', repo: 'org/my-plugin' },
            version: '1.0.0',
            description: 'A test plugin',
            category: 'productivity',
            keywords: ['test'],
          },
        ],
      });
      expect(result.success).toBe(true);
    });

    it('should accept a catalog with minimal plugin data', () => {
      const result = MarketplaceCatalogSchema.safeParse({
        name: 'minimal',
        plugins: [
          {
            name: 'bare-plugin',
            source: { source: 'url', url: 'https://github.com/org/plugin.git' },
          },
        ],
      });
      expect(result.success).toBe(true);
    });

    it('should accept a catalog with owner', () => {
      const result = MarketplaceCatalogSchema.safeParse({
        name: 'owned',
        owner: { name: 'Admin', email: 'admin@example.com' },
        plugins: [],
      });
      expect(result.success).toBe(true);
    });

    it('should reject a catalog without plugins array', () => {
      const result = MarketplaceCatalogSchema.safeParse({
        name: 'bad',
      });
      expect(result.success).toBe(false);
    });

    it('should reject a plugin with invalid source type', () => {
      const result = MarketplaceCatalogSchema.safeParse({
        name: 'bad',
        plugins: [
          {
            name: 'bad-plugin',
            source: { source: 'ftp', url: 'ftp://evil.com' },
          },
        ],
      });
      expect(result.success).toBe(false);
    });

    it('should truncate long names and descriptions', () => {
      const result = MarketplaceCatalogSchema.safeParse({
        name: 'truncation-test',
        plugins: [
          {
            name: 'a'.repeat(200),
            description: 'b'.repeat(3000),
            source: { source: 'github', repo: 'org/plugin' },
          },
        ],
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.plugins[0].name.length).toBeLessThanOrEqual(100);
        expect(result.data.plugins[0].description.length).toBeLessThanOrEqual(2000);
      }
    });
  });

  describe('InstalledPluginSchema', () => {
    it('should accept valid installed plugin data', () => {
      const result = InstalledPluginSchema.safeParse({
        id: 'my-plugin@marketplace',
        scope: 'user',
        version: '1.0.0',
        enabled: true,
        installedAt: '2026-01-01T00:00:00Z',
      });
      expect(result.success).toBe(true);
    });

    it('should accept minimal installed plugin data', () => {
      const result = InstalledPluginSchema.safeParse({
        id: 'plugin@mp',
        scope: 'project',
        enabled: false,
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid scope', () => {
      const result = InstalledPluginSchema.safeParse({
        id: 'plugin',
        scope: 'global',
        enabled: true,
      });
      expect(result.success).toBe(false);
    });
  });
});
