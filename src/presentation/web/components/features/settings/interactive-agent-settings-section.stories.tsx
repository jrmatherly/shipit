import type { Meta, StoryObj } from '@storybook/react';
import { InteractiveAgentSettingsSection } from './interactive-agent-settings-section';
import { createDefaultSettings } from '@shipit-ai/core/domain/factories/settings-defaults.factory';

const baseSettings = createDefaultSettings();

const meta = {
  title: 'Features/Settings/InteractiveAgentSettingsSection',
  component: InteractiveAgentSettingsSection,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
  },
} satisfies Meta<typeof InteractiveAgentSettingsSection>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    settings: baseSettings,
  },
};

export const Enabled: Story = {
  args: {
    settings: {
      ...baseSettings,
      interactiveAgent: {
        enabled: true,
        autoTimeoutMinutes: 15,
        maxConcurrentSessions: 3,
      },
    },
  },
};

export const Disabled: Story = {
  args: {
    settings: {
      ...baseSettings,
      interactiveAgent: {
        enabled: false,
        autoTimeoutMinutes: 15,
        maxConcurrentSessions: 3,
      },
    },
  },
};

export const HighConcurrency: Story = {
  args: {
    settings: {
      ...baseSettings,
      interactiveAgent: {
        enabled: true,
        autoTimeoutMinutes: 60,
        maxConcurrentSessions: 10,
      },
    },
  },
};
