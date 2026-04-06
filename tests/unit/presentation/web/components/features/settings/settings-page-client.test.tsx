import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TooltipProvider } from '@/components/ui/tooltip';
import { SettingsPageClient } from '@/components/features/settings/settings-page-client';
import { createDefaultSettings } from '@shipit-ai/core/domain/factories/settings-defaults.factory';

vi.mock('@/app/actions/update-settings', () => ({
  updateSettingsAction: vi.fn().mockResolvedValue({ success: true }),
}));

vi.mock('@/app/actions/add-marketplace', () => ({
  addMarketplaceAction: vi.fn().mockResolvedValue({ success: true }),
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

// Mock IntersectionObserver for jsdom
vi.stubGlobal(
  'IntersectionObserver',
  class {
    observe = vi.fn();
    unobserve = vi.fn();
    disconnect = vi.fn();
  }
);

function renderPage(overrides?: Partial<Parameters<typeof SettingsPageClient>[0]>) {
  const settings = createDefaultSettings();
  return render(
    <TooltipProvider>
      <SettingsPageClient
        settings={settings}
        shipitAiHome="/home/user/.shipit-ai"
        dbFileSize="2.4 MB"
        {...overrides}
      />
    </TooltipProvider>
  );
}

describe('SettingsPageClient', () => {
  it('renders heading text "Settings"', () => {
    renderPage();
    expect(screen.getByText('Settings')).toBeDefined();
  });

  it('renders all section components on default "All" tab', () => {
    renderPage();
    expect(screen.getByTestId('agent-settings-section')).toBeDefined();
    expect(screen.getByTestId('environment-settings-section')).toBeDefined();
    expect(screen.getByTestId('workflow-settings-section')).toBeDefined();
    expect(screen.getByTestId('notification-settings-section')).toBeDefined();
    expect(screen.getByTestId('feature-flags-settings-section')).toBeDefined();
    expect(screen.getByTestId('database-settings-section')).toBeDefined();
  });

  it('passes shipitAiHome and dbFileSize to database section', () => {
    renderPage({ shipitAiHome: '/opt/shipit-ai', dbFileSize: '10.5 MB' });
    expect(screen.getByTestId('shipit-ai-home-path').textContent).toBe('/opt/shipit-ai');
    expect(screen.getByTestId('db-file-size').textContent).toBe('10.5 MB');
  });

  it('handles missing featureFlags gracefully', () => {
    const settings = createDefaultSettings();
    renderPage({ settings: { ...settings, featureFlags: undefined } });
    expect(screen.getByTestId('feature-flags-settings-section')).toBeDefined();
  });

  it('renders terminal select in environment section', () => {
    renderPage({
      availableTerminals: [
        { id: 'system', name: 'System Terminal', available: true },
        { id: 'warp', name: 'Warp', available: true },
      ],
    });
    expect(screen.getByTestId('terminal-select')).toBeDefined();
  });

  it('renders shell select in environment section', () => {
    renderPage();
    expect(screen.getByTestId('shell-select')).toBeDefined();
  });

  it('renders PR blocked notification toggle', () => {
    renderPage();
    expect(screen.getByTestId('switch-event-prBlocked')).toBeDefined();
  });

  it('renders Merge review ready notification toggle', () => {
    renderPage();
    expect(screen.getByTestId('switch-event-mergeReviewReady')).toBeDefined();
  });

  // ── Tab switching tests ──

  it('shows only the selected section when a specific tab is clicked', async () => {
    const user = userEvent.setup();
    renderPage();

    // Click the "Agent" tab
    const agentTab = screen.getByRole('button', { name: /agent/i });
    await user.click(agentTab);

    // Agent section should be visible
    expect(screen.getByTestId('agent-settings-section')).toBeDefined();

    // Other sections should NOT be in the DOM
    expect(screen.queryByTestId('workflow-settings-section')).toBeNull();
    expect(screen.queryByTestId('database-settings-section')).toBeNull();
    expect(screen.queryByTestId('notification-settings-section')).toBeNull();
  });

  it('returns to showing all sections when "All" tab is clicked', async () => {
    const user = userEvent.setup();
    renderPage();

    // Switch to Agent tab
    await user.click(screen.getByRole('button', { name: /agent/i }));
    expect(screen.queryByTestId('database-settings-section')).toBeNull();

    // Switch back to All tab
    await user.click(screen.getByRole('button', { name: /all/i }));
    expect(screen.getByTestId('agent-settings-section')).toBeDefined();
    expect(screen.getByTestId('database-settings-section')).toBeDefined();
    expect(screen.getByTestId('workflow-settings-section')).toBeDefined();
  });

  it('preserves section testIds across tab switches', async () => {
    const user = userEvent.setup();
    renderPage();

    // Verify on All tab
    expect(screen.getByTestId('environment-settings-section')).toBeDefined();

    // Switch to Environment tab and back
    await user.click(screen.getByRole('button', { name: /environment/i }));
    expect(screen.getByTestId('environment-settings-section')).toBeDefined();

    await user.click(screen.getByRole('button', { name: /all/i }));
    expect(screen.getByTestId('environment-settings-section')).toBeDefined();
  });
});
