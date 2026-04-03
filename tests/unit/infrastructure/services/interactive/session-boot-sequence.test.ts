/**
 * SessionBootSequence Unit Tests
 *
 * TDD: RED → GREEN → REFACTOR
 *
 * Tests the startSession / completeBootAsync flow:
 * - concurrent session cap enforcement
 * - DB record creation and in-memory state registration
 * - executor creation and session handle setup (new + resume)
 * - greeting stream processing (delta, tool_use, done, error)
 * - session-ready transition and timer start
 * - error handling and cleanup
 * - agent type / auth config resolution
 *
 * All external dependencies are fully mocked. No real SDK processes are created.
 */

import 'reflect-metadata';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock settings before SUT imports so resolveAgentType / resolveAuthConfig
// return predictable values without a real settings file.
vi.mock('@/infrastructure/services/settings.service.js', () => ({
  hasSettings: vi.fn().mockReturnValue(false),
  getSettings: vi.fn().mockReturnValue({
    interactiveAgent: { autoTimeoutMinutes: 15, maxConcurrentSessions: 3 },
    agent: { type: 'ClaudeCode', authMethod: 'Session' },
  }),
}));

// Mock execFileSync to prevent FeatureContextBuilder from executing CLI calls.
vi.mock('node:child_process', () => ({
  execFileSync: vi.fn(() => 'shipit-ai 0.0.0-test'),
}));

import { SessionBootSequence } from '@/infrastructure/services/interactive/session-boot-sequence.js';
import { SessionStateManager } from '@/infrastructure/services/interactive/session-state-manager.js';
import { SubscriberNotifier } from '@/infrastructure/services/interactive/subscriber-notifier.js';
import { TurnExecutor } from '@/infrastructure/services/interactive/turn-executor.js';
import { FeatureContextBuilder } from '@/infrastructure/services/interactive/feature-context.builder.js';
import { ConcurrentSessionLimitError } from '@/domain/errors/concurrent-session-limit.error.js';
import {
  InteractiveSessionStatus,
  InteractiveMessageRole,
  AgentType,
  AgentAuthMethod,
  SdlcLifecycle,
  TaskState,
} from '@/domain/generated/output.js';
import type { IInteractiveSessionRepository } from '@/application/ports/output/repositories/interactive-session-repository.interface.js';
import type { IInteractiveMessageRepository } from '@/application/ports/output/repositories/interactive-message-repository.interface.js';
import type { IAgentExecutorFactory } from '@/application/ports/output/agents/agent-executor-factory.interface.js';
import type { IFeatureRepository } from '@/application/ports/output/repositories/feature-repository.interface.js';
import type {
  IInteractiveAgentExecutor,
  InteractiveAgentSessionHandle,
  InteractiveAgentEvent,
} from '@/application/ports/output/agents/interactive-agent-executor.interface.js';
import type { Feature, InteractiveSession } from '@/domain/generated/output.js';
import { hasSettings, getSettings } from '@/infrastructure/services/settings.service.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeSessionRepo(): IInteractiveSessionRepository {
  return {
    create: vi.fn().mockResolvedValue(undefined),
    findById: vi.fn().mockResolvedValue(null),
    findByFeatureId: vi.fn().mockResolvedValue(null),
    findAllActive: vi.fn().mockResolvedValue([]),
    updateStatus: vi.fn().mockResolvedValue(undefined),
    updateLastActivity: vi.fn().mockResolvedValue(undefined),
    markAllActiveStopped: vi.fn().mockResolvedValue(undefined),
    countActiveSessions: vi.fn().mockResolvedValue(0),
    updateAgentSessionId: vi.fn().mockResolvedValue(undefined),
    getAgentSessionId: vi.fn().mockResolvedValue(null),
    updateTurnStatus: vi.fn().mockResolvedValue(undefined),
    getTurnStatuses: vi.fn().mockResolvedValue(new Map()),
    getAllActiveTurnStatuses: vi.fn().mockResolvedValue(new Map()),
    accumulateUsage: vi.fn().mockResolvedValue(undefined),
    getUsage: vi.fn().mockResolvedValue(null),
  };
}

function makeMessageRepo(): IInteractiveMessageRepository {
  return {
    create: vi.fn().mockResolvedValue(undefined),
    findByFeatureId: vi.fn().mockResolvedValue([]),
    findBySessionId: vi.fn().mockResolvedValue([]),
    deleteByFeatureId: vi.fn().mockResolvedValue(undefined),
  };
}

function makeFeature(overrides?: Partial<Feature>): Feature {
  return {
    id: 'feat-1',
    name: 'Test Feature',
    userQuery: 'do something',
    slug: 'test-feature',
    description: 'test description',
    repositoryPath: '/repo',
    branch: 'feat/test',
    lifecycle: SdlcLifecycle.Implementation,
    messages: [],
    plan: {
      id: 'plan-1',
      overview: 'build it',
      requirements: [],
      artifacts: [],
      tasks: [
        {
          id: 't1',
          title: 'Task 1',
          state: TaskState.Todo,
          dependsOn: [],
          actionItems: [],
          baseBranch: 'main',
          branch: 'feat/t1',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      state: 'Ready' as any,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    relatedArtifacts: [],
    fast: false,
    push: false,
    openPr: false,
    forkAndPr: false,
    commitSpecs: false,
    ciWatchEnabled: false,
    approvalGates: { allowPrd: false, allowPlan: false, allowMerge: false },
    worktreePath: '/repo/.worktrees/test',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as Feature;
}

/**
 * Controllable fake session handle.
 */
interface FakeHandle {
  handle: InteractiveAgentSessionHandle;
  pushEvent: (event: InteractiveAgentEvent) => void;
  endStream: () => void;
  sendMock: ReturnType<typeof vi.fn>;
  closeMock: ReturnType<typeof vi.fn>;
}

function makeFakeHandle(sessionId = 'sdk-session-abc'): FakeHandle {
  const sendMock = vi.fn().mockResolvedValue(undefined);
  const closeMock = vi.fn().mockResolvedValue(undefined);

  let resolveWait: (() => void) | null = null;
  let streamEnded = false;
  const pendingEvents: InteractiveAgentEvent[] = [];

  function pushEvent(event: InteractiveAgentEvent): void {
    pendingEvents.push(event);
    if (resolveWait) {
      const r = resolveWait;
      resolveWait = null;
      r();
    }
  }

  function endStream(): void {
    streamEnded = true;
    if (resolveWait) {
      const r = resolveWait;
      resolveWait = null;
      r();
    }
  }

  async function* stream(): AsyncIterable<InteractiveAgentEvent> {
    while (true) {
      while (pendingEvents.length > 0) {
        const event = pendingEvents.shift()!;
        yield event;
        if (event.type === 'done') return;
      }
      if (streamEnded) return;
      await new Promise<void>((resolve) => {
        resolveWait = resolve;
      });
    }
  }

  const handle: InteractiveAgentSessionHandle = {
    get sessionId() {
      return sessionId;
    },
    send: sendMock,
    stream,
    close: closeMock,
    abort: () => closeMock(),
  };

  return { handle, pushEvent, endStream, sendMock, closeMock };
}

async function flushPromises(rounds = 20): Promise<void> {
  for (let i = 0; i < rounds; i++) {
    await Promise.resolve();
  }
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe('SessionBootSequence', () => {
  let sessionRepo: IInteractiveSessionRepository;
  let messageRepo: IInteractiveMessageRepository;
  let featureRepo: IFeatureRepository;
  let executorFactory: IAgentExecutorFactory;
  let stateManager: SessionStateManager;
  let notifier: SubscriberNotifier;
  let turnExecutor: TurnExecutor;
  let contextBuilder: FeatureContextBuilder;
  let bootSequence: SessionBootSequence;

  /** Stack of fake handles — one returned per createSession/resumeSession call. */
  let fakeHandles: FakeHandle[];

  function latestHandle(): FakeHandle {
    return fakeHandles[fakeHandles.length - 1];
  }

  beforeEach(() => {
    vi.useFakeTimers();
    fakeHandles = [];

    sessionRepo = makeSessionRepo();
    messageRepo = makeMessageRepo();
    stateManager = new SessionStateManager(sessionRepo);
    notifier = new SubscriberNotifier();

    featureRepo = {
      create: vi.fn(),
      findById: vi.fn().mockResolvedValue(makeFeature()),
      findByIdPrefix: vi.fn(),
      findBySlug: vi.fn(),
      findByBranch: vi.fn(),
      list: vi.fn(),
      update: vi.fn(),
      findByParentId: vi.fn(),
      delete: vi.fn(),
      softDelete: vi.fn(),
    } as unknown as IFeatureRepository;

    const mockInteractiveExecutor: IInteractiveAgentExecutor = {
      createSession: vi.fn().mockImplementation(() => {
        const fh = makeFakeHandle();
        fakeHandles.push(fh);
        return Promise.resolve(fh.handle);
      }),
      resumeSession: vi.fn().mockImplementation(() => {
        const fh = makeFakeHandle();
        fakeHandles.push(fh);
        return Promise.resolve(fh.handle);
      }),
    };

    executorFactory = {
      createExecutor: vi.fn(),
      getSupportedAgents: vi.fn().mockReturnValue([AgentType.ClaudeCode]),
      getCliInfo: vi.fn().mockReturnValue([]),
      getSupportedModels: vi.fn().mockReturnValue([]),
      createInteractiveExecutor: vi.fn().mockReturnValue(mockInteractiveExecutor),
      supportsInteractive: vi.fn().mockReturnValue(true),
    };

    contextBuilder = new FeatureContextBuilder();
    turnExecutor = new TurnExecutor(sessionRepo, messageRepo, stateManager, notifier);

    bootSequence = new SessionBootSequence(
      executorFactory,
      featureRepo,
      contextBuilder,
      sessionRepo,
      messageRepo,
      stateManager,
      notifier,
      turnExecutor
    );

    vi.mocked(hasSettings).mockReturnValue(false);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  // ── startSession — cap enforcement ───────────────────────────────────────

  describe('startSession — concurrent session cap', () => {
    it('throws ConcurrentSessionLimitError when at the default cap', async () => {
      vi.mocked(sessionRepo.countActiveSessions).mockResolvedValue(3);
      await expect(bootSequence.startSession('feat-1', '/wt')).rejects.toBeInstanceOf(
        ConcurrentSessionLimitError
      );
    });

    it('includes correct active count and cap in the error', async () => {
      vi.mocked(sessionRepo.countActiveSessions).mockResolvedValue(3);
      const err = await bootSequence.startSession('feat-1', '/wt').catch((e: unknown) => e);
      expect(err).toBeInstanceOf(ConcurrentSessionLimitError);
      expect((err as ConcurrentSessionLimitError).activeSessions).toBe(3);
      expect((err as ConcurrentSessionLimitError).cap).toBe(3);
    });

    it('allows start when active count is below cap', async () => {
      vi.mocked(sessionRepo.countActiveSessions).mockResolvedValue(2);
      const session = await bootSequence.startSession('feat-1', '/wt');
      expect(session).toBeDefined();
    });
  });

  // ── startSession — DB record and in-memory state ─────────────────────────

  describe('startSession — record creation', () => {
    it('creates a session DB record with booting status', async () => {
      const session = await bootSequence.startSession('feat-1', '/wt');
      expect(sessionRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          featureId: 'feat-1',
          status: InteractiveSessionStatus.booting,
        })
      );
      expect(session.status).toBe(InteractiveSessionStatus.booting);
    });

    it('registers the session in the stateManager immediately', async () => {
      const session = await bootSequence.startSession('feat-1', '/wt');
      expect(stateManager.has(session.id)).toBe(true);
    });

    it('returns the session record immediately without waiting for boot', async () => {
      // The boot is fire-and-forget; startSession should return before the
      // agent's greeting is received.
      const sessionPromise = bootSequence.startSession('feat-1', '/wt');
      // No await flushPromises — just verify it resolves
      const session = await sessionPromise;
      expect(session.id).toBeDefined();
    });
  });

  // ── completeBootAsync — greeting flow ─────────────────────────────────────

  describe('completeBootAsync — greeting flow', () => {
    it('creates an interactive executor via the factory', async () => {
      await bootSequence.startSession('feat-1', '/wt');
      await flushPromises();
      expect(executorFactory.createInteractiveExecutor).toHaveBeenCalled();
    });

    it('sends the boot prompt to the agent handle', async () => {
      await bootSequence.startSession('feat-1', '/wt');
      await flushPromises();
      const fh = latestHandle();
      expect(fh.sendMock).toHaveBeenCalled();
    });

    it('persists the greeting message after done event', async () => {
      const session = await bootSequence.startSession('feat-1', '/wt');
      await flushPromises();

      const fh = latestHandle();
      fh.pushEvent({ type: 'delta', content: "Hey! I'm ready." });
      fh.pushEvent({ type: 'done', content: "Hey! I'm ready." });
      await flushPromises();

      expect(messageRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          role: InteractiveMessageRole.assistant,
          content: "Hey! I'm ready.",
          featureId: 'feat-1',
          sessionId: session.id,
        })
      );
    });

    it('transitions the session to ready after boot completes', async () => {
      const session = await bootSequence.startSession('feat-1', '/wt');
      await flushPromises();

      const fh = latestHandle();
      fh.pushEvent({ type: 'done', content: 'Ready!' });
      await flushPromises();

      expect(sessionRepo.updateStatus).toHaveBeenCalledWith(
        session.id,
        InteractiveSessionStatus.ready
      );
    });

    it('starts the idle timer after boot completes', async () => {
      const session = await bootSequence.startSession('feat-1', '/wt');
      await flushPromises();

      const fh = latestHandle();
      fh.pushEvent({ type: 'done', content: 'Ready!' });
      await flushPromises();

      const state = stateManager.get(session.id);
      expect(state?.timer).not.toBeNull();
    });

    it('notifies feature subscribers with delta events during boot', async () => {
      await bootSequence.startSession('feat-1', '/wt');
      await flushPromises();

      const chunks: string[] = [];
      notifier.subscribeByFeature('feat-1', (c) => {
        if (c.delta) chunks.push(c.delta);
      });

      const fh = latestHandle();
      fh.pushEvent({ type: 'delta', content: 'Hello, ' });
      fh.pushEvent({ type: 'delta', content: 'world!' });
      await flushPromises();

      expect(chunks).toContain('Hello, ');
      expect(chunks).toContain('world!');
    });

    it('notifies done=true after greeting completes', async () => {
      await bootSequence.startSession('feat-1', '/wt');
      await flushPromises();

      let doneFired = false;
      notifier.subscribeByFeature('feat-1', (c) => {
        if (c.done) doneFired = true;
      });

      const fh = latestHandle();
      fh.pushEvent({ type: 'done', content: 'Greeting' });
      await flushPromises();

      expect(doneFired).toBe(true);
    });

    it('sets turnStatus to idle after boot when no pending user content', async () => {
      const session = await bootSequence.startSession('feat-1', '/wt');
      await flushPromises();

      const fh = latestHandle();
      fh.pushEvent({ type: 'done', content: 'Ready' });
      await flushPromises();

      expect(sessionRepo.updateTurnStatus).toHaveBeenCalledWith(session.id, 'idle');
    });

    it('stores the SDK session ID from the handle', async () => {
      const session = await bootSequence.startSession('feat-1', '/wt');
      await flushPromises();

      const fh = latestHandle();
      fh.pushEvent({ type: 'done', content: 'Ready' });
      await flushPromises();

      const state = stateManager.get(session.id);
      expect(state?.agentSessionId).toBe('sdk-session-abc');
    });

    it('persists the SDK session ID to the DB', async () => {
      const session = await bootSequence.startSession('feat-1', '/wt');
      await flushPromises();

      const fh = latestHandle();
      fh.pushEvent({ type: 'done', content: 'Ready' });
      await flushPromises();

      expect(sessionRepo.updateAgentSessionId).toHaveBeenCalledWith(session.id, 'sdk-session-abc');
    });
  });

  // ── completeBootAsync — tool events during boot ──────────────────────────

  describe('completeBootAsync — tool events during boot', () => {
    it('notifies subscribers for tool_use events during boot', async () => {
      await bootSequence.startSession('feat-1', '/wt');
      await flushPromises();

      const logs: string[] = [];
      notifier.subscribeByFeature('feat-1', (c) => {
        if (c.log) logs.push(c.log);
      });

      const fh = latestHandle();
      fh.pushEvent({ type: 'tool_use', label: 'Read', detail: '/repo/file.ts' });
      await flushPromises();

      expect(logs.some((l) => l.includes('Read'))).toBe(true);
    });

    it('notifies subscribers for tool_result events during boot', async () => {
      await bootSequence.startSession('feat-1', '/wt');
      await flushPromises();

      const logs: string[] = [];
      notifier.subscribeByFeature('feat-1', (c) => {
        if (c.log) logs.push(c.log);
      });

      const fh = latestHandle();
      fh.pushEvent({ type: 'tool_result', label: 'Read', detail: '/repo/file.ts' });
      await flushPromises();

      expect(logs.some((l) => l.includes('Completed'))).toBe(true);
    });
  });

  // ── completeBootAsync — error handling ───────────────────────────────────

  describe('completeBootAsync — error handling', () => {
    it('marks the session as error when boot stream emits an error event', async () => {
      const session = await bootSequence.startSession('feat-1', '/wt');
      await flushPromises();
      vi.mocked(sessionRepo.updateStatus).mockClear();

      const fh = latestHandle();
      fh.pushEvent({ type: 'error', content: 'boot failed' });
      await flushPromises();

      expect(sessionRepo.updateStatus).toHaveBeenCalledWith(
        session.id,
        InteractiveSessionStatus.error
      );
    });

    it('removes the session from stateManager on boot error', async () => {
      const session = await bootSequence.startSession('feat-1', '/wt');
      await flushPromises();

      const fh = latestHandle();
      fh.pushEvent({ type: 'error', content: 'boot failed' });
      await flushPromises();

      expect(stateManager.has(session.id)).toBe(false);
    });

    it('does not re-update status if session was already stopped before boot finished', async () => {
      const session = await bootSequence.startSession('feat-1', '/wt');
      await flushPromises();

      // Stop the session manually before boot error arrives
      stateManager.delete(session.id);
      vi.mocked(sessionRepo.updateStatus).mockClear();

      const fh = latestHandle();
      fh.pushEvent({ type: 'error', content: 'some error' });
      await flushPromises();

      // Should be a no-op since stateManager no longer has the session
      expect(sessionRepo.updateStatus).not.toHaveBeenCalled();
    });
  });

  // ── session resumption ───────────────────────────────────────────────────

  describe('session resumption', () => {
    it('resumes from stoppedAgentSessionIds cache if available', async () => {
      stateManager.stoppedAgentSessionIds.set('feat-1', 'prev-agent-session');

      await bootSequence.startSession('feat-1', '/wt');
      await flushPromises();

      const mockExecutor = vi.mocked(executorFactory.createInteractiveExecutor).mock.results[0]
        ?.value as IInteractiveAgentExecutor;
      expect(mockExecutor.resumeSession).toHaveBeenCalledWith(
        'prev-agent-session',
        expect.any(Object)
      );
    });

    it('falls back to DB agent session ID when in-memory cache is empty', async () => {
      vi.mocked(sessionRepo.findByFeatureId).mockResolvedValue({
        id: 'db-sess',
        featureId: 'feat-1',
        status: InteractiveSessionStatus.stopped,
        startedAt: new Date(),
        lastActivityAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      } as InteractiveSession);
      vi.mocked(sessionRepo.getAgentSessionId).mockResolvedValue('db-agent-session');

      await bootSequence.startSession('feat-1', '/wt');
      await flushPromises();

      const mockExecutor = vi.mocked(executorFactory.createInteractiveExecutor).mock.results[0]
        ?.value as IInteractiveAgentExecutor;
      expect(mockExecutor.resumeSession).toHaveBeenCalledWith(
        'db-agent-session',
        expect.any(Object)
      );
    });

    it('creates a fresh session when no previous agent session exists', async () => {
      // No stopped sessions cache, no DB session
      await bootSequence.startSession('feat-1', '/wt');
      await flushPromises();

      const mockExecutor = vi.mocked(executorFactory.createInteractiveExecutor).mock.results[0]
        ?.value as IInteractiveAgentExecutor;
      expect(mockExecutor.createSession).toHaveBeenCalled();
      expect(mockExecutor.resumeSession).not.toHaveBeenCalled();
    });
  });

  // ── resolveAgentType / resolveAuthConfig ─────────────────────────────────

  describe('resolveAgentType', () => {
    it('returns the explicit override when provided', () => {
      const result = bootSequence.resolveAgentType('OpenAI');
      expect(result).toBe('OpenAI');
    });

    it('returns ClaudeCode default when no settings and no override', () => {
      vi.mocked(hasSettings).mockReturnValue(false);
      expect(bootSequence.resolveAgentType()).toBe(AgentType.ClaudeCode);
    });

    it('reads agent type from settings when available', () => {
      vi.mocked(hasSettings).mockReturnValue(true);
      vi.mocked(getSettings).mockReturnValue({
        agent: { type: AgentType.ClaudeCode, authMethod: AgentAuthMethod.Session },
        interactiveAgent: { autoTimeoutMinutes: 15, maxConcurrentSessions: 3 },
      } as any);

      expect(bootSequence.resolveAgentType()).toBe(AgentType.ClaudeCode);
    });
  });

  describe('resolveAuthConfig', () => {
    it('returns fallback config with ClaudeCode/Session when no settings loaded', () => {
      vi.mocked(hasSettings).mockReturnValue(false);
      const config = bootSequence.resolveAuthConfig();
      expect(config.type).toBe(AgentType.ClaudeCode);
      expect(config.authMethod).toBe(AgentAuthMethod.Session);
    });

    it('returns agent config from settings when available', () => {
      vi.mocked(hasSettings).mockReturnValue(true);
      vi.mocked(getSettings).mockReturnValue({
        agent: { type: AgentType.ClaudeCode, authMethod: AgentAuthMethod.Token, token: 'sk-x' },
        interactiveAgent: { autoTimeoutMinutes: 15, maxConcurrentSessions: 3 },
      } as any);

      const config = bootSequence.resolveAuthConfig();
      expect(config.authMethod).toBe(AgentAuthMethod.Token);
    });
  });

  // ── model override ───────────────────────────────────────────────────────

  describe('model override', () => {
    it('passes the model override to createSession options', async () => {
      await bootSequence.startSession('feat-1', '/wt', 'claude-opus-4');
      await flushPromises();

      const mockExecutor = vi.mocked(executorFactory.createInteractiveExecutor).mock.results[0]
        ?.value as IInteractiveAgentExecutor;
      expect(mockExecutor.createSession).toHaveBeenCalledWith(
        expect.objectContaining({ model: 'claude-opus-4' })
      );
    });
  });
});
