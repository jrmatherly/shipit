'use server';

import { resolve } from '@/lib/server-container';
import {
  resetSettings,
  initializeSettings,
} from '@shipit-ai/core/infrastructure/services/settings.service';
import type { CompleteWebOnboardingUseCase } from '@shipit-ai/core/application/use-cases/settings/complete-web-onboarding.use-case';
import type { AgentType } from '@shipit-ai/core/domain/generated/output';

export async function updateAgentAndModel(
  agentType: string,
  model: string | null
): Promise<{ ok: boolean; error?: string }> {
  if (!agentType.trim()) {
    return { ok: false, error: 'agent type is required' };
  }

  try {
    const useCase = resolve<CompleteWebOnboardingUseCase>('CompleteWebOnboardingUseCase');
    const updatedSettings = await useCase.execute({
      agentType: agentType.trim() as AgentType,
      model,
    });

    resetSettings();
    initializeSettings(updatedSettings);

    return { ok: true };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update agent and model';
    return { ok: false, error: message };
  }
}
