/**
 * ShipIT AI Directory Service
 *
 * Manages the ~/.shipit-ai/ directory for global settings and data storage.
 * Ensures directory exists with correct permissions before database operations.
 *
 * Supports SHIPIT_AI_HOME env var for test isolation (overrides default ~/.shipit-ai/).
 */

import { mkdir } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { existsSync } from 'node:fs';

/**
 * Resolves the ShipIT AI home directory.
 * Respects SHIPIT_AI_HOME env var for test isolation, falls back to ~/.shipit-ai/
 */
function resolveShipitAiHomeDir(): string {
  return process.env.SHIPIT_AI_HOME ?? join(homedir(), '.shipit-ai');
}

/**
 * Gets the path to the ShipIT AI home directory.
 * Uses SHIPIT_AI_HOME env var if set, otherwise ~/.shipit-ai/
 *
 * @returns Path to shipit-ai home directory
 */
export function getShipitAiHomeDir(): string {
  return resolveShipitAiHomeDir();
}

/**
 * Gets the path to the SQLite database file.
 *
 * @returns Path to the database file
 */
export function getShipitAiDbPath(): string {
  return join(resolveShipitAiHomeDir(), 'data');
}

/**
 * Gets the path to the daemon state file.
 * Uses SHIPIT_AI_HOME env var if set (for test isolation), otherwise ~/.shipit-ai/daemon.json
 *
 * @returns Path to daemon.json
 */
export function getDaemonStatePath(): string {
  return join(resolveShipitAiHomeDir(), 'daemon.json');
}

/**
 * Gets the path to the daemon log file.
 * Uses SHIPIT_AI_HOME env var if set (for test isolation), otherwise ~/.shipit-ai/daemon.log
 *
 * @returns Path to daemon.log
 */
export function getDaemonLogPath(): string {
  return join(resolveShipitAiHomeDir(), 'daemon.log');
}

/**
 * Ensures the shipit-ai home directory exists with correct permissions.
 * Creates the directory if it doesn't exist.
 * Safe to call multiple times (idempotent).
 *
 * Permissions: 700 (rwx------) - only owner can read/write/execute
 *
 * @throws Error if directory cannot be created (permissions, disk space, etc.)
 */
export async function ensureShipitAiDirectory(): Promise<void> {
  const shipitAiDir = resolveShipitAiHomeDir();

  if (existsSync(shipitAiDir)) {
    return;
  }

  try {
    await mkdir(shipitAiDir, {
      recursive: true,
      mode: 0o700,
    });
  } catch (error) {
    throw new Error(
      `Failed to create ShipIT AI directory at ${shipitAiDir}: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
