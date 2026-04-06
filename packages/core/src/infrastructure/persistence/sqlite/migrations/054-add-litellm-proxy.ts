/**
 * Migration 054: Add LiteLLM proxy configuration and plugins feature flag.
 *
 * Columns (settings table):
 *  - litellm_proxy_base_url TEXT (default NULL)
 *  - litellm_proxy_api_key TEXT (default NULL)
 *  - litellm_proxy_marketplace_enabled INTEGER (default 0)
 *  - feature_flag_plugins INTEGER (default 0)
 */

import type { MigrationParams } from 'umzug';
import type Database from 'better-sqlite3';

export async function up({ context: db }: MigrationParams<Database.Database>): Promise<void> {
  const columns = db.pragma('table_info(settings)') as { name: string }[];
  const names = new Set(columns.map((c) => c.name));

  if (!names.has('litellm_proxy_base_url')) {
    db.exec('ALTER TABLE settings ADD COLUMN litellm_proxy_base_url TEXT');
  }
  if (!names.has('litellm_proxy_api_key')) {
    db.exec('ALTER TABLE settings ADD COLUMN litellm_proxy_api_key TEXT');
  }
  if (!names.has('litellm_proxy_marketplace_enabled')) {
    db.exec('ALTER TABLE settings ADD COLUMN litellm_proxy_marketplace_enabled INTEGER DEFAULT 0');
  }
  if (!names.has('feature_flag_plugins')) {
    db.exec('ALTER TABLE settings ADD COLUMN feature_flag_plugins INTEGER DEFAULT 0');
  }
}

export async function down({ context: db }: MigrationParams<Database.Database>): Promise<void> {
  void db;
}
