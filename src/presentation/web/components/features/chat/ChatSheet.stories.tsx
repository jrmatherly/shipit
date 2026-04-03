import type { Meta, StoryObj } from '@storybook/react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { GlobalChatPopup } from './ChatSheet';

/**
 * GlobalChatPopup is the persistent floating chat panel with a FAB trigger.
 *
 * Requires SidebarProvider (for useSidebar), TurnStatusesProvider (for
 * useTurnStatus), and FabLayoutProvider (for useFabLayout). In Storybook the
 * turn-status and fab-layout hooks fall back gracefully when their providers
 * are absent; SidebarProvider is wrapped here explicitly.
 *
 * The popup starts closed. Click the floating violet button to open it.
 */
const meta = {
  title: 'Chat/GlobalChatPopup',
  component: GlobalChatPopup,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
  decorators: [
    (Story) => (
      <SidebarProvider defaultOpen>
        <div style={{ minHeight: '100vh', position: 'relative' }}>
          <Story />
        </div>
      </SidebarProvider>
    ),
  ],
} satisfies Meta<typeof GlobalChatPopup>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default — FAB shown in closed state; click to open the chat panel. */
export const Default: Story = {};
