import type { Meta, StoryObj } from '@storybook/react-vite';
import { McpServerCard } from './mcp-server-card';

const meta = {
  title: 'Features/McpServers/McpServerCard',
  component: McpServerCard,
  args: {
    onSelect: () => undefined,
  },
} satisfies Meta<typeof McpServerCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const HttpTransport: Story = {
  args: {
    server: {
      server_id: 'a1b2c3d4',
      name: 'deepwiki-mcp',
      server_name: 'deepwiki-mcp',
      url: 'https://mcp.deepwiki.com/mcp',
      transport: 'http',
      auth_type: 'none',
      mcp_info: {
        server_name: 'deepwiki-mcp',
        description: 'Search and read documentation from any public repository',
      },
    },
  },
};

export const SseTransport: Story = {
  args: {
    server: {
      server_id: 'b2c3d4e5',
      name: 'github-mcp',
      server_name: 'github_mcp',
      url: 'https://api.githubcopilot.com/mcp',
      transport: 'sse',
      auth_type: 'bearer_token',
      mcp_info: {
        server_name: 'github_mcp',
        description: 'Interact with GitHub repositories, issues, and pull requests',
      },
    },
  },
};

export const StdioTransport: Story = {
  args: {
    server: {
      server_id: 'c3d4e5f6',
      name: 'local-db-tools',
      server_name: 'local_db_tools',
      transport: 'stdio',
      auth_type: 'none',
      mcp_info: {
        server_name: 'local_db_tools',
        description: 'Query and manage local development databases',
      },
    },
  },
};
