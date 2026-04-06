'use client';

import { useState } from 'react';
import { Bot } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { Settings, AgentType } from '@shipit-ai/core/domain/generated/output';
import { AgentModelPicker } from '@/components/features/settings/AgentModelPicker';
import { SettingsSection, SettingsRow } from './settings-section-utils';

export interface AgentSettingsSectionProps {
  settings: Settings;
}

export function AgentSettingsSection({ settings }: AgentSettingsSectionProps) {
  const { t } = useTranslation('web');
  const [agentType, setAgentType] = useState(settings.agent.type);

  return (
    <SettingsSection
      icon={Bot}
      title={t('settings.agent.sectionTitle')}
      description={t('settings.agent.sectionDescription')}
      testId="agent-settings-section"
      tooltip={t('settings.agent.hint')}
      tooltipLinks={[
        {
          label: t('settings.agent.links.agentSystem'),
          href: 'https://github.com/jrmatherly/shipit/blob/main/docs/architecture/agent-system.md',
        },
        {
          label: t('settings.agent.links.addingAgents'),
          href: 'https://github.com/jrmatherly/shipit/blob/main/docs/development/adding-agents.md',
        },
        {
          label: t('settings.agent.links.configurationGuide'),
          href: 'https://github.com/jrmatherly/shipit/blob/main/docs/guides/configuration.md',
        },
      ]}
    >
      <SettingsRow
        label={t('settings.agent.agentAndModel')}
        description={t('settings.agent.agentAndModelDescription')}
        tooltip="Changing the agent switches which AI CLI tool runs your features. Each agent has different capabilities, speed, and cost tradeoffs."
        htmlFor="agent-model-picker"
      >
        <AgentModelPicker
          initialAgentType={agentType}
          initialModel={settings.models.default}
          mode="settings"
          onAgentModelChange={(newAgent) => setAgentType(newAgent as AgentType)}
          className="w-55"
        />
      </SettingsRow>
    </SettingsSection>
  );
}
