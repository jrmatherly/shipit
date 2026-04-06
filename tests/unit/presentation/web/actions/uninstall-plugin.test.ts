import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockExecute = vi.fn();

vi.mock('@/lib/server-container', () => ({
  resolve: (token: string) => {
    if (token === 'UninstallPluginUseCase') return { execute: mockExecute };
    throw new Error(`Unknown token: ${token}`);
  },
}));

const { uninstallPluginAction } =
  await import('../../../../../src/presentation/web/app/actions/uninstall-plugin.js');

describe('uninstallPluginAction server action', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should resolve UninstallPluginUseCase by string token', async () => {
    mockExecute.mockResolvedValue({ success: true });

    const result = await uninstallPluginAction('superpowers', 'claude-plugins-official');

    expect(result).toEqual({ success: true });
    expect(mockExecute).toHaveBeenCalledWith({
      pluginId: 'superpowers',
      marketplace: 'claude-plugins-official',
    });
  });

  it('should return error on failure', async () => {
    mockExecute.mockRejectedValue(new Error('Plugin not found'));

    const result = await uninstallPluginAction('superpowers', 'claude-plugins-official');

    expect(result).toEqual({ success: false, error: 'Failed to uninstall plugin' });
    expect(result.error).not.toContain('Plugin not found');
  });

  it('should return error on non-Error throw', async () => {
    mockExecute.mockRejectedValue('unexpected');

    const result = await uninstallPluginAction('superpowers', 'claude-plugins-official');

    expect(result).toEqual({ success: false, error: 'Failed to uninstall plugin' });
  });
});
