/**
 * Edge Routing Mode Detection
 * 
 * Determines whether an edge should use ELK routing (LOCK) or libavoid routing (FREE).
 * 
 * Routing is mode-based, not source-based. Diagrams are source-agnostic.
 * - LOCK mode: Uses ELK for layout and edge routing
 * - FREE mode: Uses libavoid for edge routing (manual positioning)
 * 
 * IMPORTANT: The LCG (Lowest Common Group) IS the edge's parent.
 * According to the spec: "every edge object resides in the group LCG({source, target})".
 * So we use the LCG's mode because that's where the edge lives in the domain graph.
 */

import type { RawGraph } from '../components/graph/types';
import type { ViewState } from '../core/viewstate/ViewState';
import { findLCG } from '../components/graph/mutations';
import { getModeFromViewState } from '../core/viewstate/modeHelpers';

export type RoutingMode = 'ELK' | 'libavoid';

/**
 * Determines the routing mode for an edge based on its parent group's mode.
 * 
 * The edge's parent is the LCG (Lowest Common Group) of its source and target nodes.
 * This is where the edge is stored in the domain graph (per spec invariant).
 * 
 * Policy:
 * - If the edge's parent group (LCG) is in 'LOCK' mode, use ELK routing.
 * - Otherwise (parent is 'FREE' or not found), use libavoid routing.
 * 
 * @param sourceNodeId - The ID of the source node.
 * @param targetNodeId - The ID of the target node.
 * @param rawGraph - The current raw graph (domain graph).
 * @param viewState - The current view state (contains mode information).
 * @returns The determined RoutingMode ('ELK' or 'libavoid').
 */
export function getEdgeRoutingMode(
  sourceNodeId: string,
  targetNodeId: string,
  rawGraph: RawGraph | null,
  viewState: ViewState | null
): RoutingMode {
  // If no graph or viewState, default to libavoid (FREE mode)
  if (!rawGraph || !viewState) {
    return 'libavoid';
  }

  // Find the edge's parent group (LCG of source and target)
  // The LCG is where the edge is stored in the domain graph
  const edgeParent = findLCG(rawGraph, [sourceNodeId, targetNodeId]);

  if (edgeParent) {
    // Use the parent group's mode to determine routing
    const parentMode = getModeFromViewState(viewState, edgeParent.id);
    if (parentMode === 'LOCK') {
      return 'ELK';
    }
  }

  // If no parent found, or parent is 'FREE', use libavoid
  return 'libavoid';
}

