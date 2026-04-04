import type { Meta, StoryObj } from '@storybook/react-vite';
import { ScrollArea, ScrollBar } from './scroll-area';

const meta = {
  title: 'Primitives/ScrollArea',
  component: ScrollArea,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
} satisfies Meta<typeof ScrollArea>;

export default meta;
type Story = StoryObj<typeof meta>;

const items = Array.from({ length: 50 }, (_, i) => `Item ${i + 1}`);

export const Default: Story = {
  render: () => (
    <ScrollArea className="h-72 w-48 rounded-md border">
      <div className="p-4">
        {items.map((item) => (
          <div key={item} className="text-sm">
            {item}
          </div>
        ))}
      </div>
    </ScrollArea>
  ),
};

export const HorizontalScroll: Story = {
  render: () => (
    <ScrollArea className="w-96 rounded-md border">
      <div className="flex gap-4 p-4" style={{ width: '800px' }}>
        {Array.from({ length: 20 }, (_, i) => (
          <div
            key={i}
            className="bg-muted flex h-20 w-20 shrink-0 items-center justify-center rounded-md text-sm"
          >
            {i + 1}
          </div>
        ))}
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  ),
};

export const FixedHeight: Story = {
  render: () => (
    <ScrollArea className="h-40 w-64 rounded-md border">
      <div className="p-4">
        <p className="text-sm">
          This is a scroll area with fixed height. The content is long enough to trigger the
          scrollbar. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor
          incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud
          exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
        </p>
      </div>
    </ScrollArea>
  ),
};
