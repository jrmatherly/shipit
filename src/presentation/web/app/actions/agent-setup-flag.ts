'use server';

import { resolve } from '@/lib/server-container';
import type { LoadSettingsUseCase } from '@shipit-ai/core/application/use-cases/settings/load-settings.use-case';

/**
 * Check whether onboarding has been completed.
 */
export async function isAgentSetupComplete(): Promise<boolean> {
  try {
    const useCase = resolve<LoadSettingsUseCase>('LoadSettingsUseCase');
    const settings = await useCase.execute();
    return settings.onboardingComplete;
  } catch {
    return false;
  }
}
