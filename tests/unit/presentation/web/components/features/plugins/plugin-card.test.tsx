import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PluginCard } from '@/components/features/plugins/plugin-card';
import {
  createMockPluginMarketplaceEntry,
  createMockInstalledPlugin,
} from '@tests/factories/index.js';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

describe('PluginCard', () => {
  const defaultPlugin = createMockPluginMarketplaceEntry();
  const onSelect = vi.fn();
  const onToggle = vi.fn();

  it('should render plugin name and description', () => {
    render(<PluginCard plugin={defaultPlugin} onSelect={onSelect} />);
    expect(screen.getByText('test-plugin')).toBeDefined();
    expect(screen.getByText('A test plugin for unit tests')).toBeDefined();
  });

  it('should render version when provided', () => {
    render(<PluginCard plugin={defaultPlugin} onSelect={onSelect} />);
    expect(screen.getByText('v1.0.0')).toBeDefined();
  });

  it('should render category badge', () => {
    render(<PluginCard plugin={defaultPlugin} onSelect={onSelect} />);
    expect(screen.getByText('productivity')).toBeDefined();
  });

  it('should show installed badge when installed', () => {
    const installed = createMockInstalledPlugin();
    render(
      <PluginCard
        plugin={defaultPlugin}
        installed={installed}
        onSelect={onSelect}
        onToggle={onToggle}
      />
    );
    expect(screen.getByText('plugins.installed')).toBeDefined();
  });

  it('should show not installed badge when not installed', () => {
    render(<PluginCard plugin={defaultPlugin} onSelect={onSelect} />);
    expect(screen.getByText('plugins.notInstalled')).toBeDefined();
  });

  it('should call onSelect when clicked', async () => {
    const user = userEvent.setup();
    render(<PluginCard plugin={defaultPlugin} onSelect={onSelect} />);
    await user.click(screen.getByTestId('plugin-card-test-plugin'));
    expect(onSelect).toHaveBeenCalledWith(defaultPlugin);
  });

  it('should show toggle switch when installed', () => {
    const installed = createMockInstalledPlugin();
    render(
      <PluginCard
        plugin={defaultPlugin}
        installed={installed}
        onSelect={onSelect}
        onToggle={onToggle}
      />
    );
    expect(screen.getByTestId('plugin-toggle-test-plugin')).toBeDefined();
  });
});
