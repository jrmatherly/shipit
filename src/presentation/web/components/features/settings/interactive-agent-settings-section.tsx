'use client';

import { useState, useTransition } from 'react';
import { MessageSquare } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { updateSettingsAction } from '@/app/actions/update-settings';
import type { Settings, InteractiveAgentConfig } from '@shipit-ai/core/domain/generated/output';
import { SettingsSection, SettingsRow, SwitchRow, NumberStepper } from './settings-section-utils';

export interface InteractiveAgentSettingsSectionProps {
  settings: Settings;
}

export function InteractiveAgentSettingsSection({
  settings,
}: InteractiveAgentSettingsSectionProps) {
  const { t } = useTranslation('web');
  const [, startTransition] = useTransition();

  const interactiveAgentConfig: InteractiveAgentConfig = settings.interactiveAgent ?? {
    enabled: true,
    autoTimeoutMinutes: 15,
    maxConcurrentSessions: 3,
  };

  const [interactiveEnabled, setInteractiveEnabled] = useState(interactiveAgentConfig.enabled);
  const [interactiveTimeout, setInteractiveTimeout] = useState(
    String(interactiveAgentConfig.autoTimeoutMinutes)
  );
  const [interactiveSessions, setInteractiveSessions] = useState(
    String(interactiveAgentConfig.maxConcurrentSessions)
  );

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
      icon={MessageSquare}
      title={t('settings.interactiveAgent.title')}
      description={t('settings.interactiveAgent.description')}
      testId="interactive-agent-settings-section"
    >
      <SwitchRow
        label={t('settings.interactiveAgent.enableChatTab')}
        description={t('settings.interactiveAgent.enableChatTabDescription')}
        id="interactive-agent-enabled"
        testId="switch-interactive-agent-enabled"
        checked={interactiveEnabled}
        onChange={(v) => {
          setInteractiveEnabled(v);
          save({
            interactiveAgent: {
              enabled: v,
              autoTimeoutMinutes: parseInt(interactiveTimeout, 10) || 15,
              maxConcurrentSessions: parseInt(interactiveSessions, 10) || 3,
            },
          });
        }}
      />
      <SettingsRow
        label={t('settings.interactiveAgent.autoTimeout')}
        description={t('settings.interactiveAgent.autoTimeoutDescription')}
        htmlFor="interactive-agent-timeout"
      >
        <NumberStepper
          id="interactive-agent-timeout"
          testId="input-interactive-agent-timeout"
          value={interactiveTimeout}
          placeholder="15"
          min={1}
          max={120}
          suffix="min"
          onChange={setInteractiveTimeout}
          onBlur={() => {
            const n = parseInt(interactiveTimeout, 10);
            const clamped = Number.isNaN(n) ? 15 : Math.min(120, Math.max(1, n));
            const clampedStr = String(clamped);
            setInteractiveTimeout(clampedStr);
            save({
              interactiveAgent: {
                enabled: interactiveEnabled,
                autoTimeoutMinutes: clamped,
                maxConcurrentSessions: parseInt(interactiveSessions, 10) || 3,
              },
            });
          }}
        />
      </SettingsRow>
      <SettingsRow
        label={t('settings.interactiveAgent.maxConcurrentSessions')}
        description={t('settings.interactiveAgent.maxConcurrentSessionsDescription')}
        htmlFor="interactive-agent-sessions"
      >
        <NumberStepper
          id="interactive-agent-sessions"
          testId="input-interactive-agent-sessions"
          value={interactiveSessions}
          placeholder="3"
          min={1}
          max={10}
          onChange={setInteractiveSessions}
          onBlur={() => {
            const n = parseInt(interactiveSessions, 10);
            const clamped = Number.isNaN(n) ? 3 : Math.min(10, Math.max(1, n));
            const clampedStr = String(clamped);
            setInteractiveSessions(clampedStr);
            save({
              interactiveAgent: {
                enabled: interactiveEnabled,
                autoTimeoutMinutes: parseInt(interactiveTimeout, 10) || 15,
                maxConcurrentSessions: clamped,
              },
            });
          }}
        />
      </SettingsRow>
    </SettingsSection>
  );
}
