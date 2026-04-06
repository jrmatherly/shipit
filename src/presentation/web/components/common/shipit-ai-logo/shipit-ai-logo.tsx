import { cn } from '@/lib/utils';

export interface ShipitAiLogoProps {
  className?: string;
  /** Icon size in px. Default 24. */
  size?: number;
  variant?: 'default' | 'dev';
  /**
   * When true, the full brandmark (icon + "SHIPIT AI" + "ENTERPRISE PORTAL"
   * eyebrow) renders. When false, only the icon renders — used for the
   * collapsed sidebar state. Mirrors Stitch's Logo `isOpen` prop.
   * See .scratchpad/stitch/shipit-developer-portal/src/components/Logo.tsx:9
   */
  isOpen?: boolean;
}

/*
 * ShipIT AI logo — Stitch editorial box/neural-circuit design.
 * Inline SVG so `currentColor` resolves from the parent's text color,
 * which means the box strokes automatically adapt to light/dark mode
 * via the sidebar's --sidebar-foreground CSS variable. The neural
 * circuit paths use the editorial sky blue via the `text-primary` class.
 *
 * Ported from .scratchpad/stitch/shipit-developer-portal/src/components/Logo.tsx:9-77
 */
export function ShipitAiLogo({
  className,
  size = 24,
  variant = 'default',
  isOpen = true,
}: ShipitAiLogoProps) {
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <svg
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        className={cn('shrink-0', variant === 'dev' && 'opacity-80')}
        aria-hidden
      >
        {/* Box base — uses currentColor so it inherits from the sidebar text color */}
        <path
          d="M21 7.5L12 3L3 7.5V16.5L12 21L21 16.5V7.5Z"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M3 7.5L12 12L21 7.5"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M12 12V21"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Neural/brain circuit lines — editorial sky blue */}
        <g className="text-primary">
          <path
            d="M12 12C12 12 15 9 15 6C15 3 12 2 12 2"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            className="animate-pulse"
          />
          <path
            d="M12 12C12 12 9 9 9 6C9 3 12 2 12 2"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            className="animate-pulse"
            style={{ animationDelay: '0.5s' }}
          />
          <circle cx="15" cy="6" r="1" fill="currentColor" />
          <circle cx="9" cy="6" r="1" fill="currentColor" />
          <circle cx="12" cy="2" r="1" fill="currentColor" />
        </g>
      </svg>
      {isOpen ? (
        <div className="flex flex-col leading-none">
          <span className="text-foreground flex items-center gap-1 text-xl font-black tracking-tighter">
            SHIPIT <span className="text-primary">AI</span>
          </span>
          <span className="mt-0.5 text-[8px] font-bold tracking-[0.2em] text-slate-400 uppercase">
            Enterprise Portal
          </span>
        </div>
      ) : null}
    </div>
  );
}
