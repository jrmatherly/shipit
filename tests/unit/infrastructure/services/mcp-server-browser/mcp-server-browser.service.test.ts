import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { McpServerBrowserService } from '@shipit-ai/core/infrastructure/services/mcp-server-browser/mcp-server-browser.service';

describe('McpServerBrowserService', () => {
  let service: McpServerBrowserService;
  const baseUrl = 'http://localhost:4000';
  const apiKey = 'sk-test-key';

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

  const mockToolsResponse = {
    tools: [
      {
        name: 'deepwiki-mcp-read_wiki',
        title: 'Read Wiki',
        description: 'Read wiki contents from DeepWiki',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'github_mcp-list_issues',
        description: 'List GitHub issues',
      },
    ],
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

    it('calls /public/mcp_hub endpoint', async () => {
      const fetchSpy = vi
        .spyOn(globalThis, 'fetch')
        .mockResolvedValueOnce(new Response('[]', { status: 200 }));

      await service.fetchServers(baseUrl);

      expect(fetchSpy.mock.calls[0][0]).toBe('http://localhost:4000/public/mcp_hub');
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
    it('returns validated tool array on success (wrapped format)', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(JSON.stringify(mockToolsResponse), { status: 200 })
      );

      const result = await service.fetchTools(baseUrl, apiKey);

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('deepwiki-mcp-read_wiki');
      expect(result[1].name).toBe('github_mcp-list_issues');
    });

    it('returns validated tool array on success (bare array format)', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(JSON.stringify(mockToolsResponse.tools), { status: 200 })
      );

      const result = await service.fetchTools(baseUrl);
      expect(result).toHaveLength(2);
    });

    it('calls /mcp-rest/tools/list endpoint', async () => {
      const fetchSpy = vi
        .spyOn(globalThis, 'fetch')
        .mockResolvedValueOnce(new Response(JSON.stringify({ tools: [] }), { status: 200 }));

      await service.fetchTools(baseUrl);

      expect(fetchSpy.mock.calls[0][0]).toBe('http://localhost:4000/mcp-rest/tools/list');
    });

    it('returns empty array on timeout', async () => {
      vi.spyOn(globalThis, 'fetch').mockImplementationOnce(
        () => new Promise((_resolve, reject) => setTimeout(() => reject(new Error('aborted')), 50))
      );

      const result = await service.fetchTools(baseUrl);
      expect(result).toEqual([]);
    });

    it('returns empty array on HTTP error status', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response('Unauthorized', { status: 401 })
      );

      const result = await service.fetchTools(baseUrl);
      expect(result).toEqual([]);
    });
  });
});
