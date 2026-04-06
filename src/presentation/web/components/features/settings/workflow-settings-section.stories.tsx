import type { Meta, StoryObj } from '@storybook/react-vite';
import { WorkflowSettingsSection } from './workflow-settings-section';
import { createDefaultSettings } from '@shipit-ai/core/domain/factories/settings-defaults.factory';

const baseSettings = createDefaultSettings();

const meta = {
  title: 'Features/Settings/WorkflowSettingsSection',
  component: WorkflowSettingsSection,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
  },
} satisfies Meta<typeof WorkflowSettingsSection>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    settings: baseSettings,
  },
};

export const AllEnabled: Story = {
  args: {
    settings: {
      ...baseSettings,
      workflow: {
        ...baseSettings.workflow,
        openPrOnImplementationComplete: true,
        approvalGateDefaults: {
          allowPrd: true,
          allowPlan: true,
          allowMerge: true,
          pushOnImplementationComplete: true,
        },
        enableEvidence: true,
        commitEvidence: true,
        ciWatchEnabled: true,
        defaultFastMode: true,
        autoArchiveDelayMinutes: 15,
      },
    },
  },
};

export const EvidenceDisabled: Story = {
  args: {
    settings: {
      ...baseSettings,
      workflow: {
        ...baseSettings.workflow,
        enableEvidence: false,
        commitEvidence: false,
      },
    },
  },
};
