/**
 * CopilotCliExecutorService Unit Tests
 *
 * Tests for the GitHub Copilot CLI subprocess executor service.
 * Uses constructor-injected spawn function mock (NOT vi.mock of child_process).
 *
 * TDD Phase: RED-GREEN
 */

import 'reflect-metadata';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EventEmitter } from 'node:events';
import { PassThrough } from 'node:stream';
import { CopilotCliExecutorService } from '@/infrastructure/services/agents/common/executors/copilot-cli-executor.service.js';
import type { SpawnFunction } from '@/infrastructure/services/agents/common/types.js';
import { AgentType, AgentFeature } from '@/domain/generated/output.js';

/**
 * Creates a mock ChildProcess-like object that can emit events and provide
 * stdout/stderr streams for testing subprocess interactions.
 */
function createMockChildProcess() {
  const stdin = new PassThrough();
  const stdout = new PassThrough();
  const stderr = new PassThrough();
  const proc = new EventEmitter() as EventEmitter & {
    stdin: PassThrough;
    stdout: PassThrough;
    stderr: PassThrough;
    pid: number;
    kill: ReturnType<typeof vi.fn>;
  };
  proc.stdin = stdin;
  proc.stdout = stdout;
  proc.stderr = stderr;
  proc.pid = 12345;
  proc.kill = vi.fn();
  return proc;
}

/** Emit stdout data followed by close */
function emitStreamData(
  proc: ReturnType<typeof createMockChildProcess>,
  data: string | null,
  stderrData: string | null,
  exitCode: number | null
) {
  process.nextTick(() => {
    if (data !== null) proc.stdout.write(data);
    proc.stdout.end();
    if (stderrData !== null) proc.stderr.write(stderrData);
    proc.stderr.end();
    proc.emit('close', exitCode);
  });
}

describe('CopilotCliExecutorService', () => {
  let mockSpawn: SpawnFunction;
  let executor: CopilotCliExecutorService;

  beforeEach(() => {
    mockSpawn = vi.fn();
    executor = new CopilotCliExecutorService(mockSpawn);
  });

  describe('agentType', () => {
    it('should have agentType of CopilotCli', () => {
      expect(executor.agentType).toBe(AgentType.CopilotCli);
    });
  });

  describe('supportsFeature', () => {
    it('should support streaming feature', () => {
      expect(executor.supportsFeature(AgentFeature.streaming)).toBe(true);
    });

    it('should support tool-scoping feature', () => {
      expect(executor.supportsFeature(AgentFeature.toolScoping)).toBe(true);
    });

    it('should NOT support session-resume feature', () => {
      expect(executor.supportsFeature(AgentFeature.sessionResume)).toBe(false);
    });
  });

  describe('execute', () => {
    it('should execute prompt and return result', async () => {
      const mockProc = createMockChildProcess();
      vi.mocked(mockSpawn).mockReturnValue(mockProc as any);

      const executePromise = executor.execute('Test prompt', { silent: true });
      emitStreamData(mockProc, 'Response text', null, 0);

      const result = await executePromise;

      expect(result.result).toBe('Response text');
      expect(mockSpawn).toHaveBeenCalledWith(
        'copilot',
        expect.arrayContaining(['-s', '-p', 'Test prompt']),
        expect.any(Object)
      );
    });

    it('should handle subprocess errors gracefully', async () => {
      const mockProc = createMockChildProcess();
      vi.mocked(mockSpawn).mockReturnValue(mockProc as any);

      const executePromise = executor.execute('Bad prompt', { silent: true });
      emitStreamData(mockProc, null, 'Error: Auth failed', 1);

      await expect(executePromise).rejects.toThrow('Auth failed');
    });
  });

  // -------------------------------------------------------------------------
  // Permission mode handling
  // -------------------------------------------------------------------------

  describe('permissionMode', () => {
    it('should include --yolo when permissionMode is yolo', async () => {
      const mockProc = createMockChildProcess();
      vi.mocked(mockSpawn).mockReturnValue(mockProc as any);

      const executePromise = executor.execute('Test', {
        permissionMode: 'yolo' as any,
        silent: true,
      });
      emitStreamData(mockProc, 'Done', null, 0);

      await executePromise;

      const args = vi.mocked(mockSpawn).mock.calls[0][1] as string[];
      expect(args).toContain('--yolo');
    });

    it('should include --allow-all-paths when permissionMode is allow-paths', async () => {
      const mockProc = createMockChildProcess();
      vi.mocked(mockSpawn).mockReturnValue(mockProc as any);

      const executePromise = executor.execute('Test', {
        permissionMode: 'allow-paths' as any,
        silent: true,
      });
      emitStreamData(mockProc, 'Done', null, 0);

      await executePromise;

      const args = vi.mocked(mockSpawn).mock.calls[0][1] as string[];
      expect(args).toContain('--allow-all-paths');
      expect(args).not.toContain('--yolo');
    });

    it('should include NEITHER --yolo NOR --allow-all-paths when permissionMode is prompt', async () => {
      const mockProc = createMockChildProcess();
      vi.mocked(mockSpawn).mockReturnValue(mockProc as any);

      const executePromise = executor.execute('Test', {
        permissionMode: 'prompt' as any,
        silent: true,
      });
      emitStreamData(mockProc, 'Done', null, 0);

      await executePromise;

      const args = vi.mocked(mockSpawn).mock.calls[0][1] as string[];
      expect(args).not.toContain('--yolo');
      expect(args).not.toContain('--allow-all-paths');
    });

    it('should default to --yolo when permissionMode is undefined (backward compat)', async () => {
      const mockProc = createMockChildProcess();
      vi.mocked(mockSpawn).mockReturnValue(mockProc as any);

      const executePromise = executor.execute('Test', { silent: true });
      emitStreamData(mockProc, 'Done', null, 0);

      await executePromise;

      const args = vi.mocked(mockSpawn).mock.calls[0][1] as string[];
      expect(args).toContain('--yolo');
    });
  });
});
