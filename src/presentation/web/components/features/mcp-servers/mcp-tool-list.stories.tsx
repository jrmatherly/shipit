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
    serverName: 'deepwiki-mcp',
    tools: [
      { name: 'deepwiki-mcp-read_wiki', description: 'Read wiki contents' },
      { name: 'deepwiki-mcp-search', description: 'Search documentation' },
      { name: 'deepwiki-mcp-list_repos', description: 'List indexed repositories' },
    ],
  },
};

export const NoTools: Story = {
  args: {
    serverName: 'empty_server',
    tools: [],
  },
};

export const UnprefixedTools: Story = {
  args: {
    serverName: 'my_server',
    tools: [
      { name: 'query', description: 'Execute a query' },
      { name: 'list_tables', description: 'List all tables' },
    ],
  },
};
