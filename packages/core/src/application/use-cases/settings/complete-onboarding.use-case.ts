/**
 * Complete Onboarding Use Case
 *
 * Accepts wizard results (agent config, IDE, workflow defaults),
 * merges them into the current settings, sets onboardingComplete=true,
 * and persists atomically via ISettingsRepository.
 */

import { injectable, inject } from 'tsyringe';
import type {
  Settings,
  AgentType,
  AgentAuthMethod,
  AgentPermissionSettings,
  EditorType,
} from '../../../domain/generated/output.js';
import type { ISettingsRepository } from '../../ports/output/repositories/settings.repository.interface.js';

/**
 * Maps AgentType enum values to their corresponding AgentPermissionSettings key.
 */
const PERMISSION_KEY_BY_AGENT: Record<string, keyof AgentPermissionSettings> = {
  'claude-code': 'claudeCode',
  cursor: 'cursor',
  'gemini-cli': 'geminiCli',
  'codex-cli': 'codexCli',
  'copilot-cli': 'copilotCli',
  'rovo-dev': 'rovoDev',
};

/**
 * Input for completing onboarding.
 */
export interface CompleteOnboardingInput {
  agent: {
    type: AgentType;
    authMethod: AgentAuthMethod;
    token?: string;
  };
  /** Permission mode selected for the agent, or undefined if skipped */
  permissionMode?: string;
  ide: string;
  workflowDefaults: {
    allowPrd: boolean;
    allowPlan: boolean;
    allowMerge: boolean;
    pushOnImplementationComplete: boolean;
    openPrOnImplementationComplete: boolean;
  };
}

/**
 * Use case for completing first-run onboarding.
 * Loads current settings, merges wizard results, sets onboardingComplete=true,
 * and persists in a single atomic write.
 */
@injectable()
export class CompleteOnboardingUseCase {
  constructor(
    @inject('ISettingsRepository')
    private readonly settingsRepository: ISettingsRepository
  ) {}

  async execute(input: CompleteOnboardingInput): Promise<Settings> {
    const settings = await this.settingsRepository.load();
    if (!settings) {
      throw new Error('Settings not found. Please run initialization first.');
    }

    // Build permissions: start from current or defaults, then overlay any chosen mode
    let permissions = settings.agent.permissions;
    if (input.permissionMode !== undefined) {
      const key = PERMISSION_KEY_BY_AGENT[input.agent.type as string];
      if (key) {
        permissions = {
          ...permissions,
          [key]: input.permissionMode,
        };
      }
    }

    const updatedSettings: Settings = {
      ...settings,
      agent: {
        type: input.agent.type,
        authMethod: input.agent.authMethod,
        ...(input.agent.token !== undefined && { token: input.agent.token }),
        ...(permissions !== undefined && { permissions }),
      },
      environment: {
        ...settings.environment,
        defaultEditor: input.ide as EditorType,
      },
      workflow: {
        ...settings.workflow,
        approvalGateDefaults: {
          allowPrd: input.workflowDefaults.allowPrd,
          allowPlan: input.workflowDefaults.allowPlan,
          allowMerge: input.workflowDefaults.allowMerge,
          pushOnImplementationComplete: input.workflowDefaults.pushOnImplementationComplete,
        },
        openPrOnImplementationComplete: input.workflowDefaults.openPrOnImplementationComplete,
      },
      onboardingComplete: true,
      updatedAt: new Date(),
    };

    await this.settingsRepository.update(updatedSettings);
    return updatedSettings;
  }
}
