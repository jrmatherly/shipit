/**
 * Migration 056: Add LiteLLM proxy per-agent routing for Gemini CLI and Codex CLI.
 *
 * Columns (settings table):
 *  - litellm_proxy_gc_routing_mode TEXT (default NULL — treated as "direct")
 *  - litellm_proxy_cx_routing_mode TEXT (default NULL — treated as "direct")
 */

import type { MigrationParams } from 'umzug';
import type Database from 'better-sqlite3';

export async function up({ context: db }: MigrationParams<Database.Database>): Promise<void> {
  const columns = db.pragma('table_info(settings)') as { name: string }[];
  const names = new Set(columns.map((c) => c.name));

  if (!names.has('litellm_proxy_gc_routing_mode')) {
    db.exec('ALTER TABLE settings ADD COLUMN litellm_proxy_gc_routing_mode TEXT');
  }
  if (!names.has('litellm_proxy_cx_routing_mode')) {
    db.exec('ALTER TABLE settings ADD COLUMN litellm_proxy_cx_routing_mode TEXT');
  }
}

export async function down({ context: db }: MigrationParams<Database.Database>): Promise<void> {
  void db;
}
