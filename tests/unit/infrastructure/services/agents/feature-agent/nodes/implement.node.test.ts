/**
 * Implement Node Unit Tests
 *
 * Tests for the phase-level implementation orchestrator that reads plan.yaml
 * and tasks.yaml, then executes each phase sequentially or in parallel.
 * Covers:
 *  - Missing plan.yaml / tasks.yaml: returns error state
 *  - Empty phases or tasks: returns error state
 *  - Single sequential phase: executes one prompt
 *  - Multiple sequential phases: executes in order
 *  - Parallel phase: spawns concurrent executor calls
 *  - Phase skip (completedPhases): resumes mid-run
 *  - Evidence integration: runs when enableEvidence=true, skips when false
 *  - Phase timing recorded for each phase and top-level
 *  - Phase progress updates in feature.yaml (via updateFeatureProgress)
 *  - markPhaseComplete called after each successful phase
 *  - Error path: throws prefixed '[implement]' error
 *  - GraphBubbleUp re-thrown without wrapping
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
  mockUpdatePhasePrompt,
  mockRecordApprovalWaitStart,
  mockShouldInterrupt,
  mockBuildImplementPhasePrompt,
  mockIsGraphBubbleUp,
  mockUpdateNodeLifecycle,
  mockReportNodeStart,
  mockReadSpecFile,
  mockRetryExecute,
  mockCreateEvidenceNode,
  mockWriteFileSync,
} = vi.hoisted(() => ({
  mockGetCompletedPhases: vi.fn().mockReturnValue([]),
  mockMarkPhaseComplete: vi.fn(),
  mockRecordPhaseStart: vi.fn().mockResolvedValue('timing-impl-1'),
  mockRecordPhaseEnd: vi.fn().mockResolvedValue(undefined),
  mockUpdatePhasePrompt: vi.fn().mockResolvedValue(undefined),
  mockRecordApprovalWaitStart: vi.fn().mockResolvedValue(undefined),
  mockShouldInterrupt: vi.fn().mockReturnValue(false),
  mockBuildImplementPhasePrompt: vi.fn().mockReturnValue('implement phase prompt'),
  mockIsGraphBubbleUp: vi.fn().mockReturnValue(false),
  mockUpdateNodeLifecycle: vi.fn().mockResolvedValue(undefined),
  mockReportNodeStart: vi.fn(),
  mockReadSpecFile: vi.fn().mockReturnValue(''),
  mockRetryExecute: vi.fn().mockResolvedValue({
    result: 'Phase implementation complete',
    usage: { inputTokens: 500, outputTokens: 200, costUsd: 0.01, numTurns: 5, durationApiMs: 2000 },
  }),
  mockCreateEvidenceNode: vi.fn(),
  mockWriteFileSync: vi.fn(),
}));

vi.mock('@langchain/langgraph', () => ({
  isGraphBubbleUp: mockIsGraphBubbleUp,
  interrupt: vi.fn(),
}));

vi.mock('node:fs', () => ({
  writeFileSync: mockWriteFileSync,
  readFileSync: vi.fn().mockReturnValue(''),
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
  readSpecFile: mockReadSpecFile,
  safeYamlLoad: vi.fn().mockReturnValue({}),
  safeYamlDump: vi.fn().mockReturnValue('status: {}'),
  shouldInterrupt: mockShouldInterrupt,
  retryExecute: mockRetryExecute,
}));

vi.mock('@/infrastructure/services/agents/feature-agent/nodes/prompts/implement.prompt.js', () => ({
  buildImplementPhasePrompt: mockBuildImplementPhasePrompt,
}));

vi.mock('@/infrastructure/services/agents/feature-agent/heartbeat.js', () => ({
  reportNodeStart: mockReportNodeStart,
}));

vi.mock('@/infrastructure/services/agents/feature-agent/phase-timing-context.js', () => ({
  recordPhaseStart: mockRecordPhaseStart,
  recordPhaseEnd: mockRecordPhaseEnd,
  recordApprovalWaitStart: mockRecordApprovalWaitStart,
  updatePhasePrompt: mockUpdatePhasePrompt,
}));

vi.mock('@/infrastructure/services/agents/feature-agent/lifecycle-context.js', () => ({
  updateNodeLifecycle: mockUpdateNodeLifecycle,
}));

vi.mock('@/infrastructure/services/agents/feature-agent/nodes/evidence.node.js', () => ({
  createEvidenceNode: mockCreateEvidenceNode,
}));

// Minimal plan and tasks YAML used across tests
const PLAN_YAML_SINGLE = `phases:
  - id: phase-1
    name: "Setup"
    description: "Initial setup"
    parallel: false
    taskIds:
      - task-1`;

const TASKS_YAML_SINGLE = `tasks:
  - id: task-1
    phaseId: phase-1
    title: "Create base module"
    description: "Set up the module skeleton"
    state: pending
    dependencies: []
    acceptanceCriteria: []
    tdd: null
    estimatedEffort: S`;

const PLAN_YAML_TWO_PHASES = `phases:
  - id: phase-1
    name: "Setup"
    parallel: false
    taskIds:
      - task-1
  - id: phase-2
    name: "Core Logic"
    parallel: false
    taskIds:
      - task-2`;

const TASKS_YAML_TWO = `tasks:
  - id: task-1
    phaseId: phase-1
    title: "Bootstrap"
    description: "Bootstrap the project"
    state: pending
    dependencies: []
    acceptanceCriteria: []
    tdd: null
    estimatedEffort: S
  - id: task-2
    phaseId: phase-2
    title: "Implement logic"
    description: "Write the core logic"
    state: pending
    dependencies: [task-1]
    acceptanceCriteria: []
    tdd: null
    estimatedEffort: M`;

const PLAN_YAML_PARALLEL = `phases:
  - id: phase-1
    name: "Parallel Work"
    parallel: true
    taskIds:
      - task-1
      - task-2`;

const TASKS_YAML_PARALLEL = `tasks:
  - id: task-1
    phaseId: phase-1
    title: "Task A"
    description: "Work A"
    state: pending
    dependencies: []
    acceptanceCriteria: []
    tdd: null
    estimatedEffort: S
  - id: task-2
    phaseId: phase-1
    title: "Task B"
    description: "Work B"
    state: pending
    dependencies: []
    acceptanceCriteria: []
    tdd: null
    estimatedEffort: S`;

import { createImplementNode } from '@/infrastructure/services/agents/feature-agent/nodes/implement.node.js';
import type { FeatureAgentState } from '@/infrastructure/services/agents/feature-agent/state.js';
import type { IAgentExecutor } from '@/application/ports/output/agents/agent-executor.interface.js';

function createMockExecutor(): IAgentExecutor {
  return {
    agentType: 'claude-code' as never,
    execute: vi.fn().mockResolvedValue({
      result: 'Phase implementation complete',
      usage: {
        inputTokens: 500,
        outputTokens: 200,
        costUsd: 0.01,
        numTurns: 5,
        durationApiMs: 2000,
      },
    }),
    executeStream: vi.fn(),
    supportsFeature: vi.fn().mockReturnValue(false),
  };
}

function baseState(overrides: Partial<FeatureAgentState> = {}): FeatureAgentState {
  return {
    featureId: 'feat-impl-001',
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

describe('createImplementNode', () => {
  let executor: IAgentExecutor;

  beforeEach(() => {
    vi.clearAllMocks();
    executor = createMockExecutor();
    // Default evidence node stub
    mockCreateEvidenceNode.mockReturnValue(
      vi.fn().mockResolvedValue({ evidence: [], messages: [] })
    );
    // Default: feature.yaml has no content (getCompletedPhases returns [])
    mockReadSpecFile.mockReturnValue('');
    mockGetCompletedPhases.mockReturnValue([]);
  });

  describe('factory', () => {
    it('returns an async function', () => {
      const node = createImplementNode(executor);
      expect(typeof node).toBe('function');
    });
  });

  describe('missing spec files', () => {
    it('returns error state when plan.yaml is missing', async () => {
      mockReadSpecFile.mockImplementation((_dir: string, file: string) =>
        file === 'tasks.yaml' ? TASKS_YAML_SINGLE : ''
      );

      const node = createImplementNode(executor);
      const result = await node(baseState());

      expect(result.error).toBeTruthy();
      expect(result.error).toContain('plan.yaml');
    });

    it('returns error state when tasks.yaml is missing', async () => {
      mockReadSpecFile.mockImplementation((_dir: string, file: string) =>
        file === 'plan.yaml' ? PLAN_YAML_SINGLE : ''
      );

      const node = createImplementNode(executor);
      const result = await node(baseState());

      expect(result.error).toBeTruthy();
      expect(result.error).toContain('tasks.yaml');
    });

    it('returns error message in messages array when files are missing', async () => {
      mockReadSpecFile.mockReturnValue('');

      const node = createImplementNode(executor);
      const result = await node(baseState());

      expect(result.messages!.some((m) => m.toLowerCase().includes('error'))).toBe(true);
    });

    it('sets currentNode=implement even on file missing error', async () => {
      mockReadSpecFile.mockReturnValue('');

      const node = createImplementNode(executor);
      const result = await node(baseState());

      expect(result.currentNode).toBe('implement');
    });
  });

  describe('empty phases or tasks', () => {
    it('returns error state when plan has no phases', async () => {
      mockReadSpecFile.mockImplementation((_dir: string, file: string) => {
        if (file === 'plan.yaml') return 'phases: []';
        if (file === 'tasks.yaml') return TASKS_YAML_SINGLE;
        return '';
      });

      const node = createImplementNode(executor);
      const result = await node(baseState());

      expect(result.error).toBeTruthy();
    });

    it('returns error state when tasks list is empty', async () => {
      mockReadSpecFile.mockImplementation((_dir: string, file: string) => {
        if (file === 'plan.yaml') return PLAN_YAML_SINGLE;
        if (file === 'tasks.yaml') return 'tasks: []';
        return '';
      });

      const node = createImplementNode(executor);
      const result = await node(baseState());

      expect(result.error).toBeTruthy();
    });
  });

  describe('single sequential phase', () => {
    beforeEach(() => {
      mockReadSpecFile.mockImplementation((_dir: string, file: string) => {
        if (file === 'plan.yaml') return PLAN_YAML_SINGLE;
        if (file === 'tasks.yaml') return TASKS_YAML_SINGLE;
        return '';
      });
    });

    it('calls retryExecute once for a single phase', async () => {
      const node = createImplementNode(executor);
      await node(baseState());

      expect(mockRetryExecute).toHaveBeenCalledTimes(1);
    });

    it('returns currentNode set to "implement"', async () => {
      const node = createImplementNode(executor);
      const result = await node(baseState());

      expect(result.currentNode).toBe('implement');
    });

    it('returns messages with phase completion info', async () => {
      const node = createImplementNode(executor);
      const result = await node(baseState());

      expect(result.messages).toBeDefined();
      expect(result.messages!.some((m) => m.includes('[implement]'))).toBe(true);
    });

    it('calls markPhaseComplete for the phase after execution', async () => {
      const node = createImplementNode(executor);
      await node(baseState());

      expect(mockMarkPhaseComplete).toHaveBeenCalledWith(
        '/tmp/specs',
        'phase-1',
        expect.anything()
      );
    });

    it('records per-phase timing start and end', async () => {
      const node = createImplementNode(executor);
      await node(baseState());

      expect(mockRecordPhaseStart).toHaveBeenCalledWith('implement:phase-1', expect.any(Object));
      expect(mockRecordPhaseEnd).toHaveBeenCalledWith(
        'timing-impl-1',
        expect.any(Number),
        expect.objectContaining({ exitCode: 'success' })
      );
    });

    it('records top-level implement phase timing', async () => {
      const node = createImplementNode(executor);
      await node(baseState());

      // First recordPhaseStart call is for top-level implement
      expect(mockRecordPhaseStart).toHaveBeenCalledWith('implement', expect.any(Object));
    });

    it('updates phase prompt via updatePhasePrompt', async () => {
      const node = createImplementNode(executor);
      await node(baseState());

      expect(mockUpdatePhasePrompt).toHaveBeenCalledWith('timing-impl-1', 'implement phase prompt');
    });
  });

  describe('multiple sequential phases', () => {
    beforeEach(() => {
      mockReadSpecFile.mockImplementation((_dir: string, file: string) => {
        if (file === 'plan.yaml') return PLAN_YAML_TWO_PHASES;
        if (file === 'tasks.yaml') return TASKS_YAML_TWO;
        return '';
      });
    });

    it('calls retryExecute once per phase', async () => {
      const node = createImplementNode(executor);
      await node(baseState());

      expect(mockRetryExecute).toHaveBeenCalledTimes(2);
    });

    it('calls markPhaseComplete for each phase', async () => {
      const node = createImplementNode(executor);
      await node(baseState());

      expect(mockMarkPhaseComplete).toHaveBeenCalledWith(
        '/tmp/specs',
        'phase-1',
        expect.anything()
      );
      expect(mockMarkPhaseComplete).toHaveBeenCalledWith(
        '/tmp/specs',
        'phase-2',
        expect.anything()
      );
    });

    it('includes completion message referencing total tasks', async () => {
      const node = createImplementNode(executor);
      const result = await node(baseState());

      // Should mention "2 tasks" across "2 phases" in the final message
      const finalMessage = result.messages!.find((m) => m.includes('Complete'));
      expect(finalMessage).toBeDefined();
    });
  });

  describe('parallel phase execution', () => {
    beforeEach(() => {
      mockReadSpecFile.mockImplementation((_dir: string, file: string) => {
        if (file === 'plan.yaml') return PLAN_YAML_PARALLEL;
        if (file === 'tasks.yaml') return TASKS_YAML_PARALLEL;
        return '';
      });
    });

    it('calls retryExecute once per task in parallel phase', async () => {
      const node = createImplementNode(executor);
      await node(baseState());

      // 2 tasks in parallel phase → 2 retryExecute calls
      expect(mockRetryExecute).toHaveBeenCalledTimes(2);
    });

    it('builds individual prompts for each task in parallel phase', async () => {
      const node = createImplementNode(executor);
      await node(baseState());

      // buildImplementPhasePrompt called once per task
      expect(mockBuildImplementPhasePrompt).toHaveBeenCalledTimes(2);
    });

    it('returns currentNode=implement after parallel phase', async () => {
      const node = createImplementNode(executor);
      const result = await node(baseState());

      expect(result.currentNode).toBe('implement');
    });
  });

  describe('resume support: skipping completed phases', () => {
    beforeEach(() => {
      mockReadSpecFile.mockImplementation((_dir: string, file: string) => {
        if (file === 'plan.yaml') return PLAN_YAML_TWO_PHASES;
        if (file === 'tasks.yaml') return TASKS_YAML_TWO;
        return '';
      });
    });

    it('skips already-completed phase and only executes remaining', async () => {
      // phase-1 is already complete, only phase-2 should run
      mockGetCompletedPhases.mockReturnValue(['phase-1']);

      const node = createImplementNode(executor);
      await node(baseState());

      // Only 1 call (phase-2), not 2
      expect(mockRetryExecute).toHaveBeenCalledTimes(1);
    });

    it('does not call markPhaseComplete for already-completed phases', async () => {
      mockGetCompletedPhases.mockReturnValue(['phase-1']);

      const node = createImplementNode(executor);
      await node(baseState());

      // markPhaseComplete only called for phase-2
      expect(mockMarkPhaseComplete).toHaveBeenCalledTimes(1);
      expect(mockMarkPhaseComplete).toHaveBeenCalledWith(
        '/tmp/specs',
        'phase-2',
        expect.anything()
      );
      expect(mockMarkPhaseComplete).not.toHaveBeenCalledWith(
        '/tmp/specs',
        'phase-1',
        expect.anything()
      );
    });
  });

  describe('evidence integration', () => {
    beforeEach(() => {
      mockReadSpecFile.mockImplementation((_dir: string, file: string) => {
        if (file === 'plan.yaml') return PLAN_YAML_SINGLE;
        if (file === 'tasks.yaml') return TASKS_YAML_SINGLE;
        return '';
      });
    });

    it('does NOT run evidence sub-agent when enableEvidence=false', async () => {
      const node = createImplementNode(executor);
      await node(baseState({ enableEvidence: false }));

      expect(mockCreateEvidenceNode).not.toHaveBeenCalled();
    });

    it('runs evidence sub-agent when enableEvidence=true', async () => {
      const mockEvidenceNodeFn = vi.fn().mockResolvedValue({ evidence: [], messages: [] });
      mockCreateEvidenceNode.mockReturnValue(mockEvidenceNodeFn);

      const node = createImplementNode(executor);
      await node(baseState({ enableEvidence: true }));

      expect(mockCreateEvidenceNode).toHaveBeenCalledWith(executor);
      expect(mockEvidenceNodeFn).toHaveBeenCalledTimes(1);
    });

    it('returns evidence from the evidence sub-agent', async () => {
      const mockEvidence = [
        {
          type: 'screenshot',
          capturedAt: '2026-04-03T00:00:00Z',
          description: 'Feature complete',
          relativePath: '.shipit-ai/evidence/done.png',
        },
      ];
      mockCreateEvidenceNode.mockReturnValue(
        vi.fn().mockResolvedValue({ evidence: mockEvidence, messages: [] })
      );

      const node = createImplementNode(executor);
      const result = await node(baseState({ enableEvidence: true }));

      expect(result.evidence).toEqual(mockEvidence);
    });

    it('returns empty evidence when evidence sub-agent returns no evidence', async () => {
      mockCreateEvidenceNode.mockReturnValue(
        vi.fn().mockResolvedValue({ evidence: undefined, messages: [] })
      );

      const node = createImplementNode(executor);
      const result = await node(baseState({ enableEvidence: true }));

      expect(result.evidence).toEqual([]);
    });

    it('includes evidence messages in final result', async () => {
      mockCreateEvidenceNode.mockReturnValue(
        vi.fn().mockResolvedValue({
          evidence: [],
          messages: ['[evidence] Complete — 0 records'],
        })
      );

      const node = createImplementNode(executor);
      const result = await node(baseState({ enableEvidence: true }));

      expect(result.messages!.some((m) => m.includes('evidence'))).toBe(true);
    });

    it('includes evidence count message even when evidence is disabled', async () => {
      const node = createImplementNode(executor);
      const result = await node(baseState({ enableEvidence: false }));

      expect(result.messages!.some((m) => m.toLowerCase().includes('evidence'))).toBe(true);
    });
  });

  describe('error handling', () => {
    beforeEach(() => {
      mockReadSpecFile.mockImplementation((_dir: string, file: string) => {
        if (file === 'plan.yaml') return PLAN_YAML_SINGLE;
        if (file === 'tasks.yaml') return TASKS_YAML_SINGLE;
        return '';
      });
    });

    it('throws error prefixed with [implement] on executor failure', async () => {
      mockRetryExecute.mockRejectedValueOnce(new Error('Agent crashed'));
      const node = createImplementNode(executor);

      await expect(node(baseState())).rejects.toThrow('[implement]');
    });

    it('includes original error message in thrown error', async () => {
      mockRetryExecute.mockRejectedValueOnce(new Error('Agent crashed'));
      const node = createImplementNode(executor);

      await expect(node(baseState())).rejects.toThrow('Agent crashed');
    });

    it('records top-level phase end with exitCode=error on failure', async () => {
      mockRetryExecute.mockRejectedValueOnce(new Error('Execution failed'));
      const node = createImplementNode(executor);

      await expect(node(baseState())).rejects.toThrow();

      // Top-level implement timing should be ended with error
      expect(mockRecordPhaseEnd).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Number),
        expect.objectContaining({ exitCode: 'error' })
      );
    });

    it('does not mark phase complete when executor fails', async () => {
      mockRetryExecute.mockRejectedValueOnce(new Error('Failed'));
      const node = createImplementNode(executor);

      await expect(node(baseState())).rejects.toThrow();

      expect(mockMarkPhaseComplete).not.toHaveBeenCalled();
    });

    it('re-throws GraphBubbleUp errors without wrapping', async () => {
      const bubbleUpError = new Error('LangGraph interrupt control flow');
      mockRetryExecute.mockRejectedValueOnce(bubbleUpError);
      mockIsGraphBubbleUp.mockReturnValueOnce(true);

      const node = createImplementNode(executor);

      await expect(node(baseState())).rejects.toThrow('LangGraph interrupt control flow');
    });
  });

  describe('token usage aggregation', () => {
    beforeEach(() => {
      mockReadSpecFile.mockImplementation((_dir: string, file: string) => {
        if (file === 'plan.yaml') return PLAN_YAML_TWO_PHASES;
        if (file === 'tasks.yaml') return TASKS_YAML_TWO;
        return '';
      });
    });

    it('records aggregated usage in top-level phase end after multiple phases', async () => {
      mockRetryExecute
        .mockResolvedValueOnce({
          result: 'Phase 1 done',
          usage: {
            inputTokens: 100,
            outputTokens: 50,
            costUsd: 0.005,
            numTurns: 3,
            durationApiMs: 1000,
          },
        })
        .mockResolvedValueOnce({
          result: 'Phase 2 done',
          usage: {
            inputTokens: 200,
            outputTokens: 100,
            costUsd: 0.01,
            numTurns: 6,
            durationApiMs: 2000,
          },
        });

      const node = createImplementNode(executor);
      await node(baseState());

      // Top-level recordPhaseEnd should include aggregated tokens
      const topLevelEnd = mockRecordPhaseEnd.mock.calls.find(
        ([_id, _dur, opts]) => opts?.exitCode === 'success' && (opts?.inputTokens ?? 0) > 100
      );
      expect(topLevelEnd).toBeDefined();
    });
  });
});
