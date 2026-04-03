import type { InteractiveAgentSessionHandle } from '../../../application/ports/output/agents/interactive-agent-executor.interface.js';
import type { StreamChunk } from '../../../application/ports/output/services/interactive-session-service.interface.js';

/** In-memory state for a single live session. */
export interface SessionState {
  sessionId: string;
  featureId: string;
  worktreePath: string;
  /** Agent SDK session handle — null until session is created. */
  handle: InteractiveAgentSessionHandle | null;
  /** Agent SDK session ID for resumption across service restarts. */
  agentSessionId?: string;
  timer: NodeJS.Timeout | null;
  /** Accumulates assistant text between user turns for persistence. */
  currentAssistantBuffer: string;
  /** Accumulates tool events during a turn for rich message persistence. */
  toolEventsLog: string[];
  /** Subscriber callbacks for real-time stdout chunk forwarding. */
  subscribers: Set<(chunk: StreamChunk) => void>;
  /** User message content queued while session boots. */
  pendingUserContent?: string;
  /** Model override for the agent process (e.g. 'claude-sonnet-4-6'). */
  model?: string;
  /** Agent type for this session. */
  agentType?: string;
  /** AbortController to cancel active stream iteration on stop. */
  streamAbort?: AbortController;
  /** Whether a turn is currently executing (prevents concurrent turns). */
  turnInProgress: boolean;
  /** Queue of user messages waiting to be sent after the current turn completes. */
  turnQueue: string[];
}
