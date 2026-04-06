/**
 * Claude Code Executor — LiteLLM Proxy Env Var Injection Tests
 *
 * TDD RED phase: All tests should FAIL until the buildSpawnEnv() override
 * is implemented in ClaudeCodeExecutorService (task-5).
 *
 * Tests verify that the correct environment variables are injected
 * based on the LiteLLM proxy routing mode (direct/proxy/passthrough).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ClaudeCodeExecutorService } from '../../../../../../packages/core/src/infrastructure/services/agents/common/executors/claude-code-executor.service.js';
import { LiteLLMProxyRoutingMode } from '../../../../../../packages/core/src/domain/generated/output.js';
import type { LiteLLMProxyConfig } from '../../../../../../packages/core/src/domain/generated/output.js';
import type { SpawnFunction } from '../../../../../../packages/core/src/infrastructure/services/agents/common/types.js';
import type { ChildProcess } from 'node:child_process';
import { EventEmitter, Readable, Writable } from 'node:stream';

function createMockChildProcess(): ChildProcess {
  const proc = new EventEmitter() as ChildProcess;
  proc.stdout = new Readable({
    read() {
      /* noop for mock */
    },
  });
  proc.stderr = new Readable({
    read() {
      /* noop for mock */
    },
  });
  proc.stdin = new Writable({
    write(_c, _e, cb) {
      cb();
    },
  });
  Object.defineProperty(proc, 'pid', { value: 12345, writable: true });
  Object.defineProperty(proc, 'killed', { value: false, writable: true });
  proc.kill = vi.fn().mockReturnValue(true);
  return proc;
}

function spawnEnvFromMock(mockSpawn: ReturnType<typeof vi.fn>): Record<string, string | undefined> {
  const spawnOpts = mockSpawn.mock.calls[0]?.[2] as Record<string, unknown> | undefined;
  return (spawnOpts?.env ?? {}) as Record<string, string | undefined>;
}

/** Helper: trigger a minimal stream-json sequence so execute() resolves */
function finishProcess(proc: ChildProcess, exitCode = 0): void {
  // Emit minimal stream-json output so the executor finishes
  const lines = [
    '{"type":"system","subtype":"init","session_id":"s1","tools":[],"model":"claude-sonnet-4-5-20250929","mcp_servers":[]}',
    '{"type":"result","subtype":"success","session_id":"s1","is_error":false,"result":"done","total_cost_usd":0,"usage":{"input_tokens":10,"output_tokens":5,"cache_creation_input_tokens":0,"cache_read_input_tokens":0},"model":"claude-sonnet-4-5-20250929","num_turns":1}',
  ];
  for (const line of lines) {
    (proc.stdout as Readable).push(`${line}\n`);
  }
  (proc.stdout as Readable).push(null);
  (proc.stderr as Readable).push(null);
  proc.emit('close', exitCode);
}

describe('ClaudeCodeExecutorService — LiteLLM Proxy Env Var Injection', () => {
  let mockSpawn: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockSpawn = vi.fn();
  });

  describe('direct mode (default)', () => {
    it('should NOT set ANTHROPIC_BASE_URL when routingMode is direct', async () => {
      const proxyConfig: LiteLLMProxyConfig = {
        baseUrl: 'http://proxy:4000',
        apiKey: 'sk-proxy',
        claudeCode: { routingMode: LiteLLMProxyRoutingMode.direct },
      };
      const executor = new ClaudeCodeExecutorService(mockSpawn as SpawnFunction);
      executor.updateProxyConfig(proxyConfig);

      const proc = createMockChildProcess();
      mockSpawn.mockReturnValue(proc);
      const promise = executor.execute('test prompt', { cwd: '/tmp' });
      finishProcess(proc);
      await promise;

      const env = spawnEnvFromMock(mockSpawn);
      expect(env.ANTHROPIC_BASE_URL).toBeUndefined();
      expect(env.ANTHROPIC_AUTH_TOKEN).toBeUndefined();
      expect(env.ANTHROPIC_CUSTOM_HEADERS).toBeUndefined();
    });

    it('should NOT set model overrides when routingMode is direct', async () => {
      const proxyConfig: LiteLLMProxyConfig = {
        baseUrl: 'http://proxy:4000',
        apiKey: 'sk-proxy',
        claudeCode: {
          routingMode: LiteLLMProxyRoutingMode.direct,
          sonnetModel: 'claude-sonnet-4-6',
          haikuModel: 'claude-haiku-4-5',
          opusModel: 'claude-opus-4-6',
        },
      };
      const executor = new ClaudeCodeExecutorService(mockSpawn as SpawnFunction);
      executor.updateProxyConfig(proxyConfig);

      const proc = createMockChildProcess();
      mockSpawn.mockReturnValue(proc);
      const promise = executor.execute('test', { cwd: '/tmp' });
      finishProcess(proc);
      await promise;

      const env = spawnEnvFromMock(mockSpawn);
      expect(env.ANTHROPIC_DEFAULT_SONNET_MODEL).toBeUndefined();
      expect(env.ANTHROPIC_DEFAULT_HAIKU_MODEL).toBeUndefined();
      expect(env.ANTHROPIC_DEFAULT_OPUS_MODEL).toBeUndefined();
    });
  });

  describe('proxy mode', () => {
    it('should set ANTHROPIC_BASE_URL to proxy baseUrl', async () => {
      const proxyConfig: LiteLLMProxyConfig = {
        baseUrl: 'http://proxy:4000',
        apiKey: 'sk-proxy-key',
        claudeCode: { routingMode: LiteLLMProxyRoutingMode.proxy },
      };
      const executor = new ClaudeCodeExecutorService(mockSpawn as SpawnFunction);
      executor.updateProxyConfig(proxyConfig);

      const proc = createMockChildProcess();
      mockSpawn.mockReturnValue(proc);
      const promise = executor.execute('test', { cwd: '/tmp' });
      finishProcess(proc);
      await promise;

      const env = spawnEnvFromMock(mockSpawn);
      expect(env.ANTHROPIC_BASE_URL).toBe('http://proxy:4000');
    });

    it('should set ANTHROPIC_AUTH_TOKEN to proxy apiKey', async () => {
      const proxyConfig: LiteLLMProxyConfig = {
        baseUrl: 'http://proxy:4000',
        apiKey: 'sk-proxy-key',
        claudeCode: { routingMode: LiteLLMProxyRoutingMode.proxy },
      };
      const executor = new ClaudeCodeExecutorService(mockSpawn as SpawnFunction);
      executor.updateProxyConfig(proxyConfig);

      const proc = createMockChildProcess();
      mockSpawn.mockReturnValue(proc);
      const promise = executor.execute('test', { cwd: '/tmp' });
      finishProcess(proc);
      await promise;

      const env = spawnEnvFromMock(mockSpawn);
      expect(env.ANTHROPIC_AUTH_TOKEN).toBe('sk-proxy-key');
    });

    it('should set ANTHROPIC_CUSTOM_HEADERS when customHeaders are provided', async () => {
      const proxyConfig: LiteLLMProxyConfig = {
        baseUrl: 'http://proxy:4000',
        apiKey: 'sk-proxy-key',
        claudeCode: {
          routingMode: LiteLLMProxyRoutingMode.proxy,
          customHeaders: 'x-litellm-customer-id: user-123\nx-litellm-tags: project:acme',
        },
      };
      const executor = new ClaudeCodeExecutorService(mockSpawn as SpawnFunction);
      executor.updateProxyConfig(proxyConfig);

      const proc = createMockChildProcess();
      mockSpawn.mockReturnValue(proc);
      const promise = executor.execute('test', { cwd: '/tmp' });
      finishProcess(proc);
      await promise;

      const env = spawnEnvFromMock(mockSpawn);
      expect(env.ANTHROPIC_CUSTOM_HEADERS).toBe(
        'x-litellm-customer-id: user-123\nx-litellm-tags: project:acme'
      );
    });

    it('should set model override env vars when provided', async () => {
      const proxyConfig: LiteLLMProxyConfig = {
        baseUrl: 'http://proxy:4000',
        apiKey: 'sk-proxy-key',
        claudeCode: {
          routingMode: LiteLLMProxyRoutingMode.proxy,
          sonnetModel: 'claude-sonnet-4-6',
          haikuModel: 'claude-haiku-4-5',
          opusModel: 'claude-opus-4-6',
        },
      };
      const executor = new ClaudeCodeExecutorService(mockSpawn as SpawnFunction);
      executor.updateProxyConfig(proxyConfig);

      const proc = createMockChildProcess();
      mockSpawn.mockReturnValue(proc);
      const promise = executor.execute('test', { cwd: '/tmp' });
      finishProcess(proc);
      await promise;

      const env = spawnEnvFromMock(mockSpawn);
      expect(env.ANTHROPIC_DEFAULT_SONNET_MODEL).toBe('claude-sonnet-4-6');
      expect(env.ANTHROPIC_DEFAULT_HAIKU_MODEL).toBe('claude-haiku-4-5');
      expect(env.ANTHROPIC_DEFAULT_OPUS_MODEL).toBe('claude-opus-4-6');
    });

    it('should NOT set model overrides when fields are absent', async () => {
      const proxyConfig: LiteLLMProxyConfig = {
        baseUrl: 'http://proxy:4000',
        apiKey: 'sk-proxy-key',
        claudeCode: { routingMode: LiteLLMProxyRoutingMode.proxy },
      };
      const executor = new ClaudeCodeExecutorService(mockSpawn as SpawnFunction);
      executor.updateProxyConfig(proxyConfig);

      const proc = createMockChildProcess();
      mockSpawn.mockReturnValue(proc);
      const promise = executor.execute('test', { cwd: '/tmp' });
      finishProcess(proc);
      await promise;

      const env = spawnEnvFromMock(mockSpawn);
      expect(env.ANTHROPIC_DEFAULT_SONNET_MODEL).toBeUndefined();
      expect(env.ANTHROPIC_DEFAULT_HAIKU_MODEL).toBeUndefined();
      expect(env.ANTHROPIC_DEFAULT_OPUS_MODEL).toBeUndefined();
    });
  });

  describe('passthrough mode', () => {
    it('should set ANTHROPIC_BASE_URL but NOT ANTHROPIC_AUTH_TOKEN', async () => {
      const proxyConfig: LiteLLMProxyConfig = {
        baseUrl: 'http://proxy:4000',
        apiKey: 'sk-proxy-key',
        claudeCode: { routingMode: LiteLLMProxyRoutingMode.passthrough },
      };
      const executor = new ClaudeCodeExecutorService(mockSpawn as SpawnFunction);
      executor.updateProxyConfig(proxyConfig);

      const proc = createMockChildProcess();
      mockSpawn.mockReturnValue(proc);
      const promise = executor.execute('test', { cwd: '/tmp' });
      finishProcess(proc);
      await promise;

      const env = spawnEnvFromMock(mockSpawn);
      expect(env.ANTHROPIC_BASE_URL).toBe('http://proxy:4000');
      expect(env.ANTHROPIC_AUTH_TOKEN).toBeUndefined();
    });

    it('should set ANTHROPIC_CUSTOM_HEADERS with proxy key as x-litellm-api-key', async () => {
      const proxyConfig: LiteLLMProxyConfig = {
        baseUrl: 'http://proxy:4000',
        apiKey: 'sk-proxy-key',
        claudeCode: { routingMode: LiteLLMProxyRoutingMode.passthrough },
      };
      const executor = new ClaudeCodeExecutorService(mockSpawn as SpawnFunction);
      executor.updateProxyConfig(proxyConfig);

      const proc = createMockChildProcess();
      mockSpawn.mockReturnValue(proc);
      const promise = executor.execute('test', { cwd: '/tmp' });
      finishProcess(proc);
      await promise;

      const env = spawnEnvFromMock(mockSpawn);
      expect(env.ANTHROPIC_CUSTOM_HEADERS).toContain('x-litellm-api-key: Bearer sk-proxy-key');
    });

    it('should append user custom headers after proxy key header', async () => {
      const proxyConfig: LiteLLMProxyConfig = {
        baseUrl: 'http://proxy:4000',
        apiKey: 'sk-proxy-key',
        claudeCode: {
          routingMode: LiteLLMProxyRoutingMode.passthrough,
          customHeaders: 'x-litellm-customer-id: user-456',
        },
      };
      const executor = new ClaudeCodeExecutorService(mockSpawn as SpawnFunction);
      executor.updateProxyConfig(proxyConfig);

      const proc = createMockChildProcess();
      mockSpawn.mockReturnValue(proc);
      const promise = executor.execute('test', { cwd: '/tmp' });
      finishProcess(proc);
      await promise;

      const env = spawnEnvFromMock(mockSpawn);
      const headers = env.ANTHROPIC_CUSTOM_HEADERS!;
      expect(headers).toContain('x-litellm-api-key: Bearer sk-proxy-key');
      expect(headers).toContain('x-litellm-customer-id: user-456');
      // Proxy key should come first
      const proxyKeyIdx = headers.indexOf('x-litellm-api-key');
      const customerIdx = headers.indexOf('x-litellm-customer-id');
      expect(proxyKeyIdx).toBeLessThan(customerIdx);
    });

    it('should set model overrides in passthrough mode', async () => {
      const proxyConfig: LiteLLMProxyConfig = {
        baseUrl: 'http://proxy:4000',
        apiKey: 'sk-proxy-key',
        claudeCode: {
          routingMode: LiteLLMProxyRoutingMode.passthrough,
          sonnetModel: 'claude-sonnet-4-6',
        },
      };
      const executor = new ClaudeCodeExecutorService(mockSpawn as SpawnFunction);
      executor.updateProxyConfig(proxyConfig);

      const proc = createMockChildProcess();
      mockSpawn.mockReturnValue(proc);
      const promise = executor.execute('test', { cwd: '/tmp' });
      finishProcess(proc);
      await promise;

      const env = spawnEnvFromMock(mockSpawn);
      expect(env.ANTHROPIC_DEFAULT_SONNET_MODEL).toBe('claude-sonnet-4-6');
    });
  });

  describe('edge cases', () => {
    it('should NOT inject env vars when proxyConfig is not set', async () => {
      const executor = new ClaudeCodeExecutorService(mockSpawn as SpawnFunction);
      // No updateProxyConfig call

      const proc = createMockChildProcess();
      mockSpawn.mockReturnValue(proc);
      const promise = executor.execute('test', { cwd: '/tmp' });
      finishProcess(proc);
      await promise;

      const env = spawnEnvFromMock(mockSpawn);
      expect(env.ANTHROPIC_BASE_URL).toBeUndefined();
      expect(env.ANTHROPIC_AUTH_TOKEN).toBeUndefined();
    });

    it('should NOT inject env vars when baseUrl is missing', async () => {
      const proxyConfig: LiteLLMProxyConfig = {
        apiKey: 'sk-proxy-key',
        claudeCode: { routingMode: LiteLLMProxyRoutingMode.proxy },
      };
      const executor = new ClaudeCodeExecutorService(mockSpawn as SpawnFunction);
      executor.updateProxyConfig(proxyConfig);

      const proc = createMockChildProcess();
      mockSpawn.mockReturnValue(proc);
      const promise = executor.execute('test', { cwd: '/tmp' });
      finishProcess(proc);
      await promise;

      const env = spawnEnvFromMock(mockSpawn);
      expect(env.ANTHROPIC_BASE_URL).toBeUndefined();
      expect(env.ANTHROPIC_AUTH_TOKEN).toBeUndefined();
    });

    it('should NOT inject env vars when claudeCode config is missing', async () => {
      const proxyConfig: LiteLLMProxyConfig = {
        baseUrl: 'http://proxy:4000',
        apiKey: 'sk-proxy-key',
      };
      const executor = new ClaudeCodeExecutorService(mockSpawn as SpawnFunction);
      executor.updateProxyConfig(proxyConfig);

      const proc = createMockChildProcess();
      mockSpawn.mockReturnValue(proc);
      const promise = executor.execute('test', { cwd: '/tmp' });
      finishProcess(proc);
      await promise;

      const env = spawnEnvFromMock(mockSpawn);
      expect(env.ANTHROPIC_BASE_URL).toBeUndefined();
    });

    it('should still strip CLAUDECODE from env when proxy is active', async () => {
      process.env.CLAUDECODE = 'should-be-stripped';
      const proxyConfig: LiteLLMProxyConfig = {
        baseUrl: 'http://proxy:4000',
        apiKey: 'sk-proxy-key',
        claudeCode: { routingMode: LiteLLMProxyRoutingMode.proxy },
      };
      const executor = new ClaudeCodeExecutorService(mockSpawn as SpawnFunction);
      executor.updateProxyConfig(proxyConfig);

      const proc = createMockChildProcess();
      mockSpawn.mockReturnValue(proc);
      const promise = executor.execute('test', { cwd: '/tmp' });
      finishProcess(proc);
      await promise;

      const env = spawnEnvFromMock(mockSpawn);
      expect(env.CLAUDECODE).toBeUndefined();
      expect(env.ANTHROPIC_BASE_URL).toBe('http://proxy:4000');

      delete process.env.CLAUDECODE;
    });
  });
});
