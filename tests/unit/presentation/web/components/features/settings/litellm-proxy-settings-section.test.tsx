import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TooltipProvider } from '@/components/ui/tooltip';
import { LiteLLMProxySettingsSection } from '@/components/features/settings/litellm-proxy-settings-section';
import { createDefaultSettings } from '@shipit-ai/core/domain/factories/settings-defaults.factory';

const mockUpdateSettingsAction = vi.fn();
const mockAddMarketplaceAction = vi.fn();

vi.mock('@/app/actions/update-settings', () => ({
  updateSettingsAction: (...args: unknown[]) => mockUpdateSettingsAction(...args),
}));

vi.mock('@/app/actions/add-marketplace', () => ({
  addMarketplaceAction: (...args: unknown[]) => mockAddMarketplaceAction(...args),
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const baseSettings = createDefaultSettings();

function buildSettings(proxyOverrides?: {
  baseUrl?: string;
  apiKey?: string;
  marketplaceEnabled?: boolean;
}) {
  return {
    ...baseSettings,
    litellmProxy: proxyOverrides
      ? {
          baseUrl: proxyOverrides.baseUrl,
          apiKey: proxyOverrides.apiKey,
          marketplaceEnabled: proxyOverrides.marketplaceEnabled,
        }
      : undefined,
  };
}

describe('LiteLLMProxySettingsSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdateSettingsAction.mockResolvedValue({ success: true });
    mockAddMarketplaceAction.mockResolvedValue({ success: true });
  });

  it('renders the section with Server icon and title', () => {
    render(
      <TooltipProvider>
        <LiteLLMProxySettingsSection settings={buildSettings()} />
      </TooltipProvider>
    );
    expect(screen.getByTestId('litellm-proxy-settings-section')).toBeDefined();
    expect(screen.getByText('LiteLLM Proxy')).toBeDefined();
  });

  it('renders URL and API key inputs', () => {
    render(
      <TooltipProvider>
        <LiteLLMProxySettingsSection settings={buildSettings()} />
      </TooltipProvider>
    );
    expect(screen.getByTestId('litellm-proxy-url-input')).toBeDefined();
    expect(screen.getByTestId('litellm-api-key-input')).toBeDefined();
  });

  it('renders marketplace enabled toggle', () => {
    render(
      <TooltipProvider>
        <LiteLLMProxySettingsSection settings={buildSettings()} />
      </TooltipProvider>
    );
    expect(screen.getByTestId('switch-litellm-marketplace-enabled')).toBeDefined();
  });

  it('renders test connection button', () => {
    render(
      <TooltipProvider>
        <LiteLLMProxySettingsSection settings={buildSettings()} />
      </TooltipProvider>
    );
    expect(screen.getByTestId('litellm-test-connection-btn')).toBeDefined();
  });

  it('populates inputs when proxy is configured', () => {
    render(
      <TooltipProvider>
        <LiteLLMProxySettingsSection
          settings={buildSettings({
            baseUrl: 'http://localhost:4000',
            apiKey: 'sk-test-key',
            marketplaceEnabled: true,
          })}
        />
      </TooltipProvider>
    );
    const urlInput = screen.getByTestId('litellm-proxy-url-input') as HTMLInputElement;
    expect(urlInput.value).toBe('http://localhost:4000');

    const apiKeyInput = screen.getByTestId('litellm-api-key-input') as HTMLInputElement;
    expect(apiKeyInput.value).toBe('sk-test-key');
  });

  it('disables test connection button when URL is empty', () => {
    render(
      <TooltipProvider>
        <LiteLLMProxySettingsSection settings={buildSettings()} />
      </TooltipProvider>
    );
    const btn = screen.getByTestId('litellm-test-connection-btn') as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });
});
