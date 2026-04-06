'use client';

import { useState, useTransition } from 'react';
import { Bell } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { updateSettingsAction } from '@/app/actions/update-settings';
import type { Settings, NotificationPreferences } from '@shipit-ai/core/domain/generated/output';
import { SettingsSection, SwitchRow, SubsectionLabel } from './settings-section-utils';

export interface NotificationSettingsSectionProps {
  settings: Settings;
}

export function NotificationSettingsSection({ settings }: NotificationSettingsSectionProps) {
  const { t } = useTranslation('web');
  const [, startTransition] = useTransition();

  const [inApp, setInApp] = useState(settings.notifications.inApp.enabled);
  const [events, setEvents] = useState({ ...settings.notifications.events });

  function save(payload: Record<string, unknown>) {
    startTransition(async () => {
      const result = await updateSettingsAction(payload);
      if (!result.success) {
        toast.error(result.error ?? t('settings.failedToSave'));
      }
    });
  }

  function buildNotificationPayload(
    overrides: {
      inApp?: boolean;
      events?: NotificationPreferences['events'];
    } = {}
  ) {
    return {
      notifications: {
        inApp: { enabled: overrides.inApp ?? inApp },
        events: overrides.events ?? events,
      },
    };
  }

  return (
    <SettingsSection
      icon={Bell}
      title={t('settings.notifications.title')}
      description={t('settings.notifications.sectionDescription')}
      testId="notification-settings-section"
      tooltip={t('settings.notifications.hint')}
      tooltipLinks={[
        {
          label: t('settings.notifications.links.notificationSystem'),
          href: 'https://github.com/jrmatherly/shipit/blob/main/specs/021-agent-notifications/spec.yaml',
        },
      ]}
    >
      <SubsectionLabel>{t('settings.notifications.channels')}</SubsectionLabel>
      <SwitchRow
        label={t('settings.notifications.inAppLabel')}
        description={t('settings.notifications.inAppDescription')}
        tooltip="Master toggle for in-app toast notifications. When disabled, no event toasts will appear regardless of individual event settings below."
        id="notif-in-app"
        testId="switch-in-app"
        checked={inApp}
        onChange={(v) => {
          setInApp(v);
          save(buildNotificationPayload({ inApp: v }));
        }}
      />

      <SubsectionLabel>{t('settings.notifications.subsections.agentEvents')}</SubsectionLabel>
      <SwitchRow
        label={t('settings.notifications.events.agentStarted')}
        tooltip="Controls whether you receive an in-app toast notification when an agent begins working on a feature."
        id="notif-event-agentStarted"
        testId="switch-event-agentStarted"
        checked={events.agentStarted}
        onChange={(v) => {
          const newEvents = { ...events, agentStarted: v };
          setEvents(newEvents);
          save(buildNotificationPayload({ events: newEvents }));
        }}
      />
      <SwitchRow
        label={t('settings.notifications.events.phaseCompleted')}
        tooltip="Controls whether you receive an in-app toast notification when an agent completes a workflow phase (e.g., requirements, planning, implementation)."
        id="notif-event-phaseCompleted"
        testId="switch-event-phaseCompleted"
        checked={events.phaseCompleted}
        onChange={(v) => {
          const newEvents = { ...events, phaseCompleted: v };
          setEvents(newEvents);
          save(buildNotificationPayload({ events: newEvents }));
        }}
      />
      <SwitchRow
        label={t('settings.notifications.events.waitingApproval')}
        tooltip="Controls whether you receive an in-app toast notification when a feature is paused and waiting for your approval to continue."
        id="notif-event-waitingApproval"
        testId="switch-event-waitingApproval"
        checked={events.waitingApproval}
        onChange={(v) => {
          const newEvents = { ...events, waitingApproval: v };
          setEvents(newEvents);
          save(buildNotificationPayload({ events: newEvents }));
        }}
      />
      <SwitchRow
        label={t('settings.notifications.events.agentCompleted')}
        tooltip="Controls whether you receive an in-app toast notification when an agent finishes all work on a feature successfully."
        id="notif-event-agentCompleted"
        testId="switch-event-agentCompleted"
        checked={events.agentCompleted}
        onChange={(v) => {
          const newEvents = { ...events, agentCompleted: v };
          setEvents(newEvents);
          save(buildNotificationPayload({ events: newEvents }));
        }}
      />
      <SwitchRow
        label={t('settings.notifications.events.agentFailed')}
        tooltip="Controls whether you receive an in-app toast notification when an agent encounters an error and stops working on a feature."
        id="notif-event-agentFailed"
        testId="switch-event-agentFailed"
        checked={events.agentFailed}
        onChange={(v) => {
          const newEvents = { ...events, agentFailed: v };
          setEvents(newEvents);
          save(buildNotificationPayload({ events: newEvents }));
        }}
      />

      <SubsectionLabel>{t('settings.notifications.subsections.pullRequestEvents')}</SubsectionLabel>
      <SwitchRow
        label={t('settings.notifications.events.prMerged')}
        tooltip="Controls whether you receive an in-app toast notification when a feature's pull request is merged into the target branch."
        id="notif-event-prMerged"
        testId="switch-event-prMerged"
        checked={events.prMerged}
        onChange={(v) => {
          const newEvents = { ...events, prMerged: v };
          setEvents(newEvents);
          save(buildNotificationPayload({ events: newEvents }));
        }}
      />
      <SwitchRow
        label={t('settings.notifications.events.prClosed')}
        tooltip="Controls whether you receive an in-app toast notification when a feature's pull request is closed without merging."
        id="notif-event-prClosed"
        testId="switch-event-prClosed"
        checked={events.prClosed}
        onChange={(v) => {
          const newEvents = { ...events, prClosed: v };
          setEvents(newEvents);
          save(buildNotificationPayload({ events: newEvents }));
        }}
      />
      <SwitchRow
        label={t('settings.notifications.events.prChecksPassed')}
        tooltip="Controls whether you receive an in-app toast notification when all CI checks pass on a feature's pull request."
        id="notif-event-prChecksPassed"
        testId="switch-event-prChecksPassed"
        checked={events.prChecksPassed}
        onChange={(v) => {
          const newEvents = { ...events, prChecksPassed: v };
          setEvents(newEvents);
          save(buildNotificationPayload({ events: newEvents }));
        }}
      />
      <SwitchRow
        label={t('settings.notifications.events.prChecksFailed')}
        tooltip="Controls whether you receive an in-app toast notification when CI checks fail on a feature's pull request."
        id="notif-event-prChecksFailed"
        testId="switch-event-prChecksFailed"
        checked={events.prChecksFailed}
        onChange={(v) => {
          const newEvents = { ...events, prChecksFailed: v };
          setEvents(newEvents);
          save(buildNotificationPayload({ events: newEvents }));
        }}
      />
      <SwitchRow
        label={t('settings.notifications.events.prBlocked')}
        tooltip="Controls whether you receive an in-app toast notification when a pull request is blocked by merge conflicts or branch protection rules."
        id="notif-event-prBlocked"
        testId="switch-event-prBlocked"
        checked={events.prBlocked}
        onChange={(v) => {
          const newEvents = { ...events, prBlocked: v };
          setEvents(newEvents);
          save(buildNotificationPayload({ events: newEvents }));
        }}
      />
      <SwitchRow
        label={t('settings.notifications.events.mergeReviewReady')}
        tooltip="Controls whether you receive an in-app toast notification when a feature's PR passes all checks and is ready for your merge review."
        id="notif-event-mergeReviewReady"
        testId="switch-event-mergeReviewReady"
        checked={events.mergeReviewReady}
        onChange={(v) => {
          const newEvents = { ...events, mergeReviewReady: v };
          setEvents(newEvents);
          save(buildNotificationPayload({ events: newEvents }));
        }}
      />
    </SettingsSection>
  );
}
