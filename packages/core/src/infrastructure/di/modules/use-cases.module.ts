import type { DependencyContainer } from 'tsyringe';

// Settings use cases
import { InitializeSettingsUseCase } from '../../../application/use-cases/settings/initialize-settings.use-case.js';
import { LoadSettingsUseCase } from '../../../application/use-cases/settings/load-settings.use-case.js';
import { UpdateSettingsUseCase } from '../../../application/use-cases/settings/update-settings.use-case.js';
import { CompleteOnboardingUseCase } from '../../../application/use-cases/settings/complete-onboarding.use-case.js';
import { CompleteWebOnboardingUseCase } from '../../../application/use-cases/settings/complete-web-onboarding.use-case.js';

// Agent use cases
import { ConfigureAgentUseCase } from '../../../application/use-cases/agents/configure-agent.use-case.js';
import { ValidateAgentAuthUseCase } from '../../../application/use-cases/agents/validate-agent-auth.use-case.js';
import { RunAgentUseCase } from '../../../application/use-cases/agents/run-agent.use-case.js';
import { GetAgentRunUseCase } from '../../../application/use-cases/agents/get-agent-run.use-case.js';
import { ListAgentRunsUseCase } from '../../../application/use-cases/agents/list-agent-runs.use-case.js';
import { StopAgentRunUseCase } from '../../../application/use-cases/agents/stop-agent-run.use-case.js';
import { DeleteAgentRunUseCase } from '../../../application/use-cases/agents/delete-agent-run.use-case.js';
import { ApproveAgentRunUseCase } from '../../../application/use-cases/agents/approve-agent-run.use-case.js';
import { RejectAgentRunUseCase } from '../../../application/use-cases/agents/reject-agent-run.use-case.js';
import { ReviewFeatureUseCase } from '../../../application/use-cases/agents/review-feature.use-case.js';

// Feature use cases
import { CreateFeatureUseCase } from '../../../application/use-cases/features/create/create-feature.use-case.js';
import { MetadataGenerator } from '../../../application/use-cases/features/create/metadata-generator.js';
import { SlugResolver } from '../../../application/use-cases/features/create/slug-resolver.js';
import { ListFeaturesUseCase } from '../../../application/use-cases/features/list-features.use-case.js';
import { ShowFeatureUseCase } from '../../../application/use-cases/features/show-feature.use-case.js';
import { DeleteFeatureUseCase } from '../../../application/use-cases/features/delete-feature.use-case.js';
import { ResumeFeatureUseCase } from '../../../application/use-cases/features/resume-feature.use-case.js';
import { StartFeatureUseCase } from '../../../application/use-cases/features/start-feature.use-case.js';
import { AdoptBranchUseCase } from '../../../application/use-cases/features/adopt-branch.use-case.js';
import { GetFeatureArtifactUseCase } from '../../../application/use-cases/features/get-feature-artifact.use-case.js';
import { GetResearchArtifactUseCase } from '../../../application/use-cases/features/get-research-artifact.use-case.js';
import { GetPlanArtifactUseCase } from '../../../application/use-cases/features/get-plan-artifact.use-case.js';
import { CheckAndUnblockFeaturesUseCase } from '../../../application/use-cases/features/check-and-unblock-features.use-case.js';
import { UpdateFeatureLifecycleUseCase } from '../../../application/use-cases/features/update/update-feature-lifecycle.use-case.js';
import { CleanupFeatureWorktreeUseCase } from '../../../application/use-cases/features/cleanup-feature-worktree.use-case.js';
import { ArchiveFeatureUseCase } from '../../../application/use-cases/features/archive-feature.use-case.js';
import { UnarchiveFeatureUseCase } from '../../../application/use-cases/features/unarchive-feature.use-case.js';
import { RebaseFeatureOnMainUseCase } from '../../../application/use-cases/features/rebase-feature-on-main.use-case.js';
import { GetBranchSyncStatusUseCase } from '../../../application/use-cases/features/get-branch-sync-status.use-case.js';
import { AutoResolveMergedBranchesUseCase } from '../../../application/use-cases/features/auto-resolve-merged-branches.use-case.js';

// Tool use cases
import { ValidateToolAvailabilityUseCase } from '../../../application/use-cases/tools/validate-tool-availability.use-case.js';
import { InstallToolUseCase } from '../../../application/use-cases/tools/install-tool.use-case.js';
import { ListToolsUseCase } from '../../../application/use-cases/tools/list-tools.use-case.js';
import { LaunchToolUseCase } from '../../../application/use-cases/tools/launch-tool.use-case.js';

// Repository use cases
import { AddRepositoryUseCase } from '../../../application/use-cases/repositories/add-repository.use-case.js';
import { ListRepositoriesUseCase } from '../../../application/use-cases/repositories/list-repositories.use-case.js';
import { DeleteRepositoryUseCase } from '../../../application/use-cases/repositories/delete-repository.use-case.js';
import { ImportGitHubRepositoryUseCase } from '../../../application/use-cases/repositories/import-github-repository.use-case.js';
import { ListGitHubRepositoriesUseCase } from '../../../application/use-cases/repositories/list-github-repositories.use-case.js';
import { ListGitHubOrganizationsUseCase } from '../../../application/use-cases/repositories/list-github-organizations.use-case.js';
import { SyncRepositoryMainUseCase } from '../../../application/use-cases/repositories/sync-repository-main.use-case.js';

// IDE use case
import { LaunchIdeUseCase } from '../../../application/use-cases/ide/launch-ide.use-case.js';

// Upgrade use case
import { UpgradeCliUseCase } from '../../../application/use-cases/upgrade/upgrade-cli.use-case.js';

// Conflict resolution
import { ConflictResolutionService } from '../../services/agents/conflict-resolution/conflict-resolution.service.js';

/**
 * Register all application use cases as singletons.
 *
 * NOTE: CheckAndUnblockFeaturesUseCase MUST be registered before
 * UpdateFeatureLifecycleUseCase because the latter injects the former via class token.
 */
export function registerUseCasesModule(container: DependencyContainer): void {
  // Settings
  container.registerSingleton(InitializeSettingsUseCase);
  container.registerSingleton(LoadSettingsUseCase);
  container.registerSingleton(UpdateSettingsUseCase);
  container.registerSingleton(CompleteOnboardingUseCase);
  container.registerSingleton(CompleteWebOnboardingUseCase);

  // Agents
  container.registerSingleton(ConfigureAgentUseCase);
  container.registerSingleton(ValidateAgentAuthUseCase);
  container.registerSingleton(RunAgentUseCase);
  container.registerSingleton(GetAgentRunUseCase);
  container.registerSingleton(ListAgentRunsUseCase);
  container.registerSingleton(StopAgentRunUseCase);
  container.registerSingleton(DeleteAgentRunUseCase);
  container.registerSingleton(ApproveAgentRunUseCase);
  container.registerSingleton(RejectAgentRunUseCase);
  container.registerSingleton(ReviewFeatureUseCase);

  // Feature creation utilities
  container.registerSingleton(MetadataGenerator);
  container.registerSingleton(SlugResolver);

  // Features
  container.registerSingleton(CreateFeatureUseCase);
  container.registerSingleton(ListFeaturesUseCase);
  container.registerSingleton(ShowFeatureUseCase);
  container.registerSingleton(DeleteFeatureUseCase);
  container.registerSingleton(ResumeFeatureUseCase);
  container.registerSingleton(StartFeatureUseCase);
  container.registerSingleton(AdoptBranchUseCase);
  container.registerSingleton(GetFeatureArtifactUseCase);
  container.registerSingleton(GetResearchArtifactUseCase);
  container.registerSingleton(GetPlanArtifactUseCase);
  // CheckAndUnblockFeaturesUseCase must be registered before UpdateFeatureLifecycleUseCase
  // because the latter injects the former via class token.
  container.registerSingleton(CheckAndUnblockFeaturesUseCase);
  container.registerSingleton(UpdateFeatureLifecycleUseCase);
  container.registerSingleton(CleanupFeatureWorktreeUseCase);
  container.registerSingleton(ArchiveFeatureUseCase);
  container.registerSingleton(UnarchiveFeatureUseCase);
  container.registerSingleton(RebaseFeatureOnMainUseCase);
  container.registerSingleton(GetBranchSyncStatusUseCase);
  container.registerSingleton(AutoResolveMergedBranchesUseCase);

  // Tools
  container.registerSingleton(ValidateToolAvailabilityUseCase);
  container.registerSingleton(InstallToolUseCase);
  container.registerSingleton(ListToolsUseCase);
  container.registerSingleton(LaunchToolUseCase);

  // IDE
  container.registerSingleton(LaunchIdeUseCase);

  // Repositories
  container.registerSingleton(AddRepositoryUseCase);
  container.registerSingleton(ListRepositoriesUseCase);
  container.registerSingleton(DeleteRepositoryUseCase);
  container.registerSingleton(ImportGitHubRepositoryUseCase);
  container.registerSingleton(ListGitHubRepositoriesUseCase);
  container.registerSingleton(ListGitHubOrganizationsUseCase);
  container.registerSingleton(SyncRepositoryMainUseCase);

  // Upgrade
  container.registerSingleton(UpgradeCliUseCase);

  // Conflict resolution
  container.registerSingleton(ConflictResolutionService);
  container.register('ConflictResolutionService', {
    useFactory: (c) => c.resolve(ConflictResolutionService),
  });
}
