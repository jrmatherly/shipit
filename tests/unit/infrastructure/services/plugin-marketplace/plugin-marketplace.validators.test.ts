import { describe, it, expect } from 'vitest';
import {
  validatePluginId,
  validateMarketplaceUrl,
  validateScope,
} from '@/infrastructure/services/plugin-marketplace/plugin-marketplace.validators.js';

describe('Plugin Marketplace Validators', () => {
  describe('validatePluginId', () => {
    it('should accept valid plugin names', () => {
      expect(validatePluginId('my-plugin')).toBe('my-plugin');
      expect(validatePluginId('plugin_v2')).toBe('plugin_v2');
      expect(validatePluginId('SuperPlugin123')).toBe('SuperPlugin123');
      expect(validatePluginId('a')).toBe('a');
    });

    it('should reject empty string', () => {
      expect(() => validatePluginId('')).toThrow();
    });

    it('should reject names with spaces', () => {
      expect(() => validatePluginId('my plugin')).toThrow();
    });

    it('should reject names with special characters', () => {
      expect(() => validatePluginId('my;plugin')).toThrow();
      expect(() => validatePluginId('plugin$(cmd)')).toThrow();
      expect(() => validatePluginId('plugin&rm')).toThrow();
      expect(() => validatePluginId('plugin|cat')).toThrow();
      expect(() => validatePluginId('../etc/passwd')).toThrow();
    });

    it('should reject names exceeding max length', () => {
      expect(() => validatePluginId('a'.repeat(101))).toThrow();
    });
  });

  describe('validateMarketplaceUrl', () => {
    it('should accept valid http URLs', () => {
      const url = validateMarketplaceUrl('http://localhost:4000');
      expect(url.protocol).toBe('http:');
    });

    it('should accept valid https URLs', () => {
      const url = validateMarketplaceUrl('https://proxy.example.com');
      expect(url.protocol).toBe('https:');
    });

    it('should reject non-http schemes', () => {
      expect(() => validateMarketplaceUrl('ftp://example.com')).toThrow();
      expect(() => validateMarketplaceUrl('file:///etc/passwd')).toThrow();
      expect(() => validateMarketplaceUrl('javascript:alert(1)')).toThrow();
    });

    it('should reject invalid URLs', () => {
      expect(() => validateMarketplaceUrl('not-a-url')).toThrow();
      expect(() => validateMarketplaceUrl('')).toThrow();
    });

    it('should require HTTPS for non-localhost URLs', () => {
      expect(() => validateMarketplaceUrl('http://proxy.example.com')).toThrow();
    });

    it('should allow HTTP for localhost', () => {
      expect(() => validateMarketplaceUrl('http://localhost:4000')).not.toThrow();
      expect(() => validateMarketplaceUrl('http://127.0.0.1:4000')).not.toThrow();
    });
  });

  describe('validateScope', () => {
    it('should accept valid scopes', () => {
      expect(validateScope('user')).toBe('user');
      expect(validateScope('project')).toBe('project');
      expect(validateScope('local')).toBe('local');
    });

    it('should reject invalid scopes', () => {
      expect(() => validateScope('global')).toThrow();
      expect(() => validateScope('')).toThrow();
      expect(() => validateScope('system; rm -rf /')).toThrow();
    });
  });
});
