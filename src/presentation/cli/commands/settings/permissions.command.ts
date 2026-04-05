/**
 * Permissions Configuration Command
 *
 * Configures the permission mode for the currently configured AI coding agent.
 *
 * Usage:
 *   shipit-ai settings permissions                                    # Interactive wizard
 *   shipit-ai settings permissions --agent claude-code --mode plan    # Non-interactive
 *   shipit-ai settings permissions --agent claude-code --reset        # Reset to default
 */

import { Command } from 'commander';
import { select } from '@inquirer/prompts';
import { container } from '@/infrastructure/di/container.js';
import { UpdateSettingsUseCase } from '@/application/use-cases/settings/update-settings.use-case.js';
import {
  getSettings,
  resetSettings,
  initializeSettings,
} from '@/infrastructure/services/settings.service.js';
import { messages } from '../../ui/index.js';
import { getCliI18n } from '../../i18n.js';
import { getValidModesForAgent, SETTINGS_KEY_BY_AGENT } from './permission-modes.js';

/**
 * Create the permissions configuration command.
 */
export function createPermissionsCommand(): Command {
  const t = getCliI18n().t;
  return new Command('permissions')
    .description(t('cli:commands.settings.permissions.description'))
    .option('--agent <type>', t('cli:commands.settings.permissions.agentOption'))
    .option('--mode <mode>', t('cli:commands.settings.permissions.modeOption'))
    .option('--reset', t('cli:commands.settings.permissions.resetOption'))
    .addHelpText(
      'after',
      `
Examples:
  $ shipit-ai settings permissions                                    Interactive wizard
  $ shipit-ai settings permissions --agent claude-code --mode plan    Non-interactive
  $ shipit-ai settings permissions --agent claude-code --reset        Reset to default`
    )
    .action(async (options: { agent?: string; mode?: string; reset?: boolean }) => {
      try {
        const settings = getSettings();
        const isNonInteractive = options.agent !== undefined || options.mode !== undefined;

        if (options.reset) {
          // Reset mode: clear the override for the specified agent (or current agent)
          const agentType = options.agent ?? settings.agent.type;
          const settingsKey = SETTINGS_KEY_BY_AGENT[agentType];
          if (!settingsKey) {
            const validModes = getValidModesForAgent(agentType);
            messages.error(
              t('cli:commands.settings.permissions.invalidMode', {
                mode: agentType,
                agent: 'agent',
                validModes: validModes.join(', '),
              })
            );
            process.exitCode = 1;
            return;
          }

          // Clear the permission override
          if (settings.agent.permissions) {
            settings.agent.permissions[settingsKey] = undefined as never;
          }

          const useCase = container.resolve(UpdateSettingsUseCase);
          const updatedSettings = await useCase.execute(settings);
          resetSettings();
          initializeSettings(updatedSettings);

          messages.success(t('cli:commands.settings.permissions.reset'));
          return;
        }

        if (isNonInteractive) {
          // Non-interactive mode: both --agent and --mode are required
          const agentType = options.agent ?? settings.agent.type;
          if (!options.mode) {
            messages.error(t('cli:commands.settings.permissions.modeRequired'));
            process.exitCode = 1;
            return;
          }

          const validModes = getValidModesForAgent(agentType);
          if (validModes.length === 0) {
            messages.error(
              t('cli:commands.settings.permissions.invalidMode', {
                mode: options.mode,
                agent: agentType,
                validModes: 'none (unknown agent)',
              })
            );
            process.exitCode = 1;
            return;
          }

          if (!validModes.includes(options.mode)) {
            messages.error(
              t('cli:commands.settings.permissions.invalidMode', {
                mode: options.mode,
                agent: agentType,
                validModes: validModes.join(', '),
              })
            );
            process.exitCode = 1;
            return;
          }

          // Persist
          const settingsKey = SETTINGS_KEY_BY_AGENT[agentType];
          settings.agent.permissions ??= {};
          (settings.agent.permissions as Record<string, string>)[settingsKey!] = options.mode;

          const useCase = container.resolve(UpdateSettingsUseCase);
          const updatedSettings = await useCase.execute(settings);
          resetSettings();
          initializeSettings(updatedSettings);

          messages.success(t('cli:commands.settings.permissions.updated', { mode: options.mode }));
        } else {
          // Interactive mode
          const agentType = settings.agent.type;
          const validModes = getValidModesForAgent(agentType);

          if (validModes.length === 0) {
            messages.error(
              t('cli:commands.settings.permissions.invalidMode', {
                mode: 'none',
                agent: agentType,
                validModes: 'none (unknown agent)',
              })
            );
            process.exitCode = 1;
            return;
          }

          // Show current state
          const settingsKey = SETTINGS_KEY_BY_AGENT[agentType];
          const currentMode =
            settingsKey && settings.agent.permissions
              ? (settings.agent.permissions as Record<string, string | undefined>)[settingsKey]
              : undefined;

          messages.info(t('cli:commands.settings.permissions.currentAgent', { agent: agentType }));
          messages.info(
            t('cli:commands.settings.permissions.currentMode', {
              mode: currentMode ?? 'default',
            })
          );

          const selectedMode = await select<string>({
            message: t('cli:commands.settings.permissions.selectMode', { agent: agentType }),
            choices: validModes.map((m) => ({ name: m, value: m })),
            default: currentMode,
          });

          // Persist
          settings.agent.permissions ??= {};
          (settings.agent.permissions as Record<string, string>)[settingsKey!] = selectedMode;

          const useCase = container.resolve(UpdateSettingsUseCase);
          const updatedSettings = await useCase.execute(settings);
          resetSettings();
          initializeSettings(updatedSettings);

          messages.success(t('cli:commands.settings.permissions.updated', { mode: selectedMode }));
        }
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));

        if (err.message.includes('force closed') || err.message.includes('User force closed')) {
          messages.info(t('cli:commands.settings.permissions.cancelled'));
          return;
        }

        messages.error(t('cli:commands.settings.permissions.failed'), err);
        process.exitCode = 1;
      }
    });
}
