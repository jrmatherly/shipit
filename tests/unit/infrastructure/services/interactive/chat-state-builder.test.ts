/**
 * ChatStateBuilder Unit Tests
 *
 * TDD: RED → GREEN → REFACTOR
 *
 * Tests DTO assembly, message queries, session info building, and
 * turn-status resolution. All dependencies are fully mocked.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@/infrastructure/services/settings.service.js', () => ({
  hasSettings: vi.fn().mockReturnValue(false),
  getSettings: vi.fn().mockReturnValue({
    interactiveAgent: { autoTimeoutMinutes: 15, maxConcurrentSessions: 3 },
    agent: { type: 'ClaudeCode', authMethod: 'Session' },
  }),
}));

import { ChatStateBuilder } from '@/infrastructure/services/interactive/chat-state-builder.js';
import { SessionStateManager } from '@/infrastructure/services/interactive/session-state-manager.js';
import { InteractiveSessionStatus, InteractiveMessageRole } from '@/domain/generated/output.js';
import type { IInteractiveSessionRepository } from '@/application/ports/output/repositories/interactive-session-repository.interface.js';
import type { IInteractiveMessageRepository } from '@/application/ports/output/repositories/interactive-message-repository.interface.js';
import type { InteractiveMessage, InteractiveSession } from '@/domain/generated/output.js';
import type { SessionState } from '@/infrastructure/services/interactive/session-state.types.js';

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

function makeSession(
  id: string,
  featureId: string,
  status: InteractiveSessionStatus = InteractiveSessionStatus.ready
): InteractiveSession {
  return {
    id,
    featureId,
    status,
    startedAt: new Date('2024-01-01T10:00:00Z'),
    lastActivityAt: new Date('2024-01-01T10:05:00Z'),
    createdAt: new Date('2024-01-01T10:00:00Z'),
    updatedAt: new Date('2024-01-01T10:05:00Z'),
  };
}

function makeMessage(
  id: string,
  featureId: string,
  role: InteractiveMessageRole,
  content: string
): InteractiveMessage {
  return {
    id,
    featureId,
    sessionId: 'sess-1',
    role,
    content,
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

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ChatStateBuilder', () => {
  let sessionRepo: IInteractiveSessionRepository;
  let messageRepo: IInteractiveMessageRepository;
  let stateManager: SessionStateManager;
  let builder: ChatStateBuilder;

  beforeEach(() => {
    sessionRepo = makeSessionRepo();
    messageRepo = makeMessageRepo();
    stateManager = new SessionStateManager(sessionRepo);
    builder = new ChatStateBuilder(sessionRepo, messageRepo, stateManager);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ── getMessages ──────────────────────────────────────────────────────────

  describe('getMessages', () => {
    it('delegates to messageRepo.findByFeatureId without limit', async () => {
      const msgs = [makeMessage('m1', 'feat-1', InteractiveMessageRole.user, 'Hello')];
      vi.mocked(messageRepo.findByFeatureId).mockResolvedValue(msgs);

      const result = await builder.getMessages('feat-1');

      expect(messageRepo.findByFeatureId).toHaveBeenCalledWith('feat-1', undefined);
      expect(result).toEqual(msgs);
    });

    it('passes the limit parameter to messageRepo.findByFeatureId', async () => {
      vi.mocked(messageRepo.findByFeatureId).mockResolvedValue([]);

      await builder.getMessages('feat-1', 10);

      expect(messageRepo.findByFeatureId).toHaveBeenCalledWith('feat-1', 10);
    });

    it('returns an empty array when no messages exist', async () => {
      const result = await builder.getMessages('feat-1');
      expect(result).toEqual([]);
    });
  });

  // ── getTurnStatuses / getAllActiveTurnStatuses ────────────────────────────

  describe('getTurnStatuses', () => {
    it('delegates to sessionRepo.getTurnStatuses', async () => {
      const statusMap = new Map([['feat-1', 'processing']]);
      vi.mocked(sessionRepo.getTurnStatuses).mockResolvedValue(statusMap);

      const result = await builder.getTurnStatuses(['feat-1', 'feat-2']);

      expect(sessionRepo.getTurnStatuses).toHaveBeenCalledWith(['feat-1', 'feat-2']);
      expect(result).toBe(statusMap);
    });
  });

  describe('getAllActiveTurnStatuses', () => {
    it('delegates to sessionRepo.getAllActiveTurnStatuses', async () => {
      const statusMap = new Map([['feat-1', 'unread']]);
      vi.mocked(sessionRepo.getAllActiveTurnStatuses).mockResolvedValue(statusMap);

      const result = await builder.getAllActiveTurnStatuses();

      expect(sessionRepo.getAllActiveTurnStatuses).toHaveBeenCalled();
      expect(result).toBe(statusMap);
    });
  });

  // ── getChatState — no active in-memory session ───────────────────────────

  describe('getChatState (no in-memory session)', () => {
    it('returns null sessionStatus and streamingText when no session exists', async () => {
      const result = await builder.getChatState('feat-1');
      expect(result.sessionStatus).toBeNull();
      expect(result.streamingText).toBeNull();
    });

    it('includes all messages from the DB', async () => {
      const msgs = [
        makeMessage('m1', 'feat-1', InteractiveMessageRole.user, 'Hello'),
        makeMessage('m2', 'feat-1', InteractiveMessageRole.assistant, 'Hi!'),
      ];
      vi.mocked(messageRepo.findByFeatureId).mockResolvedValue(msgs);

      const result = await builder.getChatState('feat-1');
      expect(result.messages).toHaveLength(2);
    });

    it('returns sessionInfo from DB when status is not stopped/error', async () => {
      vi.mocked(sessionRepo.findByFeatureId).mockResolvedValue(
        makeSession('sess-db', 'feat-1', InteractiveSessionStatus.ready)
      );
      vi.mocked(sessionRepo.getUsage).mockResolvedValue({
        totalCostUsd: 0.01,
        totalInputTokens: 100,
        totalOutputTokens: 200,
        totalTurns: 3,
      });

      const result = await builder.getChatState('feat-1');

      expect(result.sessionInfo).not.toBeNull();
      expect(result.sessionInfo!.sessionId).toBe('sess-db');
      expect(result.sessionInfo!.model).toBeNull(); // no live process
    });

    it('returns null sessionInfo when DB session is stopped', async () => {
      vi.mocked(sessionRepo.findByFeatureId).mockResolvedValue(
        makeSession('sess-db', 'feat-1', InteractiveSessionStatus.stopped)
      );

      const result = await builder.getChatState('feat-1');

      expect(result.sessionInfo).toBeNull();
    });

    it('returns null sessionInfo when DB session is error', async () => {
      vi.mocked(sessionRepo.findByFeatureId).mockResolvedValue(
        makeSession('sess-db', 'feat-1', InteractiveSessionStatus.error)
      );

      const result = await builder.getChatState('feat-1');

      expect(result.sessionInfo).toBeNull();
    });

    it('defaults turnStatus to idle when no session exists', async () => {
      const result = await builder.getChatState('feat-1');
      expect(result.turnStatus).toBe('idle');
    });

    it('reads turnStatus from DB when a DB session exists', async () => {
      vi.mocked(sessionRepo.findByFeatureId).mockResolvedValue(
        makeSession('sess-db', 'feat-1', InteractiveSessionStatus.ready)
      );
      vi.mocked(sessionRepo.getTurnStatuses).mockResolvedValue(new Map([['feat-1', 'unread']]));

      const result = await builder.getChatState('feat-1');
      expect(result.turnStatus).toBe('unread');
    });
  });

  // ── getChatState — with active in-memory session ─────────────────────────

  describe('getChatState (with in-memory session)', () => {
    it('returns the session status from DB', async () => {
      const state = makeState({ sessionId: 'sess-1', featureId: 'feat-1' });
      stateManager.set('sess-1', state);

      vi.mocked(sessionRepo.findById).mockResolvedValue(
        makeSession('sess-1', 'feat-1', InteractiveSessionStatus.ready)
      );

      const result = await builder.getChatState('feat-1');
      expect(result.sessionStatus).toBe(InteractiveSessionStatus.ready);
    });

    it('includes the current streaming buffer as streamingText', async () => {
      const state = makeState({ sessionId: 'sess-1', featureId: 'feat-1' });
      state.currentAssistantBuffer = 'Partial response so far...';
      stateManager.set('sess-1', state);

      vi.mocked(sessionRepo.findById).mockResolvedValue(makeSession('sess-1', 'feat-1'));

      const result = await builder.getChatState('feat-1');
      expect(result.streamingText).toBe('Partial response so far...');
    });

    it('returns null streamingText when buffer is empty', async () => {
      const state = makeState({ sessionId: 'sess-1', featureId: 'feat-1' });
      state.currentAssistantBuffer = '';
      stateManager.set('sess-1', state);

      vi.mocked(sessionRepo.findById).mockResolvedValue(makeSession('sess-1', 'feat-1'));

      const result = await builder.getChatState('feat-1');
      expect(result.streamingText).toBeNull();
    });

    it('includes agentSessionId in sessionInfo.sessionId when available', async () => {
      const state = makeState({
        sessionId: 'sess-1',
        featureId: 'feat-1',
        agentSessionId: 'agent-abc',
      });
      stateManager.set('sess-1', state);

      vi.mocked(sessionRepo.findById).mockResolvedValue(makeSession('sess-1', 'feat-1'));
      vi.mocked(sessionRepo.getUsage).mockResolvedValue(null);

      const result = await builder.getChatState('feat-1');
      expect(result.sessionInfo).not.toBeNull();
      expect(result.sessionInfo!.sessionId).toBe('agent-abc');
    });

    it('falls back to sessionId in sessionInfo when no agentSessionId', async () => {
      const state = makeState({ sessionId: 'sess-1', featureId: 'feat-1' });
      stateManager.set('sess-1', state);

      vi.mocked(sessionRepo.findById).mockResolvedValue(makeSession('sess-1', 'feat-1'));
      vi.mocked(sessionRepo.getUsage).mockResolvedValue(null);

      const result = await builder.getChatState('feat-1');
      expect(result.sessionInfo!.sessionId).toBe('sess-1');
    });

    it('returns the model from state when set', async () => {
      const state = makeState({ sessionId: 'sess-1', featureId: 'feat-1', model: 'claude-opus-4' });
      stateManager.set('sess-1', state);

      vi.mocked(sessionRepo.findById).mockResolvedValue(makeSession('sess-1', 'feat-1'));
      vi.mocked(sessionRepo.getUsage).mockResolvedValue(null);

      const result = await builder.getChatState('feat-1');
      expect(result.sessionInfo!.model).toBe('claude-opus-4');
    });

    it('defaults to claude-sonnet-4-6 when no model override is set', async () => {
      const state = makeState({ sessionId: 'sess-1', featureId: 'feat-1' });
      stateManager.set('sess-1', state);

      vi.mocked(sessionRepo.findById).mockResolvedValue(makeSession('sess-1', 'feat-1'));
      vi.mocked(sessionRepo.getUsage).mockResolvedValue(null);

      const result = await builder.getChatState('feat-1');
      expect(result.sessionInfo!.model).toBe('claude-sonnet-4-6');
    });

    it('includes usage data when getUsage returns values', async () => {
      const state = makeState({ sessionId: 'sess-1', featureId: 'feat-1' });
      stateManager.set('sess-1', state);

      vi.mocked(sessionRepo.findById).mockResolvedValue(makeSession('sess-1', 'feat-1'));
      vi.mocked(sessionRepo.getUsage).mockResolvedValue({
        totalCostUsd: 0.05,
        totalInputTokens: 500,
        totalOutputTokens: 1000,
        totalTurns: 5,
      });

      const result = await builder.getChatState('feat-1');
      expect(result.sessionInfo!.totalCostUsd).toBe(0.05);
      expect(result.sessionInfo!.totalInputTokens).toBe(500);
      expect(result.sessionInfo!.totalOutputTokens).toBe(1000);
    });

    it('returns null for usage fields when getUsage returns null', async () => {
      const state = makeState({ sessionId: 'sess-1', featureId: 'feat-1' });
      stateManager.set('sess-1', state);

      vi.mocked(sessionRepo.findById).mockResolvedValue(makeSession('sess-1', 'feat-1'));
      vi.mocked(sessionRepo.getUsage).mockResolvedValue(null);

      const result = await builder.getChatState('feat-1');
      expect(result.sessionInfo!.totalCostUsd).toBeNull();
      expect(result.sessionInfo!.totalInputTokens).toBeNull();
    });

    it('resolves turnStatus from sessionRepo.getTurnStatuses', async () => {
      const state = makeState({ sessionId: 'sess-1', featureId: 'feat-1' });
      stateManager.set('sess-1', state);

      vi.mocked(sessionRepo.findById).mockResolvedValue(makeSession('sess-1', 'feat-1'));
      vi.mocked(sessionRepo.getTurnStatuses).mockResolvedValue(new Map([['feat-1', 'processing']]));

      const result = await builder.getChatState('feat-1');
      expect(result.turnStatus).toBe('processing');
    });

    it('defaults turnStatus to idle when not in the statuses map', async () => {
      const state = makeState({ sessionId: 'sess-1', featureId: 'feat-1' });
      stateManager.set('sess-1', state);

      vi.mocked(sessionRepo.findById).mockResolvedValue(makeSession('sess-1', 'feat-1'));
      vi.mocked(sessionRepo.getTurnStatuses).mockResolvedValue(new Map());

      const result = await builder.getChatState('feat-1');
      expect(result.turnStatus).toBe('idle');
    });

    it('returns pid as null (SDK manages process internally)', async () => {
      const state = makeState({ sessionId: 'sess-1', featureId: 'feat-1' });
      stateManager.set('sess-1', state);

      vi.mocked(sessionRepo.findById).mockResolvedValue(makeSession('sess-1', 'feat-1'));
      vi.mocked(sessionRepo.getUsage).mockResolvedValue(null);

      const result = await builder.getChatState('feat-1');
      expect(result.sessionInfo!.pid).toBeNull();
    });
  });
});
