import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PluginDetailDrawer } from '@/components/features/plugins/plugin-detail-drawer';
import {
  createMockPluginMarketplaceEntry,
  createMockInstalledPlugin,
} from '@tests/factories/index.js';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { dir: () => 'ltr' },
  }),
}));

describe('PluginDetailDrawer', () => {
  const defaultPlugin = createMockPluginMarketplaceEntry();
  const onClose = vi.fn();
  const onInstall = vi.fn();
  const onUninstall = vi.fn();

  it('should render plugin details when open', () => {
    render(
      <PluginDetailDrawer
        plugin={defaultPlugin}
        open={true}
        onClose={onClose}
        onInstall={onInstall}
        onUninstall={onUninstall}
      />
    );
    expect(screen.getByText('test-plugin')).toBeDefined();
    expect(screen.getByText('A test plugin for unit tests')).toBeDefined();
  });

  it('should show install button when not installed', () => {
    render(
      <PluginDetailDrawer
        plugin={defaultPlugin}
        open={true}
        onClose={onClose}
        onInstall={onInstall}
      />
    );
    expect(screen.getByTestId('plugin-install-button')).toBeDefined();
  });

  it('should show uninstall button when installed', () => {
    const installed = createMockInstalledPlugin();
    render(
      <PluginDetailDrawer
        plugin={defaultPlugin}
        installed={installed}
        open={true}
        onClose={onClose}
        onUninstall={onUninstall}
      />
    );
    expect(screen.getByTestId('plugin-uninstall-button')).toBeDefined();
  });

  it('should render source link for github plugins', () => {
    render(<PluginDetailDrawer plugin={defaultPlugin} open={true} onClose={onClose} />);
    const link = screen.getByText('org/test-plugin');
    expect(link).toBeDefined();
    expect(link.closest('a')?.getAttribute('href')).toBe('https://github.com/org/test-plugin');
  });

  it('should not render link for invalid URL scheme', () => {
    const plugin = createMockPluginMarketplaceEntry({
      source: { source: 'url', url: 'ftp://evil.com/plugin.git' },
    });
    render(<PluginDetailDrawer plugin={plugin} open={true} onClose={onClose} />);
    expect(screen.queryByRole('link')).toBeNull();
  });

  it('should return null when plugin is null', () => {
    const { container } = render(
      <PluginDetailDrawer plugin={null} open={true} onClose={onClose} />
    );
    expect(container.innerHTML).toBe('');
  });
});
