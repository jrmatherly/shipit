'use client';

import { useState, useTransition } from 'react';
import { Activity } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { updateSettingsAction } from '@/app/actions/update-settings';
import type { Settings } from '@shipit-ai/core/domain/generated/output';
import { SettingsSection, SettingsRow, SwitchRow, NumberStepper } from './settings-section-utils';

export interface CiSettingsSectionProps {
  settings: Settings;
}

function parseOptionalInt(value: string): number | undefined {
  if (value === '') return undefined;
  const n = parseInt(value, 10);
  return Number.isNaN(n) || n <= 0 ? undefined : n;
}

export function CiSettingsSection({ settings }: CiSettingsSectionProps) {
  const { t } = useTranslation('web');
  const [, startTransition] = useTransition();

  const [ciMaxFix, setCiMaxFix] = useState(
    settings.workflow.ciMaxFixAttempts != null ? String(settings.workflow.ciMaxFixAttempts) : ''
  );
  const [ciTimeout, setCiTimeout] = useState(
    settings.workflow.ciWatchTimeoutMs != null
      ? String(Math.round(settings.workflow.ciWatchTimeoutMs / 1000))
      : ''
  );
  const [ciLogMax, setCiLogMax] = useState(
    settings.workflow.ciLogMaxChars != null ? String(settings.workflow.ciLogMaxChars) : ''
  );
  const [ciPollInterval, setCiPollInterval] = useState(
    settings.workflow.ciWatchPollIntervalSeconds != null
      ? String(settings.workflow.ciWatchPollIntervalSeconds)
      : ''
  );
  const [hideCiStatus, setHideCiStatus] = useState(settings.workflow.hideCiStatus !== false);

  const originalCiMaxFix =
    settings.workflow.ciMaxFixAttempts != null ? String(settings.workflow.ciMaxFixAttempts) : '';
  const originalCiTimeout =
    settings.workflow.ciWatchTimeoutMs != null
      ? String(Math.round(settings.workflow.ciWatchTimeoutMs / 1000))
      : '';
  const originalCiLogMax =
    settings.workflow.ciLogMaxChars != null ? String(settings.workflow.ciLogMaxChars) : '';
  const originalCiPollInterval =
    settings.workflow.ciWatchPollIntervalSeconds != null
      ? String(settings.workflow.ciWatchPollIntervalSeconds)
      : '';

  function save(payload: Record<string, unknown>) {
    startTransition(async () => {
      const result = await updateSettingsAction(payload);
      if (!result.success) {
        toast.error(result.error ?? t('settings.failedToSave'));
      }
    });
  }

  function buildPayload(overrides: {
    ciMaxFix?: string;
    ciTimeout?: string;
    ciLogMax?: string;
    ciPollInterval?: string;
    hideCiStatus?: boolean;
  }) {
    const timeoutSeconds = parseOptionalInt(overrides.ciTimeout ?? ciTimeout);
    return {
      workflow: {
        ciMaxFixAttempts: parseOptionalInt(overrides.ciMaxFix ?? ciMaxFix),
        ciWatchTimeoutMs: timeoutSeconds != null ? timeoutSeconds * 1000 : undefined,
        ciLogMaxChars: parseOptionalInt(overrides.ciLogMax ?? ciLogMax),
        ciWatchPollIntervalSeconds: parseOptionalInt(overrides.ciPollInterval ?? ciPollInterval),
        hideCiStatus: overrides.hideCiStatus ?? hideCiStatus,
      },
    };
  }

  return (
    <SettingsSection
      icon={Activity}
      title={t('settings.ci.title')}
      description={t('settings.ci.description')}
      testId="ci-settings-section"
    >
      <SettingsRow
        label={t('settings.ci.maxFixAttempts')}
        description={t('settings.ci.maxFixAttemptsDescription')}
        htmlFor="ci-max-fix"
      >
        <NumberStepper
          id="ci-max-fix"
          testId="ci-max-fix-input"
          placeholder="3"
          value={ciMaxFix}
          onChange={setCiMaxFix}
          onBlur={() => {
            if (ciMaxFix !== originalCiMaxFix) save(buildPayload({ ciMaxFix }));
          }}
          min={1}
          max={10}
        />
      </SettingsRow>
      <SettingsRow
        label={t('settings.ci.watchTimeout')}
        description={t('settings.ci.watchTimeoutDescription')}
        htmlFor="ci-timeout"
      >
        <NumberStepper
          id="ci-timeout"
          testId="ci-timeout-input"
          placeholder="300"
          value={ciTimeout}
          onChange={setCiTimeout}
          onBlur={() => {
            if (ciTimeout !== originalCiTimeout) save(buildPayload({ ciTimeout }));
          }}
          min={30}
          step={30}
          suffix="sec"
        />
      </SettingsRow>
      <SettingsRow
        label={t('settings.ci.maxLogSize')}
        description={t('settings.ci.maxLogSizeDescription')}
        htmlFor="ci-log-max"
      >
        <NumberStepper
          id="ci-log-max"
          testId="ci-log-max-input"
          placeholder="50000"
          value={ciLogMax}
          onChange={setCiLogMax}
          onBlur={() => {
            if (ciLogMax !== originalCiLogMax) save(buildPayload({ ciLogMax }));
          }}
          min={1000}
          step={5000}
          suffix="chars"
        />
      </SettingsRow>
      <SettingsRow
        label={t('settings.ci.pollInterval')}
        description={t('settings.ci.pollIntervalDescription')}
        htmlFor="ci-poll-interval"
      >
        <NumberStepper
          id="ci-poll-interval"
          testId="ci-poll-interval-input"
          placeholder="30"
          value={ciPollInterval}
          onChange={setCiPollInterval}
          onBlur={() => {
            if (ciPollInterval !== originalCiPollInterval) save(buildPayload({ ciPollInterval }));
          }}
          min={5}
          step={5}
          suffix="sec"
        />
      </SettingsRow>
      <SwitchRow
        label={t('settings.ci.hideCiStatus')}
        description={t('settings.ci.hideCiStatusDescription')}
        id="hide-ci-status"
        testId="switch-hide-ci-status"
        checked={hideCiStatus}
        onChange={(v) => {
          setHideCiStatus(v);
          save(buildPayload({ hideCiStatus: v }));
        }}
      />
    </SettingsSection>
  );
}
