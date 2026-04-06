/**
 * Feature flags for the web UI.
 *
 * DB-primary resolution: reads from Settings.featureFlags when available,
 * falls back to NEXT_PUBLIC_ environment variables.
 * The debug flag is DB-only (no env var fallback).
 */

import { resolve } from '@/lib/server-container';
import type { LoadSettingsUseCase } from '@shipit-ai/core/application/use-cases/settings/load-settings.use-case';

function isEnabled(envVar: string | undefined): boolean {
  return envVar === 'true' || envVar === '1';
}

const ENV_FALLBACK_FLAGS = {
  skills: () => isEnabled(process.env.NEXT_PUBLIC_FLAG_SKILLS),
  envDeploy: () =>
    process.env.NEXT_PUBLIC_FLAG_ENV_DEPLOY !== undefined
      ? isEnabled(process.env.NEXT_PUBLIC_FLAG_ENV_DEPLOY)
      : true,
  debug: () => false,
  githubImport: () => false,
  adoptBranch: () => false,
  gitRebaseSync: () => false,
  reactFileManager: () => isEnabled(process.env.NEXT_PUBLIC_FLAG_REACT_FILE_MANAGER),
  plugins: () => false,
};

export interface FeatureFlagsState {
  skills: boolean;
  envDeploy: boolean;
  debug: boolean;
  githubImport: boolean;
  adoptBranch: boolean;
  gitRebaseSync: boolean;
  reactFileManager: boolean;
  plugins: boolean;
}

export async function getFeatureFlags(): Promise<FeatureFlagsState> {
  try {
    const useCase = resolve<LoadSettingsUseCase>('LoadSettingsUseCase');
    const settings = await useCase.execute();
    const flags = settings.featureFlags;
    if (flags) {
      return {
        skills: flags.skills,
        envDeploy: flags.envDeploy,
        debug: flags.debug,
        githubImport: flags.githubImport,
        adoptBranch: flags.adoptBranch,
        gitRebaseSync: flags.gitRebaseSync,
        reactFileManager: flags.reactFileManager,
        plugins: flags.plugins,
      };
    }
  } catch {
    // Settings not initialized (e.g., during build/SSG or client-side hydration)
  }

  return {
    skills: ENV_FALLBACK_FLAGS.skills(),
    envDeploy: ENV_FALLBACK_FLAGS.envDeploy(),
    debug: ENV_FALLBACK_FLAGS.debug(),
    githubImport: ENV_FALLBACK_FLAGS.githubImport(),
    adoptBranch: ENV_FALLBACK_FLAGS.adoptBranch(),
    gitRebaseSync: ENV_FALLBACK_FLAGS.gitRebaseSync(),
    reactFileManager: ENV_FALLBACK_FLAGS.reactFileManager(),
    plugins: ENV_FALLBACK_FLAGS.plugins(),
  };
}

/**
 * @deprecated Use getFeatureFlags() instead for DB-primary resolution.
 * Kept for backward compatibility during migration. Falls back to env vars only.
 */
export const featureFlags = {
  get skills() {
    return ENV_FALLBACK_FLAGS.skills();
  },
  get envDeploy() {
    return ENV_FALLBACK_FLAGS.envDeploy();
  },
  get debug() {
    return ENV_FALLBACK_FLAGS.debug();
  },
  get githubImport() {
    return ENV_FALLBACK_FLAGS.githubImport();
  },
  get adoptBranch() {
    return ENV_FALLBACK_FLAGS.adoptBranch();
  },
  get gitRebaseSync() {
    return ENV_FALLBACK_FLAGS.gitRebaseSync();
  },
  get reactFileManager() {
    return ENV_FALLBACK_FLAGS.reactFileManager();
  },
  get plugins() {
    return ENV_FALLBACK_FLAGS.plugins();
  },
} as const;
