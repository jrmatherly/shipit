/**
 * CompleteWebOnboardingUseCase Unit Tests
 *
 * TDD Phase: RED-GREEN
 */

import 'reflect-metadata';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CompleteWebOnboardingUseCase } from '@/application/use-cases/settings/complete-web-onboarding.use-case.js';
import type { ISettingsRepository } from '@/application/ports/output/repositories/settings.repository.interface.js';
import type { Settings } from '@/domain/generated/output.js';
import { AgentType, AgentAuthMethod, EditorType, TerminalType } from '@/domain/generated/output.js';

function createTestSettings(overrides: Partial<Settings> = {}): Settings {
  return {
    id: 'singleton',
    createdAt: new Date('2025-01-01T00:00:00Z'),
    updatedAt: new Date('2025-01-01T00:00:00Z'),
    models: {
      default: 'claude-sonnet-4-6',
    },
    user: {},
    environment: {
      defaultEditor: EditorType.VsCode,
      shellPreference: 'bash',
      terminalPreference: TerminalType.System,
    },
    system: { autoUpdate: true, logLevel: 'info' },
    agent: {
      type: AgentType.ClaudeCode,
      authMethod: AgentAuthMethod.Session,
    },
    notifications: {
      inApp: { enabled: true },
      browser: { enabled: true },
      desktop: { enabled: true },
      events: {
        agentStarted: true,
        phaseCompleted: true,
        waitingApproval: true,
        agentCompleted: true,
        agentFailed: true,
        prMerged: true,
        prClosed: true,
        prChecksPassed: true,
        prChecksFailed: true,
        prBlocked: true,
        mergeReviewReady: true,
      },
    },
    workflow: {
      openPrOnImplementationComplete: false,
      approvalGateDefaults: {
        allowPrd: false,
        allowPlan: false,
        allowMerge: false,
        pushOnImplementationComplete: false,
      },
      enableEvidence: false,
      commitEvidence: false,
      ciWatchEnabled: true,
      defaultFastMode: true,
    },
    onboardingComplete: false,
    ...overrides,
  };
}

describe('CompleteWebOnboardingUseCase', () => {
  let useCase: CompleteWebOnboardingUseCase;
  let mockRepository: ISettingsRepository;

  beforeEach(() => {
    mockRepository = {
      initialize: vi.fn(),
      load: vi.fn(),
      update: vi.fn().mockResolvedValue(undefined),
    };
    useCase = new CompleteWebOnboardingUseCase(mockRepository);
  });

  // --------------------------------------------------------------------------
  // Happy path
  // --------------------------------------------------------------------------

  it('should return settings with onboardingComplete set to true', async () => {
    const settings = createTestSettings({ onboardingComplete: false });
    vi.mocked(mockRepository.load).mockResolvedValue(settings);

    const result = await useCase.execute({
      agentType: AgentType.ClaudeCode,
      model: null,
    });

    expect(result.onboardingComplete).toBe(true);
  });

  it('should persist the updated settings via repository.update', async () => {
    const settings = createTestSettings();
    vi.mocked(mockRepository.load).mockResolvedValue(settings);

    await useCase.execute({
      agentType: AgentType.ClaudeCode,
      model: null,
    });

    expect(mockRepository.update).toHaveBeenCalledOnce();
  });

  it('should update the agent type from input', async () => {
    const settings = createTestSettings({
      agent: { type: AgentType.ClaudeCode, authMethod: AgentAuthMethod.Session },
    });
    vi.mocked(mockRepository.load).mockResolvedValue(settings);

    const result = await useCase.execute({
      agentType: AgentType.Cursor,
      model: null,
    });

    expect(result.agent.type).toBe(AgentType.Cursor);
  });

  it('should preserve existing agent fields not specified in input', async () => {
    const settings = createTestSettings({
      agent: {
        type: AgentType.ClaudeCode,
        authMethod: AgentAuthMethod.Token,
        token: 'my-secret-token',
      },
    });
    vi.mocked(mockRepository.load).mockResolvedValue(settings);

    const result = await useCase.execute({
      agentType: AgentType.GeminiCli,
      model: null,
    });

    expect(result.agent.authMethod).toBe(AgentAuthMethod.Token);
    expect(result.agent.token).toBe('my-secret-token');
  });

  it('should update the model when provided', async () => {
    const settings = createTestSettings({ models: { default: 'old-model' } });
    vi.mocked(mockRepository.load).mockResolvedValue(settings);

    const result = await useCase.execute({
      agentType: AgentType.ClaudeCode,
      model: 'claude-opus-4-6',
    });

    expect(result.models.default).toBe('claude-opus-4-6');
  });

  it('should keep existing model when model input is null', async () => {
    const settings = createTestSettings({ models: { default: 'claude-sonnet-4-6' } });
    vi.mocked(mockRepository.load).mockResolvedValue(settings);

    const result = await useCase.execute({
      agentType: AgentType.ClaudeCode,
      model: null,
    });

    expect(result.models.default).toBe('claude-sonnet-4-6');
  });

  it('should trim whitespace from the model string', async () => {
    const settings = createTestSettings();
    vi.mocked(mockRepository.load).mockResolvedValue(settings);

    const result = await useCase.execute({
      agentType: AgentType.ClaudeCode,
      model: '  claude-opus-4-6  ',
    });

    expect(result.models.default).toBe('claude-opus-4-6');
  });

  it('should preserve all other settings fields unchanged', async () => {
    const settings = createTestSettings({
      environment: {
        defaultEditor: EditorType.Cursor,
        shellPreference: 'zsh',
        terminalPreference: TerminalType.System,
      },
      workflow: {
        openPrOnImplementationComplete: true,
        approvalGateDefaults: {
          allowPrd: true,
          allowPlan: true,
          allowMerge: false,
          pushOnImplementationComplete: false,
        },
        enableEvidence: true,
        commitEvidence: false,
        ciWatchEnabled: true,
        defaultFastMode: false,
      },
    });
    vi.mocked(mockRepository.load).mockResolvedValue(settings);

    const result = await useCase.execute({
      agentType: AgentType.ClaudeCode,
      model: null,
    });

    expect(result.environment.defaultEditor).toBe(EditorType.Cursor);
    expect(result.environment.shellPreference).toBe('zsh');
    expect(result.workflow.openPrOnImplementationComplete).toBe(true);
    expect(result.workflow.approvalGateDefaults.allowPrd).toBe(true);
    expect(result.workflow.enableEvidence).toBe(true);
  });

  it('should set updatedAt to a time after the call began', async () => {
    const settings = createTestSettings();
    vi.mocked(mockRepository.load).mockResolvedValue(settings);

    const before = new Date();
    const result = await useCase.execute({
      agentType: AgentType.ClaudeCode,
      model: null,
    });
    const after = new Date();

    expect(result.updatedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect(result.updatedAt.getTime()).toBeLessThanOrEqual(after.getTime());
  });

  // --------------------------------------------------------------------------
  // Error cases
  // --------------------------------------------------------------------------

  it('should throw when settings are not found', async () => {
    vi.mocked(mockRepository.load).mockResolvedValue(null);

    await expect(useCase.execute({ agentType: AgentType.ClaudeCode, model: null })).rejects.toThrow(
      'Settings not found'
    );
  });

  it('should not call repository.update when settings are not found', async () => {
    vi.mocked(mockRepository.load).mockResolvedValue(null);

    await expect(
      useCase.execute({ agentType: AgentType.ClaudeCode, model: null })
    ).rejects.toThrow();

    expect(mockRepository.update).not.toHaveBeenCalled();
  });

  it('should call repository.update with the updated settings object', async () => {
    const settings = createTestSettings();
    vi.mocked(mockRepository.load).mockResolvedValue(settings);

    await useCase.execute({
      agentType: AgentType.GeminiCli,
      model: 'gemini-1.5-pro',
    });

    const updatedArg = (mockRepository.update as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(updatedArg.onboardingComplete).toBe(true);
    expect(updatedArg.agent.type).toBe(AgentType.GeminiCli);
    expect(updatedArg.models.default).toBe('gemini-1.5-pro');
  });
});
