/**
 * ExecutorBase Unit Tests
 *
 * Tests shared executor utilities via a concrete test subclass.
 * Uses the same mock patterns as the individual executor tests.
 */

import 'reflect-metadata';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { AgentType, AgentFeature } from '@/domain/generated/output.js';
import type { AgentExecutionOptions } from '@/application/ports/output/agents/agent-executor.interface.js';
import type { SpawnFunction } from '@/infrastructure/services/agents/common/types.js';
import {
  ExecutorBase,
  MAX_STDERR_BYTES,
} from '@/infrastructure/services/agents/common/executors/executor-base.js';

class TestExecutor extends ExecutorBase {
  readonly agentType = 'claude-code' as AgentType;

  async execute() {
    return { result: '' };
  }

  async *executeStream() {
    // empty
  }

  supportsFeature(_feature: AgentFeature) {
    return false;
  }

  // Expose protected methods for testing
  public testLog(msg: string) {
    this.log(msg);
  }

  public testBuildSpawnOptions(opts?: AgentExecutionOptions) {
    return this.buildSpawnOptions(opts);
  }

  public testBuildSpawnEnv() {
    return this.buildSpawnEnv();
  }

  public testCreateStderrHandler() {
    return this.createStderrHandler();
  }

  public testCreateLineBufferHandler(onLine: (line: string) => void) {
    return this.createLineBufferHandler(onLine);
  }

  public testCreateTimeoutHandler(proc: { kill: () => void }, timeoutMs: number | undefined) {
    return this.createTimeoutHandler(proc, timeoutMs);
  }

  public testCreateStreamQueue() {
    return this.createStreamQueue();
  }

  public testHandleProcessError(
    error: Error & { code?: string },
    timeoutClear: () => void,
    cliName: string,
    installInstructions: string
  ) {
    return this.handleProcessError(error, timeoutClear, cliName, installInstructions);
  }

  public setSilent(val: boolean) {
    this.silent = val;
  }
}

describe('ExecutorBase', () => {
  let executor: TestExecutor;
  const mockSpawn = vi.fn() as unknown as SpawnFunction;

  beforeEach(() => {
    executor = new TestExecutor(mockSpawn);
  });

  describe('log()', () => {
    it('should write to stdout when not silent', () => {
      const writeSpy = vi.spyOn(process.stdout, 'write').mockReturnValue(true);
      executor.testLog('test message');
      expect(writeSpy).toHaveBeenCalledTimes(1);
      expect(writeSpy.mock.calls[0][0]).toContain('test message');
      writeSpy.mockRestore();
    });

    it('should suppress output when silent', () => {
      const writeSpy = vi.spyOn(process.stdout, 'write').mockReturnValue(true);
      executor.setSilent(true);
      executor.testLog('should not appear');
      expect(writeSpy).not.toHaveBeenCalled();
      writeSpy.mockRestore();
    });
  });

  describe('buildSpawnOptions()', () => {
    it('should set stdio to pipe', () => {
      const opts = executor.testBuildSpawnOptions();
      expect(opts.stdio).toEqual(['pipe', 'pipe', 'pipe']);
    });

    it('should set cwd from options', () => {
      const opts = executor.testBuildSpawnOptions({ cwd: '/my/dir' });
      expect(opts.cwd).toBe('/my/dir');
    });

    it('should strip CLAUDECODE from env', () => {
      const original = process.env.CLAUDECODE;
      process.env.CLAUDECODE = 'test-value';
      try {
        const opts = executor.testBuildSpawnOptions();
        const env = opts.env as Record<string, string | undefined>;
        expect(env.CLAUDECODE).toBeUndefined();
      } finally {
        if (original !== undefined) {
          process.env.CLAUDECODE = original;
        } else {
          delete process.env.CLAUDECODE;
        }
      }
    });
  });

  describe('buildSpawnEnv()', () => {
    it('should return env without CLAUDECODE', () => {
      const original = process.env.CLAUDECODE;
      process.env.CLAUDECODE = 'should-be-stripped';
      try {
        const env = executor.testBuildSpawnEnv();
        expect(env.CLAUDECODE).toBeUndefined();
        expect(env.PATH).toBeDefined();
      } finally {
        if (original !== undefined) {
          process.env.CLAUDECODE = original;
        } else {
          delete process.env.CLAUDECODE;
        }
      }
    });
  });

  describe('createStderrHandler()', () => {
    it('should accumulate stderr data', () => {
      const { handler, getStderr } = executor.testCreateStderrHandler();
      const writeSpy = vi.spyOn(process.stdout, 'write').mockReturnValue(true);

      handler(Buffer.from('error line 1\n'));
      handler(Buffer.from('error line 2\n'));

      expect(getStderr()).toContain('error line 1');
      expect(getStderr()).toContain('error line 2');
      writeSpy.mockRestore();
    });

    it('should truncate at MAX_STDERR_BYTES keeping tail', () => {
      const { handler, getStderr } = executor.testCreateStderrHandler();
      const writeSpy = vi.spyOn(process.stdout, 'write').mockReturnValue(true);

      const bigChunk = 'x'.repeat(MAX_STDERR_BYTES + 1000);
      handler(Buffer.from(bigChunk));

      expect(getStderr().length).toBeLessThanOrEqual(MAX_STDERR_BYTES);
      writeSpy.mockRestore();
    });
  });

  describe('createLineBufferHandler()', () => {
    it('should emit complete lines via callback', () => {
      const lines: string[] = [];
      const { handler } = executor.testCreateLineBufferHandler((l) => lines.push(l));

      handler(Buffer.from('line one\nline two\n'));

      expect(lines).toEqual(['line one', 'line two']);
    });

    it('should buffer incomplete lines', () => {
      const lines: string[] = [];
      const { handler } = executor.testCreateLineBufferHandler((l) => lines.push(l));

      handler(Buffer.from('partial'));
      expect(lines).toEqual([]);

      handler(Buffer.from(' complete\n'));
      expect(lines).toEqual(['partial complete']);
    });

    it('should flush remaining buffer content', () => {
      const lines: string[] = [];
      const { handler, flush } = executor.testCreateLineBufferHandler((l) => lines.push(l));

      handler(Buffer.from('no newline at end'));
      expect(lines).toEqual([]);

      flush();
      expect(lines).toEqual(['no newline at end']);
    });

    it('should skip empty lines', () => {
      const lines: string[] = [];
      const { handler } = executor.testCreateLineBufferHandler((l) => lines.push(l));

      handler(Buffer.from('first\n\n\nsecond\n'));

      expect(lines).toEqual(['first', 'second']);
    });
  });

  describe('createTimeoutHandler()', () => {
    it('should not be timed out initially', () => {
      const proc = { kill: vi.fn() };
      const { isTimedOut, clear } = executor.testCreateTimeoutHandler(proc, 5000);

      expect(isTimedOut()).toBe(false);
      clear();
    });

    it('should kill process after timeout', async () => {
      vi.useFakeTimers();
      const proc = { kill: vi.fn() };
      const { isTimedOut, clear } = executor.testCreateTimeoutHandler(proc, 100);

      expect(isTimedOut()).toBe(false);
      vi.advanceTimersByTime(100);

      expect(isTimedOut()).toBe(true);
      expect(proc.kill).toHaveBeenCalled();
      clear();
      vi.useRealTimers();
    });

    it('should not set timeout when undefined', () => {
      const proc = { kill: vi.fn() };
      const { isTimedOut, clear } = executor.testCreateTimeoutHandler(proc, undefined);

      expect(isTimedOut()).toBe(false);
      clear();
    });

    it('should clear timeout on clear()', () => {
      vi.useFakeTimers();
      const proc = { kill: vi.fn() };
      const { isTimedOut, clear } = executor.testCreateTimeoutHandler(proc, 100);

      clear();
      vi.advanceTimersByTime(200);

      expect(isTimedOut()).toBe(false);
      expect(proc.kill).not.toHaveBeenCalled();
      vi.useRealTimers();
    });
  });

  describe('createStreamQueue()', () => {
    it('should enqueue and shift items in order', () => {
      const q = executor.testCreateStreamQueue();

      q.enqueue({ type: 'progress', content: 'a', timestamp: new Date() });
      q.enqueue({ type: 'progress', content: 'b', timestamp: new Date() });

      expect(q.shift()?.content).toBe('a');
      expect(q.shift()?.content).toBe('b');
    });

    it('should resolve waitForItem when item is enqueued', async () => {
      const q = executor.testCreateStreamQueue();

      const waiting = q.waitForItem();
      q.enqueue({ type: 'progress', content: 'x', timestamp: new Date() });

      await waiting;
      expect(q.shift()?.content).toBe('x');
    });

    it('should resolve immediately when items exist', async () => {
      const q = executor.testCreateStreamQueue();
      q.enqueue({ type: 'progress', content: 'y', timestamp: new Date() });

      await q.waitForItem();
      expect(q.shift()?.content).toBe('y');
    });

    it('should handle null (end signal)', () => {
      const q = executor.testCreateStreamQueue();
      q.enqueue(null);

      expect(q.shift()).toBeNull();
    });

    it('should report length', () => {
      const q = executor.testCreateStreamQueue();
      expect(q.length).toBe(0);

      q.enqueue({ type: 'progress', content: 'z', timestamp: new Date() });
      expect(q.length).toBe(1);
    });
  });

  describe('handleProcessError()', () => {
    it('should return ENOENT error with install instructions', () => {
      const error = Object.assign(new Error('spawn claude ENOENT'), { code: 'ENOENT' });
      const clearFn = vi.fn();
      const writeSpy = vi.spyOn(process.stdout, 'write').mockReturnValue(true);

      const result = executor.testHandleProcessError(
        error,
        clearFn,
        'Claude Code CLI ("claude") not found',
        'Please install it: https://docs.anthropic.com'
      );

      expect(result.message).toContain('Claude Code CLI');
      expect(result.message).toContain('Please install it');
      expect(clearFn).toHaveBeenCalled();
      writeSpy.mockRestore();
    });

    it('should return original error for non-ENOENT', () => {
      const error = Object.assign(new Error('permission denied'), { code: 'EACCES' });
      const clearFn = vi.fn();
      const writeSpy = vi.spyOn(process.stdout, 'write').mockReturnValue(true);

      const result = executor.testHandleProcessError(error, clearFn, 'CLI', 'Install it');

      expect(result.message).toBe('permission denied');
      expect(clearFn).toHaveBeenCalled();
      writeSpy.mockRestore();
    });
  });

  describe('MAX_STDERR_BYTES export', () => {
    it('should be 100KB', () => {
      expect(MAX_STDERR_BYTES).toBe(100 * 1024);
    });
  });
});
