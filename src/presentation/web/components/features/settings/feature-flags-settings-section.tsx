'use client';

import { useState, useTransition } from 'react';
import { Flag } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { updateSettingsAction } from '@/app/actions/update-settings';
import type { Settings, FeatureFlags } from '@shipit-ai/core/domain/generated/output';
import { SettingsSection, SwitchRow } from './settings-section-utils';

export interface FeatureFlagsSettingsSectionProps {
  settings: Settings;
}

export function FeatureFlagsSettingsSection({ settings }: FeatureFlagsSettingsSectionProps) {
  const { t } = useTranslation('web');
  const [, startTransition] = useTransition();

  const featureFlags = settings.featureFlags ?? {
    skills: false,
    envDeploy: false,
    debug: false,
    githubImport: false,
    adoptBranch: false,
    gitRebaseSync: false,
    reactFileManager: false,
    plugins: false,
    mcpServers: false,
  };

  const [flags, setFlags] = useState<FeatureFlags>({ ...featureFlags });

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
      icon={Flag}
      title={t('settings.featureFlags.title')}
      description={t('settings.featureFlags.sectionDescription')}
      badge={t('settings.featureFlags.badge')}
      testId="feature-flags-settings-section"
      tooltip={t('settings.featureFlags.hint')}
    >
      <SwitchRow
        label={t('settings.featureFlags.skills')}
        description={t('settings.featureFlags.skillsDescription')}
        tooltip="Enables the Skills page in the sidebar for browsing and managing Claude Code skills."
        id="flag-skills"
        testId="switch-flag-skills"
        checked={flags.skills}
        onChange={(v) => {
          const newFlags = { ...flags, skills: v };
          setFlags(newFlags);
          save({ featureFlags: newFlags });
        }}
      />
      <SwitchRow
        label={t('settings.featureFlags.deployments')}
        description={t('settings.featureFlags.deploymentsDescription')}
        tooltip="Enables experimental deployment features for environment management."
        id="flag-envDeploy"
        testId="switch-flag-envDeploy"
        checked={flags.envDeploy}
        onChange={(v) => {
          const newFlags = { ...flags, envDeploy: v };
          setFlags(newFlags);
          save({ featureFlags: newFlags });
        }}
      />
      <SwitchRow
        label={t('settings.featureFlags.debug')}
        description={t('settings.featureFlags.debugDescription')}
        tooltip="Shows additional debugging information in the UI for troubleshooting."
        id="flag-debug"
        testId="switch-flag-debug"
        checked={flags.debug}
        onChange={(v) => {
          const newFlags = { ...flags, debug: v };
          setFlags(newFlags);
          save({ featureFlags: newFlags });
        }}
      />
      <SwitchRow
        label={t('settings.featureFlags.githubImport')}
        description={t('settings.featureFlags.githubImportDescription')}
        tooltip="Enables importing repositories directly from GitHub."
        id="flag-githubImport"
        testId="switch-flag-githubImport"
        checked={flags.githubImport}
        onChange={(v) => {
          const newFlags = { ...flags, githubImport: v };
          setFlags(newFlags);
          save({ featureFlags: newFlags });
        }}
      />
      <SwitchRow
        label={t('settings.featureFlags.adoptBranch')}
        description={t('settings.featureFlags.adoptBranchDescription')}
        tooltip="Enables adopting existing git branches as ShipIT features."
        id="flag-adoptBranch"
        testId="switch-flag-adoptBranch"
        checked={flags.adoptBranch}
        onChange={(v) => {
          const newFlags = { ...flags, adoptBranch: v };
          setFlags(newFlags);
          save({ featureFlags: newFlags });
        }}
      />
      <SwitchRow
        label={t('settings.featureFlags.gitRebaseSync')}
        description={t('settings.featureFlags.gitRebaseSyncDescription')}
        tooltip="Uses git rebase instead of merge when syncing feature branches with the upstream branch."
        id="flag-gitRebaseSync"
        testId="switch-flag-gitRebaseSync"
        checked={flags.gitRebaseSync}
        onChange={(v) => {
          const newFlags = { ...flags, gitRebaseSync: v };
          setFlags(newFlags);
          save({ featureFlags: newFlags });
        }}
      />
      <SwitchRow
        label={t('settings.featureFlags.reactFileManager')}
        description={t('settings.featureFlags.reactFileManagerDescription')}
        tooltip="Replaces the native file picker dialog with a React-based file browser for selecting project folders."
        id="flag-reactFileManager"
        testId="switch-flag-reactFileManager"
        checked={flags.reactFileManager}
        onChange={(v) => {
          const newFlags = { ...flags, reactFileManager: v };
          setFlags(newFlags);
          save({ featureFlags: newFlags });
        }}
      />
      <SwitchRow
        label={t('settings.featureFlags.plugins')}
        description={
          settings.litellmProxy?.baseUrl
            ? t('settings.featureFlags.pluginsDescription')
            : `${t('settings.featureFlags.pluginsDescription')} — ${t('plugins.noProxy')}`
        }
        tooltip="Enables the Plugins page for browsing and managing Claude Code plugins from a LiteLLM marketplace. Requires a LiteLLM proxy URL to be configured."
        id="flag-plugins"
        testId="switch-flag-plugins"
        checked={flags.plugins}
        disabled={!settings.litellmProxy?.baseUrl}
        onChange={(v) => {
          const newFlags = { ...flags, plugins: v };
          setFlags(newFlags);
          save({ featureFlags: newFlags });
        }}
      />
    </SettingsSection>
  );
}
