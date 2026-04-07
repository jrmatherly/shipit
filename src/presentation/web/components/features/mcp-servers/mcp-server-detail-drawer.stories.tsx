import type { Meta, StoryObj } from '@storybook/react-vite';
import { McpServerDetailDrawer } from './mcp-server-detail-drawer';

const meta = {
  title: 'Features/McpServers/McpServerDetailDrawer',
  component: McpServerDetailDrawer,
  args: {
    open: true,
    onClose: () => undefined,
    serverNames: ['deepwiki-mcp', 'github_mcp'],
  },
} satisfies Meta<typeof McpServerDetailDrawer>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithTools: Story = {
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

export const NoTools: Story = {
  args: {
    server: {
      server_id: 'c3d4e5f6',
      name: 'empty-server',
      server_name: 'empty_server',
      transport: 'stdio',
      auth_type: 'none',
      mcp_info: {
        server_name: 'empty_server',
        description: 'A server with no tools configured',
      },
    },
  },
};
