import { realpathSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Check if a target path is the same directory (or a worktree of) the
 * currently running shipit-ai instance. Starting a dev server there would spawn
 * another shipit-ai instance that conflicts with the shared ~/.shipit-ai/data DB.
 */
export function isSameShipitAiInstance(targetPath: string): boolean {
  const instancePath = process.env.NEXT_PUBLIC_SHIPIT_AI_INSTANCE_PATH ?? process.cwd();

  try {
    const normalizedTarget = realpathSync(resolve(targetPath)).replace(/\\/g, '/');
    const normalizedInstance = realpathSync(resolve(instancePath)).replace(/\\/g, '/');
    return normalizedTarget === normalizedInstance;
  } catch {
    return false;
  }
}
