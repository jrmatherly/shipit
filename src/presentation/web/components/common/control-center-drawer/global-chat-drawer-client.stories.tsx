import type { Meta, StoryObj } from '@storybook/react';
import { GlobalChatDrawerClient } from './global-chat-drawer-client';

/**
 * GlobalChatDrawerClient uses usePathname from next/navigation (mocked in Storybook
 * to return '/') so the drawer renders in its closed state by default.
 * The drawer opens when pathname === '/chat'.
 */
const meta = {
  title: 'Drawers/GlobalChatDrawerClient',
  component: GlobalChatDrawerClient,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof GlobalChatDrawerClient>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default — drawer closed (pathname is '/') */
export const Default: Story = {};
