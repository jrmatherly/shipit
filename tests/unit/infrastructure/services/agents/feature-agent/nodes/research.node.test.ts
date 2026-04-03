/**
 * Research Node Unit Tests
 *
 * The research node delegates entirely to executeNode() from node-helpers.
 * Tests verify:
 *  - Factory returns an async function
 *  - Executor is called with the research prompt
 *  - Success path: returns currentNode='research' and messages
 *  - Error path: throws error prefixed with '[research]'
 *  - Resume path: skips execution when phase already completed
 *  - Phase timing is recorded on both success and failure
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
  mockBuildResearchPrompt,
  mockIsGraphBubbleUp,
} = vi.hoisted(() => ({
  mockGetCompletedPhases: vi.fn().mockReturnValue([]),
  mockMarkPhaseComplete: vi.fn(),
  mockRecordPhaseStart: vi.fn().mockResolvedValue('timing-research-1'),
  mockRecordPhaseEnd: vi.fn().mockResolvedValue(undefined),
  mockBuildResearchPrompt: vi.fn().mockReturnValue('evaluate technical approaches prompt'),
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
  readSpecFile: vi.fn().mockReturnValue('name: research-feature\nphase: Requirements'),
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

vi.mock('@/infrastructure/services/agents/feature-agent/nodes/prompts/research.prompt.js', () => ({
  buildResearchPrompt: mockBuildResearchPrompt,
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

import { createResearchNode } from '@/infrastructure/services/agents/feature-agent/nodes/research.node.js';
import type { FeatureAgentState } from '@/infrastructure/services/agents/feature-agent/state.js';
import type { IAgentExecutor } from '@/application/ports/output/agents/agent-executor.interface.js';

function createMockExecutor(): IAgentExecutor {
  return {
    agentType: 'claude-code' as never,
    execute: vi.fn().mockResolvedValue({
      result: 'Research written to research.yaml: 3 approaches evaluated',
    }),
    executeStream: vi.fn(),
    supportsFeature: vi.fn().mockReturnValue(false),
  };
}

function baseState(overrides: Partial<FeatureAgentState> = {}): FeatureAgentState {
  return {
    featureId: 'feat-research-001',
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

describe('createResearchNode', () => {
  let executor: IAgentExecutor;

  beforeEach(() => {
    vi.clearAllMocks();
    executor = createMockExecutor();
  });

  describe('factory', () => {
    it('returns an async function', () => {
      const node = createResearchNode(executor);
      expect(typeof node).toBe('function');
    });
  });

  describe('successful execution', () => {
    it('calls executor.execute with the research prompt', async () => {
      const node = createResearchNode(executor);
      await node(baseState());

      expect(executor.execute).toHaveBeenCalledTimes(1);
      const [prompt] = (executor.execute as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(typeof prompt).toBe('string');
      expect(prompt.length).toBeGreaterThan(0);
    });

    it('returns currentNode set to "research"', async () => {
      const node = createResearchNode(executor);
      const result = await node(baseState());

      expect(result.currentNode).toBe('research');
    });

    it('returns messages array with completion entry', async () => {
      const node = createResearchNode(executor);
      const result = await node(baseState());

      expect(result.messages).toBeDefined();
      expect(result.messages!.length).toBeGreaterThan(0);
      expect(result.messages![0]).toContain('[research]');
    });

    it('marks _needsReexecution false on success', async () => {
      const node = createResearchNode(executor);
      const result = await node(baseState());

      expect(result._needsReexecution).toBe(false);
    });

    it('records phase timing start and end', async () => {
      const node = createResearchNode(executor);
      await node(baseState());

      expect(mockRecordPhaseStart).toHaveBeenCalledWith('research', expect.any(Object));
      expect(mockRecordPhaseEnd).toHaveBeenCalledWith(
        'timing-research-1',
        expect.any(Number),
        expect.objectContaining({ exitCode: 'success' })
      );
    });

    it('marks phase complete after successful execution', async () => {
      const node = createResearchNode(executor);
      await node(baseState());

      expect(mockMarkPhaseComplete).toHaveBeenCalledWith('/tmp/specs', 'research');
    });

    it('passes result length in completion message', async () => {
      (executor.execute as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        result: 'Research written to research.yaml: 3 approaches evaluated',
      });
      const node = createResearchNode(executor);
      const result = await node(baseState());

      // Message should mention result character count
      expect(result.messages![0]).toMatch(/\d+ chars/);
    });
  });

  describe('resume support', () => {
    it('skips executor when "research" is already in completedPhases', async () => {
      mockGetCompletedPhases.mockReturnValueOnce(['research']);
      const node = createResearchNode(executor);
      const result = await node(baseState());

      expect(executor.execute).not.toHaveBeenCalled();
      expect(result.currentNode).toBe('research');
    });

    it('returns message when phase already completed', async () => {
      mockGetCompletedPhases.mockReturnValueOnce(['research']);
      const node = createResearchNode(executor);
      const result = await node(baseState());

      expect(result.messages!.some((m) => m.includes('research'))).toBe(true);
    });

    it('executes normally when analyze and requirements are done but not research', async () => {
      mockGetCompletedPhases.mockReturnValueOnce(['analyze', 'requirements']);
      const node = createResearchNode(executor);
      await node(baseState());

      expect(executor.execute).toHaveBeenCalledTimes(1);
    });
  });

  describe('error handling', () => {
    it('throws error prefixed with [research] on executor failure', async () => {
      (executor.execute as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        new Error('ETIMEDOUT: network timeout')
      );
      const node = createResearchNode(executor);

      await expect(node(baseState())).rejects.toThrow('[research]');
    });

    it('includes original error message in thrown error', async () => {
      (executor.execute as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        new Error('ETIMEDOUT: network timeout')
      );
      const node = createResearchNode(executor);

      await expect(node(baseState())).rejects.toThrow('ETIMEDOUT: network timeout');
    });

    it('records phase end with exitCode=error on failure', async () => {
      (executor.execute as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        new Error('Process exited with code 1')
      );
      const node = createResearchNode(executor);

      await expect(node(baseState())).rejects.toThrow();

      expect(mockRecordPhaseEnd).toHaveBeenCalledWith(
        'timing-research-1',
        expect.any(Number),
        expect.objectContaining({ exitCode: 'error' })
      );
    });

    it('does not mark phase complete when executor fails', async () => {
      (executor.execute as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('Failed'));
      const node = createResearchNode(executor);

      await expect(node(baseState())).rejects.toThrow();

      expect(mockMarkPhaseComplete).not.toHaveBeenCalled();
    });

    it('re-throws GraphBubbleUp errors without wrapping', async () => {
      const bubbleUpError = new Error('Checkpoint bubble-up signal');
      (executor.execute as ReturnType<typeof vi.fn>).mockRejectedValueOnce(bubbleUpError);
      mockIsGraphBubbleUp.mockReturnValueOnce(true);

      const node = createResearchNode(executor);

      await expect(node(baseState())).rejects.toThrow('Checkpoint bubble-up signal');
    });
  });
});
