/**
 * FREE Mode: Move Node (Reparent) Handler
 * 
 * Flow: Domain.mutate → ViewState.adjust → Render
 * 
 * CRITICAL: This bypasses useElkToReactflowGraphConverter entirely.
 */

import type { EditIntent } from '../../types';
import type { StateRefs } from '../../state/StateRefs';
import { moveNode as domainMoveNode } from '../../../../components/graph/mutations';
import { adjustForReparent } from '../../../viewstate/adjust';

export async function moveNode(intent: EditIntent, refs: StateRefs): Promise<void> {
  const { payload } = intent;
  const { graphStateRef, viewStateRef, renderTriggerRef } = refs;

  if (!graphStateRef.current) {
    throw new Error('[moveNode] Graph state not available');
  }

  const nodeId = payload?.nodeId;
  const newParentId = payload?.newParentId;
  const oldParentId = payload?.oldParentId || 'root';
  
  if (!nodeId) {
    throw new Error('[moveNode] requires nodeId');
  }
  if (!newParentId) {
    throw new Error('[moveNode] requires newParentId');
  }

  // Skip if parent hasn't changed (normalize null to 'root')
  const normalizedOldParent = oldParentId || 'root';
  const normalizedNewParent = newParentId || 'root';
  
  if (normalizedOldParent === normalizedNewParent) {
    return; // Parent unchanged, skip
  }

  // 1. Domain.mutate (reparent node)
  const updatedGraph = domainMoveNode(
    nodeId,
    newParentId,
    graphStateRef.current
  );

  // Update graph state ref (NOT React state for FREE mode)
  graphStateRef.current = updatedGraph;

  // 2. ViewState.adjust (preserve world position)
  const getGroupWorldPos = (groupId: string) => {
    const groupGeom = viewStateRef.current.group?.[groupId];
    return groupGeom ? { x: groupGeom.x, y: groupGeom.y } : undefined;
  };

  viewStateRef.current = adjustForReparent({
    nodeId: payload?.nodeId,
    oldParentId: payload?.oldParentId,
    newParentId: payload?.newParentId,
    viewState: viewStateRef.current,
    getGroupWorldPos
  });

  // 3. Emit render
  if (renderTriggerRef.current) {
    renderTriggerRef.current();
  }
}

