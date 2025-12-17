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

  // Log edges before deletion
  const edgesBefore: any[] = [];
  const collectEdgesBefore = (node: any) => {
    if (node.edges && Array.isArray(node.edges)) {
      edgesBefore.push(...node.edges.map((e: any) => ({ id: e.id, source: e.sources?.[0] || e.source, target: e.targets?.[0] || e.target })));
    }
    if (node.children) {
      node.children.forEach((child: any) => collectEdgesBefore(child));
    }
  };
  if (graphToDelete.edges) edgesBefore.push(...graphToDelete.edges.map((e: any) => ({ id: e.id, source: e.sources?.[0] || e.source, target: e.targets?.[0] || e.target })));
  collectEdgesBefore(graphToDelete);
  console.log('[deleteNode] Edges BEFORE deletion:', edgesBefore.length, edgesBefore.map(e => `${e.id}: ${e.source}→${e.target}`));

  // 1. Domain.mutate (delete node structure)
  const updatedGraph = domainDeleteNode(nodeId, graphToDelete);

  // Log edges after deletion
  const edgesAfter: any[] = [];
  const collectEdgesAfter = (node: any) => {
    if (node.edges && Array.isArray(node.edges)) {
      edgesAfter.push(...node.edges.map((e: any) => ({ id: e.id, source: e.sources?.[0] || e.source, target: e.targets?.[0] || e.target })));
    }
    if (node.children) {
      node.children.forEach((child: any) => collectEdgesAfter(child));
    }
  };
  if (updatedGraph.edges) edgesAfter.push(...updatedGraph.edges.map((e: any) => ({ id: e.id, source: e.sources?.[0] || e.source, target: e.targets?.[0] || e.target })));
  collectEdgesAfter(updatedGraph);
  console.log('[deleteNode] Edges AFTER deletion:', edgesAfter.length, edgesAfter.map(e => `${e.id}: ${e.source}→${e.target}`));
  console.log('[deleteNode] Removed edges:', edgesBefore.filter(eBefore => !edgesAfter.some(eAfter => eAfter.id === eBefore.id)).map(e => `${e.id}: ${e.source}→${e.target}`));

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
      const { nodes, edges } = convertViewStateToReactFlow(clonedGraph, cleanedViewState);
      
      console.log('[deleteNode] ReactFlow edges after render:', edges.length, edges.map(e => `${e.id}: ${e.source}→${e.target}`));

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

