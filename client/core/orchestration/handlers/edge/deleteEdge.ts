/**
 * FREE Mode: Delete Edge Handler
 * 
 * Flow: Domain.mutate → ViewState.clean → Render
 * 
 * CRITICAL: This bypasses useElkToReactflowGraphConverter entirely.
 */

import type { EditIntent } from '../../types';
import type { StateRefs } from '../../state/StateRefs';
import { deleteEdge as domainDeleteEdge } from '../../../../components/graph/mutations';

export async function deleteEdge(intent: EditIntent, refs: StateRefs): Promise<void> {
  const { payload } = intent;
  const { graphStateRef, viewStateRef, setNodesRef, setEdgesRef } = refs;

  if (!graphStateRef.current) {
    throw new Error('[deleteEdge] Graph state not available');
  }

  const edgeId = payload?.edgeId;
  if (!edgeId) {
    throw new Error('[deleteEdge] requires edgeId');
  }

  // CRITICAL: Clone graph first since deleteEdge might mutate in place
  const graphToDelete = JSON.parse(JSON.stringify(graphStateRef.current));

  // 1. Domain.mutate (delete edge structure)
  const updatedGraph = domainDeleteEdge(edgeId, graphToDelete);

  // 2. Clean up ViewState (remove edge waypoints)
  if (viewStateRef.current.edge?.[edgeId]) {
    delete viewStateRef.current.edge[edgeId];
  }

  // Update graph state ref (NOT React state for FREE mode)
  const clonedGraph = JSON.parse(JSON.stringify(updatedGraph));
  graphStateRef.current = clonedGraph;

  // 3. Render directly via setNodesRef/setEdgesRef (bypasses ELK)
  if (setNodesRef.current && setEdgesRef.current) {
    const { convertViewStateToReactFlow } = await import('../../../renderer/ViewStateToReactFlow');
    const { nodes, edges } = convertViewStateToReactFlow(clonedGraph, viewStateRef.current);
    setNodesRef.current(nodes);
    setEdgesRef.current(edges);
  }

  console.log('[deleteEdge] Completed FREE structural delete-edge', {
    edgeId
  });
}

