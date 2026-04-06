import 'reflect-metadata';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { InstallPluginUseCase } from '@/application/use-cases/plugins/install-plugin.use-case.js';
import type { IPluginMarketplaceService } from '@/application/ports/output/services/plugin-marketplace.interface.js';

describe('InstallPluginUseCase', () => {
  let useCase: InstallPluginUseCase;
  let mockService: IPluginMarketplaceService;

  beforeEach(() => {
    mockService = {
      fetchCatalog: vi.fn(),
      listInstalled: vi.fn(),
      installPlugin: vi.fn().mockResolvedValue({ success: true }),
      uninstallPlugin: vi.fn().mockResolvedValue({ success: true }),
      togglePlugin: vi.fn().mockResolvedValue({ success: true }),
      addMarketplace: vi.fn().mockResolvedValue({ success: true }),
    };
    useCase = new InstallPluginUseCase(mockService);
  });

  it('should delegate to marketplaceService.installPlugin', async () => {
    const result = await useCase.execute({ pluginId: 'test', marketplace: 'mp', scope: 'user' });

    expect(mockService.installPlugin).toHaveBeenCalledWith('test', 'mp', 'user');
    expect(result).toEqual({ success: true });
  });

  it('should propagate service errors', async () => {
    const error = new Error('install failed');
    (mockService.installPlugin as ReturnType<typeof vi.fn>).mockRejectedValue(error);

    await expect(useCase.execute({ pluginId: 'test', marketplace: 'mp' })).rejects.toThrow(
      'install failed'
    );
  });
});
