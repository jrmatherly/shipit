/**
 * Migration 053: Add per-feature permission mode column to features.
 *
 * Stores a per-feature override for the agent permission/sandbox mode.
 * NULL means "use the agent's default from settings" (no override).
 *
 * Columns:
 *  - permission_mode TEXT (default NULL)
 */

import type { MigrationParams } from 'umzug';
import type Database from 'better-sqlite3';

export async function up({ context: db }: MigrationParams<Database.Database>): Promise<void> {
  const columns = db.pragma('table_info(features)') as { name: string }[];
  const names = new Set(columns.map((c) => c.name));
  if (!names.has('permission_mode')) {
    db.exec('ALTER TABLE features ADD COLUMN permission_mode TEXT');
  }
}

export async function down({ context: db }: MigrationParams<Database.Database>): Promise<void> {
  void db;
}
