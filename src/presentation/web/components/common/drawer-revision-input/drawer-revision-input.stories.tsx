import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { DrawerRevisionInput } from './drawer-revision-input';

const meta = {
  title: 'Common/DrawerRevisionInput',
  component: DrawerRevisionInput,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
  },
} satisfies Meta<typeof DrawerRevisionInput>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    onSubmit: fn(),
  },
};

export const CustomPlaceholder: Story = {
  args: {
    onSubmit: fn(),
    placeholder: 'Describe the changes you want...',
  },
};

export const WithAriaLabel: Story = {
  args: {
    onSubmit: fn(),
    placeholder: 'Ask AI to revise the plan...',
    ariaLabel: 'Plan revision input',
  },
};

export const Disabled: Story = {
  args: {
    onSubmit: fn(),
    disabled: true,
    placeholder: 'Revision disabled while processing...',
  },
};
