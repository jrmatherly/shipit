import type { Meta, StoryObj } from '@storybook/react';
import type { Edge } from '@xyflow/react';
import { ReactFlowProvider } from '@xyflow/react';
import { AgentEventsProvider } from '@/hooks/agent-events-provider';
import { DrawerCloseGuardProvider } from '@/hooks/drawer-close-guard';
import { SidebarFeaturesProvider } from '@/hooks/sidebar-features-context';
import { ControlCenterInner } from './control-center-inner';
import type { CanvasNodeType } from '@/components/features/features-canvas';
import type { RepositoryNodeType } from '@/components/common/repository-node';

const sampleRepo: RepositoryNodeType = {
  id: 'repo-1',
  type: 'repositoryNode',
  position: { x: 100, y: 100 },
  data: { name: 'acme/frontend' },
};

const edges: Edge[] = [];

/**
 * ControlCenterInner is the inner orchestration layer between ControlCenter
 * (which fetches server data) and FeaturesCanvas (which renders the graph).
 * It requires ReactFlowProvider + context providers to render correctly.
 */
const meta = {
  title: 'Features/ControlCenter/ControlCenterInner',
  component: ControlCenterInner,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
  decorators: [
    (Story) => (
      <AgentEventsProvider>
        <SidebarFeaturesProvider>
          <DrawerCloseGuardProvider>
            <ReactFlowProvider>
              <div style={{ height: '100vh' }}>
                <Story />
              </div>
            </ReactFlowProvider>
          </DrawerCloseGuardProvider>
        </SidebarFeaturesProvider>
      </AgentEventsProvider>
    ),
  ],
} satisfies Meta<typeof ControlCenterInner>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {
  args: {
    initialNodes: [],
    initialEdges: [],
  },
};

export const WithRepository: Story = {
  args: {
    initialNodes: [sampleRepo] as CanvasNodeType[],
    initialEdges: edges,
  },
};
