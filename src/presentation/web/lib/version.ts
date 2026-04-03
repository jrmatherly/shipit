/**
 * Version Information Helpers
 *
 * Provides version and system info for the Web UI.
 * Reads the version from the DI container's VersionService — the same source
 * used by `shep --version`. Falls back to NEXT_PUBLIC_* env vars if the
 * container is unavailable.
 *
 * The VersionInfo shape mirrors src/domain/value-objects/version-info.ts
 * from the CLI domain layer.
 */

import { arch, platform } from 'node:os';

import { resolve } from '@/lib/server-container';
import type { IVersionService } from '@shipit-ai/core/application/ports/output/services/version-service.interface';

/** Version information for the package (mirrors domain VersionInfo) */
export interface VersionInfo {
  version: string;
  name: string;
  description: string;
  branch: string;
  commitHash: string;
}

/** System runtime information */
export interface SystemInfo {
  nodeVersion: string;
  platform: string;
  arch: string;
}

/**
 * Get version info from the DI container's VersionService.
 * Falls back to env vars if the container is unavailable.
 */
export function getVersionInfo(): VersionInfo {
  try {
    const versionService = resolve<IVersionService>('IVersionService');
    const { version, name, description } = versionService.getVersion();
    return {
      version,
      name,
      description,
      branch: process.env.NEXT_PUBLIC_SHIPIT_AI_BRANCH ?? '',
      commitHash: process.env.NEXT_PUBLIC_SHIPIT_AI_COMMIT ?? '',
    };
  } catch {
    return {
      version: process.env.NEXT_PUBLIC_SHIPIT_AI_VERSION ?? 'unknown',
      name: process.env.NEXT_PUBLIC_SHIPIT_AI_PACKAGE_NAME ?? '@shipit-ai/cli',
      description:
        process.env.NEXT_PUBLIC_SHIPIT_AI_DESCRIPTION ?? 'Autonomous AI Native SDLC Platform',
      branch: process.env.NEXT_PUBLIC_SHIPIT_AI_BRANCH ?? '',
      commitHash: process.env.NEXT_PUBLIC_SHIPIT_AI_COMMIT ?? '',
    };
  }
}

/**
 * Get system runtime information.
 * Must be called from a server context (Server Component or API route).
 */
export function getSystemInfo(): SystemInfo {
  return {
    nodeVersion: process.version,
    platform: platform(),
    arch: arch(),
  };
}
