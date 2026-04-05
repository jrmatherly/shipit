/**
 * Agent Permission Mode Validation Helpers
 *
 * Maps agent types to their valid permission mode strings.
 * Used by both the `settings permissions` command and the
 * `feat new --permission-mode` flag for validation.
 */

import {
  ClaudeCodePermissionMode,
  CursorPermissionMode,
  GeminiPermissionMode,
  CodexPermissionMode,
  CopilotPermissionMode,
  RovoDevPermissionMode,
} from '@/domain/generated/output.js';
import type { AgentPermissionSettings } from '@/domain/generated/output.js';

/**
 * Valid permission modes per agent type, derived from TypeSpec-generated enums.
 */
const VALID_MODES: Record<string, string[]> = {
  'claude-code': Object.values(ClaudeCodePermissionMode),
  cursor: Object.values(CursorPermissionMode),
  'gemini-cli': Object.values(GeminiPermissionMode),
  'codex-cli': Object.values(CodexPermissionMode),
  'copilot-cli': Object.values(CopilotPermissionMode),
  'rovo-dev': Object.values(RovoDevPermissionMode),
};

/**
 * Maps AgentType string values to their corresponding key in AgentPermissionSettings.
 * Re-exported from the resolver module for use by the command layer.
 */
export const SETTINGS_KEY_BY_AGENT: Record<string, keyof AgentPermissionSettings> = {
  'claude-code': 'claudeCode',
  cursor: 'cursor',
  'gemini-cli': 'geminiCli',
  'codex-cli': 'codexCli',
  'copilot-cli': 'copilotCli',
  'rovo-dev': 'rovoDev',
};

/**
 * Returns the valid permission mode strings for a given agent type.
 * Returns an empty array for unknown agent types.
 */
export function getValidModesForAgent(agentType: string): string[] {
  return VALID_MODES[agentType] ?? [];
}
