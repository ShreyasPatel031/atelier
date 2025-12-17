/**
 * Unlock Scope to FREE Handler
 * 
 * When a node or group is moved, unlocks the affected scope (group + descendants) to FREE mode
 * and sets crossing edges (edges that touch the subtree but have LCG outside) to FREE routing.
 */

import type { RawGraph } from '../../../components/graph/types/index';
import type { ViewState } from '../../../viewstate/ViewState';
import { collectDescendantGroupIds, collectDescendantNodeIds, collectTouchingEdges, findLCGForEdge } from './domainUtils';
import { setModeInViewState } from '../../../viewstate/modeHelpers';

/**
 * Unlock a scope (group + all descendants) to FREE mode
 * and set crossing edges to FREE routing
 * 
 * @param scopeGroupId - The group ID to unlock (smallest containing group for node moves, or the moved group itself)
 * @param graph - Domain graph
 * @param viewState - Current ViewState
 * @returns Updated ViewState with modes set to FREE and crossing edges set to FREE routing
 */
export function unlockScopeToFree(
  scopeGroupId: string,
  graph: RawGraph,
  viewState: ViewState
): ViewState {
  // 1. Collect all descendant group IDs (including scopeGroupId itself)
  const subtreeGroupIds = collectDescendantGroupIds(graph, scopeGroupId);
  
  // 2. Collect all descendant node IDs (for edge detection)
  const descendantNodeIds = collectDescendantNodeIds(graph, scopeGroupId);
  const subtreeNodeIds = new Set(descendantNodeIds);
  
  // 3. Set all subtree groups to FREE mode in ViewState
  let updatedViewState = { ...viewState };
  if (!updatedViewState.layout) {
    updatedViewState.layout = {};
  }
  for (const groupId of subtreeGroupIds) {
    updatedViewState.layout[groupId] = { mode: 'FREE' };
  }
  
  // 4. Find all edges that touch the subtree
  const touchingEdges = collectTouchingEdges(graph, subtreeNodeIds);
  
  // 5. Set ALL edges that touch the subtree to FREE routing
  // This includes both internal edges (source and target both in subtree) and crossing edges
  const updatedEdgeViewState = { ...updatedViewState.edge || {} };
  
  // CRITICAL: Read handles from currently rendered ReactFlow edges if available
  // This is the most reliable source since handles are computed during ELK layout
  let reactFlowEdges: Array<{ id: string; sourceHandle?: string; targetHandle?: string }> = [];
  if (typeof window !== 'undefined') {
    try {
      const reactFlowInstance = (window as any).__reactFlowInstance;
      if (reactFlowInstance) {
        reactFlowEdges = reactFlowInstance.getEdges() || [];
      }
    } catch (e) {
      // Silently fail - will fall back to domain graph
    }
  }
  
  for (const edge of touchingEdges) {
    const existingEdgeGeom = updatedEdgeViewState[edge.id] || {};
    
    // CRITICAL: Try multiple sources for handles (priority order):
    // 1. Existing ViewState (if already persisted)
    // 2. ReactFlow edges (currently rendered - most reliable)
    // 3. Domain graph edge.data (if written back by toReactFlow)
    const reactFlowEdge = reactFlowEdges.find(e => e.id === edge.id);
    const sourceHandle = 
      existingEdgeGeom.sourceHandle ||
      reactFlowEdge?.sourceHandle ||
      edge.data?.sourceHandle;
    const targetHandle = 
      existingEdgeGeom.targetHandle ||
      reactFlowEdge?.targetHandle ||
      edge.data?.targetHandle;
    
    // CRITICAL: Preserve ALL existing edge geometry, including waypoints
    // Don't clear waypoints immediately - let them be recalculated on first position update
    // This prevents edges from routing with stale positions during LOCK→FREE transition
    updatedEdgeViewState[edge.id] = {
      ...existingEdgeGeom, // Preserve everything including waypoints
      routingMode: 'FREE' as const,
      // Explicitly set handles if they exist (from any source)
      ...(sourceHandle ? { sourceHandle } : {}),
      ...(targetHandle ? { targetHandle } : {})
    };
  }
  
  // Return updated ViewState with both layout modes and edge overrides
  return {
    ...updatedViewState,
    edge: updatedEdgeViewState
  };
}

