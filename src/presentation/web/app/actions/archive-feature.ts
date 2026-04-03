'use server';

import { resolve } from '@/lib/server-container';
import type { ArchiveFeatureUseCase } from '@shipit-ai/core/application/use-cases/features/archive-feature.use-case';
import type { Feature } from '@shipit-ai/core/domain/generated/output';

export async function archiveFeature(
  featureId: string
): Promise<{ feature?: Feature; error?: string }> {
  if (!featureId?.trim()) {
    return { error: 'id is required' };
  }

  try {
    const archiveFeatureUseCase = resolve<ArchiveFeatureUseCase>('ArchiveFeatureUseCase');
    const feature = await archiveFeatureUseCase.execute(featureId);
    return { feature };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to archive feature';
    return { error: message };
  }
}
