import type { Meta, StoryObj } from '@storybook/react-vite';
import { EnvironmentSettingsSection } from './environment-settings-section';
import { createDefaultSettings } from '@shipit-ai/core/domain/factories/settings-defaults.factory';
import { EditorType, TerminalType } from '@shipit-ai/core/domain/generated/output';

const baseSettings = createDefaultSettings();

const meta = {
  title: 'Features/Settings/EnvironmentSettingsSection',
  component: EnvironmentSettingsSection,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
  },
} satisfies Meta<typeof EnvironmentSettingsSection>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    settings: baseSettings,
    availableTerminals: [
      { id: 'system', name: 'System Terminal', available: true },
      { id: 'warp', name: 'Warp', available: true },
      { id: 'iterm2', name: 'iTerm2', available: true },
    ],
  },
};

export const CursorWithZsh: Story = {
  args: {
    settings: {
      ...baseSettings,
      environment: {
        ...baseSettings.environment,
        defaultEditor: EditorType.Cursor,
        shellPreference: 'zsh',
        terminalPreference: TerminalType.System,
      },
    },
    availableTerminals: [{ id: 'system', name: 'System Terminal', available: true }],
  },
};

export const WarpSelected: Story = {
  args: {
    settings: {
      ...baseSettings,
      environment: {
        ...baseSettings.environment,
        defaultEditor: EditorType.VsCode,
        shellPreference: 'zsh',
        terminalPreference: TerminalType.Warp,
      },
    },
    availableTerminals: [
      { id: 'system', name: 'System Terminal', available: true },
      { id: 'warp', name: 'Warp', available: true },
      { id: 'iterm2', name: 'iTerm2', available: true },
      { id: 'alacritty', name: 'Alacritty', available: true },
      { id: 'kitty', name: 'Kitty', available: true },
    ],
  },
};

export const OnlySystemTerminal: Story = {
  args: {
    settings: baseSettings,
  },
};
