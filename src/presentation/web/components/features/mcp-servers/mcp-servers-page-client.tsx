'use client';

import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertCircle, Search, Server } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/common/empty-state';
import { PageHeader } from '@/components/common/page-header';
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
  const [transportFilter, setTransportFilter] = useState<(typeof TRANSPORT_FILTERS)[number]>('all');
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
      <div className="flex flex-col gap-8 p-8">
        <PageHeader
          eyebrow="Developer Portal"
          title={t('mcpServers.title')}
          description={t('mcpServers.subtitle')}
        />
        <EmptyState icon={<AlertCircle className="size-10" />} title={t('mcpServers.noProxy')} />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-8 p-8">
        <PageHeader
          eyebrow="Developer Portal"
          title={t('mcpServers.title')}
          description={t('mcpServers.subtitle')}
        />
        <div className="text-muted-foreground text-center text-sm">
          {t('accessibility.loading')}...
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 p-8">
      <PageHeader
        eyebrow="Developer Portal"
        title={t('mcpServers.title')}
        description={t('mcpServers.subtitle')}
      />

      {error ? (
        <div
          role="alert"
          className="border-destructive/40 bg-destructive/10 editorial-shadow flex items-center gap-2 rounded-xl border px-4 py-3"
        >
          <AlertCircle className="text-destructive size-4 shrink-0" />
          <p className="text-destructive text-sm font-medium">{error}</p>
        </div>
      ) : null}

      {/* Search */}
      <div className="relative">
        <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
        <Input
          placeholder={t('mcpServers.searchPlaceholder')}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="ps-9"
          data-testid="mcp-servers-search"
        />
      </div>

      {/* Transport filter */}
      <div className="flex flex-wrap gap-2">
        {TRANSPORT_FILTERS.map((filter) => (
          <Button
            key={filter}
            variant={transportFilter === filter ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTransportFilter(filter)}
            data-testid={`mcp-servers-filter-${filter}`}
          >
            {filter === 'all'
              ? t('mcpServers.filter.all')
              : t(`mcpServers.transport.${filter}`, filter.toUpperCase())}
          </Button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={
            servers.length === 0 ? <Server className="size-10" /> : <Search className="size-10" />
          }
          title={servers.length === 0 ? t('mcpServers.noServers') : t('mcpServers.noResults')}
        />
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
