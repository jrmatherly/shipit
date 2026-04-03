import type {
  StreamChunk,
  UnsubscribeFn,
} from '../../../application/ports/output/services/interactive-session-service.interface.js';
import type { SessionState } from './session-state.types.js';

/**
 * Owns feature-level subscriber state and dispatches StreamChunks to all
 * session-level and feature-level subscribers.
 *
 * Feature-level subscribers survive session restarts (e.g. SSE connections).
 * Session-level subscribers live on the SessionState itself.
 */
export class SubscriberNotifier {
  /**
   * Feature-level subscribers that survive session restarts.
   *
   * Unlike session-level subscribers (in SessionState.subscribers), these
   * persist when a session dies and a new one boots. SSE connections
   * subscribe here so they continue receiving events from new sessions.
   */
  private featureSubscribers = new Map<string, Set<(chunk: StreamChunk) => void>>();

  subscribeByFeature(featureId: string, onChunk: (chunk: StreamChunk) => void): UnsubscribeFn {
    let subs = this.featureSubscribers.get(featureId);
    if (!subs) {
      subs = new Set();
      this.featureSubscribers.set(featureId, subs);
    }
    subs.add(onChunk);
    return () => {
      subs!.delete(onChunk);
      if (subs!.size === 0) {
        this.featureSubscribers.delete(featureId);
      }
    };
  }

  /**
   * Dispatch a StreamChunk to all subscribers for a session.
   *
   * Sends to both session-level subscribers (legacy, for sessionId-based
   * subscribe()) and feature-level subscribers (for SSE connections that
   * must survive session restarts).
   */
  notify(state: SessionState, chunk: StreamChunk): void {
    state.subscribers.forEach((sub) => sub(chunk));
    const featureSubs = this.featureSubscribers.get(state.featureId);
    if (featureSubs) {
      featureSubs.forEach((sub) => sub(chunk));
    }
  }
}
