'use server';

import { resolve } from '@/lib/server-container';
import type { LoadSettingsUseCase } from '@shipit-ai/core/application/use-cases/settings/load-settings.use-case';
import type { UpdateSettingsUseCase } from '@shipit-ai/core/application/use-cases/settings/update-settings.use-case';
import { updateSettings as updateSettingsSingleton } from '@shipit-ai/core/infrastructure/services/settings.service';
import { revalidatePath } from 'next/cache';
import {
  AgentType,
  ClaudeCodePermissionMode,
  CursorPermissionMode,
  GeminiPermissionMode,
  CodexPermissionMode,
  CopilotPermissionMode,
  RovoDevPermissionMode,
} from '@shipit-ai/core/domain/generated/output';
import type { Settings, AgentPermissionSettings } from '@shipit-ai/core/domain/generated/output';

export interface PermissionOption {
  value: string;
  label: string;
  description: string;
  batchSafe: boolean;
}

const VALID_MODES: Record<string, PermissionOption[]> = {
  [AgentType.ClaudeCode]: [
    {
      value: ClaudeCodePermissionMode.BypassPermissions,
      label: 'Bypass permissions',
      description: 'Skip all permission checks. Fastest for batch runs.',
      batchSafe: true,
    },
    {
      value: ClaudeCodePermissionMode.AcceptEdits,
      label: 'Accept edits',
      description: 'Auto-approve file edits; prompt for shell/network.',
      batchSafe: false,
    },
    {
      value: ClaudeCodePermissionMode.Plan,
      label: 'Plan',
      description: 'Read-only; proposes changes without acting.',
      batchSafe: false,
    },
    {
      value: ClaudeCodePermissionMode.Default,
      label: 'Default',
      description: 'Prompt for everything except reads.',
      batchSafe: false,
    },
  ],
  [AgentType.Cursor]: [
    {
      value: CursorPermissionMode.Yolo,
      label: 'Yolo',
      description: 'Write files and execute commands autonomously.',
      batchSafe: true,
    },
    {
      value: CursorPermissionMode.Propose,
      label: 'Propose',
      description: 'Read and analyze; output a diff without writing.',
      batchSafe: true,
    },
  ],
  [AgentType.GeminiCli]: [
    {
      value: GeminiPermissionMode.Yolo,
      label: 'Yolo',
      description: 'Auto-approve all tool calls.',
      batchSafe: true,
    },
    {
      value: GeminiPermissionMode.AutoEdit,
      label: 'Auto-edit',
      description: 'Auto-approve edits; prompt for shell.',
      batchSafe: false,
    },
    {
      value: GeminiPermissionMode.Default,
      label: 'Default',
      description: 'Prompt for every tool call.',
      batchSafe: false,
    },
  ],
  [AgentType.CodexCli]: [
    {
      value: CodexPermissionMode.DangerFullAccess,
      label: 'Full access',
      description: 'No sandbox. Unrestricted access.',
      batchSafe: true,
    },
    {
      value: CodexPermissionMode.WorkspaceWrite,
      label: 'Workspace write',
      description: 'Writes inside worktree, no network.',
      batchSafe: true,
    },
    {
      value: CodexPermissionMode.ReadOnly,
      label: 'Read only',
      description: 'Cannot modify anything.',
      batchSafe: true,
    },
  ],
  [AgentType.CopilotCli]: [
    {
      value: CopilotPermissionMode.Yolo,
      label: 'Yolo',
      description: 'Disable all permission prompts.',
      batchSafe: true,
    },
    {
      value: CopilotPermissionMode.AllowPaths,
      label: 'Allow paths',
      description: 'Filesystem access auto-approved; shell prompts.',
      batchSafe: false,
    },
    {
      value: CopilotPermissionMode.Prompt,
      label: 'Prompt',
      description: 'Built-in tool category defaults.',
      batchSafe: false,
    },
  ],
  [AgentType.RovoDev]: [
    {
      value: RovoDevPermissionMode.Yolo,
      label: 'Yolo',
      description: 'Bypass all prompts.',
      batchSafe: true,
    },
    {
      value: RovoDevPermissionMode.Shadow,
      label: 'Shadow',
      description: 'Temporary workspace clone. Experimental.',
      batchSafe: false,
    },
    {
      value: RovoDevPermissionMode.Config,
      label: 'Config',
      description: 'Respect ~/.rovodev/config.yml settings.',
      batchSafe: false,
    },
  ],
};

/** Agent type to AgentPermissionSettings key mapping */
const AGENT_TYPE_TO_PERMISSION_KEY: Record<string, keyof AgentPermissionSettings> = {
  [AgentType.ClaudeCode]: 'claudeCode',
  [AgentType.Cursor]: 'cursor',
  [AgentType.GeminiCli]: 'geminiCli',
  [AgentType.CodexCli]: 'codexCli',
  [AgentType.CopilotCli]: 'copilotCli',
  [AgentType.RovoDev]: 'rovoDev',
};

export async function getAgentPermissionOptions(agentType: string): Promise<PermissionOption[]> {
  return VALID_MODES[agentType] ?? [];
}

export async function getCurrentAgentPermissionMode(
  agentType: string
): Promise<string | undefined> {
  const loadUseCase = resolve<LoadSettingsUseCase>('LoadSettingsUseCase');
  const settings = await loadUseCase.execute();
  const key = AGENT_TYPE_TO_PERMISSION_KEY[agentType];
  if (!key) return undefined;
  return settings.agent?.permissions?.[key] as string | undefined;
}

export interface SetPermissionResult {
  success: boolean;
  error?: string;
}

export async function setAgentPermissionMode(
  agentType: string,
  mode: string
): Promise<SetPermissionResult> {
  try {
    const key = AGENT_TYPE_TO_PERMISSION_KEY[agentType];
    if (!key) {
      return { success: false, error: `Unsupported agent type: ${agentType}` };
    }

    const modes = VALID_MODES[agentType];
    if (!modes?.some((m) => m.value === mode)) {
      return { success: false, error: `Invalid permission mode: ${mode}` };
    }

    const loadUseCase = resolve<LoadSettingsUseCase>('LoadSettingsUseCase');
    const current = await loadUseCase.execute();

    const updatedSettings: Settings = {
      ...current,
      agent: {
        ...current.agent,
        permissions: {
          ...current.agent?.permissions,
          [key]: mode,
        },
      },
      updatedAt: new Date(),
    };

    const updateUseCase = resolve<UpdateSettingsUseCase>('UpdateSettingsUseCase');
    await updateUseCase.execute(updatedSettings);

    updateSettingsSingleton(updatedSettings);

    revalidatePath('/', 'layout');

    return { success: true };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update permission mode';
    return { success: false, error: message };
  }
}
