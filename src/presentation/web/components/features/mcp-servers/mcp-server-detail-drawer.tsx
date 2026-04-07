'use client';

import { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { BaseDrawer } from '@/components/common/base-drawer';
import { DrawerTitle, DrawerDescription } from '@/components/ui/drawer';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { McpToolList } from './mcp-tool-list';
import { fetchMcpServerToolsAction } from '@/app/actions/fetch-mcp-server-tools';
import type {
  McpServerInfo,
  McpToolInfo,
} from '@shipit-ai/core/application/ports/output/services/mcp-server-browser.interface';

interface McpServerDetailDrawerProps {
  server: McpServerInfo | null;
  serverNames: string[];
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
  serverNames,
  open,
  onClose,
}: McpServerDetailDrawerProps) {
  const { t } = useTranslation();
  const [tools, setTools] = useState<McpToolInfo[]>([]);
  const [loadingTools, setLoadingTools] = useState(false);

  const loadTools = useCallback(async () => {
    setLoadingTools(true);
    const result = await fetchMcpServerToolsAction();
    setTools(result.tools);
    setLoadingTools(false);
  }, []);

  useEffect(() => {
    if (open && server && tools.length === 0) {
      loadTools();
    }
  }, [open, server, tools.length, loadTools]);

  if (!server) return null;

  const description = server.mcp_info?.description ?? '';

  return (
    <BaseDrawer open={open} onClose={onClose}>
      <DrawerTitle>{server.name}</DrawerTitle>
      {description ? <DrawerDescription>{description}</DrawerDescription> : null}

      <Separator className="my-4" />

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground text-xs">{t('mcpServers.detail.serverName')}</span>
          <span className="font-mono text-xs">{server.server_name}</span>
        </div>

        {isValidDisplayUrl(server.url) ? (
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground text-xs">{t('mcpServers.detail.url')}</span>
            <span className="max-w-[200px] truncate font-mono text-xs">{server.url}</span>
          </div>
        ) : null}

        <div className="flex items-center justify-between">
          <span className="text-muted-foreground text-xs">{t('mcpServers.detail.transport')}</span>
          <Badge variant="outline" className="text-xs">
            {t(`mcpServers.transport.${server.transport}`, server.transport.toUpperCase())}
          </Badge>
        </div>

        {server.auth_type && server.auth_type !== 'none' ? (
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground text-xs">{t('mcpServers.detail.authType')}</span>
            <Badge variant="secondary" className="text-xs">
              {t(`mcpServers.authType.${server.auth_type}`, server.auth_type)}
            </Badge>
          </div>
        ) : null}
      </div>

      <Separator className="my-4" />

      <h3 className="mb-3 text-sm font-semibold">{t('mcpServers.tools.title')}</h3>
      {loadingTools ? (
        <p className="text-muted-foreground text-sm">{t('accessibility.loading')}...</p>
      ) : (
        <McpToolList tools={tools} serverNames={serverNames} />
      )}
    </BaseDrawer>
  );
}
