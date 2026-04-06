import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TooltipProvider } from '@/components/ui/tooltip';
import { EnvironmentSettingsSection } from '@/components/features/settings/environment-settings-section';
import { createDefaultSettings } from '@shipit-ai/core/domain/factories/settings-defaults.factory';

const mockUpdateSettingsAction = vi.fn();

vi.mock('@/app/actions/update-settings', () => ({
  updateSettingsAction: (...args: unknown[]) => mockUpdateSettingsAction(...args),
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const baseSettings = createDefaultSettings();

function renderSection(props?: Partial<Parameters<typeof EnvironmentSettingsSection>[0]>) {
  return render(
    <TooltipProvider>
      <EnvironmentSettingsSection settings={baseSettings} {...props} />
    </TooltipProvider>
  );
}

describe('EnvironmentSettingsSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdateSettingsAction.mockResolvedValue({ success: true });
  });

  it('renders editor select', () => {
    renderSection();
    expect(screen.getByTestId('editor-select')).toBeDefined();
  });

  it('renders shell select', () => {
    renderSection();
    expect(screen.getByTestId('shell-select')).toBeDefined();
  });

  it('renders terminal select', () => {
    renderSection({
      availableTerminals: [
        { id: 'system', name: 'System Terminal', available: true },
        { id: 'warp', name: 'Warp', available: true },
      ],
    });
    expect(screen.getByTestId('terminal-select')).toBeDefined();
  });

  it('does not render a save button (auto-saves on change)', () => {
    renderSection();
    expect(screen.queryByRole('button', { name: /save/i })).toBeNull();
  });

  it('renders section title from i18n', () => {
    renderSection();
    expect(screen.getByText('Environment')).toBeDefined();
  });

  it('renders section description from i18n', () => {
    renderSection();
    expect(screen.getByText('Editor, shell, and terminal preferences')).toBeDefined();
  });

  it('renders the settings section wrapper with correct testId', () => {
    renderSection();
    expect(screen.getByTestId('environment-settings-section')).toBeDefined();
  });

  it('defaults to system terminal when no availableTerminals provided', () => {
    renderSection();
    expect(screen.getByTestId('terminal-select')).toBeDefined();
  });
});
