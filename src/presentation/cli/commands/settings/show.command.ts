/**
 * Show Settings Command
 *
 * Displays current ShipIT AI settings with multiple output format support.
 *
 * Usage:
 *   shipit-ai settings show                 # Display as table (default)
 *   shipit-ai settings show --output json   # Display as JSON
 *   shipit-ai settings show -o yaml         # Display as YAML
 */

import { Command, Option } from 'commander';
import { OutputFormatter, type OutputFormat } from '../../ui/output.js';
import { getShipitAiDbPath } from '@/infrastructure/services/filesystem/shipit-ai-directory.service.js';
import { getSettings } from '@/infrastructure/services/settings.service.js';
import { statSync } from 'node:fs';
import { messages } from '../../ui/index.js';
import { getCliI18n } from '../../i18n.js';

/**
 * Create the show settings command
 */
export function createShowCommand(): Command {
  return new Command('show')
    .description(getCliI18n().t('cli:commands.settings.show.description'))
    .addOption(
      new Option('-o, --output <format>', getCliI18n().t('cli:commands.settings.show.formatOption'))
        .choices(['table', 'json', 'yaml'])
        .default('table')
    )
    .addHelpText(
      'after',
      `
Examples:
  $ shipit-ai settings show                 Display settings as table
  $ shipit-ai settings show --output json   Display settings as JSON
  $ shipit-ai settings show -o yaml         Display settings as YAML`
    )
    .action((options: { output: OutputFormat }) => {
      try {
        const settings = getSettings();

        // Build database metadata for table format
        const dbMeta = options.output === 'table' ? getDatabaseMeta() : undefined;

        const output = OutputFormatter.format(settings, options.output, dbMeta);
        console.log(output);
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        messages.error(getCliI18n().t('cli:commands.settings.show.failedToLoad'), err);
        process.exitCode = 1;
      }
    });
}

function getDatabaseMeta() {
  const dbPath = getShipitAiDbPath();
  let size = 'unknown';
  try {
    const stats = statSync(dbPath);
    size = formatFileSize(stats.size);
  } catch {
    // File may not be accessible
  }
  return { path: dbPath, size };
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
