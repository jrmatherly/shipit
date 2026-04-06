import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockExecute = vi.fn();

vi.mock('@/lib/server-container', () => ({
  resolve: (token: string) => {
    if (token === 'FetchPluginCatalogUseCase') return { execute: mockExecute };
    throw new Error(`Unknown token: ${token}`);
  },
}));

const { fetchPluginCatalogAction } =
  await import('../../../../../src/presentation/web/app/actions/fetch-plugin-catalog.js');

describe('fetchPluginCatalogAction server action', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should resolve FetchPluginCatalogUseCase by string token', async () => {
    const catalog = {
      plugins: [{ name: 'test-plugin', version: '1.0.0' }],
      installedPlugins: [
        { id: 'test-plugin@official', scope: 'user', version: '1.0.0', enabled: true },
      ],
    };
    mockExecute.mockResolvedValue(catalog);

    const result = await fetchPluginCatalogAction();

    expect(result).toEqual(catalog);
    expect(mockExecute).toHaveBeenCalledTimes(1);
  });

  it('should return empty catalog with error on failure', async () => {
    mockExecute.mockRejectedValue(new Error('Network timeout'));

    const result = await fetchPluginCatalogAction();

    expect(result.plugins).toEqual([]);
    expect(result.installedPlugins).toEqual([]);
    expect(result.error).toBe('Failed to fetch plugin catalog');
    expect(result.error).not.toContain('Network timeout');
  });

  it('should return empty catalog with error on non-Error throw', async () => {
    mockExecute.mockRejectedValue('unexpected failure');

    const result = await fetchPluginCatalogAction();

    expect(result).toEqual({
      plugins: [],
      installedPlugins: [],
      error: 'Failed to fetch plugin catalog',
    });
  });
});
