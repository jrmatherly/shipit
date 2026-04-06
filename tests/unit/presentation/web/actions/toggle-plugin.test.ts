import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockExecute = vi.fn();

vi.mock('@/lib/server-container', () => ({
  resolve: (token: string) => {
    if (token === 'TogglePluginUseCase') return { execute: mockExecute };
    throw new Error(`Unknown token: ${token}`);
  },
}));

const { togglePluginAction } =
  await import('../../../../../src/presentation/web/app/actions/toggle-plugin.js');

describe('togglePluginAction server action', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should resolve TogglePluginUseCase by string token', async () => {
    mockExecute.mockResolvedValue({ success: true });

    const result = await togglePluginAction('superpowers', 'claude-plugins-official', true);

    expect(result).toEqual({ success: true });
    expect(mockExecute).toHaveBeenCalledWith({
      pluginId: 'superpowers',
      marketplace: 'claude-plugins-official',
      enabled: true,
    });
  });

  it('should pass enabled=false correctly', async () => {
    mockExecute.mockResolvedValue({ success: true });

    await togglePluginAction('superpowers', 'claude-plugins-official', false);

    expect(mockExecute).toHaveBeenCalledWith({
      pluginId: 'superpowers',
      marketplace: 'claude-plugins-official',
      enabled: false,
    });
  });

  it('should return error on failure', async () => {
    mockExecute.mockRejectedValue(new Error('Database write failed'));

    const result = await togglePluginAction('superpowers', 'claude-plugins-official', true);

    expect(result).toEqual({ success: false, error: 'Failed to toggle plugin' });
    expect(result.error).not.toContain('Database write failed');
  });

  it('should return error on non-Error throw', async () => {
    mockExecute.mockRejectedValue('unexpected');

    const result = await togglePluginAction('superpowers', 'claude-plugins-official', true);

    expect(result).toEqual({ success: false, error: 'Failed to toggle plugin' });
  });
});
