// @vitest-environment node

import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockLoadSettingsExecute = vi.fn();
const mockResolve = vi.fn();
const mockGetSupportedModels = vi.fn();

vi.mock('@/lib/server-container', () => ({
  resolve: (...args: unknown[]) => mockResolve(...args),
}));

const { getSupportedModels } =
  await import('../../../../../src/presentation/web/app/actions/get-supported-models.js');

describe('getSupportedModels server action', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockResolve.mockImplementation((token: string) => {
      if (token === 'LoadSettingsUseCase') return { execute: mockLoadSettingsExecute };
      if (token === 'IAgentExecutorFactory') return { getSupportedModels: mockGetSupportedModels };
      throw new Error(`Unknown token: ${token}`);
    });
  });

  it('calls getSupportedModels with the configured agent type', async () => {
    mockLoadSettingsExecute.mockResolvedValue({ agent: { type: 'claude-code' } });
    mockGetSupportedModels.mockReturnValue(['claude-opus-4-6', 'claude-sonnet-4-6']);

    const result = await getSupportedModels();

    expect(mockGetSupportedModels).toHaveBeenCalledWith('claude-code');
    expect(result).toEqual(['claude-opus-4-6', 'claude-sonnet-4-6']);
  });

  it('resolves IAgentExecutorFactory from the container', async () => {
    mockLoadSettingsExecute.mockResolvedValue({ agent: { type: 'gemini-cli' } });
    mockGetSupportedModels.mockReturnValue(['gemini-2.5-pro']);

    await getSupportedModels();

    expect(mockResolve).toHaveBeenCalledWith('IAgentExecutorFactory');
  });

  it('returns empty array when settings are not initialized', async () => {
    mockLoadSettingsExecute.mockRejectedValue(new Error('Settings not initialized'));

    const result = await getSupportedModels();

    expect(result).toEqual([]);
  });

  it('returns empty array when factory resolve fails', async () => {
    mockLoadSettingsExecute.mockResolvedValue({ agent: { type: 'claude-code' } });
    mockResolve.mockImplementation((token: string) => {
      if (token === 'LoadSettingsUseCase') return { execute: mockLoadSettingsExecute };
      throw new Error('DI container not available');
    });

    const result = await getSupportedModels();

    expect(result).toEqual([]);
  });

  it('passes gemini-cli agent type to factory correctly', async () => {
    mockLoadSettingsExecute.mockResolvedValue({ agent: { type: 'gemini-cli' } });
    mockGetSupportedModels.mockReturnValue(['gemini-3.1-pro', 'gemini-3-flash']);

    const result = await getSupportedModels();

    expect(mockGetSupportedModels).toHaveBeenCalledWith('gemini-cli');
    expect(result).toEqual(['gemini-3.1-pro', 'gemini-3-flash']);
  });

  it('passes cursor agent type to factory correctly', async () => {
    mockLoadSettingsExecute.mockResolvedValue({ agent: { type: 'cursor' } });
    mockGetSupportedModels.mockReturnValue(['claude-opus-4-6', 'gpt-5.4-high']);

    const result = await getSupportedModels();

    expect(mockGetSupportedModels).toHaveBeenCalledWith('cursor');
    expect(result).toEqual(['claude-opus-4-6', 'gpt-5.4-high']);
  });
});
