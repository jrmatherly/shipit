import type { Meta, StoryObj } from '@storybook/react';
import { GithubIcon } from './github-icon';

const meta: Meta<typeof GithubIcon> = {
  title: 'Primitives/GithubIcon',
  component: GithubIcon,
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof GithubIcon>;

export const Default: Story = {
  render: () => <GithubIcon className="h-6 w-6" />,
};

export const Small: Story = {
  render: () => <GithubIcon className="h-4 w-4" />,
};

export const Large: Story = {
  render: () => <GithubIcon className="h-10 w-10" />,
};

export const CustomColor: Story = {
  render: () => <GithubIcon className="h-6 w-6 text-blue-500" />,
};
