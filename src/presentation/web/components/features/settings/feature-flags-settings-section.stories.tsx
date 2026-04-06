import type { Meta, StoryObj } from '@storybook/react-vite';
import { FeatureFlagsSettingsSection } from './feature-flags-settings-section';
import { createDefaultSettings } from '@shipit-ai/core/domain/factories/settings-defaults.factory';

const baseSettings = createDefaultSettings();

const meta = {
  title: 'Features/Settings/FeatureFlagsSettingsSection',
  component: FeatureFlagsSettingsSection,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
  },
} satisfies Meta<typeof FeatureFlagsSettingsSection>;

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
      featureFlags: {
        skills: true,
        envDeploy: true,
        debug: true,
        githubImport: true,
        adoptBranch: true,
        gitRebaseSync: true,
        reactFileManager: true,
        plugins: true,
      },
    },
  },
};

export const AllDisabled: Story = {
  args: {
    settings: {
      ...baseSettings,
      featureFlags: {
        skills: false,
        envDeploy: false,
        debug: false,
        githubImport: false,
        adoptBranch: false,
        gitRebaseSync: false,
        reactFileManager: false,
        plugins: false,
      },
    },
  },
};
