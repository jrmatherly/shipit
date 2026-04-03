import type { Meta, StoryObj } from '@storybook/react';
import { RepositoryDrawerClient } from './repository-drawer-client';

/**
 * RepositoryDrawerClient wraps the repository drawer with routing and server
 * action logic. In Storybook, usePathname returns '/' so the drawer renders
 * in its closed state. The getGitRepoInfo server action is mocked to return
 * sample git repository data.
 */
const meta = {
  title: 'Drawers/RepositoryDrawerClient',
  component: RepositoryDrawerClient,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof RepositoryDrawerClient>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default — drawer closed (pathname is '/') */
export const Default: Story = {
  args: {
    data: {
      name: 'acme/frontend',
      id: 'repo-1',
      repositoryPath: '/Users/dev/frontend',
      branch: 'main',
      commitMessage: 'feat: add authentication module',
      committer: 'Jane Dev',
      behindCount: 0,
      gitInfoStatus: 'ready',
    },
  },
};

/** With behind indicator — repository is behind origin */
export const BehindOrigin: Story = {
  args: {
    data: {
      name: 'acme/backend',
      id: 'repo-2',
      repositoryPath: '/Users/dev/backend',
      branch: 'feature/api',
      commitMessage: 'chore: update dependencies',
      committer: 'John Dev',
      behindCount: 3,
      gitInfoStatus: 'ready',
    },
  },
};

/** Chat tab — opens repository drawer on chat tab */
export const ChatTab: Story = {
  args: {
    initialTab: 'chat',
    data: {
      name: 'acme/frontend',
      id: 'repo-1',
      repositoryPath: '/Users/dev/frontend',
      branch: 'main',
      gitInfoStatus: 'ready',
    },
  },
};
