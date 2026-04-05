/**
 * SSE API Route: GET /api/agent-events
 *
 * Streams agent lifecycle notification events to connected web UI clients
 * via Server-Sent Events (SSE).
 *
 * This route is a thin adapter: it owns SSE encoding, connection management,
 * heartbeat, and interval scheduling only.  All business logic (crash
 * detection, event delta computation, lifecycle mapping) lives in
 * PollAgentEventsUseCase.
 *
 * - Polls features + agent runs every 2 seconds
 * - Compares against per-connection snapshot and emits only deltas
 * - Sends heartbeat comments every 30 seconds to keep connection alive
 * - Supports optional ?runId query parameter to filter events
 * - Cleans up intervals on client disconnect
 */

import { resolve } from '@/lib/server-container';
import { apiError } from '@/lib/api-helpers';
import type {
  PollAgentEventsUseCase,
  AgentEventsSnapshot,
} from '@shipit-ai/core/application/use-cases/agents/poll-agent-events.use-case';

// Force dynamic — SSE streams must never be statically optimized or cached
export const dynamic = 'force-dynamic';

const POLL_INTERVAL_MS = 2_000;
const HEARTBEAT_INTERVAL_MS = 30_000;

/** Re-export for downstream consumers that import this type from the route. */
export type { InteractiveSessionEvent } from '@shipit-ai/core/application/use-cases/agents/poll-agent-events.use-case';

export function GET(request: Request): Response {
  try {
    const url = new URL(request.url);
    const runIdFilter = url.searchParams.get('runId');

    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        const encoder = new TextEncoder();
        let stopped = false;

        // Per-connection snapshot owned and mutated by the use case on each poll
        const snapshot: AgentEventsSnapshot = {
          featureCache: new Map(),
          sessionCache: new Map(),
        };

        function enqueue(text: string) {
          if (stopped) return;
          try {
            controller.enqueue(encoder.encode(text));
          } catch {
            // Stream may be closed
          }
        }

        let pollErrorCount = 0;

        async function poll() {
          if (stopped) return;

          try {
            const useCase = resolve<PollAgentEventsUseCase>('PollAgentEventsUseCase');
            const result = await useCase.execute({ runIdFilter, snapshot });

            for (const event of result.notificationEvents) {
              // eslint-disable-next-line no-console
              console.log(
                `[SSE] emit: ${event.eventType} for "${event.featureName}"${event.phaseName ? ` (${event.phaseName})` : ''}`
              );
              enqueue(`event: notification\ndata: ${JSON.stringify(event)}\n\n`);
            }

            for (const event of result.sessionEvents) {
              enqueue(`event: interactive_session\ndata: ${JSON.stringify(event)}\n\n`);
            }

            pollErrorCount = 0;
          } catch (error) {
            pollErrorCount++;
            // Log first few errors, then throttle to avoid spamming
            if (pollErrorCount <= 3 || pollErrorCount % 60 === 0) {
              // eslint-disable-next-line no-console
              console.error(
                `[SSE /api/agent-events] poll error #${pollErrorCount}:`,
                error instanceof Error ? error.message : error
              );
            }
          }
        }

        // First poll immediately, then every POLL_INTERVAL_MS
        void poll();
        const pollInterval = setInterval(() => void poll(), POLL_INTERVAL_MS);

        // Heartbeat to keep connection alive
        const heartbeatInterval = setInterval(() => {
          enqueue(': heartbeat\n\n');
        }, HEARTBEAT_INTERVAL_MS);

        // Cleanup on client disconnect
        const cleanup = () => {
          stopped = true;
          clearInterval(pollInterval);
          clearInterval(heartbeatInterval);
          try {
            controller.close();
          } catch {
            // Stream may already be closed
          }
        };

        request.signal.addEventListener('abort', cleanup, { once: true });
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (error) {
    return apiError(500, 'Failed to open agent events stream', error);
  }
}
