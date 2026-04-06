'use client';

import { useState, useTransition } from 'react';
import { Server, CheckCircle2, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { updateSettingsAction } from '@/app/actions/update-settings';
import { addMarketplaceAction } from '@/app/actions/add-marketplace';
import type { Settings } from '@shipit-ai/core/domain/generated/output';
import { SettingsSection, SettingsRow, SwitchRow } from './settings-section-utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export interface LiteLLMProxySettingsSectionProps {
  settings: Settings;
}

export function LiteLLMProxySettingsSection({ settings }: LiteLLMProxySettingsSectionProps) {
  const { t } = useTranslation('web');
  const [, startTransition] = useTransition();

  const [baseUrl, setBaseUrl] = useState(settings.litellmProxy?.baseUrl ?? '');
  const [apiKey, setApiKey] = useState(settings.litellmProxy?.apiKey ?? '');
  const [marketplaceEnabled, setMarketplaceEnabled] = useState(
    settings.litellmProxy?.marketplaceEnabled ?? false
  );
  const [testStatus, setTestStatus] = useState<'idle' | 'success' | 'failed'>('idle');
  const [isTesting, setIsTesting] = useState(false);

  const originalBaseUrl = settings.litellmProxy?.baseUrl ?? '';
  const originalApiKey = settings.litellmProxy?.apiKey ?? '';

  function save(payload: Record<string, unknown>) {
    startTransition(async () => {
      const result = await updateSettingsAction(payload);
      if (!result.success) {
        toast.error(result.error ?? t('settings.failedToSave'));
      }
    });
  }

  function buildPayload(overrides?: {
    baseUrl?: string;
    apiKey?: string;
    marketplaceEnabled?: boolean;
  }) {
    return {
      litellmProxy: {
        baseUrl: overrides?.baseUrl ?? baseUrl,
        apiKey: overrides?.apiKey ?? apiKey,
        marketplaceEnabled: overrides?.marketplaceEnabled ?? marketplaceEnabled,
      },
    };
  }

  async function handleTestConnection() {
    if (!baseUrl) return;
    setIsTesting(true);
    setTestStatus('idle');
    try {
      const marketplaceUrl = `${baseUrl.replace(/\/+$/, '')}/claude-code/marketplace.json`;
      const result = await addMarketplaceAction(marketplaceUrl);
      setTestStatus(result.success ? 'success' : 'failed');
      if (result.success) {
        toast.success(t('settings.litellmProxy.testSuccess'));
      } else {
        toast.error(t('settings.litellmProxy.testFailed'));
      }
    } catch {
      setTestStatus('failed');
      toast.error(t('settings.litellmProxy.testFailed'));
    } finally {
      setIsTesting(false);
    }
  }

  return (
    <SettingsSection
      icon={Server}
      title={t('settings.litellmProxy.title')}
      description={t('settings.litellmProxy.description')}
      testId="litellm-proxy-settings-section"
      tooltip={t('settings.litellmProxy.hint')}
    >
      <SettingsRow
        label={t('settings.litellmProxy.baseUrl')}
        description={t('settings.litellmProxy.baseUrlDescription')}
        tooltip="The base URL of your LiteLLM proxy server. This is used to fetch the plugin marketplace catalog and route model requests."
        htmlFor="litellm-proxy-url"
      >
        <Input
          id="litellm-proxy-url"
          data-testid="litellm-proxy-url-input"
          type="text"
          placeholder="http://localhost:4000"
          value={baseUrl}
          onChange={(e) => {
            setBaseUrl(e.target.value);
            setTestStatus('idle');
          }}
          onBlur={() => {
            if (baseUrl !== originalBaseUrl) save(buildPayload({ baseUrl }));
          }}
          className="w-64 text-xs"
        />
      </SettingsRow>
      <SettingsRow
        label={t('settings.litellmProxy.apiKey')}
        description={t('settings.litellmProxy.apiKeyDescription')}
        tooltip="A virtual API key for authenticating with the LiteLLM proxy. Stored locally alongside other agent credentials."
        htmlFor="litellm-api-key"
      >
        <Input
          id="litellm-api-key"
          data-testid="litellm-api-key-input"
          type="password"
          placeholder="sk-..."
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          onBlur={() => {
            if (apiKey !== originalApiKey) save(buildPayload({ apiKey }));
          }}
          className="w-64 text-xs"
        />
      </SettingsRow>
      <SwitchRow
        label={t('settings.litellmProxy.marketplaceEnabled')}
        description={t('settings.litellmProxy.marketplaceEnabledDescription')}
        tooltip="When enabled, the plugin marketplace will fetch its catalog from this LiteLLM proxy instead of using built-in defaults."
        id="litellm-marketplace-enabled"
        testId="switch-litellm-marketplace-enabled"
        checked={marketplaceEnabled}
        onChange={(v) => {
          setMarketplaceEnabled(v);
          save(buildPayload({ marketplaceEnabled: v }));
        }}
      />
      <SettingsRow
        label={t('settings.litellmProxy.testConnection')}
        tooltip="Attempt to connect to the proxy and fetch the marketplace catalog to verify the configuration is correct."
      >
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            data-testid="litellm-test-connection-btn"
            disabled={!baseUrl || isTesting}
            onClick={handleTestConnection}
            className="cursor-pointer text-xs"
          >
            {isTesting ? t('settings.saving') : t('settings.litellmProxy.testConnection')}
          </Button>
          {testStatus === 'success' && (
            <CheckCircle2 className="h-4 w-4 text-emerald-500" data-testid="litellm-test-success" />
          )}
          {testStatus === 'failed' && (
            <XCircle className="text-destructive h-4 w-4" data-testid="litellm-test-failed" />
          )}
        </div>
      </SettingsRow>
    </SettingsSection>
  );
}
