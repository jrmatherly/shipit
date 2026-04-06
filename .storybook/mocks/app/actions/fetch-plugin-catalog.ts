export async function fetchPluginCatalogAction() {
  return {
    plugins: [
      {
        name: 'superpowers',
        description: 'Advanced Claude Code skills and workflow automation',
        version: '2.1.0',
        source: { source: 'github' as const, repo: 'anthropics/superpowers' },
        category: 'productivity',
        keywords: ['automation', 'workflows'],
      },
      {
        name: 'code-review-graph',
        description: 'Build knowledge graphs for code review',
        version: '1.5.0',
        source: { source: 'github' as const, repo: 'anthropics/code-review-graph' },
        category: 'code-quality',
        keywords: ['review', 'graph'],
      },
      {
        name: 'hookify',
        description: 'Create hooks to prevent unwanted behaviors',
        version: '1.0.0',
        source: { source: 'github' as const, repo: 'anthropics/hookify' },
        category: 'productivity',
        keywords: ['hooks', 'automation'],
      },
      {
        name: 'claude-mem',
        description: 'Persistent cross-session memory for Claude Code',
        version: '3.0.0',
        source: { source: 'github' as const, repo: 'anthropics/claude-mem' },
        category: 'memory',
        keywords: ['memory', 'persistence'],
      },
      {
        name: 'mcp-server-dev',
        description: 'Build and package MCP servers',
        version: '0.9.0',
        source: { source: 'github' as const, repo: 'anthropics/mcp-server-dev' },
        category: 'development',
        keywords: ['mcp', 'server'],
      },
    ],
    installedPlugins: [
      {
        id: 'superpowers@claude-plugins-official',
        scope: 'user' as const,
        version: '2.1.0',
        enabled: true,
      },
      {
        id: 'code-review-graph@claude-plugins-official',
        scope: 'user' as const,
        version: '1.5.0',
        enabled: true,
      },
    ],
  };
}
