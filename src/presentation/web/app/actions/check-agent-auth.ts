'use server';

import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { execFile } from 'node:child_process';
import { IS_WINDOWS } from '@/lib/core-utils';
import { resolve } from '@/lib/server-container';
import type { LoadSettingsUseCase } from '@shipit-ai/core/application/use-cases/settings/load-settings.use-case';
import type { ListToolsUseCase } from '@shipit-ai/core/application/use-cases/tools/list-tools.use-case';

export interface AgentAuthStatus {
  agentType: string;
  /** Whether the CLI tool binary is installed */
  installed: boolean;
  /** Whether credentials / auth appear valid */
  authenticated: boolean;
  /** Human-readable label for the agent */
  label: string;
  /** CLI binary name (e.g. "claude", "gemini") */
  binaryName: string | null;
  /** Shell command to install the tool (e.g. "npm install -g @anthropic-ai/claude-code") */
  installCommand: string | null;
  /** Instructions to authenticate if not authenticated */
  authCommand: string | null;
}

const AGENT_LABELS: Record<string, string> = {
  'claude-code': 'Claude Code',
  'codex-cli': 'Codex CLI',
  cursor: 'Cursor CLI',
  'gemini-cli': 'Gemini CLI',
  aider: 'Aider',
  continue: 'Continue',
  dev: 'Demo',
};

const AGENT_TOOL_MAP: Record<string, string> = {
  'claude-code': 'claude-code',
  'codex-cli': 'codex-cli',
  cursor: 'cursor-cli',
  'gemini-cli': 'gemini-cli',
};

const AGENT_BINARY_MAP: Record<string, string> = {
  'claude-code': 'claude',
  'codex-cli': 'codex',
  cursor: 'cursor-agent',
  'gemini-cli': 'gemini',
};

/**
 * Tier 1 result indicating how auth was detected.
 * - 'env-var': Explicit env var config (e.g. ANTHROPIC_API_KEY for proxy/gateway) — skip Tier 2
 * - 'file': Credential file found — run Tier 2 to verify tokens aren't expired
 * - false: No credentials found in known locations
 */
type Tier1Result = 'env-var' | 'file' | false;

/**
 * Tier 1: Instant credential/env check (~5ms, no subprocess).
 * Distinguishes env-var auth (explicit user config, e.g. API key for a proxy)
 * from file-based auth (may be stale, needs Tier 2 verification).
 */
function tier1AuthCheck(agentType: string): Tier1Result {
  const home = homedir();

  switch (agentType) {
    case 'claude-code': {
      if (process.env['ANTHROPIC_API_KEY']) return 'env-var';
      if (process.env['CLAUDE_CODE_USE_BEDROCK']) return 'env-var';
      if (process.env['CLAUDE_CODE_USE_VERTEX']) return 'env-var';
      if (process.env['CLAUDE_CODE_OAUTH_TOKEN']) return 'env-var';
      const credPath = join(home, '.claude', '.credentials.json');
      return existsSync(credPath) ? 'file' : false;
    }
    case 'codex-cli': {
      if (process.env['OPENAI_API_KEY']) return 'env-var';
      return false;
    }
    case 'cursor': {
      if (process.env['CURSOR_API_KEY']) return 'env-var';
      const cursorDir = join(home, '.cursor');
      return existsSync(cursorDir) ? 'file' : false;
    }
    case 'gemini-cli': {
      if (process.env['GEMINI_API_KEY']) return 'env-var';
      if (process.env['GOOGLE_API_KEY']) return 'env-var';
      if (process.env['GOOGLE_APPLICATION_CREDENTIALS']) return 'env-var';
      const accountsPath = join(home, '.gemini', 'google_accounts.json');
      return existsSync(accountsPath) ? 'file' : false;
    }
    default:
      // dev, aider, continue — assume no auth needed
      return 'env-var';
  }
}

/**
 * Tier 2: Subprocess verification (~200ms).
 * Only called if tier 1 passes, to confirm tokens aren't expired.
 */
function tier2AuthVerify(agentType: string, binaryName: string): Promise<boolean> {
  return new Promise((resolve) => {
    let cmd: string;
    let args: string[];

    switch (agentType) {
      case 'claude-code':
        cmd = binaryName;
        args = ['auth', 'status'];
        break;
      case 'cursor':
        cmd = binaryName;
        args = ['status'];
        break;
      case 'codex-cli':
        // Codex CLI has no `auth status` command — cannot verify via subprocess
        resolve(false);
        return;
      default:
        // No tier 2 command available — trust tier 1
        resolve(true);
        return;
    }

    try {
      const opts = IS_WINDOWS ? { timeout: 5000, windowsHide: true } : { timeout: 5000 };
      execFile(cmd, args, opts, (error) => {
        resolve(!error);
      });
    } catch {
      resolve(false);
    }
  });
}

/**
 * Check agent tool installation + auth status.
 * Uses two-tier detection: instant file/env check, then optional subprocess verify.
 */
export async function checkAgentAuth(): Promise<AgentAuthStatus> {
  let agentType: string;
  try {
    const loadSettings = resolve<LoadSettingsUseCase>('LoadSettingsUseCase');
    const settings = await loadSettings.execute();
    agentType = settings.agent.type;
  } catch {
    return {
      agentType: 'unknown',
      installed: false,
      authenticated: false,
      label: 'Unknown',
      binaryName: null,
      installCommand: null,
      authCommand: null,
    };
  }

  const label = AGENT_LABELS[agentType] ?? agentType;
  const toolId = AGENT_TOOL_MAP[agentType] ?? null;
  const binaryName = AGENT_BINARY_MAP[agentType] ?? null;

  // Dev/demo agents — always good
  if (!toolId) {
    return {
      agentType,
      installed: true,
      authenticated: true,
      label,
      binaryName: null,
      installCommand: null,
      authCommand: null,
    };
  }

  // Check if tool is installed (also grab install command from metadata)
  let installed = false;
  let installCommand: string | null = null;
  try {
    const useCase = resolve<ListToolsUseCase>('ListToolsUseCase');
    const tools = await useCase.execute();
    const tool = tools.find((t) => t.id === toolId);
    installed = tool?.status.status === 'available';
    installCommand = tool?.installCommand ?? null;
  } catch {
    installed = false;
  }

  if (!installed) {
    return {
      agentType,
      installed: false,
      authenticated: false,
      label,
      binaryName,
      installCommand,
      authCommand: binaryName ? `Install ${label} first` : null,
    };
  }

  // Tier 1: instant file/env check — fast path for known credential locations
  const tier1 = tier1AuthCheck(agentType);

  if (tier1 === 'env-var') {
    // Explicit env var auth (e.g. ANTHROPIC_API_KEY for LiteLLM proxy).
    // Trust the user's config — skip Tier 2 subprocess check which may
    // fail against a proxy that the CLI binary doesn't know about.
    return {
      agentType,
      installed: true,
      authenticated: true,
      label,
      binaryName,
      installCommand,
      authCommand: null,
    };
  }

  if (tier1 === 'file') {
    // Credential file found but may be stale/expired.
    // Run Tier 2 subprocess verify to confirm tokens are still valid (~200ms).
    let authenticated = true;
    if (binaryName) {
      authenticated = await tier2AuthVerify(agentType, binaryName);
    }
    return {
      agentType,
      installed: true,
      authenticated,
      label,
      binaryName,
      installCommand,
      authCommand: authenticated ? null : binaryName,
    };
  }

  // Tier 1 found nothing — credentials not in expected locations.
  // Fall through to Tier 2 because some auth methods (e.g. Claude Code OAuth
  // via claude.ai) store credentials outside the paths Tier 1 checks.
  if (binaryName) {
    const authenticated = await tier2AuthVerify(agentType, binaryName);
    if (authenticated) {
      return {
        agentType,
        installed: true,
        authenticated: true,
        label,
        binaryName,
        installCommand,
        authCommand: null,
      };
    }
  }

  // Both tiers failed — agent genuinely needs authentication
  return {
    agentType,
    installed: true,
    authenticated: false,
    label,
    binaryName,
    installCommand,
    authCommand: binaryName,
  };
}
