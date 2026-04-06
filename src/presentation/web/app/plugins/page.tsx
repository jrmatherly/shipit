import { notFound } from 'next/navigation';
import { getFeatureFlags } from '@/lib/feature-flags';
import { PluginsPageClient } from '@/components/features/plugins/plugins-page-client';
import { resolve } from '@/lib/server-container';
import type { LoadSettingsUseCase } from '@shipit-ai/core/application/use-cases/settings/load-settings.use-case';

export default async function PluginsPage() {
  const flags = await getFeatureFlags();
  if (!flags.plugins) notFound();

  let proxyConfigured = false;
  try {
    const useCase = resolve<LoadSettingsUseCase>('LoadSettingsUseCase');
    const settings = await useCase.execute();
    proxyConfigured = !!(
      settings.litellmProxy?.baseUrl && settings.litellmProxy?.marketplaceEnabled
    );
  } catch {
    // Settings not available
  }

  return <PluginsPageClient proxyConfigured={proxyConfigured} />;
}
