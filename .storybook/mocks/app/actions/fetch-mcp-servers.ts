export async function fetchMcpServersAction() {
  return {
    servers: [
      {
        server_id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        name: 'deepwiki-mcp',
        alias: null,
        server_name: 'deepwiki-mcp',
        url: 'https://mcp.deepwiki.com/mcp',
        transport: 'http',
        spec_path: null,
        auth_type: 'none',
        mcp_info: {
          server_name: 'deepwiki-mcp',
          description: 'Search and read documentation from any public repository',
        },
      },
      {
        server_id: 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
        name: 'github-mcp',
        alias: null,
        server_name: 'github_mcp',
        url: 'https://api.githubcopilot.com/mcp',
        transport: 'sse',
        spec_path: null,
        auth_type: 'bearer_token',
        mcp_info: {
          server_name: 'github_mcp',
          description: 'Interact with GitHub repositories, issues, and pull requests',
        },
      },
      {
        server_id: 'c3d4e5f6-a7b8-9012-cdef-123456789012',
        name: 'local-db-tools',
        alias: null,
        server_name: 'local_db_tools',
        url: undefined,
        transport: 'stdio',
        spec_path: null,
        auth_type: 'none',
        mcp_info: {
          server_name: 'local_db_tools',
          description: 'Query and manage local development databases',
        },
      },
    ],
  };
}
