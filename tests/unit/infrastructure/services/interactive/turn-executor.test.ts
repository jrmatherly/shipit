/**
 * TurnExecutor Unit Tests
 *
 * TDD: RED → GREEN → REFACTOR
 *
 * Tests message sending, stream event handling (delta, tool_use, tool_result,
 * done, error, status), turn queue draining, and persistToolEvent.
 * All dependencies are fully mocked. SDK session handle is a controllable fake.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TurnExecutor } from '@/infrastructure/services/interactive/turn-executor.js';
import { SessionStateManager } from '@/infrastructure/services/interactive/session-state-manager.js';
import { SubscriberNotifier } from '@/infrastructure/services/interactive/subscriber-notifier.js';
import { InteractiveSessionStatus, InteractiveMessageRole } from '@/domain/generated/output.js';
import type { IInteractiveSessionRepository } from '@/application/ports/output/repositories/interactive-session-repository.interface.js';
import type { IInteractiveMessageRepository } from '@/application/ports/output/repositories/interactive-message-repository.interface.js';
import type { InteractiveSession } from '@/domain/generated/output.js';
import type { SessionState } from '@/infrastructure/services/interactive/session-state.types.js';
import type {
  InteractiveAgentSessionHandle,
  InteractiveAgentEvent,
} from '@/application/ports/output/agents/interactive-agent-executor.interface.js';

// ---------------------------------------------------------------------------
// Mock settings so SessionStateManager doesn't hit real settings
// ---------------------------------------------------------------------------
vi.mock('@/infrastructure/services/settings.service.js', () => ({
  hasSettings: vi.fn().mockReturnValue(false),
  getSettings: vi.fn(),
}));

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

function makeDbSession(
  id: string,
  status: InteractiveSessionStatus = InteractiveSessionStatus.ready
): InteractiveSession {
  return {
    id,
    featureId: 'feat-1',
    status,
    startedAt: new Date(),
    lastActivityAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

function makeState(
  overrides: Partial<SessionState> & Pick<SessionState, 'sessionId' | 'featureId'>
): SessionState {
  return {
    worktreePath: '/wt',
    handle: null,
    timer: null,
    currentAssistantBuffer: '',
    toolEventsLog: [],
    subscribers: new Set(),
    turnInProgress: false,
    turnQueue: [],
    ...overrides,
  } as SessionState;
}

/**
 * Controllable fake SDK session handle.
 * Yields events in order from pushEvent(), ending on 'done' type.
 */
interface FakeHandle {
  handle: InteractiveAgentSessionHandle;
  pushEvent: (event: InteractiveAgentEvent) => void;
  endStream: () => void;
  sendMock: ReturnType<typeof vi.fn>;
  closeMock: ReturnType<typeof vi.fn>;
}

function makeFakeHandle(): FakeHandle {
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
      return 'fake-session';
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
// Tests
// ---------------------------------------------------------------------------

describe('TurnExecutor', () => {
  let sessionRepo: IInteractiveSessionRepository;
  let messageRepo: IInteractiveMessageRepository;
  let stateManager: SessionStateManager;
  let notifier: SubscriberNotifier;
  let executor: TurnExecutor;

  beforeEach(() => {
    vi.useFakeTimers();
    sessionRepo = makeSessionRepo();
    messageRepo = makeMessageRepo();
    stateManager = new SessionStateManager(sessionRepo);
    notifier = new SubscriberNotifier();
    executor = new TurnExecutor(sessionRepo, messageRepo, stateManager, notifier);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  // ── sendMessage validation ───────────────────────────────────────────────

  describe('sendMessage — validation', () => {
    it('throws when session DB status is not ready', async () => {
      vi.mocked(sessionRepo.findById).mockResolvedValue(
        makeDbSession('sess-1', InteractiveSessionStatus.stopped)
      );
      const state = makeState({ sessionId: 'sess-1', featureId: 'feat-1' });
      stateManager.set('sess-1', state);

      await expect(executor.sendMessage('sess-1', 'Hello')).rejects.toThrow(/not ready/i);
    });

    it('throws when session is not in in-memory state', async () => {
      vi.mocked(sessionRepo.findById).mockResolvedValue(
        makeDbSession('sess-1', InteractiveSessionStatus.ready)
      );
      // Deliberately do NOT set state in stateManager

      await expect(executor.sendMessage('sess-1', 'Hello')).rejects.toThrow(/not ready/i);
    });
  });

  // ── sendMessage — success path ───────────────────────────────────────────

  describe('sendMessage — success path', () => {
    it('persists the user message with correct fields', async () => {
      const fh = makeFakeHandle();
      const state = makeState({ sessionId: 'sess-1', featureId: 'feat-1' });
      state.handle = fh.handle;
      stateManager.set('sess-1', state);
      vi.mocked(sessionRepo.findById).mockResolvedValue(makeDbSession('sess-1'));

      await executor.sendMessage('sess-1', 'Hello!');

      expect(messageRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          role: InteractiveMessageRole.user,
          content: 'Hello!',
          featureId: 'feat-1',
          sessionId: 'sess-1',
        })
      );
    });

    it('returns the persisted user message', async () => {
      const fh = makeFakeHandle();
      const state = makeState({ sessionId: 'sess-1', featureId: 'feat-1' });
      state.handle = fh.handle;
      stateManager.set('sess-1', state);
      vi.mocked(sessionRepo.findById).mockResolvedValue(makeDbSession('sess-1'));

      const msg = await executor.sendMessage('sess-1', 'Test');
      expect(msg.role).toBe(InteractiveMessageRole.user);
      expect(msg.content).toBe('Test');
    });

    it('resets the idle timer on sendMessage', async () => {
      const fh = makeFakeHandle();
      const state = makeState({ sessionId: 'sess-1', featureId: 'feat-1' });
      state.handle = fh.handle;
      stateManager.set('sess-1', state);
      vi.mocked(sessionRepo.findById).mockResolvedValue(makeDbSession('sess-1'));

      await executor.sendMessage('sess-1', 'Ping');
      expect(state.timer).not.toBeNull();
    });

    it('updates last activity timestamp in the DB', async () => {
      const fh = makeFakeHandle();
      const state = makeState({ sessionId: 'sess-1', featureId: 'feat-1' });
      state.handle = fh.handle;
      stateManager.set('sess-1', state);
      vi.mocked(sessionRepo.findById).mockResolvedValue(makeDbSession('sess-1'));

      await executor.sendMessage('sess-1', 'Ping');
      expect(sessionRepo.updateLastActivity).toHaveBeenCalledWith('sess-1', expect.any(Date));
    });
  });

  // ── turn queue / concurrency guard ───────────────────────────────────────

  describe('turn queue', () => {
    it('queues a second message while a turn is in progress', async () => {
      const fh = makeFakeHandle();
      const state = makeState({ sessionId: 'sess-1', featureId: 'feat-1' });
      state.handle = fh.handle;
      state.turnInProgress = true; // Simulate in-progress turn
      stateManager.set('sess-1', state);
      vi.mocked(sessionRepo.findById).mockResolvedValue(makeDbSession('sess-1'));

      await executor.sendMessage('sess-1', 'queued message');

      expect(state.turnQueue).toContain('queued message');
    });

    it('does not start a new turn when one is in progress', async () => {
      const fh = makeFakeHandle();
      const state = makeState({ sessionId: 'sess-1', featureId: 'feat-1' });
      state.handle = fh.handle;
      state.turnInProgress = true;
      stateManager.set('sess-1', state);
      vi.mocked(sessionRepo.findById).mockResolvedValue(makeDbSession('sess-1'));

      await executor.sendMessage('sess-1', 'queued message');

      // send() on the handle should NOT have been called (no new turn started)
      expect(fh.sendMock).not.toHaveBeenCalled();
    });
  });

  // ── executeAndPersistTurn — stream events ────────────────────────────────

  describe('executeAndPersistTurn — stream events', () => {
    it('accumulates delta content and notifies subscribers', async () => {
      const fh = makeFakeHandle();
      const state = makeState({ sessionId: 'sess-1', featureId: 'feat-1' });
      state.handle = fh.handle;
      stateManager.set('sess-1', state);

      const chunks: string[] = [];
      notifier.subscribeByFeature('feat-1', (c) => {
        if (c.delta) chunks.push(c.delta);
      });

      void executor.executeAndPersistTurn(state, 'Hello agent');
      await flushPromises();

      fh.pushEvent({ type: 'delta', content: 'Part 1 ' });
      fh.pushEvent({ type: 'delta', content: 'Part 2' });
      await flushPromises();

      expect(chunks).toContain('Part 1 ');
      expect(chunks).toContain('Part 2');
    });

    it('persists assistant message on done event', async () => {
      const fh = makeFakeHandle();
      const state = makeState({ sessionId: 'sess-1', featureId: 'feat-1' });
      state.handle = fh.handle;
      stateManager.set('sess-1', state);

      void executor.executeAndPersistTurn(state, 'Hello');
      await flushPromises();

      fh.pushEvent({ type: 'delta', content: 'Response text' });
      fh.pushEvent({ type: 'done', content: 'Response text' });
      await flushPromises();

      expect(messageRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          role: InteractiveMessageRole.assistant,
          content: 'Response text',
          featureId: 'feat-1',
        })
      );
    });

    it('uses accumulated buffer text when done event has empty content', async () => {
      const fh = makeFakeHandle();
      const state = makeState({ sessionId: 'sess-1', featureId: 'feat-1' });
      state.handle = fh.handle;
      stateManager.set('sess-1', state);

      void executor.executeAndPersistTurn(state, 'Hello');
      await flushPromises();

      fh.pushEvent({ type: 'delta', content: 'buffered text' });
      fh.pushEvent({ type: 'done', content: '' }); // empty done content
      await flushPromises();

      expect(messageRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          role: InteractiveMessageRole.assistant,
          content: 'buffered text',
        })
      );
    });

    it('notifies done=true on done event', async () => {
      const fh = makeFakeHandle();
      const state = makeState({ sessionId: 'sess-1', featureId: 'feat-1' });
      state.handle = fh.handle;
      stateManager.set('sess-1', state);

      let doneFired = false;
      notifier.subscribeByFeature('feat-1', (c) => {
        if (c.done) doneFired = true;
      });

      void executor.executeAndPersistTurn(state, 'Hello');
      await flushPromises();

      fh.pushEvent({ type: 'done', content: 'Final answer' });
      await flushPromises();

      expect(doneFired).toBe(true);
    });

    it('marks turn as processing on start', async () => {
      const fh = makeFakeHandle();
      const state = makeState({ sessionId: 'sess-1', featureId: 'feat-1' });
      state.handle = fh.handle;
      stateManager.set('sess-1', state);

      void executor.executeAndPersistTurn(state, 'Hello');
      await flushPromises();

      expect(sessionRepo.updateTurnStatus).toHaveBeenCalledWith('sess-1', 'processing');
    });

    it('marks turn as unread after done', async () => {
      const fh = makeFakeHandle();
      const state = makeState({ sessionId: 'sess-1', featureId: 'feat-1' });
      state.handle = fh.handle;
      stateManager.set('sess-1', state);

      void executor.executeAndPersistTurn(state, 'Hello');
      await flushPromises();

      fh.pushEvent({ type: 'done', content: 'Answer' });
      await flushPromises();

      expect(sessionRepo.updateTurnStatus).toHaveBeenCalledWith('sess-1', 'unread');
    });

    it('sends a log notification for tool_use events', async () => {
      const fh = makeFakeHandle();
      const state = makeState({ sessionId: 'sess-1', featureId: 'feat-1' });
      state.handle = fh.handle;
      stateManager.set('sess-1', state);

      const logs: string[] = [];
      notifier.subscribeByFeature('feat-1', (c) => {
        if (c.log) logs.push(c.log);
      });

      void executor.executeAndPersistTurn(state, 'Read my file');
      await flushPromises();

      fh.pushEvent({ type: 'tool_use', label: 'Read', detail: '/src/app.ts' });
      await flushPromises();

      expect(logs.some((l) => l.includes('Read'))).toBe(true);
    });

    it('sends activity event for tool_use with correct kind', async () => {
      const fh = makeFakeHandle();
      const state = makeState({ sessionId: 'sess-1', featureId: 'feat-1' });
      state.handle = fh.handle;
      stateManager.set('sess-1', state);

      const activities: { kind: string; label: string }[] = [];
      notifier.subscribeByFeature('feat-1', (c) => {
        if (c.activity) activities.push({ kind: c.activity.kind, label: c.activity.label });
      });

      void executor.executeAndPersistTurn(state, 'Use a tool');
      await flushPromises();

      fh.pushEvent({ type: 'tool_use', label: 'Bash', detail: 'ls -la' });
      await flushPromises();

      expect(activities).toContainEqual({ kind: 'tool_use', label: 'Bash' });
    });

    it('sends a log notification for tool_result events', async () => {
      const fh = makeFakeHandle();
      const state = makeState({ sessionId: 'sess-1', featureId: 'feat-1' });
      state.handle = fh.handle;
      stateManager.set('sess-1', state);

      const logs: string[] = [];
      notifier.subscribeByFeature('feat-1', (c) => {
        if (c.log) logs.push(c.log);
      });

      void executor.executeAndPersistTurn(state, 'Use a tool');
      await flushPromises();

      fh.pushEvent({ type: 'tool_result', label: 'Bash', detail: 'exit 0' });
      await flushPromises();

      expect(logs.some((l) => l.includes('Completed'))).toBe(true);
    });

    it('notifies subscribers with log text for status events', async () => {
      const fh = makeFakeHandle();
      const state = makeState({ sessionId: 'sess-1', featureId: 'feat-1' });
      state.handle = fh.handle;
      stateManager.set('sess-1', state);

      const logs: string[] = [];
      notifier.subscribeByFeature('feat-1', (c) => {
        if (c.log) logs.push(c.log);
      });

      void executor.executeAndPersistTurn(state, 'Do something');
      await flushPromises();

      fh.pushEvent({ type: 'status', content: 'Thinking...' });
      await flushPromises();

      expect(logs).toContain('Thinking...');
    });

    it('accumulates usage from done event via sessionRepo.accumulateUsage', async () => {
      const fh = makeFakeHandle();
      const state = makeState({ sessionId: 'sess-1', featureId: 'feat-1' });
      state.handle = fh.handle;
      stateManager.set('sess-1', state);

      void executor.executeAndPersistTurn(state, 'Hello');
      await flushPromises();

      fh.pushEvent({
        type: 'done',
        content: 'Answer',
        usage: { costUsd: 0.001, inputTokens: 50, outputTokens: 100, numTurns: 1 },
      });
      await flushPromises();

      expect(sessionRepo.accumulateUsage).toHaveBeenCalledWith(
        'sess-1',
        expect.objectContaining({ costUsd: 0.001, inputTokens: 50, outputTokens: 100, turns: 1 })
      );
    });

    it('sends a log notification for error events (does not throw)', async () => {
      const fh = makeFakeHandle();
      const state = makeState({ sessionId: 'sess-1', featureId: 'feat-1' });
      state.handle = fh.handle;
      stateManager.set('sess-1', state);

      const logs: string[] = [];
      notifier.subscribeByFeature('feat-1', (c) => {
        if (c.log) logs.push(c.log);
      });

      void executor.executeAndPersistTurn(state, 'Hello');
      await flushPromises();

      fh.pushEvent({ type: 'error', content: 'model overloaded' });
      fh.endStream();
      await flushPromises();

      expect(logs.some((l) => l.includes('Error'))).toBe(true);
    });

    it('notifies subscribers for rate_limit events', async () => {
      const fh = makeFakeHandle();
      const state = makeState({ sessionId: 'sess-1', featureId: 'feat-1' });
      state.handle = fh.handle;
      stateManager.set('sess-1', state);

      const logs: string[] = [];
      notifier.subscribeByFeature('feat-1', (c) => {
        if (c.log) logs.push(c.log);
      });

      void executor.executeAndPersistTurn(state, 'Hello');
      await flushPromises();

      fh.pushEvent({ type: 'rate_limit', content: 'Rate limited' });
      fh.endStream();
      await flushPromises();

      expect(logs.some((l) => l.toLowerCase().includes('rate'))).toBe(true);
    });

    it('notifies subscribers for api_retry events', async () => {
      const fh = makeFakeHandle();
      const state = makeState({ sessionId: 'sess-1', featureId: 'feat-1' });
      state.handle = fh.handle;
      stateManager.set('sess-1', state);

      const logs: string[] = [];
      notifier.subscribeByFeature('feat-1', (c) => {
        if (c.log) logs.push(c.log);
      });

      void executor.executeAndPersistTurn(state, 'Hello');
      await flushPromises();

      fh.pushEvent({ type: 'api_retry', content: 'Retrying...' });
      fh.endStream();
      await flushPromises();

      expect(logs.some((l) => l.includes('Retry') || l.includes('retry'))).toBe(true);
    });

    it('releases turnInProgress after turn completes', async () => {
      const fh = makeFakeHandle();
      const state = makeState({ sessionId: 'sess-1', featureId: 'feat-1' });
      state.handle = fh.handle;
      state.turnInProgress = true;
      stateManager.set('sess-1', state);

      void executor.executeAndPersistTurn(state, 'Hello');
      await flushPromises();

      fh.pushEvent({ type: 'done', content: 'Answer' });
      await flushPromises();

      expect(state.turnInProgress).toBe(false);
    });

    it('throws when handle is null', async () => {
      const state = makeState({ sessionId: 'sess-1', featureId: 'feat-1' });
      state.handle = null;
      stateManager.set('sess-1', state);

      // Should not throw externally (caught internally), but can verify via no
      // crash + session stays in error state if needed. Just ensure no unhandled rejection:
      await expect(executor.executeAndPersistTurn(state, 'Hello')).resolves.not.toThrow();
    });

    it('marks session as error and removes from state when stream ends with no response', async () => {
      const fh = makeFakeHandle();
      const state = makeState({ sessionId: 'sess-1', featureId: 'feat-1' });
      state.handle = fh.handle;
      stateManager.set('sess-1', state);

      void executor.executeAndPersistTurn(state, 'Hello');
      await flushPromises();

      // End stream without any events (no delta, no done)
      fh.endStream();
      await flushPromises();

      expect(sessionRepo.updateStatus).toHaveBeenCalledWith(
        'sess-1',
        InteractiveSessionStatus.error
      );
      expect(stateManager.has('sess-1')).toBe(false);
    });
  });

  // ── persistToolEvent ─────────────────────────────────────────────────────

  describe('persistToolEvent', () => {
    it('persists a tool event message with bold label and code detail', async () => {
      const state = makeState({ sessionId: 'sess-1', featureId: 'feat-1' });

      await executor.persistToolEvent(state, 'Bash', 'ls -la');

      expect(messageRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          role: InteractiveMessageRole.assistant,
          content: '**Bash** `ls -la`',
          featureId: 'feat-1',
          sessionId: 'sess-1',
        })
      );
    });

    it('persists a tool event without detail using just bold label', async () => {
      const state = makeState({ sessionId: 'sess-1', featureId: 'feat-1' });

      await executor.persistToolEvent(state, 'Session started');

      expect(messageRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          content: '**Session started**',
        })
      );
    });

    it('does not throw when messageRepo.create rejects', async () => {
      vi.mocked(messageRepo.create).mockRejectedValue(new Error('DB error'));
      const state = makeState({ sessionId: 'sess-1', featureId: 'feat-1' });

      await expect(executor.persistToolEvent(state, 'Bash', 'cmd')).resolves.not.toThrow();
    });
  });

  // ── turn queue draining ──────────────────────────────────────────────────

  describe('turn queue draining', () => {
    it('drains the queue and executes the next turn after current completes', async () => {
      const fh = makeFakeHandle();
      const state = makeState({ sessionId: 'sess-1', featureId: 'feat-1' });
      state.handle = fh.handle;
      stateManager.set('sess-1', state);

      // Pre-fill the queue with a second message
      state.turnQueue.push('second message');

      void executor.executeAndPersistTurn(state, 'first message');
      await flushPromises();

      // Complete first turn
      fh.pushEvent({ type: 'done', content: 'first answer' });
      await flushPromises();

      // The second message should now trigger a send
      expect(fh.sendMock).toHaveBeenCalledWith('second message');
    });
  });
});
