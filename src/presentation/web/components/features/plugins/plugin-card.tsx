'use client';

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import type {
  PluginMarketplaceEntry,
  InstalledPlugin,
} from '@shipit-ai/core/application/ports/output/services/plugin-marketplace.interface';
import { useTranslation } from 'react-i18next';

export interface PluginCardProps {
  plugin: PluginMarketplaceEntry;
  installed?: InstalledPlugin;
  onSelect: (plugin: PluginMarketplaceEntry) => void;
  onToggle?: (pluginName: string, enabled: boolean) => void;
}

export function PluginCard({ plugin, installed, onSelect, onToggle }: PluginCardProps) {
  const { t } = useTranslation('web');

  return (
    <Card
      className="cursor-pointer p-5 transition-all duration-300 hover:scale-[1.02] hover:shadow-md hover:ring-slate-300 dark:hover:ring-slate-600"
      role="button"
      tabIndex={0}
      onClick={() => onSelect(plugin)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(plugin);
        }
      }}
      data-testid={`plugin-card-${plugin.name}`}
    >
      <h3 className="text-foreground text-sm leading-tight font-bold tracking-tight">
        {plugin.name}
      </h3>

      {plugin.version ? (
        <p className="text-muted-foreground mt-1 font-mono text-xs">v{plugin.version}</p>
      ) : null}

      <p className="text-muted-foreground mt-3 line-clamp-2 text-xs leading-relaxed">
        {plugin.description}
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-1.5">
        {plugin.category ? <Badge variant="outline">{plugin.category}</Badge> : null}
        {installed ? (
          <Badge variant="secondary">{t('plugins.installed')}</Badge>
        ) : (
          <Badge variant="outline" className="opacity-50">
            {t('plugins.notInstalled')}
          </Badge>
        )}
      </div>

      {installed ? (
        <div
          className="mt-3 flex items-center gap-2"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        >
          <Switch
            checked={installed.enabled}
            onCheckedChange={(checked) => onToggle?.(plugin.name, checked)}
            data-testid={`plugin-toggle-${plugin.name}`}
          />
          <span className="text-muted-foreground text-xs">
            {installed.enabled ? t('plugins.disable') : t('plugins.enable')}
          </span>
        </div>
      ) : null}
    </Card>
  );
}
