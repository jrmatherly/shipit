import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TooltipProvider } from '@/components/ui/tooltip';
import { NotificationSettingsSection } from '@/components/features/settings/notification-settings-section';
import { createDefaultSettings } from '@shipit-ai/core/domain/factories/settings-defaults.factory';

const mockUpdateSettingsAction = vi.fn();

vi.mock('@/app/actions/update-settings', () => ({
  updateSettingsAction: (...args: unknown[]) => mockUpdateSettingsAction(...args),
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const allEvents = {
  agentStarted: true,
  phaseCompleted: true,
  waitingApproval: true,
  agentCompleted: true,
  agentFailed: true,
  mergeReviewReady: true,
  prMerged: true,
  prClosed: true,
  prChecksPassed: true,
  prChecksFailed: true,
  prBlocked: true,
};

const baseSettings = createDefaultSettings();

function buildSettings(overrides?: { inAppEnabled?: boolean; events?: typeof allEvents }) {
  return {
    ...baseSettings,
    notifications: {
      ...baseSettings.notifications,
      inApp: { enabled: overrides?.inAppEnabled ?? true },
      events: overrides?.events ?? allEvents,
    },
  };
}

describe('NotificationSettingsSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdateSettingsAction.mockResolvedValue({ success: true });
  });

  it('renders in-app channel toggle', () => {
    render(
      <TooltipProvider>
        <NotificationSettingsSection settings={buildSettings()} />
      </TooltipProvider>
    );
    expect(screen.getByTestId('switch-in-app')).toBeDefined();
    expect(screen.getByText('In-app')).toBeDefined();
  });

  it('does not render unimplemented browser and desktop toggles', () => {
    render(
      <TooltipProvider>
        <NotificationSettingsSection settings={buildSettings()} />
      </TooltipProvider>
    );
    expect(screen.queryByTestId('switch-browser')).toBeNull();
    expect(screen.queryByTestId('switch-desktop')).toBeNull();
  });

  it('renders 11 event type toggles', () => {
    render(
      <TooltipProvider>
        <NotificationSettingsSection settings={buildSettings()} />
      </TooltipProvider>
    );
    expect(screen.getByTestId('switch-event-agentStarted')).toBeDefined();
    expect(screen.getByTestId('switch-event-phaseCompleted')).toBeDefined();
    expect(screen.getByTestId('switch-event-waitingApproval')).toBeDefined();
    expect(screen.getByTestId('switch-event-agentCompleted')).toBeDefined();
    expect(screen.getByTestId('switch-event-agentFailed')).toBeDefined();
    expect(screen.getByTestId('switch-event-mergeReviewReady')).toBeDefined();
    expect(screen.getByTestId('switch-event-prMerged')).toBeDefined();
    expect(screen.getByTestId('switch-event-prClosed')).toBeDefined();
    expect(screen.getByTestId('switch-event-prChecksPassed')).toBeDefined();
    expect(screen.getByTestId('switch-event-prChecksFailed')).toBeDefined();
    expect(screen.getByTestId('switch-event-prBlocked')).toBeDefined();
  });

  it('renders event type labels', () => {
    render(
      <TooltipProvider>
        <NotificationSettingsSection settings={buildSettings()} />
      </TooltipProvider>
    );
    expect(screen.getByText('Agent started')).toBeDefined();
    expect(screen.getByText('Phase completed')).toBeDefined();
    expect(screen.getByText('Waiting approval')).toBeDefined();
    expect(screen.getByText('Agent completed')).toBeDefined();
    expect(screen.getByText('Agent failed')).toBeDefined();
    expect(screen.getByText('Merge review ready')).toBeDefined();
    expect(screen.getByText('PR merged')).toBeDefined();
    expect(screen.getByText('PR closed')).toBeDefined();
    expect(screen.getByText('PR checks passed')).toBeDefined();
    expect(screen.getByText('PR checks failed')).toBeDefined();
    expect(screen.getByText('PR blocked')).toBeDefined();
  });

  it('groups events under agent events and pull request events headings', () => {
    render(
      <TooltipProvider>
        <NotificationSettingsSection settings={buildSettings()} />
      </TooltipProvider>
    );
    expect(screen.getByText('Agent Events')).toBeDefined();
    expect(screen.getByText('Pull Request Events')).toBeDefined();
  });

  it('does not render a save button (auto-saves on change)', () => {
    render(
      <TooltipProvider>
        <NotificationSettingsSection settings={buildSettings()} />
      </TooltipProvider>
    );
    expect(screen.queryByRole('button', { name: /save/i })).toBeNull();
  });
});
