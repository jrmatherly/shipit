/**
 * AgentSession and AgentSessionMessage Test Factories
 *
 * Shared builder functions for creating AgentSession and AgentSessionMessage test
 * fixtures with sensible defaults. Use the `overrides` parameter to customize any
 * field for a specific test scenario.
 *
 * @example
 * ```typescript
 * const session = createMockAgentSession();
 * const sessionWithMessages = createMockAgentSession({
 *   messages: [createMockAgentSessionMessage({ role: 'user', content: 'hello' })],
 *   messageCount: 1,
 * });
 * const geminiSession = createMockAgentSession({ agentType: AgentType.GeminiCli });
 * ```
 */

import type { AgentSession, AgentSessionMessage } from '@/domain/generated/output.js';
import { AgentType } from '@/domain/generated/output.js';

export function createMockAgentSessionMessage(
  overrides?: Partial<AgentSessionMessage>
): AgentSessionMessage {
  return {
    uuid: 'msg-test-001',
    role: 'user',
    content: 'Help me implement a feature',
    timestamp: new Date('2025-01-01T10:00:00Z'),
    ...overrides,
  };
}

export function createMockAgentSession(overrides?: Partial<AgentSession>): AgentSession {
  return {
    id: 'session-test-001',
    agentType: AgentType.ClaudeCode,
    projectPath: '~/repos/test-project',
    messageCount: 5,
    preview: 'Help me implement a feature',
    createdAt: new Date('2025-01-01T10:00:00Z'),
    updatedAt: new Date('2025-01-01T12:00:00Z'),
    ...overrides,
  };
}
