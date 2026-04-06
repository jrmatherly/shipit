import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockExecute = vi.fn();

vi.mock('@/lib/server-container', () => ({
  resolve: (token: string) => {
    if (token === 'AddMarketplaceUseCase') return { execute: mockExecute };
    throw new Error(`Unknown token: ${token}`);
  },
}));

const { addMarketplaceAction } =
  await import('../../../../../src/presentation/web/app/actions/add-marketplace.js');

describe('addMarketplaceAction server action', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should resolve AddMarketplaceUseCase by string token', async () => {
    mockExecute.mockResolvedValue({ success: true });

    const result = await addMarketplaceAction('https://marketplace.example.com');

    expect(result).toEqual({ success: true });
    expect(mockExecute).toHaveBeenCalledWith({
      url: 'https://marketplace.example.com',
    });
  });

  it('should return error on failure', async () => {
    mockExecute.mockRejectedValue(new Error('Invalid URL'));

    const result = await addMarketplaceAction('https://bad.example.com');

    expect(result).toEqual({ success: false, error: 'Failed to add marketplace' });
    expect(result.error).not.toContain('Invalid URL');
  });

  it('should return error on non-Error throw', async () => {
    mockExecute.mockRejectedValue('unexpected');

    const result = await addMarketplaceAction('https://marketplace.example.com');

    expect(result).toEqual({ success: false, error: 'Failed to add marketplace' });
  });
});
