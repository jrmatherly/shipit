/**
 * SubscriberNotifier Unit Tests
 *
 * TDD: RED → GREEN → REFACTOR
 *
 * Tests subscribe/unsubscribe/notify callback dispatch for both
 * feature-level and session-level subscriber flows.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SubscriberNotifier } from '@/infrastructure/services/interactive/subscriber-notifier.js';
import type { SessionState } from '@/infrastructure/services/interactive/session-state.types.js';
import type { StreamChunk } from '@/application/ports/output/services/interactive-session-service.interface.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeMinimalState(
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

const CHUNK_DELTA: StreamChunk = { delta: 'Hello', done: false };
const CHUNK_DONE: StreamChunk = { delta: '', done: true };

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('SubscriberNotifier', () => {
  let notifier: SubscriberNotifier;

  beforeEach(() => {
    notifier = new SubscriberNotifier();
  });

  // ── subscribeByFeature ──────────────────────────────────────────────────

  describe('subscribeByFeature', () => {
    it('returns an unsubscribe function', () => {
      const unsub = notifier.subscribeByFeature('feat-1', vi.fn());
      expect(typeof unsub).toBe('function');
    });

    it('invokes a feature subscriber when notify is called for that feature', () => {
      const cb = vi.fn();
      notifier.subscribeByFeature('feat-1', cb);

      const state = makeMinimalState({ sessionId: 'sess-1', featureId: 'feat-1' });
      notifier.notify(state, CHUNK_DELTA);

      expect(cb).toHaveBeenCalledOnce();
      expect(cb).toHaveBeenCalledWith(CHUNK_DELTA);
    });

    it('does not invoke subscriber for a different featureId', () => {
      const cb = vi.fn();
      notifier.subscribeByFeature('feat-1', cb);

      const state = makeMinimalState({ sessionId: 'sess-2', featureId: 'feat-2' });
      notifier.notify(state, CHUNK_DELTA);

      expect(cb).not.toHaveBeenCalled();
    });

    it('supports multiple subscribers for the same feature', () => {
      const cb1 = vi.fn();
      const cb2 = vi.fn();
      notifier.subscribeByFeature('feat-1', cb1);
      notifier.subscribeByFeature('feat-1', cb2);

      const state = makeMinimalState({ sessionId: 'sess-1', featureId: 'feat-1' });
      notifier.notify(state, CHUNK_DONE);

      expect(cb1).toHaveBeenCalledOnce();
      expect(cb2).toHaveBeenCalledOnce();
    });

    it('supports subscribers for different features independently', () => {
      const cb1 = vi.fn();
      const cb2 = vi.fn();
      notifier.subscribeByFeature('feat-1', cb1);
      notifier.subscribeByFeature('feat-2', cb2);

      const state1 = makeMinimalState({ sessionId: 'sess-1', featureId: 'feat-1' });
      notifier.notify(state1, CHUNK_DELTA);

      expect(cb1).toHaveBeenCalledOnce();
      expect(cb2).not.toHaveBeenCalled();
    });
  });

  // ── unsubscribe (returned fn) ────────────────────────────────────────────

  describe('unsubscribe', () => {
    it('stops receiving events after unsubscribe is called', () => {
      const cb = vi.fn();
      const unsub = notifier.subscribeByFeature('feat-1', cb);
      unsub();

      const state = makeMinimalState({ sessionId: 'sess-1', featureId: 'feat-1' });
      notifier.notify(state, CHUNK_DELTA);

      expect(cb).not.toHaveBeenCalled();
    });

    it('is idempotent — calling unsub twice does not throw', () => {
      const unsub = notifier.subscribeByFeature('feat-1', vi.fn());
      unsub();
      expect(() => unsub()).not.toThrow();
    });

    it('removes the feature entry when the last subscriber unsubscribes', () => {
      const cb = vi.fn();
      const unsub = notifier.subscribeByFeature('feat-1', cb);
      unsub();

      // Re-subscribe a new callback — if the set was cleaned up correctly,
      // the original callback is not re-added.
      const cb2 = vi.fn();
      notifier.subscribeByFeature('feat-1', cb2);

      const state = makeMinimalState({ sessionId: 'sess-1', featureId: 'feat-1' });
      notifier.notify(state, CHUNK_DELTA);

      expect(cb).not.toHaveBeenCalled();
      expect(cb2).toHaveBeenCalledOnce();
    });

    it('only removes the specific subscriber when multiple are registered', () => {
      const cb1 = vi.fn();
      const cb2 = vi.fn();
      const unsub1 = notifier.subscribeByFeature('feat-1', cb1);
      notifier.subscribeByFeature('feat-1', cb2);

      unsub1();

      const state = makeMinimalState({ sessionId: 'sess-1', featureId: 'feat-1' });
      notifier.notify(state, CHUNK_DELTA);

      expect(cb1).not.toHaveBeenCalled();
      expect(cb2).toHaveBeenCalledOnce();
    });
  });

  // ── notify ───────────────────────────────────────────────────────────────

  describe('notify', () => {
    it('dispatches to session-level subscribers on the state object', () => {
      const sessionCb = vi.fn();
      const state = makeMinimalState({ sessionId: 'sess-1', featureId: 'feat-1' });
      state.subscribers.add(sessionCb);

      notifier.notify(state, CHUNK_DELTA);

      expect(sessionCb).toHaveBeenCalledOnce();
      expect(sessionCb).toHaveBeenCalledWith(CHUNK_DELTA);
    });

    it('dispatches to both session-level and feature-level subscribers', () => {
      const sessionCb = vi.fn();
      const featureCb = vi.fn();

      const state = makeMinimalState({ sessionId: 'sess-1', featureId: 'feat-1' });
      state.subscribers.add(sessionCb);
      notifier.subscribeByFeature('feat-1', featureCb);

      notifier.notify(state, CHUNK_DELTA);

      expect(sessionCb).toHaveBeenCalledOnce();
      expect(featureCb).toHaveBeenCalledOnce();
    });

    it('passes the exact chunk object to all subscribers', () => {
      const sessionCb = vi.fn();
      const featureCb = vi.fn();
      const chunk: StreamChunk = {
        delta: 'test content',
        done: false,
        log: 'some log',
        activity: { kind: 'tool_use', label: 'Read', detail: '/src/file.ts' },
      };

      const state = makeMinimalState({ sessionId: 'sess-1', featureId: 'feat-1' });
      state.subscribers.add(sessionCb);
      notifier.subscribeByFeature('feat-1', featureCb);

      notifier.notify(state, chunk);

      expect(sessionCb).toHaveBeenCalledWith(chunk);
      expect(featureCb).toHaveBeenCalledWith(chunk);
    });

    it('handles notify with no subscribers without throwing', () => {
      const state = makeMinimalState({ sessionId: 'sess-1', featureId: 'feat-1' });
      expect(() => notifier.notify(state, CHUNK_DELTA)).not.toThrow();
    });

    it('handles multiple sequential notifications correctly', () => {
      const received: StreamChunk[] = [];
      notifier.subscribeByFeature('feat-1', (c) => received.push(c));

      const state = makeMinimalState({ sessionId: 'sess-1', featureId: 'feat-1' });
      notifier.notify(state, { delta: 'a', done: false });
      notifier.notify(state, { delta: 'b', done: false });
      notifier.notify(state, { delta: '', done: true });

      expect(received).toHaveLength(3);
      expect(received[0].delta).toBe('a');
      expect(received[1].delta).toBe('b');
      expect(received[2].done).toBe(true);
    });

    it('feature-level subscribers survive session restarts (new state same featureId)', () => {
      const featureCb = vi.fn();
      notifier.subscribeByFeature('feat-1', featureCb);

      // Simulate a session restart — new state, same featureId
      const state1 = makeMinimalState({ sessionId: 'sess-old', featureId: 'feat-1' });
      notifier.notify(state1, CHUNK_DELTA);

      const state2 = makeMinimalState({ sessionId: 'sess-new', featureId: 'feat-1' });
      notifier.notify(state2, CHUNK_DONE);

      expect(featureCb).toHaveBeenCalledTimes(2);
    });
  });
});
