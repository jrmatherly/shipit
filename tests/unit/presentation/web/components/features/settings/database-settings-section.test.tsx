import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TooltipProvider } from '@/components/ui/tooltip';
import { DatabaseSettingsSection } from '@/components/features/settings/database-settings-section';

function renderSection(props?: Partial<Parameters<typeof DatabaseSettingsSection>[0]>) {
  return render(
    <TooltipProvider>
      <DatabaseSettingsSection
        shipitAiHome="/home/user/.shipit-ai"
        dbFileSize="2.4 MB"
        {...props}
      />
    </TooltipProvider>
  );
}

describe('DatabaseSettingsSection', () => {
  it('renders SHIPIT_AI_HOME path text', () => {
    renderSection();
    expect(screen.getByTestId('shipit-ai-home-path').textContent).toBe('/home/user/.shipit-ai');
  });

  it('renders database file size text', () => {
    renderSection();
    expect(screen.getByTestId('db-file-size').textContent).toBe('2.4 MB');
  });

  it('does not render a Save button (display-only section)', () => {
    renderSection();
    expect(screen.queryByRole('button', { name: /save/i })).toBeNull();
  });

  it('renders the section with correct testId', () => {
    renderSection();
    expect(screen.getByTestId('database-settings-section')).toBeDefined();
  });
});
