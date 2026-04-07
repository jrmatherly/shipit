import type { DependencyContainer } from 'tsyringe';

// Feature use cases
import { CreateFeatureUseCase } from '../../../application/use-cases/features/create/create-feature.use-case.js';
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

// Agent use cases
import { ApproveAgentRunUseCase } from '../../../application/use-cases/agents/approve-agent-run.use-case.js';
import { RejectAgentRunUseCase } from '../../../application/use-cases/agents/reject-agent-run.use-case.js';
import { StopAgentRunUseCase } from '../../../application/use-cases/agents/stop-agent-run.use-case.js';
import { PollAgentEventsUseCase } from '../../../application/use-cases/agents/poll-agent-events.use-case.js';

// Tool use cases
import { InstallToolUseCase } from '../../../application/use-cases/tools/install-tool.use-case.js';
import { ListToolsUseCase } from '../../../application/use-cases/tools/list-tools.use-case.js';
import { LaunchToolUseCase } from '../../../application/use-cases/tools/launch-tool.use-case.js';
import { LaunchIdeUseCase } from '../../../application/use-cases/ide/launch-ide.use-case.js';

// Repository use cases
import { AddRepositoryUseCase } from '../../../application/use-cases/repositories/add-repository.use-case.js';
import { ListRepositoriesUseCase } from '../../../application/use-cases/repositories/list-repositories.use-case.js';
import { DeleteRepositoryUseCase } from '../../../application/use-cases/repositories/delete-repository.use-case.js';
import { ImportGitHubRepositoryUseCase } from '../../../application/use-cases/repositories/import-github-repository.use-case.js';
import { ListGitHubRepositoriesUseCase } from '../../../application/use-cases/repositories/list-github-repositories.use-case.js';
import { ListGitHubOrganizationsUseCase } from '../../../application/use-cases/repositories/list-github-organizations.use-case.js';
import { SyncRepositoryMainUseCase } from '../../../application/use-cases/repositories/sync-repository-main.use-case.js';

// Settings use cases
import { LoadSettingsUseCase } from '../../../application/use-cases/settings/load-settings.use-case.js';
import { UpdateSettingsUseCase } from '../../../application/use-cases/settings/update-settings.use-case.js';
import { CompleteWebOnboardingUseCase } from '../../../application/use-cases/settings/complete-web-onboarding.use-case.js';

// Plugin marketplace use cases
import { FetchPluginCatalogUseCase } from '../../../application/use-cases/plugins/fetch-plugin-catalog.use-case.js';
import { InstallPluginUseCase } from '../../../application/use-cases/plugins/install-plugin.use-case.js';
import { UninstallPluginUseCase } from '../../../application/use-cases/plugins/uninstall-plugin.use-case.js';
import { TogglePluginUseCase } from '../../../application/use-cases/plugins/toggle-plugin.use-case.js';
import { AddMarketplaceUseCase } from '../../../application/use-cases/plugins/add-marketplace.use-case.js';

// MCP server browser use cases
import { FetchMcpServersUseCase } from '../../../application/use-cases/mcp-servers/fetch-mcp-servers.use-case.js';
import { FetchMcpServerToolsUseCase } from '../../../application/use-cases/mcp-servers/fetch-mcp-server-tools.use-case.js';

// Upgrade use case
import { UpgradeCliUseCase } from '../../../application/use-cases/upgrade/upgrade-cli.use-case.js';

// Interactive session use cases
import { StartInteractiveSessionUseCase } from '../../../application/use-cases/interactive/start-interactive-session.use-case.js';
import { SendInteractiveMessageUseCase } from '../../../application/use-cases/interactive/send-interactive-message.use-case.js';
import { StopInteractiveSessionUseCase } from '../../../application/use-cases/interactive/stop-interactive-session.use-case.js';
import { GetInteractiveChatStateUseCase } from '../../../application/use-cases/interactive/get-interactive-chat-state.use-case.js';

/**
 * Register string-token aliases for web routes.
 *
 * Turbopack can't resolve .js→.ts imports inside @shipit-ai/core,
 * so routes use string tokens instead of class refs.
 */
export function registerWebTokensModule(container: DependencyContainer): void {
  // Features
  container.register('CreateFeatureUseCase', {
    useFactory: (c) => c.resolve(CreateFeatureUseCase),
  });
  container.register('ListFeaturesUseCase', { useFactory: (c) => c.resolve(ListFeaturesUseCase) });
  container.register('ShowFeatureUseCase', { useFactory: (c) => c.resolve(ShowFeatureUseCase) });
  container.register('DeleteFeatureUseCase', {
    useFactory: (c) => c.resolve(DeleteFeatureUseCase),
  });
  container.register('ResumeFeatureUseCase', {
    useFactory: (c) => c.resolve(ResumeFeatureUseCase),
  });
  container.register('StartFeatureUseCase', { useFactory: (c) => c.resolve(StartFeatureUseCase) });
  container.register('AdoptBranchUseCase', { useFactory: (c) => c.resolve(AdoptBranchUseCase) });
  container.register('GetFeatureArtifactUseCase', {
    useFactory: (c) => c.resolve(GetFeatureArtifactUseCase),
  });
  container.register('GetResearchArtifactUseCase', {
    useFactory: (c) => c.resolve(GetResearchArtifactUseCase),
  });
  container.register('GetPlanArtifactUseCase', {
    useFactory: (c) => c.resolve(GetPlanArtifactUseCase),
  });
  container.register('CheckAndUnblockFeaturesUseCase', {
    useFactory: (c) => c.resolve(CheckAndUnblockFeaturesUseCase),
  });
  container.register('UpdateFeatureLifecycleUseCase', {
    useFactory: (c) => c.resolve(UpdateFeatureLifecycleUseCase),
  });
  container.register('CleanupFeatureWorktreeUseCase', {
    useFactory: (c) => c.resolve(CleanupFeatureWorktreeUseCase),
  });
  container.register('ArchiveFeatureUseCase', {
    useFactory: (c) => c.resolve(ArchiveFeatureUseCase),
  });
  container.register('UnarchiveFeatureUseCase', {
    useFactory: (c) => c.resolve(UnarchiveFeatureUseCase),
  });
  container.register('RebaseFeatureOnMainUseCase', {
    useFactory: (c) => c.resolve(RebaseFeatureOnMainUseCase),
  });
  container.register('GetBranchSyncStatusUseCase', {
    useFactory: (c) => c.resolve(GetBranchSyncStatusUseCase),
  });
  container.register('AutoResolveMergedBranchesUseCase', {
    useFactory: (c) => c.resolve(AutoResolveMergedBranchesUseCase),
  });

  // Agents
  container.register('ApproveAgentRunUseCase', {
    useFactory: (c) => c.resolve(ApproveAgentRunUseCase),
  });
  container.register('RejectAgentRunUseCase', {
    useFactory: (c) => c.resolve(RejectAgentRunUseCase),
  });
  container.register('StopAgentRunUseCase', {
    useFactory: (c) => c.resolve(StopAgentRunUseCase),
  });
  container.register('PollAgentEventsUseCase', {
    useFactory: (c) => c.resolve(PollAgentEventsUseCase),
  });

  // Tools
  container.register('InstallToolUseCase', { useFactory: (c) => c.resolve(InstallToolUseCase) });
  container.register('ListToolsUseCase', { useFactory: (c) => c.resolve(ListToolsUseCase) });
  container.register('LaunchToolUseCase', { useFactory: (c) => c.resolve(LaunchToolUseCase) });
  container.register('LaunchIdeUseCase', { useFactory: (c) => c.resolve(LaunchIdeUseCase) });

  // Repositories
  container.register('AddRepositoryUseCase', {
    useFactory: (c) => c.resolve(AddRepositoryUseCase),
  });
  container.register('ListRepositoriesUseCase', {
    useFactory: (c) => c.resolve(ListRepositoriesUseCase),
  });
  container.register('DeleteRepositoryUseCase', {
    useFactory: (c) => c.resolve(DeleteRepositoryUseCase),
  });
  container.register('ImportGitHubRepositoryUseCase', {
    useFactory: (c) => c.resolve(ImportGitHubRepositoryUseCase),
  });
  container.register('ListGitHubRepositoriesUseCase', {
    useFactory: (c) => c.resolve(ListGitHubRepositoriesUseCase),
  });
  container.register('ListGitHubOrganizationsUseCase', {
    useFactory: (c) => c.resolve(ListGitHubOrganizationsUseCase),
  });
  container.register('SyncRepositoryMainUseCase', {
    useFactory: (c) => c.resolve(SyncRepositoryMainUseCase),
  });

  // Settings
  container.register('LoadSettingsUseCase', { useFactory: (c) => c.resolve(LoadSettingsUseCase) });
  container.register('UpdateSettingsUseCase', {
    useFactory: (c) => c.resolve(UpdateSettingsUseCase),
  });
  container.register('CompleteWebOnboardingUseCase', {
    useFactory: (c) => c.resolve(CompleteWebOnboardingUseCase),
  });

  // Upgrade
  container.register('UpgradeCliUseCase', { useFactory: (c) => c.resolve(UpgradeCliUseCase) });

  // Interactive sessions
  container.register('StartInteractiveSessionUseCase', {
    useFactory: (c) => c.resolve(StartInteractiveSessionUseCase),
  });
  container.register('SendInteractiveMessageUseCase', {
    useFactory: (c) => c.resolve(SendInteractiveMessageUseCase),
  });
  container.register('StopInteractiveSessionUseCase', {
    useFactory: (c) => c.resolve(StopInteractiveSessionUseCase),
  });
  container.register('GetInteractiveChatStateUseCase', {
    useFactory: (c) => c.resolve(GetInteractiveChatStateUseCase),
  });

  // Plugin marketplace
  container.register('FetchPluginCatalogUseCase', {
    useFactory: (c) => c.resolve(FetchPluginCatalogUseCase),
  });
  container.register('InstallPluginUseCase', {
    useFactory: (c) => c.resolve(InstallPluginUseCase),
  });
  container.register('UninstallPluginUseCase', {
    useFactory: (c) => c.resolve(UninstallPluginUseCase),
  });
  container.register('TogglePluginUseCase', {
    useFactory: (c) => c.resolve(TogglePluginUseCase),
  });
  container.register('AddMarketplaceUseCase', {
    useFactory: (c) => c.resolve(AddMarketplaceUseCase),
  });

  // MCP server browser
  container.register('FetchMcpServersUseCase', {
    useFactory: (c) => c.resolve(FetchMcpServersUseCase),
  });
  container.register('FetchMcpServerToolsUseCase', {
    useFactory: (c) => c.resolve(FetchMcpServerToolsUseCase),
  });
}
