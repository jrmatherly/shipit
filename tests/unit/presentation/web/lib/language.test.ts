import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockExecute = vi.fn();

vi.mock('@/lib/server-container', () => ({
  resolve: () => ({ execute: mockExecute }),
}));

import { isRtlLanguage, getLanguagePreference } from '@/lib/language';

describe('isRtlLanguage', () => {
  it('returns true for Arabic', () => {
    expect(isRtlLanguage('ar')).toBe(true);
  });

  it('returns true for Hebrew', () => {
    expect(isRtlLanguage('he')).toBe(true);
  });

  it('returns false for English', () => {
    expect(isRtlLanguage('en')).toBe(false);
  });

  it('returns false for Russian', () => {
    expect(isRtlLanguage('ru')).toBe(false);
  });

  it('returns false for other LTR languages', () => {
    for (const lang of ['pt', 'es', 'fr', 'de']) {
      expect(isRtlLanguage(lang)).toBe(false);
    }
  });
});

describe('getLanguagePreference', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns language="en" and dir="ltr" when settings have English', async () => {
    mockExecute.mockResolvedValue({
      user: { preferredLanguage: 'en' },
    });

    const result = await getLanguagePreference();
    expect(result).toEqual({ language: 'en', dir: 'ltr' });
  });

  it('returns language="ar" and dir="rtl" when settings have Arabic', async () => {
    mockExecute.mockResolvedValue({
      user: { preferredLanguage: 'ar' },
    });

    const result = await getLanguagePreference();
    expect(result).toEqual({ language: 'ar', dir: 'rtl' });
  });

  it('returns language="he" and dir="rtl" when settings have Hebrew', async () => {
    mockExecute.mockResolvedValue({
      user: { preferredLanguage: 'he' },
    });

    const result = await getLanguagePreference();
    expect(result).toEqual({ language: 'he', dir: 'rtl' });
  });

  it('defaults to English when DI container throws', async () => {
    mockExecute.mockRejectedValue(new Error('Container not available'));

    const result = await getLanguagePreference();
    expect(result).toEqual({ language: 'en', dir: 'ltr' });
  });

  it('defaults to English when preferredLanguage is undefined', async () => {
    mockExecute.mockResolvedValue({
      user: { preferredLanguage: undefined },
    });

    const result = await getLanguagePreference();
    expect(result).toEqual({ language: 'en', dir: 'ltr' });
  });

  it('defaults to English when execute rejects (settings unavailable)', async () => {
    mockExecute.mockRejectedValue(new Error('DB not available'));

    const result = await getLanguagePreference();
    expect(result).toEqual({ language: 'en', dir: 'ltr' });
  });
});
