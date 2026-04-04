import type { Meta, StoryObj } from '@storybook/react-vite';
import { FabLayoutSettingsSection } from './fab-layout-settings-section';
import { createDefaultSettings } from '@shipit-ai/core/domain/factories/settings-defaults.factory';

const baseSettings = createDefaultSettings();

const meta = {
  title: 'Features/Settings/FabLayoutSettingsSection',
  component: FabLayoutSettingsSection,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
  },
} satisfies Meta<typeof FabLayoutSettingsSection>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    settings: baseSettings,
  },
};

export const SwapPositionEnabled: Story = {
  args: {
    settings: {
      ...baseSettings,
      fabLayout: {
        swapPosition: true,
      },
    },
  },
};

export const SwapPositionDisabled: Story = {
  args: {
    settings: {
      ...baseSettings,
      fabLayout: {
        swapPosition: false,
      },
    },
  },
};
