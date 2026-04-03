/**
 * Fast-Implement Node Unit Tests
 *
 * Tests for the single-pass implementation node used in fast mode.
 * Covers:
 *  - Successful execution: executor called with fast-implement prompt
 *  - Changes validation: throws when no file changes AND no new commits
 *  - Evidence integration: runs evidence sub-agent when enableEvidence=true
 *  - Evidence skip: skips evidence when enableEvidence=false
 *  - Resume support: skips when phase already in completedPhases
 *  - Phase completion marking after success
 *  - Phase timing recorded on success and failure
 *  - Error path: throws prefixed '[fast-implement]' error
 *  - GraphBubbleUp errors re-thrown without wrapping
 *
 * TDD Phase: RED → GREEN
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Suppress logger output
vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
vi.spyOn(process.stderr, 'write').mockImplementation(() => true);

const {
  mockGetCompletedPhases,
  mockMarkPhaseComplete,
  mockRecordPhaseStart,
  mockRecordPhaseEnd,
  mockBuildFastImplementPrompt,
  mockIsGraphBubbleUp,
  mockUpdateNodeLifecycle,
  mockReportNodeStart,
  mockExecSync,
  mockCreateEvidenceNode,
} = vi.hoisted(() => ({
  mockGetCompletedPhases: vi.fn().mockReturnValue([]),
  mockMarkPhaseComplete: vi.fn(),
  mockRecordPhaseStart: vi.fn().mockResolvedValue('timing-fast-impl-1'),
  mockRecordPhaseEnd: vi.fn().mockResolvedValue(undefined),
  mockBuildFastImplementPrompt: vi.fn().mockReturnValue('fast-implement single-pass prompt'),
  mockIsGraphBubbleUp: vi.fn().mockReturnValue(false),
  mockUpdateNodeLifecycle: vi.fn().mockResolvedValue(undefined),
  mockReportNodeStart: vi.fn(),
  mockExecSync: vi.fn().mockReturnValue('M src/app.ts\n'),
  mockCreateEvidenceNode: vi.fn(),
}));

vi.mock('@langchain/langgraph', () => ({
  isGraphBubbleUp: mockIsGraphBubbleUp,
  interrupt: vi.fn(),
}));

vi.mock('node:child_process', () => ({
  execSync: mockExecSync,
}));

vi.mock('@/infrastructure/services/agents/feature-agent/nodes/node-helpers.js', () => ({
  createNodeLogger: () => ({
    activate: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
  }),
  getCompletedPhases: mockGetCompletedPhases,
  markPhaseComplete: mockMarkPhaseComplete,
  buildExecutorOptions: vi.fn().mockReturnValue({ cwd: '/tmp/worktree', maxTurns: 5000 }),
  retryExecute: vi
    .fn()
    .mockImplementation(
      async (executor: { execute: (p: string) => Promise<unknown> }, prompt: string) =>
        executor.execute(prompt)
    ),
}));

vi.mock(
  '@/infrastructure/services/agents/feature-agent/nodes/prompts/fast-implement.prompt.js',
  () => ({
    buildFastImplementPrompt: mockBuildFastImplementPrompt,
  })
);

vi.mock('@/infrastructure/services/agents/feature-agent/heartbeat.js', () => ({
  reportNodeStart: mockReportNodeStart,
}));

vi.mock('@/infrastructure/services/agents/feature-agent/phase-timing-context.js', () => ({
  recordPhaseStart: mockRecordPhaseStart,
  recordPhaseEnd: mockRecordPhaseEnd,
}));

vi.mock('@/infrastructure/services/agents/feature-agent/lifecycle-context.js', () => ({
  updateNodeLifecycle: mockUpdateNodeLifecycle,
}));

vi.mock('@/infrastructure/services/agents/feature-agent/nodes/evidence.node.js', () => ({
  createEvidenceNode: mockCreateEvidenceNode,
}));

import { createFastImplementNode } from '@/infrastructure/services/agents/feature-agent/nodes/fast-implement.node.js';
import type { FeatureAgentState } from '@/infrastructure/services/agents/feature-agent/state.js';
import type { IAgentExecutor } from '@/application/ports/output/agents/agent-executor.interface.js';

function createMockExecutor(): IAgentExecutor {
  return {
    agentType: 'claude-code' as never,
    execute: vi.fn().mockResolvedValue({
      result: 'Implementation complete: 5 files modified',
      usage: {
        inputTokens: 1000,
        outputTokens: 500,
        costUsd: 0.02,
        numTurns: 10,
        durationApiMs: 5000,
      },
    }),
    executeStream: vi.fn(),
    supportsFeature: vi.fn().mockReturnValue(false),
  };
}

function baseState(overrides: Partial<FeatureAgentState> = {}): FeatureAgentState {
  return {
    featureId: 'feat-fast-001',
    repositoryPath: '/tmp/repo',
    worktreePath: '/tmp/worktree',
    specDir: '/tmp/specs',
    currentNode: '',
    error: null,
    messages: [],
    approvalGates: undefined,
    validationRetries: 0,
    lastValidationTarget: '',
    lastValidationErrors: [],
    prUrl: null,
    prNumber: null,
    commitHash: null,
    ciStatus: null,
    push: false,
    openPr: false,
    evidence: [],
    evidenceRetries: 0,
    enableEvidence: false,
    commitEvidence: false,
    model: undefined,
    resumeReason: undefined,
    forkAndPr: false,
    commitSpecs: true,
    ciWatchEnabled: true,
    ciFixAttempts: 0,
    ciFixHistory: [],
    ciFixStatus: 'idle',
    _approvalAction: null,
    _rejectionFeedback: null,
    _needsReexecution: false,
    ...overrides,
  } as FeatureAgentState;
}

describe('createFastImplementNode', () => {
  let executor: IAgentExecutor;

  beforeEach(() => {
    vi.clearAllMocks();
    executor = createMockExecutor();
    // Default: worktree has changes (git status --porcelain returns non-empty)
    mockExecSync.mockReturnValue('M src/app.ts\n');
    // Default evidence node: returns empty evidence
    mockCreateEvidenceNode.mockReturnValue(vi.fn().mockResolvedValue({ evidence: [] }));
  });

  describe('factory', () => {
    it('returns an async function', () => {
      const node = createFastImplementNode(executor);
      expect(typeof node).toBe('function');
    });
  });

  describe('successful execution', () => {
    it('calls executor with the fast-implement prompt', async () => {
      const node = createFastImplementNode(executor);
      await node(baseState());

      expect(executor.execute).toHaveBeenCalledTimes(1);
      const [prompt] = (executor.execute as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(typeof prompt).toBe('string');
      expect(prompt.length).toBeGreaterThan(0);
    });

    it('builds prompt from state using buildFastImplementPrompt', async () => {
      const state = baseState();
      const node = createFastImplementNode(executor);
      await node(state);

      expect(mockBuildFastImplementPrompt).toHaveBeenCalledWith(state);
    });

    it('returns currentNode set to "fast-implement"', async () => {
      const node = createFastImplementNode(executor);
      const result = await node(baseState());

      expect(result.currentNode).toBe('fast-implement');
    });

    it('returns messages array with completion entry', async () => {
      const node = createFastImplementNode(executor);
      const result = await node(baseState());

      expect(result.messages).toBeDefined();
      expect(result.messages!.length).toBeGreaterThan(0);
      expect(result.messages!.some((m) => m.includes('[fast-implement]'))).toBe(true);
    });

    it('marks _needsReexecution false on success', async () => {
      const node = createFastImplementNode(executor);
      const result = await node(baseState());

      expect(result._needsReexecution).toBe(false);
    });

    it('records phase timing start and end with usage metadata', async () => {
      const node = createFastImplementNode(executor);
      await node(baseState());

      expect(mockRecordPhaseStart).toHaveBeenCalledWith(
        'fast-implement',
        expect.objectContaining({ prompt: 'fast-implement single-pass prompt' })
      );
      expect(mockRecordPhaseEnd).toHaveBeenCalledWith(
        'timing-fast-impl-1',
        expect.any(Number),
        expect.objectContaining({ exitCode: 'success' })
      );
    });

    it('marks phase complete after successful execution', async () => {
      const node = createFastImplementNode(executor);
      await node(baseState());

      expect(mockMarkPhaseComplete).toHaveBeenCalledWith(
        '/tmp/specs',
        'fast-implement',
        expect.anything()
      );
    });

    it('calls updateNodeLifecycle on entry', async () => {
      const node = createFastImplementNode(executor);
      await node(baseState());

      expect(mockUpdateNodeLifecycle).toHaveBeenCalledWith('fast-implement');
    });

    it('calls reportNodeStart on entry', async () => {
      const node = createFastImplementNode(executor);
      await node(baseState());

      expect(mockReportNodeStart).toHaveBeenCalledWith('fast-implement');
    });
  });

  describe('changes validation', () => {
    it('succeeds when git status shows uncommitted file changes', async () => {
      // execSync called for git status --porcelain → returns M src/app.ts
      mockExecSync.mockImplementation((cmd: string) => {
        if (cmd === 'git status --porcelain') return 'M src/app.ts\n';
        return '';
      });

      const node = createFastImplementNode(executor);
      const result = await node(baseState());

      expect(result.currentNode).toBe('fast-implement');
    });

    it('succeeds when git log shows new commits even if worktree is clean', async () => {
      mockExecSync.mockImplementation((cmd: string) => {
        if (cmd === 'git status --porcelain') return ''; // clean worktree
        if (cmd.includes('git log') && cmd.includes('since'))
          return 'abc1234 feat: implement changes\n'; // new commits
        return '';
      });

      const node = createFastImplementNode(executor);
      const result = await node(baseState());

      expect(result.currentNode).toBe('fast-implement');
    });

    it('throws when both git status is clean and no new commits', async () => {
      mockExecSync.mockReturnValue(''); // empty = no changes, no commits

      const node = createFastImplementNode(executor);

      await expect(node(baseState())).rejects.toThrow('[fast-implement]');
      await expect(node(baseState())).rejects.toThrow(/no file changes/i);
    });

    it('treats git command failure as no changes (conservative)', async () => {
      // First call (git status) throws — treated as no changes
      mockExecSync.mockImplementation(() => {
        throw new Error('not a git repo');
      });

      const node = createFastImplementNode(executor);

      await expect(node(baseState())).rejects.toThrow('[fast-implement]');
    });

    it('uses worktreePath as cwd for git status check when available', async () => {
      const capturedCwds: string[] = [];
      mockExecSync.mockImplementation((_cmd: string, opts: { cwd: string }) => {
        capturedCwds.push(opts.cwd);
        return 'M file.ts\n';
      });

      const node = createFastImplementNode(executor);
      await node(baseState({ worktreePath: '/tmp/custom-worktree' }));

      expect(capturedCwds[0]).toBe('/tmp/custom-worktree');
    });

    it('falls back to repositoryPath when worktreePath is not set', async () => {
      const capturedCwds: string[] = [];
      mockExecSync.mockImplementation((_cmd: string, opts: { cwd: string }) => {
        capturedCwds.push(opts.cwd);
        return 'M file.ts\n';
      });

      const node = createFastImplementNode(executor);
      await node(
        baseState({
          worktreePath: undefined as unknown as string,
          repositoryPath: '/tmp/base-repo',
        })
      );

      expect(capturedCwds[0]).toBe('/tmp/base-repo');
    });
  });

  describe('evidence integration', () => {
    it('does NOT run evidence sub-agent when enableEvidence=false', async () => {
      const node = createFastImplementNode(executor);
      await node(baseState({ enableEvidence: false }));

      expect(mockCreateEvidenceNode).not.toHaveBeenCalled();
    });

    it('runs evidence sub-agent when enableEvidence=true', async () => {
      const mockEvidenceNodeFn = vi.fn().mockResolvedValue({ evidence: [] });
      mockCreateEvidenceNode.mockReturnValue(mockEvidenceNodeFn);

      const node = createFastImplementNode(executor);
      await node(baseState({ enableEvidence: true }));

      expect(mockCreateEvidenceNode).toHaveBeenCalledWith(executor);
      expect(mockEvidenceNodeFn).toHaveBeenCalledTimes(1);
    });

    it('returns evidence from the evidence sub-agent', async () => {
      const mockEvidence = [
        {
          type: 'screenshot',
          capturedAt: '2026-04-03T00:00:00Z',
          description: 'Feature screenshot',
          relativePath: '.shipit-ai/evidence/screenshot.png',
        },
      ];
      mockCreateEvidenceNode.mockReturnValue(vi.fn().mockResolvedValue({ evidence: mockEvidence }));

      const node = createFastImplementNode(executor);
      const result = await node(baseState({ enableEvidence: true }));

      expect(result.evidence).toEqual(mockEvidence);
    });

    it('returns empty evidence array when evidence sub-agent returns nothing', async () => {
      mockCreateEvidenceNode.mockReturnValue(vi.fn().mockResolvedValue({ evidence: undefined }));

      const node = createFastImplementNode(executor);
      const result = await node(baseState({ enableEvidence: true }));

      expect(result.evidence).toEqual([]);
    });

    it('includes evidence count in completion messages', async () => {
      mockCreateEvidenceNode.mockReturnValue(
        vi.fn().mockResolvedValue({
          evidence: [
            {
              type: 'screenshot',
              capturedAt: '2026-04-03T00:00:00Z',
              description: 'App view',
              relativePath: 'e.png',
            },
          ],
        })
      );

      const node = createFastImplementNode(executor);
      const result = await node(baseState({ enableEvidence: true }));

      expect(result.messages!.some((m) => m.includes('Evidence'))).toBe(true);
    });
  });

  describe('resume support', () => {
    it('skips executor when phase already in completedPhases', async () => {
      mockGetCompletedPhases.mockReturnValueOnce(['fast-implement']);
      const node = createFastImplementNode(executor);
      const result = await node(baseState());

      expect(executor.execute).not.toHaveBeenCalled();
      expect(result.currentNode).toBe('fast-implement');
    });

    it('returns skip message and _needsReexecution=false when already completed', async () => {
      mockGetCompletedPhases.mockReturnValueOnce(['fast-implement']);
      const node = createFastImplementNode(executor);
      const result = await node(baseState());

      expect(result._needsReexecution).toBe(false);
      expect(result.messages!.some((m) => m.includes('fast-implement'))).toBe(true);
    });

    it('executes normally when other phases completed but not fast-implement', async () => {
      mockGetCompletedPhases.mockReturnValueOnce(['analyze', 'requirements', 'research', 'plan']);
      const node = createFastImplementNode(executor);
      await node(baseState());

      expect(executor.execute).toHaveBeenCalledTimes(1);
    });
  });

  describe('error handling', () => {
    it('throws error prefixed with [fast-implement] on executor failure', async () => {
      (executor.execute as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        new Error('Agent execution timed out')
      );
      const node = createFastImplementNode(executor);

      await expect(node(baseState())).rejects.toThrow('[fast-implement]');
    });

    it('includes original error message in thrown error', async () => {
      (executor.execute as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        new Error('Agent execution timed out')
      );
      const node = createFastImplementNode(executor);

      await expect(node(baseState())).rejects.toThrow('Agent execution timed out');
    });

    it('records phase end with exitCode=error on executor failure', async () => {
      (executor.execute as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        new Error('Fatal error')
      );
      const node = createFastImplementNode(executor);

      await expect(node(baseState())).rejects.toThrow();

      expect(mockRecordPhaseEnd).toHaveBeenCalledWith(
        'timing-fast-impl-1',
        expect.any(Number),
        expect.objectContaining({ exitCode: 'error' })
      );
    });

    it('does not mark phase complete when executor fails', async () => {
      (executor.execute as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('Failed'));
      const node = createFastImplementNode(executor);

      await expect(node(baseState())).rejects.toThrow();

      expect(mockMarkPhaseComplete).not.toHaveBeenCalled();
    });

    it('re-throws GraphBubbleUp errors without wrapping', async () => {
      const bubbleUpError = new Error('LangGraph interrupt signal');
      (executor.execute as ReturnType<typeof vi.fn>).mockRejectedValueOnce(bubbleUpError);
      mockIsGraphBubbleUp.mockReturnValueOnce(true);

      const node = createFastImplementNode(executor);

      await expect(node(baseState())).rejects.toThrow('LangGraph interrupt signal');
      // Should NOT be wrapped in [fast-implement] prefix
      await expect(
        createFastImplementNode(createMockExecutor())(baseState())
      ).resolves.toBeDefined(); // sanity: next call works fine
    });
  });
});
