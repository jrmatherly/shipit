'use client';

import { useState, useTransition } from 'react';
import { Terminal } from 'lucide-react';
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
import { type EditorType, TerminalType } from '@shipit-ai/core/domain/generated/output';
import { getEditorTypeIcon } from '@/components/common/editor-type-icons';
import { SettingsSection, SettingsRow } from './settings-section-utils';
import type { Settings } from '@shipit-ai/core/domain/generated/output';
import type { AvailableTerminal } from '@/app/actions/get-available-terminals';
import type { AvailableEditor } from '@/app/actions/get-available-editors';
import type { AvailableShell } from '@/app/actions/get-available-shells';

export const DEFAULT_EDITOR_OPTIONS: AvailableEditor[] = [
  { id: 'vscode', name: 'VS Code', available: true },
  { id: 'cursor', name: 'Cursor', available: true },
  { id: 'windsurf', name: 'Windsurf', available: true },
  { id: 'zed', name: 'Zed', available: true },
  { id: 'antigravity', name: 'Antigravity', available: true },
];

export const DEFAULT_SHELL_OPTIONS: AvailableShell[] = [
  { id: 'bash', name: 'Bash', available: true },
  { id: 'zsh', name: 'Zsh', available: true },
  { id: 'fish', name: 'Fish', available: true },
];

export interface EnvironmentSettingsSectionProps {
  settings: Settings;
  availableEditors?: AvailableEditor[];
  availableShells?: AvailableShell[];
  availableTerminals?: AvailableTerminal[];
}

export function EnvironmentSettingsSection({
  settings,
  availableEditors,
  availableShells,
  availableTerminals,
}: EnvironmentSettingsSectionProps) {
  const { t } = useTranslation('web');
  const [, startTransition] = useTransition();

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

  function save(payload: Record<string, unknown>) {
    startTransition(async () => {
      const result = await updateSettingsAction(payload);
      if (!result.success) {
        toast.error(result.error ?? t('settings.failedToSave'));
      }
    });
  }

  return (
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
  );
}
