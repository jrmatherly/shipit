'use client';

import { useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { BaseDrawer } from '@/components/common/base-drawer';
import { DrawerTitle, DrawerDescription } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { TooltipProvider } from '@/components/ui/tooltip';
import type { WorkflowDefaults } from '@/app/actions/get-workflow-defaults';
import { useFeatureCreateForm } from './use-feature-create-form';
import { PromptSection } from './prompt-section';
import { WorkflowOptionsSection } from './workflow-options-section';
import { ParentFeatureCombobox } from './parent-feature-combobox';
import { RepositoryCombobox } from './repository-combobox';
import type { ParentFeatureOption, RepositoryOption, FeatureCreatePayload } from './types';

export type { FileAttachment } from '@shipit-ai/core/infrastructure/services/file-dialog.service';
export type { FormAttachment } from './types';
export type { ParentFeatureOption, RepositoryOption, FeatureCreatePayload };
export type { RepositoryComboboxProps } from './repository-combobox';
export { RepositoryCombobox } from './repository-combobox';

export interface FeatureCreateDrawerProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: FeatureCreatePayload) => void;
  repositoryPath: string;
  isSubmitting?: boolean;
  workflowDefaults?: WorkflowDefaults;
  /** List of existing features available for selection as a parent. */
  features?: ParentFeatureOption[];
  /** List of tracked repositories for selection when repo context is missing. */
  repositories?: RepositoryOption[];
  /** Pre-select a parent feature when the drawer opens (e.g. from (+) button on a feature node). */
  initialParentId?: string;
  /** Current global agent type from settings */
  currentAgentType?: string;
  /** Current global model from settings */
  currentModel?: string;
  /** Pre-fill the description textarea (e.g. from session context) */
  initialDescription?: string;
  /** When true, user has push access — Fork & PR toggle will be hidden. */
  canPushDirectly?: boolean;
}

export function FeatureCreateDrawer({
  open,
  onClose,
  onSubmit,
  repositoryPath,
  isSubmitting = false,
  workflowDefaults,
  features,
  repositories,
  initialParentId,
  currentAgentType,
  currentModel,
  initialDescription,
  canPushDirectly,
}: FeatureCreateDrawerProps) {
  const { t } = useTranslation('web');

  const form = useFeatureCreateForm({
    open,
    onClose,
    onSubmit,
    repositoryPath,
    workflowDefaults,
    repositories,
    initialParentId,
    currentAgentType,
    currentModel,
    initialDescription,
    canPushDirectly,
  });

  const formRef = useRef<HTMLFormElement>(null);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      formRef.current?.requestSubmit();
    }
  }, []);

  const hasFeatures = features && features.length > 0;
  const showRepoSelector = !form.validRepoPath && repositories !== undefined;
  const needsRepo = !form.validRepoPath && !form.selectedRepoPath;

  return (
    <BaseDrawer
      open={open}
      onClose={form.attemptClose}
      size="md"
      modal={false}
      dismissOnOutsideClick
      data-testid="feature-create-drawer"
      header={
        <>
          <div className="flex items-center gap-2">
            <div className="h-2.5 w-2.5 shrink-0 rounded-full bg-blue-500" />
            <DrawerTitle>{t('createDrawer.title')}</DrawerTitle>
          </div>
          {isSubmitting ? (
            <DrawerDescription asChild>
              <div>
                <Badge variant="secondary">{t('createDrawer.creating')}</Badge>
              </div>
            </DrawerDescription>
          ) : null}
        </>
      }
      footer={
        <div className="flex flex-row justify-end gap-2">
          <Button variant="outline" onClick={form.attemptClose} disabled={isSubmitting}>
            {t('createDrawer.cancel')}
          </Button>
          <Button
            type="submit"
            form="create-feature-form"
            disabled={!form.description.trim() || isSubmitting || needsRepo}
          >
            {isSubmitting ? t('createDrawer.creating') : t('createDrawer.createFeature')}
          </Button>
        </div>
      }
    >
      {/* Form body */}
      <div className="overflow-y-auto p-4">
        <TooltipProvider delayDuration={400}>
          <form
            ref={formRef}
            id="create-feature-form"
            onSubmit={form.handleSubmit}
            onKeyDown={handleKeyDown}
            className="flex flex-col gap-4"
          >
            {/* Repository selector (only when opened from sidebar without repo context) */}
            {showRepoSelector ? (
              <div className="flex flex-col gap-1.5" data-testid="repo-selector-section">
                <Label className="text-muted-foreground text-xs font-semibold tracking-wider">
                  {t('createDrawer.repository')}
                </Label>
                <RepositoryCombobox
                  repositories={form.localRepos}
                  value={form.selectedRepoPath}
                  onChange={form.setSelectedRepoPath}
                  onAddRepository={(repo) => {
                    form.setLocalRepos((prev) => [...prev, repo]);
                    form.setSelectedRepoPath(repo.path);
                  }}
                  disabled={isSubmitting}
                />
              </div>
            ) : form.validRepoPath ? (
              <div className="flex flex-col gap-1.5" data-testid="repo-readonly-section">
                <Label className="text-muted-foreground text-xs font-semibold tracking-wider">
                  {t('createDrawer.repository')}
                </Label>
                <p className="text-sm" data-testid="repo-readonly-label">
                  {repositories?.find((r) => r.path === form.validRepoPath)?.name ??
                    form.validRepoPath.split('/').pop()}
                </p>
              </div>
            ) : null}

            {/* Description + inline controls with drop zone */}
            <PromptSection
              description={form.description}
              onDescriptionChange={form.setDescription}
              attachments={form.attachments}
              onRemoveFile={form.handleRemoveFile}
              onNotesChange={form.handleNotesChange}
              onPaste={form.handlePaste}
              onDragEnter={form.handleDragEnter}
              onDragLeave={form.handleDragLeave}
              onDragOver={form.handleDragOver}
              onDrop={form.handleDrop}
              onAddFiles={form.handleAddFiles}
              isDragOver={form.isDragOver}
              uploadError={form.uploadError}
              isPromptFocused={form.isPromptFocused}
              onPromptFocus={() => form.setIsPromptFocused(true)}
              onPromptBlur={() => form.setIsPromptFocused(false)}
              fast={form.fast}
              onFastChange={form.setFast}
              pending={form.pending}
              onPendingChange={form.setPending}
              overrideAgent={form.overrideAgent}
              overrideModel={form.overrideModel}
              currentAgentType={currentAgentType}
              currentModel={currentModel}
              onAgentModelChange={(agent, model) => {
                form.setOverrideAgent(agent);
                form.setOverrideModel(model);
              }}
              isSubmitting={isSubmitting}
            />

            {/* Parent feature selector (only when opened from a feature node) */}
            {hasFeatures && initialParentId !== undefined ? (
              <div className="flex flex-col gap-1.5">
                <Label
                  htmlFor="parent-feature"
                  className="text-muted-foreground text-xs font-semibold tracking-wider"
                >
                  {t('createDrawer.parentFeature')}
                </Label>
                <ParentFeatureCombobox
                  features={features}
                  value={form.parentId}
                  onChange={form.setParentId}
                  disabled={isSubmitting}
                />
              </div>
            ) : null}

            {/* Approve + Evidence + Git workflow options */}
            <WorkflowOptionsSection
              approvalGates={form.approvalGates}
              onApprovalGatesChange={form.setApprovalGates}
              enableEvidence={form.enableEvidence}
              onEnableEvidenceChange={form.setEnableEvidence}
              commitEvidence={form.commitEvidence}
              onCommitEvidenceChange={form.setCommitEvidence}
              push={form.push}
              onPushChange={form.setPush}
              openPr={form.openPr}
              onOpenPrChange={form.setOpenPr}
              ciWatchEnabled={form.ciWatchEnabled}
              onCiWatchChange={form.setCiWatchEnabled}
              rebaseBeforeBranch={form.rebaseBeforeBranch}
              onRebaseBeforeBranchChange={form.setRebaseBeforeBranch}
              commitSpecs={form.commitSpecs}
              onCommitSpecsChange={form.setCommitSpecs}
              forkAndPr={form.forkAndPr}
              onForkAndPrChange={form.setForkAndPr}
              canPush={form.canPush}
              fast={form.fast}
              computedPush={form.computedPush}
              computedOpenPr={form.computedOpenPr}
              isSubmitting={isSubmitting}
              agentType={form.overrideAgent ?? currentAgentType}
              permissionMode={form.permissionMode}
              onPermissionModeChange={form.setPermissionMode}
            />
          </form>
        </TooltipProvider>
      </div>
    </BaseDrawer>
  );
}
