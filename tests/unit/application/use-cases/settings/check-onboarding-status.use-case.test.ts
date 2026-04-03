import 'reflect-metadata';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CheckOnboardingStatusUseCase } from '@/application/use-cases/settings/check-onboarding-status.use-case.js';
import type { ISettingsRepository } from '@/application/ports/output/repositories/settings.repository.interface.js';

describe('CheckOnboardingStatusUseCase', () => {
  let useCase: CheckOnboardingStatusUseCase;
  let mockSettingsRepo: ISettingsRepository;

  beforeEach(() => {
    mockSettingsRepo = {
      initialize: vi.fn(),
      load: vi.fn(),
      update: vi.fn(),
    };
    useCase = new CheckOnboardingStatusUseCase(mockSettingsRepo);
  });

  it('should return { isComplete: true } when onboardingComplete is true', async () => {
    vi.mocked(mockSettingsRepo.load).mockResolvedValue({ onboardingComplete: true } as any);

    const result = await useCase.execute();

    expect(result).toEqual({ isComplete: true });
  });

  it('should return { isComplete: false } when onboardingComplete is false', async () => {
    vi.mocked(mockSettingsRepo.load).mockResolvedValue({ onboardingComplete: false } as any);

    const result = await useCase.execute();

    expect(result).toEqual({ isComplete: false });
  });

  it('should return { isComplete: false } when settings are not initialized', async () => {
    vi.mocked(mockSettingsRepo.load).mockResolvedValue(null);

    const result = await useCase.execute();

    expect(result).toEqual({ isComplete: false });
  });
});
