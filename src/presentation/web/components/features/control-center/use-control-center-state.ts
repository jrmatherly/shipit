'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import type { Connection, Edge, NodeChange } from '@xyflow/react';
import type { FeatureNodeData } from '@/components/common/feature-node';
import type { RepositoryNodeData } from '@/components/common/repository-node';
import type { CanvasNodeType } from '@/components/features/features-canvas';
import { type LayoutDirection } from '@/lib/layout-with-dagre';
import { createLogger } from '@/lib/logger';

import { mapEventTypeToState } from '@/components/common/feature-node/derive-feature-state';
import { useGraphState, type GraphCallbacks } from '@/hooks/use-graph-state';
import { useSSEEventHandler } from '@/hooks/use-sse-event-handler';
import { useServerActions } from '@/hooks/use-server-actions';
import { useAgentEventsContext } from '@/hooks/agent-events-provider';

const log = createLogger('[Polling]');
const POLL_INTERVAL_MS = 15_000;

export interface ControlCenterState {
  nodes: CanvasNodeType[];
  edges: Edge[];
  onNodesChange: (changes: NodeChange<CanvasNodeType>[]) => void;
  handleConnect: (connection: Connection) => void;
  handleAddRepository: (path: string) => { wasEmpty: boolean; repoPath: string };
  handleLayout: (direction: LayoutDirection) => void;
  handleArchiveFeature: (featureId: string) => void;
  handleDeleteFeature: (
    featureId: string,
    cleanup?: boolean,
    cascadeDelete?: boolean,
    closePr?: boolean
  ) => void;
  handleRetryFeature: (featureId: string) => void;
  handleStartFeature: (featureId: string) => void;
  handleStopFeature: (featureId: string) => void;
  handleUnarchiveFeature: (featureId: string) => void;
  handleDeleteRepository: (repositoryId: string) => Promise<void>;
  createFeatureNode: (
    sourceNodeId: string | null,
    dataOverride?: Partial<FeatureNodeData>,
    edgeType?: string
  ) => string;
  /** Whether archived features are shown on the canvas. */
  showArchived: boolean;
  /** Toggle archived feature visibility. */
  setShowArchived: (show: boolean) => void;
  /** Stable lookup: repositoryPath for a feature node. */
  getFeatureRepositoryPath: (featureNodeId: string) => string | undefined;
  /** Stable lookup: repository data by nodeId. */
  getRepositoryData: (nodeId: string) => RepositoryNodeData | undefined;
  /** Sync callbacks into derived node data (does not trigger re-render). */
  setCallbacks: (callbacks: GraphCallbacks) => void;
}

let nextFeatureId = 0;

export function useControlCenterState(
  initialNodes: CanvasNodeType[],
  initialEdges: Edge[]
): ControlCenterState {
  const router = useRouter();

  // Archive toggle: persists during session, resets on page reload (FR-10)
  const [showArchived, setShowArchived] = useState(false);

  const {
    nodes,
    edges,
    reconcile,
    updateFeature,
    addPendingFeature,
    removeFeature,
    restoreFeature,
    addRepository: addRepositoryToMap,
    removeRepository,
    replaceRepository,
    getFeatureRepositoryPath,
    getRepositoryData,
    getRepoMapSize,
    setCallbacks,
    beginMutation,
    endMutation,
    isMutating,
  } = useGraphState(initialNodes, initialEdges, showArchived);

  // Refs for stable access to latest nodes/edges without callback recreation
  const nodesRef = useRef(nodes);
  const edgesRef = useRef(edges);
  useEffect(() => {
    nodesRef.current = nodes;
    edgesRef.current = edges;
  }, [nodes, edges]);

  // Sync server props into domain Maps when initialNodes/initialEdges change.
  // Keyed by a stable string so we don't re-reconcile on every render.
  const initialNodeKey = useMemo(
    () =>
      initialNodes
        .map((n) => n.id)
        .sort()
        .join(','),
    [initialNodes]
  );
  const initialDataKey = useMemo(
    () =>
      initialNodes
        .filter((n) => n.type === 'featureNode')
        .map((n) => {
          const d = n.data as FeatureNodeData;
          return `${n.id}:${d.state}:${d.lifecycle}`;
        })
        .sort()
        .join(','),
    [initialNodes]
  );

  const prevReconcileKey = useRef('');

  useEffect(() => {
    const key = `${initialNodeKey}|${initialDataKey}`;
    if (key !== prevReconcileKey.current) {
      prevReconcileKey.current = key;
      reconcile(initialNodes, initialEdges);
    }
  }, [initialNodeKey, initialDataKey, initialNodes, initialEdges, reconcile]);

  // Track previous feature states for fallback notifications
  const prevFeatureStatesRef = useRef<Map<string, FeatureNodeData['state']>>(new Map());

  const { events } = useAgentEventsContext();

  useEffect(() => {
    const prevStates = prevFeatureStatesRef.current;
    for (const node of initialNodes) {
      if (node.type !== 'featureNode') continue;
      const data = node.data as FeatureNodeData;
      const prev = prevStates.get(node.id);
      if (prev !== undefined && prev !== data.state) {
        const sseAlreadyCovered = events.some(
          (e) => e.featureId === data.featureId && mapEventTypeToState(e.eventType) === data.state
        );
        if (!sseAlreadyCovered) {
          if (data.state === 'done') {
            toast.success(data.name, { description: 'Feature completed!' });
          } else if (data.state === 'action-required') {
            toast.warning(data.name, {
              description: 'Waiting for your approval',
              action: {
                label: 'Review',
                onClick: () => router.push(`/feature/${data.featureId}`),
              },
            });
          } else if (data.state === 'error') {
            toast.error(data.name, { description: data.errorMessage ?? 'Agent failed' });
          }
        }
      }
      prevStates.set(node.id, data.state);
    }
  }, [initialDataKey, initialNodes, events, router]);

  // SSE event processing: state/lifecycle updates, metadata fetches, approval events.
  // Extracted into useSSEEventHandler for focus.
  useSSEEventHandler({
    nodesRef,
    updateFeature,
    isMutating,
    beginMutation,
    endMutation,
  });

  // --- Polling fallback: catch any SSE events that were missed ---
  useEffect(() => {
    log.debug(`polling enabled (${POLL_INTERVAL_MS}ms interval)`);

    const timer = setInterval(async () => {
      // Skip when tab is hidden — no point polling for a user who isn't looking.
      if (document.hidden) return;
      // Skip fetch entirely while a mutation is in-flight — the response
      // would contain pre-mutation data that reconcile would discard anyway.
      if (isMutating()) return;

      try {
        // Use a plain fetch instead of a server action so the poll
        // doesn't trigger the Next.js "Rendering…" indicator.
        const res = await fetch('/api/graph-data');
        if (!res.ok) throw new Error(`status ${res.status}`);
        const { nodes: freshNodes, edges: freshEdges } = await res.json();
        reconcile(freshNodes, freshEdges);
      } catch {
        log.warn('poll fetch failed — will retry next interval');
      }
    }, POLL_INTERVAL_MS);

    return () => {
      log.debug('polling disabled');
      clearInterval(timer);
    };
  }, [reconcile, isMutating]);

  // Server action handlers: retry, start, stop, archive, unarchive, delete, deleteRepo, addRepo.
  // Extracted into useServerActions for focus.
  const {
    handleRetryFeature,
    handleStartFeature,
    handleStopFeature,
    handleArchiveFeature,
    handleUnarchiveFeature,
    handleDeleteFeature,
    handleDeleteRepository,
    handleLayout,
    handleAddRepository,
  } = useServerActions({
    nodesRef,
    edgesRef,
    updateFeature,
    removeFeature,
    restoreFeature,
    addRepositoryToMap,
    removeRepository,
    replaceRepository,
    getRepositoryData,
    getRepoMapSize,
    reconcile,
    beginMutation,
    endMutation,
  });

  // onNodesChange is a no-op: nodes are derived from domain Maps.
  // Since nodesDraggable=false and elementsSelectable=false, only React Flow's
  // internal replace/dimensions changes come through — we ignore them all.
  const onNodesChange = useCallback((_changes: NodeChange<CanvasNodeType>[]) => {
    // Intentional no-op: domain Maps are the source of truth.
  }, []);

  const handleConnect = useCallback((_connection: Connection) => {
    // Connections are managed via domain operations, not direct edge manipulation.
  }, []);

  const createFeatureNode = useCallback(
    (
      sourceNodeId: string | null,
      dataOverride?: Partial<FeatureNodeData>,
      edgeType?: string
    ): string => {
      // Use real feature ID when available (from server), otherwise temp ID
      const id = dataOverride?.featureId
        ? `feat-${dataOverride.featureId}`
        : `feature-${Date.now()}-${nextFeatureId++}`;
      const newFeatureData: FeatureNodeData = {
        name: dataOverride?.name ?? 'New Feature',
        description: dataOverride?.description ?? 'Describe what this feature does',
        featureId: dataOverride?.featureId ?? `#${id.slice(-4)}`,
        lifecycle: 'requirements',
        state: dataOverride?.state ?? 'running',
        progress: 0,
        repositoryPath: dataOverride?.repositoryPath ?? '',
        branch: dataOverride?.branch ?? '',
      };

      const parentNodeId = edgeType === 'dependencyEdge' && sourceNodeId ? sourceNodeId : undefined;

      addPendingFeature(id, newFeatureData, parentNodeId);

      return id;
    },
    [addPendingFeature]
  );

  return {
    nodes,
    edges,
    onNodesChange,
    handleConnect,
    handleAddRepository,
    handleArchiveFeature,
    handleLayout,
    handleDeleteFeature,
    handleRetryFeature,
    handleStartFeature,
    handleStopFeature,
    handleUnarchiveFeature,
    handleDeleteRepository,
    createFeatureNode,
    showArchived,
    setShowArchived,
    getFeatureRepositoryPath,
    getRepositoryData,
    setCallbacks,
  };
}
