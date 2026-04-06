import 'reflect-metadata';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UninstallPluginUseCase } from '@/application/use-cases/plugins/uninstall-plugin.use-case.js';
import type { IPluginMarketplaceService } from '@/application/ports/output/services/plugin-marketplace.interface.js';

describe('UninstallPluginUseCase', () => {
  let useCase: UninstallPluginUseCase;
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
    useCase = new UninstallPluginUseCase(mockService);
  });

  it('should delegate to marketplaceService.uninstallPlugin', async () => {
    const result = await useCase.execute({ pluginId: 'test', marketplace: 'mp' });

    expect(mockService.uninstallPlugin).toHaveBeenCalledWith('test', 'mp');
    expect(result).toEqual({ success: true });
  });

  it('should propagate service errors', async () => {
    const error = new Error('uninstall failed');
    (mockService.uninstallPlugin as ReturnType<typeof vi.fn>).mockRejectedValue(error);

    await expect(useCase.execute({ pluginId: 'test', marketplace: 'mp' })).rejects.toThrow(
      'uninstall failed'
    );
  });
});
