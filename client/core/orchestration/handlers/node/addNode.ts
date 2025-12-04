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

export async function addNode(intent: EditIntent, refs: StateRefs): Promise<void> {
  const { payload } = intent;
  const { graphStateRef, viewStateRef, setNodesRef, setEdgesRef } = refs;

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

  const isGroup = payload?.data?.isGroup;
  const geometry = {
    x,
    y,
    w: payload?.size?.w ?? (isGroup ? 288 : 96),
    h: payload?.size?.h ?? (isGroup ? 192 : 96),
  };

  // Write to appropriate ViewState collection
  if (isGroup) {
    viewStateRef.current.group[nodeId] = geometry;
    viewStateRef.current.node[nodeId] = geometry;
  } else {
    viewStateRef.current.node[nodeId] = geometry;
  }

  // 2. Domain.mutate (add node structure)
  const updatedGraph = domainAddNode(
    nodeId,
    payload?.parentId || 'root',
    graphStateRef.current,
    payload?.data || {}
  );

  // Update graph ref only - do NOT touch React state for FREE mode
  graphStateRef.current = updatedGraph;

  // 3. Clean ViewState to remove stale entries
  const { cleanViewState } = await import('../../../viewstate/ViewStateCleanup');
  const cleanedViewState = cleanViewState(updatedGraph, viewStateRef.current);

  if (!cleanedViewState.node[nodeId]) {
    throw new Error(`[addNode] cleanViewState removed geometry for node ${nodeId}`);
  }

  viewStateRef.current = cleanedViewState;

  // 4. Render directly via setNodesRef/setEdgesRef (bypasses ELK)
  if (setNodesRef.current && setEdgesRef.current) {
    const { convertViewStateToReactFlow } = await import('../../../renderer/ViewStateToReactFlow');
    const { nodes, edges } = convertViewStateToReactFlow(updatedGraph, cleanedViewState);
    setNodesRef.current(nodes);
    setEdgesRef.current(edges);
  }
}

