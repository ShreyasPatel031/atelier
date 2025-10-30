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
  const container = target.getBoundingClientRect();
  const clickPoint = { x: (e as any).clientX - container.left, y: (e as any).clientY - container.top };
  const rf = reactFlowRef.current;
  if (!rf) return;
  const projected = rf.project(clickPoint);
  const id = `user-node-${Date.now()}`;

  setNodes((nds) => nds.concat({
    id,
    data: { label: 'New Node', isEditing: false },
    position: { x: projected.x, y: projected.y },
    type: 'custom'
  } as unknown as Node));

  try {
    if (viewStateRef && viewStateRef.current) {
      const vs = viewStateRef.current;
      vs.node = vs.node || {};
      vs.node[id] = { x: projected.x, y: projected.y, w: 0, h: 0 };
    }
  } catch {}

  onDone?.('select');
}


