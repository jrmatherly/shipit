import 'reflect-metadata';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FetchPluginCatalogUseCase } from '@/application/use-cases/plugins/fetch-plugin-catalog.use-case.js';
import type { ISettingsReader } from '@/application/ports/output/services/settings-reader.interface.js';
import type { IPluginMarketplaceService } from '@/application/ports/output/services/plugin-marketplace.interface.js';
import { createDefaultSettings } from '@/domain/factories/settings-defaults.factory.js';

describe('FetchPluginCatalogUseCase', () => {
  let useCase: FetchPluginCatalogUseCase;
  let mockSettingsReader: ISettingsReader;
  let mockMarketplaceService: IPluginMarketplaceService;

  beforeEach(() => {
    mockMarketplaceService = {
      fetchCatalog: vi.fn().mockResolvedValue([
        {
          name: 'test-plugin',
          description: 'A test',
          source: { source: 'github', repo: 'org/test' },
        },
      ]),
      listInstalled: vi
        .fn()
        .mockResolvedValue([{ id: 'test-plugin@mp', scope: 'user', enabled: true }]),
      installPlugin: vi.fn(),
      uninstallPlugin: vi.fn(),
      togglePlugin: vi.fn(),
      addMarketplace: vi.fn(),
    };

    const settings = {
      ...createDefaultSettings(),
      litellmProxy: {
        baseUrl: 'http://localhost:4000',
        marketplaceEnabled: true,
      },
    };

    mockSettingsReader = {
      getSettings: vi.fn().mockReturnValue(settings),
      hasSettings: vi.fn().mockReturnValue(true),
    };

    useCase = new FetchPluginCatalogUseCase(mockSettingsReader, mockMarketplaceService);
  });

  it('should fetch catalog and installed plugins', async () => {
    const result = await useCase.execute();
    expect(result.plugins).toHaveLength(1);
    expect(result.plugins[0].name).toBe('test-plugin');
    expect(result.installedPlugins).toHaveLength(1);
    expect(result.installedPlugins[0].id).toBe('test-plugin@mp');
  });

  it('should return empty when proxy not configured', async () => {
    (mockSettingsReader.getSettings as ReturnType<typeof vi.fn>).mockReturnValue(
      createDefaultSettings()
    );

    const result = await useCase.execute();
    expect(result.plugins).toEqual([]);
    expect(result.installedPlugins).toEqual([]);
    expect(mockMarketplaceService.fetchCatalog).not.toHaveBeenCalled();
  });

  it('should return empty when marketplace not enabled', async () => {
    const settings = {
      ...createDefaultSettings(),
      litellmProxy: {
        baseUrl: 'http://localhost:4000',
        marketplaceEnabled: false,
      },
    };
    (mockSettingsReader.getSettings as ReturnType<typeof vi.fn>).mockReturnValue(settings);

    const result = await useCase.execute();
    expect(result.plugins).toEqual([]);
    expect(result.installedPlugins).toEqual([]);
  });

  it('should pass API key to fetchCatalog', async () => {
    const settings = {
      ...createDefaultSettings(),
      litellmProxy: {
        baseUrl: 'https://proxy.example.com',
        apiKey: 'sk-test',
        marketplaceEnabled: true,
      },
    };
    (mockSettingsReader.getSettings as ReturnType<typeof vi.fn>).mockReturnValue(settings);

    await useCase.execute();
    expect(mockMarketplaceService.fetchCatalog).toHaveBeenCalledWith(
      'https://proxy.example.com',
      'sk-test'
    );
  });
});
