/**
 * FREE Mode: Add Node Handler
 * 
 * Flow: ViewState.write → Domain.mutate → ViewState.clean → Render
 * 
 * CRITICAL: This bypasses useElkToReactflowGraphConverter entirely.
 */

import type { EditIntent } from '../../types';
import type { StateRefs } from '../../state/StateRefs';
import { addNode as domainAddNode } from '../../../../components/graph/mutations';
import { createNodeID } from '../../../../types/graph';
import type { RawGraph } from '../../../../components/graph/types/index';

export async function addNode(intent: EditIntent, refs: StateRefs): Promise<void> {
  const { payload } = intent;
  const { graphStateRef, viewStateRef, setNodesRef, setEdgesRef } = refs;

  const nodeId = payload?.nodeId;
  const currentChildrenCount = graphStateRef.current?.children?.length || 0;
  console.log(`[addNode] Handler called for ${nodeId}, current graph has ${currentChildrenCount} children`);

  if (!graphStateRef.current) {
    throw new Error('[addNode] Graph state not available');
  }

  // 1. Write to ViewState FIRST (before domain mutation)
  // Ensure ViewState structure exists
  if (!viewStateRef.current) {
    viewStateRef.current = { node: {}, group: {}, edge: {} };
  }
  if (!viewStateRef.current.node) {
    viewStateRef.current.node = {};
  }
  if (!viewStateRef.current.group) {
    viewStateRef.current.group = {};
  }

  // STRICT: Position MUST be provided for FREE mode - no fallbacks
  const x = payload?.position?.x ?? (payload as any)?.x;
  const y = payload?.position?.y ?? (payload as any)?.y;

  if (x === undefined || y === undefined) {
    throw new Error(`[addNode] requires position (x, y). Got: ${JSON.stringify({ x, y, payload })}`);
  }

  const nodeId = payload?.nodeId;
  if (!nodeId) {
    throw new Error('[addNode] requires nodeId');
  }

  // CRITICAL: The mutation normalizes the nodeId, so we need to use the normalized ID
  // to ensure consistency between domain graph and ViewState
  const normalizedId = createNodeID(nodeId);

  // 2. Domain.mutate FIRST (before ViewState write) to ensure the node exists in domain
  // CRITICAL: Read the CURRENT graph state RIGHT BEFORE mutating
  // This ensures we have the latest state even if multiple handlers are called in quick succession
  if (!graphStateRef.current) {
    throw new Error('[addNode] Graph state ref is null');
  }
  
  // CRITICAL: Read graph state RIGHT BEFORE mutation (not captured earlier)
  // This ensures we always have the latest state, even if handlers run concurrently
  const childrenCountBefore = graphStateRef.current?.children?.length || 0;
  
  let updatedGraph: RawGraph;
  try {
    // Read fresh right before mutation
    const currentGraphState = graphStateRef.current;
    if (!currentGraphState) {
      throw new Error('[addNode] Graph state ref is null before mutation');
    }
    
    updatedGraph = domainAddNode(
      nodeId, // Pass original nodeId, mutation will normalize it
      payload?.parentId || 'root',
      currentGraphState, // Mutation will clone this internally
      payload?.data || {}
    );

    const childrenCountAfter = updatedGraph?.children?.length || 0;
    console.log(`[addNode] Mutation completed, graph now has ${childrenCountAfter} children (expected ${childrenCountBefore + 1})`);
    if (childrenCountAfter !== childrenCountBefore + 1) {
      throw new Error(`[addNode] Mutation failed - expected ${childrenCountBefore + 1} children, got ${childrenCountAfter}`);
    }

    // Update graph ref immediately - do NOT touch React state for FREE mode
    graphStateRef.current = updatedGraph;
    console.log(`[addNode] Updated graphStateRef.current to graph with ${graphStateRef.current?.children?.length || 0} children`);
  } catch (error: any) {
    console.error('[addNode] Domain mutation failed:', error);
    console.error('[addNode] Current graph state:', { 
      childrenCount: currentGraphState?.children?.length || 0,
      children: currentGraphState?.children?.map(c => c.id) || []
    });
    throw new Error(`[addNode] Failed to add node ${nodeId}: ${error.message}`);
  }

  // 1. Write to ViewState AFTER domain mutation (ensures node exists in domain for cleanViewState)
  const isGroup = payload?.data?.isGroup;
  const geometry = {
    x,
    y,
    w: payload?.size?.w ?? (isGroup ? 288 : 96),
    h: payload?.size?.h ?? (isGroup ? 192 : 96),
  };

  // Write to appropriate ViewState collection using normalized ID
  if (isGroup) {
    viewStateRef.current.group[normalizedId] = geometry;
    viewStateRef.current.node[normalizedId] = geometry;
  } else {
    viewStateRef.current.node[normalizedId] = geometry;
  }

  // 3. Clean ViewState to remove stale entries (node should exist in domain now)
  const { cleanViewState } = await import('../../../viewstate/ViewStateCleanup');
  const cleanedViewState = cleanViewState(updatedGraph, viewStateRef.current);

  if (!cleanedViewState.node[normalizedId]) {
    throw new Error(`[addNode] cleanViewState removed geometry for node ${normalizedId}. Domain has ${updatedGraph.children?.length || 0} children.`);
  }

  viewStateRef.current = cleanedViewState;

  // 4. Render directly via setNodesRef/setEdgesRef (bypasses ELK)
  if (setNodesRef.current && setEdgesRef.current) {
    const { convertViewStateToReactFlow } = await import('../../../renderer/ViewStateToReactFlow');
    const { nodes, edges } = convertViewStateToReactFlow(updatedGraph, cleanedViewState);
    
    // Auto-select the newly created node so connector dots appear immediately
    // Set selected: true on new node, selected: false on all others
    // Use normalizedId since that's what's in the domain graph
    const nodesWithSelection = nodes.map(node => 
      node.id === normalizedId ? { ...node, selected: true } : { ...node, selected: false }
    );
    
    setNodesRef.current(nodesWithSelection);
    setEdgesRef.current(edges);
  }
}

