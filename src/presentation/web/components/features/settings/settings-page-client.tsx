'use client';

import { useState, useEffect } from 'react';
import {
  Bot,
  Terminal,
  GitBranch,
  Activity,
  Bell,
  Flag,
  Database,
  Timer,
  MessageSquare,
  LayoutGrid,
  LayoutList,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { AgentSettingsSection } from './agent-settings-section';
import { EnvironmentSettingsSection } from './environment-settings-section';
import { WorkflowSettingsSection } from './workflow-settings-section';
import { CiSettingsSection } from './ci-settings-section';
import { StageTimeoutsSettingsSection } from './stage-timeouts-settings-section';
import { NotificationSettingsSection } from './notification-settings-section';
import { FeatureFlagsSettingsSection } from './feature-flags-settings-section';
import { InteractiveAgentSettingsSection } from './interactive-agent-settings-section';
import { FabLayoutSettingsSection } from './fab-layout-settings-section';
import { DatabaseSettingsSection } from './database-settings-section';
import type { Settings } from '@shipit-ai/core/domain/generated/output';
import type { AvailableTerminal } from '@/app/actions/get-available-terminals';
import type { AvailableEditor } from '@/app/actions/get-available-editors';
import type { AvailableShell } from '@/app/actions/get-available-shells';

const SECTIONS = [
  { id: 'agent', labelKey: 'settings.sections.agent', icon: Bot },
  { id: 'environment', labelKey: 'settings.sections.environment', icon: Terminal },
  { id: 'workflow', labelKey: 'settings.sections.workflow', icon: GitBranch },
  { id: 'ci', labelKey: 'settings.sections.ci', icon: Activity },
  { id: 'stage-timeouts', labelKey: 'settings.sections.timeouts', icon: Timer },
  { id: 'notifications', labelKey: 'settings.sections.notifications', icon: Bell },
  { id: 'feature-flags', labelKey: 'settings.sections.flags', icon: Flag },
  { id: 'interactive-agent', labelKey: 'settings.sections.chat', icon: MessageSquare },
  { id: 'fab-layout', labelKey: 'settings.sections.layout', icon: LayoutGrid },
  { id: 'database', labelKey: 'settings.sections.database', icon: Database },
] as const;

const TABS = [{ id: 'all', labelKey: 'settings.sections.all', icon: LayoutList }, ...SECTIONS];

export interface SettingsPageClientProps {
  settings: Settings;
  shipitAiHome: string;
  dbFileSize: string;
  availableTerminals?: AvailableTerminal[];
  availableEditors?: AvailableEditor[];
  availableShells?: AvailableShell[];
}

export function SettingsPageClient({
  settings,
  shipitAiHome,
  dbFileSize,
  availableTerminals,
  availableEditors,
  availableShells,
}: SettingsPageClientProps) {
  const { t } = useTranslation('web');
  const [activeTab, setActiveTab] = useState<string>('all');
  const [visibleSection, setVisibleSection] = useState<string>('agent');

  // Track which section is in view via IntersectionObserver (only on "All" tab)
  useEffect(() => {
    if (activeTab !== 'all') return;

    const els = SECTIONS.map((s) => document.getElementById(`section-${s.id}`)).filter(
      Boolean
    ) as HTMLElement[];
    if (els.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setVisibleSection(entry.target.id.replace('section-', ''));
          }
        }
      },
      { rootMargin: '-65px 0px -60% 0px', threshold: 0 }
    );

    for (const el of els) observer.observe(el);
    return () => observer.disconnect();
  }, [activeTab]);

  return (
    <div data-testid="settings-page-client" className="max-w-5xl px-8 pt-8">
      {/* Sticky header -- editorial title + tab nav */}
      <div className="bg-background/95 supports-backdrop-filter:bg-background/80 sticky top-0 z-10 pb-4 backdrop-blur">
        {/* Title row with editorial treatment */}
        <div className="mb-4 space-y-1.5">
          <span className="text-[10px] font-bold tracking-[0.2em] text-slate-400 uppercase">
            Developer Portal
          </span>
          <div className="flex items-baseline gap-3">
            <h1 className="text-foreground text-3xl font-black tracking-tight">
              {t('settings.title')}
            </h1>
          </div>
        </div>
        {/* Tab navigation -- editorial tab treatment */}
        <nav className="bg-card editorial-shadow flex flex-wrap items-center gap-0.5 rounded-lg p-1">
          {TABS.map((tab) => {
            const TabIcon = tab.icon;
            const isActive =
              activeTab === tab.id ||
              (activeTab === 'all' && tab.id !== 'all' && visibleSection === tab.id);
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex cursor-pointer items-center gap-1 rounded-md px-2 py-1.5 text-[11px] font-bold transition-all',
                  isActive
                    ? 'bg-muted text-primary shadow-sm ring-1 ring-slate-200/70 dark:ring-slate-700/50'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
                )}
              >
                <TabIcon className="h-3 w-3" />
                <span className="hidden sm:inline">{t(tab.labelKey)}</span>
              </button>
            );
          })}
        </nav>
      </div>

      <div className="flex flex-col gap-3">
        {/* -- Agent -- */}
        {(activeTab === 'all' || activeTab === 'agent') && (
          <div id="section-agent" className="scroll-mt-18 rounded-lg">
            <AgentSettingsSection settings={settings} />
          </div>
        )}

        {/* -- Environment -- */}
        {(activeTab === 'all' || activeTab === 'environment') && (
          <div id="section-environment" className="scroll-mt-18 rounded-lg">
            <EnvironmentSettingsSection
              settings={settings}
              availableEditors={availableEditors}
              availableShells={availableShells}
              availableTerminals={availableTerminals}
            />
          </div>
        )}

        {/* -- Workflow -- */}
        {(activeTab === 'all' || activeTab === 'workflow') && (
          <div id="section-workflow" className="scroll-mt-18 rounded-lg">
            <WorkflowSettingsSection settings={settings} />
          </div>
        )}

        {/* -- CI -- */}
        {(activeTab === 'all' || activeTab === 'ci') && (
          <div id="section-ci" className="scroll-mt-18 rounded-lg">
            <CiSettingsSection settings={settings} />
          </div>
        )}

        {/* -- Stage Timeouts -- */}
        {(activeTab === 'all' || activeTab === 'stage-timeouts') && (
          <div id="section-stage-timeouts" className="scroll-mt-18 rounded-lg">
            <StageTimeoutsSettingsSection settings={settings} />
          </div>
        )}

        {/* -- Notifications -- */}
        {(activeTab === 'all' || activeTab === 'notifications') && (
          <div id="section-notifications" className="scroll-mt-18 rounded-lg">
            <NotificationSettingsSection settings={settings} />
          </div>
        )}

        {/* -- Feature Flags -- */}
        {(activeTab === 'all' || activeTab === 'feature-flags') && (
          <div id="section-feature-flags" className="scroll-mt-18 rounded-lg">
            <FeatureFlagsSettingsSection settings={settings} />
          </div>
        )}

        {/* -- Interactive Agent -- */}
        {(activeTab === 'all' || activeTab === 'interactive-agent') && (
          <div id="section-interactive-agent" className="scroll-mt-18 rounded-lg">
            <InteractiveAgentSettingsSection settings={settings} />
          </div>
        )}

        {/* -- FAB Layout -- */}
        {(activeTab === 'all' || activeTab === 'fab-layout') && (
          <div id="section-fab-layout" className="scroll-mt-18 rounded-lg">
            <FabLayoutSettingsSection settings={settings} />
          </div>
        )}

        {/* -- Database -- */}
        {(activeTab === 'all' || activeTab === 'database') && (
          <div id="section-database" className="scroll-mt-18 rounded-lg">
            <DatabaseSettingsSection shipitAiHome={shipitAiHome} dbFileSize={dbFileSize} />
          </div>
        )}
      </div>
    </div>
  );
}
