import 'reflect-metadata';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TogglePluginUseCase } from '@/application/use-cases/plugins/toggle-plugin.use-case.js';
import type { IPluginMarketplaceService } from '@/application/ports/output/services/plugin-marketplace.interface.js';

describe('TogglePluginUseCase', () => {
  let useCase: TogglePluginUseCase;
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
    useCase = new TogglePluginUseCase(mockService);
  });

  it('should delegate to marketplaceService.togglePlugin', async () => {
    const result = await useCase.execute({ pluginId: 'test', marketplace: 'mp', enabled: true });

    expect(mockService.togglePlugin).toHaveBeenCalledWith('test', 'mp', true);
    expect(result).toEqual({ success: true });
  });

  it('should propagate service errors', async () => {
    const error = new Error('toggle failed');
    (mockService.togglePlugin as ReturnType<typeof vi.fn>).mockRejectedValue(error);

    await expect(
      useCase.execute({ pluginId: 'test', marketplace: 'mp', enabled: false })
    ).rejects.toThrow('toggle failed');
  });
});
