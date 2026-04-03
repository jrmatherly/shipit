'use client';

/**
 * useSSEEventHandler
 *
 * Focused hook: processes SSE agent events and updates the graph state.
 * Handles state/lifecycle updates, metadata fetches, and the feature-approved
 * optimistic update event.
 *
 * Extracted from use-control-center-state.ts — see SSE Architecture in
 * src/presentation/web/CLAUDE.md for design rationale.
 */

import { useEffect, useRef, type RefObject } from 'react';
import type { CanvasNodeType } from '@/components/features/features-canvas';
import type { FeatureNodeData } from '@/components/common/feature-node';
import { getFeatureMetadata } from '@/app/actions/get-feature-metadata';
import { useAgentEventsContext } from '@/hooks/agent-events-provider';
import { resolveSseEventUpdates } from '@/components/common/feature-node/derive-feature-state';

/** Must match the message string emitted by the SSE route in agent-events/route.ts */
const METADATA_UPDATED_MESSAGE = 'Feature metadata updated';

type FeatureDataUpdates = Partial<
  Pick<FeatureNodeData, 'state' | 'lifecycle' | 'name' | 'description'>
>;

export interface UseSSEEventHandlerDeps {
  /** Current derived nodes (used to read feature state before applying SSE updates). */
  nodesRef: RefObject<CanvasNodeType[]>;
  /** Update a feature's state/lifecycle/name in the domain Maps. */
  updateFeature: (featureNodeId: string, updates: FeatureDataUpdates) => void;
  /** Whether a mutation is currently in-flight. */
  isMutating: () => boolean;
  /** Signal that an optimistic mutation has started. */
  beginMutation: () => void;
  /** Signal that an optimistic mutation has resolved. */
  endMutation: (cooldownMs?: number) => void;
}

/**
 * Processes incoming SSE agent events and applies state/lifecycle/metadata
 * updates to the graph domain Maps. Also handles the `shipit-ai:feature-approved`
 * custom DOM event for optimistic approval state.
 */
export function useSSEEventHandler({
  nodesRef,
  updateFeature,
  isMutating,
  beginMutation,
  endMutation,
}: UseSSEEventHandlerDeps): void {
  const { events } = useAgentEventsContext();

  // SSE effect: only state + lifecycle updates
  const processedEventCountRef = useRef(0);

  useEffect(() => {
    // Clamp cursor if events were pruned
    if (processedEventCountRef.current > events.length) {
      processedEventCountRef.current = 0;
    }
    if (events.length <= processedEventCountRef.current) return;
    const newEvents = events.slice(processedEventCountRef.current);
    processedEventCountRef.current = events.length;

    for (const { featureId, state, lifecycle } of resolveSseEventUpdates(newEvents)) {
      if (state !== undefined || lifecycle !== undefined) {
        const nodeId = `feat-${featureId}`;
        const existingNode = nodesRef.current.find((n) => n.id === nodeId);
        const existingState = existingNode
          ? (existingNode.data as FeatureNodeData).state
          : undefined;

        // Skip SSE updates for features in 'deleting' state — the optimistic
        // delete state must not be overwritten by stale SSE events (e.g. agent
        // cancellation emitting AgentFailed during the soft-delete window).
        if (existingState === 'deleting') continue;

        // Skip SSE error events during mutation cooldown — after approve/reject
        // the agent may still report AgentFailed from the previous run before
        // the resume kicks in. The optimistic 'running' state must not be
        // overwritten by stale error events during this transition window.
        if (state === 'error' && isMutating() && existingState === 'running') continue;

        updateFeature(nodeId, {
          ...(state !== undefined && { state }),
          ...(lifecycle !== undefined && { lifecycle }),
        });
      }
    }
  }, [events, updateFeature, isMutating, nodesRef]);

  // Listen for optimistic approval/rejection events from the drawer (fires before SSE arrives).
  // Uses beginMutation + endMutation to prevent stale poll/reconcile data from overwriting
  // the optimistic 'running' state during the transition window (avoids brief "Something went wrong" flash).
  useEffect(() => {
    const handler = (e: Event) => {
      const { featureId } = (e as CustomEvent<{ featureId: string }>).detail;
      beginMutation();
      updateFeature(`feat-${featureId}`, { state: 'running' });
      endMutation();
    };
    window.addEventListener('shipit-ai:feature-approved', handler);
    return () => window.removeEventListener('shipit-ai:feature-approved', handler);
  }, [updateFeature, beginMutation, endMutation]);

  // Separate effect: fetch metadata (name + description) when SSE reports it changed
  const metadataFetchedRef = useRef<Set<string>>(new Set());
  const processedMetadataCountRef = useRef(0);

  useEffect(() => {
    // Clamp cursor if events were pruned
    if (processedMetadataCountRef.current > events.length) {
      processedMetadataCountRef.current = 0;
    }
    if (events.length <= processedMetadataCountRef.current) return;
    const newEvents = events.slice(processedMetadataCountRef.current);
    processedMetadataCountRef.current = events.length;

    for (const event of newEvents) {
      if (event.message !== METADATA_UPDATED_MESSAGE) continue;
      if (metadataFetchedRef.current.has(event.featureId)) continue;
      metadataFetchedRef.current.add(event.featureId);

      const nodeId = `feat-${event.featureId}`;
      getFeatureMetadata(event.featureId)
        .then((meta) => {
          if (meta) {
            updateFeature(nodeId, { name: meta.name, description: meta.description });
          }
        })
        .catch(() => {
          // Silent: metadata fetch failure is non-critical
        });
    }
  }, [events, updateFeature]);
}
