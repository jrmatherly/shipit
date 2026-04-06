import type { Meta, StoryObj } from '@storybook/react-vite';
import { NotificationSettingsSection } from './notification-settings-section';
import { createDefaultSettings } from '@shipit-ai/core/domain/factories/settings-defaults.factory';

const baseSettings = createDefaultSettings();

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

const noEvents = {
  agentStarted: false,
  phaseCompleted: false,
  waitingApproval: false,
  agentCompleted: false,
  agentFailed: false,
  mergeReviewReady: false,
  prMerged: false,
  prClosed: false,
  prChecksPassed: false,
  prChecksFailed: false,
  prBlocked: false,
};

const meta = {
  title: 'Features/Settings/NotificationSettingsSection',
  component: NotificationSettingsSection,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
  },
} satisfies Meta<typeof NotificationSettingsSection>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    settings: {
      ...baseSettings,
      notifications: {
        ...baseSettings.notifications,
        inApp: { enabled: true },
        events: allEvents,
      },
    },
  },
};

export const AllEnabled: Story = {
  args: {
    settings: {
      ...baseSettings,
      notifications: {
        ...baseSettings.notifications,
        inApp: { enabled: true },
        events: allEvents,
      },
    },
  },
};

export const AllDisabled: Story = {
  args: {
    settings: {
      ...baseSettings,
      notifications: {
        ...baseSettings.notifications,
        inApp: { enabled: false },
        events: noEvents,
      },
    },
  },
};
