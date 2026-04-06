import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockExecute = vi.fn();

vi.mock('@/lib/server-container', () => ({
  resolve: (token: string) => {
    if (token === 'InstallPluginUseCase') return { execute: mockExecute };
    throw new Error(`Unknown token: ${token}`);
  },
}));

const { installPluginAction } =
  await import('../../../../../src/presentation/web/app/actions/install-plugin.js');

describe('installPluginAction server action', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should resolve InstallPluginUseCase by string token', async () => {
    mockExecute.mockResolvedValue({ success: true });

    const result = await installPluginAction('superpowers', 'claude-plugins-official');

    expect(result).toEqual({ success: true });
    expect(mockExecute).toHaveBeenCalledWith({
      pluginId: 'superpowers',
      marketplace: 'claude-plugins-official',
      scope: undefined,
    });
  });

  it('should pass scope when provided', async () => {
    mockExecute.mockResolvedValue({ success: true });

    await installPluginAction('superpowers', 'claude-plugins-official', 'project');

    expect(mockExecute).toHaveBeenCalledWith({
      pluginId: 'superpowers',
      marketplace: 'claude-plugins-official',
      scope: 'project',
    });
  });

  it('should return error on failure', async () => {
    mockExecute.mockRejectedValue(new Error('Permission denied'));

    const result = await installPluginAction('superpowers', 'claude-plugins-official');

    expect(result).toEqual({ success: false, error: 'Failed to install plugin' });
    expect(result.error).not.toContain('Permission denied');
  });

  it('should return error on non-Error throw', async () => {
    mockExecute.mockRejectedValue('unexpected');

    const result = await installPluginAction('superpowers', 'claude-plugins-official');

    expect(result).toEqual({ success: false, error: 'Failed to install plugin' });
  });
});
