import * as crypto from 'node:crypto';
import type { IInteractiveSessionRepository } from '../../../application/ports/output/repositories/interactive-session-repository.interface.js';
import type { IInteractiveMessageRepository } from '../../../application/ports/output/repositories/interactive-message-repository.interface.js';
import {
  InteractiveSessionStatus,
  InteractiveMessageRole,
} from '../../../domain/generated/output.js';
import type { InteractiveMessage } from '../../../domain/generated/output.js';
import type { SessionStateManager } from './session-state-manager.js';
import type { SubscriberNotifier } from './subscriber-notifier.js';
import type { SessionState } from './session-state.types.js';

/**
 * Handles sending messages into an active agent turn and persisting
 * the assistant response.
 */
export class TurnExecutor {
  constructor(
    private readonly sessionRepo: IInteractiveSessionRepository,
    private readonly messageRepo: IInteractiveMessageRepository,
    private readonly stateManager: SessionStateManager,
    private readonly notifier: SubscriberNotifier
  ) {}

  async sendMessage(sessionId: string, content: string): Promise<InteractiveMessage> {
    const dbSession = await this.sessionRepo.findById(sessionId);
    if (dbSession?.status !== InteractiveSessionStatus.ready) {
      throw new Error(`Session ${sessionId} is not ready — cannot send message`);
    }

    const state = this.stateManager.get(sessionId);
    if (!state) {
      throw new Error(`Session ${sessionId} is not ready — cannot send message`);
    }

    // Persist user message
    const now = new Date();
    const message: InteractiveMessage = {
      id: crypto.randomUUID(),
      featureId: state.featureId,
      sessionId,
      role: InteractiveMessageRole.user,
      content,
      createdAt: now,
      updatedAt: now,
    };
    await this.messageRepo.create(message);

    // Reset idle timer on user activity
    this.stateManager.resetTimer(state);
    await this.sessionRepo.updateLastActivity(sessionId, now);

    // Guard: only one turn at a time per session (SDK stream is not concurrent-safe)
    if (state.turnInProgress) {
      state.turnQueue.push(content);
    } else {
      state.turnInProgress = true;
      void this.executeAndPersistTurn(state, content);
    }

    return message;
  }

  /**
   * Execute a turn via the SDK session handle and persist the assistant response.
   */
  async executeAndPersistTurn(state: SessionState, prompt: string): Promise<void> {
    try {
      if (!state.handle) {
        throw new Error('No active session handle — cannot execute turn');
      }

      state.currentAssistantBuffer = '';
      state.toolEventsLog = [];

      // Mark turn as processing for dot indicator
      void this.sessionRepo.updateTurnStatus(state.sessionId, 'processing');

      // Send the message to the SDK session
      await state.handle.send(prompt);

      // Set up abort controller for this stream
      const abort = new AbortController();
      state.streamAbort = abort;

      let responseText = '';

      try {
        for await (const event of state.handle.stream()) {
          if (abort.signal.aborted) break;

          // Reset idle timer on each event received
          this.stateManager.resetTimer(state);

          switch (event.type) {
            case 'delta':
              if (event.content) {
                responseText += event.content;
                state.currentAssistantBuffer += event.content;
                this.notifier.notify(state, { delta: event.content!, done: false });
              }
              break;

            case 'tool_use':
              if (event.label) {
                const toolLabel = event.label;
                const toolDetail = event.detail;
                void this.persistToolEvent(state, toolLabel, toolDetail);
                this.notifier.notify(state, {
                  delta: '',
                  done: false,
                  log: `Using tool: ${toolLabel}`,
                  activity: { kind: 'tool_use', label: toolLabel, detail: toolDetail },
                });
              }
              break;

            case 'tool_result':
              if (event.label) {
                const resultLabel = event.label;
                const resultDetail = event.detail;
                void this.persistToolEvent(state, resultLabel, resultDetail);
                this.notifier.notify(state, {
                  delta: '',
                  done: false,
                  log: `Completed: ${resultLabel}`,
                  activity: { kind: 'tool_result', label: resultLabel, detail: resultDetail },
                });
              }
              break;

            case 'status':
              if (event.content) {
                const statusContent = event.content;
                this.notifier.notify(state, { delta: '', done: false, log: statusContent });
              }
              break;

            case 'done': {
              // Use result text if provided and non-empty, otherwise use accumulated buffer
              const resultText =
                event.content && event.content.length > 0 ? event.content : responseText;

              // Persist assistant message
              const now = new Date();
              const msg: InteractiveMessage = {
                id: crypto.randomUUID(),
                featureId: state.featureId,
                sessionId: state.sessionId,
                role: InteractiveMessageRole.assistant,
                content: resultText,
                createdAt: now,
                updatedAt: now,
              };
              await this.messageRepo.create(msg);

              state.currentAssistantBuffer = '';
              state.toolEventsLog = [];

              // Accumulate usage from this turn
              if (event.usage) {
                void this.sessionRepo.accumulateUsage(state.sessionId, {
                  costUsd: event.usage.costUsd ?? 0,
                  inputTokens: event.usage.inputTokens ?? 0,
                  outputTokens: event.usage.outputTokens ?? 0,
                  turns: event.usage.numTurns ?? 1,
                });
              }

              // Mark as unread — if user has the chat open, the frontend
              // will immediately call markRead to clear it
              void this.sessionRepo.updateTurnStatus(state.sessionId, 'unread');

              // Notify subscribers of end-of-turn
              this.notifier.notify(state, { delta: '', done: true });
              return; // Turn complete
            }

            case 'error':
              // eslint-disable-next-line no-console
              console.error(
                `[InteractiveSession] agent error during turn for session ${state.sessionId}:`,
                event.content
              );
              // Accumulate usage even on errors — cost was still incurred
              if (event.usage) {
                void this.sessionRepo.accumulateUsage(state.sessionId, {
                  costUsd: event.usage.costUsd ?? 0,
                  inputTokens: event.usage.inputTokens ?? 0,
                  outputTokens: event.usage.outputTokens ?? 0,
                  turns: event.usage.numTurns ?? 1,
                });
              }
              this.notifier.notify(state, {
                delta: '',
                done: true,
                log: `Error: ${event.content ?? 'unknown'}`,
              });
              break;

            case 'init':
              // The SDK emits init on every turn, but we only show "Session started"
              // during boot (handled in completeBootAsync). Ignore it here to avoid
              // spamming the chat with repeated session-started messages.
              break;

            case 'api_retry':
              this.notifier.notify(state, {
                delta: '',
                done: false,
                log: event.content ?? 'Retrying API call...',
              });
              break;

            case 'rate_limit':
              this.notifier.notify(state, {
                delta: '',
                done: false,
                log: event.content ?? 'Rate limited',
              });
              break;

            case 'task_started':
              if (event.content) {
                void this.persistToolEvent(state, 'Subtask started', event.content);
                this.notifier.notify(state, {
                  delta: '',
                  done: false,
                  log: `Subtask: ${event.content}`,
                  activity: { kind: 'system', label: 'Subtask started', detail: event.content },
                });
              }
              break;

            case 'task_progress':
              if (event.content) {
                this.notifier.notify(state, {
                  delta: '',
                  done: false,
                  log: `Subtask: ${event.content}`,
                });
              }
              break;

            case 'task_done':
              if (event.content) {
                const taskStatus = event.detail ?? 'completed';
                void this.persistToolEvent(state, `Subtask ${taskStatus}`, event.content);
                this.notifier.notify(state, {
                  delta: '',
                  done: false,
                  log: `Subtask ${taskStatus}: ${event.content}`,
                  activity: {
                    kind: 'system',
                    label: `Subtask ${taskStatus}`,
                    detail: event.content,
                  },
                });
              }
              break;
          }
        }
      } finally {
        state.streamAbort = undefined;
      }

      // If we exit the stream loop without a 'done' event (stream ended),
      // persist whatever text we accumulated
      if (responseText && state.currentAssistantBuffer) {
        const now = new Date();
        const msg: InteractiveMessage = {
          id: crypto.randomUUID(),
          featureId: state.featureId,
          sessionId: state.sessionId,
          role: InteractiveMessageRole.assistant,
          content: responseText,
          createdAt: now,
          updatedAt: now,
        };
        await this.messageRepo.create(msg);

        state.currentAssistantBuffer = '';
        state.toolEventsLog = [];
        this.notifier.notify(state, { delta: '', done: true });
      } else if (!responseText) {
        // Stream ended without any response — SDK session likely died.
        // Mark as error so the next message triggers a fresh session.
        // eslint-disable-next-line no-console
        console.error(
          `[InteractiveSession] stream ended without response for session ${state.sessionId} — session may have died`
        );
        this.notifier.notify(state, {
          delta: '',
          done: true,
          log: 'Session disconnected — will restart on next message',
        });
        if (state.agentSessionId) {
          this.stateManager.stoppedAgentSessionIds.set(state.featureId, state.agentSessionId);
        }
        this.stateManager.delete(state.sessionId);
        try {
          await this.sessionRepo.updateStatus(state.sessionId, InteractiveSessionStatus.error);
        } catch {
          // Best-effort DB update
        }
        return; // Skip queue drain — session is dead
      }
    } catch (err) {
      // If session was already stopped, ignore
      if (!this.stateManager.has(state.sessionId)) return;
      // eslint-disable-next-line no-console
      console.error(`[InteractiveSession] turn failed for session ${state.sessionId}:`, err);
    } finally {
      // Release the turn lock and drain the queue
      state.turnInProgress = false;
      if (this.stateManager.has(state.sessionId) && state.turnQueue.length > 0) {
        const nextContent = state.turnQueue.shift()!;
        state.turnInProgress = true;
        void this.executeAndPersistTurn(state, nextContent);
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Tool detail persistence
  // ---------------------------------------------------------------------------

  /**
   * Persist a tool/system event as its own assistant message in the DB.
   * Each event gets its own bubble in the chat thread.
   * Exposed (not private) so SessionBootSequence can reuse it during boot.
   */
  async persistToolEvent(state: SessionState, label: string, detail?: string): Promise<void> {
    try {
      const content = detail ? `**${label}** \`${detail}\`` : `**${label}**`;
      const msg: InteractiveMessage = {
        id: crypto.randomUUID(),
        featureId: state.featureId,
        sessionId: state.sessionId,
        role: InteractiveMessageRole.assistant,
        content,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      await this.messageRepo.create(msg);
    } catch {
      // Non-critical — don't fail the turn for a tool event
    }
  }
}
