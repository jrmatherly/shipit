'use client';

import { BaseDrawer } from '@/components/common/base-drawer';
import { DrawerTitle, DrawerDescription } from '@/components/ui/drawer';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ExternalLink } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type {
  PluginMarketplaceEntry,
  InstalledPlugin,
} from '@shipit-ai/core/application/ports/output/services/plugin-marketplace.interface';

export interface PluginDetailDrawerProps {
  plugin: PluginMarketplaceEntry | null;
  installed?: InstalledPlugin;
  open: boolean;
  onClose: () => void;
  onInstall?: (pluginName: string) => void;
  onUninstall?: (pluginName: string) => void;
}

function getSourceUrl(plugin: PluginMarketplaceEntry): string | null {
  const { source } = plugin;
  if (source.source === 'github' && source.repo) {
    return `https://github.com/${source.repo}`;
  }
  if ((source.source === 'url' || source.source === 'git-subdir') && source.url) {
    try {
      const url = new URL(source.url);
      if (url.protocol === 'https:') return source.url;
    } catch {
      // Invalid URL — don't render as link
    }
  }
  return null;
}

export function PluginDetailDrawer({
  plugin,
  installed,
  open,
  onClose,
  onInstall,
  onUninstall,
}: PluginDetailDrawerProps) {
  const { t } = useTranslation('web');

  if (!plugin) return null;

  const sourceUrl = getSourceUrl(plugin);

  return (
    <BaseDrawer open={open} onClose={onClose}>
      <DrawerTitle className="text-foreground text-lg font-bold tracking-tight">
        {plugin.name}
      </DrawerTitle>
      <DrawerDescription className="text-muted-foreground mt-1 text-sm">
        {plugin.description}
      </DrawerDescription>

      <Separator className="my-4" />

      <div className="space-y-3">
        {plugin.version ? (
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground text-sm">{t('plugins.version')}</span>
            <span className="font-mono text-sm">v{plugin.version}</span>
          </div>
        ) : null}

        {plugin.category ? (
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground text-sm">{t('plugins.category')}</span>
            <Badge variant="outline">{plugin.category}</Badge>
          </div>
        ) : null}

        {sourceUrl ? (
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground text-sm">{t('plugins.source')}</span>
            <a
              href={sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:text-primary/80 inline-flex items-center gap-1 text-sm underline underline-offset-2"
            >
              {plugin.source.repo ?? 'Repository'}
              <ExternalLink className="size-3" />
            </a>
          </div>
        ) : null}

        {plugin.keywords && plugin.keywords.length > 0 ? (
          <div className="flex flex-wrap gap-1.5 pt-2">
            {plugin.keywords.map((kw) => (
              <Badge key={kw} variant="outline" className="text-xs">
                {kw}
              </Badge>
            ))}
          </div>
        ) : null}
      </div>

      <Separator className="my-4" />

      <div className="flex gap-2">
        {installed ? (
          <Button
            variant="destructive"
            size="sm"
            onClick={() => onUninstall?.(plugin.name)}
            data-testid="plugin-uninstall-button"
          >
            {t('plugins.uninstall')}
          </Button>
        ) : (
          <Button
            size="sm"
            onClick={() => onInstall?.(plugin.name)}
            data-testid="plugin-install-button"
          >
            {t('plugins.install')}
          </Button>
        )}
      </div>
    </BaseDrawer>
  );
}
