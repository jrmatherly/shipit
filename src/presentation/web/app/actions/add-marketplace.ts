'use server';

import { resolve } from '@/lib/server-container';
import type { AddMarketplaceUseCase } from '@shipit-ai/core/application/use-cases/plugins/add-marketplace.use-case';

export async function addMarketplaceAction(
  url: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const useCase = resolve<AddMarketplaceUseCase>('AddMarketplaceUseCase');
    return await useCase.execute({ url });
  } catch {
    return { success: false, error: 'Failed to add marketplace' };
  }
}
