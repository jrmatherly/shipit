'use client';

import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import type { McpToolInfo } from '@shipit-ai/core/application/ports/output/services/mcp-server-browser.interface';

interface McpToolListProps {
  tools: McpToolInfo[];
  /**
   * The server name that these tools belong to. Used to strip the
   * `{serverName}-` prefix from tool names for nicer display.
   */
  serverName: string;
}

interface DisplayTool {
  displayName: string;
  description?: string;
  key: string;
}

/**
 * Normalize tools by stripping the `{serverName}-` prefix if present.
 *
 * LiteLLM sometimes prefixes tool names with the server alias (e.g.,
 * `github_mcp-list_issues`). When we're displaying tools for a single
 * known server, the prefix is redundant — strip it for cleaner UI.
 *
 * Exported for unit testing.
 */
export function stripServerPrefix(tools: McpToolInfo[], serverName: string): DisplayTool[] {
  const prefix = `${serverName}-`;
  return tools
    .map((tool) => {
      const displayName = tool.name.startsWith(prefix) ? tool.name.slice(prefix.length) : tool.name;
      return {
        displayName,
        description: tool.description,
        key: tool.name,
      };
    })
    .sort((a, b) => a.displayName.localeCompare(b.displayName));
}

export function McpToolList({ tools, serverName }: McpToolListProps) {
  const { t } = useTranslation('web');
  const displayTools = useMemo(() => stripServerPrefix(tools, serverName), [tools, serverName]);

  if (tools.length === 0) {
    return <p className="text-muted-foreground text-sm">{t('mcpServers.tools.noTools')}</p>;
  }

  return (
    <div className="space-y-2">
      {displayTools.map((tool) => (
        <div key={tool.key} className="rounded-md border p-2">
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
  );
}
