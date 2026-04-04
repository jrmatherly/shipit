import type { Meta, StoryObj } from '@storybook/react-vite';
import { getEditorTypeIcon } from './editor-type-icons';

/**
 * editor-type-icons exports a factory function rather than a single component.
 * This story demonstrates each editor icon variant by rendering them all.
 */

function EditorIconShowcase() {
  const editorTypes = ['vscode', 'cursor', 'windsurf', 'zed', 'antigravity', 'unknown'];

  return (
    <div className="flex flex-wrap items-center gap-6 p-4">
      {editorTypes.map((type) => {
        const Icon = getEditorTypeIcon(type);
        return (
          <div key={type} className="flex flex-col items-center gap-1">
            <Icon className="h-6 w-6" />
            <span className="text-muted-foreground text-xs">{type}</span>
          </div>
        );
      })}
    </div>
  );
}

function EditorIconUndefined() {
  const Icon = getEditorTypeIcon(undefined);
  return (
    <div className="flex flex-col items-center gap-1 p-4">
      <Icon className="h-6 w-6" />
      <span className="text-muted-foreground text-xs">undefined (fallback)</span>
    </div>
  );
}

const meta = {
  title: 'Common/EditorTypeIcons',
  component: EditorIconShowcase,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
} satisfies Meta<typeof EditorIconShowcase>;

export default meta;
type Story = StoryObj<typeof meta>;

export const AllEditorTypes: Story = {};

export const UndefinedFallback: Story = {
  render: () => <EditorIconUndefined />,
};
