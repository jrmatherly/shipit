import type { Meta, StoryObj } from '@storybook/react-vite';
import { LiteLLMProxyRoutingSection } from './litellm-proxy-routing-section';
import { createDefaultSettings } from '@shipit-ai/core/domain/factories/settings-defaults.factory';
import { type AgentType, LiteLLMProxyRoutingMode } from '@shipit-ai/core/domain/generated/output';

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

// --- Claude Code (Tier 1, full features) ---

export const ClaudeCodeDirect: Story = {
  args: {
    settings: {
      ...baseSettings,
      agent: { ...baseSettings.agent, type: 'claude-code' as AgentType },
      litellmProxy: {
        ...baseSettings.litellmProxy,
        claudeCode: { routingMode: LiteLLMProxyRoutingMode.direct },
      },
    },
  },
};

export const ClaudeCodeProxy: Story = {
  args: {
    settings: {
      ...baseSettings,
      agent: { ...baseSettings.agent, type: 'claude-code' as AgentType },
      litellmProxy: {
        ...baseSettings.litellmProxy,
        claudeCode: {
          routingMode: LiteLLMProxyRoutingMode.proxy,
          customHeaders: 'x-litellm-customer-id: user-123',
          sonnetModel: 'claude-sonnet-4-6',
        },
      },
    },
  },
};

export const ClaudeCodePassthrough: Story = {
  args: {
    settings: {
      ...baseSettings,
      agent: { ...baseSettings.agent, type: 'claude-code' as AgentType },
      litellmProxy: {
        ...baseSettings.litellmProxy,
        claudeCode: { routingMode: LiteLLMProxyRoutingMode.passthrough },
      },
    },
  },
};

// --- Gemini CLI (Tier 1, direct/proxy only) ---

export const GeminiCliDirect: Story = {
  args: {
    settings: {
      ...baseSettings,
      agent: { ...baseSettings.agent, type: 'gemini-cli' as AgentType },
      litellmProxy: {
        ...baseSettings.litellmProxy,
        geminiCli: { routingMode: LiteLLMProxyRoutingMode.direct },
      },
    },
  },
};

export const GeminiCliProxy: Story = {
  args: {
    settings: {
      ...baseSettings,
      agent: { ...baseSettings.agent, type: 'gemini-cli' as AgentType },
      litellmProxy: {
        ...baseSettings.litellmProxy,
        geminiCli: { routingMode: LiteLLMProxyRoutingMode.proxy },
      },
    },
  },
};

// --- Codex CLI (Tier 1, direct/proxy only) ---

export const CodexCliDirect: Story = {
  args: {
    settings: {
      ...baseSettings,
      agent: { ...baseSettings.agent, type: 'codex-cli' as AgentType },
      litellmProxy: {
        ...baseSettings.litellmProxy,
        codexCli: { routingMode: LiteLLMProxyRoutingMode.direct },
      },
    },
  },
};

export const CodexCliProxy: Story = {
  args: {
    settings: {
      ...baseSettings,
      agent: { ...baseSettings.agent, type: 'codex-cli' as AgentType },
      litellmProxy: {
        ...baseSettings.litellmProxy,
        codexCli: { routingMode: LiteLLMProxyRoutingMode.proxy },
      },
    },
  },
};

// --- Cursor (Tier 2, documentation panel) ---

export const CursorDocs: Story = {
  args: {
    settings: {
      ...baseSettings,
      agent: { ...baseSettings.agent, type: 'cursor' as AgentType },
    },
  },
};

// --- Copilot CLI (Tier 2, documentation panel) ---

export const CopilotDocs: Story = {
  args: {
    settings: {
      ...baseSettings,
      agent: { ...baseSettings.agent, type: 'copilot-cli' as AgentType },
    },
  },
};

// --- Unsupported agent ---

export const UnsupportedAgent: Story = {
  args: {
    settings: {
      ...baseSettings,
      agent: { ...baseSettings.agent, type: 'rovo-dev' as AgentType },
    },
  },
};
