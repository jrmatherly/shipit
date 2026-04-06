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

/** Agent types that support env-var-based proxy routing (Tier 1) */
const TIER1_AGENTS = new Set(['claude-code', 'gemini-cli', 'codex-cli']);
/** Agent types that need documentation-only panels (Tier 2) */
const TIER2_AGENTS = new Set(['cursor', 'copilot-cli']);

/** Get the per-agent proxy config key for building payloads */
function agentConfigKey(agentType: string): string | null {
  switch (agentType) {
    case 'claude-code':
      return 'claudeCode';
    case 'gemini-cli':
      return 'geminiCli';
    case 'codex-cli':
      return 'codexCli';
    default:
      return null;
  }
}

/** Get the current routing mode for the active agent */
function getRoutingMode(settings: Settings): string {
  const agentType = settings.agent.type as string;
  switch (agentType) {
    case 'claude-code':
      return settings.litellmProxy?.claudeCode?.routingMode ?? LiteLLMProxyRoutingMode.direct;
    case 'gemini-cli':
      return settings.litellmProxy?.geminiCli?.routingMode ?? LiteLLMProxyRoutingMode.direct;
    case 'codex-cli':
      return settings.litellmProxy?.codexCli?.routingMode ?? LiteLLMProxyRoutingMode.direct;
    default:
      return LiteLLMProxyRoutingMode.direct;
  }
}

/** Whether this agent supports passthrough mode */
function supportsPassthrough(agentType: string): boolean {
  return agentType === 'claude-code';
}

export function LiteLLMProxyRoutingSection({ settings }: LiteLLMProxyRoutingSectionProps) {
  const { t } = useTranslation('web');
  const [, startTransition] = useTransition();
  const agentType = settings.agent.type as string;

  const cc = settings.litellmProxy?.claudeCode;
  const [routingMode, setRoutingMode] = useState<string>(getRoutingMode(settings));
  const [customHeaders, setCustomHeaders] = useState(cc?.customHeaders ?? '');
  const [sonnetModel, setSonnetModel] = useState(cc?.sonnetModel ?? '');
  const [haikuModel, setHaikuModel] = useState(cc?.haikuModel ?? '');
  const [opusModel, setOpusModel] = useState(cc?.opusModel ?? '');

  const originalCustomHeaders = cc?.customHeaders ?? '';
  const originalSonnetModel = cc?.sonnetModel ?? '';
  const originalHaikuModel = cc?.haikuModel ?? '';
  const originalOpusModel = cc?.opusModel ?? '';

  const showProxyFields = routingMode !== LiteLLMProxyRoutingMode.direct;
  const isTier1 = TIER1_AGENTS.has(agentType);
  const isTier2 = TIER2_AGENTS.has(agentType);
  const proxyUrl = settings.litellmProxy?.baseUrl ?? '';
  const proxyApiKey = settings.litellmProxy?.apiKey ?? '';

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
    const key = agentConfigKey(agentType);
    if (!key) return {};

    if (agentType === 'claude-code') {
      return {
        litellmProxy: {
          claudeCode: {
            routingMode: overrides?.routingMode ?? routingMode,
            customHeaders: overrides?.customHeaders ?? customHeaders,
            sonnetModel: overrides?.sonnetModel ?? sonnetModel,
            haikuModel: overrides?.haikuModel ?? haikuModel,
            opusModel: overrides?.opusModel ?? opusModel,
          },
        },
      };
    }

    // Gemini CLI and Codex CLI: only routingMode
    return {
      litellmProxy: {
        [key]: {
          routingMode: overrides?.routingMode ?? routingMode,
        },
      },
    };
  }

  function handleModeChange(value: string) {
    setRoutingMode(value);
    save(buildPayload({ routingMode: value }));
  }

  // Unsupported agent type
  if (!isTier1 && !isTier2) {
    return (
      <SettingsSection
        icon={Route}
        title={t('settings.litellmProxy.routing.title')}
        description={t('settings.litellmProxy.routing.description')}
        testId="litellm-proxy-routing-section"
        tooltip={t('settings.litellmProxy.routing.hint')}
      >
        <SettingsRow label="" description={t('settings.litellmProxy.routing.notSupported')}>
          <span />
        </SettingsRow>
      </SettingsSection>
    );
  }

  // Tier 2: Documentation-only panels
  if (isTier2) {
    const isCursor = agentType === 'cursor';
    const displayUrl = proxyUrl
      ? isCursor
        ? `${proxyUrl.replace(/\/+$/, '')}/cursor`
        : proxyUrl
      : '';

    return (
      <SettingsSection
        icon={Route}
        title={t('settings.litellmProxy.routing.title')}
        description={t('settings.litellmProxy.routing.description')}
        testId="litellm-proxy-routing-section"
        tooltip={t('settings.litellmProxy.routing.hint')}
      >
        <SettingsRow
          label={
            isCursor
              ? t('settings.litellmProxy.routing.cursorInstructions')
              : t('settings.litellmProxy.routing.copilotInstructions')
          }
          description={
            isCursor
              ? t('settings.litellmProxy.routing.cursorDescription')
              : t('settings.litellmProxy.routing.copilotDescription')
          }
        >
          <div className="w-64 space-y-2">
            <code className="bg-muted block rounded px-2 py-1 text-xs break-all">{displayUrl}</code>
            {isCursor && proxyApiKey ? (
              <code className="bg-muted block rounded px-2 py-1 text-xs break-all">
                {proxyApiKey}
              </code>
            ) : null}
          </div>
        </SettingsRow>
      </SettingsSection>
    );
  }

  // Tier 1: Env-var-based proxy routing (Claude Code, Gemini CLI, Codex CLI)
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
            {supportsPassthrough(agentType) && (
              <SelectItem value={LiteLLMProxyRoutingMode.passthrough}>
                {t('settings.litellmProxy.routing.modePassthrough')}
              </SelectItem>
            )}
          </SelectContent>
        </Select>
      </SettingsRow>

      {routingMode === LiteLLMProxyRoutingMode.passthrough && (
        <SettingsRow label="" description={t('settings.litellmProxy.routing.passthroughHelp')}>
          <span />
        </SettingsRow>
      )}

      {showProxyFields && agentType === 'claude-code' ? (
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
