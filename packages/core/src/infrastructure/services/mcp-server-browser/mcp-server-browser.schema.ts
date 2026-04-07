/**
 * Zod Schemas for MCP Server Browser Data Validation
 *
 * Validates all external data boundaries:
 * 1. LiteLLM proxy GET /public/mcp_hub response
 * 2. LiteLLM proxy GET /mcp-rest/tools/list response
 *
 * All data from external sources is untrusted. Strings are capped
 * to prevent excessive memory use in UI rendering.
 */

import { z } from 'zod';

const McpServerMcpInfoSchema = z
  .object({
    server_name: z.string().optional(),
    description: z
      .string()
      .default('')
      .transform((s) => s.slice(0, 2000)),
    mcp_server_cost_info: z.record(z.string(), z.unknown()).optional(),
  })
  .passthrough();

const McpServerInfoSchema = z.object({
  server_id: z.string().transform((s) => s.slice(0, 200)),
  name: z.string().transform((s) => s.slice(0, 100)),
  alias: z.string().nullable().optional(),
  server_name: z.string().transform((s) => s.slice(0, 100)),
  url: z
    .string()
    .transform((s) => s.slice(0, 500))
    .optional(),
  transport: z.string().default('http'),
  spec_path: z.string().nullable().optional(),
  auth_type: z.string().default('none'),
  mcp_info: McpServerMcpInfoSchema.optional(),
});

export const McpServerListSchema = z.array(McpServerInfoSchema);

const McpToolInfoSchema = z.object({
  name: z.string().transform((s) => s.slice(0, 200)),
  title: z
    .string()
    .transform((s) => s.slice(0, 200))
    .optional(),
  description: z
    .string()
    .default('')
    .transform((s) => s.slice(0, 2000)),
  inputSchema: z.record(z.string(), z.unknown()).optional(),
});

// MCP JSON-RPC response for tools/list:
// { "jsonrpc": "2.0", "id": 1, "result": { "tools": [...] } }
export const McpJsonRpcToolsListResponseSchema = z.object({
  jsonrpc: z.string().optional(),
  id: z.union([z.string(), z.number()]).optional(),
  result: z.object({
    tools: z.array(McpToolInfoSchema),
  }),
});

// Some older LiteLLM versions / compat modes may return the wrapped result directly
export const McpToolListResponseSchema = z.object({
  tools: z.array(McpToolInfoSchema),
});

// Bare array fallback
export const McpToolListFallbackSchema = z.array(McpToolInfoSchema);

export type ValidatedMcpServerInfo = z.infer<typeof McpServerInfoSchema>;
export type ValidatedMcpToolInfo = z.infer<typeof McpToolInfoSchema>;
