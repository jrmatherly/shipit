// @vitest-environment node

import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockExecute = vi.fn();

vi.mock('@/lib/server-container', () => ({
  resolve: () => ({ execute: mockExecute }),
}));

const { getFeatureFlags, featureFlags } =
  await import('../../../../../src/presentation/web/lib/feature-flags.js');

describe('getFeatureFlags', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.NEXT_PUBLIC_FLAG_SKILLS;
    delete process.env.NEXT_PUBLIC_FLAG_ENV_DEPLOY;
    delete process.env.NEXT_PUBLIC_FLAG_REACT_FILE_MANAGER;
  });

  it('returns DB values when settings has featureFlags', async () => {
    mockExecute.mockResolvedValue({
      featureFlags: {
        skills: true,
        envDeploy: false,
        debug: true,
        githubImport: false,
        adoptBranch: false,
        gitRebaseSync: false,
        reactFileManager: false,
      },
    });

    const flags = await getFeatureFlags();

    expect(flags.skills).toBe(true);
    expect(flags.envDeploy).toBe(false);
    expect(flags.debug).toBe(true);
    expect(flags.githubImport).toBe(false);
    expect(flags.adoptBranch).toBe(false);
    expect(flags.reactFileManager).toBe(false);
  });

  it('falls back to env vars when featureFlags is undefined', async () => {
    mockExecute.mockResolvedValue({});
    process.env.NEXT_PUBLIC_FLAG_SKILLS = 'true';
    process.env.NEXT_PUBLIC_FLAG_ENV_DEPLOY = '1';

    const flags = await getFeatureFlags();

    expect(flags.skills).toBe(true);
    expect(flags.envDeploy).toBe(true);
    expect(flags.debug).toBe(false);
    expect(flags.reactFileManager).toBe(false);
  });

  it('falls back to env vars when resolve throws', async () => {
    mockExecute.mockRejectedValue(new Error('Not available'));
    process.env.NEXT_PUBLIC_FLAG_SKILLS = 'true';

    const flags = await getFeatureFlags();

    expect(flags.skills).toBe(true);
    expect(flags.envDeploy).toBe(true);
    expect(flags.debug).toBe(false);
    expect(flags.reactFileManager).toBe(false);
  });

  it('defaults envDeploy to true when no settings and no env vars', async () => {
    mockExecute.mockRejectedValue(new Error('Not available'));
    delete process.env.NEXT_PUBLIC_FLAG_SKILLS;
    delete process.env.NEXT_PUBLIC_FLAG_ENV_DEPLOY;

    const flags = await getFeatureFlags();

    expect(flags.skills).toBe(false);
    expect(flags.envDeploy).toBe(true);
    expect(flags.debug).toBe(false);
    expect(flags.reactFileManager).toBe(false);
  });

  it('debug flag returns false when not in DB (no env var fallback)', async () => {
    mockExecute.mockResolvedValue({
      featureFlags: {
        skills: false,
        envDeploy: false,
        debug: false,
        githubImport: false,
        adoptBranch: false,
        gitRebaseSync: false,
        reactFileManager: false,
      },
    });

    const flags = await getFeatureFlags();

    expect(flags.debug).toBe(false);
  });

  it('returns reactFileManager from DB when settings exist', async () => {
    mockExecute.mockResolvedValue({
      featureFlags: { skills: false, envDeploy: false, debug: false, reactFileManager: true },
    });

    const flags = await getFeatureFlags();

    expect(flags.reactFileManager).toBe(true);
  });

  it('defaults reactFileManager to false when no settings and no env var', async () => {
    mockExecute.mockRejectedValue(new Error('Not available'));

    const flags = await getFeatureFlags();

    expect(flags.reactFileManager).toBe(false);
  });

  it('reactFileManager falls back to NEXT_PUBLIC_FLAG_REACT_FILE_MANAGER env var', async () => {
    mockExecute.mockRejectedValue(new Error('Not available'));
    process.env.NEXT_PUBLIC_FLAG_REACT_FILE_MANAGER = 'true';

    const flags = await getFeatureFlags();

    expect(flags.reactFileManager).toBe(true);
  });

  it('reactFileManager env var fallback accepts "1" as truthy', async () => {
    mockExecute.mockRejectedValue(new Error('Not available'));
    process.env.NEXT_PUBLIC_FLAG_REACT_FILE_MANAGER = '1';

    const flags = await getFeatureFlags();

    expect(flags.reactFileManager).toBe(true);
  });
});

describe('featureFlags (backward-compatible const)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('exposes skills via getter using env fallback', () => {
    process.env.NEXT_PUBLIC_FLAG_SKILLS = 'true';
    expect(featureFlags.skills).toBe(true);
  });

  it('exposes envDeploy via getter defaulting to true', () => {
    delete process.env.NEXT_PUBLIC_FLAG_ENV_DEPLOY;
    expect(featureFlags.envDeploy).toBe(true);
  });

  it('exposes debug via getter always returning false', () => {
    expect(featureFlags.debug).toBe(false);
  });

  it('exposes reactFileManager via getter using env fallback', () => {
    process.env.NEXT_PUBLIC_FLAG_REACT_FILE_MANAGER = '1';
    expect(featureFlags.reactFileManager).toBe(true);
  });
});
