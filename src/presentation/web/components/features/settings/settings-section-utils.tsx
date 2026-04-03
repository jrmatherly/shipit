'use client';

import { Minus, Plus, ExternalLink } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

/* ── Reusable row components ── */

export function SettingsRow({
  label,
  description,
  htmlFor,
  children,
}: {
  label: string;
  description?: string;
  htmlFor?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b py-2.5 last:border-b-0">
      <div className="min-w-0">
        <Label htmlFor={htmlFor} className="cursor-pointer text-sm font-normal whitespace-nowrap">
          {label}
        </Label>
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
}: {
  label: string;
  description?: string;
  id: string;
  testId: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <SettingsRow label={label} description={description} htmlFor={id}>
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
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  badge?: string;
  testId: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-background rounded-lg border" data-testid={testId}>
      <div className="bg-muted/30 border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <Icon className="text-muted-foreground h-3.5 w-3.5" />
          <h2 className="text-sm font-semibold">{title}</h2>
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

export function SectionHint({
  children,
  links,
}: {
  children: React.ReactNode;
  links?: { label: string; href: string }[];
}) {
  return (
    <div className="hidden pt-2 lg:block">
      <p className="text-muted-foreground/70 text-[11px] leading-relaxed">{children}</p>
      {links != null && links.length > 0 ? (
        <div className="mt-2 flex flex-col gap-1">
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-[10px] transition-colors"
            >
              <ExternalLink className="h-2.5 w-2.5" />
              {link.label}
            </a>
          ))}
        </div>
      ) : null}
    </div>
  );
}
