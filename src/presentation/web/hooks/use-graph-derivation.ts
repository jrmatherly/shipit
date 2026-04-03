'use client';

/**
 * useGraphDerivation
 *
 * Focused hook: takes pre-derived graph nodes/edges from deriveGraph() and
 * applies dagre layout with position caching. Topology-only re-runs dagre;
 * data-only changes reuse cached positions.
 *
 * Extracted from use-graph-state.ts — see Graph State Architecture in
 * src/presentation/web/CLAUDE.md for design rationale.
 */

import { useMemo, useRef } from 'react';
import type { Edge, Position } from '@xyflow/react';
import type { CanvasNodeType } from '@/components/features/features-canvas';
import { layoutWithDagre, type LayoutOptions } from '@/lib/layout-with-dagre';

interface DerivedGraph {
  nodes: CanvasNodeType[];
  edges: Edge[];
}

export interface UseGraphDerivationReturn {
  nodes: CanvasNodeType[];
  edges: Edge[];
}

/**
 * Apply dagre layout to a pre-derived graph, caching positions so dagre only
 * re-runs when topology (node IDs or edge connections) actually changes.
 *
 * On topology change the new layout is anchored to the first surviving node's
 * previous position so the graph doesn't drift when nodes are added/removed.
 */
export function useGraphDerivation(
  derived: DerivedGraph,
  layoutDefaults: LayoutOptions
): UseGraphDerivationReturn {
  const layoutCacheRef = useRef<{
    key: string;
    positions: Map<
      string,
      { position: { x: number; y: number }; targetPosition: Position; sourcePosition: Position }
    >;
  }>({ key: '', positions: new Map() });

  return useMemo(() => {
    const nodeIds = derived.nodes
      .map((n) => n.id)
      .sort()
      .join(',');
    const edgeKeys = derived.edges
      .map((e) => `${e.source}-${e.target}`)
      .sort()
      .join(',');
    const topologyKey = `${nodeIds}|${edgeKeys}|${layoutDefaults.direction}`;

    if (topologyKey !== layoutCacheRef.current.key) {
      // Topology changed — re-run dagre
      const result = layoutWithDagre(derived.nodes, derived.edges, layoutDefaults);
      const positions = new Map<
        string,
        { position: { x: number; y: number }; targetPosition: Position; sourcePosition: Position }
      >();
      for (const node of result.nodes) {
        positions.set(node.id, {
          position: node.position,
          targetPosition: (node as Record<string, unknown>).targetPosition as Position,
          sourcePosition: (node as Record<string, unknown>).sourcePosition as Position,
        });
      }

      // Anchor new layout to previous positions so the graph doesn't drift.
      // Find the first surviving node (exists in both old and new layouts) and
      // shift the entire new layout by the delta between its old and new position.
      const prevPositions = layoutCacheRef.current.positions;
      if (prevPositions.size > 0) {
        let dx = 0;
        let dy = 0;
        for (const [id, newPos] of positions) {
          const oldPos = prevPositions.get(id);
          if (oldPos) {
            dx = oldPos.position.x - newPos.position.x;
            dy = oldPos.position.y - newPos.position.y;
            break;
          }
        }
        if (dx !== 0 || dy !== 0) {
          for (const pos of positions.values()) {
            pos.position = { x: pos.position.x + dx, y: pos.position.y + dy };
          }
          for (const node of result.nodes) {
            node.position = { x: node.position.x + dx, y: node.position.y + dy };
          }
        }
      }

      layoutCacheRef.current = { key: topologyKey, positions };
      return result;
    }

    // Data-only change — apply cached positions without re-running dagre
    const { positions } = layoutCacheRef.current;
    const nodes = derived.nodes.map((node) => {
      const cached = positions.get(node.id);
      return cached ? { ...node, ...cached } : node;
    });
    return { nodes, edges: derived.edges };
  }, [derived, layoutDefaults]);
}
