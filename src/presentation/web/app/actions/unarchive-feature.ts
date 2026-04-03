'use server';

import { resolve } from '@/lib/server-container';
import type { UnarchiveFeatureUseCase } from '@shipit-ai/core/application/use-cases/features/unarchive-feature.use-case';
import type { Feature } from '@shipit-ai/core/domain/generated/output';

export async function unarchiveFeature(
  featureId: string
): Promise<{ feature?: Feature; error?: string }> {
  if (!featureId?.trim()) {
    return { error: 'id is required' };
  }

  try {
    const unarchiveFeatureUseCase = resolve<UnarchiveFeatureUseCase>('UnarchiveFeatureUseCase');
    const feature = await unarchiveFeatureUseCase.execute(featureId);
    return { feature };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to unarchive feature';
    return { error: message };
  }
}
