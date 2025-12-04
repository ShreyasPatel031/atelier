import type { MutableRefObject } from 'react';
import type { ReactFlowInstance } from 'reactflow';

export function placeNodeOnCanvas(
  e: MouseEvent,
  selectedTool: 'select' | 'box' | 'connector' | 'group',
  reactFlowRef: MutableRefObject<ReactFlowInstance | null>,
  handleAddNode: (nodeName: string, parentId: string, data?: { label?: string; icon?: string; style?: any }) => void,
  viewStateRef?: MutableRefObject<any>,
  onDone?: (nextTool: 'select' | 'box' | 'connector' | 'group') => void,
  parentId?: string | null,
  applyOrchestrator?: (intent: any) => Promise<any>,
) {
  console.log('[placeNodeOnCanvas] Called with:', { 
    selectedTool, 
    hasReactFlowRef: !!reactFlowRef?.current, 
    hasHandleAddNode: typeof handleAddNode,
    hasEvent: !!e,
    eventType: e?.type,
    clientX: (e as any)?.clientX,
    clientY: (e as any)?.clientY
  });
  
  if (selectedTool !== 'box') {
    console.log('[placeNodeOnCanvas] Skipping - not box tool');
    return;
  }
  // Don't require target - we can use clientX/clientY directly
  const rf = reactFlowRef.current;
  if (!rf) {
    console.log('[placeNodeOnCanvas] Skipping - no ReactFlow instance');
    return;
  }
  
  // Check if we have coordinates
  if (typeof (e as any)?.clientX !== 'number' || typeof (e as any)?.clientY !== 'number') {
    console.log('[placeNodeOnCanvas] Skipping - no client coordinates');
    return;
  }
  const projected = (rf as any).screenToFlowPosition
    ? (rf as any).screenToFlowPosition({ x: (e as any).clientX, y: (e as any).clientY })
    : rf.project({ x: (e as any).clientX, y: (e as any).clientY });
  const snap = (v: number) => Math.round(v / 16) * 16; // match canvas grid
  // Snap cursor in world space as the node center
  const snappedCenter = { x: snap(projected.x), y: snap(projected.y) };
  const NODE_SIZE = 96; // align to 16px grid
  const half = NODE_SIZE / 2;
  const topLeft = { x: snappedCenter.x - half, y: snappedCenter.y - half };
  const id = `user-node-${Date.now()}`;

  // Use Orchestrator if provided (proper FREE mode architecture)
  if (applyOrchestrator) {
    console.log('[placeNodeOnCanvas] Using Orchestrator:', { id, parentId: parentId || 'root', position: topLeft });
    applyOrchestrator({
      source: 'user',
      kind: 'free-structural',
      scopeId: parentId || 'root',
      payload: {
        action: 'add-node',
        nodeId: id,
        parentId: parentId || 'root',
        position: { x: topLeft.x, y: topLeft.y },
        size: { w: NODE_SIZE, h: NODE_SIZE },
        data: {
          label: '',  // Empty label for "Add text" placeholder
        }
      }
    }).catch(error => {
      console.error('[placeNodeOnCanvas] Orchestrator failed:', error);
      throw error; // No fallback - fail loudly
    });
  } else {
    // Fallback to old method (should not be used in FREE mode)
    console.warn('[placeNodeOnCanvas] Using handleAddNode fallback - this should not happen in FREE mode');
    handleAddNode(id, parentId || 'root', {
      label: '',  // Empty label for "Add text" placeholder
    });
    
    // Write position to ViewState manually (fallback)
    if (!viewStateRef || !viewStateRef.current) {
      throw new Error('[placeNodeOnCanvas] viewStateRef required when not using Orchestrator');
    }
    const vs = viewStateRef.current;
    vs.node = vs.node || {};
    vs.node[id] = { x: topLeft.x, y: topLeft.y, w: NODE_SIZE, h: NODE_SIZE };
  }

  // Auto-switch to select tool after creating a node so user can interact with it
  onDone?.('select');
}


