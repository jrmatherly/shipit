'use client';

import { useState, useTransition } from 'react';
import { LayoutGrid } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { updateSettingsAction } from '@/app/actions/update-settings';
import type { Settings, FabLayoutConfig } from '@shipit-ai/core/domain/generated/output';
import { SettingsSection, SwitchRow } from './settings-section-utils';

export interface FabLayoutSettingsSectionProps {
  settings: Settings;
}

export function FabLayoutSettingsSection({ settings }: FabLayoutSettingsSectionProps) {
  const { t } = useTranslation('web');
  const [, startTransition] = useTransition();

  const fabLayoutConfig: FabLayoutConfig = settings.fabLayout ?? { swapPosition: false };
  const [fabSwapPosition, setFabSwapPosition] = useState(fabLayoutConfig.swapPosition);

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
      icon={LayoutGrid}
      title={t('settings.fabLayout.title')}
      description={t('settings.fabLayout.description')}
      testId="fab-layout-settings-section"
    >
      <SwitchRow
        label={t('settings.fabLayout.swapPosition')}
        description={t('settings.fabLayout.swapPositionDescription')}
        id="fab-swap-position"
        testId="switch-fab-swap-position"
        checked={fabSwapPosition}
        onChange={(v) => {
          setFabSwapPosition(v);
          save({ fabLayout: { swapPosition: v } });
        }}
      />
    </SettingsSection>
  );
}
