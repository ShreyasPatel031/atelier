/**
 * Hook for handling edge routing updates during node drag
 * 
 * This hook listens for node position changes via ReactFlow's store
 * and triggers libavoid routing updates. Routes are written to ViewState,
 * and StepEdge reads from ViewState to render (pure renderer pattern).
 * 
 * This keeps routing logic OUT of StepEdge.tsx, which should only render.
 */

import { useEffect, useRef } from 'react';
import { useStore } from 'reactflow';
import type { ViewState } from '../../core/viewstate/ViewState';

const GRID_SIZE = 16;
const snap = (v: number) => Math.round(v / GRID_SIZE) * GRID_SIZE;

interface UseEdgeRoutingUpdatesProps {
  viewStateRef: { current: ViewState | undefined };
  enabled?: boolean;
}

/**
 * Creates a signature string from node positions for change detection
 * Only changes when nodes cross grid boundaries (not every pixel)
 */
function createPositionSignature(nodes: any[]): string {
  return nodes
    .map(node => {
      const pos = node.positionAbsolute ?? node.position;
      const x = snap(pos?.x ?? 0);
      const y = snap(pos?.y ?? 0);
      return `${node.id}:${x}:${y}`;
    })
    .sort()
    .join('|');
}

export function useEdgeRoutingUpdates({ viewStateRef, enabled = true }: UseEdgeRoutingUpdatesProps) {
  const prevSignatureRef = useRef<string>('');
  
  // Get nodes from ReactFlow store - this updates during drag
  const nodes = useStore((state) => state?.nodes ?? []);
  
  useEffect(() => {
    if (!enabled || nodes.length === 0) return;
    
    const currentSignature = createPositionSignature(nodes);
    
    // Only trigger routing if signature changed (node crossed grid boundary)
    if (currentSignature === prevSignatureRef.current) return;
    
    prevSignatureRef.current = currentSignature;
    
    // Collect position updates for routing
    const positionUpdates: Array<{ nodeId: string; geometry: { x: number; y: number; w: number; h: number } }> = [];
    
    nodes.forEach(node => {
      const pos = node.positionAbsolute ?? node.position;
      const x = snap(pos?.x ?? 0);
      const y = snap(pos?.y ?? 0);
      
      const isGroup = node.type === 'group' || node.type === 'draftGroup';
      const existingGeom = isGroup 
        ? viewStateRef.current?.group?.[node.id]
        : viewStateRef.current?.node?.[node.id];
      
      const geometry = {
        x,
        y,
        w: existingGeom?.w ?? (node.width || 96),
        h: existingGeom?.h ?? (node.height || 96),
      };
      
      // Update ViewState with current position
      if (viewStateRef.current) {
        if (isGroup) {
          if (!viewStateRef.current.group) viewStateRef.current.group = {};
          viewStateRef.current.group[node.id] = geometry;
        } else {
          if (!viewStateRef.current.node) viewStateRef.current.node = {};
          viewStateRef.current.node[node.id] = geometry;
        }
      }
      
      positionUpdates.push({ nodeId: node.id, geometry });
    });
    
    // Trigger routing updates
    if (positionUpdates.length > 0) {
      import('../../utils/canvas/routingUpdates').then(({ batchUpdateObstaclesAndReroute }) => {
        batchUpdateObstaclesAndReroute(positionUpdates);
      });
    }
  }, [nodes, enabled, viewStateRef]);
}




