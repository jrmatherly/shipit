'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Check, Copy } from 'lucide-react';

interface McpConnectInstructionsProps {
  proxyBaseUrl: string;
  serverName: string;
}

type ClientId = 'claude-code' | 'cursor' | 'vscode' | 'gemini' | 'codex' | 'curl';

interface ClientOption {
  id: ClientId;
  label: string;
}

const CLIENTS: ClientOption[] = [
  { id: 'claude-code', label: 'Claude Code' },
  { id: 'cursor', label: 'Cursor' },
  { id: 'vscode', label: 'VS Code' },
  { id: 'gemini', label: 'Gemini CLI' },
  { id: 'codex', label: 'Codex CLI' },
  { id: 'curl', label: 'cURL' },
];

/**
 * Generate copy-pasteable connection snippets for various MCP clients.
 *
 * The LiteLLM proxy exposes each MCP server at {proxyBaseUrl}/{serverName}/mcp
 * and authenticates via the `x-litellm-api-key: Bearer <key>` header.
 *
 * All snippets use `<LITELLM_API_KEY>` as a placeholder that the user must
 * replace with their actual virtual key — we never inline a real key into
 * copyable instructions.
 */
export function buildSnippet(clientId: ClientId, proxyBaseUrl: string, serverName: string): string {
  const endpoint = `${proxyBaseUrl.replace(/\/$/, '')}/${serverName}/mcp`;

  switch (clientId) {
    case 'claude-code':
      // Claude Code supports `claude mcp add` command
      return [
        `claude mcp add --transport http ${serverName} \\`,
        `  ${endpoint} \\`,
        `  --header "x-litellm-api-key: Bearer <LITELLM_API_KEY>"`,
      ].join('\n');

    case 'cursor':
      // Cursor: ~/.cursor/mcp.json
      return JSON.stringify(
        {
          mcpServers: {
            [serverName]: {
              url: endpoint,
              headers: {
                'x-litellm-api-key': 'Bearer <LITELLM_API_KEY>',
              },
            },
          },
        },
        null,
        2
      );

    case 'vscode':
      // VS Code / Copilot: settings.json under "mcp"
      return JSON.stringify(
        {
          mcp: {
            servers: {
              [serverName]: {
                type: 'http',
                url: endpoint,
                headers: {
                  'x-litellm-api-key': 'Bearer <LITELLM_API_KEY>',
                },
              },
            },
          },
        },
        null,
        2
      );

    case 'gemini':
      // Gemini CLI: ~/.gemini/settings.json or project .gemini/settings.json
      return JSON.stringify(
        {
          mcpServers: {
            [serverName]: {
              httpUrl: endpoint,
              headers: {
                'x-litellm-api-key': 'Bearer <LITELLM_API_KEY>',
              },
            },
          },
        },
        null,
        2
      );

    case 'codex':
      // Codex CLI: ~/.codex/config.toml
      return [
        `[mcp_servers.${serverName}]`,
        `url = "${endpoint}"`,
        `headers = { "x-litellm-api-key" = "Bearer <LITELLM_API_KEY>" }`,
      ].join('\n');

    case 'curl':
      return [
        `curl --location '${endpoint}' \\`,
        `  --header 'Content-Type: application/json' \\`,
        `  --header 'x-litellm-api-key: Bearer <LITELLM_API_KEY>' \\`,
        `  --data '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'`,
      ].join('\n');
  }
}

export function McpConnectInstructions({ proxyBaseUrl, serverName }: McpConnectInstructionsProps) {
  const { t } = useTranslation('web');
  const [activeClient, setActiveClient] = useState<ClientId>('claude-code');
  const [copied, setCopied] = useState(false);

  const snippet = buildSnippet(activeClient, proxyBaseUrl, serverName);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(snippet);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard not available (e.g., insecure context) — silently ignore.
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1" role="tablist">
        {CLIENTS.map((client) => (
          <button
            key={client.id}
            type="button"
            role="tab"
            aria-selected={activeClient === client.id}
            onClick={() => setActiveClient(client.id)}
            className={
              activeClient === client.id
                ? 'bg-primary text-primary-foreground rounded-md px-2.5 py-1 text-xs font-medium'
                : 'border-border hover:bg-muted rounded-md border px-2.5 py-1 text-xs'
            }
          >
            {client.label}
          </button>
        ))}
      </div>

      <div className="relative">
        <pre className="bg-muted max-h-64 overflow-auto rounded-md p-3 pr-10 font-mono text-[11px] leading-relaxed">
          <code>{snippet}</code>
        </pre>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="absolute top-1 right-1 h-7 w-7"
          onClick={handleCopy}
          aria-label={t('mcpServers.connect.copy')}
        >
          {copied ? (
            <Check className="text-primary h-3.5 w-3.5" />
          ) : (
            <Copy className="h-3.5 w-3.5" />
          )}
        </Button>
      </div>

      <p className="text-muted-foreground text-xs">{t('mcpServers.connect.replaceKey')}</p>
    </div>
  );
}
