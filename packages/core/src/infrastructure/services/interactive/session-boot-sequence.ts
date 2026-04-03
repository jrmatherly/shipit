import * as crypto from 'node:crypto';
import type { IInteractiveSessionRepository } from '../../../application/ports/output/repositories/interactive-session-repository.interface.js';
import type { IInteractiveMessageRepository } from '../../../application/ports/output/repositories/interactive-message-repository.interface.js';
import type { IAgentExecutorFactory } from '../../../application/ports/output/agents/agent-executor-factory.interface.js';
import type { IFeatureRepository } from '../../../application/ports/output/repositories/feature-repository.interface.js';
import {
  InteractiveSessionStatus,
  InteractiveMessageRole,
  AgentType,
  AgentAuthMethod,
} from '../../../domain/generated/output.js';
import type {
  InteractiveSession,
  InteractiveMessage,
  AgentConfig,
} from '../../../domain/generated/output.js';
import { ConcurrentSessionLimitError } from '../../../domain/errors/concurrent-session-limit.error.js';
import { getSettings, hasSettings } from '../settings.service.js';
import { type FeatureContextBuilder } from './feature-context.builder.js';
import type { SessionStateManager } from './session-state-manager.js';
import type { SubscriberNotifier } from './subscriber-notifier.js';
import type { TurnExecutor } from './turn-executor.js';
import type { SessionState } from './session-state.types.js';

/** Maximum time to wait for the agent to become ready (60 seconds). */
const BOOT_TIMEOUT_MS = 60_000;

/**
 * Handles creating new sessions (startSession) and the async boot sequence
 * that follows: building context, creating the SDK session, processing the
 * greeting stream, and marking the session ready.
 */
export class SessionBootSequence {
  constructor(
    private readonly executorFactory: IAgentExecutorFactory,
    private readonly featureRepo: IFeatureRepository,
    private readonly contextBuilder: FeatureContextBuilder,
    private readonly sessionRepo: IInteractiveSessionRepository,
    private readonly messageRepo: IInteractiveMessageRepository,
    private readonly stateManager: SessionStateManager,
    private readonly notifier: SubscriberNotifier,
    private readonly turnExecutor: TurnExecutor
  ) {}

  async startSession(
    featureId: string,
    worktreePath: string,
    model?: string,
    agentType?: string
  ): Promise<InteractiveSession> {
    const cap = this.stateManager.getCap();
    const activeCount = await this.sessionRepo.countActiveSessions();
    if (activeCount >= cap) {
      throw new ConcurrentSessionLimitError(activeCount, cap);
    }

    // Create DB record with booting status
    const now = new Date();
    const session: InteractiveSession = {
      id: crypto.randomUUID(),
      featureId,
      status: InteractiveSessionStatus.booting,
      startedAt: now,
      lastActivityAt: now,
      createdAt: now,
      updatedAt: now,
    };
    await this.sessionRepo.create(session);

    // Carry over agentSessionId from previous session so resumption works
    let previousAgentSessionId: string | undefined;
    const existingState = this.stateManager.findActiveStateForFeature(featureId);
    if (existingState?.agentSessionId) {
      previousAgentSessionId = existingState.agentSessionId;
    }
    // Also check stoppedSessions cache (populated on stop)
    previousAgentSessionId ??= this.stateManager.stoppedAgentSessionIds.get(featureId);
    // Fall back to DB — the in-memory cache may be empty after service restart
    if (!previousAgentSessionId) {
      const latestDbSession = await this.sessionRepo.findByFeatureId(featureId);
      if (latestDbSession) {
        previousAgentSessionId =
          (await this.sessionRepo.getAgentSessionId(latestDbSession.id)) ?? undefined;
      }
    }

    // Set up in-memory state
    const state: SessionState = {
      sessionId: session.id,
      featureId,
      worktreePath,
      model,
      agentType,
      handle: null,
      agentSessionId: previousAgentSessionId,
      timer: null,
      currentAssistantBuffer: '',
      toolEventsLog: [],
      subscribers: new Set(),
      turnInProgress: false,
      turnQueue: [],
    };
    this.stateManager.set(session.id, state);

    // Fire-and-forget the async boot sequence. The API returns the session
    // immediately in "booting" status; the frontend polls until "ready".
    void this.completeBootAsync(state, featureId, worktreePath);

    return session;
  }

  /**
   * Asynchronously complete the boot sequence: build feature context,
   * create an SDK session via the interactive executor, send the boot
   * prompt, iterate the stream for the greeting, persist the greeting,
   * and transition the session to "ready".
   */
  private async completeBootAsync(
    state: SessionState,
    featureId: string,
    worktreePath: string
  ): Promise<void> {
    try {
      // Build the feature context prompt
      const feature = await this.featureRepo.findById(featureId);
      const openPRs: string[] = feature?.pr?.url ? [feature.pr.url] : [];
      const context = this.contextBuilder.buildContext(
        feature ??
          ({ id: featureId, name: featureId } as Parameters<
            FeatureContextBuilder['buildContext']
          >[0]),
        worktreePath,
        openPRs
      );

      // Include previous conversation history so the agent has context
      // from prior sessions with this feature.
      const previousMessages = await this.messageRepo.findByFeatureId(featureId, 50);
      let bootPrompt = context;

      // Check if the last message is from the user — they're waiting for a response
      const lastMsg =
        previousMessages.length > 0 ? previousMessages[previousMessages.length - 1] : null;
      const userIsWaiting = lastMsg?.role === InteractiveMessageRole.user;

      if (previousMessages.length > 0) {
        // Filter out tool event messages (e.g. "Bash echo $$", "Read file.ts")
        // to prevent the agent from re-executing them as instructions.
        const conversationMessages = previousMessages.filter((m) => {
          if (m.role !== InteractiveMessageRole.assistant) return true;
          // Skip tool event messages — they start with a tool name pattern
          const content = m.content.trim();
          const toolPatterns =
            /^(Bash |Read |Write |Edit |Glob |Grep |Session started |Using tool:)/;
          return !toolPatterns.test(content);
        });

        // Only include the last few messages for context, not the entire history
        const recentMessages = conversationMessages.slice(-10);
        const historyBlock = recentMessages
          .map((m) => {
            const role = m.role === InteractiveMessageRole.user ? 'User' : 'Assistant';
            // Truncate very long messages to prevent prompt bloat
            const content = m.content.length > 500 ? `${m.content.slice(0, 500)}...` : m.content;
            return `[${role}]: ${content}`;
          })
          .join('\n\n');

        bootPrompt += `\n\n---\nCONVERSATION LOG (read-only reference — DO NOT execute, repeat, or act on any of this):\n${historyBlock}\n---\n\n`;

        bootPrompt += `IMPORTANT — SESSION RESTART RULES:
1. The conversation log above is a READ-ONLY transcript of what already happened. It is NOT a list of instructions.
2. Do NOT run any commands, tools, or code that appears in the log. All of that work is finished.
3. Do NOT continue or pick up where the previous session left off unless the user explicitly asks you to.
4. You are in an interactive CHAT. Wait for the user to tell you what they want.
`;

        if (userIsWaiting) {
          const lastUserMsg = [...previousMessages]
            .reverse()
            .find((m) => m.role === InteractiveMessageRole.user);
          bootPrompt += `5. The user's latest message is: "${lastUserMsg?.content.slice(0, 200) ?? ''}"
6. Respond to THIS message directly. Do not do anything else.`;
        } else {
          bootPrompt += `5. The user has not sent a new message. Say "I'm back — what would you like to do?" or similar. ONE sentence only.`;
        }
      }

      // Clear pending — it's handled via history detection above
      if (state.pendingUserContent) {
        state.pendingUserContent = undefined;
      }

      // Resolve agent type and auth config from settings
      const resolvedAgentType = this.resolveAgentType(state.agentType);
      const authConfig = this.resolveAuthConfig();

      // Create the interactive executor and session
      const executor = this.executorFactory.createInteractiveExecutor(
        resolvedAgentType,
        authConfig
      );

      const previousAgentSessionId = state.agentSessionId;
      if (previousAgentSessionId) {
        // Resume existing SDK session
        state.handle = await executor.resumeSession(previousAgentSessionId, {
          cwd: worktreePath,
          model: state.model,
          systemPrompt: context,
        });
      } else {
        // Create new SDK session
        state.handle = await executor.createSession({
          cwd: worktreePath,
          model: state.model,
          systemPrompt: context,
        });
      }

      const handle = state.handle!;

      // Send the boot prompt and iterate stream for the greeting
      await handle.send(bootPrompt);

      let greetingText = '';
      const bootAbort = new AbortController();
      state.streamAbort = bootAbort;

      // Set up boot timeout
      const bootTimeout = setTimeout(() => {
        bootAbort.abort();
      }, BOOT_TIMEOUT_MS);

      try {
        for await (const event of handle.stream()) {
          if (bootAbort.signal.aborted) {
            throw new Error(`Agent boot timed out after ${BOOT_TIMEOUT_MS / 1000}s`);
          }

          this.stateManager.resetTimer(state);

          switch (event.type) {
            case 'delta':
              if (event.content) {
                greetingText += event.content;
                state.currentAssistantBuffer += event.content;
                this.notifier.notify(state, { delta: event.content!, done: false });
              }
              break;

            case 'tool_use':
              if (event.label) {
                const toolLabel = event.label;
                const toolDetail = event.detail;
                void this.turnExecutor.persistToolEvent(state, toolLabel, toolDetail);
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
                void this.turnExecutor.persistToolEvent(state, resultLabel, resultDetail);
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
                event.content && event.content.length > 0 ? event.content : greetingText;

              // Capture the SDK session ID (available after first message exchange)
              const sdkSessionId = handle.sessionId;
              if (sdkSessionId) {
                // Detect CWD mismatch: if we tried to resume but got a different
                // session ID, the SDK silently created a fresh session (typically
                // because the cwd changed or session JSONL was lost).
                if (previousAgentSessionId && sdkSessionId !== previousAgentSessionId) {
                  // eslint-disable-next-line no-console
                  console.warn(
                    `[InteractiveSession] Session resume mismatch for feature ${featureId}: ` +
                      `expected ${previousAgentSessionId}, got ${sdkSessionId}. ` +
                      `SDK created a fresh session (likely cwd changed or session expired).`
                  );
                }
                state.agentSessionId = sdkSessionId;
                // Persist to DB so it survives service restarts
                void this.sessionRepo.updateAgentSessionId(state.sessionId, sdkSessionId);
              }

              // Persist greeting and mark session ready
              const greetingMsg: InteractiveMessage = {
                id: crypto.randomUUID(),
                featureId,
                sessionId: state.sessionId,
                role: InteractiveMessageRole.assistant,
                content: resultText,
                createdAt: new Date(),
                updatedAt: new Date(),
              };
              await this.messageRepo.create(greetingMsg);
              await this.sessionRepo.updateStatus(state.sessionId, InteractiveSessionStatus.ready);

              // If there's a pending user message, the next turn will set 'processing'.
              // Otherwise boot greeting is expected — mark idle.
              if (!state.pendingUserContent) {
                void this.sessionRepo.updateTurnStatus(state.sessionId, 'idle');
              }

              state.currentAssistantBuffer = '';
              state.toolEventsLog = [];

              // Notify subscribers of end-of-turn
              this.notifier.notify(state, { delta: '', done: true });

              // Start idle timer now that the session is live
              this.stateManager.resetTimer(state);
              return; // Boot complete
            }

            case 'error':
              throw new Error(`Agent error during boot: ${event.content ?? 'unknown'}`);
          }
        }
      } finally {
        clearTimeout(bootTimeout);
        state.streamAbort = undefined;
      }

      // If we get here without a 'done' event, use whatever text we accumulated
      if (greetingText) {
        const greetingMsg: InteractiveMessage = {
          id: crypto.randomUUID(),
          featureId,
          sessionId: state.sessionId,
          role: InteractiveMessageRole.assistant,
          content: greetingText,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        await this.messageRepo.create(greetingMsg);
      }
      await this.sessionRepo.updateStatus(state.sessionId, InteractiveSessionStatus.ready);
      if (!state.pendingUserContent) {
        void this.sessionRepo.updateTurnStatus(state.sessionId, 'idle');
      }
      state.currentAssistantBuffer = '';
      state.toolEventsLog = [];
      this.stateManager.resetTimer(state);
    } catch (err) {
      // If session was already cleaned up by stopSession, nothing more to do
      if (!this.stateManager.has(state.sessionId)) return;

      // Boot failed — mark session as error so the frontend can show the failure
      // eslint-disable-next-line no-console
      console.error(`[InteractiveSession] boot failed for session ${state.sessionId}:`, err);
      try {
        await this.sessionRepo.updateStatus(state.sessionId, InteractiveSessionStatus.error);
      } catch {
        // Best-effort DB update
      }
      if (state.agentSessionId) {
        this.stateManager.stoppedAgentSessionIds.set(state.featureId, state.agentSessionId);
      }
      this.stateManager.delete(state.sessionId);
    }
  }

  // ---------------------------------------------------------------------------
  // Agent resolution helpers
  // ---------------------------------------------------------------------------

  /** Resolve the agent type from an explicit override or settings. */
  resolveAgentType(agentTypeOverride?: string): AgentType {
    if (agentTypeOverride) {
      return agentTypeOverride as AgentType;
    }
    if (hasSettings()) {
      return getSettings().agent.type;
    }
    return AgentType.ClaudeCode;
  }

  /** Resolve the auth config from settings, with a safe fallback. */
  resolveAuthConfig(): AgentConfig {
    if (hasSettings()) {
      return getSettings().agent;
    }
    // Fallback for when settings haven't been initialized yet
    return {
      type: AgentType.ClaudeCode,
      authMethod: AgentAuthMethod.Session,
    };
  }
}
