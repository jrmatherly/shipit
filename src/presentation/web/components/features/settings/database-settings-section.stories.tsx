import type { Meta, StoryObj } from '@storybook/react';
import { DatabaseSettingsSection } from './database-settings-section';

const meta = {
  title: 'Features/Settings/DatabaseSettingsSection',
  component: DatabaseSettingsSection,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
  },
} satisfies Meta<typeof DatabaseSettingsSection>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    shipitAiHome: '/home/user/.shipit-ai',
    dbFileSize: '2.4 MB',
  },
};

export const LargeDatabase: Story = {
  args: {
    shipitAiHome: '/opt/shipit-ai/production',
    dbFileSize: '156.7 MB',
  },
};
