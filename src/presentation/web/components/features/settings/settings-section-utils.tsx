'use client';

import { Minus, Plus, ExternalLink, Info } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

/* ── Reusable row components ── */

export function SettingsRow({
  label,
  description,
  htmlFor,
  tooltip,
  children,
}: {
  label: string;
  description?: string;
  htmlFor?: string;
  /** Explicit tooltip text. Falls back to `description` if not provided. */
  tooltip?: string;
  children: React.ReactNode;
}) {
  // Show the Info icon when there's either an explicit tooltip or a description to surface
  const tooltipText = tooltip ?? description;

  return (
    <div className="flex items-center justify-between gap-4 border-b py-2.5 last:border-b-0">
      <div className="min-w-0">
        <span className="flex items-center gap-1.5">
          <Label htmlFor={htmlFor} className="cursor-pointer text-sm font-normal whitespace-nowrap">
            {label}
          </Label>
          {tooltipText ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="text-muted-foreground/40 hover:text-muted-foreground h-3.5 w-3.5 shrink-0 cursor-help transition-colors" />
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-64 text-[11px] leading-relaxed">
                <span className="text-muted-foreground">{tooltipText}</span>
              </TooltipContent>
            </Tooltip>
          ) : null}
        </span>
        {description ? (
          <p className="text-muted-foreground text-[11px] leading-tight">{description}</p>
        ) : null}
      </div>
      <div className="flex shrink-0 items-center gap-2">{children}</div>
    </div>
  );
}

export function SwitchRow({
  label,
  description,
  id,
  testId,
  checked,
  onChange,
  disabled,
  tooltip,
}: {
  label: string;
  description?: string;
  id: string;
  testId: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
  tooltip?: string;
}) {
  return (
    <SettingsRow label={label} description={description} htmlFor={id} tooltip={tooltip}>
      <Switch
        id={id}
        data-testid={testId}
        checked={checked}
        onCheckedChange={onChange}
        disabled={disabled}
        className={cn('cursor-pointer', disabled && 'cursor-not-allowed opacity-50')}
      />
    </SettingsRow>
  );
}

/* ── Section card wrapper ── */

export function SettingsSection({
  icon: Icon,
  title,
  description,
  badge,
  testId,
  tooltip,
  tooltipLinks,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  badge?: string;
  testId: string;
  /** Section-level tooltip describing the purpose of this settings group. */
  tooltip?: string;
  /** Documentation links rendered below the tooltip text. */
  tooltipLinks?: { label: string; href: string }[];
  children: React.ReactNode;
}) {
  return (
    <div className="bg-background rounded-lg border" data-testid={testId}>
      <div className="bg-muted/30 border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <Icon className="text-muted-foreground h-3.5 w-3.5" />
          <h2 className="text-sm font-semibold">{title}</h2>
          {tooltip ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="text-muted-foreground/40 hover:text-muted-foreground h-3.5 w-3.5 shrink-0 cursor-help transition-colors" />
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-72 text-[11px] leading-relaxed">
                <p className="text-muted-foreground">{tooltip}</p>
                {tooltipLinks != null && tooltipLinks.length > 0 ? (
                  <div className="border-border/50 mt-1.5 flex flex-col gap-0.5 border-t pt-1.5">
                    {tooltipLinks.map((link) => (
                      <a
                        key={link.href}
                        href={link.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-[10px] tracking-wide transition-colors"
                      >
                        <ExternalLink className="h-2.5 w-2.5 shrink-0 opacity-50" />
                        {link.label}
                      </a>
                    ))}
                  </div>
                ) : null}
              </TooltipContent>
            </Tooltip>
          ) : null}
          {badge ? (
            <span className="bg-muted text-muted-foreground rounded px-1.5 py-0.5 text-[9px] font-medium tracking-wider uppercase">
              {badge}
            </span>
          ) : null}
        </div>
        <p className="text-muted-foreground mt-0.5 text-[11px]">{description}</p>
      </div>
      <div className="px-4">{children}</div>
    </div>
  );
}

export function NumberStepper({
  id,
  testId,
  value,
  onChange,
  onBlur,
  placeholder,
  min = 1,
  max,
  step = 1,
  suffix,
}: {
  id: string;
  testId: string;
  value: string;
  onChange: (value: string) => void;
  onBlur: () => void;
  placeholder: string;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
}) {
  const { t } = useTranslation('web');
  const numValue = value === '' ? undefined : parseInt(value, 10);

  const decrement = () => {
    const current = numValue ?? parseInt(placeholder, 10);
    const next = Math.max(min, current - step);
    onChange(String(next));
  };

  const increment = () => {
    const current = numValue ?? parseInt(placeholder, 10);
    const next = max != null ? Math.min(max, current + step) : current + step;
    onChange(String(next));
  };

  return (
    <div className="flex items-center gap-1.5">
      <div className="flex items-center overflow-hidden rounded-md border">
        <button
          type="button"
          onClick={() => {
            decrement();
          }}
          onMouseUp={onBlur}
          className="text-muted-foreground hover:bg-muted hover:text-foreground flex h-8 w-7 cursor-pointer items-center justify-center border-r transition-colors"
          aria-label={t('common.decrease')}
        >
          <Minus className="h-3 w-3" />
        </button>
        <input
          id={id}
          data-testid={testId}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={value}
          placeholder={placeholder}
          onChange={(e) => {
            const v = e.target.value.replace(/[^0-9]/g, '');
            onChange(v);
          }}
          onBlur={onBlur}
          className="h-8 w-14 bg-transparent text-center text-xs outline-none"
        />
        <button
          type="button"
          onClick={() => {
            increment();
          }}
          onMouseUp={onBlur}
          className="text-muted-foreground hover:bg-muted hover:text-foreground flex h-8 w-7 cursor-pointer items-center justify-center border-l transition-colors"
          aria-label={t('common.increase')}
        >
          <Plus className="h-3 w-3" />
        </button>
      </div>
      {suffix ? <span className="text-muted-foreground text-[11px]">{suffix}</span> : null}
    </div>
  );
}

export function SubsectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="border-b pt-3 pb-1">
      <span className="text-muted-foreground text-[10px] font-semibold tracking-wider uppercase">
        {children}
      </span>
    </div>
  );
}
