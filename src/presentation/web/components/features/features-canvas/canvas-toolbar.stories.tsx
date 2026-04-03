import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { ReactFlowProvider } from '@xyflow/react';
import { CanvasToolbar } from './canvas-toolbar';

/**
 * CanvasToolbar uses useReactFlow internally and must be wrapped in
 * a ReactFlowProvider to function correctly in Storybook.
 */
const meta = {
  title: 'Features/Canvas/CanvasToolbar',
  component: CanvasToolbar,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  decorators: [
    (Story) => (
      <ReactFlowProvider>
        <Story />
      </ReactFlowProvider>
    ),
  ],
} satisfies Meta<typeof CanvasToolbar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    showArchived: false,
    onToggleArchived: fn(),
  },
};

export const ShowingArchived: Story = {
  args: {
    showArchived: true,
    onToggleArchived: fn(),
  },
};

export const WithResetViewport: Story = {
  args: {
    showArchived: false,
    onToggleArchived: fn(),
    onResetViewport: fn().mockReturnValue({ x: 0, y: 0, zoom: 1 }),
  },
};
