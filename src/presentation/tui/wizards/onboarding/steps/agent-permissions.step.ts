/**
 * Onboarding Step 1B: Agent Permission Mode
 *
 * After the user selects an agent, prompts for the permission mode
 * that controls how ShipIT runs that agent. Provides a "Skip" option
 * that keeps the factory default (most-permissive mode per agent).
 */

import { select } from '@inquirer/prompts';
import type { AgentType } from '@/domain/generated/output.js';
import { getValidModesForAgent } from '@/presentation/cli/commands/settings/permission-modes.js';
import { getTuiI18n } from '../../../i18n.js';
import { shipitAiTheme } from '../../../themes/shipit-ai.theme.js';

/** Sentinel returned when the user chooses to skip. */
const SKIP_VALUE = '__skip__' as const;

/**
 * Runs the permission mode selection step for the given agent.
 *
 * @param agentType - The agent type value selected in the previous step
 *   (e.g. 'claude-code', 'cursor')
 * @returns The selected permission mode string, or `undefined` if skipped
 */
export async function runAgentPermissionsStep(agentType: AgentType): Promise<string | undefined> {
  const t = getTuiI18n().t;
  const modes = getValidModesForAgent(agentType as string);

  // If no modes are defined for this agent, silently skip
  if (modes.length === 0) {
    return undefined;
  }

  const agentLabel = agentType as string;
  const choices = [
    ...modes.map((mode: string) => ({
      name: mode,
      value: mode,
    })),
    {
      name: t('tui:wizards.permissions.skip'),
      value: SKIP_VALUE,
    },
  ];

  const answer = await select<string>({
    message: t('tui:wizards.permissions.title', { agent: agentLabel }),
    choices,
    theme: shipitAiTheme,
  });

  if (answer === SKIP_VALUE) {
    return undefined;
  }

  return answer;
}
