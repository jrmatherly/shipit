/**
 * Interactive Session Service — Facade
 *
 * Thin facade that delegates all public methods to focused collaborator classes.
 * Implements IInteractiveSessionService and maintains backward compatibility for
 * all consumers.
 *
 * Decomposition:
 *  - SubscriberNotifier   — feature-level subscriber map + notify dispatch
 *  - SessionStateManager  — in-memory session map, timers, stop/clear/find
 *  - ChatStateBuilder     — read-side queries (messages, chat state, turn statuses)
 *  - TurnExecutor         — sendMessage, executeAndPersistTurn, persistToolEvent
 *  - SessionBootSequence  — startSession, completeBootAsync, resolveAgentType/Auth
 */

import * as crypto from 'node:crypto';
import type {
  IInteractiveSessionService,
  StreamChunk,
  UnsubscribeFn,
  ChatState,
} from '../../../application/ports/output/services/interactive-session-service.interface.js';
import type { IInteractiveSessionRepository } from '../../../application/ports/output/repositories/interactive-session-repository.interface.js';
import type { IInteractiveMessageRepository } from '../../../application/ports/output/repositories/interactive-message-repository.interface.js';
import type { IAgentExecutorFactory } from '../../../application/ports/output/agents/agent-executor-factory.interface.js';
import type { IFeatureRepository } from '../../../application/ports/output/repositories/feature-repository.interface.js';
import type { InteractiveSession, InteractiveMessage } from '../../../domain/generated/output.js';
import {
  InteractiveSessionStatus,
  InteractiveMessageRole,
} from '../../../domain/generated/output.js';
import { type FeatureContextBuilder } from './feature-context.builder.js';
import { SubscriberNotifier } from './subscriber-notifier.js';
import { SessionStateManager } from './session-state-manager.js';
import { ChatStateBuilder } from './chat-state-builder.js';
import { TurnExecutor } from './turn-executor.js';
import { SessionBootSequence } from './session-boot-sequence.js';

/**
 * Core service managing interactive agent session lifecycles.
 * Must be registered as a singleton in the DI container.
 *
 * **Polymorphic `featureId` scope key:** The `featureId` parameter accepted
 * by public methods (`sendUserMessage`, `getChatState`, `subscribeByFeature`,
 * etc.) is a polymorphic scope key — not necessarily a feature UUID:
 * - Feature chat: actual feature UUID (e.g. `"feat-abc123"`)
 * - Repository chat: repo identifier (e.g. `"repo-<repoId>"`)
 * - Global chat: literal string `"global"`
 *
 * Sessions and messages are isolated by this key regardless of chat type.
 *
 * @todo Consider renaming to `scopeId` + adding a `scopeType` discriminator.
 */
export class InteractiveSessionService implements IInteractiveSessionService {
  private readonly notifier: SubscriberNotifier;
  private readonly stateManager: SessionStateManager;
  private readonly chatStateBuilder: ChatStateBuilder;
  private readonly turnExecutor: TurnExecutor;
  private readonly bootSequence: SessionBootSequence;

  constructor(
    sessionRepo: IInteractiveSessionRepository,
    messageRepo: IInteractiveMessageRepository,
    executorFactory: IAgentExecutorFactory,
    featureRepo: IFeatureRepository,
    contextBuilder: FeatureContextBuilder
  ) {
    this.notifier = new SubscriberNotifier();
    this.stateManager = new SessionStateManager(sessionRepo);
    this.chatStateBuilder = new ChatStateBuilder(sessionRepo, messageRepo, this.stateManager);
    this.turnExecutor = new TurnExecutor(
      sessionRepo,
      messageRepo,
      this.stateManager,
      this.notifier
    );
    this.bootSequence = new SessionBootSequence(
      executorFactory,
      featureRepo,
      contextBuilder,
      sessionRepo,
      messageRepo,
      this.stateManager,
      this.notifier,
      this.turnExecutor
    );

    // Keep a reference to sessionRepo for sendUserMessage orchestration
    this._sessionRepo = sessionRepo;
    this._messageRepo = messageRepo;
  }

  // Store for sendUserMessage (orchestration in facade)
  private readonly _sessionRepo: IInteractiveSessionRepository;
  private readonly _messageRepo: IInteractiveMessageRepository;

  // ---------------------------------------------------------------------------
  // Public API — delegates to collaborators
  // ---------------------------------------------------------------------------

  startSession(
    featureId: string,
    worktreePath: string,
    model?: string,
    agentType?: string
  ): Promise<InteractiveSession> {
    return this.bootSequence.startSession(featureId, worktreePath, model, agentType);
  }

  stopSession(sessionId: string): Promise<void> {
    return this.stateManager.stopSession(sessionId);
  }

  sendMessage(sessionId: string, content: string): Promise<InteractiveMessage> {
    return this.turnExecutor.sendMessage(sessionId, content);
  }

  getMessages(featureId: string, limit?: number): Promise<InteractiveMessage[]> {
    return this.chatStateBuilder.getMessages(featureId, limit);
  }

  getSession(sessionId: string): Promise<InteractiveSession | null> {
    return this._sessionRepo.findById(sessionId);
  }

  clearMessages(featureId: string): Promise<void> {
    return this.stateManager.clearMessages(featureId, () =>
      this._messageRepo.deleteByFeatureId(featureId)
    );
  }

  subscribe(sessionId: string, onChunk: (chunk: StreamChunk) => void): UnsubscribeFn {
    const state = this.stateManager.get(sessionId);
    if (!state) {
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      return () => {};
    }
    state.subscribers.add(onChunk);
    return () => state.subscribers.delete(onChunk);
  }

  subscribeByFeature(featureId: string, onChunk: (chunk: StreamChunk) => void): UnsubscribeFn {
    return this.notifier.subscribeByFeature(featureId, onChunk);
  }

  stopByFeature(featureId: string): Promise<void> {
    return this.stateManager.stopByFeature(featureId);
  }

  markRead(featureId: string): Promise<void> {
    return this.stateManager.markRead(featureId);
  }

  getChatState(featureId: string): Promise<ChatState> {
    return this.chatStateBuilder.getChatState(featureId);
  }

  getTurnStatuses(featureIds: string[]): Promise<Map<string, string>> {
    return this.chatStateBuilder.getTurnStatuses(featureIds);
  }

  getAllActiveTurnStatuses(): Promise<Map<string, string>> {
    return this.chatStateBuilder.getAllActiveTurnStatuses();
  }

  // ---------------------------------------------------------------------------
  // Feature-scoped API — orchestrated in the facade (boots session if needed)
  // ---------------------------------------------------------------------------

  async sendUserMessage(
    featureId: string,
    content: string,
    worktreePath: string,
    model?: string,
    agentType?: string
  ): Promise<InteractiveMessage> {
    // 1. Persist user message to DB immediately — this is the source of truth
    const now = new Date();
    const userMsg: InteractiveMessage = {
      id: crypto.randomUUID(),
      featureId,
      role: InteractiveMessageRole.user,
      content,
      createdAt: now,
      updatedAt: now,
    };
    await this._messageRepo.create(userMsg);

    // 2. Find active session for this feature
    let state = this.stateManager.findActiveStateForFeature(featureId);

    // If the caller requested a different model/agent than the running session,
    // silently stop the current session so a new one boots with the new config.
    // Also clear the cached agentSessionId so we create a fresh SDK session
    // instead of resuming the old one (which would keep the old model).
    if (state && model && state.model !== model) {
      await this.stateManager.stopSession(state.sessionId);
      this.stateManager.stoppedAgentSessionIds.delete(featureId);
      state = undefined;
    } else if (state && agentType && state.agentType !== agentType) {
      await this.stateManager.stopSession(state.sessionId);
      this.stateManager.stoppedAgentSessionIds.delete(featureId);
      state = undefined;
    }

    if (state) {
      const dbSession = await this._sessionRepo.findById(state.sessionId);
      if (dbSession?.status === InteractiveSessionStatus.ready) {
        // Session ready — send to agent (guarded: one turn at a time)
        this.stateManager.resetTimer(state);
        await this._sessionRepo.updateLastActivity(state.sessionId, now);
        if (state.turnInProgress) {
          state.turnQueue.push(content);
        } else {
          state.turnInProgress = true;
          void this.turnExecutor.executeAndPersistTurn(state, content);
        }
      } else if (dbSession?.status === InteractiveSessionStatus.booting) {
        // Session booting — queue the message
        state.pendingUserContent = content;
      }
    } else {
      // No in-memory session — check DB for an orphaned active session (e.g. after
      // service restart / hot-reload) and mark it stopped before booting a new one.
      // The agentSessionId is persisted in DB so startSession will pick it up for
      // SDK session resumption.
      const dbSession = await this._sessionRepo.findByFeatureId(featureId);
      if (
        dbSession &&
        (dbSession.status === InteractiveSessionStatus.ready ||
          dbSession.status === InteractiveSessionStatus.booting)
      ) {
        await this._sessionRepo.updateStatus(
          dbSession.id,
          InteractiveSessionStatus.stopped,
          new Date()
        );
      }

      // Boot a new session — startSession will find the agentSessionId from DB
      const session = await this.bootSequence.startSession(
        featureId,
        worktreePath,
        model,
        agentType
      );
      const newState = this.stateManager.get(session.id);
      if (newState) {
        newState.pendingUserContent = content;
      }
    }

    return userMsg;
  }
}
