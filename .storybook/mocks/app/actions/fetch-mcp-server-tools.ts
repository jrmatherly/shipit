export async function fetchMcpServerToolsAction() {
  return {
    tools: [
      {
        name: 'deepwiki-mcp-read_wiki_contents',
        title: 'Read Wiki Contents',
        description: 'Read documentation from a public repository wiki',
        inputSchema: {
          type: 'object',
          properties: {
            repo: { type: 'string', description: 'Repository URL or owner/name' },
          },
          required: ['repo'],
        },
      },
      {
        name: 'deepwiki-mcp-search_wiki',
        title: 'Search Wiki',
        description: 'Search across repository documentation',
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Search query' },
          },
          required: ['query'],
        },
      },
      {
        name: 'github_mcp-list_issues',
        title: 'List Issues',
        description: 'List issues in a GitHub repository',
        inputSchema: {
          type: 'object',
          properties: {
            owner: { type: 'string' },
            repo: { type: 'string' },
            state: { type: 'string', enum: ['open', 'closed', 'all'] },
          },
          required: ['owner', 'repo'],
        },
      },
      {
        name: 'github_mcp-create_issue',
        title: 'Create Issue',
        description: 'Create a new issue in a GitHub repository',
        inputSchema: {
          type: 'object',
          properties: {
            owner: { type: 'string' },
            repo: { type: 'string' },
            title: { type: 'string' },
            body: { type: 'string' },
          },
          required: ['owner', 'repo', 'title'],
        },
      },
      {
        name: 'github_mcp-search_code',
        title: 'Search Code',
        description: 'Search for code across GitHub repositories',
      },
      {
        name: 'local_db_tools-query',
        title: 'Query Database',
        description: 'Execute a read-only SQL query against the local database',
      },
      {
        name: 'local_db_tools-list_tables',
        title: 'List Tables',
        description: 'List all tables in the local database',
      },
    ],
  };
}
