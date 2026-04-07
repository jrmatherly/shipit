/**
 * MCP Server Browser Service
 *
 * Implements IMcpServerBrowserService using Node 22+ native fetch for
 * read-only HTTP retrieval from LiteLLM proxy endpoints:
 * - GET /public/mcp_hub — list accessible MCP servers
 * - POST /{serverName}/mcp — list tools for a specific server via JSON-RPC
 *
 * Pattern: AbortController timeout, redirect rejection, size limit, Zod validation.
 * Silent failure to empty arrays on any error.
 *
 * LiteLLM's MCP tool listing is per-server via JSON-RPC, not a global REST
 * endpoint. See https://docs.litellm.ai/docs/mcp for the canonical API shape:
 *
 *   POST {proxyBaseUrl}/{serverName}/mcp
 *   Content-Type: application/json
 *   x-litellm-api-key: Bearer {apiKey}
 *   {"jsonrpc": "2.0", "id": 1, "method": "tools/list"}
 */

import { injectable } from 'tsyringe';
import type {
  IMcpServerBrowserService,
  McpServerInfo,
  McpToolInfo,
} from '../../../application/ports/output/services/mcp-server-browser.interface.js';
import {
  McpServerListSchema,
  McpJsonRpcToolsListResponseSchema,
  McpToolListResponseSchema,
  McpToolListFallbackSchema,
} from './mcp-server-browser.schema.js';

const FETCH_TIMEOUT_MS = 10_000;
const MAX_RESPONSE_SIZE = 5_000_000;
const SAFE_SERVER_NAME_REGEX = /^[a-zA-Z0-9_-]{1,100}$/;

@injectable()
export class McpServerBrowserService implements IMcpServerBrowserService {
  async fetchServers(proxyBaseUrl: string, apiKey?: string): Promise<McpServerInfo[]> {
    try {
      const url = parseAndValidateUrl(proxyBaseUrl);
      if (!url) return [];

      const endpoint = `${url}/public/mcp_hub`;
      const headers = buildGetHeaders(apiKey);

      const json = await fetchJson(endpoint, { method: 'GET', headers });
      if (json === null) return [];

      const parsed = McpServerListSchema.safeParse(json);
      if (!parsed.success) return [];

      return parsed.data;
    } catch {
      return [];
    }
  }

  async fetchTools(
    proxyBaseUrl: string,
    serverName: string,
    apiKey?: string
  ): Promise<McpToolInfo[]> {
    try {
      const url = parseAndValidateUrl(proxyBaseUrl);
      if (!url) return [];

      // Validate server name against an allowlist regex before URL interpolation
      // to prevent path traversal / injection into the request URL.
      if (!SAFE_SERVER_NAME_REGEX.test(serverName)) return [];

      const endpoint = `${url}/${serverName}/mcp`;
      const headers = buildPostHeaders(apiKey);
      const body = JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/list',
      });

      const json = await fetchJson(endpoint, { method: 'POST', headers, body });
      if (json === null) return [];

      // Primary format: JSON-RPC 2.0 response { jsonrpc, id, result: { tools: [...] } }
      const rpcParsed = McpJsonRpcToolsListResponseSchema.safeParse(json);
      if (rpcParsed.success) return rpcParsed.data.result.tools;

      // Fallback: some versions may return { tools: [...] } directly
      const wrapped = McpToolListResponseSchema.safeParse(json);
      if (wrapped.success) return wrapped.data.tools;

      // Fallback: bare array
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

function buildGetHeaders(apiKey?: string): Record<string, string> {
  const headers: Record<string, string> = {};
  if (apiKey) {
    headers['Authorization'] = `Bearer ${apiKey}`;
  }
  return headers;
}

function buildPostHeaders(apiKey?: string): Record<string, string> {
  // LiteLLM's MCP JSON-RPC endpoint expects `x-litellm-api-key: Bearer <key>`,
  // not a standard `Authorization` header. See docs.litellm.ai/docs/mcp
  // "Forwarding Custom Headers to MCP Servers" section.
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json, text/event-stream',
  };
  if (apiKey) {
    headers['x-litellm-api-key'] = `Bearer ${apiKey}`;
  }
  return headers;
}

interface FetchJsonOptions {
  method: 'GET' | 'POST';
  headers: Record<string, string>;
  body?: string;
}

async function fetchJson(endpoint: string, options: FetchJsonOptions): Promise<unknown> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(endpoint, {
      method: options.method,
      signal: controller.signal,
      redirect: 'error',
      headers: options.headers,
      body: options.body,
    });

    if (!res.ok) return null;

    const text = await res.text();
    if (text.length > MAX_RESPONSE_SIZE) return null;

    try {
      return JSON.parse(text) as unknown;
    } catch {
      return null;
    }
  } finally {
    clearTimeout(timeout);
  }
}
