'use client';

import { Database } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { SettingsSection, SettingsRow } from './settings-section-utils';

export interface DatabaseSettingsSectionProps {
  shipitAiHome: string;
  dbFileSize: string;
}

export function DatabaseSettingsSection({
  shipitAiHome,
  dbFileSize,
}: DatabaseSettingsSectionProps) {
  const { t } = useTranslation('web');

  return (
    <SettingsSection
      icon={Database}
      title={t('settings.database.title')}
      description={t('settings.database.sectionDescription')}
      testId="database-settings-section"
      tooltip={t('settings.database.hint')}
      tooltipLinks={[
        {
          label: t('settings.database.links.settingsService'),
          href: 'https://github.com/jrmatherly/shipit/blob/main/docs/architecture/settings-service.md',
        },
        {
          label: t('settings.database.links.settingsSpec'),
          href: 'https://github.com/jrmatherly/shipit/blob/main/specs/005-global-settings-service/spec.md',
        },
      ]}
    >
      <SettingsRow
        label={t('settings.database.location')}
        description={t('settings.database.locationDescription')}
        tooltip="The directory where ShipIT stores its SQLite database, logs, and configuration files. Change this via the SHIPIT_AI_HOME environment variable."
      >
        <span
          className="text-muted-foreground max-w-50 truncate font-mono text-xs"
          data-testid="shipit-ai-home-path"
        >
          {shipitAiHome}
        </span>
      </SettingsRow>
      <SettingsRow
        label={t('settings.database.size')}
        tooltip="Current size of the SQLite database file on disk. Large databases may slow down startup; consider archiving old features if this grows significantly."
      >
        <span className="text-muted-foreground text-xs" data-testid="db-file-size">
          {dbFileSize}
        </span>
      </SettingsRow>
    </SettingsSection>
  );
}
