import 'reflect-metadata';
import { describe, it, expect, vi } from 'vitest';
import { FetchMcpServerToolsUseCase } from '@shipit-ai/core/application/use-cases/mcp-servers/fetch-mcp-server-tools.use-case';
import type { ISettingsReader } from '@shipit-ai/core/application/ports/output/services/settings-reader.interface';
import type { IMcpServerBrowserService } from '@shipit-ai/core/application/ports/output/services/mcp-server-browser.interface';
import { createDefaultSettings } from '@shipit-ai/core/domain/factories/settings-defaults.factory';

function createMockSettingsReader(
  overrides?: Partial<ReturnType<typeof createDefaultSettings>>
): ISettingsReader {
  const settings = { ...createDefaultSettings(), ...overrides };
  return {
    getSettings: () => settings,
    hasSettings: () => true,
  };
}

function createMockBrowserService(): IMcpServerBrowserService {
  return {
    fetchServers: vi.fn().mockResolvedValue([]),
    fetchTools: vi.fn().mockResolvedValue([
      { name: 'server-tool1', description: 'Tool 1' },
      { name: 'server-tool2', description: 'Tool 2' },
    ]),
  };
}

describe('FetchMcpServerToolsUseCase', () => {
  it('returns empty when proxy not configured', async () => {
    const reader = createMockSettingsReader();
    const service = createMockBrowserService();

    const useCase = new FetchMcpServerToolsUseCase(reader, service);
    const result = await useCase.execute();

    expect(result.tools).toEqual([]);
    expect(service.fetchTools).not.toHaveBeenCalled();
  });

  it('delegates to service with correct args when proxy configured', async () => {
    const reader = createMockSettingsReader({
      litellmProxy: {
        baseUrl: 'http://localhost:4000',
        apiKey: 'sk-key',
        marketplaceEnabled: true,
      },
    });
    const service = createMockBrowserService();

    const useCase = new FetchMcpServerToolsUseCase(reader, service);
    const result = await useCase.execute();

    expect(service.fetchTools).toHaveBeenCalledWith('http://localhost:4000', 'sk-key');
    expect(result.tools).toHaveLength(2);
  });

  it('returns empty when proxy URL is empty string', async () => {
    const reader = createMockSettingsReader({
      litellmProxy: {
        baseUrl: '',
        apiKey: 'sk-key',
        marketplaceEnabled: true,
      },
    });
    const service = createMockBrowserService();

    const useCase = new FetchMcpServerToolsUseCase(reader, service);
    const result = await useCase.execute();

    expect(result.tools).toEqual([]);
  });
});
