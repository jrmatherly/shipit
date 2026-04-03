// @vitest-environment node

import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockResetSettings = vi.fn();
const mockInitializeSettings = vi.fn();
const mockLoadExecute = vi.fn();
const mockUpdateExecute = vi.fn();

vi.mock('@shipit-ai/core/infrastructure/services/settings.service', () => ({
  resetSettings: mockResetSettings,
  initializeSettings: mockInitializeSettings,
}));

vi.mock('@/lib/server-container', () => ({
  resolve: (token: string) => {
    if (token === 'LoadSettingsUseCase') return { execute: mockLoadExecute };
    if (token === 'UpdateSettingsUseCase') return { execute: mockUpdateExecute };
    throw new Error(`Unknown token: ${token}`);
  },
}));

const { updateModel } =
  await import('../../../../../src/presentation/web/app/actions/update-model.js');

const baseSettings = {
  id: 'settings-1',
  models: { default: 'claude-sonnet-4-6' },
  agent: { type: 'claude-code' },
};

describe('updateModel server action', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLoadExecute.mockResolvedValue(baseSettings);
    mockUpdateExecute.mockResolvedValue(undefined);
  });

  it('persists the new model via UpdateSettingsUseCase', async () => {
    const result = await updateModel('claude-opus-4-6');

    expect(mockUpdateExecute).toHaveBeenCalledWith({
      ...baseSettings,
      models: { default: 'claude-opus-4-6' },
    });
    expect(result).toEqual({ ok: true });
  });

  it('refreshes the in-memory settings singleton after persisting', async () => {
    await updateModel('claude-haiku-4-5');

    expect(mockResetSettings).toHaveBeenCalled();
    expect(mockInitializeSettings).toHaveBeenCalledWith({
      ...baseSettings,
      models: { default: 'claude-haiku-4-5' },
    });
  });

  it('loads current settings via LoadSettingsUseCase before updating', async () => {
    await updateModel('claude-opus-4-6');

    expect(mockLoadExecute).toHaveBeenCalled();
  });

  it('returns error when model is empty string', async () => {
    const result = await updateModel('');

    expect(mockUpdateExecute).not.toHaveBeenCalled();
    expect(result).toEqual({ ok: false, error: 'model is required' });
  });

  it('returns error when model is whitespace only', async () => {
    const result = await updateModel('   ');

    expect(mockUpdateExecute).not.toHaveBeenCalled();
    expect(result).toEqual({ ok: false, error: 'model is required' });
  });

  it('returns error when use case throws', async () => {
    mockUpdateExecute.mockRejectedValue(new Error('DB write failed'));

    const result = await updateModel('claude-opus-4-6');

    expect(result).toEqual({ ok: false, error: 'DB write failed' });
  });

  it('returns fallback error message when non-Error is thrown', async () => {
    mockUpdateExecute.mockRejectedValue('unexpected');

    const result = await updateModel('claude-opus-4-6');

    expect(result).toEqual({ ok: false, error: 'Failed to update model' });
  });

  it('trims whitespace from the model value before persisting', async () => {
    await updateModel('  claude-opus-4-6  ');

    expect(mockUpdateExecute).toHaveBeenCalledWith(
      expect.objectContaining({ models: { default: 'claude-opus-4-6' } })
    );
  });
});
