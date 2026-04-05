export interface PermissionOption {
  value: string;
  label: string;
  description: string;
  batchSafe: boolean;
}

const MOCK_MODES: Record<string, PermissionOption[]> = {
  'claude-code': [
    {
      value: 'bypassPermissions',
      label: 'Bypass permissions',
      description: 'Skip all permission checks. Fastest for batch runs.',
      batchSafe: true,
    },
    {
      value: 'acceptEdits',
      label: 'Accept edits',
      description: 'Auto-approve file edits; prompt for shell/network.',
      batchSafe: false,
    },
    {
      value: 'plan',
      label: 'Plan',
      description: 'Read-only; proposes changes without acting.',
      batchSafe: false,
    },
    {
      value: 'default',
      label: 'Default',
      description: 'Prompt for everything except reads.',
      batchSafe: false,
    },
  ],
  cursor: [
    {
      value: 'yolo',
      label: 'Yolo',
      description: 'Write files and execute commands autonomously.',
      batchSafe: true,
    },
    {
      value: 'propose',
      label: 'Propose',
      description: 'Read and analyze; output a diff without writing.',
      batchSafe: true,
    },
  ],
  'gemini-cli': [
    { value: 'yolo', label: 'Yolo', description: 'Auto-approve all tool calls.', batchSafe: true },
    {
      value: 'auto_edit',
      label: 'Auto-edit',
      description: 'Auto-approve edits; prompt for shell.',
      batchSafe: false,
    },
    {
      value: 'default',
      label: 'Default',
      description: 'Prompt for every tool call.',
      batchSafe: false,
    },
  ],
  'codex-cli': [
    {
      value: 'danger-full-access',
      label: 'Full access',
      description: 'No sandbox. Unrestricted access.',
      batchSafe: true,
    },
    {
      value: 'workspace-write',
      label: 'Workspace write',
      description: 'Writes inside worktree, no network.',
      batchSafe: true,
    },
    {
      value: 'read-only',
      label: 'Read only',
      description: 'Cannot modify anything.',
      batchSafe: true,
    },
  ],
  'copilot-cli': [
    {
      value: 'yolo',
      label: 'Yolo',
      description: 'Disable all permission prompts.',
      batchSafe: true,
    },
    {
      value: 'allow-paths',
      label: 'Allow paths',
      description: 'Filesystem access auto-approved; shell prompts.',
      batchSafe: false,
    },
    {
      value: 'prompt',
      label: 'Prompt',
      description: 'Built-in tool category defaults.',
      batchSafe: false,
    },
  ],
  'rovo-dev': [
    { value: 'yolo', label: 'Yolo', description: 'Bypass all prompts.', batchSafe: true },
    {
      value: 'shadow',
      label: 'Shadow',
      description: 'Temporary workspace clone. Experimental.',
      batchSafe: false,
    },
    {
      value: 'config',
      label: 'Config',
      description: 'Respect ~/.rovodev/config.yml settings.',
      batchSafe: false,
    },
  ],
};

export async function getAgentPermissionOptions(agentType: string): Promise<PermissionOption[]> {
  return MOCK_MODES[agentType] ?? [];
}

export async function getCurrentAgentPermissionMode(
  _agentType: string
): Promise<string | undefined> {
  return undefined;
}

export interface SetPermissionResult {
  success: boolean;
  error?: string;
}

export async function setAgentPermissionMode(
  _agentType: string,
  _mode: string
): Promise<SetPermissionResult> {
  return { success: true };
}
