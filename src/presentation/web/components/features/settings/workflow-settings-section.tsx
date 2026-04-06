'use client';

import { useState, useTransition } from 'react';
import { GitBranch } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { updateSettingsAction } from '@/app/actions/update-settings';
import type { Settings } from '@shipit-ai/core/domain/generated/output';
import {
  SettingsSection,
  SettingsRow,
  SwitchRow,
  NumberStepper,
  SubsectionLabel,
} from './settings-section-utils';

export interface WorkflowSettingsSectionProps {
  settings: Settings;
}

function buildWorkflowPayload(
  state: {
    openPr: boolean;
    pushOnComplete: boolean;
    allowPrd: boolean;
    allowPlan: boolean;
    allowMerge: boolean;
    enableEvidence: boolean;
    commitEvidence: boolean;
    ciWatchEnabled: boolean;
    defaultFastMode: boolean;
    autoArchiveEnabled: boolean;
    autoArchiveDelay: string;
  },
  overrides: {
    openPr?: boolean;
    pushOnComplete?: boolean;
    allowPrd?: boolean;
    allowPlan?: boolean;
    allowMerge?: boolean;
    enableEvidence?: boolean;
    commitEvidence?: boolean;
    ciWatchEnabled?: boolean;
    defaultFastMode?: boolean;
    autoArchiveEnabled?: boolean;
    autoArchiveDelay?: string;
  } = {}
) {
  const archiveEnabled = overrides.autoArchiveEnabled ?? state.autoArchiveEnabled;
  const archiveDelay = parseInt(overrides.autoArchiveDelay ?? state.autoArchiveDelay, 10);
  return {
    workflow: {
      openPrOnImplementationComplete: overrides.openPr ?? state.openPr,
      approvalGateDefaults: {
        pushOnImplementationComplete: overrides.pushOnComplete ?? state.pushOnComplete,
        allowPrd: overrides.allowPrd ?? state.allowPrd,
        allowPlan: overrides.allowPlan ?? state.allowPlan,
        allowMerge: overrides.allowMerge ?? state.allowMerge,
      },
      enableEvidence: overrides.enableEvidence ?? state.enableEvidence,
      commitEvidence: overrides.commitEvidence ?? state.commitEvidence,
      ciWatchEnabled: overrides.ciWatchEnabled ?? state.ciWatchEnabled,
      defaultFastMode: overrides.defaultFastMode ?? state.defaultFastMode,
      autoArchiveDelayMinutes: archiveEnabled
        ? Number.isNaN(archiveDelay) || archiveDelay < 1
          ? 10
          : archiveDelay
        : 0,
    },
  };
}

export function WorkflowSettingsSection({ settings }: WorkflowSettingsSectionProps) {
  const { t } = useTranslation('web');
  const [, startTransition] = useTransition();

  const [openPr, setOpenPr] = useState(settings.workflow.openPrOnImplementationComplete);
  const [pushOnComplete, setPushOnComplete] = useState(
    settings.workflow.approvalGateDefaults.pushOnImplementationComplete
  );
  const [allowPrd, setAllowPrd] = useState(settings.workflow.approvalGateDefaults.allowPrd);
  const [allowPlan, setAllowPlan] = useState(settings.workflow.approvalGateDefaults.allowPlan);
  const [allowMerge, setAllowMerge] = useState(settings.workflow.approvalGateDefaults.allowMerge);
  const [enableEvidence, setEnableEvidence] = useState(settings.workflow.enableEvidence);
  const [commitEvidence, setCommitEvidence] = useState(settings.workflow.commitEvidence);
  const [ciWatchEnabled, setCiWatchEnabled] = useState(settings.workflow.ciWatchEnabled !== false);
  const [defaultFastMode, setDefaultFastMode] = useState(
    settings.workflow.defaultFastMode !== false
  );
  const [autoArchiveEnabled, setAutoArchiveEnabled] = useState(
    (settings.workflow.autoArchiveDelayMinutes ?? 10) > 0
  );
  const [autoArchiveDelay, setAutoArchiveDelay] = useState(
    String(settings.workflow.autoArchiveDelayMinutes ?? 10)
  );

  function getState() {
    return {
      openPr,
      pushOnComplete,
      allowPrd,
      allowPlan,
      allowMerge,
      enableEvidence,
      commitEvidence,
      ciWatchEnabled,
      defaultFastMode,
      autoArchiveEnabled,
      autoArchiveDelay,
    };
  }

  function save(payload: Record<string, unknown>) {
    startTransition(async () => {
      const result = await updateSettingsAction(payload);
      if (!result.success) {
        toast.error(result.error ?? t('settings.failedToSave'));
      }
    });
  }

  return (
    <SettingsSection
      icon={GitBranch}
      title={t('settings.workflow.title')}
      description={t('settings.workflow.sectionDescription')}
      testId="workflow-settings-section"
      tooltip={t('settings.workflow.hint')}
      tooltipLinks={[
        {
          label: t('settings.workflow.links.approvalGates'),
          href: 'https://github.com/jrmatherly/shipit/blob/main/specs/016-hitl-approval-gates/spec.yaml',
        },
        {
          label: t('settings.workflow.links.pushAndPrFlags'),
          href: 'https://github.com/jrmatherly/shipit/blob/main/specs/037-feature-pr-push-flags/spec.yaml',
        },
      ]}
    >
      <SwitchRow
        label={t('settings.workflow.defaultFastMode')}
        description={t('settings.workflow.defaultFastModeDescription')}
        tooltip="When enabled, new features skip the PRD and Plan phases and go straight to implementation. Useful for quick fixes, risky for complex features."
        id="default-fast-mode"
        testId="switch-default-fast-mode"
        checked={defaultFastMode}
        onChange={(v) => {
          setDefaultFastMode(v);
          save(buildWorkflowPayload(getState(), { defaultFastMode: v }));
        }}
      />
      <SubsectionLabel>{t('settings.workflow.subsections.approve')}</SubsectionLabel>
      <SwitchRow
        label={t('settings.workflow.autoApprovePrd')}
        description={t('settings.workflow.autoApprovePrdDescription')}
        tooltip="Automatically approves the requirements document without pausing for your review. Saves time but you lose the chance to refine requirements before planning."
        id="allow-prd"
        testId="switch-allow-prd"
        checked={allowPrd}
        onChange={(v) => {
          setAllowPrd(v);
          save(buildWorkflowPayload(getState(), { allowPrd: v }));
        }}
      />
      <SwitchRow
        label={t('settings.workflow.autoApprovePlan')}
        description={t('settings.workflow.autoApprovePlanDescription')}
        tooltip="Automatically approves the implementation plan. The agent proceeds to coding without waiting for your plan review."
        id="allow-plan"
        testId="switch-allow-plan"
        checked={allowPlan}
        onChange={(v) => {
          setAllowPlan(v);
          save(buildWorkflowPayload(getState(), { allowPlan: v }));
        }}
      />
      <SwitchRow
        label={t('settings.workflow.autoApproveMerge')}
        description={t('settings.workflow.autoApproveMergeDescription')}
        tooltip="Automatically merges the PR after implementation without requiring your final review. Use with caution on production branches."
        id="allow-merge"
        testId="switch-allow-merge"
        checked={allowMerge}
        onChange={(v) => {
          setAllowMerge(v);
          save(buildWorkflowPayload(getState(), { allowMerge: v }));
        }}
      />
      <SubsectionLabel>{t('settings.workflow.subsections.evidence')}</SubsectionLabel>
      <SwitchRow
        label={t('settings.workflow.collectEvidence')}
        description={t('settings.workflow.collectEvidenceDescription')}
        tooltip="Captures screenshots and test outputs during implementation as proof of work. Useful for audit trails and PR documentation."
        id="enable-evidence"
        testId="switch-enable-evidence"
        checked={enableEvidence}
        onChange={(v) => {
          setEnableEvidence(v);
          if (!v) {
            setCommitEvidence(false);
            save(buildWorkflowPayload(getState(), { enableEvidence: v, commitEvidence: false }));
          } else {
            save(buildWorkflowPayload(getState(), { enableEvidence: v }));
          }
        }}
      />
      <SwitchRow
        label={t('settings.workflow.addEvidenceToPr')}
        description={t('settings.workflow.addEvidenceToPrDescription')}
        tooltip="Attaches collected evidence artifacts (screenshots, logs) directly to the pull request description."
        id="commit-evidence"
        testId="switch-commit-evidence"
        checked={commitEvidence}
        disabled={!enableEvidence || !openPr}
        onChange={(v) => {
          setCommitEvidence(v);
          save(buildWorkflowPayload(getState(), { commitEvidence: v }));
        }}
      />
      <SubsectionLabel>{t('settings.workflow.subsections.git')}</SubsectionLabel>
      <SwitchRow
        label={t('settings.workflow.pushOnComplete')}
        description={t('settings.workflow.pushOnCompleteDescription')}
        tooltip="Automatically pushes the implementation branch to the remote repository when the agent finishes coding."
        id="push-on-complete"
        testId="switch-push-on-complete"
        checked={pushOnComplete}
        onChange={(v) => {
          setPushOnComplete(v);
          save(buildWorkflowPayload(getState(), { pushOnComplete: v }));
        }}
      />
      <SwitchRow
        label={t('settings.workflow.openPrOnComplete')}
        description={t('settings.workflow.openPrOnCompleteDescription')}
        tooltip="Creates a pull request automatically after pushing. Combined with push-on-complete, this fully automates the delivery pipeline."
        id="open-pr"
        testId="switch-open-pr"
        checked={openPr}
        onChange={(v) => {
          setOpenPr(v);
          if (!v) {
            setCommitEvidence(false);
            save(buildWorkflowPayload(getState(), { openPr: v, commitEvidence: false }));
          } else {
            save(buildWorkflowPayload(getState(), { openPr: v }));
          }
        }}
      />
      <SwitchRow
        label={t('settings.workflow.watchCiAfterPush')}
        description={t('settings.workflow.watchCiAfterPushDescription')}
        tooltip="Monitors CI/CD pipeline status after pushing and can attempt fixes if tests fail. Disable if you prefer to handle CI failures manually."
        id="ci-watch-enabled"
        testId="switch-ci-watch-enabled"
        checked={ciWatchEnabled}
        onChange={(v) => {
          setCiWatchEnabled(v);
          save(buildWorkflowPayload(getState(), { ciWatchEnabled: v }));
        }}
      />
      <SubsectionLabel>Archive</SubsectionLabel>
      <SwitchRow
        label="Auto-archive completed"
        description="Automatically archive features after they reach the completed state"
        tooltip="Automatically archives features from the control center canvas after they reach the completed state, keeping the board clean."
        id="auto-archive-enabled"
        testId="switch-auto-archive-enabled"
        checked={autoArchiveEnabled}
        onChange={(v) => {
          setAutoArchiveEnabled(v);
          save(buildWorkflowPayload(getState(), { autoArchiveEnabled: v }));
        }}
      />
      <SettingsRow
        label="Archive delay"
        description="Minutes to wait after completion before archiving (1-1440)"
        tooltip="How long to wait after a feature completes before archiving it. Gives you time to review results before the feature moves off the board."
        htmlFor="auto-archive-delay"
      >
        <NumberStepper
          id="auto-archive-delay"
          testId="input-auto-archive-delay"
          value={autoArchiveDelay}
          placeholder="10"
          min={1}
          max={1440}
          suffix="min"
          onChange={(v) => {
            setAutoArchiveDelay(v);
          }}
          onBlur={() => {
            if (!autoArchiveEnabled) return;
            const n = parseInt(autoArchiveDelay, 10);
            const clamped = Number.isNaN(n) ? 10 : Math.min(1440, Math.max(1, n));
            setAutoArchiveDelay(String(clamped));
            save(buildWorkflowPayload(getState(), { autoArchiveDelay: String(clamped) }));
          }}
        />
      </SettingsRow>
    </SettingsSection>
  );
}
