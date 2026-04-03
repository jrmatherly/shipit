/**
 * Poll Agent Events Use Case
 *
 * Computes a delta set of NotificationEvents and interactive-session events by
 * comparing current DB state against the caller-supplied snapshot.  The snapshot
 * is mutated in place so the same object can be passed on every subsequent poll
 * call from the SSE transport layer.
 *
 * This use case is presentation-agnostic: it has no knowledge of SSE, HTTP, or
 * Next.js.  The SSE route is responsible only for encoding the returned events
 * onto the wire.
 *
 * Business logic extracted from:
 *   src/presentation/web/app/api/agent-events/route.ts
 */

import { injectable, inject } from 'tsyringe';
import type {
  Feature,
  AgentRun,
  PhaseTiming,
  NotificationEvent,
} from '../../../domain/generated/output.js';
import {
  AgentRunStatus,
  InteractiveSessionStatus,
  SdlcLifecycle,
  NotificationEventType,
  NotificationSeverity,
} from '../../../domain/generated/output.js';
import type { IAgentRunRepository } from '../../ports/output/agents/agent-run-repository.interface.js';
import type { IPhaseTimingRepository } from '../../ports/output/agents/phase-timing-repository.interface.js';
import type { IInteractiveSessionRepository } from '../../ports/output/repositories/interactive-session-repository.interface.js';
import type { IFeatureRepository } from '../../ports/output/repositories/feature-repository.interface.js';
import type { IProcessMonitor } from '../../ports/output/services/process-monitor.interface.js';

// ---------------------------------------------------------------------------
// Public snapshot types (owned by the caller; passed in on every poll)
// ---------------------------------------------------------------------------

/** Per-feature state snapshot for delta computation. */
export interface FeatureStateSnapshot {
  status: AgentRunStatus | null;
  lifecycle: string;
  completedPhases: Set<string>;
  featureName: string;
  prStatus: string | undefined;
  prMergeable: boolean | undefined;
  prCiStatus: string | undefined;
  /** Set to true once a crash event has been emitted for this feature. */
  crashEmitted?: boolean;
}

/** Per-session state snapshot for delta computation. */
export interface SessionStateSnapshot {
  status: InteractiveSessionStatus;
}

/** Mutable state passed by the SSE transport layer on every poll call. */
export interface AgentEventsSnapshot {
  /** featureId → last-seen feature/run state */
  featureCache: Map<string, FeatureStateSnapshot>;
  /** sessionId → last-seen interactive-session state */
  sessionCache: Map<string, SessionStateSnapshot>;
}

// ---------------------------------------------------------------------------
// Typed interactive-session event (mirrors the SSE route's export)
// ---------------------------------------------------------------------------

/** Payload for interactive-session lifecycle SSE events. */
export interface InteractiveSessionEvent {
  type:
    | 'interactive_session_booting'
    | 'interactive_session_ready'
    | 'interactive_session_stopped'
    | 'interactive_session_error';
  sessionId: string;
  featureId: string;
}

// ---------------------------------------------------------------------------
// Use-case I/O
// ---------------------------------------------------------------------------

/** Input for a single poll cycle. */
export interface PollAgentEventsInput {
  /**
   * Optional agent-run ID filter.  When supplied only events belonging to this
   * run are returned.
   */
  runIdFilter?: string | null;
  /** Mutable snapshot updated in place so the next call sees the latest state. */
  snapshot: AgentEventsSnapshot;
}

/** Result of a single poll cycle. */
export interface PollAgentEventsResult {
  /** Zero or more notification events to stream to the client. */
  notificationEvents: NotificationEvent[];
  /** Zero or more interactive-session events to stream to the client. */
  sessionEvents: InteractiveSessionEvent[];
}

// ---------------------------------------------------------------------------
// Lifecycle-to-node mapping (business rule, not presentation concern)
// ---------------------------------------------------------------------------

const LIFECYCLE_TO_NODE: Record<SdlcLifecycle, string> = {
  [SdlcLifecycle.Started]: 'requirements',
  [SdlcLifecycle.Analyze]: 'analyze',
  [SdlcLifecycle.Requirements]: 'requirements',
  [SdlcLifecycle.Research]: 'research',
  [SdlcLifecycle.Planning]: 'plan',
  [SdlcLifecycle.Implementation]: 'implement',
  [SdlcLifecycle.Review]: 'merge',
  [SdlcLifecycle.Maintain]: 'maintain',
  [SdlcLifecycle.Blocked]: 'blocked',
  [SdlcLifecycle.Pending]: 'pending',
  [SdlcLifecycle.Deleting]: 'blocked',
  [SdlcLifecycle.AwaitingUpstream]: 'merge',
  [SdlcLifecycle.Archived]: 'archived',
};

const STATUS_TO_EVENT: Partial<
  Record<AgentRunStatus, { eventType: NotificationEventType; severity: NotificationSeverity }>
> = {
  [AgentRunStatus.running]: {
    eventType: NotificationEventType.AgentStarted,
    severity: NotificationSeverity.Info,
  },
  [AgentRunStatus.waitingApproval]: {
    eventType: NotificationEventType.WaitingApproval,
    severity: NotificationSeverity.Warning,
  },
  [AgentRunStatus.completed]: {
    eventType: NotificationEventType.AgentCompleted,
    severity: NotificationSeverity.Success,
  },
  [AgentRunStatus.failed]: {
    eventType: NotificationEventType.AgentFailed,
    severity: NotificationSeverity.Error,
  },
  [AgentRunStatus.interrupted]: {
    eventType: NotificationEventType.AgentFailed,
    severity: NotificationSeverity.Warning,
  },
  [AgentRunStatus.cancelled]: {
    eventType: NotificationEventType.AgentFailed,
    severity: NotificationSeverity.Warning,
  },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Map agent graph node name from AgentRun.result to a phase name. */
function resultToPhase(result: string | undefined): string | undefined {
  if (!result?.startsWith('node:')) return undefined;
  return result.slice(5); // "node:analyze" → "analyze"
}

function mapSessionStatus(status: InteractiveSessionStatus): InteractiveSessionEvent['type'] {
  switch (status) {
    case InteractiveSessionStatus.booting:
      return 'interactive_session_booting';
    case InteractiveSessionStatus.ready:
      return 'interactive_session_ready';
    case InteractiveSessionStatus.error:
      return 'interactive_session_error';
    default:
      return 'interactive_session_stopped';
  }
}

// ---------------------------------------------------------------------------
// Use case
// ---------------------------------------------------------------------------

@injectable()
export class PollAgentEventsUseCase {
  constructor(
    @inject('IFeatureRepository')
    private readonly featureRepo: IFeatureRepository,
    @inject('IAgentRunRepository')
    private readonly agentRunRepo: IAgentRunRepository,
    @inject('IPhaseTimingRepository')
    private readonly phaseTimingRepo: IPhaseTimingRepository,
    @inject('IInteractiveSessionRepository')
    private readonly sessionRepo: IInteractiveSessionRepository,
    @inject('IProcessMonitor')
    private readonly processMonitor: IProcessMonitor
  ) {}

  async execute(input: PollAgentEventsInput): Promise<PollAgentEventsResult> {
    const notificationEvents: NotificationEvent[] = [];
    const sessionEvents: InteractiveSessionEvent[] = [];

    await this.pollFeatureEvents(input, notificationEvents);
    await this.pollSessionEvents(input.snapshot, sessionEvents);

    return { notificationEvents, sessionEvents };
  }

  // -------------------------------------------------------------------------
  // Feature / agent-run event computation
  // -------------------------------------------------------------------------

  private async pollFeatureEvents(
    input: PollAgentEventsInput,
    out: NotificationEvent[]
  ): Promise<void> {
    const { runIdFilter, snapshot } = input;

    const features = await this.featureRepo.list();

    // Batch-fetch all agent runs referenced by the current features
    const runIds = features.map((f) => f.agentRunId).filter((id): id is string => id != null);
    const runs = await this.agentRunRepo.findByIds(runIds);
    const runMap = new Map(runs.map((r) => [r.id, r]));

    const entries: { feature: Feature; run: AgentRun | null }[] = features.map((feature) => ({
      feature,
      run: feature.agentRunId ? (runMap.get(feature.agentRunId) ?? null) : null,
    }));

    // Batch-fetch all phase timings for runs that exist
    const activeRunIds = entries.filter((e) => e.run != null).map((e) => e.run!.id);
    let allTimings: PhaseTiming[] = [];
    try {
      allTimings = await this.phaseTimingRepo.findByRunIds(activeRunIds);
    } catch {
      // Timing errors are non-fatal — continue without timing data
    }
    const timingsByRunId = new Map<string, PhaseTiming[]>();
    for (const t of allTimings) {
      const arr = timingsByRunId.get(t.agentRunId) ?? [];
      arr.push(t);
      timingsByRunId.set(t.agentRunId, arr);
    }

    for (const { feature, run } of entries) {
      if (!run) continue;
      if (runIdFilter && run.id !== runIdFilter) continue;

      const prev = snapshot.featureCache.get(feature.id);

      if (!prev) {
        // First time seeing this feature — seed the cache; do not emit events
        const completedPhases = new Set<string>();
        for (const t of timingsByRunId.get(run.id) ?? []) {
          if (t.completedAt) completedPhases.add(t.phase);
        }
        snapshot.featureCache.set(feature.id, {
          status: run.status,
          lifecycle: feature.lifecycle,
          completedPhases,
          featureName: feature.name,
          prStatus: feature.pr?.status,
          prMergeable: feature.pr?.mergeable,
          prCiStatus: feature.pr?.ciStatus,
        });
        continue;
      }

      this.checkStatusChange(prev, run, feature, out);
      this.checkCrash(prev, run, feature, out);
      this.checkFeatureNameChange(prev, run, feature, out);
      this.checkLifecycleChange(prev, run, feature, out);
      this.checkPrDataChange(prev, run, feature, out);
      this.checkPhaseCompletions(prev, run, feature, timingsByRunId, out);
    }
  }

  private checkStatusChange(
    prev: FeatureStateSnapshot,
    run: AgentRun,
    feature: Feature,
    out: NotificationEvent[]
  ): void {
    if (prev.status === run.status) return;
    prev.status = run.status;
    const mapping = STATUS_TO_EVENT[run.status];
    if (!mapping) return;
    const phase = resultToPhase(run.result);
    out.push({
      eventType: mapping.eventType,
      agentRunId: run.id,
      featureId: feature.id,
      featureName: feature.name,
      ...(phase && { phaseName: phase }),
      message: `Agent status: ${run.status}`,
      severity: mapping.severity,
      timestamp: new Date(),
    });
  }

  private checkCrash(
    prev: FeatureStateSnapshot,
    run: AgentRun,
    feature: Feature,
    out: NotificationEvent[]
  ): void {
    const isActive = run.status === AgentRunStatus.running || run.status === AgentRunStatus.pending;
    if (!isActive || !run.pid || prev.crashEmitted) return;
    if (this.processMonitor.isProcessAlive(run.pid)) return;

    prev.crashEmitted = true;
    const phase = resultToPhase(run.result);
    out.push({
      eventType: NotificationEventType.AgentFailed,
      agentRunId: run.id,
      featureId: feature.id,
      featureName: feature.name,
      ...(phase && { phaseName: phase }),
      message: `Agent crashed (PID ${run.pid} dead)`,
      severity: NotificationSeverity.Error,
      timestamp: new Date(),
    });
  }

  private checkFeatureNameChange(
    prev: FeatureStateSnapshot,
    run: AgentRun,
    feature: Feature,
    out: NotificationEvent[]
  ): void {
    if (prev.featureName === feature.name) return;
    prev.featureName = feature.name;
    const nodeName = LIFECYCLE_TO_NODE[feature.lifecycle as SdlcLifecycle] ?? 'requirements';
    out.push({
      eventType: NotificationEventType.PhaseCompleted,
      agentRunId: run.id,
      featureId: feature.id,
      featureName: feature.name,
      phaseName: nodeName,
      message: 'Feature metadata updated',
      severity: NotificationSeverity.Info,
      timestamp: new Date(),
    });
  }

  private checkLifecycleChange(
    prev: FeatureStateSnapshot,
    run: AgentRun,
    feature: Feature,
    out: NotificationEvent[]
  ): void {
    if (prev.lifecycle === feature.lifecycle) return;
    const prevLifecycle = prev.lifecycle;
    prev.lifecycle = feature.lifecycle;
    const nodeName = LIFECYCLE_TO_NODE[feature.lifecycle as SdlcLifecycle];

    if (feature.lifecycle === SdlcLifecycle.Review && prevLifecycle !== SdlcLifecycle.Review) {
      const prUrl = feature.pr?.url;
      const message = prUrl ? `Ready for merge review — PR: ${prUrl}` : 'Ready for merge review';
      out.push({
        eventType: NotificationEventType.MergeReviewReady,
        agentRunId: run.id,
        featureId: feature.id,
        featureName: feature.name,
        phaseName: 'merge',
        message,
        severity: NotificationSeverity.Info,
        timestamp: new Date(),
      });
    } else if (nodeName) {
      out.push({
        eventType: NotificationEventType.PhaseCompleted,
        agentRunId: run.id,
        featureId: feature.id,
        featureName: feature.name,
        phaseName: nodeName,
        message: `Entered ${nodeName} phase`,
        severity: NotificationSeverity.Info,
        timestamp: new Date(),
      });
    }
  }

  private checkPrDataChange(
    prev: FeatureStateSnapshot,
    run: AgentRun,
    feature: Feature,
    out: NotificationEvent[]
  ): void {
    const curPrStatus = feature.pr?.status;
    const curMergeable = feature.pr?.mergeable;
    const curCiStatus = feature.pr?.ciStatus;
    if (
      curPrStatus === prev.prStatus &&
      curMergeable === prev.prMergeable &&
      curCiStatus === prev.prCiStatus
    ) {
      return;
    }
    prev.prStatus = curPrStatus;
    prev.prMergeable = curMergeable;
    prev.prCiStatus = curCiStatus;
    const nodeName = LIFECYCLE_TO_NODE[feature.lifecycle as SdlcLifecycle] ?? 'merge';
    out.push({
      eventType: NotificationEventType.PhaseCompleted,
      agentRunId: run.id,
      featureId: feature.id,
      featureName: feature.name,
      phaseName: nodeName,
      message:
        curMergeable === false
          ? `PR #${feature.pr?.number} has merge conflicts`
          : 'PR status updated',
      severity: curMergeable === false ? NotificationSeverity.Warning : NotificationSeverity.Info,
      timestamp: new Date(),
    });
  }

  private checkPhaseCompletions(
    prev: FeatureStateSnapshot,
    run: AgentRun,
    feature: Feature,
    timingsByRunId: Map<string, PhaseTiming[]>,
    out: NotificationEvent[]
  ): void {
    for (const t of timingsByRunId.get(run.id) ?? []) {
      if (t.completedAt && !prev.completedPhases.has(t.phase)) {
        prev.completedPhases.add(t.phase);
        out.push({
          eventType: NotificationEventType.PhaseCompleted,
          agentRunId: run.id,
          featureId: feature.id,
          featureName: feature.name,
          phaseName: t.phase,
          message: `Completed ${t.phase} phase`,
          severity: NotificationSeverity.Info,
          timestamp: new Date(),
        });
      }
    }
  }

  // -------------------------------------------------------------------------
  // Interactive-session event computation
  // -------------------------------------------------------------------------

  private async pollSessionEvents(
    snapshot: AgentEventsSnapshot,
    out: InteractiveSessionEvent[]
  ): Promise<void> {
    const activeSessions = await this.sessionRepo.findAllActive();

    for (const session of activeSessions) {
      const prev = snapshot.sessionCache.get(session.id);
      if (prev?.status !== session.status) {
        snapshot.sessionCache.set(session.id, { status: session.status });
        out.push({
          type: mapSessionStatus(session.status),
          sessionId: session.id,
          featureId: session.featureId,
        });
      }
    }

    // Emit stopped/error events for sessions that disappeared from the active list
    for (const [sessionId, cached] of snapshot.sessionCache) {
      const wasActive =
        cached.status === InteractiveSessionStatus.booting ||
        cached.status === InteractiveSessionStatus.ready;
      if (!wasActive) continue;
      if (activeSessions.find((s) => s.id === sessionId)) continue;

      // Session is no longer active — fetch final status
      const session = await this.sessionRepo.findById(sessionId);
      if (session) {
        snapshot.sessionCache.set(sessionId, { status: session.status });
        out.push({
          type: mapSessionStatus(session.status),
          sessionId: session.id,
          featureId: session.featureId,
        });
      } else {
        snapshot.sessionCache.delete(sessionId);
      }
    }
  }
}
