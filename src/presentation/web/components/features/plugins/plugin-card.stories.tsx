import type { Meta, StoryObj } from '@storybook/react-vite';
import { PluginCard } from './plugin-card';

const meta = {
  title: 'Features/Plugins/PluginCard',
  component: PluginCard,
  args: {
    onSelect: () => undefined,
    onToggle: () => undefined,
  },
} satisfies Meta<typeof PluginCard>;

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
      keywords: ['automation', 'workflows'],
    },
  },
};

export const Installed: Story = {
  args: {
    plugin: {
      name: 'code-review-graph',
      description: 'Build knowledge graphs for intelligent code review with structural analysis',
      version: '1.5.0',
      source: { source: 'github', repo: 'anthropics/code-review-graph' },
      category: 'code-quality',
    },
    installed: {
      id: 'code-review-graph@claude-plugins-official',
      scope: 'user',
      version: '1.5.0',
      enabled: true,
    },
  },
};

export const NotInstalled: Story = {
  args: {
    plugin: {
      name: 'hookify',
      description: 'Create hooks to prevent unwanted AI behaviors',
      version: '1.0.0',
      source: { source: 'github', repo: 'anthropics/hookify' },
      category: 'productivity',
    },
  },
};

export const LongDescription: Story = {
  args: {
    plugin: {
      name: 'very-long-description-plugin',
      description:
        'This plugin has a very long description that should be truncated by the line-clamp CSS utility class. '.repeat(
          5
        ),
      version: '0.1.0',
      source: { source: 'url', url: 'https://github.com/org/plugin.git' },
    },
  },
};
