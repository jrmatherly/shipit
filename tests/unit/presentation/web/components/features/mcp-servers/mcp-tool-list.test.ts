import { describe, it, expect } from 'vitest';
import { groupToolsByServer } from '@/components/features/mcp-servers/mcp-tool-list';

describe('groupToolsByServer', () => {
  const serverNames = ['deepwiki-mcp', 'github_mcp', 'local_db_tools'];

  it('groups tools by server name prefix', () => {
    const tools = [
      { name: 'deepwiki-mcp-read_wiki', description: 'Read wiki' },
      { name: 'deepwiki-mcp-search', description: 'Search wiki' },
      { name: 'github_mcp-list_issues', description: 'List issues' },
    ];

    const groups = groupToolsByServer(tools, serverNames);

    expect(groups).toHaveLength(2);
    expect(groups[0].serverName).toBe('deepwiki-mcp');
    expect(groups[0].tools).toHaveLength(2);
    expect(groups[0].tools[0].displayName).toBe('read_wiki');
    expect(groups[1].serverName).toBe('github_mcp');
    expect(groups[1].tools).toHaveLength(1);
  });

  it('places unmatched tools in Other group', () => {
    const tools = [
      { name: 'unknown-server-tool', description: 'Unknown' },
      { name: 'deepwiki-mcp-read', description: 'Read' },
    ];

    const groups = groupToolsByServer(tools, serverNames);

    const otherGroup = groups.find((g) => g.serverName === 'other');
    expect(otherGroup).toBeDefined();
    expect(otherGroup!.tools).toHaveLength(1);
    expect(otherGroup!.tools[0].displayName).toBe('unknown-server-tool');
  });

  it('returns empty array for no tools', () => {
    const groups = groupToolsByServer([], serverNames);
    expect(groups).toHaveLength(0);
  });

  it('sorts groups alphabetically', () => {
    const tools = [
      { name: 'local_db_tools-query', description: 'Query' },
      { name: 'deepwiki-mcp-read', description: 'Read' },
    ];

    const groups = groupToolsByServer(tools, serverNames);

    expect(groups[0].serverName).toBe('deepwiki-mcp');
    expect(groups[1].serverName).toBe('local_db_tools');
  });

  it('sorts tools within groups alphabetically', () => {
    const tools = [
      { name: 'github_mcp-search_code', description: 'Search' },
      { name: 'github_mcp-create_issue', description: 'Create' },
      { name: 'github_mcp-list_issues', description: 'List' },
    ];

    const groups = groupToolsByServer(tools, serverNames);

    expect(groups[0].tools[0].displayName).toBe('create_issue');
    expect(groups[0].tools[1].displayName).toBe('list_issues');
    expect(groups[0].tools[2].displayName).toBe('search_code');
  });
});
