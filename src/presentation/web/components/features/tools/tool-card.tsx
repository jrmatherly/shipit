'use client';

import { useState, useTransition } from 'react';
import {
  LoaderCircle,
  Rocket,
  Download,
  CircleX,
  Circle,
  CircleCheck,
  Package,
  Info,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { ToolDetailDrawer } from './tool-detail-drawer';
import type { ToolItem } from '@shipit-ai/core/application/use-cases/tools/list-tools.use-case';

export interface ToolCardProps {
  tool: ToolItem;
  onRefresh?: () => Promise<void>;
  className?: string;
}

/*
 * Tag labels for the TOOL card "Tag" micro-label row.
 * The tool-detail drawer keeps its own richer tag config (with icons) for its
 * detail view. This map is intentionally small — just label mapping.
 */
const TAG_LABELS: Record<string, string> = {
  ide: 'IDE',
  'cli-agent': 'CLI Agent',
  vcs: 'VCS',
  terminal: 'Terminal',
};

export function ToolCard({ tool, onRefresh, className }: ToolCardProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [autoStartInstall, setAutoStartInstall] = useState(false);
  const [isPending, startTransition] = useTransition();

  const isInstalled = tool.status.status === 'available';
  const isError = tool.status.status === 'error';
  const canLaunch = isInstalled && Boolean(tool.openDirectory);

  function handleLaunch(e: React.MouseEvent) {
    e.stopPropagation();
    startTransition(async () => {
      await fetch(`/api/tools/${tool.id}/launch`, { method: 'POST' });
    });
  }

  function handleCardClick() {
    setAutoStartInstall(false);
    setDrawerOpen(true);
  }

  function handleInstallClick(e: React.MouseEvent) {
    e.stopPropagation();
    setAutoStartInstall(tool.autoInstall);
    setDrawerOpen(true);
  }

  return (
    <>
      {/*
       * Tool card — editorial refresh per Stitch developer-portal pattern.
       * Layout mirrors .scratchpad/stitch/shipit-developer-portal/src/components/ToolCard.tsx:
       *  - editorial-shadow ring for subtle lift
       *  - icon in a ringed tile (not bare)
       *  - VENDOR / ACTION micro-labels in uppercase 10px tracking-wider
       *  - full-width primary action button at card footer with hover lift
       *  - hover state uses ring upgrade + translate-y instead of just shadow
       * Install/launch functional logic is unchanged — only visuals.
       */}
      <div
        data-testid="tool-card"
        onClick={handleCardClick}
        className={cn(
          'bg-card editorial-shadow group flex w-full cursor-pointer flex-col gap-4 rounded-xl p-5',
          'transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md hover:ring-slate-300 dark:hover:ring-slate-600',
          className
        )}
      >
        {/* Top row: icon tile + name/tags */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-slate-100 p-2 ring-1 ring-slate-200/50 dark:bg-slate-800 dark:ring-slate-700/50">
              {tool.iconUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={tool.iconUrl} alt="" width={28} height={28} className="h-full w-full" />
              ) : (
                <Package className="text-muted-foreground h-full w-full" />
              )}
            </div>
            <div className="min-w-0">
              <h3
                data-testid="tool-card-name"
                className="text-foreground truncate text-sm leading-tight font-bold tracking-tight"
              >
                {tool.name}
              </h3>
              {/*
               * Vendor line — Stitch editorial pattern: tiny uppercase eyebrow
               * label + vendor name. Prefer tool.author (populated in every
               * tool JSON); fall back to joined tag labels only for the rare
               * case where an author is not set.
               */}
              {tool.author ? (
                <div className="mt-1 flex items-center gap-1.5">
                  <span
                    data-testid="tool-card-vendor-label"
                    className="text-[9px] font-bold tracking-wider text-slate-400 uppercase"
                  >
                    Vendor
                  </span>
                  <span
                    data-testid="tool-card-vendor"
                    className="text-muted-foreground truncate text-xs font-medium"
                  >
                    {tool.author}
                  </span>
                </div>
              ) : tool.tags.length > 0 ? (
                <div className="mt-1 flex items-center gap-1.5">
                  <span className="text-[9px] font-bold tracking-wider text-slate-400 uppercase">
                    Tag
                  </span>
                  <span
                    data-testid="tool-card-tags"
                    className="text-muted-foreground truncate text-xs font-medium"
                  >
                    {tool.tags.map((tag) => TAG_LABELS[tag] ?? tag).join(' · ')}
                  </span>
                </div>
              ) : null}
            </div>
          </div>
          {/* Top-right badges: status indicator + optional Required badge */}
          <div className="flex shrink-0 items-center gap-2">
            {isError && tool.status.status === 'error' ? (
              <span
                className="flex items-center gap-1 text-[10px] font-medium text-red-600 dark:text-red-400"
                title={tool.status.errorMessage}
              >
                <CircleX className="h-3 w-3 shrink-0" />
                Error
              </span>
            ) : isInstalled ? (
              <span className="flex items-center gap-1 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                <CircleCheck className="h-3 w-3" />
                Installed
              </span>
            ) : (
              <span className="text-muted-foreground flex items-center gap-1 text-[10px] font-medium">
                <Circle className="h-3 w-3" />
                Not installed
              </span>
            )}
            {tool.required ? (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[9px] font-bold tracking-wider text-amber-700 uppercase dark:bg-amber-900/40 dark:text-amber-400">
                      Required
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    This tool is required for ShipIT to function properly
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ) : null}
          </div>
        </div>

        {/* Summary */}
        <p
          data-testid="tool-card-summary"
          className="text-muted-foreground -mt-2 line-clamp-2 text-xs leading-relaxed"
        >
          {tool.summary}
        </p>

        {/* Bottom: full-width action button */}
        <div className="mt-auto flex flex-col gap-1.5">
          {/*
           * Action button — full width, Stitch editorial treatment.
           * Every state renders a CTA (never an empty dashed placeholder)
           * so the card is always actionable. States:
           *  - installed + launchable → primary Launch
           *  - installed + not launchable (terminals/shells) → outline Details (opens drawer)
           *  - not installed + healthy → primary Install
           *  - error → outline Details with error icon (opens drawer to show full error)
           */}
          {isInstalled && canLaunch ? (
            <Button
              variant="default"
              onClick={handleLaunch}
              disabled={isPending}
              aria-label={`Launch ${tool.name}`}
              data-testid="tool-card-launch-button"
              className="h-9 w-full cursor-pointer rounded-lg text-xs font-bold tracking-wide transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md"
            >
              {isPending ? (
                <LoaderCircle className="me-1 h-3.5 w-3.5 animate-spin" />
              ) : (
                <Rocket className="me-1 h-3.5 w-3.5" />
              )}
              Launch
            </Button>
          ) : !isInstalled && !isError ? (
            <Button
              variant="default"
              onClick={handleInstallClick}
              aria-label={`Install ${tool.name}`}
              data-testid="tool-card-install-button"
              className="h-9 w-full cursor-pointer rounded-lg text-xs font-bold tracking-wide transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md"
            >
              <Download className="me-1 h-3.5 w-3.5" />
              Install
            </Button>
          ) : isError ? (
            <Button
              variant="outline"
              onClick={(e) => {
                e.stopPropagation();
                setAutoStartInstall(false);
                setDrawerOpen(true);
              }}
              aria-label={`View error details for ${tool.name}`}
              data-testid="tool-card-error-button"
              className="h-9 w-full cursor-pointer rounded-lg border-red-300 text-xs font-bold tracking-wide text-red-600 transition-all duration-300 hover:-translate-y-0.5 hover:bg-red-50 hover:shadow-md dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/30"
            >
              <AlertTriangle className="me-1 h-3.5 w-3.5" />
              View Error
            </Button>
          ) : (
            <Button
              variant="outline"
              onClick={(e) => {
                e.stopPropagation();
                setAutoStartInstall(false);
                setDrawerOpen(true);
              }}
              aria-label={`View details for ${tool.name}`}
              data-testid="tool-card-details-button"
              className="h-9 w-full cursor-pointer rounded-lg text-xs font-bold tracking-wide transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md"
            >
              <Info className="me-1 h-3.5 w-3.5" />
              View Details
            </Button>
          )}
        </div>
      </div>

      <ToolDetailDrawer
        tool={tool}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onRefresh={onRefresh}
        autoStart={autoStartInstall}
      />
    </>
  );
}
