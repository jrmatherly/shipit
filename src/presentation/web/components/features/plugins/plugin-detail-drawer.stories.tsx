import type { Meta, StoryObj } from '@storybook/react-vite';
import { PluginDetailDrawer } from './plugin-detail-drawer';

const meta = {
  title: 'Features/Plugins/PluginDetailDrawer',
  component: PluginDetailDrawer,
  args: {
    open: true,
    onClose: () => undefined,
    onInstall: () => undefined,
    onUninstall: () => undefined,
  },
} satisfies Meta<typeof PluginDetailDrawer>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    plugin: {
      name: 'superpowers',
      description: 'Advanced Claude Code skills and workflow automation for power users',
      version: '2.1.0',
      source: { source: 'github', repo: 'anthropics/superpowers' },
      category: 'productivity',
      keywords: ['automation', 'workflows', 'skills'],
    },
  },
};

export const Installed: Story = {
  args: {
    plugin: {
      name: 'code-review-graph',
      description: 'Build knowledge graphs for intelligent code review',
      version: '1.5.0',
      source: { source: 'github', repo: 'anthropics/code-review-graph' },
      category: 'code-quality',
      keywords: ['review', 'graph', 'analysis'],
    },
    installed: {
      id: 'code-review-graph@claude-plugins-official',
      scope: 'user',
      version: '1.5.0',
      enabled: true,
    },
  },
};

export const NoSource: Story = {
  args: {
    plugin: {
      name: 'mystery-plugin',
      description: 'A plugin with no source URL information',
      source: { source: 'github' },
    },
  },
};
