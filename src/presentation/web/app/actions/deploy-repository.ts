'use server';

import { existsSync } from 'node:fs';
import { isAbsolute } from 'node:path';
import { resolve } from '@/lib/server-container';
import { createDeploymentLogger } from '@/lib/core-utils';
import type { IDeploymentService } from '@shipit-ai/core/application/ports/output/services/deployment-service.interface';
import { DeploymentState } from '@shipit-ai/core/domain/generated/output';
import { isSameShipitAiInstance } from '@/lib/is-same-shipit-ai-instance';

const log = createDeploymentLogger('[deployRepository]');

export async function deployRepository(
  repositoryPath: string
): Promise<{ success: boolean; error?: string; state?: DeploymentState }> {
  log.info(`called — repositoryPath="${repositoryPath}"`);

  if (!repositoryPath || !isAbsolute(repositoryPath)) {
    log.warn('rejected — not an absolute path');
    return { success: false, error: 'repositoryPath must be an absolute path' };
  }

  try {
    if (!existsSync(repositoryPath)) {
      log.warn(`directory does not exist: "${repositoryPath}"`);
      return { success: false, error: `Directory does not exist: ${repositoryPath}` };
    }

    if (isSameShipitAiInstance(repositoryPath)) {
      log.warn('rejected — target is the running shep instance');
      return {
        success: false,
        error: 'Cannot start a dev server for the repository Shep is running from',
      };
    }

    log.info('directory exists, calling deploymentService.start()');
    const deploymentService = resolve<IDeploymentService>('IDeploymentService');
    deploymentService.start(repositoryPath, repositoryPath, 'repository');

    log.info('start() returned successfully — state=Booting');
    return { success: true, state: DeploymentState.Booting };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to deploy repository';
    log.error(`error: ${message}`, error);
    return { success: false, error: message };
  }
}
