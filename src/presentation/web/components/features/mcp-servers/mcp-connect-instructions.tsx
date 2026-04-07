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
      <div
        className="flex flex-wrap gap-1.5 rounded-lg border border-slate-200/60 bg-slate-50/50 p-1 dark:border-slate-700/50 dark:bg-slate-900/40"
        role="tablist"
        aria-label={t('mcpServers.connect.title')}
      >
        {CLIENTS.map((client) => (
          <button
            key={client.id}
            type="button"
            role="tab"
            aria-selected={activeClient === client.id}
            onClick={() => setActiveClient(client.id)}
            data-state={activeClient === client.id ? 'active' : 'inactive'}
            className="data-[state=active]:bg-card data-[state=active]:text-primary text-muted-foreground hover:text-foreground rounded-md px-2.5 py-1 text-xs font-medium transition-all data-[state=active]:shadow-sm data-[state=active]:ring-1 data-[state=active]:ring-slate-200/70 dark:data-[state=active]:ring-slate-700/50"
          >
            {client.label}
          </button>
        ))}
      </div>

      <div className="editorial-shadow group relative overflow-hidden rounded-xl border border-slate-200/60 bg-slate-50/60 dark:border-slate-700/50 dark:bg-slate-900/60">
        {/* Terminal-style header bar with dots */}
        <div className="flex items-center justify-between border-b border-slate-200/60 bg-slate-100/40 px-3 py-2 dark:border-slate-700/50 dark:bg-slate-900/40">
          <div className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-slate-300 dark:bg-slate-600" aria-hidden />
            <span className="size-2 rounded-full bg-slate-300 dark:bg-slate-600" aria-hidden />
            <span className="size-2 rounded-full bg-slate-300 dark:bg-slate-600" aria-hidden />
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-6 shrink-0"
            onClick={handleCopy}
            aria-label={t('mcpServers.connect.copy')}
          >
            {copied ? <Check className="text-primary size-3" /> : <Copy className="size-3" />}
          </Button>
        </div>
        <pre className="max-h-64 overflow-auto p-3 font-mono text-[11px] leading-relaxed">
          <code>{snippet}</code>
        </pre>
      </div>

      <p className="text-muted-foreground text-xs">{t('mcpServers.connect.replaceKey')}</p>
    </div>
  );
}
