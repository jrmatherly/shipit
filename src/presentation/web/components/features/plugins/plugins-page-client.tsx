'use client';

import { useState, useMemo, useEffect, useTransition } from 'react';
import { Search, Blocks, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/common/page-header';
import { EmptyState } from '@/components/common/empty-state';
import { PluginCard } from './plugin-card';
import { PluginDetailDrawer } from './plugin-detail-drawer';
import { useTranslation } from 'react-i18next';
import { fetchPluginCatalogAction } from '@/app/actions/fetch-plugin-catalog';
import { installPluginAction } from '@/app/actions/install-plugin';
import { uninstallPluginAction } from '@/app/actions/uninstall-plugin';
import { togglePluginAction } from '@/app/actions/toggle-plugin';
import type {
  PluginMarketplaceEntry,
  InstalledPlugin,
} from '@shipit-ai/core/application/ports/output/services/plugin-marketplace.interface';

export interface PluginsPageClientProps {
  proxyConfigured: boolean;
}

export function PluginsPageClient({ proxyConfigured }: PluginsPageClientProps) {
  const { t } = useTranslation('web');
  const [, startTransition] = useTransition();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [selectedPlugin, setSelectedPlugin] = useState<PluginMarketplaceEntry | null>(null);
  const [plugins, setPlugins] = useState<PluginMarketplaceEntry[]>([]);
  const [installedPlugins, setInstalledPlugins] = useState<InstalledPlugin[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!proxyConfigured) {
      setLoading(false);
      return;
    }
    fetchPluginCatalogAction().then((result) => {
      setPlugins(result.plugins);
      setInstalledPlugins(result.installedPlugins);
      setLoading(false);
    });
  }, [proxyConfigured]);

  const categories = useMemo(() => {
    const cats = new Set<string>();
    for (const p of plugins) {
      if (p.category) cats.add(p.category);
    }
    return Array.from(cats).sort();
  }, [plugins]);

  const filteredPlugins = useMemo(() => {
    const query = searchQuery.toLowerCase();
    return plugins.filter((p) => {
      if (activeCategory && p.category !== activeCategory) return false;
      if (query) {
        const matchesName = p.name.toLowerCase().includes(query);
        const matchesDescription = p.description.toLowerCase().includes(query);
        if (!matchesName && !matchesDescription) return false;
      }
      return true;
    });
  }, [plugins, searchQuery, activeCategory]);

  const getInstalled = (pluginName: string) =>
    installedPlugins.find((ip) => ip.id.startsWith(`${pluginName}@`));

  const handleInstall = (pluginName: string) => {
    startTransition(async () => {
      const result = await installPluginAction(pluginName, 'default');
      if (result.success) {
        toast.success(`${pluginName} installed`);
        const catalog = await fetchPluginCatalogAction();
        setInstalledPlugins(catalog.installedPlugins);
      } else {
        toast.error(result.error ?? 'Installation failed');
      }
    });
  };

  const handleUninstall = (pluginName: string) => {
    startTransition(async () => {
      const result = await uninstallPluginAction(pluginName, 'default');
      if (result.success) {
        toast.success(`${pluginName} uninstalled`);
        const catalog = await fetchPluginCatalogAction();
        setInstalledPlugins(catalog.installedPlugins);
      } else {
        toast.error(result.error ?? 'Uninstallation failed');
      }
    });
  };

  const handleToggle = (pluginName: string, enabled: boolean) => {
    startTransition(async () => {
      const result = await togglePluginAction(pluginName, 'default', enabled);
      if (result.success) {
        toast.success(`${pluginName} ${enabled ? 'enabled' : 'disabled'}`);
        const catalog = await fetchPluginCatalogAction();
        setInstalledPlugins(catalog.installedPlugins);
      } else {
        toast.error(result.error ?? 'Toggle failed');
      }
    });
  };

  if (!proxyConfigured) {
    return (
      <div className="flex flex-col gap-8 p-8">
        <PageHeader eyebrow="Developer Portal" title={t('plugins.title')} />
        <EmptyState icon={<AlertCircle className="size-10" />} title={t('plugins.noProxy')} />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-8 p-8">
        <PageHeader eyebrow="Developer Portal" title={t('plugins.title')} />
        <div className="text-muted-foreground text-center text-sm">Loading...</div>
      </div>
    );
  }

  if (plugins.length === 0) {
    return (
      <div className="flex flex-col gap-8 p-8">
        <PageHeader eyebrow="Developer Portal" title={t('plugins.title')} />
        <EmptyState icon={<Blocks className="size-10" />} title={t('plugins.emptyState')} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 p-8">
      <PageHeader eyebrow="Developer Portal" title={t('plugins.title')} />

      {/* Search */}
      <div className="relative">
        <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
        <Input
          placeholder={t('plugins.searchPlaceholder')}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="ps-9"
          data-testid="plugin-search"
        />
      </div>

      {/* Category filter pills */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant={activeCategory === null ? 'default' : 'outline'}
          size="sm"
          onClick={() => setActiveCategory(null)}
        >
          {t('plugins.allCategories')}
        </Button>
        {categories.map((cat) => (
          <Button
            key={cat}
            variant={activeCategory === cat ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveCategory(cat === activeCategory ? null : cat)}
          >
            {cat}
          </Button>
        ))}
      </div>

      {/* Plugin grid */}
      {filteredPlugins.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredPlugins.map((plugin) => (
            <PluginCard
              key={plugin.name}
              plugin={plugin}
              installed={getInstalled(plugin.name)}
              onSelect={setSelectedPlugin}
              onToggle={handleToggle}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<Search className="size-10" />}
          title={t('plugins.emptyState')}
          action={
            <Button
              variant="outline"
              onClick={() => {
                setSearchQuery('');
                setActiveCategory(null);
              }}
            >
              Clear filters
            </Button>
          }
        />
      )}

      {/* Detail drawer */}
      <PluginDetailDrawer
        plugin={selectedPlugin}
        installed={selectedPlugin ? getInstalled(selectedPlugin.name) : undefined}
        open={!!selectedPlugin}
        onClose={() => setSelectedPlugin(null)}
        onInstall={handleInstall}
        onUninstall={handleUninstall}
      />
    </div>
  );
}
