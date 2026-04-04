import type { Meta, StoryObj } from '@storybook/react-vite';
import { StageTimeoutsSettingsSection } from './stage-timeouts-settings-section';
import { createDefaultSettings } from '@shipit-ai/core/domain/factories/settings-defaults.factory';

const baseSettings = createDefaultSettings();

const meta = {
  title: 'Features/Settings/StageTimeoutsSettingsSection',
  component: StageTimeoutsSettingsSection,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
  },
} satisfies Meta<typeof StageTimeoutsSettingsSection>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    settings: baseSettings,
  },
};

export const WithCustomTimeouts: Story = {
  args: {
    settings: {
      ...baseSettings,
      workflow: {
        ...baseSettings.workflow,
        stageTimeouts: {
          analyzeMs: 600000,
          requirementsMs: 600000,
          researchMs: 600000,
          planMs: 1200000,
          implementMs: 3600000,
          mergeMs: 600000,
        },
        analyzeRepoTimeouts: {
          analyzeMs: 300000,
        },
      },
    },
  },
};

export const MaxTimeouts: Story = {
  args: {
    settings: {
      ...baseSettings,
      workflow: {
        ...baseSettings.workflow,
        stageTimeouts: {
          analyzeMs: 86400000,
          requirementsMs: 86400000,
          researchMs: 86400000,
          planMs: 86400000,
          implementMs: 86400000,
          mergeMs: 86400000,
        },
        analyzeRepoTimeouts: {
          analyzeMs: 86400000,
        },
      },
    },
  },
};
