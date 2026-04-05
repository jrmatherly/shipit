'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Shield } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { getAgentPermissionOptions, type PermissionOption } from '@/app/actions/agent-permissions';

export interface AgentPermissionPickerProps {
  agentType: string;
  currentMode: string | undefined;
  onChange: (mode: string) => void;
  disabled?: boolean;
}

export function AgentPermissionPicker({
  agentType,
  currentMode,
  onChange,
  disabled = false,
}: AgentPermissionPickerProps) {
  const { t } = useTranslation('web');
  const [options, setOptions] = useState<PermissionOption[]>([]);

  useEffect(() => {
    let cancelled = false;
    getAgentPermissionOptions(agentType).then((opts) => {
      if (!cancelled) setOptions(opts);
    });
    return () => {
      cancelled = true;
    };
  }, [agentType]);

  if (options.length === 0) return null;

  // If no currentMode, default to first option
  const selectedMode = currentMode ?? options[0]?.value;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5">
        <Shield className="text-muted-foreground h-3.5 w-3.5" />
        <Label className="text-sm">{t('settings.agent.permissions.title')}</Label>
      </div>
      <div className="space-y-1.5">
        {options.map((option) => {
          const isSelected = option.value === selectedMode;
          return (
            <button
              key={option.value}
              type="button"
              disabled={disabled}
              onClick={() => onChange(option.value)}
              data-testid={`permission-option-${option.value}`}
              className={cn(
                'flex w-full cursor-pointer items-start gap-3 rounded-md border px-3 py-2.5 text-start transition-colors',
                isSelected
                  ? 'border-primary bg-primary/5'
                  : 'border-input hover:border-primary/50 hover:bg-accent/50',
                disabled && 'cursor-not-allowed opacity-60'
              )}
            >
              {/* Radio indicator */}
              <span
                className={cn(
                  'mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 transition-colors',
                  isSelected ? 'border-primary' : 'border-muted-foreground/40'
                )}
              >
                {isSelected ? <span className="bg-primary h-2 w-2 rounded-full" /> : null}
              </span>

              {/* Content */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className={cn('text-sm font-medium', isSelected && 'text-primary')}>
                    {option.label}
                  </span>
                  {option.batchSafe ? (
                    <Badge variant="secondary" className="px-1.5 py-0 text-[10px]">
                      {t('settings.agent.permissions.batchSafe')}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="px-1.5 py-0 text-[10px]">
                      {t('settings.agent.permissions.interactiveOnly')}
                    </Badge>
                  )}
                </div>
                <p className="text-muted-foreground mt-0.5 text-xs">{option.description}</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
