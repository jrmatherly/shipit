import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TooltipProvider } from '@/components/ui/tooltip';
import { AgentSettingsSection } from '@/components/features/settings/agent-settings-section';
import { createDefaultSettings } from '@shipit-ai/core/domain/factories/settings-defaults.factory';

vi.mock('@/app/actions/update-settings', () => ({
  updateSettingsAction: vi.fn().mockResolvedValue({ success: true }),
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('@/components/features/settings/AgentModelPicker', () => ({
  AgentModelPicker: (props: Record<string, unknown>) => (
    <div data-testid="agent-model-picker" data-mode={props.mode} />
  ),
}));

vi.mock('@/app/actions/get-all-agent-models', () => ({
  getAllAgentModels: vi.fn().mockResolvedValue([]),
}));

const baseSettings = createDefaultSettings();

function renderSection(props?: Partial<Parameters<typeof AgentSettingsSection>[0]>) {
  return render(
    <TooltipProvider>
      <AgentSettingsSection settings={baseSettings} {...props} />
    </TooltipProvider>
  );
}

describe('AgentSettingsSection', () => {
  it('renders the section with correct testId', () => {
    renderSection();
    expect(screen.getByTestId('agent-settings-section')).toBeDefined();
  });

  it('renders the AgentModelPicker in settings mode', () => {
    renderSection();
    const picker = screen.getByTestId('agent-model-picker');
    expect(picker).toBeDefined();
    expect(picker.getAttribute('data-mode')).toBe('settings');
  });

  it('does not render a save button (auto-saves via picker)', () => {
    renderSection();
    expect(screen.queryByRole('button', { name: /save/i })).toBeNull();
  });
});
