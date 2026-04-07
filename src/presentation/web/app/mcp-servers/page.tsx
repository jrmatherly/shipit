import { notFound } from 'next/navigation';
import { getFeatureFlags } from '@/lib/feature-flags';
import { McpServersPageClient } from '@/components/features/mcp-servers/mcp-servers-page-client';
import { resolve } from '@/lib/server-container';
import type { LoadSettingsUseCase } from '@shipit-ai/core/application/use-cases/settings/load-settings.use-case';

export default async function McpServersPage() {
  const flags = await getFeatureFlags();
  if (!flags.mcpServers) notFound();

  let proxyConfigured = false;
  let proxyBaseUrl = '';
  try {
    const useCase = resolve<LoadSettingsUseCase>('LoadSettingsUseCase');
    const settings = await useCase.execute();
    proxyConfigured = !!settings.litellmProxy?.baseUrl;
    proxyBaseUrl = settings.litellmProxy?.baseUrl ?? '';
  } catch {
    // Settings not available
  }

  return <McpServersPageClient proxyConfigured={proxyConfigured} proxyBaseUrl={proxyBaseUrl} />;
}
