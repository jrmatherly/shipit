import 'reflect-metadata';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AddMarketplaceUseCase } from '@/application/use-cases/plugins/add-marketplace.use-case.js';
import type { IPluginMarketplaceService } from '@/application/ports/output/services/plugin-marketplace.interface.js';

describe('AddMarketplaceUseCase', () => {
  let useCase: AddMarketplaceUseCase;
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
    useCase = new AddMarketplaceUseCase(mockService);
  });

  it('should delegate to marketplaceService.addMarketplace', async () => {
    const result = await useCase.execute({ url: 'https://proxy.example.com/marketplace.json' });

    expect(mockService.addMarketplace).toHaveBeenCalledWith(
      'https://proxy.example.com/marketplace.json'
    );
    expect(result).toEqual({ success: true });
  });

  it('should propagate service errors', async () => {
    const error = new Error('add marketplace failed');
    (mockService.addMarketplace as ReturnType<typeof vi.fn>).mockRejectedValue(error);

    await expect(
      useCase.execute({ url: 'https://proxy.example.com/marketplace.json' })
    ).rejects.toThrow('add marketplace failed');
  });
});
