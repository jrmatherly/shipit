import type { Meta, StoryObj } from '@storybook/react-vite';
import VersionPageClient from './version-page-client';

const meta = {
  title: 'Pages/VersionPageClient',
  component: VersionPageClient,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
  },
} satisfies Meta<typeof VersionPageClient>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    versionInfo: {
      name: '@shipit-ai/cli',
      version: '1.2.3',
      description: 'Autonomous AI Native SDLC Platform',
      branch: 'main',
      commitHash: 'abc1234',
    },
    systemInfo: {
      nodeVersion: '22.4.0',
      platform: 'darwin',
      arch: 'arm64',
    },
  },
};

export const EarlyVersion: Story = {
  args: {
    versionInfo: {
      name: '@shipit-ai/cli',
      version: '0.1.0',
      description: 'Autonomous AI Native SDLC Platform',
      branch: 'main',
      commitHash: 'abc1234',
    },
    systemInfo: {
      nodeVersion: '20.11.0',
      platform: 'linux',
      arch: 'x64',
    },
  },
};

export const Windows: Story = {
  args: {
    versionInfo: {
      name: '@shipit-ai/cli',
      version: '2.0.0',
      description: 'Autonomous AI Native SDLC Platform',
      branch: 'main',
      commitHash: 'abc1234',
    },
    systemInfo: {
      nodeVersion: '22.0.0',
      platform: 'win32',
      arch: 'x64',
    },
  },
};
