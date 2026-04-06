'use client';

import { useState, useTransition } from 'react';
import { Route } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { updateSettingsAction } from '@/app/actions/update-settings';
import type { Settings } from '@shipit-ai/core/domain/generated/output';
import { LiteLLMProxyRoutingMode } from '@shipit-ai/core/domain/generated/output';
import { SettingsSection, SettingsRow } from './settings-section-utils';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export interface LiteLLMProxyRoutingSectionProps {
  settings: Settings;
}

export function LiteLLMProxyRoutingSection({ settings }: LiteLLMProxyRoutingSectionProps) {
  const { t } = useTranslation('web');
  const [, startTransition] = useTransition();

  const cc = settings.litellmProxy?.claudeCode;
  const [routingMode, setRoutingMode] = useState<string>(
    cc?.routingMode ?? LiteLLMProxyRoutingMode.direct
  );
  const [customHeaders, setCustomHeaders] = useState(cc?.customHeaders ?? '');
  const [sonnetModel, setSonnetModel] = useState(cc?.sonnetModel ?? '');
  const [haikuModel, setHaikuModel] = useState(cc?.haikuModel ?? '');
  const [opusModel, setOpusModel] = useState(cc?.opusModel ?? '');

  const originalCustomHeaders = cc?.customHeaders ?? '';
  const originalSonnetModel = cc?.sonnetModel ?? '';
  const originalHaikuModel = cc?.haikuModel ?? '';
  const originalOpusModel = cc?.opusModel ?? '';

  const showProxyFields = routingMode !== LiteLLMProxyRoutingMode.direct;

  function save(payload: Record<string, unknown>) {
    startTransition(async () => {
      const result = await updateSettingsAction(payload);
      if (!result.success) {
        toast.error(result.error ?? t('settings.failedToSave'));
      }
    });
  }

  function buildPayload(
    overrides?: Partial<{
      routingMode: string;
      customHeaders: string;
      sonnetModel: string;
      haikuModel: string;
      opusModel: string;
    }>
  ) {
    return {
      litellmProxy: {
        baseUrl: settings.litellmProxy?.baseUrl,
        apiKey: settings.litellmProxy?.apiKey,
        marketplaceEnabled: !!settings.litellmProxy?.baseUrl,
        claudeCode: {
          routingMode: overrides?.routingMode ?? routingMode,
          customHeaders: (overrides?.customHeaders ?? customHeaders) || undefined,
          sonnetModel: (overrides?.sonnetModel ?? sonnetModel) || undefined,
          haikuModel: (overrides?.haikuModel ?? haikuModel) || undefined,
          opusModel: (overrides?.opusModel ?? opusModel) || undefined,
        },
      },
    };
  }

  function handleModeChange(value: string) {
    setRoutingMode(value);
    save(buildPayload({ routingMode: value }));
  }

  return (
    <SettingsSection
      icon={Route}
      title={t('settings.litellmProxy.routing.title')}
      description={t('settings.litellmProxy.routing.description')}
      testId="litellm-proxy-routing-section"
      tooltip={t('settings.litellmProxy.routing.hint')}
    >
      <SettingsRow
        label={t('settings.litellmProxy.routing.mode')}
        description={t('settings.litellmProxy.routing.modeDescription')}
        htmlFor="litellm-routing-mode"
      >
        <Select value={routingMode} onValueChange={handleModeChange}>
          <SelectTrigger
            id="litellm-routing-mode"
            data-testid="litellm-routing-mode-select"
            className="w-48 text-xs"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={LiteLLMProxyRoutingMode.direct}>
              {t('settings.litellmProxy.routing.modeDirect')}
            </SelectItem>
            <SelectItem value={LiteLLMProxyRoutingMode.proxy}>
              {t('settings.litellmProxy.routing.modeProxy')}
            </SelectItem>
            <SelectItem value={LiteLLMProxyRoutingMode.passthrough}>
              {t('settings.litellmProxy.routing.modePassthrough')}
            </SelectItem>
          </SelectContent>
        </Select>
      </SettingsRow>

      {routingMode === LiteLLMProxyRoutingMode.passthrough && (
        <SettingsRow label="" description={t('settings.litellmProxy.routing.passthroughHelp')}>
          <span />
        </SettingsRow>
      )}

      {showProxyFields ? (
        <>
          <SettingsRow
            label={t('settings.litellmProxy.routing.customHeaders')}
            description={t('settings.litellmProxy.routing.customHeadersDescription')}
            htmlFor="litellm-custom-headers"
          >
            <Textarea
              id="litellm-custom-headers"
              data-testid="litellm-custom-headers-input"
              placeholder={'x-litellm-customer-id: my-user\nx-litellm-tags: project:acme'}
              value={customHeaders}
              onChange={(e) => setCustomHeaders(e.target.value)}
              onBlur={() => {
                if (customHeaders !== originalCustomHeaders) {
                  save(buildPayload({ customHeaders }));
                }
              }}
              rows={3}
              className="w-64 text-xs"
            />
          </SettingsRow>

          <SettingsRow
            label={t('settings.litellmProxy.routing.sonnetModel')}
            description={t('settings.litellmProxy.routing.modelOverrideDescription')}
            htmlFor="litellm-sonnet-model"
          >
            <Input
              id="litellm-sonnet-model"
              data-testid="litellm-sonnet-model-input"
              type="text"
              placeholder="claude-sonnet-4-6"
              value={sonnetModel}
              onChange={(e) => setSonnetModel(e.target.value)}
              onBlur={() => {
                if (sonnetModel !== originalSonnetModel) {
                  save(buildPayload({ sonnetModel }));
                }
              }}
              className="w-64 text-xs"
            />
          </SettingsRow>

          <SettingsRow
            label={t('settings.litellmProxy.routing.haikuModel')}
            htmlFor="litellm-haiku-model"
          >
            <Input
              id="litellm-haiku-model"
              data-testid="litellm-haiku-model-input"
              type="text"
              placeholder="claude-haiku-4-5"
              value={haikuModel}
              onChange={(e) => setHaikuModel(e.target.value)}
              onBlur={() => {
                if (haikuModel !== originalHaikuModel) {
                  save(buildPayload({ haikuModel }));
                }
              }}
              className="w-64 text-xs"
            />
          </SettingsRow>

          <SettingsRow
            label={t('settings.litellmProxy.routing.opusModel')}
            htmlFor="litellm-opus-model"
          >
            <Input
              id="litellm-opus-model"
              data-testid="litellm-opus-model-input"
              type="text"
              placeholder="claude-opus-4-6"
              value={opusModel}
              onChange={(e) => setOpusModel(e.target.value)}
              onBlur={() => {
                if (opusModel !== originalOpusModel) {
                  save(buildPayload({ opusModel }));
                }
              }}
              className="w-64 text-xs"
            />
          </SettingsRow>
        </>
      ) : null}
    </SettingsSection>
  );
}
