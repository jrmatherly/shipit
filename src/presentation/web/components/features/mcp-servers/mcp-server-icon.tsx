'use client';

import { useState, type ComponentType } from 'react';
import { Server, Wifi, Terminal } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import {
  MicrosoftIcon,
  MicrosoftLearnIcon,
  AzureIcon,
  FirecrawlIcon,
  DeepWikiIcon,
  AwsIcon,
} from './vendor-brand-icons';

interface McpServerIconProps {
  serverName: string;
  url?: string;
  transport: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

type BrandIconComponent = ComponentType<{ className?: string; size?: number }>;

interface VendorMapping {
  /** Regex pattern matched against lowercased `server_name + " " + url`. */
  match: RegExp;
  /** SimpleIcons slug (for brands that exist on cdn.simpleicons.org). */
  simpleIconSlug?: string;
  /** Inline brand component (for brands SimpleIcons doesn't serve). */
  inlineIcon?: BrandIconComponent;
}

/**
 * Vendor icon resolution map.
 *
 * Priority rules:
 * 1. More-specific patterns FIRST (e.g. `microsoft_learn` before `microsoft`,
 *    `github_copilot` before plain `github`).
 * 2. Inline SVG brand icons take priority over SimpleIcons when both are
 *    available — inline icons are guaranteed to render and have no CDN
 *    dependency.
 * 3. Verified slugs only. Every SimpleIcons slug in this file must return
 *    HTTP 200 from https://cdn.simpleicons.org/{slug} as of the last audit.
 *
 * When no vendor matches, the `McpServerIcon` component falls back to the
 * transport-type Lucide icon (Server/Wifi/Terminal).
 *
 * Exported `resolveVendorMapping` is the source of truth for tests.
 */
const VENDOR_MAP: VendorMapping[] = [
  // Microsoft (SimpleIcons removed all MS icons for legal reasons — use inline)
  { match: /microsoft[_-]?learn|learn\.microsoft/, inlineIcon: MicrosoftLearnIcon },
  { match: /foundry|ai\.azure|azure[_-]?foundry|bedrock[_-]?agentcore/, inlineIcon: AzureIcon },
  { match: /\bazure\b/, inlineIcon: AzureIcon },
  { match: /microsoft|\.microsoft\./, inlineIcon: MicrosoftIcon },

  // GitHub / Copilot (SimpleIcons has these)
  { match: /github[_-]?copilot|\bcopilot\b/, simpleIconSlug: 'githubcopilot' },
  { match: /github|api\.github/, simpleIconSlug: 'github' },
  { match: /gitlab/, simpleIconSlug: 'gitlab' },
  { match: /bitbucket/, simpleIconSlug: 'bitbucket' },

  // AI / LLM vendors
  { match: /anthropic|\bclaude\b/, simpleIconSlug: 'anthropic' },
  { match: /gemini|google[_-]?ai/, simpleIconSlug: 'googlegemini' },
  { match: /perplexity/, simpleIconSlug: 'perplexity' },

  // Documentation / knowledge (DeepWiki gets its own distinct mark)
  { match: /deepwiki|deep[_-]?wiki/, inlineIcon: DeepWikiIcon },
  { match: /notion/, simpleIconSlug: 'notion' },
  { match: /confluence/, simpleIconSlug: 'confluence' },
  { match: /readthedocs/, simpleIconSlug: 'readthedocs' },
  { match: /mintlify/, simpleIconSlug: 'mintlify' },

  // Web scraping / crawling (inline for Firecrawl — no SimpleIcons)
  { match: /firecrawl/, inlineIcon: FirecrawlIcon },

  // Cloud / infra
  { match: /\baws\b|amazon[_-]?web|bedrock/, inlineIcon: AwsIcon },
  { match: /cloudflare/, simpleIconSlug: 'cloudflare' },
  { match: /vercel/, simpleIconSlug: 'vercel' },
  { match: /netlify/, simpleIconSlug: 'netlify' },
  { match: /digitalocean/, simpleIconSlug: 'digitalocean' },
  { match: /railway/, simpleIconSlug: 'railway' },

  // Databases
  { match: /postgres/, simpleIconSlug: 'postgresql' },
  { match: /mongodb/, simpleIconSlug: 'mongodb' },
  { match: /\bredis\b/, simpleIconSlug: 'redis' },
  { match: /mysql/, simpleIconSlug: 'mysql' },
  { match: /sqlite/, simpleIconSlug: 'sqlite' },
  { match: /supabase/, simpleIconSlug: 'supabase' },
  { match: /planetscale/, simpleIconSlug: 'planetscale' },

  // Productivity / collaboration
  { match: /slack/, simpleIconSlug: 'slack' },
  { match: /discord/, simpleIconSlug: 'discord' },
  { match: /linear/, simpleIconSlug: 'linear' },
  { match: /jira|atlassian/, simpleIconSlug: 'jira' },
  { match: /asana/, simpleIconSlug: 'asana' },
  { match: /zapier/, simpleIconSlug: 'zapier' },

  // Observability
  { match: /datadog/, simpleIconSlug: 'datadog' },
  { match: /sentry/, simpleIconSlug: 'sentry' },
  { match: /grafana/, simpleIconSlug: 'grafana' },
  { match: /newrelic/, simpleIconSlug: 'newrelic' },

  // Payments / commerce
  { match: /stripe/, simpleIconSlug: 'stripe' },
  { match: /shopify/, simpleIconSlug: 'shopify' },
];

export type VendorResolution =
  | { kind: 'inline'; component: BrandIconComponent }
  | { kind: 'simpleicons'; slug: string }
  | { kind: 'none' };

/**
 * Resolve a vendor icon for an MCP server by matching name and URL against
 * the VENDOR_MAP patterns. Returns an inline component, a SimpleIcons slug,
 * or 'none' (caller falls back to transport icon).
 *
 * Exported for unit testing.
 */
export function resolveVendorMapping(serverName: string, url?: string): VendorResolution {
  const haystack = `${serverName} ${url ?? ''}`.toLowerCase();
  for (const entry of VENDOR_MAP) {
    if (entry.match.test(haystack)) {
      if (entry.inlineIcon) return { kind: 'inline', component: entry.inlineIcon };
      if (entry.simpleIconSlug) return { kind: 'simpleicons', slug: entry.simpleIconSlug };
    }
  }
  return { kind: 'none' };
}

const TRANSPORT_FALLBACKS: Record<string, LucideIcon> = {
  http: Server,
  sse: Wifi,
  stdio: Terminal,
};

const SIZE_CLASSES: Record<NonNullable<McpServerIconProps['size']>, string> = {
  sm: 'size-4',
  md: 'size-5',
  lg: 'size-6',
};

const SIZE_PIXELS: Record<NonNullable<McpServerIconProps['size']>, number> = {
  sm: 16,
  md: 20,
  lg: 24,
};

/**
 * Renders an MCP server's brand icon when recognizable, falling back to the
 * transport-type icon otherwise.
 *
 * Resolution order:
 * 1. Inline brand SVG (Microsoft, Azure, DeepWiki, Firecrawl, AWS)
 * 2. SimpleIcons CDN image (GitHub, Stripe, Postgres, etc.)
 * 3. Transport fallback (Server/Wifi/Terminal from lucide-react)
 *
 * For SimpleIcons images, we handle `onError` by swapping to the transport
 * fallback — this protects against SimpleIcons slug changes without breaking
 * the UI.
 */
export function McpServerIcon({
  serverName,
  url,
  transport,
  className,
  size = 'sm',
}: McpServerIconProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const resolution = resolveVendorMapping(serverName, url);
  const FallbackIcon = TRANSPORT_FALLBACKS[transport] ?? Server;
  const sizeClass = SIZE_CLASSES[size];
  const sizePx = SIZE_PIXELS[size];

  if (resolution.kind === 'inline') {
    const Brand = resolution.component;
    return <Brand className={`${sizeClass} shrink-0 ${className ?? ''}`} size={sizePx} />;
  }

  if (resolution.kind === 'simpleicons' && !imageFailed) {
    return (
      /* eslint-disable-next-line @next/next/no-img-element */
      <img
        src={`https://cdn.simpleicons.org/${resolution.slug}`}
        alt=""
        width={sizePx}
        height={sizePx}
        className={`${sizeClass} shrink-0 ${className ?? ''}`}
        onError={() => setImageFailed(true)}
      />
    );
  }

  return (
    <FallbackIcon className={`text-muted-foreground ${sizeClass} shrink-0 ${className ?? ''}`} />
  );
}
