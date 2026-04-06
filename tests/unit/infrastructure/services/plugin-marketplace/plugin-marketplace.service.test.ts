import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PluginMarketplaceService } from '@/infrastructure/services/plugin-marketplace/plugin-marketplace.service.js';

describe('PluginMarketplaceService', () => {
  let service: PluginMarketplaceService;
  const mockSpawn = vi.fn();

  beforeEach(() => {
    service = new PluginMarketplaceService(mockSpawn);
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('fetchCatalog', () => {
    it('should fetch and validate a catalog', async () => {
      const catalog = {
        name: 'test-marketplace',
        plugins: [
          {
            name: 'test-plugin',
            description: 'A test plugin',
            source: { source: 'github', repo: 'org/test-plugin' },
          },
        ],
      };
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          text: () => Promise.resolve(JSON.stringify(catalog)),
        })
      );

      const result = await service.fetchCatalog('http://localhost:4000');
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('test-plugin');

      vi.unstubAllGlobals();
    });

    it('should return empty array on fetch error', async () => {
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('ECONNREFUSED')));

      const result = await service.fetchCatalog('http://localhost:4000');
      expect(result).toEqual([]);

      vi.unstubAllGlobals();
    });

    it('should return empty array on invalid JSON', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          text: () => Promise.resolve('<html>502 Bad Gateway</html>'),
        })
      );

      const result = await service.fetchCatalog('http://localhost:4000');
      expect(result).toEqual([]);

      vi.unstubAllGlobals();
    });

    it('should return empty array on non-ok response', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: false,
          status: 500,
          text: () => Promise.resolve('Internal Server Error'),
        })
      );

      const result = await service.fetchCatalog('http://localhost:4000');
      expect(result).toEqual([]);

      vi.unstubAllGlobals();
    });

    it('should reject oversized responses', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          text: () => Promise.resolve('x'.repeat(5_000_001)),
        })
      );

      const result = await service.fetchCatalog('http://localhost:4000');
      expect(result).toEqual([]);

      vi.unstubAllGlobals();
    });

    it('should pass API key as Authorization header', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(JSON.stringify({ name: 'mp', plugins: [] })),
      });
      vi.stubGlobal('fetch', mockFetch);

      await service.fetchCatalog('https://proxy.example.com', 'sk-test-key');
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer sk-test-key',
          }),
        })
      );

      vi.unstubAllGlobals();
    });

    it('should reject API key over HTTP', async () => {
      const result = await service.fetchCatalog('http://localhost:4000', 'sk-test-key');
      expect(result).toEqual([]);
    });
  });

  describe('listInstalled', () => {
    it('should parse installed plugins from CLI output', async () => {
      mockSpawn.mockImplementation(
        (
          _cmd: string,
          _args: string[],
          callback: (error: Error | null, stdout: string, stderr: string) => void
        ) => {
          callback(null, JSON.stringify([{ id: 'plugin@mp', scope: 'user', enabled: true }]), '');
        }
      );

      const result = await service.listInstalled();
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('plugin@mp');
    });

    it('should return empty array on CLI error', async () => {
      mockSpawn.mockImplementation(
        (
          _cmd: string,
          _args: string[],
          callback: (error: Error | null, stdout: string, stderr: string) => void
        ) => {
          callback(new Error('ENOENT'), '', 'command not found');
        }
      );

      const result = await service.listInstalled();
      expect(result).toEqual([]);
    });
  });

  describe('installPlugin', () => {
    it('should call execFile with correct arguments', async () => {
      mockSpawn.mockImplementation(
        (
          _cmd: string,
          _args: string[],
          callback: (error: Error | null, stdout: string, stderr: string) => void
        ) => {
          callback(null, 'Installed successfully', '');
        }
      );

      const result = await service.installPlugin('my-plugin', 'test-mp', 'user');
      expect(result.success).toBe(true);
      expect(mockSpawn).toHaveBeenCalledWith(
        expect.stringContaining('claude'),
        ['plugin', 'install', 'my-plugin@test-mp', '--scope', 'user'],
        expect.any(Function)
      );
    });

    it('should reject invalid plugin ID', async () => {
      const result = await service.installPlugin('evil;rm -rf /', 'mp');
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle CLI failure', async () => {
      mockSpawn.mockImplementation(
        (
          _cmd: string,
          _args: string[],
          callback: (error: Error | null, stdout: string, stderr: string) => void
        ) => {
          callback(new Error('exit code 1'), '', 'Plugin not found');
        }
      );

      const result = await service.installPlugin('missing-plugin', 'mp');
      expect(result.success).toBe(false);
    });
  });

  describe('uninstallPlugin', () => {
    it('should call execFile with correct arguments', async () => {
      mockSpawn.mockImplementation(
        (
          _cmd: string,
          _args: string[],
          callback: (error: Error | null, stdout: string, stderr: string) => void
        ) => {
          callback(null, 'Uninstalled', '');
        }
      );

      const result = await service.uninstallPlugin('my-plugin', 'test-mp');
      expect(result.success).toBe(true);
      expect(mockSpawn).toHaveBeenCalledWith(
        expect.stringContaining('claude'),
        ['plugin', 'uninstall', 'my-plugin@test-mp'],
        expect.any(Function)
      );
    });
  });

  describe('togglePlugin', () => {
    it('should call enable for enabled=true', async () => {
      mockSpawn.mockImplementation(
        (
          _cmd: string,
          _args: string[],
          callback: (error: Error | null, stdout: string, stderr: string) => void
        ) => {
          callback(null, 'Enabled', '');
        }
      );

      const result = await service.togglePlugin('my-plugin', 'test-mp', true);
      expect(result.success).toBe(true);
      expect(mockSpawn).toHaveBeenCalledWith(
        expect.stringContaining('claude'),
        ['plugin', 'enable', 'my-plugin@test-mp'],
        expect.any(Function)
      );
    });

    it('should call disable for enabled=false', async () => {
      mockSpawn.mockImplementation(
        (
          _cmd: string,
          _args: string[],
          callback: (error: Error | null, stdout: string, stderr: string) => void
        ) => {
          callback(null, 'Disabled', '');
        }
      );

      const result = await service.togglePlugin('my-plugin', 'test-mp', false);
      expect(result.success).toBe(true);
      expect(mockSpawn).toHaveBeenCalledWith(
        expect.stringContaining('claude'),
        ['plugin', 'disable', 'my-plugin@test-mp'],
        expect.any(Function)
      );
    });
  });

  describe('addMarketplace', () => {
    it('should call execFile with validated URL', async () => {
      mockSpawn.mockImplementation(
        (
          _cmd: string,
          _args: string[],
          callback: (error: Error | null, stdout: string, stderr: string) => void
        ) => {
          callback(null, 'Added', '');
        }
      );

      const result = await service.addMarketplace(
        'https://proxy.example.com/claude-code/marketplace.json'
      );
      expect(result.success).toBe(true);
      expect(mockSpawn).toHaveBeenCalledWith(
        expect.stringContaining('claude'),
        ['plugin', 'marketplace', 'add', 'https://proxy.example.com/claude-code/marketplace.json'],
        expect.any(Function)
      );
    });

    it('should reject invalid URL scheme', async () => {
      const result = await service.addMarketplace('ftp://evil.com');
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });
});
