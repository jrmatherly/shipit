/**
 * MCP Server Browser Service
 *
 * Implements IMcpServerBrowserService using Node 22+ native fetch for
 * read-only HTTP retrieval from LiteLLM proxy endpoints:
 * - GET /public/mcp_hub — list accessible MCP servers
 * - GET /mcp-rest/tools/list — list available MCP tools
 *
 * Pattern: AbortController timeout, redirect rejection, size limit, Zod validation.
 * Silent failure to empty arrays on any error.
 */

import type {
  IMcpServerBrowserService,
  McpServerInfo,
  McpToolInfo,
} from '../../../application/ports/output/services/mcp-server-browser.interface.js';
import {
  McpServerListSchema,
  McpToolListResponseSchema,
  McpToolListFallbackSchema,
} from './mcp-server-browser.schema.js';

const FETCH_TIMEOUT_MS = 10_000;
const MAX_RESPONSE_SIZE = 5_000_000;

export class McpServerBrowserService implements IMcpServerBrowserService {
  async fetchServers(proxyBaseUrl: string, apiKey?: string): Promise<McpServerInfo[]> {
    try {
      const url = parseAndValidateUrl(proxyBaseUrl);
      if (!url) return [];

      const endpoint = `${url}/public/mcp_hub`;
      const headers = buildHeaders(apiKey);

      const json = await fetchJson(endpoint, headers);
      if (json === null) return [];

      const parsed = McpServerListSchema.safeParse(json);
      if (!parsed.success) return [];

      return parsed.data;
    } catch {
      return [];
    }
  }

  async fetchTools(proxyBaseUrl: string, apiKey?: string): Promise<McpToolInfo[]> {
    try {
      const url = parseAndValidateUrl(proxyBaseUrl);
      if (!url) return [];

      const endpoint = `${url}/mcp-rest/tools/list`;
      const headers = buildHeaders(apiKey);

      const json = await fetchJson(endpoint, headers);
      if (json === null) return [];

      // Try wrapped format first: { tools: [...] }
      const wrapped = McpToolListResponseSchema.safeParse(json);
      if (wrapped.success) return wrapped.data.tools;

      // Fallback: bare array [...]
      const bare = McpToolListFallbackSchema.safeParse(json);
      if (bare.success) return bare.data;

      return [];
    } catch {
      return [];
    }
  }
}

function parseAndValidateUrl(proxyBaseUrl: string): string | null {
  try {
    const url = new URL(proxyBaseUrl);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    return url.toString().replace(/\/$/, '');
  } catch {
    return null;
  }
}

function buildHeaders(apiKey?: string): Record<string, string> {
  const headers: Record<string, string> = {};
  if (apiKey) {
    headers['Authorization'] = `Bearer ${apiKey}`;
  }
  return headers;
}

async function fetchJson(endpoint: string, headers: Record<string, string>): Promise<unknown> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(endpoint, {
      signal: controller.signal,
      redirect: 'error',
      headers,
    });

    if (!res.ok) return null;

    const text = await res.text();
    if (text.length > MAX_RESPONSE_SIZE) return null;

    return JSON.parse(text) as unknown;
  } finally {
    clearTimeout(timeout);
  }
}
