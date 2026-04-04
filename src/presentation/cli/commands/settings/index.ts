/**
 * Settings Command Group
 *
 * Provides subcommands for managing ShipIT global settings.
 * Running `shipit-ai settings` with no subcommand launches the full setup wizard.
 *
 * Usage:
 *   shipit-ai settings           # Launch full setup wizard (agent + IDE + workflow)
 *   shipit-ai settings show      # Display current settings
 *   shipit-ai settings init      # Initialize settings to defaults
 *   shipit-ai settings agent     # Configure AI coding agent
 *   shipit-ai settings ide       # Configure preferred IDE
 *   shipit-ai settings workflow  # Configure workflow defaults
 *   shipit-ai settings model     # Configure default LLM model
 *   shipit-ai settings language  # Configure display language
 */

import { Command } from 'commander';
import { createShowCommand } from './show.command.js';
import { createInitCommand } from './init.command.js';
import { createAgentCommand } from './agent.command.js';
import { createIdeCommand } from './ide.command.js';
import { createWorkflowCommand } from './workflow.command.js';
import { createModelCommand } from './model.command.js';
import { createLanguageCommand } from './language.command.js';
import { onboardingWizard } from '../../../tui/wizards/onboarding/onboarding.wizard.js';
import { messages } from '../../ui/index.js';
import { getCliI18n } from '../../i18n.js';

/**
 * Create the settings command group
 */
export function createSettingsCommand(): Command {
  const cmd = new Command('settings')
    .description(getCliI18n().t('cli:commands.settings.description'))
    .addCommand(createShowCommand())
    .addCommand(createInitCommand())
    .addCommand(createAgentCommand())
    .addCommand(createIdeCommand())
    .addCommand(createWorkflowCommand())
    .addCommand(createModelCommand())
    .addCommand(createLanguageCommand());

  // Default action: launch the full setup wizard when no subcommand is given
  cmd.action(async () => {
    try {
      await onboardingWizard();
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      messages.error(getCliI18n().t('cli:commands.settings.wizardFailed'), err);
      process.exitCode = 1;
    }
  });

  return cmd;
}
