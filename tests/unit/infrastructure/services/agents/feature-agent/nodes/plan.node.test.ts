/**
 * Plan Node Unit Tests
 *
 * The plan node delegates entirely to executeNode() from node-helpers.
 * Tests verify:
 *  - Factory returns an async function
 *  - Executor is called with the plan prompt
 *  - Success path: returns currentNode='plan' and messages
 *  - Error path: throws error prefixed with '[plan]'
 *  - Resume path: skips execution when phase already completed
 *  - Phase timing recorded correctly
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
  mockBuildPlanPrompt,
  mockIsGraphBubbleUp,
} = vi.hoisted(() => ({
  mockGetCompletedPhases: vi.fn().mockReturnValue([]),
  mockMarkPhaseComplete: vi.fn(),
  mockRecordPhaseStart: vi.fn().mockResolvedValue('timing-plan-1'),
  mockRecordPhaseEnd: vi.fn().mockResolvedValue(undefined),
  mockBuildPlanPrompt: vi.fn().mockReturnValue('generate implementation plan prompt'),
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
  readSpecFile: vi.fn().mockReturnValue('name: test-plan\nphases: []'),
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

vi.mock('@/infrastructure/services/agents/feature-agent/nodes/prompts/plan.prompt.js', () => ({
  buildPlanPrompt: mockBuildPlanPrompt,
}));

vi.mock('@/infrastructure/services/agents/feature-agent/heartbeat.js', () => ({
  reportNodeStart: vi.fn(),
}));

vi.mock('@/infrastructure/services/agents/feature-agent/phase-timing-context.js', () => ({
  recordPhaseStart: mockRecordPhaseStart,
  recordPhaseEnd: mockRecordPhaseEnd,
  recordApprovalWaitStart: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/infrastructure/services/agents/feature-agent/lifecycle-context.js', () => ({
  updateNodeLifecycle: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/infrastructure/services/settings.service.js', () => ({
  hasSettings: vi.fn().mockReturnValue(false),
  getSettings: vi.fn(),
}));

vi.mock('@/infrastructure/services/agents/feature-agent/log-context.js', () => ({
  getLogPrefix: vi.fn().mockReturnValue(''),
  setCurrentPhase: vi.fn(),
}));

import { createPlanNode } from '@/infrastructure/services/agents/feature-agent/nodes/plan.node.js';
import type { FeatureAgentState } from '@/infrastructure/services/agents/feature-agent/state.js';
import type { IAgentExecutor } from '@/application/ports/output/agents/agent-executor.interface.js';

function createMockExecutor(): IAgentExecutor {
  return {
    agentType: 'claude-code' as never,
    execute: vi.fn().mockResolvedValue({ result: 'Generated plan.yaml and tasks.yaml content' }),
    executeStream: vi.fn(),
    supportsFeature: vi.fn().mockReturnValue(false),
  };
}

function baseState(overrides: Partial<FeatureAgentState> = {}): FeatureAgentState {
  return {
    featureId: 'feat-plan-001',
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

describe('createPlanNode', () => {
  let executor: IAgentExecutor;

  beforeEach(() => {
    vi.clearAllMocks();
    executor = createMockExecutor();
  });

  describe('factory', () => {
    it('returns an async function', () => {
      const node = createPlanNode(executor);
      expect(typeof node).toBe('function');
    });
  });

  describe('successful execution', () => {
    it('calls executor.execute with the plan prompt', async () => {
      const node = createPlanNode(executor);
      await node(baseState());

      expect(executor.execute).toHaveBeenCalledTimes(1);
      const [prompt] = (executor.execute as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(typeof prompt).toBe('string');
      expect(prompt.length).toBeGreaterThan(0);
    });

    it('returns currentNode set to "plan"', async () => {
      const node = createPlanNode(executor);
      const result = await node(baseState());

      expect(result.currentNode).toBe('plan');
    });

    it('returns messages array with completion entry', async () => {
      const node = createPlanNode(executor);
      const result = await node(baseState());

      expect(result.messages).toBeDefined();
      expect(result.messages!.length).toBeGreaterThan(0);
      expect(result.messages![0]).toContain('[plan]');
    });

    it('marks _needsReexecution false on success', async () => {
      const node = createPlanNode(executor);
      const result = await node(baseState());

      expect(result._needsReexecution).toBe(false);
    });

    it('records phase timing start and end', async () => {
      const node = createPlanNode(executor);
      await node(baseState());

      expect(mockRecordPhaseStart).toHaveBeenCalledWith('plan', expect.any(Object));
      expect(mockRecordPhaseEnd).toHaveBeenCalledWith(
        'timing-plan-1',
        expect.any(Number),
        expect.objectContaining({ exitCode: 'success' })
      );
    });

    it('marks phase complete after successful execution', async () => {
      const node = createPlanNode(executor);
      await node(baseState());

      expect(mockMarkPhaseComplete).toHaveBeenCalledWith('/tmp/specs', 'plan');
    });
  });

  describe('resume support', () => {
    it('skips executor when "plan" is already in completedPhases', async () => {
      mockGetCompletedPhases.mockReturnValueOnce(['plan']);
      const node = createPlanNode(executor);
      const result = await node(baseState());

      expect(executor.execute).not.toHaveBeenCalled();
      expect(result.currentNode).toBe('plan');
    });

    it('returns skip message when phase already completed', async () => {
      mockGetCompletedPhases.mockReturnValueOnce(['plan']);
      const node = createPlanNode(executor);
      const result = await node(baseState());

      expect(result.messages!.some((m) => m.includes('plan'))).toBe(true);
    });

    it('executes normally when preceding phases are done but not plan', async () => {
      mockGetCompletedPhases.mockReturnValueOnce(['analyze', 'requirements', 'research']);
      const node = createPlanNode(executor);
      await node(baseState());

      expect(executor.execute).toHaveBeenCalledTimes(1);
    });
  });

  describe('approval gate: rejected phase', () => {
    it('returns _needsReexecution=true when phase was rejected', async () => {
      // Override executeNode mock to simulate rejection path
      const { executeNode } =
        await import('@/infrastructure/services/agents/feature-agent/nodes/node-helpers.js');
      (executeNode as ReturnType<typeof vi.fn>).mockImplementationOnce(
        (nodeName: string) => async (_state: unknown) => ({
          currentNode: nodeName,
          messages: [`[${nodeName}] Rejected — will re-execute`],
          _approvalAction: null,
          _rejectionFeedback: null,
          _needsReexecution: true,
        })
      );

      const node = createPlanNode(executor);
      const result = await node(
        baseState({ _approvalAction: 'rejected', _rejectionFeedback: 'Needs more detail' })
      );

      expect(result._needsReexecution).toBe(true);
    });
  });

  describe('error handling', () => {
    it('throws error prefixed with [plan] on executor failure', async () => {
      (executor.execute as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        new Error('API rate limit exceeded')
      );
      const node = createPlanNode(executor);

      await expect(node(baseState())).rejects.toThrow('[plan]');
    });

    it('includes original error message in thrown error', async () => {
      (executor.execute as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        new Error('API rate limit exceeded')
      );
      const node = createPlanNode(executor);

      await expect(node(baseState())).rejects.toThrow('API rate limit exceeded');
    });

    it('records phase end with exitCode=error on failure', async () => {
      (executor.execute as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        new Error('Execution failed')
      );
      const node = createPlanNode(executor);

      await expect(node(baseState())).rejects.toThrow();

      expect(mockRecordPhaseEnd).toHaveBeenCalledWith(
        'timing-plan-1',
        expect.any(Number),
        expect.objectContaining({ exitCode: 'error' })
      );
    });

    it('does not mark phase complete when executor fails', async () => {
      (executor.execute as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('Failed'));
      const node = createPlanNode(executor);

      await expect(node(baseState())).rejects.toThrow();

      expect(mockMarkPhaseComplete).not.toHaveBeenCalled();
    });

    it('re-throws GraphBubbleUp errors without wrapping', async () => {
      const bubbleUpError = new Error('LangGraph interrupt control flow');
      (executor.execute as ReturnType<typeof vi.fn>).mockRejectedValueOnce(bubbleUpError);
      mockIsGraphBubbleUp.mockReturnValueOnce(true);

      const node = createPlanNode(executor);

      await expect(node(baseState())).rejects.toThrow('LangGraph interrupt control flow');
    });
  });
});
