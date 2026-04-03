import type { DependencyContainer } from 'tsyringe';
import type Database from 'better-sqlite3';

import type { ISettingsRepository } from '../../../application/ports/output/repositories/settings.repository.interface.js';
import { SQLiteSettingsRepository } from '../../repositories/sqlite-settings.repository.js';
import type { IFeatureRepository } from '../../../application/ports/output/repositories/feature-repository.interface.js';
import { SQLiteFeatureRepository } from '../../repositories/sqlite-feature.repository.js';
import type { IRepositoryRepository } from '../../../application/ports/output/repositories/repository-repository.interface.js';
import { SQLiteRepositoryRepository } from '../../repositories/sqlite-repository.repository.js';

/**
 * Register data access repositories (SQLite implementations).
 */
export function registerRepositoriesModule(container: DependencyContainer): void {
  container.register<ISettingsRepository>('ISettingsRepository', {
    useFactory: (c) => {
      const database = c.resolve<Database.Database>('Database');
      return new SQLiteSettingsRepository(database);
    },
  });

  container.register<IFeatureRepository>('IFeatureRepository', {
    useFactory: (c) => {
      const database = c.resolve<Database.Database>('Database');
      return new SQLiteFeatureRepository(database);
    },
  });

  container.register<IRepositoryRepository>('IRepositoryRepository', {
    useFactory: (c) => {
      const database = c.resolve<Database.Database>('Database');
      return new SQLiteRepositoryRepository(database);
    },
  });
}
