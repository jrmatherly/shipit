'use client';

import { useTranslation } from 'react-i18next';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Server, Wifi, Terminal } from 'lucide-react';
import type { McpServerInfo } from '@shipit-ai/core/application/ports/output/services/mcp-server-browser.interface';

interface McpServerCardProps {
  server: McpServerInfo;
  onSelect: (server: McpServerInfo) => void;
}

const TRANSPORT_ICONS: Record<string, typeof Server> = {
  http: Server,
  sse: Wifi,
  stdio: Terminal,
};

export function McpServerCard({ server, onSelect }: McpServerCardProps) {
  const { t } = useTranslation();
  const TransportIcon = TRANSPORT_ICONS[server.transport] ?? Server;
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
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <TransportIcon className="text-muted-foreground h-4 w-4 shrink-0" />
          <h3 className="text-sm font-semibold">{server.name}</h3>
        </div>
        <Badge variant="outline" className="shrink-0 text-xs">
          {t(`mcpServers.transport.${server.transport}`, server.transport.toUpperCase())}
        </Badge>
      </div>

      {description ? (
        <p className="text-muted-foreground mt-2 line-clamp-2 text-xs">{description}</p>
      ) : null}

      <div className="mt-3 flex items-center gap-2">
        {server.auth_type && server.auth_type !== 'none' ? (
          <Badge variant="secondary" className="text-xs">
            {t(`mcpServers.authType.${server.auth_type}`, server.auth_type)}
          </Badge>
        ) : null}
      </div>
    </Card>
  );
}
