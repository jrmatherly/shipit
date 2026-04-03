import type { IInteractiveSessionRepository } from '../../../application/ports/output/repositories/interactive-session-repository.interface.js';
import { InteractiveSessionStatus } from '../../../domain/generated/output.js';
import { getSettings, hasSettings } from '../settings.service.js';
import type { SessionState } from './session-state.types.js';

/** Default idle timeout if no settings are loaded (15 minutes). */
const DEFAULT_TIMEOUT_MS = 15 * 60 * 1000;

/** Default concurrent session cap. */
const DEFAULT_CAP = 3;

/**
 * Owns the in-memory session and stopped-agent maps, and all lifecycle
 * helpers: timers, stop, clear, state lookup.
 */
export class SessionStateManager {
  /** Live sessions indexed by sessionId. */
  private sessions = new Map<string, SessionState>();
  /** Cached agentSessionIds from stopped sessions, keyed by featureId. */
  stoppedAgentSessionIds = new Map<string, string>();

  constructor(private readonly sessionRepo: IInteractiveSessionRepository) {}

  // ---------------------------------------------------------------------------
  // State map accessors
  // ---------------------------------------------------------------------------

  get(sessionId: string): SessionState | undefined {
    return this.sessions.get(sessionId);
  }

  set(sessionId: string, state: SessionState): void {
    this.sessions.set(sessionId, state);
  }

  has(sessionId: string): boolean {
    return this.sessions.has(sessionId);
  }

  delete(sessionId: string): void {
    this.sessions.delete(sessionId);
  }

  /** Find the in-memory state for an active session for a feature. */
  findActiveStateForFeature(featureId: string): SessionState | undefined {
    for (const state of this.sessions.values()) {
      if (state.featureId === featureId) return state;
    }
    return undefined;
  }

  // ---------------------------------------------------------------------------
  // Session lifecycle
  // ---------------------------------------------------------------------------

  async stopSession(sessionId: string): Promise<void> {
    const state = this.sessions.get(sessionId);
    if (!state) {
      // Already stopped — idempotent
      return;
    }

    // eslint-disable-next-line no-console
    console.log(
      `[InteractiveSession] stopSession called for ${sessionId} (feature: ${state.featureId})`,
      new Error().stack?.split('\n').slice(1, 4).join(' <- ')
    );

    // Abort any active stream iteration and clear pending turns
    if (state.streamAbort) {
      state.streamAbort.abort();
      state.streamAbort = undefined;
    }
    state.turnQueue.length = 0;
    state.turnInProgress = false;

    this.clearTimer(state);
    // Cache agentSessionId so resumption works when session restarts
    if (state.agentSessionId) {
      this.stoppedAgentSessionIds.set(state.featureId, state.agentSessionId);
    }
    this.sessions.delete(sessionId);

    // Close the SDK session handle
    if (state.handle) {
      try {
        await state.handle.close();
      } catch {
        // Session may already be closed
      }
      state.handle = null;
    }

    await this.sessionRepo.updateStatus(sessionId, InteractiveSessionStatus.stopped, new Date());
    void this.sessionRepo.updateTurnStatus(sessionId, 'idle');
  }

  async clearMessages(featureId: string, messageDeleteFn: () => Promise<void>): Promise<void> {
    // Stop any active session so the agent doesn't retain old context
    const state = this.findActiveStateForFeature(featureId);
    if (state) {
      await this.stopSession(state.sessionId);
    }
    // Also clear the cached agentSessionId so next session starts fresh
    this.stoppedAgentSessionIds.delete(featureId);
    return messageDeleteFn();
  }

  async stopByFeature(featureId: string): Promise<void> {
    const state = this.findActiveStateForFeature(featureId);
    if (!state) return;
    await this.stopSession(state.sessionId);
  }

  async markRead(featureId: string): Promise<void> {
    const state = this.findActiveStateForFeature(featureId);
    if (state) {
      void this.sessionRepo.updateTurnStatus(state.sessionId, 'idle');
      return;
    }
    // Fallback: check DB for the latest active session
    const latest = await this.sessionRepo.findByFeatureId(featureId);
    if (latest) {
      void this.sessionRepo.updateTurnStatus(latest.id, 'idle');
    }
  }

  // ---------------------------------------------------------------------------
  // Timer helpers
  // ---------------------------------------------------------------------------

  /** Start or restart the idle timeout timer for a session. */
  resetTimer(state: SessionState): void {
    this.clearTimer(state);
    const timeoutMs = this.getTimeoutMs();
    state.timer = setTimeout(() => {
      void this.stopSession(state.sessionId);
    }, timeoutMs);
  }

  /** Cancel the idle timer for a session. */
  clearTimer(state: SessionState): void {
    if (state.timer !== null) {
      clearTimeout(state.timer);
      state.timer = null;
    }
  }

  /** Read the auto-timeout from settings or fall back to default. */
  getTimeoutMs(): number {
    if (!hasSettings()) return DEFAULT_TIMEOUT_MS;
    const settings = getSettings();
    const minutes = settings.interactiveAgent?.autoTimeoutMinutes ?? 15;
    return minutes * 60 * 1000;
  }

  /** Read the concurrent session cap from settings or fall back to default. */
  getCap(): number {
    if (!hasSettings()) return DEFAULT_CAP;
    const settings = getSettings();
    return settings.interactiveAgent?.maxConcurrentSessions ?? DEFAULT_CAP;
  }
}
