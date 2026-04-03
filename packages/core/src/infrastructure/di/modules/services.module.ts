import type { DependencyContainer } from 'tsyringe';
import type Database from 'better-sqlite3';

import type { IAgentValidator } from '../../../application/ports/output/agents/agent-validator.interface.js';
import { AgentValidatorService } from '../../services/agents/common/agent-validator.service.js';
import type { IVersionService } from '../../../application/ports/output/services/version-service.interface.js';
import { VersionService } from '../../services/version.service.js';
import type { IWebServerService } from '../../../application/ports/output/services/web-server-service.interface.js';
import type { IWorktreeService } from '../../../application/ports/output/services/worktree-service.interface.js';
import { WorktreeService } from '../../services/git/worktree.service.js';
import type { IToolInstallerService } from '../../../application/ports/output/services/tool-installer.service.js';
import { ToolInstallerServiceImpl } from '../../services/tool-installer/tool-installer.service.js';
import type { IGitPrService } from '../../../application/ports/output/services/git-pr-service.interface.js';
import { GitPrService } from '../../services/git/git-pr.service.js';
import type { IGitForkService } from '../../../application/ports/output/services/git-fork-service.interface.js';
import { GitForkService } from '../../services/git/git-fork.service.js';
import type { IGitHubRepositoryService } from '../../../application/ports/output/services/github-repository-service.interface.js';
import { GitHubRepositoryService } from '../../services/external/github-repository.service.js';
import type { IIdeLauncherService } from '../../../application/ports/output/services/ide-launcher-service.interface.js';
import { JsonDrivenIdeLauncherService } from '../../services/ide-launchers/json-driven-ide-launcher.service.js';
import type { IDaemonService } from '../../../application/ports/output/services/daemon-service.interface.js';
import { DaemonPidService } from '../../services/daemon/daemon-pid.service.js';
import type { IDeploymentService } from '../../../application/ports/output/services/deployment-service.interface.js';
import { DeploymentService } from '../../services/deployment/deployment.service.js';
import { AttachmentStorageService } from '../../services/attachment-storage.service.js';

/**
 * Register business services (singletons and factories).
 */
export function registerServicesModule(
  container: DependencyContainer,
  db: Database.Database
): void {
  container.registerSingleton<IAgentValidator>('IAgentValidator', AgentValidatorService);
  container.registerSingleton<IVersionService>('IVersionService', VersionService);

  // IWebServerService is registered as a lazy proxy to avoid importing `next`
  // (~80ms) for non-web commands. The actual service is loaded on first method call.
  container.register<IWebServerService>('IWebServerService', {
    useFactory: () => {
      let instance: IWebServerService | null = null;
      const getInstance = async (): Promise<IWebServerService> => {
        if (!instance) {
          const { WebServerService } = await import('../../services/web-server.service.js');
          instance = new WebServerService();
        }
        return instance;
      };
      return new Proxy({} as IWebServerService, {
        get: (_target, prop) => {
          return async (...args: unknown[]) => {
            const svc = await getInstance();
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            return (svc as any)[prop](...args);
          };
        },
      });
    },
  });

  container.registerSingleton<IWorktreeService>('IWorktreeService', WorktreeService);
  container.registerSingleton<IToolInstallerService>(
    'IToolInstallerService',
    ToolInstallerServiceImpl
  );
  container.registerSingleton<IGitPrService>('IGitPrService', GitPrService);
  container.registerSingleton<IGitForkService>('IGitForkService', GitForkService);
  container.registerSingleton<IGitHubRepositoryService>(
    'IGitHubRepositoryService',
    GitHubRepositoryService
  );
  container.registerSingleton<IIdeLauncherService>(
    'IIdeLauncherService',
    JsonDrivenIdeLauncherService
  );
  container.registerSingleton<IDaemonService>('IDaemonService', DaemonPidService);
  container.registerSingleton(AttachmentStorageService);
  container.register('AttachmentStorageService', { useToken: AttachmentStorageService });

  const deploymentService = new DeploymentService();
  deploymentService.setDatabase(db);
  deploymentService.recoverAll();
  container.registerInstance<IDeploymentService>('IDeploymentService', deploymentService);
}
