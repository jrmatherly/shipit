/**
 * Migration 055: Add LiteLLM proxy per-agent routing config for Claude Code.
 *
 * Columns (settings table):
 *  - litellm_proxy_cc_routing_mode TEXT (default NULL — treated as "direct")
 *  - litellm_proxy_cc_custom_headers TEXT (default NULL)
 *  - litellm_proxy_cc_sonnet_model TEXT (default NULL)
 *  - litellm_proxy_cc_haiku_model TEXT (default NULL)
 *  - litellm_proxy_cc_opus_model TEXT (default NULL)
 */

import type { MigrationParams } from 'umzug';
import type Database from 'better-sqlite3';

export async function up({ context: db }: MigrationParams<Database.Database>): Promise<void> {
  const columns = db.pragma('table_info(settings)') as { name: string }[];
  const names = new Set(columns.map((c) => c.name));

  if (!names.has('litellm_proxy_cc_routing_mode')) {
    db.exec('ALTER TABLE settings ADD COLUMN litellm_proxy_cc_routing_mode TEXT');
  }
  if (!names.has('litellm_proxy_cc_custom_headers')) {
    db.exec('ALTER TABLE settings ADD COLUMN litellm_proxy_cc_custom_headers TEXT');
  }
  if (!names.has('litellm_proxy_cc_sonnet_model')) {
    db.exec('ALTER TABLE settings ADD COLUMN litellm_proxy_cc_sonnet_model TEXT');
  }
  if (!names.has('litellm_proxy_cc_haiku_model')) {
    db.exec('ALTER TABLE settings ADD COLUMN litellm_proxy_cc_haiku_model TEXT');
  }
  if (!names.has('litellm_proxy_cc_opus_model')) {
    db.exec('ALTER TABLE settings ADD COLUMN litellm_proxy_cc_opus_model TEXT');
  }
}

export async function down({ context: db }: MigrationParams<Database.Database>): Promise<void> {
  void db;
}
