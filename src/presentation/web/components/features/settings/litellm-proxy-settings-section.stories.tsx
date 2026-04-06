import type { Meta, StoryObj } from '@storybook/react-vite';
import { LiteLLMProxySettingsSection } from './litellm-proxy-settings-section';
import { createDefaultSettings } from '@shipit-ai/core/domain/factories/settings-defaults.factory';

const baseSettings = createDefaultSettings();

const meta = {
  title: 'Features/Settings/LiteLLMProxySettingsSection',
  component: LiteLLMProxySettingsSection,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
  },
} satisfies Meta<typeof LiteLLMProxySettingsSection>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    settings: baseSettings,
  },
};

export const Configured: Story = {
  args: {
    settings: {
      ...baseSettings,
      litellmProxy: {
        baseUrl: 'http://localhost:4000',
        apiKey: 'sk-litellm-proxy-key-1234',
        marketplaceEnabled: true,
      },
    },
  },
};
