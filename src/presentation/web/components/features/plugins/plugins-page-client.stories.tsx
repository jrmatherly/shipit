import type { Meta, StoryObj } from '@storybook/react-vite';
import { PluginsPageClient } from './plugins-page-client';

const meta = {
  title: 'Features/Plugins/PluginsPageClient',
  component: PluginsPageClient,
} satisfies Meta<typeof PluginsPageClient>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    proxyConfigured: true,
    isClaudeCode: true,
  },
};

export const NoProxy: Story = {
  args: {
    proxyConfigured: false,
    isClaudeCode: true,
  },
};

export const WrongAgent: Story = {
  args: {
    proxyConfigured: true,
    isClaudeCode: false,
  },
};
