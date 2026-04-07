import { describe, it, expect } from 'vitest';
import { buildSnippet } from '@/components/features/mcp-servers/mcp-connect-instructions';

describe('buildSnippet', () => {
  const proxyBaseUrl = 'http://localhost:4000';
  const serverName = 'deepwiki_mcp';

  it('builds claude-code command with correct endpoint and header', () => {
    const snippet = buildSnippet('claude-code', proxyBaseUrl, serverName);
    expect(snippet).toContain('claude mcp add');
    expect(snippet).toContain('http://localhost:4000/deepwiki_mcp/mcp');
    expect(snippet).toContain('x-litellm-api-key: Bearer <LITELLM_API_KEY>');
  });

  it('builds cursor JSON config with mcpServers key', () => {
    const snippet = buildSnippet('cursor', proxyBaseUrl, serverName);
    const parsed = JSON.parse(snippet);
    expect(parsed.mcpServers.deepwiki_mcp.url).toBe('http://localhost:4000/deepwiki_mcp/mcp');
    expect(parsed.mcpServers.deepwiki_mcp.headers['x-litellm-api-key']).toBe(
      'Bearer <LITELLM_API_KEY>'
    );
  });

  it('builds vscode JSON config with mcp.servers key', () => {
    const snippet = buildSnippet('vscode', proxyBaseUrl, serverName);
    const parsed = JSON.parse(snippet);
    expect(parsed.mcp.servers.deepwiki_mcp.type).toBe('http');
    expect(parsed.mcp.servers.deepwiki_mcp.url).toBe('http://localhost:4000/deepwiki_mcp/mcp');
  });

  it('builds gemini JSON config with httpUrl', () => {
    const snippet = buildSnippet('gemini', proxyBaseUrl, serverName);
    const parsed = JSON.parse(snippet);
    expect(parsed.mcpServers.deepwiki_mcp.httpUrl).toBe('http://localhost:4000/deepwiki_mcp/mcp');
  });

  it('builds codex TOML config with [mcp_servers.name] header', () => {
    const snippet = buildSnippet('codex', proxyBaseUrl, serverName);
    expect(snippet).toContain('[mcp_servers.deepwiki_mcp]');
    expect(snippet).toContain('url = "http://localhost:4000/deepwiki_mcp/mcp"');
  });

  it('builds curl command with tools/list method', () => {
    const snippet = buildSnippet('curl', proxyBaseUrl, serverName);
    expect(snippet).toContain("curl --location 'http://localhost:4000/deepwiki_mcp/mcp'");
    expect(snippet).toContain('tools/list');
    expect(snippet).toContain('x-litellm-api-key: Bearer <LITELLM_API_KEY>');
  });

  it('strips trailing slash from proxyBaseUrl', () => {
    const snippet = buildSnippet('curl', 'http://localhost:4000/', serverName);
    expect(snippet).toContain('http://localhost:4000/deepwiki_mcp/mcp');
    expect(snippet).not.toContain('4000//deepwiki_mcp');
  });

  it('uses placeholder for api key — never inlines real credentials', () => {
    const snippet = buildSnippet('cursor', proxyBaseUrl, serverName);
    expect(snippet).toContain('<LITELLM_API_KEY>');
  });
});
