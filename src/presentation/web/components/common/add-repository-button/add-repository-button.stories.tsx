import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { AddRepositoryButton } from './add-repository-button';

const meta = {
  title: 'Common/AddRepositoryButton',
  component: AddRepositoryButton,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
} satisfies Meta<typeof AddRepositoryButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    onSelect: fn(),
    onGitHubImport: fn(),
  },
};

export const SelectOnly: Story = {
  args: {
    onSelect: fn(),
  },
};
