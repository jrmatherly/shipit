'use client';

/**
 * useServerActions
 *
 * Focused hook: wraps all server actions for the control center with optimistic
 * state updates, mutation guards, and rollback on error.
 *
 * All handlers follow the pattern:
 *   beginMutation → optimistic update → server action → rollback on error → endMutation
 *
 * Extracted from use-control-center-state.ts — see Mutation Paths in
 * src/presentation/web/CLAUDE.md for design rationale.
 */

import { useCallback, useRef, type RefObject } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import type { Edge } from '@xyflow/react';
import type { FeatureNodeData } from '@/components/common/feature-node';
import type { RepositoryNodeData } from '@/components/common/repository-node';
import type { CanvasNodeType } from '@/components/features/features-canvas';
import {
  layoutWithDagre,
  getCanvasLayoutDefaults,
  type LayoutDirection,
} from '@/lib/layout-with-dagre';
import { archiveFeature } from '@/app/actions/archive-feature';
import { deleteFeature } from '@/app/actions/delete-feature';
import { resumeFeature } from '@/app/actions/resume-feature';
import { startFeature } from '@/app/actions/start-feature';
import { stopFeature } from '@/app/actions/stop-feature';
import { unarchiveFeature } from '@/app/actions/unarchive-feature';
import { addRepository } from '@/app/actions/add-repository';
import { deleteRepository } from '@/app/actions/delete-repository';
import { useSoundAction } from '@/hooks/use-sound-action';
import type { FeatureEntry } from '@/lib/derive-graph';

type FeatureDataUpdates = Partial<
  Pick<FeatureNodeData, 'state' | 'lifecycle' | 'name' | 'description'>
>;

export interface UseServerActionsDeps {
  /** Stable ref to the current derived nodes (read during delete/rollback). */
  nodesRef: RefObject<CanvasNodeType[]>;
  /** Stable ref to the current derived edges (read during delete cascade). */
  edgesRef: RefObject<Edge[]>;
  /** Update a feature's data in the domain Maps. */
  updateFeature: (featureNodeId: string, updates: FeatureDataUpdates) => void;
  /** Remove a real feature node from the domain Map. */
  removeFeature: (nodeId: string) => void;
  /** Restore a previously removed feature (rollback). */
  restoreFeature: (nodeId: string, entry: FeatureEntry) => void;
  /** Add a repository node (may use a temp ID initially). */
  addRepositoryToMap: (nodeId: string, data: RepositoryNodeData) => void;
  /** Remove a repository node. */
  removeRepository: (nodeId: string) => void;
  /** Replace a temp repo ID with the real one (atomic). */
  replaceRepository: (tempId: string, realId: string, data: RepositoryNodeData) => void;
  /** Stable lookup: repository data by nodeId. */
  getRepositoryData: (nodeId: string) => RepositoryNodeData | undefined;
  /** Stable lookup: current number of repositories in the domain Map. */
  getRepoMapSize: () => number;
  /** Reconcile domain Maps with fresh layout data. */
  reconcile: (newNodes: CanvasNodeType[], newEdges: Edge[]) => void;
  /** Signal that an optimistic mutation has started. */
  beginMutation: () => void;
  /** Signal that an optimistic mutation has resolved. */
  endMutation: (cooldownMs?: number) => void;
}

export interface UseServerActionsReturn {
  handleRetryFeature: (featureId: string) => void;
  handleStartFeature: (featureId: string) => void;
  handleStopFeature: (featureId: string) => void;
  handleArchiveFeature: (featureId: string) => void;
  handleUnarchiveFeature: (featureId: string) => void;
  handleDeleteFeature: (
    featureId: string,
    cleanup?: boolean,
    cascadeDelete?: boolean,
    closePr?: boolean
  ) => void;
  handleDeleteRepository: (repositoryId: string) => Promise<void>;
  handleLayout: (direction: LayoutDirection) => void;
  handleAddRepository: (path: string) => { wasEmpty: boolean; repoPath: string };
}

/**
 * Returns stable handler functions for all control-center server actions.
 * Each handler performs optimistic UI updates via domain Map mutations and
 * uses the mutation guard to prevent stale reconcile overwrites.
 */
export function useServerActions({
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
}: UseServerActionsDeps): UseServerActionsReturn {
  const router = useRouter();
  const deleteSound = useSoundAction('delete');
  const createSound = useSoundAction('create');

  // Stable counter for temporary repo IDs — incremented each time a new temp repo is created
  const nextRepoTempIdRef = useRef(0);

  const handleRetryFeature = useCallback(
    (featureId: string) => {
      const nodeId = `feat-${featureId}`;
      beginMutation();
      updateFeature(nodeId, { state: 'running' });

      resumeFeature(featureId)
        .then((result) => {
          if (result.error) {
            updateFeature(nodeId, { state: 'error' });
            toast.error(result.error);
          } else {
            toast.success('Feature resumed');
          }
        })
        .catch(() => {
          updateFeature(nodeId, { state: 'error' });
          toast.error('Failed to resume feature');
        })
        .finally(() => endMutation());
    },
    [updateFeature, beginMutation, endMutation]
  );

  const handleStartFeature = useCallback(
    (featureId: string) => {
      const nodeId = `feat-${featureId}`;
      beginMutation();
      updateFeature(nodeId, { state: 'running' });

      startFeature(featureId)
        .then((result) => {
          if (result.error) {
            updateFeature(nodeId, { state: 'pending' });
            toast.error(result.error);
          } else {
            toast.success('Feature started');
          }
        })
        .catch(() => {
          updateFeature(nodeId, { state: 'pending' });
          toast.error('Failed to start feature');
        })
        .finally(() => endMutation());
    },
    [updateFeature, beginMutation, endMutation]
  );

  const handleStopFeature = useCallback(
    (featureId: string) => {
      beginMutation();

      stopFeature(featureId)
        .then((result) => {
          if (result.error) {
            toast.error(result.error);
          } else {
            toast.success('Agent stopped');
          }
        })
        .catch(() => {
          toast.error('Failed to stop agent');
        })
        .finally(() => endMutation());
    },
    [beginMutation, endMutation]
  );

  const handleArchiveFeature = useCallback(
    (featureId: string) => {
      const nodeId = `feat-${featureId}`;
      beginMutation();
      updateFeature(nodeId, { state: 'archived' });

      archiveFeature(featureId)
        .then((result) => {
          if (result.error) {
            updateFeature(nodeId, { state: 'done' });
            toast.error(result.error);
          } else {
            toast.success('Feature archived');
          }
        })
        .catch(() => {
          updateFeature(nodeId, { state: 'done' });
          toast.error('Failed to archive feature');
        })
        .finally(() => endMutation());
    },
    [updateFeature, beginMutation, endMutation]
  );

  const handleUnarchiveFeature = useCallback(
    (featureId: string) => {
      const nodeId = `feat-${featureId}`;
      beginMutation();
      updateFeature(nodeId, { state: 'done' });

      unarchiveFeature(featureId)
        .then((result) => {
          if (result.error) {
            updateFeature(nodeId, { state: 'archived' });
            toast.error(result.error);
          } else {
            toast.success('Feature unarchived');
          }
        })
        .catch(() => {
          updateFeature(nodeId, { state: 'archived' });
          toast.error('Failed to unarchive feature');
        })
        .finally(() => endMutation());
    },
    [updateFeature, beginMutation, endMutation]
  );

  const handleDeleteFeature = useCallback(
    (featureId: string, cleanup?: boolean, cascadeDelete?: boolean, closePr?: boolean) => {
      const nodeId = `feat-${featureId}`;
      const shouldCascade = cascadeDelete === true;

      // Collect all descendant feature node IDs (children, grandchildren, etc.)
      const descendants: string[] = [];
      if (shouldCascade) {
        const queue = [nodeId];
        while (queue.length > 0) {
          const current = queue.shift()!;
          for (const edge of edgesRef.current) {
            if (edge.type === 'dependencyEdge' && edge.source === current) {
              descendants.push(edge.target);
              queue.push(edge.target);
            }
          }
        }
      }

      // Snapshot current states for rollback (parent + descendants)
      const prevStates = new Map<string, FeatureNodeData['state']>();
      for (const nid of [nodeId, ...descendants]) {
        const node = nodesRef.current.find((n) => n.id === nid);
        if (node) {
          prevStates.set(nid, (node.data as FeatureNodeData).state);
        }
      }

      // Optimistic: show "deleting" state on parent (and descendants if cascading)
      beginMutation();
      updateFeature(nodeId, { state: 'deleting' });
      for (const childId of descendants) {
        updateFeature(childId, { state: 'deleting' });
      }
      deleteSound.play();
      router.push('/');

      deleteFeature(featureId, cleanup, cascadeDelete, closePr)
        .then((result) => {
          if (result.error) {
            // Rollback all to previous states
            for (const [nid, prevState] of prevStates) {
              if (prevState) updateFeature(nid, { state: prevState });
            }
            toast.error(result.error);
          } else {
            // Delete succeeded — remove features from the canvas. The polling
            // reconcile would eventually clean them up, but we remove them
            // explicitly so the user sees them disappear promptly.
            removeFeature(nodeId);
            for (const childId of descendants) {
              removeFeature(childId);
            }
          }
        })
        .catch(() => {
          for (const [nid, prevState] of prevStates) {
            if (prevState) updateFeature(nid, { state: prevState });
          }
          toast.error('Failed to delete feature');
        })
        .finally(() => endMutation());
    },
    [
      router,
      deleteSound,
      updateFeature,
      removeFeature,
      beginMutation,
      endMutation,
      nodesRef,
      edgesRef,
    ]
  );

  const handleDeleteRepository = useCallback(
    async (repositoryId: string) => {
      const repoNodeId = `repo-${repositoryId}`;

      // Find children of this repo via edges
      const childFeatureIds = new Set(
        edgesRef.current.filter((e) => e.source === repoNodeId).map((e) => e.target)
      );

      // Snapshot for rollback
      const prevRepoData = getRepositoryData(repoNodeId);
      const childSnapshots = new Map<string, FeatureEntry>();
      for (const childId of childFeatureIds) {
        const childNode = nodesRef.current.find((n) => n.id === childId);
        if (childNode) {
          childSnapshots.set(childId, { nodeId: childId, data: childNode.data as FeatureNodeData });
        }
      }

      const rollback = () => {
        if (prevRepoData) addRepositoryToMap(repoNodeId, prevRepoData);
        for (const [childId, entry] of childSnapshots) {
          restoreFeature(childId, entry);
        }
      };

      // Optimistic: remove repo + children
      beginMutation();
      removeRepository(repoNodeId);
      for (const childId of childFeatureIds) {
        removeFeature(childId);
      }

      try {
        const result = await deleteRepository(repositoryId);
        if (!result.success) {
          toast.error(result.error ?? 'Failed to remove repository');
          rollback();
          return;
        }
        deleteSound.play();
      } catch {
        toast.error('Failed to remove repository');
        rollback();
      } finally {
        endMutation();
      }
    },
    [
      deleteSound,
      removeRepository,
      removeFeature,
      addRepositoryToMap,
      restoreFeature,
      getRepositoryData,
      beginMutation,
      endMutation,
      nodesRef,
      edgesRef,
    ]
  );

  const handleLayout = useCallback(
    (direction: LayoutDirection) => {
      // Layout is applied via reconcile on next server prop update.
      // For immediate re-layout, apply dagre and trigger a reconcile-like update.
      const result = layoutWithDagre(nodesRef.current, edgesRef.current, {
        ...getCanvasLayoutDefaults(),
        direction,
      });
      reconcile(result.nodes, result.edges);
    },
    [reconcile, nodesRef, edgesRef]
  );

  const handleAddRepository = useCallback(
    (path: string): { wasEmpty: boolean; repoPath: string } => {
      const wasEmpty = getRepoMapSize() === 0;
      const tempId = `repo-temp-${++nextRepoTempIdRef.current}`;
      const repoName =
        path
          .replace(/[\\/]+$/, '')
          .split(/[\\/]/)
          .pop() ?? path;

      beginMutation();
      addRepositoryToMap(tempId, {
        name: repoName,
        repositoryPath: path,
        id: tempId,
        createdAt: Date.now(),
        gitInfoStatus: 'loading',
      });

      addRepository({ path, name: repoName })
        .then((result) => {
          if (result.error) {
            removeRepository(tempId);
            toast.error(result.error);
            return;
          }
          const repo = result.repository!;
          const realId = `repo-${repo.id}`;
          replaceRepository(tempId, realId, {
            name: repo.name,
            repositoryPath: repo.path,
            id: repo.id,
            createdAt:
              repo.createdAt instanceof Date ? repo.createdAt.getTime() : Number(repo.createdAt),
          });
          createSound.play();
        })
        .catch(() => {
          removeRepository(tempId);
          toast.error('Failed to add repository');
        })
        .finally(() => endMutation());

      return { wasEmpty, repoPath: path };
    },
    [
      addRepositoryToMap,
      removeRepository,
      replaceRepository,
      createSound,
      getRepoMapSize,
      beginMutation,
      endMutation,
    ]
  );

  return {
    handleRetryFeature,
    handleStartFeature,
    handleStopFeature,
    handleArchiveFeature,
    handleUnarchiveFeature,
    handleDeleteFeature,
    handleDeleteRepository,
    handleLayout,
    handleAddRepository,
  };
}
