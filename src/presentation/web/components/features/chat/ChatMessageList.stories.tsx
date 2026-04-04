import type { Meta, StoryObj } from '@storybook/react-vite';
import { InteractiveMessageRole } from '@shipit-ai/core/domain/generated/output';
import type { InteractiveMessage } from '@shipit-ai/core/domain/generated/output';
import { ChatMessageList } from './ChatMessageList';

const sampleMessages: InteractiveMessage[] = [
  {
    id: 'msg-001',
    featureId: 'feat-123',
    role: InteractiveMessageRole.user,
    content: 'Can you help me implement the authentication feature?',
    createdAt: new Date('2025-01-15T10:00:00Z'),
    updatedAt: new Date('2025-01-15T10:00:00Z'),
  },
  {
    id: 'msg-002',
    featureId: 'feat-123',
    role: InteractiveMessageRole.assistant,
    content:
      "Of course! I'll start by analyzing the existing codebase to understand the current authentication setup, then implement the new feature. Let me begin with the requirements phase.",
    createdAt: new Date('2025-01-15T10:00:15Z'),
    updatedAt: new Date('2025-01-15T10:00:15Z'),
  },
  {
    id: 'msg-003',
    featureId: 'feat-123',
    role: InteractiveMessageRole.user,
    content: 'Make sure to use JWT tokens and include refresh token support.',
    createdAt: new Date('2025-01-15T10:01:00Z'),
    updatedAt: new Date('2025-01-15T10:01:00Z'),
  },
  {
    id: 'msg-004',
    featureId: 'feat-123',
    role: InteractiveMessageRole.assistant,
    content:
      'Understood! I will implement JWT-based authentication with refresh token support. The implementation will include:\n\n1. Access tokens (short-lived, 15 minutes)\n2. Refresh tokens (long-lived, 7 days)\n3. Secure token rotation\n4. Token invalidation on logout',
    createdAt: new Date('2025-01-15T10:01:30Z'),
    updatedAt: new Date('2025-01-15T10:01:30Z'),
  },
];

const meta = {
  title: 'Chat/ChatMessageList',
  component: ChatMessageList,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
  },
  decorators: [
    (Story) => (
      <div
        style={{
          height: '500px',
          width: '480px',
          display: 'flex',
          flexDirection: 'column',
          border: '1px solid var(--color-border)',
          borderRadius: '8px',
          overflow: 'hidden',
        }}
      >
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ChatMessageList>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    messages: sampleMessages,
    streamingContent: null,
    isAgentThinking: false,
  },
};

export const Empty: Story = {
  args: {
    messages: [],
    streamingContent: null,
    isAgentThinking: false,
    emptyStateMessage: 'Start a conversation with the AI agent.',
  },
};

export const Loading: Story = {
  args: {
    messages: [],
    streamingContent: null,
    isAgentThinking: false,
    isLoading: true,
  },
};

export const AgentThinking: Story = {
  args: {
    messages: sampleMessages,
    streamingContent: null,
    isAgentThinking: true,
    activityLog: ['Analyzing codebase...'],
  },
};

export const AgentThinkingWithMultipleSteps: Story = {
  args: {
    messages: sampleMessages,
    streamingContent: null,
    isAgentThinking: true,
    activityLog: [
      'Reading file: src/auth/login.ts',
      'Reading file: src/middleware/auth.ts',
      'Analyzing authentication flow...',
      'Checking existing test coverage...',
    ],
  },
};

export const StreamingResponse: Story = {
  args: {
    messages: sampleMessages.slice(0, 2),
    streamingContent: 'I am currently implementing the JWT authentication module...',
    isAgentThinking: false,
    activityLog: ['Writing: src/auth/jwt.ts', 'Writing: src/auth/refresh-token.ts'],
  },
};
