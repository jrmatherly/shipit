import type { Meta, StoryObj } from '@storybook/react-vite';
import { ShipitAiLogo } from './shipit-ai-logo';

const meta: Meta<typeof ShipitAiLogo> = {
  title: 'Composed/ShipitAiLogo',
  component: ShipitAiLogo,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Small: Story = {
  args: {
    size: 16,
  },
};

export const Large: Story = {
  args: {
    size: 48,
  },
};

export const DevMode: Story = {
  args: {
    variant: 'dev',
  },
};
