import type { Meta, StoryObj } from '@storybook/react';
import { CiSettingsSection } from './ci-settings-section';
import { createDefaultSettings } from '@shipit-ai/core/domain/factories/settings-defaults.factory';

const baseSettings = createDefaultSettings();

const meta = {
  title: 'Features/Settings/CiSettingsSection',
  component: CiSettingsSection,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
  },
} satisfies Meta<typeof CiSettingsSection>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    settings: baseSettings,
  },
};

export const WithCiLimits: Story = {
  args: {
    settings: {
      ...baseSettings,
      workflow: {
        ...baseSettings.workflow,
        ciMaxFixAttempts: 3,
        ciWatchTimeoutMs: 300000,
        ciLogMaxChars: 50000,
        ciWatchPollIntervalSeconds: 30,
        hideCiStatus: false,
      },
    },
  },
};

export const HideCiStatusEnabled: Story = {
  args: {
    settings: {
      ...baseSettings,
      workflow: {
        ...baseSettings.workflow,
        hideCiStatus: true,
      },
    },
  },
};
