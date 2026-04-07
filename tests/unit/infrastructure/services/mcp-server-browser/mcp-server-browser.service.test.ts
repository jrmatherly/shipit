import 'reflect-metadata';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { McpServerBrowserService } from '@shipit-ai/core/infrastructure/services/mcp-server-browser/mcp-server-browser.service';

describe('McpServerBrowserService', () => {
  let service: McpServerBrowserService;
  const baseUrl = 'http://localhost:4000';
  const apiKey = 'sk-test-key';
  const serverName = 'deepwiki_mcp';

  beforeEach(() => {
    service = new McpServerBrowserService();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const mockServerResponse = [
    {
      server_id: 'e856f9a3-abc6-45b1-9d06-62fa49ac293d',
      name: 'deepwiki-mcp',
      alias: null,
      server_name: 'deepwiki-mcp',
      url: 'https://mcp.deepwiki.com/mcp',
      transport: 'http',
      spec_path: null,
      auth_type: 'none',
      mcp_info: {
        server_name: 'deepwiki-mcp',
        description: 'free mcp server',
      },
    },
  ];

  const mockJsonRpcToolsResponse = {
    jsonrpc: '2.0',
    id: 1,
    result: {
      tools: [
        {
          name: 'read_wiki',
          title: 'Read Wiki',
          description: 'Read wiki contents from DeepWiki',
          inputSchema: { type: 'object', properties: {} },
        },
        {
          name: 'search',
          description: 'Search documentation',
        },
      ],
    },
  };

  describe('fetchServers', () => {
    it('returns validated server array on success', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(JSON.stringify(mockServerResponse), { status: 200 })
      );

      const result = await service.fetchServers(baseUrl, apiKey);

      expect(result).toHaveLength(1);
      expect(result[0].server_id).toBe('e856f9a3-abc6-45b1-9d06-62fa49ac293d');
      expect(result[0].name).toBe('deepwiki-mcp');
      expect(result[0].transport).toBe('http');
    });

    it('sends Authorization header when apiKey provided', async () => {
      const fetchSpy = vi
        .spyOn(globalThis, 'fetch')
        .mockResolvedValueOnce(new Response('[]', { status: 200 }));

      await service.fetchServers(baseUrl, apiKey);

      const [, init] = fetchSpy.mock.calls[0];
      expect((init?.headers as Record<string, string>)['Authorization']).toBe(`Bearer ${apiKey}`);
    });

    it('calls /public/mcp_hub endpoint with GET', async () => {
      const fetchSpy = vi
        .spyOn(globalThis, 'fetch')
        .mockResolvedValueOnce(new Response('[]', { status: 200 }));

      await service.fetchServers(baseUrl);

      expect(fetchSpy.mock.calls[0][0]).toBe('http://localhost:4000/public/mcp_hub');
      expect(fetchSpy.mock.calls[0][1]?.method).toBe('GET');
    });

    it('returns empty array on timeout', async () => {
      vi.spyOn(globalThis, 'fetch').mockImplementationOnce(
        () => new Promise((_resolve, reject) => setTimeout(() => reject(new Error('aborted')), 50))
      );

      const result = await service.fetchServers(baseUrl);
      expect(result).toEqual([]);
    });

    it('returns empty array on invalid JSON', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response('not-json', { status: 200 })
      );

      const result = await service.fetchServers(baseUrl);
      expect(result).toEqual([]);
    });

    it('returns empty array on Zod validation failure', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(JSON.stringify([{ invalid: true }]), { status: 200 })
      );

      const result = await service.fetchServers(baseUrl);
      expect(result).toEqual([]);
    });

    it('returns empty array on HTTP error status', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response('Forbidden', { status: 403 })
      );

      const result = await service.fetchServers(baseUrl);
      expect(result).toEqual([]);
    });

    it('returns empty array on oversized response', async () => {
      const huge = 'x'.repeat(5_000_001);
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(new Response(huge, { status: 200 }));

      const result = await service.fetchServers(baseUrl);
      expect(result).toEqual([]);
    });

    it('returns empty array for invalid URL scheme', async () => {
      const result = await service.fetchServers('ftp://bad-scheme.com');
      expect(result).toEqual([]);
    });

    it('returns empty array for malformed URL', async () => {
      const result = await service.fetchServers('not-a-url');
      expect(result).toEqual([]);
    });

    it('truncates long server names in response', async () => {
      const longName = 'a'.repeat(200);
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(
          JSON.stringify([{ ...mockServerResponse[0], name: longName, server_name: longName }]),
          { status: 200 }
        )
      );

      const result = await service.fetchServers(baseUrl);
      expect(result[0].name.length).toBeLessThanOrEqual(100);
    });
  });

  describe('fetchTools', () => {
    it('returns validated tool array on JSON-RPC success', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(JSON.stringify(mockJsonRpcToolsResponse), { status: 200 })
      );

      const result = await service.fetchTools(baseUrl, serverName, apiKey);

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('read_wiki');
      expect(result[1].name).toBe('search');
    });

    it('POSTs to /{serverName}/mcp endpoint with JSON-RPC body', async () => {
      const fetchSpy = vi
        .spyOn(globalThis, 'fetch')
        .mockResolvedValueOnce(
          new Response(JSON.stringify(mockJsonRpcToolsResponse), { status: 200 })
        );

      await service.fetchTools(baseUrl, serverName, apiKey);

      expect(fetchSpy.mock.calls[0][0]).toBe(`http://localhost:4000/${serverName}/mcp`);
      const init = fetchSpy.mock.calls[0][1];
      expect(init?.method).toBe('POST');
      expect(init?.body).toBe(JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list' }));
    });

    it('sends x-litellm-api-key header (not Authorization)', async () => {
      const fetchSpy = vi
        .spyOn(globalThis, 'fetch')
        .mockResolvedValueOnce(
          new Response(JSON.stringify(mockJsonRpcToolsResponse), { status: 200 })
        );

      await service.fetchTools(baseUrl, serverName, apiKey);

      const headers = fetchSpy.mock.calls[0][1]?.headers as Record<string, string>;
      expect(headers['x-litellm-api-key']).toBe(`Bearer ${apiKey}`);
      expect(headers['Authorization']).toBeUndefined();
      expect(headers['Content-Type']).toBe('application/json');
    });

    it('accepts fallback wrapped format { tools: [...] }', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(JSON.stringify({ tools: mockJsonRpcToolsResponse.result.tools }), {
          status: 200,
        })
      );

      const result = await service.fetchTools(baseUrl, serverName);
      expect(result).toHaveLength(2);
    });

    it('accepts fallback bare array format', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(JSON.stringify(mockJsonRpcToolsResponse.result.tools), { status: 200 })
      );

      const result = await service.fetchTools(baseUrl, serverName);
      expect(result).toHaveLength(2);
    });

    it('returns empty array on timeout', async () => {
      vi.spyOn(globalThis, 'fetch').mockImplementationOnce(
        () => new Promise((_resolve, reject) => setTimeout(() => reject(new Error('aborted')), 50))
      );

      const result = await service.fetchTools(baseUrl, serverName);
      expect(result).toEqual([]);
    });

    it('returns empty array on HTTP error status', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response('Unauthorized', { status: 401 })
      );

      const result = await service.fetchTools(baseUrl, serverName);
      expect(result).toEqual([]);
    });

    it('returns empty array for unsafe server name (path traversal)', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch');
      const result = await service.fetchTools(baseUrl, '../admin');
      expect(result).toEqual([]);
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('returns empty array for server name with special characters', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch');
      const result = await service.fetchTools(baseUrl, 'server with spaces');
      expect(result).toEqual([]);
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('accepts safe server names with alphanumerics, hyphens, and underscores', async () => {
      const fetchSpy = vi
        .spyOn(globalThis, 'fetch')
        .mockResolvedValueOnce(
          new Response(JSON.stringify(mockJsonRpcToolsResponse), { status: 200 })
        );

      await service.fetchTools(baseUrl, 'valid_server-name123');

      expect(fetchSpy).toHaveBeenCalled();
    });
  });
});
