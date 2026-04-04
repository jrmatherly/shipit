import type { Meta, StoryObj } from '@storybook/react-vite';
import { AdoptDrawerClient } from './adopt-drawer-client';

/**
 * AdoptDrawerClient wraps AdoptBranchDrawer with routing and server action logic.
 * In Storybook, usePathname returns '/' so the drawer renders in its closed state.
 * The listBranches server action is mocked to return sample branches.
 */
const meta = {
  title: 'Drawers/AdoptDrawerClient',
  component: AdoptDrawerClient,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof AdoptDrawerClient>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default — drawer closed (pathname is '/') */
export const Default: Story = {
  args: {
    repositoryPath: '/Users/dev/my-repo',
    repositories: [
      { id: 'repo-1', name: 'acme/frontend', path: '/Users/dev/frontend' },
      { id: 'repo-2', name: 'acme/backend', path: '/Users/dev/backend' },
    ],
  },
};
