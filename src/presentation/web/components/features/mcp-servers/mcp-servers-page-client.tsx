'use client';

import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertCircle, Search, Server } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/common/empty-state';
import { McpServerCard } from './mcp-server-card';
import { McpServerDetailDrawer } from './mcp-server-detail-drawer';
import { fetchMcpServersAction } from '@/app/actions/fetch-mcp-servers';
import type { McpServerInfo } from '@shipit-ai/core/application/ports/output/services/mcp-server-browser.interface';

interface McpServersPageClientProps {
  proxyConfigured: boolean;
  proxyBaseUrl: string;
}

const TRANSPORT_FILTERS = ['all', 'http', 'sse', 'stdio'] as const;

export function McpServersPageClient({ proxyConfigured, proxyBaseUrl }: McpServersPageClientProps) {
  const { t } = useTranslation('web');
  const [searchQuery, setSearchQuery] = useState('');
  const [transportFilter, setTransportFilter] = useState<string>('all');
  const [selectedServer, setSelectedServer] = useState<McpServerInfo | null>(null);
  const [servers, setServers] = useState<McpServerInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!proxyConfigured) {
      setLoading(false);
      return;
    }
    fetchMcpServersAction()
      .then((result) => {
        setServers(result.servers);
        if (result.error) setError(result.error);
      })
      .catch(() => {
        setError(t('mcpServers.fetchError'));
      })
      .finally(() => {
        setLoading(false);
      });
  }, [proxyConfigured, t]);

  const filtered = useMemo(() => {
    return servers.filter((server) => {
      const query = searchQuery.toLowerCase();
      const matchesQuery =
        !query ||
        server.name.toLowerCase().includes(query) ||
        (server.mcp_info?.description ?? '').toLowerCase().includes(query);

      const matchesTransport = transportFilter === 'all' || server.transport === transportFilter;

      return matchesQuery && matchesTransport;
    });
  }, [servers, searchQuery, transportFilter]);

  if (!proxyConfigured) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <EmptyState icon={<AlertCircle className="h-8 w-8" />} title={t('mcpServers.noProxy')} />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <p className="text-muted-foreground">{t('accessibility.loading')}...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">{t('mcpServers.title')}</h1>
        {error ? (
          <div className="border-destructive/50 bg-destructive/10 mt-2 rounded-md border p-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="text-destructive h-4 w-4" />
              <p className="text-destructive text-sm">{error}</p>
            </div>
          </div>
        ) : null}
        <p className="text-muted-foreground mt-1 text-sm">{t('mcpServers.subtitle')}</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Input
          placeholder={t('mcpServers.searchPlaceholder')}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-xs"
        />
        <div className="flex gap-1">
          {TRANSPORT_FILTERS.map((filter) => (
            <Badge
              key={filter}
              variant={transportFilter === filter ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => setTransportFilter(filter)}
            >
              {filter === 'all'
                ? t('mcpServers.filter.all')
                : t(`mcpServers.transport.${filter}`, filter.toUpperCase())}
            </Badge>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="flex items-center justify-center py-16">
          <EmptyState
            icon={
              servers.length === 0 ? <Server className="h-8 w-8" /> : <Search className="h-8 w-8" />
            }
            title={servers.length === 0 ? t('mcpServers.noServers') : t('mcpServers.noResults')}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((server) => (
            <McpServerCard key={server.server_id} server={server} onSelect={setSelectedServer} />
          ))}
        </div>
      )}

      <McpServerDetailDrawer
        server={selectedServer}
        proxyBaseUrl={proxyBaseUrl}
        open={!!selectedServer}
        onClose={() => setSelectedServer(null)}
      />
    </div>
  );
}
