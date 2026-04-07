import type { Meta, StoryObj } from '@storybook/react-vite';
import { McpToolList } from './mcp-tool-list';

const meta = {
  title: 'Features/McpServers/McpToolList',
  component: McpToolList,
} satisfies Meta<typeof McpToolList>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithTools: Story = {
  args: {
    serverNames: ['deepwiki-mcp', 'github_mcp'],
    tools: [
      { name: 'deepwiki-mcp-read_wiki', description: 'Read wiki contents' },
      { name: 'deepwiki-mcp-search', description: 'Search documentation' },
      { name: 'github_mcp-list_issues', description: 'List GitHub issues' },
      { name: 'github_mcp-create_issue', description: 'Create a new issue' },
    ],
  },
};

export const NoTools: Story = {
  args: {
    serverNames: ['deepwiki-mcp'],
    tools: [],
  },
};

export const UnmatchedTools: Story = {
  args: {
    serverNames: ['deepwiki-mcp'],
    tools: [
      { name: 'deepwiki-mcp-read_wiki', description: 'Read wiki contents' },
      { name: 'unknown-server-tool', description: 'Tool from unknown server' },
    ],
  },
};
