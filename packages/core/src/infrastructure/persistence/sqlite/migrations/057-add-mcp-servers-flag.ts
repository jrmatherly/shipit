/**
 * Migration 057: Add MCP servers feature flag.
 *
 * Columns (settings table):
 *  - feature_flag_mcp_servers INTEGER (default 0)
 */

import type { MigrationParams } from 'umzug';
import type Database from 'better-sqlite3';

export async function up({ context: db }: MigrationParams<Database.Database>): Promise<void> {
  const columns = db.pragma('table_info(settings)') as { name: string }[];
  const names = new Set(columns.map((c) => c.name));

  if (!names.has('feature_flag_mcp_servers')) {
    db.exec('ALTER TABLE settings ADD COLUMN feature_flag_mcp_servers INTEGER DEFAULT 0');
  }
}

export async function down({ context: db }: MigrationParams<Database.Database>): Promise<void> {
  void db;
}
