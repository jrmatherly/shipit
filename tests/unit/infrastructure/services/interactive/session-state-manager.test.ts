/**
 * SessionStateManager Unit Tests
 *
 * TDD: RED → GREEN → REFACTOR
 *
 * Tests in-memory session lifecycle: create, stop, get, timer management,
 * and clearMessages. The sessionRepo is fully mocked. Settings service is
 * mocked to isolate the manager from global state.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock settings service before importing the SUT so getSettings/hasSettings
// return predictable values without a real settings file.
vi.mock('@/infrastructure/services/settings.service.js', () => ({
  hasSettings: vi.fn().mockReturnValue(false),
  getSettings: vi.fn().mockReturnValue({
    interactiveAgent: { autoTimeoutMinutes: 15, maxConcurrentSessions: 3 },
    agent: { type: 'ClaudeCode', authMethod: 'Session' },
  }),
}));

import { SessionStateManager } from '@/infrastructure/services/interactive/session-state-manager.js';
import { InteractiveSessionStatus } from '@/domain/generated/output.js';
import type { IInteractiveSessionRepository } from '@/application/ports/output/repositories/interactive-session-repository.interface.js';
import type { SessionState } from '@/infrastructure/services/interactive/session-state.types.js';
import type { InteractiveSession } from '@/domain/generated/output.js';
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

function makeSession(id: string, featureId = 'feat-1'): InteractiveSession {
  return {
    id,
    featureId,
    status: InteractiveSessionStatus.ready,
    startedAt: new Date(),
    lastActivityAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('SessionStateManager', () => {
  let sessionRepo: IInteractiveSessionRepository;
  let manager: SessionStateManager;

  beforeEach(() => {
    vi.useFakeTimers();
    sessionRepo = makeSessionRepo();
    manager = new SessionStateManager(sessionRepo);
    // hasSettings returns false by default so DEFAULT_TIMEOUT_MS / DEFAULT_CAP apply
    vi.mocked(hasSettings).mockReturnValue(false);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  // ── Map accessors ─────────────────────────────────────────────────────────

  describe('get / set / has / delete', () => {
    it('set stores a state and get retrieves it', () => {
      const state = makeState({ sessionId: 'sess-1', featureId: 'feat-1' });
      manager.set('sess-1', state);
      expect(manager.get('sess-1')).toBe(state);
    });

    it('has returns true after set', () => {
      const state = makeState({ sessionId: 'sess-1', featureId: 'feat-1' });
      manager.set('sess-1', state);
      expect(manager.has('sess-1')).toBe(true);
    });

    it('has returns false for unknown session', () => {
      expect(manager.has('unknown')).toBe(false);
    });

    it('get returns undefined for unknown session', () => {
      expect(manager.get('unknown')).toBeUndefined();
    });

    it('delete removes the state', () => {
      const state = makeState({ sessionId: 'sess-1', featureId: 'feat-1' });
      manager.set('sess-1', state);
      manager.delete('sess-1');
      expect(manager.has('sess-1')).toBe(false);
      expect(manager.get('sess-1')).toBeUndefined();
    });
  });

  // ── findActiveStateForFeature ─────────────────────────────────────────────

  describe('findActiveStateForFeature', () => {
    it('returns the state for the given featureId', () => {
      const state = makeState({ sessionId: 'sess-1', featureId: 'feat-1' });
      manager.set('sess-1', state);
      expect(manager.findActiveStateForFeature('feat-1')).toBe(state);
    });

    it('returns undefined when no session matches the featureId', () => {
      const state = makeState({ sessionId: 'sess-1', featureId: 'feat-1' });
      manager.set('sess-1', state);
      expect(manager.findActiveStateForFeature('feat-2')).toBeUndefined();
    });

    it('returns the correct state among multiple sessions', () => {
      const state1 = makeState({ sessionId: 'sess-1', featureId: 'feat-1' });
      const state2 = makeState({ sessionId: 'sess-2', featureId: 'feat-2' });
      manager.set('sess-1', state1);
      manager.set('sess-2', state2);
      expect(manager.findActiveStateForFeature('feat-2')).toBe(state2);
    });
  });

  // ── stopSession ──────────────────────────────────────────────────────────

  describe('stopSession', () => {
    it('removes the session from in-memory state', async () => {
      const state = makeState({ sessionId: 'sess-1', featureId: 'feat-1' });
      manager.set('sess-1', state);
      await manager.stopSession('sess-1');
      expect(manager.has('sess-1')).toBe(false);
    });

    it('updates status to stopped in the repository', async () => {
      const state = makeState({ sessionId: 'sess-1', featureId: 'feat-1' });
      manager.set('sess-1', state);
      await manager.stopSession('sess-1');
      expect(sessionRepo.updateStatus).toHaveBeenCalledWith(
        'sess-1',
        InteractiveSessionStatus.stopped,
        expect.any(Date)
      );
    });

    it('is idempotent — calling twice does not throw or double-update', async () => {
      const state = makeState({ sessionId: 'sess-1', featureId: 'feat-1' });
      manager.set('sess-1', state);
      await manager.stopSession('sess-1');
      await expect(manager.stopSession('sess-1')).resolves.not.toThrow();
      // updateStatus should only be called once (second call is a no-op)
      expect(sessionRepo.updateStatus).toHaveBeenCalledTimes(1);
    });

    it('aborts any active stream when stopping', async () => {
      const abort = new AbortController();
      const abortSpy = vi.spyOn(abort, 'abort');
      const state = makeState({ sessionId: 'sess-1', featureId: 'feat-1' });
      state.streamAbort = abort;
      manager.set('sess-1', state);

      await manager.stopSession('sess-1');

      expect(abortSpy).toHaveBeenCalled();
    });

    it('clears the turn queue when stopping', async () => {
      const state = makeState({ sessionId: 'sess-1', featureId: 'feat-1' });
      state.turnQueue.push('pending message 1', 'pending message 2');
      manager.set('sess-1', state);

      await manager.stopSession('sess-1');

      expect(state.turnQueue).toHaveLength(0);
    });

    it('caches agentSessionId in stoppedAgentSessionIds when stopping', async () => {
      const state = makeState({
        sessionId: 'sess-1',
        featureId: 'feat-1',
        agentSessionId: 'agent-sess-abc',
      });
      manager.set('sess-1', state);

      await manager.stopSession('sess-1');

      expect(manager.stoppedAgentSessionIds.get('feat-1')).toBe('agent-sess-abc');
    });

    it('calls handle.close() when stopping a session with an active handle', async () => {
      const closeMock = vi.fn().mockResolvedValue(undefined);
      const state = makeState({ sessionId: 'sess-1', featureId: 'feat-1' });
      state.handle = { close: closeMock, send: vi.fn(), stream: vi.fn(), abort: vi.fn() } as any;
      manager.set('sess-1', state);

      await manager.stopSession('sess-1');

      expect(closeMock).toHaveBeenCalled();
    });

    it('does not throw if handle.close() rejects (session already closed)', async () => {
      const closeMock = vi.fn().mockRejectedValue(new Error('already closed'));
      const state = makeState({ sessionId: 'sess-1', featureId: 'feat-1' });
      state.handle = { close: closeMock, send: vi.fn(), stream: vi.fn(), abort: vi.fn() } as any;
      manager.set('sess-1', state);

      await expect(manager.stopSession('sess-1')).resolves.not.toThrow();
    });
  });

  // ── stopByFeature ─────────────────────────────────────────────────────────

  describe('stopByFeature', () => {
    it('stops the session associated with a featureId', async () => {
      const state = makeState({ sessionId: 'sess-1', featureId: 'feat-1' });
      manager.set('sess-1', state);

      await manager.stopByFeature('feat-1');

      expect(manager.has('sess-1')).toBe(false);
      expect(sessionRepo.updateStatus).toHaveBeenCalledWith(
        'sess-1',
        InteractiveSessionStatus.stopped,
        expect.any(Date)
      );
    });

    it('is a no-op when no session exists for the feature', async () => {
      await expect(manager.stopByFeature('feat-nonexistent')).resolves.not.toThrow();
      expect(sessionRepo.updateStatus).not.toHaveBeenCalled();
    });
  });

  // ── clearMessages ─────────────────────────────────────────────────────────

  describe('clearMessages', () => {
    it('stops any active session for the feature before deleting messages', async () => {
      const state = makeState({ sessionId: 'sess-1', featureId: 'feat-1' });
      manager.set('sess-1', state);

      const deleteFn = vi.fn().mockResolvedValue(undefined);
      await manager.clearMessages('feat-1', deleteFn);

      expect(manager.has('sess-1')).toBe(false);
      expect(deleteFn).toHaveBeenCalled();
    });

    it('clears the stoppedAgentSessionIds cache for the feature', async () => {
      manager.stoppedAgentSessionIds.set('feat-1', 'agent-sess-abc');

      const deleteFn = vi.fn().mockResolvedValue(undefined);
      await manager.clearMessages('feat-1', deleteFn);

      expect(manager.stoppedAgentSessionIds.has('feat-1')).toBe(false);
    });

    it('calls deleteFn even when no active session exists', async () => {
      const deleteFn = vi.fn().mockResolvedValue(undefined);
      await manager.clearMessages('feat-no-session', deleteFn);
      expect(deleteFn).toHaveBeenCalled();
    });
  });

  // ── markRead ──────────────────────────────────────────────────────────────

  describe('markRead', () => {
    it('calls updateTurnStatus(idle) via in-memory state when session is active', async () => {
      const state = makeState({ sessionId: 'sess-1', featureId: 'feat-1' });
      manager.set('sess-1', state);

      await manager.markRead('feat-1');

      expect(sessionRepo.updateTurnStatus).toHaveBeenCalledWith('sess-1', 'idle');
    });

    it('falls back to DB lookup when no in-memory session exists', async () => {
      vi.mocked(sessionRepo.findByFeatureId).mockResolvedValue(makeSession('sess-db'));

      await manager.markRead('feat-1');

      expect(sessionRepo.findByFeatureId).toHaveBeenCalledWith('feat-1');
      expect(sessionRepo.updateTurnStatus).toHaveBeenCalledWith('sess-db', 'idle');
    });

    it('is a no-op when no session exists in memory or DB', async () => {
      vi.mocked(sessionRepo.findByFeatureId).mockResolvedValue(null);

      await expect(manager.markRead('feat-no-session')).resolves.not.toThrow();
    });
  });

  // ── Timer helpers ─────────────────────────────────────────────────────────

  describe('resetTimer / clearTimer', () => {
    it('clearTimer cancels an active timer without throwing', () => {
      const state = makeState({ sessionId: 'sess-1', featureId: 'feat-1' });
      state.timer = setTimeout(() => {
        /* noop timer for test */
      }, 99_999);
      expect(() => manager.clearTimer(state)).not.toThrow();
      expect(state.timer).toBeNull();
    });

    it('clearTimer is safe to call when timer is null', () => {
      const state = makeState({ sessionId: 'sess-1', featureId: 'feat-1' });
      expect(() => manager.clearTimer(state)).not.toThrow();
    });

    it('resetTimer calls stopSession after the timeout fires', async () => {
      const state = makeState({ sessionId: 'sess-1', featureId: 'feat-1' });
      manager.set('sess-1', state);
      manager.resetTimer(state);

      vi.advanceTimersByTime(15 * 60 * 1000 + 1000);
      await Promise.resolve(); // flush microtasks

      expect(sessionRepo.updateStatus).toHaveBeenCalledWith(
        'sess-1',
        InteractiveSessionStatus.stopped,
        expect.any(Date)
      );
    });

    it('resetTimer replaces an existing timer (no double-stop)', () => {
      const state = makeState({ sessionId: 'sess-1', featureId: 'feat-1' });
      manager.set('sess-1', state);
      manager.resetTimer(state);
      const firstTimer = state.timer;
      manager.resetTimer(state);
      // The timer object must differ because the first was cleared and replaced
      expect(state.timer).not.toBe(firstTimer);
    });
  });

  // ── getTimeoutMs / getCap ────────────────────────────────────────────────

  describe('getTimeoutMs', () => {
    it('returns 15-minute default when settings are not loaded', () => {
      vi.mocked(hasSettings).mockReturnValue(false);
      expect(manager.getTimeoutMs()).toBe(15 * 60 * 1000);
    });

    it('reads autoTimeoutMinutes from settings when available', () => {
      vi.mocked(hasSettings).mockReturnValue(true);
      vi.mocked(getSettings).mockReturnValue({
        interactiveAgent: { autoTimeoutMinutes: 30, maxConcurrentSessions: 3 },
        agent: { type: 'ClaudeCode' as any, authMethod: 'Session' as any },
      } as any);

      expect(manager.getTimeoutMs()).toBe(30 * 60 * 1000);
    });
  });

  describe('getCap', () => {
    it('returns default cap of 3 when settings are not loaded', () => {
      vi.mocked(hasSettings).mockReturnValue(false);
      expect(manager.getCap()).toBe(3);
    });

    it('reads maxConcurrentSessions from settings when available', () => {
      vi.mocked(hasSettings).mockReturnValue(true);
      vi.mocked(getSettings).mockReturnValue({
        interactiveAgent: { autoTimeoutMinutes: 15, maxConcurrentSessions: 5 },
        agent: { type: 'ClaudeCode' as any, authMethod: 'Session' as any },
      } as any);

      expect(manager.getCap()).toBe(5);
    });
  });
});
