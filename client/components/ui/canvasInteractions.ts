import type { MutableRefObject } from 'react';
import type { ReactFlowInstance, Node } from 'reactflow';

export function placeNodeOnCanvas(
  e: MouseEvent,
  selectedTool: 'select' | 'box' | 'connector' | 'group',
  reactFlowRef: MutableRefObject<ReactFlowInstance | null>,
  setNodes: (updater: (nodes: Node[]) => Node[]) => void,
  viewStateRef?: MutableRefObject<any>,
  onDone?: (nextTool: 'select' | 'box' | 'connector' | 'group') => void,
) {
  if (selectedTool !== 'box') return;
  const target = e.currentTarget as HTMLDivElement;
  if (!target) return;
  const rf = reactFlowRef.current;
  if (!rf) return;
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

  setNodes((nds) => nds.concat({
    id,
    data: { label: 'Add text', isEditing: false, width: NODE_SIZE, height: NODE_SIZE },
    position: { x: topLeft.x, y: topLeft.y },
    type: 'custom'
  } as unknown as Node));

  try {
    if (viewStateRef && viewStateRef.current) {
      const vs = viewStateRef.current;
      vs.node = vs.node || {};
      vs.node[id] = { x: topLeft.x, y: topLeft.y, w: NODE_SIZE, h: NODE_SIZE };
    }
  } catch {}

  onDone?.('select');
}


