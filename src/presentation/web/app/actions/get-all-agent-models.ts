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
  cursor: 'Cursor CLI',
  'gemini-cli': 'Gemini CLI',
  dev: 'Demo',
};

/** Sort weight — higher = further down. Demo always last. */
const AGENT_ORDER: Record<string, number> = {
  'claude-code': 0,
  'codex-cli': 1,
  cursor: 2,
  'gemini-cli': 3,
  dev: 99,
};

/**
 * Maps agent types to their corresponding tool IDs for availability checks.
 * IDs match JSON file names in tool-installer/tools/.
 */
const AGENT_TOOL_IDS: Record<string, string> = {
  'claude-code': 'claude-code',
  'codex-cli': 'codex-cli',
  cursor: 'cursor-cli',
  'gemini-cli': 'gemini-cli',
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
      .map((g) => {
        // Dev agent gets fun demo models
        if (g.agentType === 'dev' && g.models.length === 0) {
          return {
            ...g,
            models: [
              { id: 'gpt-8', ...getModelMeta('gpt-8') },
              { id: 'opus-7', ...getModelMeta('opus-7') },
            ],
          };
        }
        return g;
      })
      .filter((g) => g.models.length > 0);

    // Check which agents are actually installed
    const toolService = resolve<IToolInstallerService>('IToolInstallerService');
    const groupsWithStatus = await Promise.all(
      groups.map(async (group) => {
        const toolId = AGENT_TOOL_IDS[group.agentType];
        if (!toolId || group.agentType === 'dev') {
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
