import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DatabaseSettingsSection } from '@/components/features/settings/database-settings-section';

describe('DatabaseSettingsSection', () => {
  it('renders SHIPIT_AI_HOME path text', () => {
    render(<DatabaseSettingsSection shipitAiHome="/home/user/.shipit-ai" dbFileSize="2.4 MB" />);
    expect(screen.getByTestId('shipit-ai-home-path').textContent).toBe('/home/user/.shipit-ai');
  });

  it('renders database file size text', () => {
    render(<DatabaseSettingsSection shipitAiHome="/home/user/.shipit-ai" dbFileSize="2.4 MB" />);
    expect(screen.getByTestId('db-file-size').textContent).toBe('2.4 MB');
  });

  it('does not render a Save button', () => {
    render(<DatabaseSettingsSection shipitAiHome="/home/user/.shipit-ai" dbFileSize="2.4 MB" />);
    expect(screen.queryByRole('button', { name: /save/i })).toBeNull();
  });

  it('renders title and read-only description', () => {
    render(<DatabaseSettingsSection shipitAiHome="/home/user/.shipit-ai" dbFileSize="2.4 MB" />);
    expect(screen.getByText('Database Location')).toBeDefined();
    expect(
      screen.getByText('Read-only information about your Shipit AI data directory and database')
    ).toBeDefined();
  });
});
