'use server';

import { existsSync } from 'node:fs';
import { resolve } from '@/lib/server-container';
import { createDeploymentLogger, computeWorktreePath } from '@/lib/core-utils';
import type { IFeatureRepository } from '@shipit-ai/core/application/ports/output/repositories/feature-repository.interface';
import type { IDeploymentService } from '@shipit-ai/core/application/ports/output/services/deployment-service.interface';
import { DeploymentState } from '@shipit-ai/core/domain/generated/output';
import { isSameShipitAiInstance } from '@/lib/is-same-shipit-ai-instance';

const log = createDeploymentLogger('[deployFeature]');

export async function deployFeature(
  featureId: string
): Promise<{ success: boolean; error?: string; state?: DeploymentState }> {
  log.info(`called — featureId="${featureId}"`);

  if (!featureId?.trim()) {
    log.warn('rejected — featureId is empty');
    return { success: false, error: 'featureId is required' };
  }

  try {
    const featureRepo = resolve<IFeatureRepository>('IFeatureRepository');
    const feature = await featureRepo.findById(featureId);

    if (!feature) {
      log.warn(`feature not found in repository: "${featureId}"`);
      return { success: false, error: `Feature not found: ${featureId}` };
    }

    log.info(
      `feature found — repositoryPath="${feature.repositoryPath}", branch="${feature.branch}"`
    );

    const worktreePath = computeWorktreePath(feature.repositoryPath, feature.branch);
    log.info(`computed worktreePath="${worktreePath}"`);

    if (!existsSync(worktreePath)) {
      log.warn(`worktree path does not exist on disk: "${worktreePath}"`);
      return { success: false, error: `Worktree path does not exist: ${worktreePath}` };
    }

    if (isSameShipitAiInstance(feature.repositoryPath)) {
      log.warn('rejected — feature belongs to the running shep instance');
      return {
        success: false,
        error: 'Cannot start a dev server for features of the repository Shep is running from',
      };
    }

    log.info('worktree path exists, calling deploymentService.start()');
    const deploymentService = resolve<IDeploymentService>('IDeploymentService');
    deploymentService.start(featureId, worktreePath, 'feature');

    log.info('start() returned successfully — state=Booting');
    return { success: true, state: DeploymentState.Booting };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to deploy feature';
    log.error(`error: ${message}`, error);
    return { success: false, error: message };
  }
}
