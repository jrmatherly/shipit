'use client';

import { useState, useTransition } from 'react';
import { Timer } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { updateSettingsAction } from '@/app/actions/update-settings';
import { TimeoutSlider } from '@/components/features/settings/timeout-slider';
import type { Settings } from '@shipit-ai/core/domain/generated/output';
import { SettingsSection, SettingsRow, SubsectionLabel } from './settings-section-utils';

export interface StageTimeoutsSettingsSectionProps {
  settings: Settings;
}

export function parseOptionalInt(value: string): number | undefined {
  if (value === '') return undefined;
  const n = parseInt(value, 10);
  return Number.isNaN(n) || n <= 0 ? undefined : n;
}

export function secondsToMs(val: string | undefined): number | undefined {
  if (val === undefined) return undefined;
  const n = parseOptionalInt(val);
  return n != null ? n * 1000 : undefined;
}

export function StageTimeoutsSettingsSection({ settings }: StageTimeoutsSettingsSectionProps) {
  const { t } = useTranslation('web');
  const [, startTransition] = useTransition();

  const stageTimeoutsConfig = settings.workflow.stageTimeouts;
  const analyzeRepoConfig = settings.workflow.analyzeRepoTimeouts;

  const [analyzeTimeout, setAnalyzeTimeout] = useState(
    String(Math.round((stageTimeoutsConfig?.analyzeMs ?? 1_800_000) / 1000))
  );
  const [requirementsTimeout, setRequirementsTimeout] = useState(
    String(Math.round((stageTimeoutsConfig?.requirementsMs ?? 1_800_000) / 1000))
  );
  const [researchTimeout, setResearchTimeout] = useState(
    String(Math.round((stageTimeoutsConfig?.researchMs ?? 1_800_000) / 1000))
  );
  const [planTimeout, setPlanTimeout] = useState(
    String(Math.round((stageTimeoutsConfig?.planMs ?? 1_800_000) / 1000))
  );
  const [implementTimeout, setImplementTimeout] = useState(
    String(Math.round((stageTimeoutsConfig?.implementMs ?? 1_800_000) / 1000))
  );
  const [mergeTimeout, setMergeTimeout] = useState(
    String(Math.round((stageTimeoutsConfig?.mergeMs ?? 1_800_000) / 1000))
  );
  const [analyzeRepoTimeout, setAnalyzeRepoTimeout] = useState(
    String(Math.round((analyzeRepoConfig?.analyzeMs ?? 600_000) / 1000))
  );

  const originalAnalyzeTimeout =
    stageTimeoutsConfig?.analyzeMs != null
      ? String(Math.round(stageTimeoutsConfig.analyzeMs / 1000))
      : '';
  const originalRequirementsTimeout =
    stageTimeoutsConfig?.requirementsMs != null
      ? String(Math.round(stageTimeoutsConfig.requirementsMs / 1000))
      : '';
  const originalResearchTimeout =
    stageTimeoutsConfig?.researchMs != null
      ? String(Math.round(stageTimeoutsConfig.researchMs / 1000))
      : '';
  const originalPlanTimeout =
    stageTimeoutsConfig?.planMs != null
      ? String(Math.round(stageTimeoutsConfig.planMs / 1000))
      : '';
  const originalImplementTimeout =
    stageTimeoutsConfig?.implementMs != null
      ? String(Math.round(stageTimeoutsConfig.implementMs / 1000))
      : '';
  const originalMergeTimeout =
    stageTimeoutsConfig?.mergeMs != null
      ? String(Math.round(stageTimeoutsConfig.mergeMs / 1000))
      : '';
  const originalAnalyzeRepoTimeout =
    analyzeRepoConfig?.analyzeMs != null
      ? String(Math.round(analyzeRepoConfig.analyzeMs / 1000))
      : '';

  function buildPayload(overrides: {
    analyzeTimeout?: string;
    requirementsTimeout?: string;
    researchTimeout?: string;
    planTimeout?: string;
    implementTimeout?: string;
    mergeTimeout?: string;
    analyzeRepoTimeout?: string;
  }) {
    return {
      workflow: {
        stageTimeouts: {
          analyzeMs: secondsToMs(overrides.analyzeTimeout ?? analyzeTimeout),
          requirementsMs: secondsToMs(overrides.requirementsTimeout ?? requirementsTimeout),
          researchMs: secondsToMs(overrides.researchTimeout ?? researchTimeout),
          planMs: secondsToMs(overrides.planTimeout ?? planTimeout),
          implementMs: secondsToMs(overrides.implementTimeout ?? implementTimeout),
          mergeMs: secondsToMs(overrides.mergeTimeout ?? mergeTimeout),
        },
        analyzeRepoTimeouts: {
          analyzeMs: secondsToMs(overrides.analyzeRepoTimeout ?? analyzeRepoTimeout),
        },
      },
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
      icon={Timer}
      title={t('settings.stageTimeouts.title')}
      description={t('settings.stageTimeouts.description')}
      testId="stage-timeouts-settings-section"
      tooltip={t('settings.stageTimeouts.hint')}
    >
      <SubsectionLabel>{t('settings.stageTimeouts.subsections.featureAgent')}</SubsectionLabel>
      <SettingsRow
        label={t('settings.stageTimeouts.analyze')}
        description={t('settings.stageTimeouts.analyzeDescription')}
        htmlFor="timeout-analyze"
      >
        <TimeoutSlider
          id="timeout-analyze"
          testId="timeout-analyze-input"
          value={analyzeTimeout}
          onChange={setAnalyzeTimeout}
          onBlur={() => {
            if (analyzeTimeout !== originalAnalyzeTimeout) save(buildPayload({ analyzeTimeout }));
          }}
          defaultSeconds={1800}
        />
      </SettingsRow>
      <SettingsRow
        label={t('settings.stageTimeouts.requirements')}
        description={t('settings.stageTimeouts.requirementsDescription')}
        htmlFor="timeout-requirements"
      >
        <TimeoutSlider
          id="timeout-requirements"
          testId="timeout-requirements-input"
          value={requirementsTimeout}
          onChange={setRequirementsTimeout}
          onBlur={() => {
            if (requirementsTimeout !== originalRequirementsTimeout)
              save(buildPayload({ requirementsTimeout }));
          }}
          defaultSeconds={1800}
        />
      </SettingsRow>
      <SettingsRow
        label={t('settings.stageTimeouts.research')}
        description={t('settings.stageTimeouts.researchDescription')}
        htmlFor="timeout-research"
      >
        <TimeoutSlider
          id="timeout-research"
          testId="timeout-research-input"
          value={researchTimeout}
          onChange={setResearchTimeout}
          onBlur={() => {
            if (researchTimeout !== originalResearchTimeout)
              save(buildPayload({ researchTimeout }));
          }}
          defaultSeconds={1800}
        />
      </SettingsRow>
      <SettingsRow
        label={t('settings.stageTimeouts.plan')}
        description={t('settings.stageTimeouts.planDescription')}
        htmlFor="timeout-plan"
      >
        <TimeoutSlider
          id="timeout-plan"
          testId="timeout-plan-input"
          value={planTimeout}
          onChange={setPlanTimeout}
          onBlur={() => {
            if (planTimeout !== originalPlanTimeout) save(buildPayload({ planTimeout }));
          }}
          defaultSeconds={1800}
        />
      </SettingsRow>
      <SettingsRow
        label={t('settings.stageTimeouts.implement')}
        description={t('settings.stageTimeouts.implementDescription')}
        htmlFor="timeout-implement"
      >
        <TimeoutSlider
          id="timeout-implement"
          testId="timeout-implement-input"
          value={implementTimeout}
          onChange={setImplementTimeout}
          onBlur={() => {
            if (implementTimeout !== originalImplementTimeout)
              save(buildPayload({ implementTimeout }));
          }}
          defaultSeconds={1800}
        />
      </SettingsRow>
      <SettingsRow
        label={t('settings.stageTimeouts.merge')}
        description={t('settings.stageTimeouts.mergeDescription')}
        htmlFor="timeout-merge"
      >
        <TimeoutSlider
          id="timeout-merge"
          testId="timeout-merge-input"
          value={mergeTimeout}
          onChange={setMergeTimeout}
          onBlur={() => {
            if (mergeTimeout !== originalMergeTimeout) save(buildPayload({ mergeTimeout }));
          }}
          defaultSeconds={1800}
        />
      </SettingsRow>
      <SubsectionLabel>{t('settings.stageTimeouts.subsections.analyzeRepoAgent')}</SubsectionLabel>
      <SettingsRow
        label={t('settings.stageTimeouts.analyze')}
        description={t('settings.stageTimeouts.analyzeDescription')}
        htmlFor="timeout-analyze-repo"
      >
        <TimeoutSlider
          id="timeout-analyze-repo"
          testId="timeout-analyze-repo-input"
          value={analyzeRepoTimeout}
          onChange={setAnalyzeRepoTimeout}
          onBlur={() => {
            if (analyzeRepoTimeout !== originalAnalyzeRepoTimeout)
              save(buildPayload({ analyzeRepoTimeout }));
          }}
          defaultSeconds={600}
        />
      </SettingsRow>
    </SettingsSection>
  );
}
