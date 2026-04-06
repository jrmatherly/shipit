/**
 * Codex CLI Executor — LiteLLM Proxy Env Var Injection Tests
 *
 * Tests verify that OPENAI_BASE_URL and OPENAI_API_KEY (not CODEX_API_KEY)
 * are set in proxy mode, and CODEX_API_KEY is preserved in direct mode.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PassThrough } from 'node:stream';
import { EventEmitter } from 'node:events';
import { CodexCliExecutorService } from '../../../../../../packages/core/src/infrastructure/services/agents/common/executors/codex-cli-executor.service.js';
import { LiteLLMProxyRoutingMode } from '../../../../../../packages/core/src/domain/generated/output.js';
import type {
  LiteLLMProxyConfig,
  AgentConfig,
} from '../../../../../../packages/core/src/domain/generated/output.js';
import type { SpawnFunction } from '../../../../../../packages/core/src/infrastructure/services/agents/common/types.js';

function createMockProcess() {
  const proc = new EventEmitter() as EventEmitter & {
    stdin: PassThrough;
    stdout: PassThrough;
    stderr: PassThrough;
    pid: number;
    kill: ReturnType<typeof vi.fn>;
  };
  proc.stdin = new PassThrough();
  proc.stdout = new PassThrough();
  proc.stderr = new PassThrough();
  proc.pid = 12345;
  proc.kill = vi.fn();
  return proc;
}

function getSpawnEnv(mockSpawn: ReturnType<typeof vi.fn>): Record<string, string | undefined> {
  const spawnOpts = mockSpawn.mock.calls[0]?.[2] as Record<string, unknown> | undefined;
  return (spawnOpts?.env ?? {}) as Record<string, string | undefined>;
}

async function executeAndCapture(
  executor: CodexCliExecutorService,
  mockSpawn: ReturnType<typeof vi.fn>
): Promise<void> {
  const proc = createMockProcess();
  mockSpawn.mockReturnValue(proc);
  const promise = executor.execute('test', { cwd: '/tmp', silent: true });
  process.nextTick(() => {
    // Codex expects JSONL thread events
    proc.stdout.write('{"type":"thread.started","thread_id":"t-1"}\n');
    proc.stdout.write('{"type":"agent_message.completed","content":"done"}\n');
    proc.stdout.write('{"type":"turn.completed","usage":{"input_tokens":10,"output_tokens":5}}\n');
    proc.stdout.end();
    proc.stderr.end();
    proc.emit('close', 0);
  });
  await promise;
}

describe('CodexCliExecutorService — LiteLLM Proxy Env Var Injection', () => {
  let mockSpawn: ReturnType<typeof vi.fn>;
  const tokenAuthConfig: AgentConfig = {
    type: 'codex-cli' as any,
    authMethod: 'token' as any,
    token: 'openai-key-123',
  };

  beforeEach(() => {
    mockSpawn = vi.fn();
  });

  describe('direct mode', () => {
    it('should preserve CODEX_API_KEY from authConfig when no proxy config', async () => {
      const executor = new CodexCliExecutorService(mockSpawn as SpawnFunction, tokenAuthConfig);
      await executeAndCapture(executor, mockSpawn);

      const env = getSpawnEnv(mockSpawn);
      expect(env.CODEX_API_KEY).toBe('openai-key-123');
      expect(env.OPENAI_BASE_URL).toBeUndefined();
      expect(env.OPENAI_API_KEY).toBeUndefined();
    });

    it('should preserve CODEX_API_KEY when routingMode is direct', async () => {
      const proxyConfig: LiteLLMProxyConfig = {
        baseUrl: 'http://proxy:4000',
        apiKey: 'sk-proxy',
        codexCli: { routingMode: LiteLLMProxyRoutingMode.direct },
      };
      const executor = new CodexCliExecutorService(mockSpawn as SpawnFunction, tokenAuthConfig);
      executor.updateProxyConfig(proxyConfig);
      await executeAndCapture(executor, mockSpawn);

      const env = getSpawnEnv(mockSpawn);
      expect(env.CODEX_API_KEY).toBe('openai-key-123');
      expect(env.OPENAI_BASE_URL).toBeUndefined();
    });
  });

  describe('proxy mode', () => {
    it('should set OPENAI_BASE_URL to proxy baseUrl', async () => {
      const proxyConfig: LiteLLMProxyConfig = {
        baseUrl: 'http://proxy:4000',
        apiKey: 'sk-proxy-key',
        codexCli: { routingMode: LiteLLMProxyRoutingMode.proxy },
      };
      const executor = new CodexCliExecutorService(mockSpawn as SpawnFunction, tokenAuthConfig);
      executor.updateProxyConfig(proxyConfig);
      await executeAndCapture(executor, mockSpawn);

      expect(getSpawnEnv(mockSpawn).OPENAI_BASE_URL).toBe('http://proxy:4000');
    });

    it('should set OPENAI_API_KEY (not CODEX_API_KEY) to proxy key', async () => {
      const proxyConfig: LiteLLMProxyConfig = {
        baseUrl: 'http://proxy:4000',
        apiKey: 'sk-proxy-key',
        codexCli: { routingMode: LiteLLMProxyRoutingMode.proxy },
      };
      const executor = new CodexCliExecutorService(mockSpawn as SpawnFunction, tokenAuthConfig);
      executor.updateProxyConfig(proxyConfig);
      await executeAndCapture(executor, mockSpawn);

      const env = getSpawnEnv(mockSpawn);
      expect(env.OPENAI_API_KEY).toBe('sk-proxy-key');
      expect(env.CODEX_API_KEY).toBeUndefined();
    });

    it('should NOT set CODEX_API_KEY in proxy mode', async () => {
      const proxyConfig: LiteLLMProxyConfig = {
        baseUrl: 'http://proxy:4000',
        apiKey: 'sk-proxy-key',
        codexCli: { routingMode: LiteLLMProxyRoutingMode.proxy },
      };
      const executor = new CodexCliExecutorService(mockSpawn as SpawnFunction, tokenAuthConfig);
      executor.updateProxyConfig(proxyConfig);
      await executeAndCapture(executor, mockSpawn);

      expect(getSpawnEnv(mockSpawn).CODEX_API_KEY).toBeUndefined();
    });
  });

  describe('edge cases', () => {
    it('should NOT inject proxy env vars when baseUrl is missing', async () => {
      const proxyConfig: LiteLLMProxyConfig = {
        apiKey: 'sk-proxy-key',
        codexCli: { routingMode: LiteLLMProxyRoutingMode.proxy },
      };
      const executor = new CodexCliExecutorService(mockSpawn as SpawnFunction, tokenAuthConfig);
      executor.updateProxyConfig(proxyConfig);
      await executeAndCapture(executor, mockSpawn);

      const env = getSpawnEnv(mockSpawn);
      expect(env.OPENAI_BASE_URL).toBeUndefined();
      expect(env.CODEX_API_KEY).toBe('openai-key-123');
    });

    it('should NOT inject proxy env vars when codexCli config is absent', async () => {
      const proxyConfig: LiteLLMProxyConfig = {
        baseUrl: 'http://proxy:4000',
        apiKey: 'sk-proxy-key',
      };
      const executor = new CodexCliExecutorService(mockSpawn as SpawnFunction, tokenAuthConfig);
      executor.updateProxyConfig(proxyConfig);
      await executeAndCapture(executor, mockSpawn);

      const env = getSpawnEnv(mockSpawn);
      expect(env.OPENAI_BASE_URL).toBeUndefined();
      expect(env.CODEX_API_KEY).toBe('openai-key-123');
    });
  });
});
