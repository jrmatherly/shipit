import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { DrawerCloseGuardProvider } from '@/hooks/drawer-close-guard';
import { TooltipProvider } from '@/components/ui/tooltip';
import { PromptSection } from './prompt-section';
import type { FormAttachment } from './types';

const meta: Meta<typeof PromptSection> = {
  title: 'Drawers/Feature/PromptSection',
  component: PromptSection,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <DrawerCloseGuardProvider>
        <TooltipProvider delayDuration={400}>
          <div className="w-[448px] p-4">
            <Story />
          </div>
        </TooltipProvider>
      </DrawerCloseGuardProvider>
    ),
  ],
  parameters: {
    layout: 'centered',
  },
  args: {
    description: '',
    onDescriptionChange: fn(),
    attachments: [],
    onRemoveFile: fn(),
    onNotesChange: fn(),
    onPaste: fn(),
    onDragEnter: fn(),
    onDragLeave: fn(),
    onDragOver: fn(),
    onDrop: fn(),
    onAddFiles: fn(),
    isDragOver: false,
    uploadError: null,
    isPromptFocused: false,
    onPromptFocus: fn(),
    onPromptBlur: fn(),
    fast: true,
    onFastChange: fn(),
    pending: false,
    onPendingChange: fn(),
    overrideAgent: undefined,
    overrideModel: undefined,
    currentAgentType: 'claude-code',
    currentModel: 'claude-sonnet-4-6',
    onAgentModelChange: fn(),
    isSubmitting: false,
  },
};

export default meta;
type Story = StoryObj<typeof PromptSection>;

/** Empty prompt area — default state with no text entered. */
export const Empty: Story = {};

/** Prompt with description text entered. */
export const WithDescription: Story = {
  args: {
    description:
      'Implement OAuth2 authentication with GitHub as the identity provider. Includes login, callback handling, and token refresh.',
  },
};

/** Drag-over state — shows the border highlight when a file is dragged over. */
export const DragOver: Story = {
  args: {
    isDragOver: true,
    description: 'Describe your feature here...',
  },
};

/** Upload error state — shows an error message below the textarea. */
export const UploadError: Story = {
  args: {
    uploadError: '"screenshot.png" exceeds 10 MB limit',
    description: 'Add image upload to the profile page',
  },
};

/** With attachment chips — shows files attached inline. */
export const WithAttachments: Story = {
  args: {
    description: 'Implement the design from the mockup',
    attachments: [
      {
        id: 'attach-1',
        name: 'mockup.png',
        size: 204800,
        mimeType: 'image/png',
        path: '/Users/dev/assets/mockup.png',
        loading: false,
      },
      {
        id: 'attach-2',
        name: 'spec.pdf',
        size: 512000,
        mimeType: 'application/pdf',
        path: '/Users/dev/docs/spec.pdf',
        loading: false,
      },
    ] satisfies FormAttachment[],
  },
};

/** Loading attachment — shows a spinner chip while upload is in progress. */
export const AttachmentLoading: Story = {
  args: {
    description: 'Uploading files...',
    attachments: [
      {
        id: 'attach-temp',
        name: 'large-file.zip',
        size: 5242880,
        mimeType: 'application/zip',
        path: '',
        loading: true,
      },
    ] satisfies FormAttachment[],
  },
};

/** Pending mode enabled — the Pending toggle is checked. */
export const PendingMode: Story = {
  args: {
    description: 'Create feature but do not start the agent yet',
    pending: true,
  },
};

/** Fast mode disabled — the Fast toggle is off. */
export const FastModeOff: Story = {
  args: {
    fast: false,
    description: 'Run the full SDLC pipeline',
  },
};

/** Submitting state — all controls are disabled. */
export const Submitting: Story = {
  args: {
    description: 'Feature being created...',
    isSubmitting: true,
  },
};

/** Focused prompt — shows the ring focus style. */
export const Focused: Story = {
  args: {
    isPromptFocused: true,
    description: '',
  },
};
