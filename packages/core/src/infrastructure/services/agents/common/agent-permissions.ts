/**
 * Agent Permission Mode Resolver
 *
 * Resolves the permission mode for a given agent from Settings,
 * falling back to a sensible default per agent type.
 */

import type {
  AgentType,
  AgentPermissionSettings,
  Settings,
} from '../../../../domain/generated/output.js';
import type { AgentPermissionModeValue } from '../../../../application/ports/output/agents/agent-executor.interface.js';

/**
 * Maps AgentType string values to their corresponding key in AgentPermissionSettings.
 */
const SETTINGS_KEY_BY_AGENT: Record<string, keyof AgentPermissionSettings> = {
  'claude-code': 'claudeCode',
  cursor: 'cursor',
  'gemini-cli': 'geminiCli',
  'codex-cli': 'codexCli',
  'copilot-cli': 'copilotCli',
  'rovo-dev': 'rovoDev',
};

/**
 * Default permission modes per agent — these match the previously hardcoded values
 * to preserve backward compatibility.
 */
const DEFAULT_MODE_BY_AGENT: Record<string, AgentPermissionModeValue> = {
  'claude-code': 'bypassPermissions' as AgentPermissionModeValue,
  cursor: 'yolo' as AgentPermissionModeValue,
  'gemini-cli': 'yolo' as AgentPermissionModeValue,
  'codex-cli': 'danger-full-access' as AgentPermissionModeValue,
  'copilot-cli': 'yolo' as AgentPermissionModeValue,
  'rovo-dev': 'yolo' as AgentPermissionModeValue,
};

/**
 * Resolve the permission mode for an agent from settings.
 *
 * Resolution order:
 * 1. Explicit setting in `settings.agent.permissions.<agentKey>`
 * 2. Default for the agent type (matches previous hardcoded behavior)
 * 3. undefined (when agent type is unknown)
 *
 * @param settings - Optional Settings object (when omitted, returns default for agentType)
 * @param agentType - Optional explicit agent type (falls back to settings.agent.type)
 */
export function resolveAgentPermissionMode(
  settings?: Settings,
  agentType?: AgentType
): AgentPermissionModeValue | undefined {
  const type = agentType ?? settings?.agent?.type;
  if (!type) return undefined;
  const key = SETTINGS_KEY_BY_AGENT[type as string];
  if (!key || !settings?.agent?.permissions) return DEFAULT_MODE_BY_AGENT[type as string];
  return settings.agent.permissions[key] ?? DEFAULT_MODE_BY_AGENT[type as string];
}
