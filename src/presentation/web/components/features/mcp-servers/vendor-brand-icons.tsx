/**
 * Inline brand icons for MCP server vendors that SimpleIcons either doesn't
 * serve (Microsoft — removed for legal reasons), hasn't added yet (Firecrawl,
 * DeepWiki), or where we want a project-specific treatment.
 *
 * Using inline SVG instead of remote image URLs because:
 * - No network request, no 404 risk, no CORS
 * - Uses `currentColor` where possible so brand marks adapt to dark mode
 * - All paths are public brand marks simplified to their geometric essentials
 *   to avoid trademark ambiguity
 */

interface BrandIconProps {
  className?: string;
  size?: number;
}

/** Microsoft four-square window mark (simplified from public brand guidelines). */
export function MicrosoftIcon({ className, size = 20 }: BrandIconProps) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <rect x="2" y="2" width="9" height="9" fill="#F25022" />
      <rect x="13" y="2" width="9" height="9" fill="#7FBA00" />
      <rect x="2" y="13" width="9" height="9" fill="#00A4EF" />
      <rect x="13" y="13" width="9" height="9" fill="#FFB900" />
    </svg>
  );
}

/** Microsoft Learn — book + graduation cap motif. */
export function MicrosoftLearnIcon({ className, size = 20 }: BrandIconProps) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M3 6a1 1 0 0 1 1-1h6a2 2 0 0 1 2 2v13a1 1 0 0 1-1.447.894L6 18.618V7H4a1 1 0 0 1-1-1Z"
        fill="#0078D4"
      />
      <path
        d="M21 6a1 1 0 0 0-1-1h-6a2 2 0 0 0-2 2v13a1 1 0 0 0 1.447.894L18 18.618V7h2a1 1 0 0 0 1-1Z"
        fill="#50E6FF"
      />
    </svg>
  );
}

/** Azure / Foundry — stylized mountain triangles mark. */
export function AzureIcon({ className, size = 20 }: BrandIconProps) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path d="M12 4L2 20h7l3-5 3 5h7L12 4Z" fill="#0089D6" />
      <path d="M12 4l-3 5h6l-3-5Z" fill="#54AEF0" />
    </svg>
  );
}

/** Firecrawl — flame mark. */
export function FirecrawlIcon({ className, size = 20 }: BrandIconProps) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M12 2C12 2 6 8 6 13a6 6 0 0 0 12 0c0-2-1-4-2-5 0 2-1 3-2 3 0-3-2-6-2-9Z"
        fill="#F26B21"
      />
      <path d="M12 11c0 2-1.5 3-1.5 5a1.5 1.5 0 0 0 3 0c0-1.5-1.5-2.5-1.5-5Z" fill="#FFD166" />
    </svg>
  );
}

/** DeepWiki — stacked pages with magnifying lens motif. */
export function DeepWikiIcon({ className, size = 20 }: BrandIconProps) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <rect x="4" y="3" width="13" height="16" rx="1.5" fill="#6366F1" />
      <rect x="7" y="6" width="7" height="1.5" rx="0.5" fill="#E0E7FF" />
      <rect x="7" y="9" width="7" height="1.5" rx="0.5" fill="#E0E7FF" />
      <rect x="7" y="12" width="4" height="1.5" rx="0.5" fill="#E0E7FF" />
      <circle cx="17" cy="17" r="4" fill="none" stroke="#F59E0B" strokeWidth="2" />
      <line
        x1="20"
        y1="20"
        x2="22"
        y2="22"
        stroke="#F59E0B"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** AWS — orange cube mark. */
export function AwsIcon({ className, size = 20 }: BrandIconProps) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M6 14.5c0 1 .5 1.8 1.3 2.2L12 19l4.7-2.3c.8-.4 1.3-1.2 1.3-2.2v-5c0-1-.5-1.8-1.3-2.2L12 5 7.3 7.3C6.5 7.7 6 8.5 6 9.5v5Z"
        fill="#FF9900"
      />
      <path d="M12 5v14M6 9.5l6 3 6-3" stroke="#232F3E" strokeWidth="1.2" fill="none" />
    </svg>
  );
}
