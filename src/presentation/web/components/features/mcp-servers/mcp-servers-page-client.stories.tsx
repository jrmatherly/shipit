import type { Meta, StoryObj } from '@storybook/react-vite';
import { McpServersPageClient } from './mcp-servers-page-client';

const meta = {
  title: 'Features/McpServers/McpServersPageClient',
  component: McpServersPageClient,
} satisfies Meta<typeof McpServersPageClient>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { proxyConfigured: true, proxyBaseUrl: 'http://localhost:4000' },
};

export const NoProxy: Story = {
  args: { proxyConfigured: false, proxyBaseUrl: '' },
};
