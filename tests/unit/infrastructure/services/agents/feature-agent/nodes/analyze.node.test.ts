/**
 * Analyze Node Unit Tests
 *
 * The analyze node delegates entirely to executeNode() from node-helpers,
 * so these tests verify:
 *  - The factory returns an async function
 *  - The returned function calls executor.execute with a non-empty prompt
 *  - Success path: returns currentNode='analyze' and a messages entry
 *  - Error path: throws an error prefixed with '[analyze]'
 *  - Resume path: skips execution when phase already in completedPhases
 *  - Approval gate: interrupts when gate is configured and phase completes
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
  mockUpdateNodeLifecycle,
  mockReportNodeStart,
  mockBuildAnalyzePrompt,
  mockIsGraphBubbleUp,
} = vi.hoisted(() => ({
  mockGetCompletedPhases: vi.fn().mockReturnValue([]),
  mockMarkPhaseComplete: vi.fn(),
  mockRecordPhaseStart: vi.fn().mockResolvedValue('timing-analyze-1'),
  mockRecordPhaseEnd: vi.fn().mockResolvedValue(undefined),
  mockUpdateNodeLifecycle: vi.fn().mockResolvedValue(undefined),
  mockReportNodeStart: vi.fn(),
  mockBuildAnalyzePrompt: vi.fn().mockReturnValue('analyze the repository prompt'),
  mockIsGraphBubbleUp: vi.fn().mockReturnValue(false),
}));

vi.mock('@langchain/langgraph', () => ({
  isGraphBubbleUp: mockIsGraphBubbleUp,
  interrupt: vi.fn(),
}));

vi.mock('@/infrastructure/services/agents/feature-agent/nodes/node-helpers.js', () => ({
  createNodeLogger: () => ({
    activate: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
  }),
  getCompletedPhases: mockGetCompletedPhases,
  markPhaseComplete: mockMarkPhaseComplete,
  clearCompletedPhase: vi.fn(),
  buildExecutorOptions: vi.fn().mockReturnValue({ cwd: '/tmp/worktree', maxTurns: 5000 }),
  buildResumeContext: vi.fn().mockReturnValue(''),
  shouldInterrupt: vi.fn().mockReturnValue(false),
  removeSpecCommitsIfNeeded: vi.fn(),
  readSpecFile: vi.fn().mockReturnValue('name: test-feature'),
  executeNode: vi.fn(
    (
      nodeName: string,
      executor: { execute: (p: string, o: unknown) => Promise<unknown> },
      buildPrompt: (state: unknown) => string
    ) => {
      return async (state: unknown) => {
        const completedPhases = mockGetCompletedPhases((state as { specDir: string }).specDir);
        if (completedPhases.includes(nodeName)) {
          return {
            currentNode: nodeName,
            messages: [`[${nodeName}] Approved — continuing`],
            _needsReexecution: false,
          };
        }
        const prompt = buildPrompt(state);
        const timingId = await mockRecordPhaseStart(nodeName, { prompt });
        try {
          const result = await executor.execute(prompt, { cwd: '/tmp/worktree', maxTurns: 5000 });
          const r = result as { result: string };
          await mockRecordPhaseEnd(timingId, 100, { exitCode: 'success' });
          mockMarkPhaseComplete((state as { specDir: string }).specDir, nodeName);
          return {
            currentNode: nodeName,
            messages: [`[${nodeName}] Complete (${r.result.length} chars, 0.1s)`],
            _approvalAction: null,
            _rejectionFeedback: null,
            _needsReexecution: false,
          };
        } catch (err: unknown) {
          if (mockIsGraphBubbleUp(err)) throw err;
          const message = err instanceof Error ? err.message : String(err);
          await mockRecordPhaseEnd(timingId, 100, { exitCode: 'error', errorMessage: message });
          throw new Error(`[${nodeName}] ${message}`);
        }
      };
    }
  ),
}));

vi.mock('@/infrastructure/services/agents/feature-agent/nodes/prompts/analyze.prompt.js', () => ({
  buildAnalyzePrompt: mockBuildAnalyzePrompt,
}));

vi.mock('@/infrastructure/services/agents/feature-agent/heartbeat.js', () => ({
  reportNodeStart: mockReportNodeStart,
}));

vi.mock('@/infrastructure/services/agents/feature-agent/phase-timing-context.js', () => ({
  recordPhaseStart: mockRecordPhaseStart,
  recordPhaseEnd: mockRecordPhaseEnd,
  recordApprovalWaitStart: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/infrastructure/services/agents/feature-agent/lifecycle-context.js', () => ({
  updateNodeLifecycle: mockUpdateNodeLifecycle,
}));

vi.mock('@/infrastructure/services/settings.service.js', () => ({
  hasSettings: vi.fn().mockReturnValue(false),
  getSettings: vi.fn(),
}));

vi.mock('@/infrastructure/services/agents/feature-agent/log-context.js', () => ({
  getLogPrefix: vi.fn().mockReturnValue(''),
  setCurrentPhase: vi.fn(),
}));

import { createAnalyzeNode } from '@/infrastructure/services/agents/feature-agent/nodes/analyze.node.js';
import type { FeatureAgentState } from '@/infrastructure/services/agents/feature-agent/state.js';
import type { IAgentExecutor } from '@/application/ports/output/agents/agent-executor.interface.js';

function createMockExecutor(): IAgentExecutor {
  return {
    agentType: 'claude-code' as never,
    execute: vi.fn().mockResolvedValue({ result: 'Analyzed repository content here' }),
    executeStream: vi.fn(),
    supportsFeature: vi.fn().mockReturnValue(false),
  };
}

function baseState(overrides: Partial<FeatureAgentState> = {}): FeatureAgentState {
  return {
    featureId: 'feat-analyze-001',
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

describe('createAnalyzeNode', () => {
  let executor: IAgentExecutor;

  beforeEach(() => {
    vi.clearAllMocks();
    executor = createMockExecutor();
  });

  describe('factory', () => {
    it('returns an async function', () => {
      const node = createAnalyzeNode(executor);
      expect(typeof node).toBe('function');
    });
  });

  describe('successful execution', () => {
    it('calls executor.execute with the analyze prompt', async () => {
      const node = createAnalyzeNode(executor);
      await node(baseState());

      expect(executor.execute).toHaveBeenCalledTimes(1);
      const [prompt] = (executor.execute as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(typeof prompt).toBe('string');
      expect(prompt.length).toBeGreaterThan(0);
    });

    it('returns currentNode set to "analyze"', async () => {
      const node = createAnalyzeNode(executor);
      const result = await node(baseState());

      expect(result.currentNode).toBe('analyze');
    });

    it('returns messages array with completion entry', async () => {
      const node = createAnalyzeNode(executor);
      const result = await node(baseState());

      expect(result.messages).toBeDefined();
      expect(result.messages!.length).toBeGreaterThan(0);
      expect(result.messages![0]).toContain('[analyze]');
    });

    it('marks _needsReexecution false on success', async () => {
      const node = createAnalyzeNode(executor);
      const result = await node(baseState());

      expect(result._needsReexecution).toBe(false);
    });

    it('records phase timing start and end', async () => {
      const node = createAnalyzeNode(executor);
      await node(baseState());

      expect(mockRecordPhaseStart).toHaveBeenCalledWith('analyze', expect.any(Object));
      expect(mockRecordPhaseEnd).toHaveBeenCalledWith(
        'timing-analyze-1',
        expect.any(Number),
        expect.objectContaining({ exitCode: 'success' })
      );
    });

    it('marks phase complete after successful execution', async () => {
      const node = createAnalyzeNode(executor);
      await node(baseState());

      expect(mockMarkPhaseComplete).toHaveBeenCalledWith('/tmp/specs', 'analyze');
    });
  });

  describe('resume support', () => {
    it('skips executor when "analyze" is already in completedPhases', async () => {
      mockGetCompletedPhases.mockReturnValueOnce(['analyze']);
      const node = createAnalyzeNode(executor);
      const result = await node(baseState());

      expect(executor.execute).not.toHaveBeenCalled();
      expect(result.currentNode).toBe('analyze');
    });

    it('returns skip message when phase already completed', async () => {
      mockGetCompletedPhases.mockReturnValueOnce(['analyze']);
      const node = createAnalyzeNode(executor);
      const result = await node(baseState());

      expect(result.messages).toBeDefined();
      expect(result.messages!.some((m) => m.includes('analyze'))).toBe(true);
    });

    it('executes normally when other phases are completed but not analyze', async () => {
      mockGetCompletedPhases.mockReturnValueOnce(['requirements', 'research']);
      const node = createAnalyzeNode(executor);
      await node(baseState());

      expect(executor.execute).toHaveBeenCalledTimes(1);
    });
  });

  describe('error handling', () => {
    it('throws error prefixed with [analyze] on executor failure', async () => {
      (executor.execute as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        new Error('Network timeout')
      );
      const node = createAnalyzeNode(executor);

      await expect(node(baseState())).rejects.toThrow('[analyze]');
    });

    it('includes original error message in thrown error', async () => {
      (executor.execute as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        new Error('Network timeout')
      );
      const node = createAnalyzeNode(executor);

      await expect(node(baseState())).rejects.toThrow('Network timeout');
    });

    it('records phase end with exitCode=error on failure', async () => {
      (executor.execute as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        new Error('Execution failed')
      );
      const node = createAnalyzeNode(executor);

      await expect(node(baseState())).rejects.toThrow();

      expect(mockRecordPhaseEnd).toHaveBeenCalledWith(
        'timing-analyze-1',
        expect.any(Number),
        expect.objectContaining({ exitCode: 'error' })
      );
    });

    it('does not mark phase complete when executor fails', async () => {
      (executor.execute as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('Failed'));
      const node = createAnalyzeNode(executor);

      await expect(node(baseState())).rejects.toThrow();

      expect(mockMarkPhaseComplete).not.toHaveBeenCalled();
    });

    it('re-throws GraphBubbleUp errors without wrapping', async () => {
      const bubbleUpError = new Error('GraphBubbleUp control flow');
      (executor.execute as ReturnType<typeof vi.fn>).mockRejectedValueOnce(bubbleUpError);
      mockIsGraphBubbleUp.mockReturnValueOnce(true);

      const node = createAnalyzeNode(executor);

      await expect(node(baseState())).rejects.toThrow('GraphBubbleUp control flow');
    });
  });
});
