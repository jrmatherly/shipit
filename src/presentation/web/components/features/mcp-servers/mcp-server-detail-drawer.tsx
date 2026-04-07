'use client';

import { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { BaseDrawer } from '@/components/common/base-drawer';
import { DrawerTitle, DrawerDescription } from '@/components/ui/drawer';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { McpToolList } from './mcp-tool-list';
import { McpConnectInstructions } from './mcp-connect-instructions';
import { McpServerIcon } from './mcp-server-icon';
import { fetchMcpServerToolsAction } from '@/app/actions/fetch-mcp-server-tools';
import type {
  McpServerInfo,
  McpToolInfo,
} from '@shipit-ai/core/application/ports/output/services/mcp-server-browser.interface';

interface McpServerDetailDrawerProps {
  server: McpServerInfo | null;
  proxyBaseUrl: string;
  open: boolean;
  onClose: () => void;
}

function isValidDisplayUrl(url?: string): boolean {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export function McpServerDetailDrawer({
  server,
  proxyBaseUrl,
  open,
  onClose,
}: McpServerDetailDrawerProps) {
  const { t } = useTranslation('web');
  const [tools, setTools] = useState<McpToolInfo[]>([]);
  const [loadingTools, setLoadingTools] = useState(false);
  const [toolError, setToolError] = useState<string | null>(null);
  const [loadedServerName, setLoadedServerName] = useState<string | null>(null);

  const loadTools = useCallback(async (serverName: string) => {
    setLoadingTools(true);
    setToolError(null);
    try {
      const result = await fetchMcpServerToolsAction(serverName);
      setTools(result.tools);
      if (result.error) setToolError(result.error);
      setLoadedServerName(serverName);
    } catch {
      setToolError('Failed to load tools');
    } finally {
      setLoadingTools(false);
    }
  }, []);

  useEffect(() => {
    if (!open || !server) return;
    // Re-fetch whenever the drawer opens for a different server.
    if (loadedServerName === server.server_name) return;
    loadTools(server.server_name);
  }, [open, server, loadedServerName, loadTools]);

  const handleRefresh = useCallback(() => {
    if (!server) return;
    // Clear the cached server name to force a re-fetch and call loadTools
    // directly for immediate feedback.
    setLoadedServerName(null);
    loadTools(server.server_name);
  }, [server, loadTools]);

  if (!server) return null;

  const description = server.mcp_info?.description ?? '';

  return (
    <BaseDrawer open={open} onClose={onClose} data-testid="mcp-server-detail-drawer">
      <div className="flex flex-col gap-6 overflow-y-auto p-6">
        {/* Header */}
        <div className="space-y-2">
          <span className="text-[10px] font-bold tracking-[0.2em] text-slate-400 uppercase">
            {t(`mcpServers.transport.${server.transport}`, server.transport.toUpperCase())} &middot;
            MCP Server
          </span>
          <div className="flex items-start gap-3">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-slate-100 ring-1 ring-slate-200/50 dark:bg-slate-800 dark:ring-slate-700/50">
              <McpServerIcon
                serverName={server.server_name}
                url={server.url}
                transport={server.transport}
                size="lg"
              />
            </div>
            <DrawerTitle className="text-foreground mt-2 text-lg font-bold tracking-tight">
              {server.name}
            </DrawerTitle>
          </div>
          {description ? (
            <DrawerDescription className="text-muted-foreground text-sm leading-relaxed">
              {description}
            </DrawerDescription>
          ) : null}
        </div>

        <Separator />

        {/* Metadata */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground text-xs font-medium">
              {t('mcpServers.detail.serverName')}
            </span>
            <span className="font-mono text-xs">{server.server_name}</span>
          </div>

          {isValidDisplayUrl(server.url) ? (
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground shrink-0 text-xs font-medium">
                {t('mcpServers.detail.url')}
              </span>
              <span className="truncate font-mono text-xs" title={server.url}>
                {server.url}
              </span>
            </div>
          ) : null}

          <div className="flex items-center justify-between">
            <span className="text-muted-foreground text-xs font-medium">
              {t('mcpServers.detail.transport')}
            </span>
            <Badge variant="outline">
              {t(`mcpServers.transport.${server.transport}`, server.transport.toUpperCase())}
            </Badge>
          </div>

          {server.auth_type && server.auth_type !== 'none' ? (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-xs font-medium">
                {t('mcpServers.detail.authType')}
              </span>
              <Badge variant="secondary">
                {t(`mcpServers.authType.${server.auth_type}`, server.auth_type)}
              </Badge>
            </div>
          ) : null}
        </div>

        <Separator />

        {/* Tools */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-foreground text-sm font-bold tracking-tight">
              {t('mcpServers.tools.title')}
            </h3>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-7"
              onClick={handleRefresh}
              disabled={loadingTools}
              aria-label={t('mcpServers.tools.refresh')}
              data-testid="mcp-tools-refresh"
            >
              <RefreshCw className={`size-3.5 ${loadingTools ? 'animate-spin' : ''}`} />
            </Button>
          </div>
          {loadingTools ? (
            <p className="text-muted-foreground text-sm">{t('accessibility.loading')}...</p>
          ) : toolError ? (
            <p className="text-destructive text-sm">{toolError}</p>
          ) : (
            <McpToolList tools={tools} serverName={server.server_name} />
          )}
        </div>

        <Separator />

        {/* Connect instructions */}
        <div className="space-y-3">
          <h3 className="text-foreground text-sm font-bold tracking-tight">
            {t('mcpServers.connect.title')}
          </h3>
          <McpConnectInstructions proxyBaseUrl={proxyBaseUrl} serverName={server.server_name} />
        </div>
      </div>
    </BaseDrawer>
  );
}
