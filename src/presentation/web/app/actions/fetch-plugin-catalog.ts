'use server';

import { resolve } from '@/lib/server-container';
import type { FetchPluginCatalogUseCase } from '@shipit-ai/core/application/use-cases/plugins/fetch-plugin-catalog.use-case';
import type { FetchPluginCatalogResult } from '@shipit-ai/core/application/use-cases/plugins/fetch-plugin-catalog.use-case';

export async function fetchPluginCatalogAction(): Promise<
  FetchPluginCatalogResult & { error?: string }
> {
  try {
    const useCase = resolve<FetchPluginCatalogUseCase>('FetchPluginCatalogUseCase');
    return await useCase.execute();
  } catch {
    return { plugins: [], installedPlugins: [], error: 'Failed to fetch plugin catalog' };
  }
}
