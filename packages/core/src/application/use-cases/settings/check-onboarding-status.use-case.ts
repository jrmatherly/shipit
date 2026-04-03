/**
 * Check Onboarding Status Use Case
 *
 * Reads settings via DI-injected repository and returns whether
 * first-run onboarding has been completed.
 */

import { injectable, inject } from 'tsyringe';
import type { ISettingsRepository } from '../../ports/output/repositories/settings.repository.interface.js';

/**
 * Use case for checking whether onboarding is complete.
 */
@injectable()
export class CheckOnboardingStatusUseCase {
  constructor(
    @inject('ISettingsRepository')
    private readonly settingsRepo: ISettingsRepository
  ) {}

  async execute(): Promise<{ isComplete: boolean }> {
    const settings = await this.settingsRepo.load();
    if (!settings) return { isComplete: false };
    return { isComplete: settings.onboardingComplete };
  }
}
