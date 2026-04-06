import { cn } from '@/lib/utils';

export interface PageHeaderProps {
  title: string;
  description?: string;
  /** Optional eyebrow label above the title (e.g., "DEVELOPER PORTAL") */
  eyebrow?: string;
  children?: React.ReactNode;
  className?: string;
}

/*
 * PageHeader — Stitch editorial page header pattern.
 * Renders: tiny uppercase eyebrow → large bold title → muted description.
 * Matches the tools-page-client.tsx header treatment.
 * See .scratchpad/stitch/shipit-developer-portal/src/App.tsx:161
 */
export function PageHeader({ title, description, eyebrow, children, className }: PageHeaderProps) {
  return (
    <header className={cn('flex items-center justify-between gap-4', className)}>
      <div className="space-y-1.5">
        {eyebrow ? (
          <span className="text-[10px] font-bold tracking-[0.2em] text-slate-400 uppercase">
            {eyebrow}
          </span>
        ) : null}
        <div className="flex items-baseline gap-3">
          <h1 className="text-foreground text-3xl font-black tracking-tight">{title}</h1>
        </div>
        {description ? (
          <p className="text-muted-foreground text-sm font-medium">{description}</p>
        ) : null}
      </div>
      {children ? <div data-slot="actions">{children}</div> : null}
    </header>
  );
}
