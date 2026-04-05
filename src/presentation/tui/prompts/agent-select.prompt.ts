/**
 * Agent Select Prompt Configuration
 *
 * Configuration for the @inquirer/select prompt that lets users
 * choose their AI coding agent.
 */

import { AgentType } from '@/domain/generated/output.js';
import { getTuiI18n } from '../i18n.js';
import { shipitAiTheme } from '../themes/shipit-ai.theme.js';

/**
 * Creates the @inquirer/select configuration for selecting an AI coding agent.
 *
 * Only production-ready agents are listed. Deprecated and experimental
 * agents (dev, aider, continue) are excluded from the UI.
 */
export function createAgentSelectConfig() {
  const t = getTuiI18n().t;
  return {
    message: t('tui:prompts.selectAgent.message'),
    choices: [
      {
        name: t('tui:prompts.selectAgent.choices.claudeCode.name'),
        value: AgentType.ClaudeCode,
        description: t('tui:prompts.selectAgent.choices.claudeCode.description'),
      },
      {
        name: t('tui:prompts.selectAgent.choices.geminiCli.name'),
        value: AgentType.GeminiCli,
        description: t('tui:prompts.selectAgent.choices.geminiCli.description'),
      },
      {
        name: t('tui:prompts.selectAgent.choices.codexCli.name'),
        value: AgentType.CodexCli,
        description: t('tui:prompts.selectAgent.choices.codexCli.description'),
      },
      {
        name: t('tui:prompts.selectAgent.choices.cursor.name'),
        value: AgentType.Cursor,
        description: t('tui:prompts.selectAgent.choices.cursor.description'),
      },
      {
        name: t('tui:prompts.selectAgent.choices.copilotCli.name'),
        value: AgentType.CopilotCli,
        description: t('tui:prompts.selectAgent.choices.copilotCli.description'),
      },
      {
        name: t('tui:prompts.selectAgent.choices.rovoDev.name'),
        value: AgentType.RovoDev,
        description: t('tui:prompts.selectAgent.choices.rovoDev.description'),
      },
    ],
    theme: shipitAiTheme,
  };
}
