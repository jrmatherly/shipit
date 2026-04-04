import 'reflect-metadata';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { InitializeSettingsUseCase } from '@/application/use-cases/settings/initialize-settings.use-case.js';
import type { ISettingsRepository } from '@/application/ports/output/repositories/settings.repository.interface.js';
import type { IEnvironmentDetectorService } from '@/application/ports/output/services/environment-detector.service.js';
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
      desktop: { enabled: false },
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

describe('InitializeSettingsUseCase', () => {
  let useCase: InitializeSettingsUseCase;
  let mockRepository: ISettingsRepository;
  let mockEnvDetector: IEnvironmentDetectorService;

  beforeEach(() => {
    mockRepository = {
      initialize: vi.fn(),
      load: vi.fn(),
      update: vi.fn(),
    };
    mockEnvDetector = {
      detectDefaults: vi.fn().mockReturnValue({
        defaultEditor: null,
        defaultShell: null,
        defaultTerminal: null,
      }),
      listAvailableEditors: vi.fn().mockResolvedValue([]),
      listAvailableShells: vi.fn().mockResolvedValue([]),
    };
    useCase = new InitializeSettingsUseCase(mockRepository, mockEnvDetector);
  });

  it('does not modify existing settings', async () => {
    const existingSettings = createTestSettings({
      environment: {
        defaultEditor: EditorType.Cursor,
        shellPreference: 'fish',
        terminalPreference: TerminalType.ITerm2,
      },
    });
    vi.mocked(mockRepository.load).mockResolvedValue(existingSettings);

    const result = await useCase.execute();

    expect(result).toBe(existingSettings);
    expect(result.environment.defaultEditor).toBe(EditorType.Cursor);
    expect(result.environment.shellPreference).toBe('fish');
    expect(result.environment.terminalPreference).toBe(TerminalType.ITerm2);
    expect(mockEnvDetector.detectDefaults).not.toHaveBeenCalled();
    expect(mockRepository.initialize).not.toHaveBeenCalled();
  });

  it('uses detected defaults on first-time initialization', async () => {
    vi.mocked(mockRepository.load).mockResolvedValue(null);
    vi.mocked(mockEnvDetector.detectDefaults).mockReturnValue({
      defaultEditor: EditorType.Zed,
      defaultShell: 'zsh',
      defaultTerminal: TerminalType.Warp,
    });

    const result = await useCase.execute();

    expect(result.environment.defaultEditor).toBe(EditorType.Zed);
    expect(result.environment.shellPreference).toBe('zsh');
    expect(result.environment.terminalPreference).toBe(TerminalType.Warp);
    expect(mockRepository.initialize).toHaveBeenCalledOnce();
    expect(mockRepository.initialize).toHaveBeenCalledWith(
      expect.objectContaining({
        environment: expect.objectContaining({
          defaultEditor: EditorType.Zed,
          shellPreference: 'zsh',
          terminalPreference: TerminalType.Warp,
        }),
      })
    );
  });

  it('falls back to factory defaults when detection returns all nulls', async () => {
    vi.mocked(mockRepository.load).mockResolvedValue(null);
    vi.mocked(mockEnvDetector.detectDefaults).mockReturnValue({
      defaultEditor: null,
      defaultShell: null,
      defaultTerminal: null,
    });

    const result = await useCase.execute();

    expect(result.environment.defaultEditor).toBe(EditorType.VsCode);
    expect(result.environment.shellPreference).toBe('bash');
    expect(result.environment.terminalPreference).toBe(TerminalType.System);
    expect(mockRepository.initialize).toHaveBeenCalledOnce();
  });

  it('falls back to factory defaults when detection throws', async () => {
    vi.mocked(mockRepository.load).mockResolvedValue(null);
    vi.mocked(mockEnvDetector.detectDefaults).mockImplementation(() => {
      throw new Error('detection failure');
    });

    const result = await useCase.execute();

    expect(result.environment.defaultEditor).toBe(EditorType.VsCode);
    expect(result.environment.shellPreference).toBe('bash');
    expect(result.environment.terminalPreference).toBe(TerminalType.System);
    expect(mockRepository.initialize).toHaveBeenCalledOnce();
  });

  it('passes partial overrides correctly', async () => {
    vi.mocked(mockRepository.load).mockResolvedValue(null);
    vi.mocked(mockEnvDetector.detectDefaults).mockReturnValue({
      defaultEditor: null,
      defaultShell: 'zsh',
      defaultTerminal: null,
    });

    const result = await useCase.execute();

    // Only shell should change; editor and terminal keep factory defaults
    expect(result.environment.defaultEditor).toBe(EditorType.VsCode);
    expect(result.environment.shellPreference).toBe('zsh');
    expect(result.environment.terminalPreference).toBe(TerminalType.System);
    expect(mockRepository.initialize).toHaveBeenCalledOnce();
    expect(mockRepository.initialize).toHaveBeenCalledWith(
      expect.objectContaining({
        environment: expect.objectContaining({
          defaultEditor: EditorType.VsCode,
          shellPreference: 'zsh',
          terminalPreference: TerminalType.System,
        }),
      })
    );
  });
});
