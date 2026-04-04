/**
 * Agent Command
 *
 * Top-level agent command with subcommands for managing and viewing agent runs.
 *
 * Usage:
 *   shipit-ai agent [subcommand]
 *
 * Subcommands:
 *   shipit-ai agent show <id>     Display details of an agent run
 *   shipit-ai agent ls             List all agent runs
 *   shipit-ai agent stop <id>     Stop a running agent
 *   shipit-ai agent logs <id>     View agent run logs
 *   shipit-ai agent delete <id>   Delete an agent run record
 */

import { Command } from 'commander';
import { createShowCommand } from './show.command.js';
import { createLsCommand } from './ls.command.js';
import { createStopCommand } from './stop.command.js';
import { createLogsCommand } from './logs.command.js';
import { createDeleteCommand } from './delete.command.js';
import { createApproveCommand } from './approve.command.js';
import { createRejectCommand } from './reject.command.js';
import { getCliI18n } from '../../i18n.js';

/**
 * Create the agent command with all subcommands
 */
export function createAgentCommand(): Command {
  const t = getCliI18n().t;
  const agent = new Command('agent')
    .description(t('cli:commands.agent.description'))
    .addCommand(createShowCommand())
    .addCommand(createLsCommand())
    .addCommand(createStopCommand())
    .addCommand(createLogsCommand())
    .addCommand(createDeleteCommand())
    .addCommand(createApproveCommand())
    .addCommand(createRejectCommand());

  return agent;
}
