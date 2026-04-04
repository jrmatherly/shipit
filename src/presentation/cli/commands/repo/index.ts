/**
 * Repo Command
 *
 * Top-level repo command with subcommands for managing tracked repositories.
 *
 * Usage:
 *   shipit-ai repo [subcommand]
 *
 * Subcommands:
 *   shipit-ai repo ls             List tracked repositories
 *   shipit-ai repo show <id>      Display details of a tracked repository
 *   shipit-ai repo add             Import a GitHub repository
 */

import { Command } from 'commander';
import { createShowCommand } from './show.command.js';
import { createLsCommand } from './ls.command.js';
import { createAddCommand } from './add.command.js';
import { getCliI18n } from '../../i18n.js';

/**
 * Create the repo command with all subcommands
 */
export function createRepoCommand(): Command {
  const t = getCliI18n().t;
  const repo = new Command('repo')
    .description(t('cli:commands.repo.description'))
    .addCommand(createLsCommand())
    .addCommand(createShowCommand())
    .addCommand(createAddCommand());

  return repo;
}
