'use server';

import { resolve } from '@/lib/server-container';
import type { UninstallPluginUseCase } from '@shipit-ai/core/application/use-cases/plugins/uninstall-plugin.use-case';

export async function uninstallPluginAction(
  pluginId: string,
  marketplace: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const useCase = resolve<UninstallPluginUseCase>('UninstallPluginUseCase');
    return await useCase.execute({ pluginId, marketplace });
  } catch {
    return { success: false, error: 'Failed to uninstall plugin' };
  }
}
