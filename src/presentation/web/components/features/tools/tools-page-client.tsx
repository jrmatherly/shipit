'use client';

import { useState, useCallback, useMemo } from 'react';
import { Wrench, Search } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ToolCard } from './tool-card';
import type { ToolItem } from '@shipit-ai/core/application/use-cases/tools/list-tools.use-case';

export interface ToolsPageClientProps {
  tools: ToolItem[];
  className?: string;
}

type TabValue = 'all' | 'ide' | 'cli-agent' | 'vcs' | 'terminal';
type StatusFilter = 'available' | 'missing' | null;

const TAB_FILTER: Record<TabValue, (tool: ToolItem) => boolean> = {
  all: () => true,
  ide: (tool) => tool.tags.includes('ide'),
  'cli-agent': (tool) => tool.tags.includes('cli-agent'),
  vcs: (tool) => tool.tags.includes('vcs'),
  terminal: (tool) => tool.tags.includes('terminal'),
};

export function ToolsPageClient({ tools: initialTools, className }: ToolsPageClientProps) {
  const [tools, setTools] = useState<ToolItem[]>(initialTools);
  const [activeTab, setActiveTab] = useState<TabValue>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(null);

  const refreshTools = useCallback(async () => {
    try {
      const res = await fetch('/api/tools');
      if (res.ok) {
        const updated = (await res.json()) as ToolItem[];
        setTools(updated);
      }
    } catch {
      // Silently ignore refresh errors; user can re-navigate to refresh
    }
  }, []);

  const filtered = useMemo(() => {
    const query = searchQuery.toLowerCase();
    return tools.filter((tool) => {
      if (!TAB_FILTER[activeTab](tool)) return false;
      if (statusFilter && tool.status.status !== statusFilter) return false;
      if (query) {
        const matchesName = tool.name.toLowerCase().includes(query);
        const matchesSummary = tool.summary.toLowerCase().includes(query);
        if (!matchesName && !matchesSummary) return false;
      }
      return true;
    });
  }, [tools, activeTab, searchQuery, statusFilter]);

  const installedCount = tools.filter((t) => t.status.status === 'available').length;

  return (
    <div data-testid="tools-page-client" className={cn('space-y-8', className)}>
      {/*
       * Editorial page header — Stitch-style typographic rhythm:
       *  - tiny uppercase eyebrow label (DEVELOPER PORTAL)
       *  - large bold title with tight tracking
       *  - muted helper line below
       * See .scratchpad/stitch/shipit-developer-portal/src/App.tsx:161
       * for the h2 category header pattern.
       */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold tracking-[0.2em] text-slate-400 uppercase">
            Developer Portal
          </span>
        </div>
        <div className="flex items-baseline gap-3">
          <h1 className="text-foreground text-3xl font-black tracking-tight">Tools</h1>
          <span className="text-muted-foreground text-sm font-medium">
            {installedCount} of {tools.length} installed
          </span>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
        <Input
          placeholder="Search tools..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="ps-9"
          data-testid="tool-search"
        />
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as TabValue)}
        data-testid="tools-page-tabs"
      >
        {/*
         * Tabs list — Stitch editorial filter-group pattern.
         *
         * The TabsList container sits on bg-card with editorial-shadow (a lifted
         * card feel that reads against the page --color-background).
         *
         * The active-trigger styling (bg-muted + text-primary + ring lift) lives
         * in globals.css as an attribute selector on [role="tab"][data-state="active"]
         * instead of a conditional className here. This is the same hydration-safe
         * pattern used by SidebarNavItem's active state (globals.css selector on
         * [data-sidebar="menu-button"][data-active="true"]). Moving styling to CSS
         * avoids class-generation drift between the server bundle and client HMR
         * bundle during dev, which was causing a hydration mismatch on this page.
         *
         * Tab trigger classNames here are STATIC string literals so the hydrated
         * className is byte-identical between SSR and first client render.
         */}
        <TabsList data-editorial="true" className="bg-card editorial-shadow h-10 p-1">
          <TabsTrigger
            value="all"
            data-testid="tools-tab-all"
            className="cursor-pointer px-4 text-xs font-bold"
          >
            All
          </TabsTrigger>
          <TabsTrigger
            value="ide"
            data-testid="tools-tab-ide"
            className="cursor-pointer px-4 text-xs font-bold"
          >
            IDEs
          </TabsTrigger>
          <TabsTrigger
            value="cli-agent"
            data-testid="tools-tab-cli-agent"
            className="cursor-pointer px-4 text-xs font-bold"
          >
            CLI Agents
          </TabsTrigger>
          <TabsTrigger
            value="vcs"
            data-testid="tools-tab-vcs"
            className="cursor-pointer px-4 text-xs font-bold"
          >
            Version Control
          </TabsTrigger>
          <TabsTrigger
            value="terminal"
            data-testid="tools-tab-terminal"
            className="cursor-pointer px-4 text-xs font-bold"
          >
            Terminals
          </TabsTrigger>
        </TabsList>

        {/* Status filter pills */}
        <div className="mt-4 flex flex-wrap gap-2" data-testid="tools-status-filter">
          <Button
            variant={statusFilter === null ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter(null)}
          >
            All
          </Button>
          <Button
            variant={statusFilter === 'available' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter('available')}
          >
            Installed
          </Button>
          <Button
            variant={statusFilter === 'missing' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter('missing')}
          >
            Not Installed
          </Button>
        </div>

        <TabsContent value={activeTab} className="mt-6">
          {filtered.length === 0 ? (
            <div
              data-testid="tools-page-empty"
              className="text-muted-foreground flex flex-col items-center justify-center py-16 text-center"
            >
              <Wrench className="mb-3 h-8 w-8 opacity-20" />
              <p className="text-sm">No tools in this category.</p>
            </div>
          ) : (
            <div
              data-testid="tools-page-grid"
              // Editorial density: 3 columns max so cards stay wide enough to
              // give the Stitch "magazine" feel. Previously xl:grid-cols-4 which
              // squeezed cards and reduced background-vs-card contrast.
              className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3"
            >
              {filtered.map((tool) => (
                <ToolCard key={tool.id} tool={tool} onRefresh={refreshTools} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
