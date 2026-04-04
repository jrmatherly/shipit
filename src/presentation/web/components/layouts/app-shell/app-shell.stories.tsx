import type { Meta, StoryObj } from '@storybook/react-vite';
import { AppShell } from './app-shell';

/**
 * AppShell is the top-level layout wrapper that provides:
 * - AgentEventsProvider (SSE subscriptions)
 * - DrawerCloseGuardProvider (navigation safety)
 * - SidebarFeaturesProvider (sidebar feature list)
 * - TurnStatusesProvider (agent turn status polling)
 * - AppSidebar + SidebarInset
 * - GlobalChatPopup (floating chat FAB)
 *
 * In Storybook, server actions and SSE are mocked so the shell renders
 * in its static state without real-time updates.
 */
const meta = {
  title: 'Layout/AppShell',
  component: AppShell,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof AppShell>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    sidebarOpen: true,
    children: (
      <div className="flex h-full items-center justify-center p-8">
        <div className="text-center">
          <h2 className="text-lg font-semibold">Page Content</h2>
          <p className="text-muted-foreground text-sm">Main application content renders here.</p>
        </div>
      </div>
    ),
  },
};

export const SidebarClosed: Story = {
  args: {
    sidebarOpen: false,
    children: (
      <div className="flex h-full items-center justify-center p-8">
        <p className="text-muted-foreground text-sm">Sidebar starts collapsed.</p>
      </div>
    ),
  },
};
