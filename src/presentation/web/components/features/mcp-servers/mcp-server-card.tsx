'use client';

import { useTranslation } from 'react-i18next';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { McpServerIcon } from './mcp-server-icon';
import type { McpServerInfo } from '@shipit-ai/core/application/ports/output/services/mcp-server-browser.interface';

interface McpServerCardProps {
  server: McpServerInfo;
  onSelect: (server: McpServerInfo) => void;
}

export function McpServerCard({ server, onSelect }: McpServerCardProps) {
  const { t } = useTranslation('web');
  const description = server.mcp_info?.description ?? '';

  return (
    <Card
      className="cursor-pointer p-5 transition-all duration-300 hover:scale-[1.02] hover:shadow-md hover:ring-slate-300 dark:hover:ring-slate-600"
      role="button"
      tabIndex={0}
      onClick={() => onSelect(server)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(server);
        }
      }}
      data-testid={`mcp-server-card-${server.server_name}`}
    >
      <div className="flex items-start gap-3">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-slate-100 ring-1 ring-slate-200/50 dark:bg-slate-800 dark:ring-slate-700/50">
          <McpServerIcon
            serverName={server.server_name}
            url={server.url}
            transport={server.transport}
            size="md"
          />
        </div>
        <h3 className="text-foreground mt-2 min-w-0 flex-1 truncate text-sm leading-tight font-bold tracking-tight">
          {server.name}
        </h3>
      </div>

      {description ? (
        <p className="text-muted-foreground mt-3 line-clamp-2 text-xs leading-relaxed">
          {description}
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center gap-1.5">
        <Badge variant="outline">
          {t(`mcpServers.transport.${server.transport}`, server.transport.toUpperCase())}
        </Badge>
        {server.auth_type && server.auth_type !== 'none' ? (
          <Badge variant="secondary">
            {t(`mcpServers.authType.${server.auth_type}`, server.auth_type)}
          </Badge>
        ) : null}
      </div>
    </Card>
  );
}
