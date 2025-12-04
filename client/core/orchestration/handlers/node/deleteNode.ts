/**
 * FREE Mode: Delete Node Handler
 * 
 * Flow: Domain.mutate → ViewState.clean → Render
 * 
 * CRITICAL: This bypasses useElkToReactflowGraphConverter entirely.
 */

import type { EditIntent } from '../../types';
import type { StateRefs } from '../../state/StateRefs';
import { deleteNode as domainDeleteNode } from '../../../../components/graph/mutations';
import { findNodeById } from '../../../../components/graph/utils/find';

export async function deleteNode(intent: EditIntent, refs: StateRefs): Promise<void> {
  const { payload } = intent;
  const { graphStateRef, viewStateRef, setNodesRef, setEdgesRef, renderTriggerRef } = refs;

  if (!graphStateRef.current) {
    throw new Error('[deleteNode] Graph state not available');
  }

  const nodeId = payload?.nodeId;
  if (!nodeId) {
    throw new Error('[deleteNode] requires nodeId');
  }

  // CRITICAL: Use the CURRENT graph state
  const currentGraph = graphStateRef.current;
  const graphToDelete = JSON.parse(JSON.stringify(currentGraph));

  console.log('[deleteNode] Using current graph:', {
    nodeId,
    currentGraphChildren: currentGraph?.children?.length || 0,
    targetNodeExists: !!findNodeById(currentGraph, nodeId)
  });

  // 1. Domain.mutate (delete node structure)
  const updatedGraph = domainDeleteNode(nodeId, graphToDelete);

  // 2. Clean up ViewState using cleanViewState to remove ALL stale entries
  const { cleanViewState } = await import('../../../viewstate/ViewStateCleanup');
  const cleanedViewState = cleanViewState(updatedGraph, viewStateRef.current);
  viewStateRef.current = cleanedViewState;

  // 3. Update graph state ref (NOT React state for FREE mode)
  const clonedGraph = JSON.parse(JSON.stringify(updatedGraph));
  clonedGraph.viewState = cleanedViewState;
  graphStateRef.current = clonedGraph;

  // 4. FREE mode: Direct render (bypasses ELK)
  if (setNodesRef.current && setEdgesRef.current) {
    const { convertViewStateToReactFlow } = await import('../../../renderer/ViewStateToReactFlow');
    try {
      const dimensions = { width: 96, height: 96, groupWidth: 200, groupHeight: 150, padding: 16 };
      const { nodes, edges } = convertViewStateToReactFlow(clonedGraph, cleanedViewState, dimensions);

      setNodesRef.current(nodes);
      setEdgesRef.current(edges);

      console.log('[deleteNode] FREE mode rendered directly:', {
        nodeCount: nodes.length,
        domainChildren: clonedGraph?.children?.length || 0,
        viewStateNodes: Object.keys(cleanedViewState.node || {}).length,
      });
    } catch (error) {
      console.error('[deleteNode] FREE mode render failed:', error);
    }
  } else if (renderTriggerRef.current) {
    renderTriggerRef.current();
  }

  // Verify node was actually removed
  const nodeStillInChildren = clonedGraph?.children?.some((c: any) => c.id === nodeId);
  if (nodeStillInChildren) {
    console.error(`❌ [deleteNode] Node ${nodeId} still exists in root children after deletion!`);
  }
}

