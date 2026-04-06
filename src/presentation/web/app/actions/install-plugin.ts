'use server';

import { resolve } from '@/lib/server-container';
import type { InstallPluginUseCase } from '@shipit-ai/core/application/use-cases/plugins/install-plugin.use-case';

export async function installPluginAction(
  pluginId: string,
  marketplace: string,
  scope?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const useCase = resolve<InstallPluginUseCase>('InstallPluginUseCase');
    return await useCase.execute({ pluginId, marketplace, scope });
  } catch {
    return { success: false, error: 'Failed to install plugin' };
  }
}
