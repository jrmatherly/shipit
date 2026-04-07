import 'reflect-metadata';
import { describe, it, expect, vi } from 'vitest';
import { FetchMcpServersUseCase } from '@shipit-ai/core/application/use-cases/mcp-servers/fetch-mcp-servers.use-case';
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
    fetchServers: vi.fn().mockResolvedValue([
      {
        server_id: 'test-id',
        name: 'test-server',
        server_name: 'test-server',
        transport: 'http',
      },
    ]),
    fetchTools: vi.fn().mockResolvedValue([]),
  };
}

describe('FetchMcpServersUseCase', () => {
  it('returns empty when proxy not configured', async () => {
    const reader = createMockSettingsReader();
    const service = createMockBrowserService();

    const useCase = new FetchMcpServersUseCase(reader, service);
    const result = await useCase.execute();

    expect(result.servers).toEqual([]);
    expect(service.fetchServers).not.toHaveBeenCalled();
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

    const useCase = new FetchMcpServersUseCase(reader, service);
    const result = await useCase.execute();

    expect(service.fetchServers).toHaveBeenCalledWith('http://localhost:4000', 'sk-key');
    expect(result.servers).toHaveLength(1);
    expect(result.servers[0].name).toBe('test-server');
  });

  it('passes undefined apiKey when not set', async () => {
    const reader = createMockSettingsReader({
      litellmProxy: {
        baseUrl: 'http://localhost:4000',
        marketplaceEnabled: true,
      },
    });
    const service = createMockBrowserService();

    const useCase = new FetchMcpServersUseCase(reader, service);
    await useCase.execute();

    expect(service.fetchServers).toHaveBeenCalledWith('http://localhost:4000', undefined);
  });
});
