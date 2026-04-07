'use server';

import { resolve } from '@/lib/server-container';
import type { FetchMcpServerToolsUseCase } from '@shipit-ai/core/application/use-cases/mcp-servers/fetch-mcp-server-tools.use-case';
import type { FetchMcpServerToolsResult } from '@shipit-ai/core/application/use-cases/mcp-servers/fetch-mcp-server-tools.use-case';

export async function fetchMcpServerToolsAction(
  serverName: string
): Promise<FetchMcpServerToolsResult & { error?: string }> {
  try {
    const useCase = resolve<FetchMcpServerToolsUseCase>('FetchMcpServerToolsUseCase');
    return await useCase.execute({ serverName });
  } catch {
    return { tools: [], error: 'Failed to fetch MCP server tools' };
  }
}
