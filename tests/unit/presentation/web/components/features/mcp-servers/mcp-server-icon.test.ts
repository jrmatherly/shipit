import { describe, it, expect } from 'vitest';
import { resolveVendorMapping } from '@/components/features/mcp-servers/mcp-server-icon';

describe('resolveVendorMapping', () => {
  describe('Microsoft family (inline SVG — SimpleIcons removed Microsoft)', () => {
    it('matches microsoft_learn_mcp to inline MicrosoftLearn icon', () => {
      const result = resolveVendorMapping('microsoft_learn_mcp');
      expect(result.kind).toBe('inline');
    });

    it('matches foundry_mcp to inline Azure icon', () => {
      const result = resolveVendorMapping('foundry_mcp', 'https://mcp.ai.azure.com');
      expect(result.kind).toBe('inline');
    });

    it('matches generic microsoft to inline Microsoft icon', () => {
      const result = resolveVendorMapping('microsoft_graph_mcp');
      expect(result.kind).toBe('inline');
    });

    it('prefers more-specific microsoft_learn over plain microsoft', () => {
      const learn = resolveVendorMapping('microsoft_learn_mcp');
      const plain = resolveVendorMapping('microsoft_graph_mcp');
      expect(learn.kind).toBe('inline');
      expect(plain.kind).toBe('inline');
      // Different inline components — verified by passing different `component` references
      if (learn.kind === 'inline' && plain.kind === 'inline') {
        expect(learn.component).not.toBe(plain.component);
      }
    });
  });

  describe('GitHub / Copilot (SimpleIcons)', () => {
    it('matches github_mcp to github slug', () => {
      const result = resolveVendorMapping('github_mcp', 'https://api.githubcopilot.com/mcp');
      expect(result).toEqual({ kind: 'simpleicons', slug: 'githubcopilot' });
    });

    it('matches plain github_issues_mcp to github slug', () => {
      const result = resolveVendorMapping('github_issues_mcp');
      expect(result).toEqual({ kind: 'simpleicons', slug: 'github' });
    });

    it('prefers copilot over plain github', () => {
      const result = resolveVendorMapping('github_copilot_mcp');
      expect(result).toEqual({ kind: 'simpleicons', slug: 'githubcopilot' });
    });
  });

  describe('Documentation vendors', () => {
    it('matches deepwiki_mcp to inline DeepWiki icon (not wikipedia)', () => {
      const result = resolveVendorMapping('deepwiki_mcp', 'https://mcp.deepwiki.com/mcp');
      expect(result.kind).toBe('inline');
    });

    it('matches notion to simpleicons notion slug', () => {
      const result = resolveVendorMapping('notion_mcp');
      expect(result).toEqual({ kind: 'simpleicons', slug: 'notion' });
    });
  });

  describe('Firecrawl (inline SVG — no SimpleIcons entry)', () => {
    it('matches firecrawl_mcp to inline Firecrawl icon', () => {
      const result = resolveVendorMapping('firecrawl_mcp');
      expect(result.kind).toBe('inline');
    });
  });

  describe('AWS (inline SVG — no SimpleIcons entry)', () => {
    it('matches aws to inline AWS icon', () => {
      const result = resolveVendorMapping('aws_bedrock_mcp');
      expect(result.kind).toBe('inline');
    });

    it('matches bedrock AgentCore to inline Azure/AWS icon', () => {
      const result = resolveVendorMapping(
        'agentcore_mcp',
        'https://bedrock-agentcore.us-east-1.amazonaws.com'
      );
      // Azure pattern comes first — but there's no foundry/azure match here.
      // bedrock matches inline (AWS).
      expect(result.kind).toBe('inline');
    });
  });

  describe('Databases (SimpleIcons)', () => {
    it('matches postgres to postgresql slug', () => {
      expect(resolveVendorMapping('postgres_mcp')).toEqual({
        kind: 'simpleicons',
        slug: 'postgresql',
      });
    });

    it('matches mongodb', () => {
      expect(resolveVendorMapping('mongodb_mcp')).toEqual({
        kind: 'simpleicons',
        slug: 'mongodb',
      });
    });

    it('matches supabase', () => {
      expect(resolveVendorMapping('supabase_mcp')).toEqual({
        kind: 'simpleicons',
        slug: 'supabase',
      });
    });
  });

  describe('Cloud vendors', () => {
    it('matches cloudflare to cloudflare slug', () => {
      expect(resolveVendorMapping('cloudflare_mcp')).toEqual({
        kind: 'simpleicons',
        slug: 'cloudflare',
      });
    });

    it('matches vercel to vercel slug', () => {
      expect(resolveVendorMapping('vercel_mcp')).toEqual({
        kind: 'simpleicons',
        slug: 'vercel',
      });
    });
  });

  describe('Fallback behavior', () => {
    it('returns none for unknown vendors', () => {
      expect(resolveVendorMapping('totally_custom_server')).toEqual({ kind: 'none' });
      expect(resolveVendorMapping('local_tool', 'file:///tmp/tool')).toEqual({ kind: 'none' });
    });

    it('is case-insensitive', () => {
      const upper = resolveVendorMapping('FIRECRAWL_MCP');
      const lower = resolveVendorMapping('firecrawl_mcp');
      expect(upper.kind).toBe('inline');
      expect(lower.kind).toBe('inline');
    });
  });
});
