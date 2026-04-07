import type { Meta, StoryObj } from '@storybook/react-vite';
import { McpConnectInstructions } from './mcp-connect-instructions';

const meta = {
  title: 'Features/McpServers/McpConnectInstructions',
  component: McpConnectInstructions,
} satisfies Meta<typeof McpConnectInstructions>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    proxyBaseUrl: 'http://localhost:4000',
    serverName: 'deepwiki_mcp',
  },
};

export const HttpsProxy: Story = {
  args: {
    proxyBaseUrl: 'https://litellm.example.com',
    serverName: 'github_mcp',
  },
};
