import type { Meta, StoryObj } from '@storybook/react-vite';
import { AgentSettingsSection } from './agent-settings-section';
import { createDefaultSettings } from '@shipit-ai/core/domain/factories/settings-defaults.factory';
import { AgentType } from '@shipit-ai/core/domain/generated/output';

const baseSettings = createDefaultSettings();

const meta = {
  title: 'Features/Settings/AgentSettingsSection',
  component: AgentSettingsSection,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
  },
} satisfies Meta<typeof AgentSettingsSection>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    settings: baseSettings,
  },
};

export const GeminiAgent: Story = {
  args: {
    settings: {
      ...baseSettings,
      agent: {
        ...baseSettings.agent,
        type: AgentType.GeminiCli,
      },
    },
  },
};

export const CursorAgent: Story = {
  args: {
    settings: {
      ...baseSettings,
      agent: {
        ...baseSettings.agent,
        type: AgentType.Cursor,
      },
    },
  },
};
