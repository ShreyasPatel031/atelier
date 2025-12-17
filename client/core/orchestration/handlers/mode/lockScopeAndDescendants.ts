/**
 * Lock Scope and Descendants Handler
 * 
 * When a group is locked (arrange button), locks that group and all descendants to LOCK mode.
 * Clears edge routing overrides for internal edges (edges whose LCG is in the locked subtree),
 * allowing LCG inference to control them. Crossing edges keep their FREE overrides.
 */

import type { RawGraph } from '../../../components/graph/types/index';
import type { ViewState } from '../../../viewstate/ViewState';
import { collectDescendantGroupIds, findLCGForEdge } from './domainUtils';
import { setModeInViewState } from '../../../viewstate/modeHelpers';

/**
 * Lock a scope (group + all descendants) to LOCK mode
 * and clear routing overrides for internal edges
 * 
 * @param scopeGroupId - The group ID to lock
 * @param graph - Domain graph
 * @param viewState - Current ViewState
 * @returns Updated ViewState with modes set to LOCK and internal edge overrides cleared
 */
export function lockScopeAndDescendants(
  scopeGroupId: string,
  graph: RawGraph,
  viewState: ViewState
): ViewState {
  // 1. Collect all descendant group IDs (including scopeGroupId itself)
  const subtreeGroupIds = collectDescendantGroupIds(graph, scopeGroupId);
  const subtreeGroupIdsSet = new Set(subtreeGroupIds);
  console.log(`[lockScopeAndDescendants] Locking scope ${scopeGroupId}, found ${subtreeGroupIds.length} groups to lock:`, subtreeGroupIds);
  
  // 2. Set all subtree groups to LOCK mode in ViewState
  let updatedViewState = { ...viewState };
  if (!updatedViewState.layout) {
    updatedViewState.layout = {};
  }
  for (const groupId of subtreeGroupIds) {
    updatedViewState.layout[groupId] = { mode: 'LOCK' };
    console.log(`[lockScopeAndDescendants] Set group ${groupId} to LOCK mode`);
  }
  
  // 3. For ALL edges with routingMode = 'FREE' override, clear them
  // When locking, we want ELK to control all edge routing via LCG inference
  const updatedEdgeViewState = { ...updatedViewState.edge || {} };
  
  let clearedCount = 0;
  for (const [edgeId, edgeGeom] of Object.entries(updatedEdgeViewState)) {
    if (edgeGeom.routingMode === 'FREE') {
      // Clear the FREE override - delete routingMode property
      const { routingMode, ...edgeGeomWithoutOverride } = edgeGeom;
      updatedEdgeViewState[edgeId] = edgeGeomWithoutOverride;
      clearedCount++;
      console.log(`[lockScopeAndDescendants] Cleared FREE override for edge ${edgeId}`);
    }
  }
  
  console.log(`[lockScopeAndDescendants] Cleared ${clearedCount} FREE edge overrides`);
  
  // Return updated ViewState with both layout modes and edge overrides cleared for internal edges
  return {
    ...updatedViewState,
    edge: updatedEdgeViewState
  };
}

/**
 * Helper to find an edge by ID in the domain graph
 */
function findEdgeInGraph(graph: RawGraph, edgeId: string): any | null {
  const findInNode = (node: any): any => {
    if (node.edges && Array.isArray(node.edges)) {
      for (const edge of node.edges) {
        const foundId = edge.id || `edge-${edge.sources?.[0] || edge.source}-${edge.targets?.[0] || edge.target}`;
        if (foundId === edgeId) {
          return edge;
        }
      }
    }
    if (node.children) {
      for (const child of node.children) {
        const result = findInNode(child);
        if (result) return result;
      }
    }
    return null;
  };
  return findInNode(graph);
}

