/**
 * Gemini CLI Executor — LiteLLM Proxy Env Var Injection Tests
 *
 * Tests verify that GOOGLE_GEMINI_BASE_URL and GEMINI_API_KEY are
 * correctly set/overridden based on proxy routing mode.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PassThrough } from 'node:stream';
import { EventEmitter } from 'node:events';
import { GeminiCliExecutorService } from '../../../../../../packages/core/src/infrastructure/services/agents/common/executors/gemini-cli-executor.service.js';
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
  executor: GeminiCliExecutorService,
  mockSpawn: ReturnType<typeof vi.fn>
): Promise<void> {
  const proc = createMockProcess();
  mockSpawn.mockReturnValue(proc);
  const promise = executor.execute('test', { cwd: '/tmp', silent: true });
  process.nextTick(() => {
    proc.stdout.write(JSON.stringify({ response: 'done' }));
    proc.stdout.end();
    proc.stderr.end();
    proc.emit('close', 0);
  });
  await promise;
}

describe('GeminiCliExecutorService — LiteLLM Proxy Env Var Injection', () => {
  let mockSpawn: ReturnType<typeof vi.fn>;
  const tokenAuthConfig: AgentConfig = {
    type: 'gemini-cli' as any,
    authMethod: 'token' as any,
    token: 'google-api-key-123',
  };

  beforeEach(() => {
    mockSpawn = vi.fn();
  });

  describe('direct mode', () => {
    it('should preserve authConfig GEMINI_API_KEY when no proxy config', async () => {
      const executor = new GeminiCliExecutorService(mockSpawn as SpawnFunction, tokenAuthConfig);
      await executeAndCapture(executor, mockSpawn);

      const env = getSpawnEnv(mockSpawn);
      expect(env.GEMINI_API_KEY).toBe('google-api-key-123');
      expect(env.GOOGLE_GEMINI_BASE_URL).toBeUndefined();
    });

    it('should preserve authConfig GEMINI_API_KEY when routingMode is direct', async () => {
      const proxyConfig: LiteLLMProxyConfig = {
        baseUrl: 'http://proxy:4000',
        apiKey: 'sk-proxy',
        geminiCli: { routingMode: LiteLLMProxyRoutingMode.direct },
      };
      const executor = new GeminiCliExecutorService(mockSpawn as SpawnFunction, tokenAuthConfig);
      executor.updateProxyConfig(proxyConfig);
      await executeAndCapture(executor, mockSpawn);

      const env = getSpawnEnv(mockSpawn);
      expect(env.GEMINI_API_KEY).toBe('google-api-key-123');
      expect(env.GOOGLE_GEMINI_BASE_URL).toBeUndefined();
    });
  });

  describe('proxy mode', () => {
    it('should set GOOGLE_GEMINI_BASE_URL to proxy baseUrl', async () => {
      const proxyConfig: LiteLLMProxyConfig = {
        baseUrl: 'http://proxy:4000',
        apiKey: 'sk-proxy-key',
        geminiCli: { routingMode: LiteLLMProxyRoutingMode.proxy },
      };
      const executor = new GeminiCliExecutorService(mockSpawn as SpawnFunction, tokenAuthConfig);
      executor.updateProxyConfig(proxyConfig);
      await executeAndCapture(executor, mockSpawn);

      expect(getSpawnEnv(mockSpawn).GOOGLE_GEMINI_BASE_URL).toBe('http://proxy:4000');
    });

    it('should override GEMINI_API_KEY with proxy key', async () => {
      const proxyConfig: LiteLLMProxyConfig = {
        baseUrl: 'http://proxy:4000',
        apiKey: 'sk-proxy-key',
        geminiCli: { routingMode: LiteLLMProxyRoutingMode.proxy },
      };
      const executor = new GeminiCliExecutorService(mockSpawn as SpawnFunction, tokenAuthConfig);
      executor.updateProxyConfig(proxyConfig);
      await executeAndCapture(executor, mockSpawn);

      expect(getSpawnEnv(mockSpawn).GEMINI_API_KEY).toBe('sk-proxy-key');
    });

    it('should fall through to authConfig when proxy apiKey is missing', async () => {
      const proxyConfig: LiteLLMProxyConfig = {
        baseUrl: 'http://proxy:4000',
        geminiCli: { routingMode: LiteLLMProxyRoutingMode.proxy },
      };
      const executor = new GeminiCliExecutorService(mockSpawn as SpawnFunction, tokenAuthConfig);
      executor.updateProxyConfig(proxyConfig);
      await executeAndCapture(executor, mockSpawn);

      const env = getSpawnEnv(mockSpawn);
      expect(env.GOOGLE_GEMINI_BASE_URL).toBe('http://proxy:4000');
      expect(env.GEMINI_API_KEY).toBe('google-api-key-123');
    });
  });

  describe('edge cases', () => {
    it('should NOT inject proxy env vars when baseUrl is missing', async () => {
      const proxyConfig: LiteLLMProxyConfig = {
        apiKey: 'sk-proxy-key',
        geminiCli: { routingMode: LiteLLMProxyRoutingMode.proxy },
      };
      const executor = new GeminiCliExecutorService(mockSpawn as SpawnFunction, tokenAuthConfig);
      executor.updateProxyConfig(proxyConfig);
      await executeAndCapture(executor, mockSpawn);

      const env = getSpawnEnv(mockSpawn);
      expect(env.GOOGLE_GEMINI_BASE_URL).toBeUndefined();
      expect(env.GEMINI_API_KEY).toBe('google-api-key-123');
    });

    it('should NOT inject proxy env vars when geminiCli config is absent', async () => {
      const proxyConfig: LiteLLMProxyConfig = {
        baseUrl: 'http://proxy:4000',
        apiKey: 'sk-proxy-key',
      };
      const executor = new GeminiCliExecutorService(mockSpawn as SpawnFunction, tokenAuthConfig);
      executor.updateProxyConfig(proxyConfig);
      await executeAndCapture(executor, mockSpawn);

      const env = getSpawnEnv(mockSpawn);
      expect(env.GOOGLE_GEMINI_BASE_URL).toBeUndefined();
      expect(env.GEMINI_API_KEY).toBe('google-api-key-123');
    });
  });
});
