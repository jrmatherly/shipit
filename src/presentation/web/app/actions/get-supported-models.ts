'use server';

import { resolve } from '@/lib/server-container';
import type { LoadSettingsUseCase } from '@shipit-ai/core/application/use-cases/settings/load-settings.use-case';
import type { IAgentExecutorFactory } from '@shipit-ai/core/application/ports/output/agents/agent-executor-factory.interface';

/**
 * Server action that returns the LLM model identifiers supported by the
 * currently configured agent executor.
 *
 * Resolves IAgentExecutorFactory from the DI container and calls
 * getSupportedModels for the agent type stored in settings.
 *
 * @returns Array of model identifier strings, or [] on error.
 */
export async function getSupportedModels(): Promise<string[]> {
  try {
    const loadSettings = resolve<LoadSettingsUseCase>('LoadSettingsUseCase');
    const settings = await loadSettings.execute();
    const agentType = settings.agent.type;
    const factory = resolve<IAgentExecutorFactory>('IAgentExecutorFactory');
    return factory.getSupportedModels(agentType);
  } catch (_error: unknown) {
    // Settings may not be initialized in some test/preview environments
    return [];
  }
}
