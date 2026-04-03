/**
 * AgentRun Test Factory
 *
 * Shared builder function for creating AgentRun test fixtures with sensible defaults.
 * Use the `overrides` parameter to customize any field for a specific test scenario.
 *
 * @example
 * ```typescript
 * const run = createMockAgentRun();
 * const failedRun = createMockAgentRun({ status: AgentRunStatus.failed, error: 'timeout' });
 * const runWithFeature = createMockAgentRun({ featureId: 'feat-test-001' });
 * ```
 */

import type { AgentRun } from '@/domain/generated/output.js';
import { AgentRunStatus, AgentType } from '@/domain/generated/output.js';

export function createMockAgentRun(overrides?: Partial<AgentRun>): AgentRun {
  return {
    id: 'run-test-001',
    agentType: AgentType.ClaudeCode,
    agentName: 'feature-agent',
    status: AgentRunStatus.running,
    prompt: 'Implement the test feature',
    threadId: 'thread-test-001',
    createdAt: new Date('2025-01-01T10:00:00Z'),
    updatedAt: new Date('2025-01-01T10:00:00Z'),
    ...overrides,
  };
}
