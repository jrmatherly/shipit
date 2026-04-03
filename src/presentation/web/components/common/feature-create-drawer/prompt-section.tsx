'use client';

import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { PaperclipIcon, Zap, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { AttachmentChip } from '@/components/common/attachment-chip';
import { AgentModelPicker } from '@/components/features/settings/AgentModelPicker';
import type { FormAttachment } from './types';

export interface PromptSectionProps {
  description: string;
  onDescriptionChange: (value: string) => void;
  attachments: FormAttachment[];
  onRemoveFile: (id: string) => void;
  onNotesChange: (id: string, notes: string) => void;
  onPaste: (e: React.ClipboardEvent) => void;
  onDragEnter: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onAddFiles: () => void;
  isDragOver: boolean;
  uploadError: string | null;
  isPromptFocused: boolean;
  onPromptFocus: () => void;
  onPromptBlur: () => void;
  fast: boolean;
  onFastChange: (value: boolean) => void;
  pending: boolean;
  onPendingChange: (value: boolean) => void;
  overrideAgent: string | undefined;
  overrideModel: string | undefined;
  currentAgentType: string | undefined;
  currentModel: string | undefined;
  onAgentModelChange: (agent: string, model: string) => void;
  isSubmitting: boolean;
}

export function PromptSection({
  description,
  onDescriptionChange,
  attachments,
  onRemoveFile,
  onNotesChange,
  onPaste,
  onDragEnter,
  onDragLeave,
  onDragOver,
  onDrop,
  onAddFiles,
  isDragOver,
  uploadError,
  isPromptFocused,
  onPromptFocus,
  onPromptBlur,
  fast,
  onFastChange,
  pending,
  onPendingChange,
  overrideAgent,
  overrideModel,
  currentAgentType,
  currentModel,
  onAgentModelChange,
  isSubmitting,
}: PromptSectionProps) {
  const { t } = useTranslation('web');
  const promptContainerRef = useRef<HTMLDivElement>(null);

  const handlePromptBlur = () => {
    // Defer the check so focus has time to settle on the new target.
    // This correctly handles Radix portals (e.g. AgentModelPicker popover) that
    // render outside the container DOM but are logically part of the prompt area.
    setTimeout(() => {
      const withinContainer = promptContainerRef.current?.contains(document.activeElement);
      const pickerPopoverOpen =
        promptContainerRef.current?.querySelector('[aria-expanded="true"]') !== null;
      if (!withinContainer && !pickerPopoverOpen) {
        onPromptBlur();
      }
    }, 0);
  };

  return (
    <div
      role="region"
      aria-label={t('createDrawer.fileDropZone')}
      data-drag-over={isDragOver ? 'true' : 'false'}
      onDragEnter={onDragEnter}
      onDragLeave={onDragLeave}
      onDragOver={onDragOver}
      onDrop={onDrop}
      className={cn(
        'flex flex-col gap-1.5 rounded-md border-2 border-transparent p-1 transition-colors',
        isDragOver && 'border-primary/50 bg-primary/5'
      )}
    >
      <Label
        htmlFor="feature-description"
        className="text-muted-foreground text-xs font-semibold tracking-wider"
      >
        {t('createDrawer.describeFeature')}
      </Label>
      <div
        ref={promptContainerRef}
        onFocus={onPromptFocus}
        onBlur={handlePromptBlur}
        className={cn(
          'border-input flex h-56 flex-col overflow-hidden rounded-md border shadow-xs transition-[color,box-shadow]',
          isPromptFocused && 'ring-ring/50 border-ring ring-[3px]'
        )}
      >
        <Textarea
          id="feature-description"
          placeholder={t('createDrawer.featurePlaceholder')}
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          onPaste={onPaste}
          required
          disabled={isSubmitting}
          aria-invalid={!!uploadError}
          aria-describedby={uploadError ? 'feature-upload-error' : undefined}
          className="min-h-0 flex-1 resize-none rounded-none border-0 shadow-none focus-visible:ring-0"
        />
        {/* Inline attachment chips — between textarea and controls */}
        {attachments.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 px-3 py-2">
            {attachments.map((file) => (
              <AttachmentChip
                key={file.id}
                name={file.name}
                size={file.size}
                mimeType={file.mimeType}
                path={file.path}
                onRemove={() => onRemoveFile(file.id)}
                disabled={isSubmitting}
                loading={file.loading}
                notes={file.notes}
                onNotesChange={(notes) => onNotesChange(file.id, notes)}
              />
            ))}
          </div>
        )}
        {uploadError ? (
          <p id="feature-upload-error" className="text-destructive px-3 pb-2 text-xs" role="alert">
            {uploadError}
          </p>
        ) : null}
        <div className="border-input flex items-center gap-3 border-t px-3 py-1.5">
          <AgentModelPicker
            initialAgentType={overrideAgent ?? currentAgentType ?? 'claude-code'}
            initialModel={overrideModel ?? currentModel ?? 'claude-sonnet-4-6'}
            mode="override"
            onAgentModelChange={onAgentModelChange}
            disabled={isSubmitting}
            className="w-55"
          />
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="ml-auto flex cursor-pointer items-center gap-2">
                <Switch
                  id="pending-mode"
                  checked={pending}
                  onCheckedChange={onPendingChange}
                  disabled={isSubmitting}
                />
                <Label
                  htmlFor="pending-mode"
                  className="flex cursor-pointer items-center gap-1 text-sm font-medium"
                >
                  <Clock className="h-3.5 w-3.5" />
                  {t('createDrawer.pendingMode')}
                </Label>
              </div>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              {t('createDrawer.pendingModeDescription')}
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex cursor-pointer items-center gap-2">
                <Switch
                  id="fast-mode"
                  checked={fast}
                  onCheckedChange={onFastChange}
                  disabled={isSubmitting}
                />
                <Label
                  htmlFor="fast-mode"
                  className="flex cursor-pointer items-center gap-1 text-sm font-medium"
                >
                  <Zap className="h-3.5 w-3.5" />
                  {t('createDrawer.fastModeLabel')}
                </Label>
              </div>
            </TooltipTrigger>
            <TooltipContent side="bottom">{t('createDrawer.fastModeDescription')}</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={onAddFiles}
                disabled={isSubmitting}
                aria-label={t('chat.attachFiles')}
                className="text-muted-foreground hover:text-foreground cursor-pointer rounded p-1 transition-colors"
              >
                <PaperclipIcon className="h-4 w-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom">{t('chat.attachFiles')}</TooltipContent>
          </Tooltip>
        </div>
      </div>
    </div>
  );
}
