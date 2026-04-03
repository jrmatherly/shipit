/**
 * Dependency Injection Container
 *
 * Configures tsyringe DI container with all application dependencies.
 * Registration logic is split into domain modules under ./modules/.
 *
 * Usage:
 * ```typescript
 * import { container } from './infrastructure/di/container.js';
 * const useCase = container.resolve(InitializeSettingsUseCase);
 * ```
 */

import 'reflect-metadata';
import { container } from 'tsyringe';

import { getSQLiteConnection } from '../persistence/sqlite/connection.js';
import { runSQLiteMigrations } from '../persistence/sqlite/migrations.js';

import { registerDatabaseModule } from './modules/database.module.js';
import { registerRepositoriesModule } from './modules/repositories.module.js';
import { registerServicesModule } from './modules/services.module.js';
import { registerAgentsModule } from './modules/agents.module.js';
import { registerNotificationsModule } from './modules/notifications.module.js';
import { registerUseCasesModule } from './modules/use-cases.module.js';
import { registerInteractiveModule } from './modules/interactive.module.js';
import { registerWebTokensModule } from './modules/web-tokens.module.js';

let _initialized = false;

/**
 * Initialize the DI container with all dependencies.
 * Must be called before resolving any dependencies.
 * Safe to call multiple times — returns existing container if already initialized.
 *
 * Registration order matters:
 * 1. Database + platform utilities (foundation for everything)
 * 2. Repositories (depend on Database)
 * 3. Services (depend on Database, some on Repositories)
 * 4. Agent infrastructure (depends on Repositories, Services)
 * 5. Notifications (independent)
 * 6. Use cases (depend on all of the above)
 * 7. Interactive sessions (depends on Repositories, Agents)
 * 8. Web tokens (string aliases for use cases — must be last)
 *
 * @returns Configured container instance
 */
export async function initializeContainer(): Promise<typeof container> {
  if (_initialized) {
    return container;
  }

  // Get database connection and run migrations
  const db = await getSQLiteConnection();
  await runSQLiteMigrations(db);

  // Register modules in dependency order
  registerDatabaseModule(container, db);
  registerRepositoriesModule(container);
  registerServicesModule(container, db);
  registerAgentsModule(container);
  registerNotificationsModule(container);
  registerUseCasesModule(container);
  await registerInteractiveModule(container);
  registerWebTokensModule(container);

  _initialized = true;
  return container;
}

/**
 * Check whether the DI container has been initialized.
 * Useful for diagnostics and conditional initialization in instrumentation.ts.
 */
export function isContainerInitialized(): boolean {
  return _initialized;
}

export { container };
