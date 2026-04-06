'use server';

import { resolve } from '@/lib/server-container';
import type { TogglePluginUseCase } from '@shipit-ai/core/application/use-cases/plugins/toggle-plugin.use-case';

export async function togglePluginAction(
  pluginId: string,
  marketplace: string,
  enabled: boolean
): Promise<{ success: boolean; error?: string }> {
  try {
    const useCase = resolve<TogglePluginUseCase>('TogglePluginUseCase');
    return await useCase.execute({ pluginId, marketplace, enabled });
  } catch {
    return { success: false, error: 'Failed to toggle plugin' };
  }
}
