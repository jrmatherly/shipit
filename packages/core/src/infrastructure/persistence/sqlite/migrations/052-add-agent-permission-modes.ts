/**
 * Migration 052: Add per-agent permission mode columns to settings.
 *
 * Stores each agent's permission/sandbox mode as a TEXT column.
 * Values come from the corresponding TypeSpec enums
 * (ClaudeCodePermissionMode, CursorPermissionMode, etc.).
 * NULL means "use the agent's default".
 *
 * Columns:
 *  - agent_perm_claude_code  TEXT (default NULL)
 *  - agent_perm_cursor       TEXT (default NULL)
 *  - agent_perm_gemini_cli   TEXT (default NULL)
 *  - agent_perm_codex_cli    TEXT (default NULL)
 *  - agent_perm_copilot_cli  TEXT (default NULL)
 *  - agent_perm_rovo_dev     TEXT (default NULL)
 */

import type { MigrationParams } from 'umzug';
import type Database from 'better-sqlite3';

export async function up({ context: db }: MigrationParams<Database.Database>): Promise<void> {
  const columns = db.pragma('table_info(settings)') as { name: string }[];
  const names = new Set(columns.map((c) => c.name));
  const toAdd = [
    'agent_perm_claude_code',
    'agent_perm_cursor',
    'agent_perm_gemini_cli',
    'agent_perm_codex_cli',
    'agent_perm_copilot_cli',
    'agent_perm_rovo_dev',
  ];
  for (const col of toAdd) {
    if (!names.has(col)) db.exec(`ALTER TABLE settings ADD COLUMN ${col} TEXT`);
  }
}

export async function down({ context: db }: MigrationParams<Database.Database>): Promise<void> {
  void db;
}
