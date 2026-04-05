'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { GitFork, FileText, RefreshCw, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { getAgentPermissionOptions, type PermissionOption } from '@/app/actions/agent-permissions';

const AUTO_APPROVE_OPTION_IDS = ['allowPrd', 'allowPlan', 'allowMerge'] as const;

export interface WorkflowOptionsSectionProps {
  approvalGates: Record<string, boolean>;
  onApprovalGatesChange: (gates: Record<string, boolean>) => void;
  enableEvidence: boolean;
  onEnableEvidenceChange: (value: boolean) => void;
  commitEvidence: boolean;
  onCommitEvidenceChange: (value: boolean) => void;
  push: boolean;
  onPushChange: (value: boolean) => void;
  openPr: boolean;
  onOpenPrChange: (value: boolean) => void;
  ciWatchEnabled: boolean;
  onCiWatchChange: (value: boolean) => void;
  rebaseBeforeBranch: boolean;
  onRebaseBeforeBranchChange: (value: boolean) => void;
  commitSpecs: boolean;
  onCommitSpecsChange: (value: boolean) => void;
  forkAndPr: boolean;
  onForkAndPrChange: (value: boolean) => void;
  canPush: boolean;
  fast: boolean;
  computedPush: boolean;
  computedOpenPr: boolean;
  isSubmitting: boolean;
  /** Currently selected agent type (for permission mode options) */
  agentType?: string;
  /** Selected per-feature permission mode override */
  permissionMode?: string;
  /** Callback when permission mode changes */
  onPermissionModeChange?: (mode: string | undefined) => void;
}

export function WorkflowOptionsSection({
  approvalGates,
  onApprovalGatesChange,
  enableEvidence,
  onEnableEvidenceChange,
  commitEvidence,
  onCommitEvidenceChange,
  push: _push,
  onPushChange,
  openPr,
  onOpenPrChange,
  ciWatchEnabled,
  onCiWatchChange,
  rebaseBeforeBranch,
  onRebaseBeforeBranchChange,
  commitSpecs,
  onCommitSpecsChange,
  forkAndPr,
  onForkAndPrChange,
  canPush,
  fast,
  computedPush,
  computedOpenPr,
  isSubmitting,
  agentType,
  permissionMode,
  onPermissionModeChange,
}: WorkflowOptionsSectionProps) {
  const { t } = useTranslation('web');

  const AUTO_APPROVE_OPTIONS = [
    { id: 'allowPrd', label: t('createDrawer.prd'), description: t('createDrawer.prdDescription') },
    {
      id: 'allowPlan',
      label: t('createDrawer.plan'),
      description: t('createDrawer.planDescription'),
    },
    {
      id: 'allowMerge',
      label: t('createDrawer.merge'),
      description: t('createDrawer.mergeDescription'),
    },
  ];

  return (
    <div className="flex flex-col gap-2">
      {/* Approve row */}
      <div className="border-input flex items-center gap-4 rounded-md border px-3 py-2.5">
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="text-muted-foreground w-16 shrink-0 cursor-default text-xs font-semibold tracking-wider">
              {t('createDrawer.approve')}
            </span>
          </TooltipTrigger>
          <TooltipContent side="bottom">{t('createDrawer.approveDescription')}</TooltipContent>
        </Tooltip>
        <div className="flex flex-1 items-center gap-4">
          {AUTO_APPROVE_OPTIONS.map((opt) => (
            <Tooltip key={opt.id}>
              <TooltipTrigger asChild>
                <div className="flex cursor-pointer items-center gap-1.5">
                  <Switch
                    id={`approve-${opt.id}`}
                    size="sm"
                    checked={approvalGates[opt.id] ?? false}
                    onCheckedChange={(v) =>
                      onApprovalGatesChange({ ...approvalGates, [opt.id]: v })
                    }
                    disabled={
                      isSubmitting || (fast && (opt.id === 'allowPrd' || opt.id === 'allowPlan'))
                    }
                  />
                  <Label
                    htmlFor={`approve-${opt.id}`}
                    className="cursor-pointer text-xs font-medium"
                  >
                    {opt.label}
                  </Label>
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                {fast && (opt.id === 'allowPrd' || opt.id === 'allowPlan')
                  ? t('createDrawer.skippedInFastMode')
                  : opt.description}
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
        {/* Select all shortcut */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={() => {
                const allOn = AUTO_APPROVE_OPTION_IDS.every((id) => approvalGates[id]);
                const next: Record<string, boolean> = {};
                for (const id of AUTO_APPROVE_OPTION_IDS) next[id] = !allOn;
                onApprovalGatesChange(next);
              }}
              disabled={isSubmitting}
              className={cn(
                'text-muted-foreground hover:text-foreground cursor-pointer rounded px-1.5 py-0.5 text-[10px] font-semibold tracking-wider uppercase transition-colors',
                AUTO_APPROVE_OPTION_IDS.every((id) => approvalGates[id]) && 'text-primary'
              )}
            >
              {t('createDrawer.all')}
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom">{t('createDrawer.toggleAllApprovalGates')}</TooltipContent>
        </Tooltip>
      </div>

      {/* Evidence row */}
      <div className="border-input flex items-center gap-4 rounded-md border px-3 py-2.5">
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="text-muted-foreground w-16 shrink-0 cursor-default text-xs font-semibold tracking-wider">
              {t('createDrawer.evidence')}
            </span>
          </TooltipTrigger>
          <TooltipContent side="bottom">{t('createDrawer.evidenceDescription')}</TooltipContent>
        </Tooltip>
        <div className="flex flex-1 items-center gap-4">
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex cursor-pointer items-center gap-1.5">
                <Switch
                  id="enable-evidence"
                  size="sm"
                  checked={enableEvidence}
                  onCheckedChange={(v) => {
                    onEnableEvidenceChange(v);
                    if (!v) onCommitEvidenceChange(false);
                  }}
                  disabled={isSubmitting}
                />
                <Label htmlFor="enable-evidence" className="cursor-pointer text-xs font-medium">
                  {t('createDrawer.collect')}
                </Label>
              </div>
            </TooltipTrigger>
            <TooltipContent side="bottom">{t('createDrawer.collectDescription')}</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex cursor-pointer items-center gap-1.5">
                <Switch
                  id="commit-evidence"
                  size="sm"
                  checked={commitEvidence}
                  onCheckedChange={onCommitEvidenceChange}
                  disabled={isSubmitting || !enableEvidence || (!openPr && !forkAndPr)}
                />
                <Label
                  htmlFor="commit-evidence"
                  className={cn(
                    'cursor-pointer text-xs font-medium',
                    (!enableEvidence || (!openPr && !forkAndPr)) && 'opacity-50'
                  )}
                >
                  {t('createDrawer.addToPr')}
                </Label>
              </div>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              {!openPr && !forkAndPr
                ? t('createDrawer.requiresPr')
                : !enableEvidence
                  ? t('createDrawer.requiresEvidence')
                  : t('createDrawer.addToPrDescription')}
            </TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* Git row */}
      <div className="border-input flex items-start gap-4 rounded-md border px-3 py-2.5">
        <span className="text-muted-foreground w-16 shrink-0 pt-0.5 text-xs font-semibold tracking-wider">
          {t('createDrawer.git')}
        </span>
        <div className="flex flex-1 flex-wrap items-center gap-4">
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex cursor-pointer items-center gap-1.5">
                <Switch
                  id="push"
                  size="sm"
                  checked={computedPush}
                  onCheckedChange={(v) => {
                    onPushChange(v);
                    if (!v && openPr) onOpenPrChange(false);
                  }}
                  disabled={isSubmitting || forkAndPr}
                />
                <Label
                  htmlFor="push"
                  className={cn('cursor-pointer text-xs font-medium', forkAndPr && 'opacity-50')}
                >
                  {t('createDrawer.push')}
                </Label>
              </div>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              {forkAndPr ? 'Enabled — contributing to upstream' : t('createDrawer.pushDescription')}
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex cursor-pointer items-center gap-1.5">
                <Switch
                  id="open-pr"
                  size="sm"
                  checked={computedOpenPr}
                  onCheckedChange={(v) => {
                    onOpenPrChange(v);
                    if (!v) onCommitEvidenceChange(false);
                  }}
                  disabled={isSubmitting || forkAndPr}
                />
                <Label
                  htmlFor="open-pr"
                  className={cn('cursor-pointer text-xs font-medium', forkAndPr && 'opacity-50')}
                >
                  {t('createDrawer.pr')}
                </Label>
              </div>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              {forkAndPr ? 'Enabled — contributing to upstream' : t('createDrawer.prDescription')}
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex cursor-pointer items-center gap-1.5">
                <Switch
                  id="ci-watch"
                  size="sm"
                  checked={ciWatchEnabled}
                  onCheckedChange={onCiWatchChange}
                  disabled={isSubmitting}
                />
                <Label htmlFor="ci-watch" className="cursor-pointer text-xs font-medium">
                  {t('createDrawer.watch')}
                </Label>
              </div>
            </TooltipTrigger>
            <TooltipContent side="bottom">{t('createDrawer.watchDescription')}</TooltipContent>
          </Tooltip>
          {/* Separator between standard git and repo options */}
          <div className="bg-border h-4 w-px shrink-0" />
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex cursor-pointer items-center gap-1.5">
                <Switch
                  id="rebase-before-branch"
                  size="sm"
                  checked={rebaseBeforeBranch}
                  onCheckedChange={onRebaseBeforeBranchChange}
                  disabled={isSubmitting}
                />
                <Label
                  htmlFor="rebase-before-branch"
                  className="flex cursor-pointer items-center gap-1 text-xs font-medium"
                >
                  <RefreshCw className="h-3 w-3" />
                  {t('createDrawer.sync')}
                </Label>
              </div>
            </TooltipTrigger>
            <TooltipContent side="bottom">{t('createDrawer.syncDescription')}</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex cursor-pointer items-center gap-1.5">
                <Switch
                  id="commit-specs"
                  size="sm"
                  checked={commitSpecs}
                  onCheckedChange={onCommitSpecsChange}
                  disabled={isSubmitting}
                />
                <Label
                  htmlFor="commit-specs"
                  className="flex cursor-pointer items-center gap-1 text-xs font-medium"
                >
                  <FileText className="h-3 w-3" />
                  {t('createDrawer.commitSpecs')}
                </Label>
              </div>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              {t('createDrawer.commitSpecsDescription')}
            </TooltipContent>
          </Tooltip>
          {!canPush && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex cursor-pointer items-center gap-1.5">
                  <Switch
                    id="fork-and-pr"
                    size="sm"
                    checked={forkAndPr}
                    onCheckedChange={(v) => {
                      onForkAndPrChange(v);
                      // Auto-flip commitSpecs to false when enabling contribute mode
                      if (v) onCommitSpecsChange(false);
                    }}
                    disabled={isSubmitting}
                  />
                  <Label
                    htmlFor="fork-and-pr"
                    className="flex cursor-pointer items-center gap-1 text-xs font-medium"
                  >
                    <GitFork className="h-3 w-3" />
                    {t('createDrawer.forkAndPr')}
                  </Label>
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                {t('createDrawer.forkAndPrDescription')}
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>

      {/* Permission mode row */}
      {agentType && onPermissionModeChange ? (
        <PermissionModeRow
          agentType={agentType}
          permissionMode={permissionMode}
          onPermissionModeChange={onPermissionModeChange}
          isSubmitting={isSubmitting}
        />
      ) : null}
    </div>
  );
}

/** Internal sub-component for the permission mode select in the workflow options row. */
function PermissionModeRow({
  agentType,
  permissionMode,
  onPermissionModeChange,
  isSubmitting,
}: {
  agentType: string;
  permissionMode: string | undefined;
  onPermissionModeChange: (mode: string | undefined) => void;
  isSubmitting: boolean;
}) {
  const { t } = useTranslation('web');
  const [options, setOptions] = useState<PermissionOption[]>([]);

  useEffect(() => {
    let cancelled = false;
    getAgentPermissionOptions(agentType).then((opts) => {
      if (!cancelled) setOptions(opts);
    });
    return () => {
      cancelled = true;
    };
  }, [agentType]);

  if (options.length === 0) return null;

  return (
    <div className="border-input flex items-center gap-4 rounded-md border px-3 py-2.5">
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="text-muted-foreground flex w-16 shrink-0 cursor-default items-center gap-1 text-xs font-semibold tracking-wider">
            <Shield className="h-3 w-3" />
            {t('feature.create.permissionMode')}
          </span>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          {t('settings.agent.permissions.description', { agent: agentType })}
        </TooltipContent>
      </Tooltip>
      <div className="flex-1">
        <Select
          value={permissionMode ?? '__default__'}
          onValueChange={(v) => onPermissionModeChange(v === '__default__' ? undefined : v)}
          disabled={isSubmitting}
        >
          <SelectTrigger
            id="permission-mode"
            data-testid="permission-mode-select"
            className="h-7 text-xs"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__default__">{t('feature.create.permissionModeDefault')}</SelectItem>
            {options.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
