import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { AgentPermissionPicker } from './agent-permission-picker';

function StatefulPicker({ agentType, initialMode }: { agentType: string; initialMode?: string }) {
  const [mode, setMode] = useState(initialMode);
  return <AgentPermissionPicker agentType={agentType} currentMode={mode} onChange={setMode} />;
}

const meta: Meta<typeof AgentPermissionPicker> = {
  title: 'Features/Settings/AgentPermissionPicker',
  component: AgentPermissionPicker,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
  },
  args: {
    onChange: fn(),
  },
  decorators: [
    (Story) => (
      <div className="w-[400px]">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof AgentPermissionPicker>;

export const ClaudeCode: Story = {
  args: {
    agentType: 'claude-code',
    currentMode: 'bypassPermissions',
  },
};

export const Cursor: Story = {
  args: {
    agentType: 'cursor',
    currentMode: 'yolo',
  },
};

export const GeminiCli: Story = {
  args: {
    agentType: 'gemini-cli',
    currentMode: 'yolo',
  },
};

export const CodexCli: Story = {
  args: {
    agentType: 'codex-cli',
    currentMode: 'danger-full-access',
  },
};

export const CopilotCli: Story = {
  args: {
    agentType: 'copilot-cli',
    currentMode: 'yolo',
  },
};

export const RovoDev: Story = {
  args: {
    agentType: 'rovo-dev',
    currentMode: 'yolo',
  },
};

export const NoSelection: Story = {
  args: {
    agentType: 'claude-code',
    currentMode: undefined,
  },
};

export const Disabled: Story = {
  args: {
    agentType: 'claude-code',
    currentMode: 'bypassPermissions',
    disabled: true,
  },
};

export const Interactive: Story = {
  render: () => <StatefulPicker agentType="claude-code" initialMode="bypassPermissions" />,
};
