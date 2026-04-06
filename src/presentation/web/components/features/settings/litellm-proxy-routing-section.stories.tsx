import type { Meta, StoryObj } from '@storybook/react-vite';
import { LiteLLMProxyRoutingSection } from './litellm-proxy-routing-section';
import { createDefaultSettings } from '@shipit-ai/core/domain/factories/settings-defaults.factory';
import { LiteLLMProxyRoutingMode } from '@shipit-ai/core/domain/generated/output';

const baseSettings = {
  ...createDefaultSettings(),
  litellmProxy: {
    baseUrl: 'http://localhost:4000',
    apiKey: 'sk-litellm-proxy-key-1234',
    marketplaceEnabled: true,
  },
};

const meta = {
  title: 'Features/Settings/LiteLLMProxyRoutingSection',
  component: LiteLLMProxyRoutingSection,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
  },
} satisfies Meta<typeof LiteLLMProxyRoutingSection>;

export default meta;
type Story = StoryObj<typeof meta>;

export const DirectMode: Story = {
  args: {
    settings: {
      ...baseSettings,
      litellmProxy: {
        ...baseSettings.litellmProxy,
        claudeCode: {
          routingMode: LiteLLMProxyRoutingMode.direct,
        },
      },
    },
  },
};

export const ProxyMode: Story = {
  args: {
    settings: {
      ...baseSettings,
      litellmProxy: {
        ...baseSettings.litellmProxy,
        claudeCode: {
          routingMode: LiteLLMProxyRoutingMode.proxy,
          customHeaders: 'x-litellm-customer-id: user-123\nx-litellm-tags: project:acme',
          sonnetModel: 'claude-sonnet-4-6',
          haikuModel: 'claude-haiku-4-5',
          opusModel: 'claude-opus-4-6',
        },
      },
    },
  },
};

export const PassthroughMode: Story = {
  args: {
    settings: {
      ...baseSettings,
      litellmProxy: {
        ...baseSettings.litellmProxy,
        claudeCode: {
          routingMode: LiteLLMProxyRoutingMode.passthrough,
          sonnetModel: 'claude-sonnet-4-6',
        },
      },
    },
  },
};
