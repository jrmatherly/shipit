// @vitest-environment node

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createDefaultSettings } from '@shipit-ai/core/domain/factories/settings-defaults.factory';

const mockExecute = vi.fn();
const mockResolve = vi.fn();

vi.mock('@/lib/server-container', () => ({
  resolve: (...args: unknown[]) => mockResolve(...args),
}));

vi.mock('@shipit-ai/core/application/use-cases/settings/load-settings.use-case', () => ({
  LoadSettingsUseCase: class LoadSettingsUseCase {},
}));

vi.mock('@shipit-ai/core/infrastructure/services/filesystem/shipit-ai-directory.service', () => ({
  getShipitAiHomeDir: () => '/home/user/.shipit-ai',
}));

vi.mock('node:fs', async () => {
  const { join } = await import('node:path');
  const expectedPath = join('/home/user/.shipit-ai', 'data');
  return {
    statSync: (path: string) => {
      if (path === expectedPath) {
        return { size: 2516582 }; // ~2.4 MB
      }
      throw new Error('ENOENT');
    },
  };
});

const { loadSettings } =
  await import('../../../../../src/presentation/web/app/actions/load-settings.js');

describe('loadSettings server action', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockResolve.mockReturnValue({ execute: mockExecute });
  });

  it('returns settings with shipitAiHome and dbFileSize', async () => {
    const settings = createDefaultSettings();
    mockExecute.mockResolvedValue(settings);

    const result = await loadSettings();

    expect(result.settings).toEqual(settings);
    expect(result.shipitAiHome).toBe('/home/user/.shipit-ai');
    expect(result.dbFileSize).toBe('2.4 MB');
    expect(result.error).toBeUndefined();
  });

  it('returns error when use case throws', async () => {
    mockExecute.mockRejectedValue(new Error('Settings not found'));

    const result = await loadSettings();

    expect(result.error).toBe('Settings not found');
    expect(result.settings).toBeUndefined();
  });

  it('handles unknown database file gracefully', async () => {
    const settings = createDefaultSettings();
    mockExecute.mockResolvedValue(settings);

    // Re-mock fs to simulate missing db file
    const fs = await import('node:fs');
    vi.spyOn(fs, 'statSync').mockImplementation(() => {
      throw new Error('ENOENT');
    });

    const result = await loadSettings();

    expect(result.settings).toEqual(settings);
    expect(result.dbFileSize).toBe('Unknown');
  });
});
