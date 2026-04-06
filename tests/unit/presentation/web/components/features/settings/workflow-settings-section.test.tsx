import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TooltipProvider } from '@/components/ui/tooltip';
import { WorkflowSettingsSection } from '@/components/features/settings/workflow-settings-section';
import { createDefaultSettings } from '@shipit-ai/core/domain/factories/settings-defaults.factory';

const mockUpdateSettingsAction = vi.fn();

vi.mock('@/app/actions/update-settings', () => ({
  updateSettingsAction: (...args: unknown[]) => mockUpdateSettingsAction(...args),
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const baseSettings = createDefaultSettings();

function renderSection(props?: Partial<Parameters<typeof WorkflowSettingsSection>[0]>) {
  return render(
    <TooltipProvider>
      <WorkflowSettingsSection settings={baseSettings} {...props} />
    </TooltipProvider>
  );
}

describe('WorkflowSettingsSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdateSettingsAction.mockResolvedValue({ success: true });
  });

  it('renders the workflow section with correct testId', () => {
    renderSection();
    expect(screen.getByTestId('workflow-settings-section')).toBeDefined();
  });

  it('renders section title from i18n', () => {
    renderSection();
    expect(screen.getByText('Workflow')).toBeDefined();
  });

  it('renders section description from i18n', () => {
    renderSection();
    expect(screen.getByText('Automation behavior after implementation')).toBeDefined();
  });

  it('renders fast mode toggle', () => {
    renderSection();
    expect(screen.getByTestId('switch-default-fast-mode')).toBeDefined();
  });

  it('renders approval gate toggles', () => {
    renderSection();
    expect(screen.getByTestId('switch-allow-prd')).toBeDefined();
    expect(screen.getByTestId('switch-allow-plan')).toBeDefined();
    expect(screen.getByTestId('switch-allow-merge')).toBeDefined();
  });

  it('renders evidence toggles', () => {
    renderSection();
    expect(screen.getByTestId('switch-enable-evidence')).toBeDefined();
    expect(screen.getByTestId('switch-commit-evidence')).toBeDefined();
  });

  it('renders git toggles', () => {
    renderSection();
    expect(screen.getByTestId('switch-push-on-complete')).toBeDefined();
    expect(screen.getByTestId('switch-open-pr')).toBeDefined();
    expect(screen.getByTestId('switch-ci-watch-enabled')).toBeDefined();
  });

  it('renders auto-archive toggle and delay stepper', () => {
    renderSection();
    expect(screen.getByTestId('switch-auto-archive-enabled')).toBeDefined();
    expect(screen.getByTestId('input-auto-archive-delay')).toBeDefined();
  });

  it('does not render a save button (auto-saves on change)', () => {
    renderSection();
    expect(screen.queryByRole('button', { name: /save/i })).toBeNull();
  });

  it('commit evidence is disabled when evidence collection is off', () => {
    renderSection();
    const commitSwitch = screen.getByTestId('switch-commit-evidence');
    expect(commitSwitch.getAttribute('data-disabled')).toBe('');
  });

  it('toggling fast mode calls updateSettingsAction', async () => {
    renderSection();
    const toggle = screen.getByTestId('switch-default-fast-mode');

    fireEvent.click(toggle);

    await vi.waitFor(() => {
      expect(mockUpdateSettingsAction).toHaveBeenCalledWith(
        expect.objectContaining({
          workflow: expect.objectContaining({
            defaultFastMode: false,
          }),
        })
      );
    });
  });

  it('renders subsection labels', () => {
    renderSection();
    expect(screen.getByText('Approve')).toBeDefined();
    expect(screen.getByText('Evidence')).toBeDefined();
    expect(screen.getByText('Git')).toBeDefined();
    expect(screen.getByText('Archive')).toBeDefined();
  });
});
