'use server';

import { resolve } from '@/lib/server-container';
import type { FetchMcpServersUseCase } from '@shipit-ai/core/application/use-cases/mcp-servers/fetch-mcp-servers.use-case';
import type { FetchMcpServersResult } from '@shipit-ai/core/application/use-cases/mcp-servers/fetch-mcp-servers.use-case';

export async function fetchMcpServersAction(): Promise<FetchMcpServersResult & { error?: string }> {
  try {
    const useCase = resolve<FetchMcpServersUseCase>('FetchMcpServersUseCase');
    return await useCase.execute();
  } catch {
    return { servers: [], error: 'Failed to fetch MCP servers' };
  }
}
