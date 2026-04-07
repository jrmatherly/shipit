import { describe, it, expect } from 'vitest';
import { stripServerPrefix } from '@/components/features/mcp-servers/mcp-tool-list';

describe('stripServerPrefix', () => {
  it('strips the {serverName}- prefix from tool names', () => {
    const tools = [
      { name: 'deepwiki-mcp-read_wiki', description: 'Read wiki' },
      { name: 'deepwiki-mcp-search', description: 'Search' },
    ];

    const result = stripServerPrefix(tools, 'deepwiki-mcp');

    expect(result).toHaveLength(2);
    expect(result[0].displayName).toBe('read_wiki');
    expect(result[1].displayName).toBe('search');
  });

  it('leaves tool names unchanged when no prefix match', () => {
    const tools = [{ name: 'unprefixed_tool', description: 'Tool' }];
    const result = stripServerPrefix(tools, 'some-server');
    expect(result[0].displayName).toBe('unprefixed_tool');
  });

  it('preserves original name as key for React reconciliation', () => {
    const tools = [{ name: 'deepwiki-mcp-search', description: 'Search' }];
    const result = stripServerPrefix(tools, 'deepwiki-mcp');
    expect(result[0].key).toBe('deepwiki-mcp-search');
    expect(result[0].displayName).toBe('search');
  });

  it('returns empty array for no tools', () => {
    const result = stripServerPrefix([], 'deepwiki-mcp');
    expect(result).toHaveLength(0);
  });

  it('sorts tools alphabetically by display name', () => {
    const tools = [
      { name: 'github_mcp-search_code' },
      { name: 'github_mcp-create_issue' },
      { name: 'github_mcp-list_issues' },
    ];

    const result = stripServerPrefix(tools, 'github_mcp');

    expect(result[0].displayName).toBe('create_issue');
    expect(result[1].displayName).toBe('list_issues');
    expect(result[2].displayName).toBe('search_code');
  });

  it('handles mixed prefixed and unprefixed tools', () => {
    const tools = [{ name: 'deepwiki-mcp-read' }, { name: 'standalone_tool' }];
    const result = stripServerPrefix(tools, 'deepwiki-mcp');
    expect(result.find((t) => t.displayName === 'read')).toBeDefined();
    expect(result.find((t) => t.displayName === 'standalone_tool')).toBeDefined();
  });
});
