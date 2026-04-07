'use client';

import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import type { McpToolInfo } from '@shipit-ai/core/application/ports/output/services/mcp-server-browser.interface';

interface McpToolListProps {
  tools: McpToolInfo[];
  serverNames: string[];
}

interface GroupedTools {
  serverName: string;
  tools: { displayName: string; description?: string }[];
}

/**
 * Groups tools by server name prefix.
 *
 * LiteLLM prefixes tool names with `{server_name}-` (e.g., `github_mcp-list_issues`).
 * We match each tool's name against known server names and strip the prefix for display.
 * Tools with no matching prefix go in an "Other" group.
 */
export function groupToolsByServer(tools: McpToolInfo[], serverNames: string[]): GroupedTools[] {
  const groups = new Map<string, { displayName: string; description?: string }[]>();

  for (const tool of tools) {
    let matched = false;
    for (const serverName of serverNames) {
      const prefix = `${serverName}-`;
      if (tool.name.startsWith(prefix)) {
        const displayName = tool.name.slice(prefix.length);
        if (!groups.has(serverName)) groups.set(serverName, []);
        groups.get(serverName)!.push({ displayName, description: tool.description });
        matched = true;
        break;
      }
    }
    if (!matched) {
      if (!groups.has('other')) groups.set('other', []);
      groups.get('other')!.push({ displayName: tool.name, description: tool.description });
    }
  }

  return Array.from(groups.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([serverName, tools]) => ({
      serverName,
      tools: tools.sort((a, b) => a.displayName.localeCompare(b.displayName)),
    }));
}

export function McpToolList({ tools, serverNames }: McpToolListProps) {
  const { t } = useTranslation('web');
  const grouped = useMemo(() => groupToolsByServer(tools, serverNames), [tools, serverNames]);

  if (tools.length === 0) {
    return <p className="text-muted-foreground text-sm">{t('mcpServers.tools.noTools')}</p>;
  }

  return (
    <div className="space-y-4">
      {grouped.map((group) => (
        <div key={group.serverName}>
          <h4 className="text-muted-foreground mb-2 text-xs font-medium tracking-wider uppercase">
            {group.serverName === 'other' ? t('mcpServers.tools.other') : group.serverName}
          </h4>
          <div className="space-y-2">
            {group.tools.map((tool) => (
              <div
                key={`${group.serverName}-${tool.displayName}`}
                className="rounded-md border p-2"
              >
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="font-mono text-xs">
                    {tool.displayName}
                  </Badge>
                </div>
                {tool.description ? (
                  <p className="text-muted-foreground mt-1 text-xs">{tool.description}</p>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
