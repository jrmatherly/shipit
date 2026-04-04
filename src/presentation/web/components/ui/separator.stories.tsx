import type { Meta, StoryObj } from '@storybook/react-vite';
import { Separator } from './separator';

const meta = {
  title: 'Primitives/Separator',
  component: Separator,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    orientation: {
      control: 'select',
      options: ['horizontal', 'vertical'],
    },
  },
} satisfies Meta<typeof Separator>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Horizontal: Story = {
  render: () => (
    <div className="w-64">
      <p className="text-sm">Section above</p>
      <Separator className="my-4" />
      <p className="text-sm">Section below</p>
    </div>
  ),
};

export const Vertical: Story = {
  render: () => (
    <div className="flex h-8 items-center gap-4">
      <span className="text-sm">Left</span>
      <Separator orientation="vertical" />
      <span className="text-sm">Middle</span>
      <Separator orientation="vertical" />
      <span className="text-sm">Right</span>
    </div>
  ),
};

export const InToolbar: Story = {
  render: () => (
    <div className="flex h-9 items-center gap-2 rounded-md border px-3">
      <button type="button" className="text-sm">
        Bold
      </button>
      <Separator orientation="vertical" className="mx-1" />
      <button type="button" className="text-sm">
        Italic
      </button>
      <button type="button" className="text-sm">
        Underline
      </button>
      <Separator orientation="vertical" className="mx-1" />
      <button type="button" className="text-sm">
        Align
      </button>
    </div>
  ),
};
