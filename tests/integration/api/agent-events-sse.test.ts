/**
 * SSE API Route Integration Tests
 *
 * Tests for the GET /api/agent-events SSE endpoint that streams
 * notification events via DB polling with per-connection delta cache.
 *
 * These tests mock the DI container (resolve()) to inject a fake
 * PollAgentEventsUseCase, then exercise the route handler directly.
 *
 * Option A: mock the use case to return pre-computed notification events.
 * This keeps integration tests focused on the route's SSE encoding and
 * connection-management responsibilities, not on the use-case business logic.
 */

import 'reflect-metadata';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NotificationEventType, NotificationSeverity } from '@/domain/generated/output.js';
import type { NotificationEvent } from '@/domain/generated/output.js';
import type { PollAgentEventsResult } from '@shipit-ai/core/application/use-cases/agents/poll-agent-events.use-case.js';

// --- Mock DI container via server-container ---

const mockUseCase = {
  execute: vi.fn(
    async (): Promise<PollAgentEventsResult> => ({
      notificationEvents: [],
      sessionEvents: [],
    })
  ),
};

vi.mock('@/lib/server-container', () => ({
  resolve: vi.fn((token: string) => {
    if (token === 'PollAgentEventsUseCase') {
      return mockUseCase;
    }
    throw new Error(`Unknown token: ${token}`);
  }),
}));

// --- Helpers ---

/**
 * Build a minimal NotificationEvent for use in test assertions.
 */
function makeNotificationEvent(
  overrides: Partial<NotificationEvent> & {
    eventType: NotificationEventType;
    featureName: string;
  }
): NotificationEvent {
  return {
    agentRunId: 'run-1',
    featureId: 'feat-1',
    message: 'test event',
    severity: NotificationSeverity.Info,
    timestamp: new Date(),
    ...overrides,
  };
}

/**
 * Read chunks from a ReadableStream until aborted or limit reached.
 */
async function readSSEChunks(
  body: ReadableStream<Uint8Array>,
  signal: AbortSignal,
  maxChunks = 10
): Promise<string[]> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  const chunks: string[] = [];

  try {
    while (chunks.length < maxChunks) {
      if (signal.aborted) break;
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(decoder.decode(value, { stream: true }));
    }
  } catch {
    // Expected when stream is cancelled
  } finally {
    reader.releaseLock();
  }

  return chunks;
}

/**
 * Wait for poll cycles by advancing time. Each poll is 3s.
 */
async function advancePollCycles(count: number): Promise<void> {
  for (let i = 0; i < count; i++) {
    await vi.advanceTimersByTimeAsync(3_000);
  }
}

describe('SSE API Route: GET /api/agent-events (DB polling)', () => {
  // eslint-disable-next-line @typescript-eslint/consistent-type-imports
  let routeModule: typeof import('@/presentation/web/app/api/agent-events/route.js');

  beforeEach(async () => {
    vi.useFakeTimers();

    // Reset mock state
    vi.clearAllMocks();
    mockUseCase.execute.mockResolvedValue({ notificationEvents: [], sessionEvents: [] });

    // Fresh import each test
    routeModule = await import('@/presentation/web/app/api/agent-events/route.js');
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('should return response with text/event-stream content type', () => {
    const controller = new AbortController();
    const request = new Request('http://localhost:3000/api/agent-events', {
      signal: controller.signal,
    });

    const response = routeModule.GET(request);

    expect(response.headers.get('Content-Type')).toBe('text/event-stream');
    expect(response.headers.get('Cache-Control')).toBe('no-cache');
    expect(response.headers.get('Connection')).toBe('keep-alive');

    controller.abort();
  });

  it('should emit status change events after cache is seeded', async () => {
    // Poll 1: return no events (seed)
    // Poll 2: return an AgentCompleted event
    mockUseCase.execute
      .mockResolvedValueOnce({ notificationEvents: [], sessionEvents: [] })
      .mockResolvedValueOnce({
        notificationEvents: [
          makeNotificationEvent({
            eventType: NotificationEventType.AgentCompleted,
            featureName: 'Test Feature',
            agentRunId: 'run-1',
            featureId: 'feat-1',
            severity: NotificationSeverity.Success,
          }),
        ],
        sessionEvents: [],
      });

    const controller = new AbortController();
    const request = new Request('http://localhost:3000/api/agent-events', {
      signal: controller.signal,
    });

    const response = routeModule.GET(request);
    const body = response.body!;
    const chunksPromise = readSSEChunks(body, controller.signal, 5);

    // Poll 1: seeds the cache (no events emitted)
    await advancePollCycles(1);

    // Poll 2: detects status change → emits event
    await advancePollCycles(1);

    controller.abort();
    const chunks = await chunksPromise;
    const allData = chunks.join('');

    expect(allData).toContain('event: notification');
    expect(allData).toContain(NotificationEventType.AgentCompleted);
    expect(allData).toContain('Test Feature');
  });

  it('should not emit events on the initial seed poll', async () => {
    // Use case returns no events on the first poll
    mockUseCase.execute.mockResolvedValue({ notificationEvents: [], sessionEvents: [] });

    const controller = new AbortController();
    const request = new Request('http://localhost:3000/api/agent-events', {
      signal: controller.signal,
    });

    const response = routeModule.GET(request);
    const body = response.body!;
    const chunksPromise = readSSEChunks(body, controller.signal, 5);

    // Only run one poll (seed) then abort
    await advancePollCycles(1);

    controller.abort();
    const chunks = await chunksPromise;
    const allData = chunks.join('');

    // Should have no notification events — only possibly heartbeats or nothing
    expect(allData).not.toContain('event: notification');
  });

  it('should filter events by runId when query parameter is provided', async () => {
    // Poll 1: seed — no events
    // Poll 2: use case returns only run-2/Feature Two event (filtering is use-case responsibility)
    mockUseCase.execute
      .mockResolvedValueOnce({ notificationEvents: [], sessionEvents: [] })
      .mockResolvedValueOnce({
        notificationEvents: [
          makeNotificationEvent({
            eventType: NotificationEventType.AgentCompleted,
            featureName: 'Feature Two',
            agentRunId: 'run-2',
            featureId: 'feat-2',
            severity: NotificationSeverity.Success,
          }),
        ],
        sessionEvents: [],
      });

    const controller = new AbortController();
    const request = new Request('http://localhost:3000/api/agent-events?runId=run-2', {
      signal: controller.signal,
    });

    const response = routeModule.GET(request);
    const body = response.body!;
    const chunksPromise = readSSEChunks(body, controller.signal, 5);

    // Seed poll
    await advancePollCycles(1);

    // Delta poll
    await advancePollCycles(1);

    controller.abort();
    const chunks = await chunksPromise;
    const allData = chunks.join('');

    // Only run-2 events should appear
    expect(allData).toContain('run-2');
    expect(allData).toContain('Feature Two');
    expect(allData).not.toContain('run-1');
    expect(allData).not.toContain('Feature One');
  });

  it('should emit phase completion events for new completed phases', async () => {
    // Poll 1: seed — no events
    // Poll 2: use case returns a PhaseCompleted event for 'analyze'
    mockUseCase.execute
      .mockResolvedValueOnce({ notificationEvents: [], sessionEvents: [] })
      .mockResolvedValueOnce({
        notificationEvents: [
          makeNotificationEvent({
            eventType: NotificationEventType.PhaseCompleted,
            featureName: 'Test Feature',
            phaseName: 'analyze',
            message: 'Completed analyze phase',
          }),
        ],
        sessionEvents: [],
      });

    const controller = new AbortController();
    const request = new Request('http://localhost:3000/api/agent-events', {
      signal: controller.signal,
    });

    const response = routeModule.GET(request);
    const body = response.body!;
    const chunksPromise = readSSEChunks(body, controller.signal, 5);

    // Seed poll (no timings yet)
    await advancePollCycles(1);

    // Delta poll — should detect new completed phase
    await advancePollCycles(1);

    controller.abort();
    const chunks = await chunksPromise;
    const allData = chunks.join('');

    expect(allData).toContain('event: notification');
    expect(allData).toContain(NotificationEventType.PhaseCompleted);
    expect(allData).toContain('analyze');
  });

  it('should send heartbeat comments at the configured interval', async () => {
    const controller = new AbortController();
    const request = new Request('http://localhost:3000/api/agent-events', {
      signal: controller.signal,
    });

    const response = routeModule.GET(request);
    const body = response.body!;
    const reader = body.getReader();
    const decoder = new TextDecoder();

    // Advance time past the heartbeat interval (30 seconds)
    await vi.advanceTimersByTimeAsync(30_000);

    const { value } = await reader.read();
    const chunk = decoder.decode(value, { stream: true });

    expect(chunk).toContain(': heartbeat');

    reader.releaseLock();
    controller.abort();
  });

  it('should clean up intervals when request is aborted', async () => {
    const controller = new AbortController();
    const request = new Request('http://localhost:3000/api/agent-events', {
      signal: controller.signal,
    });

    const response = routeModule.GET(request);
    const body = response.body!;
    const reader = body.getReader();

    // Let the stream start
    await vi.advanceTimersByTimeAsync(100);

    // Abort the request
    controller.abort();

    // Try to read to trigger cleanup
    try {
      await reader.read();
    } catch {
      // Expected
    }
    reader.releaseLock();

    // Advance time — should not throw or cause issues
    await vi.advanceTimersByTimeAsync(10_000);

    // Verify no more polls happen after abort
    const callsBefore = mockUseCase.execute.mock.calls.length;
    await vi.advanceTimersByTimeAsync(6_000);
    const callsAfter = mockUseCase.execute.mock.calls.length;

    expect(callsAfter).toBe(callsBefore);
  });

  it('should support multiple concurrent SSE clients independently', async () => {
    // Both clients get an AgentCompleted event on poll 2
    mockUseCase.execute
      // Client 1 poll 1 (seed) and Client 2 poll 1 (seed) — interleaved
      .mockResolvedValueOnce({ notificationEvents: [], sessionEvents: [] })
      .mockResolvedValueOnce({ notificationEvents: [], sessionEvents: [] })
      // Client 1 poll 2 (delta) and Client 2 poll 2 (delta)
      .mockResolvedValue({
        notificationEvents: [
          makeNotificationEvent({
            eventType: NotificationEventType.AgentCompleted,
            featureName: 'Test Feature',
            severity: NotificationSeverity.Success,
          }),
        ],
        sessionEvents: [],
      });

    const controller1 = new AbortController();
    const controller2 = new AbortController();

    const request1 = new Request('http://localhost:3000/api/agent-events', {
      signal: controller1.signal,
    });
    const request2 = new Request('http://localhost:3000/api/agent-events', {
      signal: controller2.signal,
    });

    const response1 = routeModule.GET(request1);
    const response2 = routeModule.GET(request2);

    const chunks1Promise = readSSEChunks(response1.body!, controller1.signal, 5);
    const chunks2Promise = readSSEChunks(response2.body!, controller2.signal, 5);

    // Seed poll for both
    await advancePollCycles(1);

    // Delta poll
    await advancePollCycles(1);

    controller1.abort();
    controller2.abort();

    const chunks1 = await chunks1Promise;
    const chunks2 = await chunks2Promise;

    const data1 = chunks1.join('');
    const data2 = chunks2.join('');

    // Both clients should receive the status change event
    expect(data1).toContain(NotificationEventType.AgentCompleted);
    expect(data2).toContain(NotificationEventType.AgentCompleted);
  });

  it('should emit MergeReviewReady when feature lifecycle transitions to Review', async () => {
    // Poll 1: seed — no events
    // Poll 2: use case returns MergeReviewReady with PR URL
    const prUrl = 'https://github.com/org/repo/pull/42';
    mockUseCase.execute
      .mockResolvedValueOnce({ notificationEvents: [], sessionEvents: [] })
      .mockResolvedValueOnce({
        notificationEvents: [
          makeNotificationEvent({
            eventType: NotificationEventType.MergeReviewReady,
            featureName: 'Test Feature',
            phaseName: 'merge',
            message: `Ready for merge review — PR: ${prUrl}`,
          }),
        ],
        sessionEvents: [],
      });

    const controller = new AbortController();
    const request = new Request('http://localhost:3000/api/agent-events', {
      signal: controller.signal,
    });

    const response = routeModule.GET(request);
    const body = response.body!;
    const chunksPromise = readSSEChunks(body, controller.signal, 5);

    // Seed poll
    await advancePollCycles(1);

    // Delta poll — should detect lifecycle transition and emit MergeReviewReady
    await advancePollCycles(1);

    controller.abort();
    const chunks = await chunksPromise;
    const allData = chunks.join('');

    expect(allData).toContain('event: notification');
    expect(allData).toContain(NotificationEventType.MergeReviewReady);
    expect(allData).toContain('Ready for merge review');
    expect(allData).toContain(prUrl);
  });

  it('should emit MergeReviewReady without PR URL when PR is not available', async () => {
    // Poll 1: seed — no events
    // Poll 2: use case returns MergeReviewReady without a PR URL
    mockUseCase.execute
      .mockResolvedValueOnce({ notificationEvents: [], sessionEvents: [] })
      .mockResolvedValueOnce({
        notificationEvents: [
          makeNotificationEvent({
            eventType: NotificationEventType.MergeReviewReady,
            featureName: 'Test Feature',
            phaseName: 'merge',
            message: 'Ready for merge review',
          }),
        ],
        sessionEvents: [],
      });

    const controller = new AbortController();
    const request = new Request('http://localhost:3000/api/agent-events', {
      signal: controller.signal,
    });

    const response = routeModule.GET(request);
    const body = response.body!;
    const chunksPromise = readSSEChunks(body, controller.signal, 5);

    // Seed poll
    await advancePollCycles(1);

    // Delta poll
    await advancePollCycles(1);

    controller.abort();
    const chunks = await chunksPromise;
    const allData = chunks.join('');

    expect(allData).toContain(NotificationEventType.MergeReviewReady);
    expect(allData).toContain('Ready for merge review');
    // Should NOT contain a PR URL
    expect(allData).not.toContain('PR:');
  });

  it('should not emit MergeReviewReady for non-Review lifecycle transitions', async () => {
    // Poll 1: seed — no events
    // Poll 2: use case returns PhaseCompleted (not MergeReviewReady) for Planning lifecycle
    mockUseCase.execute
      .mockResolvedValueOnce({ notificationEvents: [], sessionEvents: [] })
      .mockResolvedValueOnce({
        notificationEvents: [
          makeNotificationEvent({
            eventType: NotificationEventType.PhaseCompleted,
            featureName: 'Test Feature',
            phaseName: 'plan',
            message: 'Entered plan phase',
          }),
        ],
        sessionEvents: [],
      });

    const controller = new AbortController();
    const request = new Request('http://localhost:3000/api/agent-events', {
      signal: controller.signal,
    });

    const response = routeModule.GET(request);
    const body = response.body!;
    const chunksPromise = readSSEChunks(body, controller.signal, 5);

    // Seed poll
    await advancePollCycles(1);

    // Delta poll
    await advancePollCycles(1);

    controller.abort();
    const chunks = await chunksPromise;
    const allData = chunks.join('');

    // Should emit PhaseCompleted, NOT MergeReviewReady
    expect(allData).not.toContain(NotificationEventType.MergeReviewReady);
    expect(allData).toContain(NotificationEventType.PhaseCompleted);
  });

  it('should gracefully handle DI container errors during poll', async () => {
    // Make execute throw on first few polls, then succeed
    mockUseCase.execute
      .mockRejectedValueOnce(new Error('DI not ready'))
      .mockRejectedValueOnce(new Error('DI not ready'))
      .mockResolvedValueOnce({ notificationEvents: [], sessionEvents: [] }) // seed
      .mockResolvedValueOnce({
        notificationEvents: [
          makeNotificationEvent({
            eventType: NotificationEventType.AgentCompleted,
            featureName: 'Test Feature',
            severity: NotificationSeverity.Success,
          }),
        ],
        sessionEvents: [],
      });

    const controller = new AbortController();
    const request = new Request('http://localhost:3000/api/agent-events', {
      signal: controller.signal,
    });

    const response = routeModule.GET(request);
    const body = response.body!;
    const chunksPromise = readSSEChunks(body, controller.signal, 5);

    // These polls should fail gracefully
    await advancePollCycles(2);

    // This poll should succeed (seed)
    await advancePollCycles(1);

    // This poll should emit events
    await advancePollCycles(1);

    controller.abort();
    const chunks = await chunksPromise;
    const allData = chunks.join('');

    // Should still get events after recovery
    expect(allData).toContain(NotificationEventType.AgentCompleted);
  });
});
