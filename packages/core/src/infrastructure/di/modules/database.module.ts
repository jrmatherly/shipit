import type { DependencyContainer } from 'tsyringe';
import type Database from 'better-sqlite3';
import { promisify } from 'node:util';
import { execFile } from 'node:child_process';
import { IS_WINDOWS } from '../../platform.js';

/**
 * Register database instance and platform-specific utilities.
 */
export function registerDatabaseModule(
  container: DependencyContainer,
  db: Database.Database
): void {
  container.registerInstance<Database.Database>('Database', db);

  const execFileAsync = promisify(execFile);
  const execFn = IS_WINDOWS
    ? (file: string, args: string[], options?: object) =>
        execFileAsync(file, args, { ...options, shell: true, windowsHide: true })
    : execFileAsync;
  container.registerInstance('ExecFunction', execFn);
}
