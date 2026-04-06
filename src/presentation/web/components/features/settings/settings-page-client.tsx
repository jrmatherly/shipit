'use client';

import { useState, useTransition, useRef, useEffect, useCallback } from 'react';
import {
  Check,
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
} from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { updateSettingsAction } from '@/app/actions/update-settings';
import {
  type AgentType,
  type EditorType,
  TerminalType,
} from '@shipit-ai/core/domain/generated/output';
import { getEditorTypeIcon } from '@/components/common/editor-type-icons';
import { AgentModelPicker } from '@/components/features/settings/AgentModelPicker';
import { CiSettingsSection } from '@/components/features/settings/ci-settings-section';
import { StageTimeoutsSettingsSection } from '@/components/features/settings/stage-timeouts-settings-section';
import { InteractiveAgentSettingsSection } from '@/components/features/settings/interactive-agent-settings-section';
import { FabLayoutSettingsSection } from '@/components/features/settings/fab-layout-settings-section';
import {
  SettingsSection,
  SettingsRow,
  SwitchRow,
  NumberStepper,
  SubsectionLabel,
} from '@/components/features/settings/settings-section-utils';
import type {
  Settings,
  FeatureFlags,
  NotificationPreferences,
} from '@shipit-ai/core/domain/generated/output';
import type { AvailableTerminal } from '@/app/actions/get-available-terminals';
import type { AvailableEditor } from '@/app/actions/get-available-editors';
import type { AvailableShell } from '@/app/actions/get-available-shells';

const DEFAULT_EDITOR_OPTIONS: AvailableEditor[] = [
  { id: 'vscode', name: 'VS Code', available: true },
  { id: 'cursor', name: 'Cursor', available: true },
  { id: 'windsurf', name: 'Windsurf', available: true },
  { id: 'zed', name: 'Zed', available: true },
  { id: 'antigravity', name: 'Antigravity', available: true },
];

const DEFAULT_SHELL_OPTIONS: AvailableShell[] = [
  { id: 'bash', name: 'Bash', available: true },
  { id: 'zsh', name: 'Zsh', available: true },
  { id: 'fish', name: 'Fish', available: true },
];

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

export interface SettingsPageClientProps {
  settings: Settings;
  shipitAiHome: string;
  dbFileSize: string;
  availableTerminals?: AvailableTerminal[];
  availableEditors?: AvailableEditor[];
  availableShells?: AvailableShell[];
}

function useSaveIndicator() {
  const { t } = useTranslation('web');
  const [isPending, startTransition] = useTransition();
  const [showSaving, setShowSaving] = useState(false);
  const [showSaved, setShowSaved] = useState(false);
  const minTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingDoneRef = useRef(false);

  // Show "Saving..." with a minimum display time of 600ms
  useEffect(() => {
    if (isPending && !showSaving) {
      setShowSaving(true);
      pendingDoneRef.current = false;
      minTimerRef.current = setTimeout(() => {
        minTimerRef.current = null;
        if (pendingDoneRef.current) {
          setShowSaving(false);
          setShowSaved(true);
          setTimeout(() => setShowSaved(false), 2000);
        }
      }, 350);
    }
    if (!isPending && showSaving) {
      pendingDoneRef.current = true;
      // If min timer already elapsed, transition now
      if (!minTimerRef.current) {
        setShowSaving(false);
        setShowSaved(true);
        setTimeout(() => setShowSaved(false), 2000);
      }
    }
  }, [isPending, showSaving]);

  const save = useCallback(
    (payload: Record<string, unknown>) => {
      startTransition(async () => {
        const result = await updateSettingsAction(payload);
        if (!result.success) {
          toast.error(result.error ?? t('settings.failedToSave'));
        }
      });
    },
    [startTransition, t]
  );

  return { showSaving, showSaved, save };
}

/* ── Main component ── */

export function SettingsPageClient({
  settings,
  shipitAiHome,
  dbFileSize,
  availableTerminals,
  availableEditors,
  availableShells,
}: SettingsPageClientProps) {
  const { t } = useTranslation('web');
  const { showSaving, showSaved, save } = useSaveIndicator();
  const featureFlags = settings.featureFlags ?? {
    skills: false,
    envDeploy: false,
    debug: false,
    githubImport: false,
    adoptBranch: false,
    gitRebaseSync: false,
    reactFileManager: false,
  };

  // Agent state
  const [agentType, setAgentType] = useState(settings.agent.type);

  // Environment state
  const [editor, setEditor] = useState(settings.environment.defaultEditor);
  const [shell, setShell] = useState(settings.environment.shellPreference);
  const [terminal, setTerminal] = useState(
    settings.environment.terminalPreference ?? TerminalType.System
  );

  const terminalOptions = availableTerminals ?? [
    {
      id: TerminalType.System,
      name: t('settings.environment.systemTerminal'),
      available: true as const,
    },
  ];

  const editorOptions = availableEditors ?? DEFAULT_EDITOR_OPTIONS;
  const shellOptions = availableShells ?? DEFAULT_SHELL_OPTIONS;

  // Workflow state
  const [openPr, setOpenPr] = useState(settings.workflow.openPrOnImplementationComplete);
  const [pushOnComplete, setPushOnComplete] = useState(
    settings.workflow.approvalGateDefaults.pushOnImplementationComplete
  );
  const [allowPrd, setAllowPrd] = useState(settings.workflow.approvalGateDefaults.allowPrd);
  const [allowPlan, setAllowPlan] = useState(settings.workflow.approvalGateDefaults.allowPlan);
  const [allowMerge, setAllowMerge] = useState(settings.workflow.approvalGateDefaults.allowMerge);
  const [enableEvidence, setEnableEvidence] = useState(settings.workflow.enableEvidence);
  const [commitEvidence, setCommitEvidence] = useState(settings.workflow.commitEvidence);
  const [ciWatchEnabled, setCiWatchEnabled] = useState(settings.workflow.ciWatchEnabled !== false);
  const [defaultFastMode, setDefaultFastMode] = useState(
    settings.workflow.defaultFastMode !== false
  );
  // Auto-archive state
  const [autoArchiveEnabled, setAutoArchiveEnabled] = useState(
    (settings.workflow.autoArchiveDelayMinutes ?? 10) > 0
  );
  const [autoArchiveDelay, setAutoArchiveDelay] = useState(
    String(settings.workflow.autoArchiveDelayMinutes ?? 10)
  );

  // Notification state
  const [inApp, setInApp] = useState(settings.notifications.inApp.enabled);
  const [events, setEvents] = useState({ ...settings.notifications.events });

  // Feature flags state
  const [flags, setFlags] = useState<FeatureFlags>({ ...featureFlags });

  // Workflow helpers
  function buildWorkflowPayload(
    overrides: {
      openPr?: boolean;
      pushOnComplete?: boolean;
      allowPrd?: boolean;
      allowPlan?: boolean;
      allowMerge?: boolean;
      enableEvidence?: boolean;
      commitEvidence?: boolean;
      ciWatchEnabled?: boolean;
      defaultFastMode?: boolean;
      autoArchiveEnabled?: boolean;
      autoArchiveDelay?: string;
    } = {}
  ) {
    const archiveEnabled = overrides.autoArchiveEnabled ?? autoArchiveEnabled;
    const archiveDelay = parseInt(overrides.autoArchiveDelay ?? autoArchiveDelay, 10);
    return {
      workflow: {
        openPrOnImplementationComplete: overrides.openPr ?? openPr,
        approvalGateDefaults: {
          pushOnImplementationComplete: overrides.pushOnComplete ?? pushOnComplete,
          allowPrd: overrides.allowPrd ?? allowPrd,
          allowPlan: overrides.allowPlan ?? allowPlan,
          allowMerge: overrides.allowMerge ?? allowMerge,
        },
        enableEvidence: overrides.enableEvidence ?? enableEvidence,
        commitEvidence: overrides.commitEvidence ?? commitEvidence,
        ciWatchEnabled: overrides.ciWatchEnabled ?? ciWatchEnabled,
        defaultFastMode: overrides.defaultFastMode ?? defaultFastMode,
        autoArchiveDelayMinutes: archiveEnabled
          ? Number.isNaN(archiveDelay) || archiveDelay < 1
            ? 10
            : archiveDelay
          : 0,
      },
    };
  }

  // Notification helpers
  function buildNotificationPayload(
    overrides: {
      inApp?: boolean;
      events?: NotificationPreferences['events'];
    } = {}
  ) {
    return {
      notifications: {
        inApp: { enabled: overrides.inApp ?? inApp },
        events: overrides.events ?? events,
      },
    };
  }

  const [activeSection, setActiveSection] = useState<string>('agent');

  // Track which section is in view via IntersectionObserver
  useEffect(() => {
    const els = SECTIONS.map((s) => document.getElementById(`section-${s.id}`)).filter(
      Boolean
    ) as HTMLElement[];
    if (els.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id.replace('section-', ''));
          }
        }
      },
      { rootMargin: '-65px 0px -60% 0px', threshold: 0 }
    );

    for (const el of els) observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const scrollToSection = useCallback((id: string) => {
    const el = document.getElementById(`section-${id}`);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    // Flash highlight
    el.style.animation = 'none';
    // Force reflow
    void el.offsetHeight;
    el.style.animation = 'section-flash 1s ease-out';
  }, []);

  return (
    <div data-testid="settings-page-client" className="max-w-5xl px-8 pt-8">
      {/* Sticky header — editorial title + save indicator + section nav */}
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
            <span className="relative h-4 w-16">
              <span
                className={cn(
                  'text-muted-foreground absolute inset-0 flex items-center text-xs transition-opacity duration-300',
                  showSaving ? 'opacity-100' : 'opacity-0'
                )}
              >
                {t('settings.saving')}
              </span>
              <span
                className={cn(
                  'absolute inset-0 flex items-center gap-1 text-xs text-green-600 transition-opacity duration-300',
                  showSaved && !showSaving ? 'opacity-100' : 'opacity-0'
                )}
              >
                <Check className="h-3 w-3" />
                {t('settings.saved')}
              </span>
            </span>
          </div>
        </div>
        {/* Section navigation — editorial tab treatment */}
        <nav className="bg-card editorial-shadow flex flex-wrap items-center gap-0.5 rounded-lg p-1">
          {SECTIONS.map((s) => {
            const SectionIcon = s.icon;
            const isActive = activeSection === s.id;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => scrollToSection(s.id)}
                className={cn(
                  'flex cursor-pointer items-center gap-1 rounded-md px-2 py-1.5 text-[11px] font-bold transition-all',
                  isActive
                    ? 'bg-muted text-primary shadow-sm ring-1 ring-slate-200/70 dark:ring-slate-700/50'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
                )}
              >
                <SectionIcon className="h-3 w-3" />
                <span className="hidden sm:inline">{t(s.labelKey)}</span>
              </button>
            );
          })}
        </nav>
      </div>

      <div className="flex flex-col gap-3">
        {/* ── Language — hidden from UI per product decision ── */}

        {/* ── Agent ── */}
        <div id="section-agent" className="scroll-mt-18 rounded-lg">
          <SettingsSection
            icon={Bot}
            title={t('settings.agent.sectionTitle')}
            description={t('settings.agent.sectionDescription')}
            testId="agent-settings-section"
            tooltip={t('settings.agent.hint')}
            tooltipLinks={[
              {
                label: t('settings.agent.links.agentSystem'),
                href: 'https://github.com/jrmatherly/shipit/blob/main/docs/architecture/agent-system.md',
              },
              {
                label: t('settings.agent.links.addingAgents'),
                href: 'https://github.com/jrmatherly/shipit/blob/main/docs/development/adding-agents.md',
              },
              {
                label: t('settings.agent.links.configurationGuide'),
                href: 'https://github.com/jrmatherly/shipit/blob/main/docs/guides/configuration.md',
              },
            ]}
          >
            <SettingsRow
              label={t('settings.agent.agentAndModel')}
              description={t('settings.agent.agentAndModelDescription')}
              tooltip="Changing the agent switches which AI CLI tool runs your features. Each agent has different capabilities, speed, and cost tradeoffs."
              htmlFor="agent-model-picker"
            >
              <AgentModelPicker
                initialAgentType={agentType}
                initialModel={settings.models.default}
                mode="settings"
                onAgentModelChange={(newAgent) => setAgentType(newAgent as AgentType)}
                className="w-55"
              />
            </SettingsRow>
          </SettingsSection>
        </div>

        {/* ── Environment ── */}
        <div id="section-environment" className="scroll-mt-18 rounded-lg">
          <SettingsSection
            icon={Terminal}
            title={t('settings.environment.sectionTitle')}
            description={t('settings.environment.sectionDescription')}
            testId="environment-settings-section"
            tooltip={t('settings.environment.hint')}
            tooltipLinks={[
              {
                label: t('settings.environment.links.configurationGuide'),
                href: 'https://github.com/jrmatherly/shipit/blob/main/docs/guides/configuration.md',
              },
            ]}
          >
            <SettingsRow
              label={t('settings.environment.defaultEditor')}
              description={t('settings.environment.defaultEditorDescription')}
              tooltip="The editor that opens when you click 'Launch' on a tool card or when ShipIT needs to open a file for review."
              htmlFor="default-editor"
            >
              <Select
                value={editor}
                onValueChange={(v) => {
                  setEditor(v as EditorType);
                  save({
                    environment: {
                      defaultEditor: v as EditorType,
                      shellPreference: shell,
                      terminalPreference: terminal,
                    },
                  });
                }}
              >
                <SelectTrigger
                  id="default-editor"
                  data-testid="editor-select"
                  className="w-64 cursor-pointer text-xs"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {editorOptions.map((opt) => {
                    const Icon = getEditorTypeIcon(opt.id as EditorType);
                    return (
                      <SelectItem key={opt.id} value={opt.id} disabled={!opt.available}>
                        <span className="flex items-center gap-2 text-xs">
                          <Icon className="h-4 w-4 shrink-0" />
                          {opt.name}
                          <Badge
                            variant="outline"
                            className={cn(
                              'ml-auto px-1.5 py-0 text-[10px] leading-4 font-normal',
                              opt.available
                                ? 'border-emerald-500/30 text-emerald-500'
                                : 'border-muted-foreground/30 text-muted-foreground'
                            )}
                          >
                            {opt.available ? 'Installed' : 'Not Installed'}
                          </Badge>
                        </span>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </SettingsRow>
            <SettingsRow
              label={t('settings.environment.shell')}
              description={t('settings.environment.shellDescription')}
              tooltip="Controls which shell runs generated scripts like install commands and git operations. Match this to your daily driver shell."
              htmlFor="shell-preference"
            >
              <Select
                value={shell}
                onValueChange={(v) => {
                  setShell(v);
                  save({
                    environment: {
                      defaultEditor: editor,
                      shellPreference: v,
                      terminalPreference: terminal,
                    },
                  });
                }}
              >
                <SelectTrigger
                  id="shell-preference"
                  data-testid="shell-select"
                  className="w-64 cursor-pointer text-xs"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {shellOptions.map((opt) => (
                    <SelectItem key={opt.id} value={opt.id} disabled={!opt.available}>
                      <span className="flex items-center gap-2 text-xs">
                        {opt.name}
                        <Badge
                          variant="outline"
                          className={cn(
                            'ml-auto px-1.5 py-0 text-[10px] leading-4 font-normal',
                            opt.available
                              ? 'border-emerald-500/30 text-emerald-500'
                              : 'border-muted-foreground/30 text-muted-foreground'
                          )}
                        >
                          {opt.available ? 'Installed' : 'Not Installed'}
                        </Badge>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </SettingsRow>
            <SettingsRow
              label={t('settings.environment.terminal')}
              description={t('settings.environment.terminalDescription')}
              tooltip="The terminal emulator launched when opening shell sessions from the web UI. Only affects web-launched terminals, not CLI usage."
              htmlFor="terminal-preference"
            >
              <Select
                value={terminal}
                onValueChange={(v) => {
                  setTerminal(v as TerminalType);
                  save({
                    environment: {
                      defaultEditor: editor,
                      shellPreference: shell,
                      terminalPreference: v as TerminalType,
                    },
                  });
                }}
              >
                <SelectTrigger
                  id="terminal-preference"
                  data-testid="terminal-select"
                  className="w-64 cursor-pointer text-xs"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {terminalOptions.map((opt) => (
                    <SelectItem key={opt.id} value={opt.id} disabled={!opt.available}>
                      <span className="flex items-center gap-2 text-xs">
                        {opt.name}
                        <Badge
                          variant="outline"
                          className={cn(
                            'ml-auto px-1.5 py-0 text-[10px] leading-4 font-normal',
                            opt.available
                              ? 'border-emerald-500/30 text-emerald-500'
                              : 'border-muted-foreground/30 text-muted-foreground'
                          )}
                        >
                          {opt.available ? 'Installed' : 'Not Installed'}
                        </Badge>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </SettingsRow>
          </SettingsSection>
        </div>

        {/* ── Workflow ── */}
        <div id="section-workflow" className="scroll-mt-18 rounded-lg">
          <SettingsSection
            icon={GitBranch}
            title={t('settings.workflow.title')}
            description={t('settings.workflow.sectionDescription')}
            testId="workflow-settings-section"
            tooltip={t('settings.workflow.hint')}
            tooltipLinks={[
              {
                label: t('settings.workflow.links.approvalGates'),
                href: 'https://github.com/jrmatherly/shipit/blob/main/specs/016-hitl-approval-gates/spec.yaml',
              },
              {
                label: t('settings.workflow.links.pushAndPrFlags'),
                href: 'https://github.com/jrmatherly/shipit/blob/main/specs/037-feature-pr-push-flags/spec.yaml',
              },
            ]}
          >
            <SwitchRow
              label={t('settings.workflow.defaultFastMode')}
              description={t('settings.workflow.defaultFastModeDescription')}
              tooltip="When enabled, new features skip the PRD and Plan phases and go straight to implementation. Useful for quick fixes, risky for complex features."
              id="default-fast-mode"
              testId="switch-default-fast-mode"
              checked={defaultFastMode}
              onChange={(v) => {
                setDefaultFastMode(v);
                save(buildWorkflowPayload({ defaultFastMode: v }));
              }}
            />
            <SubsectionLabel>{t('settings.workflow.subsections.approve')}</SubsectionLabel>
            <SwitchRow
              label={t('settings.workflow.autoApprovePrd')}
              description={t('settings.workflow.autoApprovePrdDescription')}
              tooltip="Automatically approves the requirements document without pausing for your review. Saves time but you lose the chance to refine requirements before planning."
              id="allow-prd"
              testId="switch-allow-prd"
              checked={allowPrd}
              onChange={(v) => {
                setAllowPrd(v);
                save(buildWorkflowPayload({ allowPrd: v }));
              }}
            />
            <SwitchRow
              label={t('settings.workflow.autoApprovePlan')}
              description={t('settings.workflow.autoApprovePlanDescription')}
              tooltip="Automatically approves the implementation plan. The agent proceeds to coding without waiting for your plan review."
              id="allow-plan"
              testId="switch-allow-plan"
              checked={allowPlan}
              onChange={(v) => {
                setAllowPlan(v);
                save(buildWorkflowPayload({ allowPlan: v }));
              }}
            />
            <SwitchRow
              label={t('settings.workflow.autoApproveMerge')}
              description={t('settings.workflow.autoApproveMergeDescription')}
              tooltip="Automatically merges the PR after implementation without requiring your final review. Use with caution on production branches."
              id="allow-merge"
              testId="switch-allow-merge"
              checked={allowMerge}
              onChange={(v) => {
                setAllowMerge(v);
                save(buildWorkflowPayload({ allowMerge: v }));
              }}
            />
            <SubsectionLabel>{t('settings.workflow.subsections.evidence')}</SubsectionLabel>
            <SwitchRow
              label={t('settings.workflow.collectEvidence')}
              description={t('settings.workflow.collectEvidenceDescription')}
              tooltip="Captures screenshots and test outputs during implementation as proof of work. Useful for audit trails and PR documentation."
              id="enable-evidence"
              testId="switch-enable-evidence"
              checked={enableEvidence}
              onChange={(v) => {
                setEnableEvidence(v);
                if (!v) {
                  setCommitEvidence(false);
                  save(buildWorkflowPayload({ enableEvidence: v, commitEvidence: false }));
                } else {
                  save(buildWorkflowPayload({ enableEvidence: v }));
                }
              }}
            />
            <SwitchRow
              label={t('settings.workflow.addEvidenceToPr')}
              description={t('settings.workflow.addEvidenceToPrDescription')}
              tooltip="Attaches collected evidence artifacts (screenshots, logs) directly to the pull request description."
              id="commit-evidence"
              testId="switch-commit-evidence"
              checked={commitEvidence}
              disabled={!enableEvidence || !openPr}
              onChange={(v) => {
                setCommitEvidence(v);
                save(buildWorkflowPayload({ commitEvidence: v }));
              }}
            />
            <SubsectionLabel>{t('settings.workflow.subsections.git')}</SubsectionLabel>
            <SwitchRow
              label={t('settings.workflow.pushOnComplete')}
              description={t('settings.workflow.pushOnCompleteDescription')}
              tooltip="Automatically pushes the implementation branch to the remote repository when the agent finishes coding."
              id="push-on-complete"
              testId="switch-push-on-complete"
              checked={pushOnComplete}
              onChange={(v) => {
                setPushOnComplete(v);
                save(buildWorkflowPayload({ pushOnComplete: v }));
              }}
            />
            <SwitchRow
              label={t('settings.workflow.openPrOnComplete')}
              description={t('settings.workflow.openPrOnCompleteDescription')}
              tooltip="Creates a pull request automatically after pushing. Combined with push-on-complete, this fully automates the delivery pipeline."
              id="open-pr"
              testId="switch-open-pr"
              checked={openPr}
              onChange={(v) => {
                setOpenPr(v);
                if (!v) {
                  setCommitEvidence(false);
                  save(buildWorkflowPayload({ openPr: v, commitEvidence: false }));
                } else {
                  save(buildWorkflowPayload({ openPr: v }));
                }
              }}
            />
            <SwitchRow
              label={t('settings.workflow.watchCiAfterPush')}
              description={t('settings.workflow.watchCiAfterPushDescription')}
              tooltip="Monitors CI/CD pipeline status after pushing and can attempt fixes if tests fail. Disable if you prefer to handle CI failures manually."
              id="ci-watch-enabled"
              testId="switch-ci-watch-enabled"
              checked={ciWatchEnabled}
              onChange={(v) => {
                setCiWatchEnabled(v);
                save(buildWorkflowPayload({ ciWatchEnabled: v }));
              }}
            />
            <SubsectionLabel>Archive</SubsectionLabel>
            <SwitchRow
              label="Auto-archive completed"
              description="Automatically archive features after they reach the completed state"
              tooltip="Automatically archives features from the control center canvas after they reach the completed state, keeping the board clean."
              id="auto-archive-enabled"
              testId="switch-auto-archive-enabled"
              checked={autoArchiveEnabled}
              onChange={(v) => {
                setAutoArchiveEnabled(v);
                save(buildWorkflowPayload({ autoArchiveEnabled: v }));
              }}
            />
            <SettingsRow
              label="Archive delay"
              description="Minutes to wait after completion before archiving (1–1440)"
              tooltip="How long to wait after a feature completes before archiving it. Gives you time to review results before the feature moves off the board."
              htmlFor="auto-archive-delay"
            >
              <NumberStepper
                id="auto-archive-delay"
                testId="input-auto-archive-delay"
                value={autoArchiveDelay}
                placeholder="10"
                min={1}
                max={1440}
                suffix="min"
                onChange={(v) => {
                  setAutoArchiveDelay(v);
                }}
                onBlur={() => {
                  if (!autoArchiveEnabled) return;
                  const n = parseInt(autoArchiveDelay, 10);
                  const clamped = Number.isNaN(n) ? 10 : Math.min(1440, Math.max(1, n));
                  setAutoArchiveDelay(String(clamped));
                  save(buildWorkflowPayload({ autoArchiveDelay: String(clamped) }));
                }}
              />
            </SettingsRow>
          </SettingsSection>
        </div>

        {/* ── CI ── */}
        <div id="section-ci" className="scroll-mt-18 rounded-lg">
          <CiSettingsSection settings={settings} />
        </div>

        {/* ── Stage Timeouts ── */}
        <div id="section-stage-timeouts" className="scroll-mt-18 rounded-lg">
          <StageTimeoutsSettingsSection settings={settings} />
        </div>

        {/* ── Notifications ── */}
        <div id="section-notifications" className="scroll-mt-18 rounded-lg">
          <SettingsSection
            icon={Bell}
            title={t('settings.notifications.title')}
            description={t('settings.notifications.sectionDescription')}
            testId="notification-settings-section"
            tooltip={t('settings.notifications.hint')}
            tooltipLinks={[
              {
                label: t('settings.notifications.links.notificationSystem'),
                href: 'https://github.com/jrmatherly/shipit/blob/main/specs/021-agent-notifications/spec.yaml',
              },
            ]}
          >
            <SubsectionLabel>{t('settings.notifications.channels')}</SubsectionLabel>
            <SwitchRow
              label={t('settings.notifications.inAppLabel')}
              description={t('settings.notifications.inAppDescription')}
              tooltip="Master toggle for in-app toast notifications. When disabled, no event toasts will appear regardless of individual event settings below."
              id="notif-in-app"
              testId="switch-in-app"
              checked={inApp}
              onChange={(v) => {
                setInApp(v);
                save(buildNotificationPayload({ inApp: v }));
              }}
            />

            <SubsectionLabel>{t('settings.notifications.subsections.agentEvents')}</SubsectionLabel>
            <SwitchRow
              label={t('settings.notifications.events.agentStarted')}
              tooltip="Controls whether you receive an in-app toast notification when an agent begins working on a feature."
              id="notif-event-agentStarted"
              testId="switch-event-agentStarted"
              checked={events.agentStarted}
              onChange={(v) => {
                const newEvents = { ...events, agentStarted: v };
                setEvents(newEvents);
                save(buildNotificationPayload({ events: newEvents }));
              }}
            />
            <SwitchRow
              label={t('settings.notifications.events.phaseCompleted')}
              tooltip="Controls whether you receive an in-app toast notification when an agent completes a workflow phase (e.g., requirements, planning, implementation)."
              id="notif-event-phaseCompleted"
              testId="switch-event-phaseCompleted"
              checked={events.phaseCompleted}
              onChange={(v) => {
                const newEvents = { ...events, phaseCompleted: v };
                setEvents(newEvents);
                save(buildNotificationPayload({ events: newEvents }));
              }}
            />
            <SwitchRow
              label={t('settings.notifications.events.waitingApproval')}
              tooltip="Controls whether you receive an in-app toast notification when a feature is paused and waiting for your approval to continue."
              id="notif-event-waitingApproval"
              testId="switch-event-waitingApproval"
              checked={events.waitingApproval}
              onChange={(v) => {
                const newEvents = { ...events, waitingApproval: v };
                setEvents(newEvents);
                save(buildNotificationPayload({ events: newEvents }));
              }}
            />
            <SwitchRow
              label={t('settings.notifications.events.agentCompleted')}
              tooltip="Controls whether you receive an in-app toast notification when an agent finishes all work on a feature successfully."
              id="notif-event-agentCompleted"
              testId="switch-event-agentCompleted"
              checked={events.agentCompleted}
              onChange={(v) => {
                const newEvents = { ...events, agentCompleted: v };
                setEvents(newEvents);
                save(buildNotificationPayload({ events: newEvents }));
              }}
            />
            <SwitchRow
              label={t('settings.notifications.events.agentFailed')}
              tooltip="Controls whether you receive an in-app toast notification when an agent encounters an error and stops working on a feature."
              id="notif-event-agentFailed"
              testId="switch-event-agentFailed"
              checked={events.agentFailed}
              onChange={(v) => {
                const newEvents = { ...events, agentFailed: v };
                setEvents(newEvents);
                save(buildNotificationPayload({ events: newEvents }));
              }}
            />

            <SubsectionLabel>
              {t('settings.notifications.subsections.pullRequestEvents')}
            </SubsectionLabel>
            <SwitchRow
              label={t('settings.notifications.events.prMerged')}
              tooltip="Controls whether you receive an in-app toast notification when a feature's pull request is merged into the target branch."
              id="notif-event-prMerged"
              testId="switch-event-prMerged"
              checked={events.prMerged}
              onChange={(v) => {
                const newEvents = { ...events, prMerged: v };
                setEvents(newEvents);
                save(buildNotificationPayload({ events: newEvents }));
              }}
            />
            <SwitchRow
              label={t('settings.notifications.events.prClosed')}
              tooltip="Controls whether you receive an in-app toast notification when a feature's pull request is closed without merging."
              id="notif-event-prClosed"
              testId="switch-event-prClosed"
              checked={events.prClosed}
              onChange={(v) => {
                const newEvents = { ...events, prClosed: v };
                setEvents(newEvents);
                save(buildNotificationPayload({ events: newEvents }));
              }}
            />
            <SwitchRow
              label={t('settings.notifications.events.prChecksPassed')}
              tooltip="Controls whether you receive an in-app toast notification when all CI checks pass on a feature's pull request."
              id="notif-event-prChecksPassed"
              testId="switch-event-prChecksPassed"
              checked={events.prChecksPassed}
              onChange={(v) => {
                const newEvents = { ...events, prChecksPassed: v };
                setEvents(newEvents);
                save(buildNotificationPayload({ events: newEvents }));
              }}
            />
            <SwitchRow
              label={t('settings.notifications.events.prChecksFailed')}
              tooltip="Controls whether you receive an in-app toast notification when CI checks fail on a feature's pull request."
              id="notif-event-prChecksFailed"
              testId="switch-event-prChecksFailed"
              checked={events.prChecksFailed}
              onChange={(v) => {
                const newEvents = { ...events, prChecksFailed: v };
                setEvents(newEvents);
                save(buildNotificationPayload({ events: newEvents }));
              }}
            />
            <SwitchRow
              label={t('settings.notifications.events.prBlocked')}
              tooltip="Controls whether you receive an in-app toast notification when a pull request is blocked by merge conflicts or branch protection rules."
              id="notif-event-prBlocked"
              testId="switch-event-prBlocked"
              checked={events.prBlocked}
              onChange={(v) => {
                const newEvents = { ...events, prBlocked: v };
                setEvents(newEvents);
                save(buildNotificationPayload({ events: newEvents }));
              }}
            />
            <SwitchRow
              label={t('settings.notifications.events.mergeReviewReady')}
              tooltip="Controls whether you receive an in-app toast notification when a feature's PR passes all checks and is ready for your merge review."
              id="notif-event-mergeReviewReady"
              testId="switch-event-mergeReviewReady"
              checked={events.mergeReviewReady}
              onChange={(v) => {
                const newEvents = { ...events, mergeReviewReady: v };
                setEvents(newEvents);
                save(buildNotificationPayload({ events: newEvents }));
              }}
            />
          </SettingsSection>
        </div>

        {/* ── Feature Flags ── */}
        <div id="section-feature-flags" className="scroll-mt-18 rounded-lg">
          <SettingsSection
            icon={Flag}
            title={t('settings.featureFlags.title')}
            description={t('settings.featureFlags.sectionDescription')}
            badge={t('settings.featureFlags.badge')}
            testId="feature-flags-settings-section"
            tooltip={t('settings.featureFlags.hint')}
          >
            <SwitchRow
              label={t('settings.featureFlags.skills')}
              description={t('settings.featureFlags.skillsDescription')}
              tooltip="Enables the Skills page in the sidebar for browsing and managing Claude Code skills."
              id="flag-skills"
              testId="switch-flag-skills"
              checked={flags.skills}
              onChange={(v) => {
                const newFlags = { ...flags, skills: v };
                setFlags(newFlags);
                save({ featureFlags: newFlags });
              }}
            />
            <SwitchRow
              label={t('settings.featureFlags.deployments')}
              description={t('settings.featureFlags.deploymentsDescription')}
              tooltip="Enables experimental deployment features for environment management."
              id="flag-envDeploy"
              testId="switch-flag-envDeploy"
              checked={flags.envDeploy}
              onChange={(v) => {
                const newFlags = { ...flags, envDeploy: v };
                setFlags(newFlags);
                save({ featureFlags: newFlags });
              }}
            />
            <SwitchRow
              label={t('settings.featureFlags.debug')}
              description={t('settings.featureFlags.debugDescription')}
              tooltip="Shows additional debugging information in the UI for troubleshooting."
              id="flag-debug"
              testId="switch-flag-debug"
              checked={flags.debug}
              onChange={(v) => {
                const newFlags = { ...flags, debug: v };
                setFlags(newFlags);
                save({ featureFlags: newFlags });
              }}
            />
            <SwitchRow
              label={t('settings.featureFlags.githubImport')}
              description={t('settings.featureFlags.githubImportDescription')}
              tooltip="Enables importing repositories directly from GitHub."
              id="flag-githubImport"
              testId="switch-flag-githubImport"
              checked={flags.githubImport}
              onChange={(v) => {
                const newFlags = { ...flags, githubImport: v };
                setFlags(newFlags);
                save({ featureFlags: newFlags });
              }}
            />
            <SwitchRow
              label={t('settings.featureFlags.adoptBranch')}
              description={t('settings.featureFlags.adoptBranchDescription')}
              tooltip="Enables adopting existing git branches as ShipIT features."
              id="flag-adoptBranch"
              testId="switch-flag-adoptBranch"
              checked={flags.adoptBranch}
              onChange={(v) => {
                const newFlags = { ...flags, adoptBranch: v };
                setFlags(newFlags);
                save({ featureFlags: newFlags });
              }}
            />
            <SwitchRow
              label={t('settings.featureFlags.gitRebaseSync')}
              description={t('settings.featureFlags.gitRebaseSyncDescription')}
              tooltip="Uses git rebase instead of merge when syncing feature branches with the upstream branch."
              id="flag-gitRebaseSync"
              testId="switch-flag-gitRebaseSync"
              checked={flags.gitRebaseSync}
              onChange={(v) => {
                const newFlags = { ...flags, gitRebaseSync: v };
                setFlags(newFlags);
                save({ featureFlags: newFlags });
              }}
            />
            <SwitchRow
              label={t('settings.featureFlags.reactFileManager')}
              description={t('settings.featureFlags.reactFileManagerDescription')}
              tooltip="Replaces the native file picker dialog with a React-based file browser for selecting project folders."
              id="flag-reactFileManager"
              testId="switch-flag-reactFileManager"
              checked={flags.reactFileManager}
              onChange={(v) => {
                const newFlags = { ...flags, reactFileManager: v };
                setFlags(newFlags);
                save({ featureFlags: newFlags });
              }}
            />
          </SettingsSection>
        </div>

        {/* ── Interactive Agent ── */}
        <div id="section-interactive-agent" className="scroll-mt-18 rounded-lg">
          <InteractiveAgentSettingsSection settings={settings} />
        </div>

        {/* ── FAB Layout ── */}
        <div id="section-fab-layout" className="scroll-mt-18 rounded-lg">
          <FabLayoutSettingsSection settings={settings} />
        </div>

        {/* ── Database ── */}
        <div id="section-database" className="scroll-mt-18 rounded-lg">
          <SettingsSection
            icon={Database}
            title={t('settings.database.title')}
            description={t('settings.database.sectionDescription')}
            testId="database-settings-section"
            tooltip={t('settings.database.hint')}
            tooltipLinks={[
              {
                label: t('settings.database.links.settingsService'),
                href: 'https://github.com/jrmatherly/shipit/blob/main/docs/architecture/settings-service.md',
              },
              {
                label: t('settings.database.links.settingsSpec'),
                href: 'https://github.com/jrmatherly/shipit/blob/main/specs/005-global-settings-service/spec.md',
              },
            ]}
          >
            <SettingsRow
              label={t('settings.database.location')}
              description={t('settings.database.locationDescription')}
              tooltip="The directory where ShipIT stores its SQLite database, logs, and configuration files. Change this via the SHIPIT_AI_HOME environment variable."
            >
              <span
                className="text-muted-foreground max-w-50 truncate font-mono text-xs"
                data-testid="shipit-ai-home-path"
              >
                {shipitAiHome}
              </span>
            </SettingsRow>
            <SettingsRow
              label={t('settings.database.size')}
              tooltip="Current size of the SQLite database file on disk. Large databases may slow down startup; consider archiving old features if this grows significantly."
            >
              <span className="text-muted-foreground text-xs" data-testid="db-file-size">
                {dbFileSize}
              </span>
            </SettingsRow>
          </SettingsSection>
        </div>
      </div>
    </div>
  );
}
