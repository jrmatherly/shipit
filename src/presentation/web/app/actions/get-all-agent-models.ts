'use server';

import { resolve } from '@/lib/server-container';
import { getModelMeta } from '@/lib/model-metadata';
import type { IAgentExecutorFactory } from '@shipit-ai/core/application/ports/output/agents/agent-executor-factory.interface';
import type { IToolInstallerService } from '@shipit-ai/core/application/ports/output/services/tool-installer.service';

export interface ModelInfo {
  id: string;
  displayName: string;
  description: string;
}

export interface AgentModelGroup {
  agentType: string;
  label: string;
  models: ModelInfo[];
  installed: boolean;
}

const AGENT_LABELS: Record<string, string> = {
  'claude-code': 'Claude Code',
  'codex-cli': 'Codex CLI',
  'copilot-cli': 'GitHub Copilot CLI',
  cursor: 'Cursor CLI',
  'gemini-cli': 'Gemini CLI',
  'rovo-dev': 'Rovo Dev CLI',
};

/** Sort weight — lower = further up in the list. */
const AGENT_ORDER: Record<string, number> = {
  'claude-code': 0,
  'codex-cli': 1,
  'copilot-cli': 2,
  cursor: 3,
  'gemini-cli': 4,
  'rovo-dev': 5,
};

/**
 * Maps agent types to their corresponding tool IDs for availability checks.
 * IDs match JSON file names in tool-installer/tools/.
 */
const AGENT_TOOL_IDS: Record<string, string> = {
  'claude-code': 'claude-code',
  'codex-cli': 'codex-cli',
  'copilot-cli': 'copilot-cli',
  cursor: 'cursor-cli',
  'gemini-cli': 'gemini-cli',
  'rovo-dev': 'rovo-dev',
};

export async function getAllAgentModels(): Promise<AgentModelGroup[]> {
  try {
    const factory = resolve<IAgentExecutorFactory>('IAgentExecutorFactory');
    const agents = factory.getSupportedAgents();
    const groups = agents
      .map((agentType) => ({
        agentType: agentType as string,
        label: AGENT_LABELS[agentType as string] ?? (agentType as string),
        models: factory.getSupportedModels(agentType).map((id) => ({
          id,
          ...getModelMeta(id),
        })),
      }))
      .filter((g) => g.models.length > 0);

    // Check which agents are actually installed
    const toolService = resolve<IToolInstallerService>('IToolInstallerService');
    const groupsWithStatus = await Promise.all(
      groups.map(async (group) => {
        const toolId = AGENT_TOOL_IDS[group.agentType];
        if (!toolId) {
          return { ...group, installed: true };
        }
        try {
          const status = await toolService.checkAvailability(toolId);
          return { ...group, installed: status.status === 'available' };
        } catch {
          return { ...group, installed: false };
        }
      })
    );

    return groupsWithStatus.sort(
      (a, b) => (AGENT_ORDER[a.agentType] ?? 50) - (AGENT_ORDER[b.agentType] ?? 50)
    );
  } catch {
    return [];
  }
}
