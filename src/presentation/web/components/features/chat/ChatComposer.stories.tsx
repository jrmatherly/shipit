import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState, useCallback } from 'react';
import { fn } from 'storybook/test';
import type { ThreadMessageLike, AppendMessage } from '@assistant-ui/react';
import { AssistantRuntimeProvider, useExternalStoreRuntime } from '@assistant-ui/react';
import { ChatComposer } from './ChatComposer';

// ── Mock runtime wrapper ─────────────────────────────────────────────────────
// ChatComposer uses ComposerPrimitive and ThreadPrimitive from @assistant-ui/react,
// which require an active AssistantRuntimeProvider in the React tree.

function MockAssistantProvider({
  isRunning = false,
  children,
}: {
  isRunning?: boolean;
  children: React.ReactNode;
}) {
  const [messages, setMessages] = useState<ThreadMessageLike[]>([]);
  const [running, setRunning] = useState(isRunning);

  const onNew = useCallback(async (message: AppendMessage) => {
    const textPart = message.content.find((c) => c.type === 'text');
    if (textPart?.type !== 'text') return;

    const userMsg: ThreadMessageLike = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: [{ type: 'text', text: textPart.text }],
      createdAt: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setRunning(true);

    await new Promise((r) => setTimeout(r, 800));

    const assistantMsg: ThreadMessageLike = {
      id: `assistant-${Date.now()}`,
      role: 'assistant',
      content: [{ type: 'text', text: 'Got it — working on it now.' }],
      createdAt: new Date(),
    };
    setMessages((prev) => [...prev, assistantMsg]);
    setRunning(false);
  }, []);

  const runtime = useExternalStoreRuntime({
    messages,
    convertMessage: useCallback((msg: ThreadMessageLike): ThreadMessageLike => msg, []),
    isRunning: running,
    onNew,
  });

  return <AssistantRuntimeProvider runtime={runtime}>{children}</AssistantRuntimeProvider>;
}

// ── Story wrapper ─────────────────────────────────────────────────────────────

interface StoryArgs {
  isDragOver?: boolean;
  uploadError?: string | null;
  hasAttachments?: boolean;
  isRunning?: boolean;
}

function ComposerStory({
  isDragOver = false,
  uploadError = null,
  hasAttachments = false,
  isRunning = false,
}: StoryArgs) {
  const attachments = hasAttachments
    ? [
        {
          id: 'file-1',
          name: 'screenshot.png',
          size: 124800,
          mimeType: 'image/png',
          path: '/tmp/screenshot.png',
          loading: false,
          notes: '',
        },
        {
          id: 'file-2',
          name: 'error-log.txt',
          size: 4096,
          mimeType: 'text/plain',
          path: '/tmp/error-log.txt',
          loading: false,
          notes: 'Relevant section starts at line 42',
        },
      ]
    : [];

  return (
    <MockAssistantProvider isRunning={isRunning}>
      <div
        style={{
          width: '480px',
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          overflow: 'hidden',
        }}
      >
        <ChatComposer
          attachments={attachments}
          isDragOver={isDragOver}
          uploadError={uploadError}
          onDragEnter={fn()}
          onDragLeave={fn()}
          onDragOver={fn()}
          onDrop={fn()}
          onPaste={fn()}
          onRemoveAttachment={fn()}
          onNotesChange={fn()}
          onPickFiles={fn()}
        />
      </div>
    </MockAssistantProvider>
  );
}

// ── Meta ──────────────────────────────────────────────────────────────────────

/**
 * ChatComposer is the message input area at the bottom of the chat thread.
 * It includes a resizable textarea, attachment chips, file picker, and a
 * send/cancel toggle that adapts to the thread running state.
 *
 * Because it uses ComposerPrimitive and ThreadPrimitive from @assistant-ui/react,
 * an AssistantRuntimeProvider must be present in the tree. In Storybook, a
 * lightweight mock runtime is used via useExternalStoreRuntime.
 */
const meta = {
  title: 'Features/Chat/ChatComposer',
  component: ComposerStory,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
} satisfies Meta<typeof ComposerStory>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default — empty composer ready for input. Click the send button to trigger a mock response. */
export const Default: Story = {
  args: {
    isDragOver: false,
    uploadError: null,
    hasAttachments: false,
    isRunning: false,
  },
};

/** WithAttachments — two files attached, showing attachment chips above the controls bar. */
export const WithAttachments: Story = {
  args: {
    isDragOver: false,
    uploadError: null,
    hasAttachments: true,
    isRunning: false,
  },
};

/** DragOver — file is being dragged over the composer, highlighted drop target. */
export const DragOver: Story = {
  args: {
    isDragOver: true,
    uploadError: null,
    hasAttachments: false,
    isRunning: false,
  },
};

/** UploadError — an upload error message is shown above the controls bar. */
export const UploadError: Story = {
  args: {
    isDragOver: false,
    uploadError: 'File too large. Maximum allowed size is 10 MB.',
    hasAttachments: false,
    isRunning: false,
  },
};

/** AgentRunning — thread is active, send button replaced by cancel button. */
export const AgentRunning: Story = {
  args: {
    isDragOver: false,
    uploadError: null,
    hasAttachments: false,
    isRunning: true,
  },
};
