import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PluginsPageClient } from '@/components/features/plugins/plugins-page-client';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('@/app/actions/fetch-plugin-catalog', () => ({
  fetchPluginCatalogAction: vi.fn().mockResolvedValue({
    plugins: [
      {
        name: 'superpowers',
        description: 'Advanced automation',
        version: '2.1.0',
        source: { source: 'github', repo: 'anthropics/superpowers' },
        category: 'productivity',
      },
      {
        name: 'code-review-graph',
        description: 'Knowledge graph for code review',
        version: '1.5.0',
        source: { source: 'github', repo: 'anthropics/code-review-graph' },
        category: 'code-quality',
      },
    ],
    installedPlugins: [
      { id: 'superpowers@claude-plugins-official', scope: 'user', version: '2.1.0', enabled: true },
    ],
  }),
}));

vi.mock('@/app/actions/install-plugin', () => ({
  installPluginAction: vi.fn().mockResolvedValue({ success: true }),
}));

vi.mock('@/app/actions/uninstall-plugin', () => ({
  uninstallPluginAction: vi.fn().mockResolvedValue({ success: true }),
}));

vi.mock('@/app/actions/toggle-plugin', () => ({
  togglePluginAction: vi.fn().mockResolvedValue({ success: true }),
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

describe('PluginsPageClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should show no proxy message when proxy not configured', () => {
    render(<PluginsPageClient proxyConfigured={false} />);
    expect(screen.getByText('plugins.noProxy')).toBeDefined();
  });

  it('should render page header', () => {
    render(<PluginsPageClient proxyConfigured={true} />);
    expect(screen.getByText('plugins.title')).toBeDefined();
  });

  it('should render search input when proxy configured', async () => {
    render(<PluginsPageClient proxyConfigured={true} />);
    // Wait for loading state to resolve
    await vi.waitFor(() => {
      expect(screen.getByTestId('plugin-search')).toBeDefined();
    });
  });
});
