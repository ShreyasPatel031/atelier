/**
 * GroupDragHandler - Handles group drag with absolute coordinates
 * 
 * ============================================================================
 * ARCHITECTURAL DECISION: NO REACTFLOW PARENT-CHILD SYSTEM
 * See docs/FIGJAM_REFACTOR.md section 0.1
 * ============================================================================
 * 
 * We explicitly DO NOT use ReactFlow's parentId or relative positioning.
 * 
 * Our approach:
 * - ALL nodes use ABSOLUTE coordinates from ViewState
 * - NO parentId is set on any ReactFlow node
 * - Group membership is tracked in Domain graph only
 * - When a group moves, we manually update all children's ViewState positions
 * - This gives us full control over drag behavior
 */

import type { Node, NodeChange } from 'reactflow';
import type { ViewState } from '../viewstate/ViewState';
import type { RawGraph } from '../../components/graph/types/index';
import { emitObstaclesMoved } from '../events/routingEvents';
import { batchUpdateObstaclesAndReroute } from '../../utils/canvas/routingUpdates';

const GRID_SIZE = 16;
const snap = (v: number) => Math.round(v / GRID_SIZE) * GRID_SIZE;

// Track previous positions to calculate delta correctly on first drag
// This is needed because ReactFlow updates node positions before onNodesChange fires
const previousPositions = new Map<string, { x: number; y: number }>();

/**
 * Find a node by ID in the domain graph (recursive)
 */
function findNodeById(graph: RawGraph, nodeId: string): any | null {
  const find = (n: any, targetId: string): any => {
    if (n.id === targetId) return n;
    if (n.children) {
      for (const child of n.children) {
        const result = find(child, targetId);
        if (result) return result;
      }
    }
    return null;
  };
  return find(graph, nodeId);
}

export interface ChildPositionUpdate {
  id: string;
  x: number;
  y: number;
}

export interface GroupDragResult {
  viewStateUpdated: boolean;
  groupId: string;
  newPosition: { x: number; y: number };
  childrenUpdated: string[];
  childPositions: ChildPositionUpdate[]; // NEW: positions for setNodes
}

/**
 * Clear tracked positions when drag ends
 * Call this from onNodeDragStop to reset tracking for next drag
 */
export function clearDragTracking(groupId?: string): void {
  if (groupId) {
    previousPositions.delete(groupId);
  } else {
    previousPositions.clear();
  }
}

/**
 * Initialize tracking for a group before drag starts
 * Call this to ensure first frame of drag has correct delta
 */
export function initializeDragTracking(groupId: string, position: { x: number; y: number }): void {
  previousPositions.set(groupId, { x: snap(position.x), y: snap(position.y) });
}

/**
 * Handle group position changes from ReactFlow onNodesChange
 * 
 * When a group moves:
 * 1. Update the group's position in ViewState
 * 2. Update all children's absolute positions by the same delta
 * 
 * @param changes - ReactFlow node changes
 * @param currentNodes - Current ReactFlow nodes
 * @param viewStateRef - Mutable reference to ViewState
 * @param rawGraphRef - Mutable reference to Domain graph
 * @returns Array of GroupDragResult for each group that was moved
 */
export function handleGroupDrag(
  changes: NodeChange[],
  currentNodes: Node[],
  viewStateRef: { current: ViewState | null },
  rawGraphRef: { current: RawGraph | null }
): GroupDragResult[] {
  const results: GroupDragResult[] = [];
  
  // Debug: Log when called
  console.log(`[handleGroupDrag] Called with ${changes.length} changes`);
  
  // Filter to only position changes that are actively dragging
  const positionChanges = changes.filter(
    (ch): ch is NodeChange & { type: 'position'; id: string; position: { x: number; y: number }; dragging?: boolean } =>
      ch.type === 'position' && 'position' in ch && ch.position !== undefined
  );
  
  console.log(`[handleGroupDrag] ${positionChanges.length} position changes`);
  
  // Track how often this is called (for testing/debugging)
  if (typeof window !== 'undefined' && positionChanges.length > 0) {
    (window as any).__groupDragCounter = ((window as any).__groupDragCounter || 0) + 1;
  }
  
  // Collect routing updates for ALL nodes (including regular nodes during drag)
  const allRoutingUpdates: Array<{ nodeId: string; geometry: { x: number; y: number; w: number; h: number } }> = [];
  
  for (const change of positionChanges) {
    const changedNode = currentNodes.find((n) => n.id === change.id);
    if (!changedNode) continue;
    
    const isGroup = changedNode.type === 'group' || changedNode.type === 'draftGroup';
    
    // Handle regular nodes - update ViewState and collect for routing
    // Process ALL position changes (don't require dragging flag - it may not be set by ReactFlow)
    if (!isGroup && viewStateRef.current) {
      const absoluteX = snap(change.position.x);
      const absoluteY = snap(change.position.y);
      const existingGeom = viewStateRef.current.node?.[changedNode.id];
      
      // Only update if position actually changed (grid-snapped)
      const currentGeom = viewStateRef.current.node?.[changedNode.id];
      if (currentGeom && currentGeom.x === absoluteX && currentGeom.y === absoluteY) {
        continue; // Skip if position didn't change
      }
      
      const geometry = {
        x: absoluteX,
        y: absoluteY,
        w: existingGeom?.w ?? (changedNode.width || 96),
        h: existingGeom?.h ?? (changedNode.height || 96),
      };
      
      if (!viewStateRef.current.node) viewStateRef.current.node = {};
      viewStateRef.current.node[changedNode.id] = geometry;
      
      allRoutingUpdates.push({ nodeId: changedNode.id, geometry });
      continue; // Skip group-specific logic for regular nodes
    }
    
    // Skip non-groups for group-specific logic below
    if (!isGroup) continue;
    
    const existingGeom = viewStateRef.current?.group?.[changedNode.id];
    
    // CRITICAL: Use positionAbsolute from the node (ReactFlow provides this during drag)
    // change.position might be stale or relative
    const nodePosition = (changedNode as any).positionAbsolute || changedNode.position;
    const absoluteX = snap(nodePosition.x);
    const absoluteY = snap(nodePosition.y);
    
    // Calculate delta from previous position
    // CRITICAL: Use our tracked previous position, NOT changedNode.position (which is already updated by ReactFlow)
    let previousX: number;
    let previousY: number;
    
    // Priority order for previous position:
    // 1. Our tracked previous position (most reliable during drag)
    // 2. ViewState geometry (persisted position)
    // 3. Initialize from current position (first frame of first drag)
    const trackedPrevPos = previousPositions.get(changedNode.id);
    
    if (trackedPrevPos) {
      previousX = trackedPrevPos.x;
      previousY = trackedPrevPos.y;
    } else if (existingGeom) {
      previousX = existingGeom.x;
      previousY = existingGeom.y;
    } else {
      // First time seeing this group - initialize with current position
      // Delta will be 0 for this frame, but we'll track position for next frame
      previousX = absoluteX;
      previousY = absoluteY;
    }
    
    const deltaX = absoluteX - previousX;
    const deltaY = absoluteY - previousY;
    
    // Update tracked position for next frame
    previousPositions.set(changedNode.id, { x: absoluteX, y: absoluteY });
    
    const childrenUpdated: string[] = [];
    const childPositions: ChildPositionUpdate[] = [];
    
    // Update group position in ViewState
    if (viewStateRef.current) {
      viewStateRef.current.group[changedNode.id] = {
        x: absoluteX,
        y: absoluteY,
        w: existingGeom?.w ?? (changedNode.data as any)?.width ?? 480,
        h: existingGeom?.h ?? (changedNode.data as any)?.height ?? 320,
      };
      viewStateRef.current.node[changedNode.id] = viewStateRef.current.group[changedNode.id];
      
      // Update children's absolute positions by the same delta
      if ((deltaX !== 0 || deltaY !== 0) && rawGraphRef.current) {
        const groupNode = findNodeById(rawGraphRef.current, changedNode.id);
        
        // Debug: Log for data_services group
        if (changedNode.id === 'data_services') {
          console.log(`[handleGroupDrag:data_services] delta=(${deltaX},${deltaY}), children:`, groupNode?.children?.map((c: any) => c.id));
        }
        
        if (groupNode?.children?.length) {
          for (const child of groupNode.children) {
            const childGeom = viewStateRef.current.node?.[child.id];
            if (childGeom) {
              const newX = childGeom.x + deltaX;
              const newY = childGeom.y + deltaY;
              viewStateRef.current.node[child.id] = {
                ...childGeom,
                x: newX,
                y: newY,
              };
              
              // Debug: Log for cloud_sql
              if (child.id === 'cloud_sql') {
                console.log(`[handleGroupDrag] Updating cloud_sql:`, {
                  oldPos: { x: childGeom.x, y: childGeom.y },
                  delta: { deltaX, deltaY },
                  newPos: { x: newX, y: newY }
                });
              }
              
              childrenUpdated.push(child.id);
              // Collect child positions for ReactFlow update
              childPositions.push({ id: child.id, x: newX, y: newY });
            } else if (child.id === 'cloud_sql') {
              console.log(`[handleGroupDrag] cloud_sql has NO childGeom in ViewState!`);
            }
            
            // Also update nested groups
            if (viewStateRef.current.group?.[child.id]) {
              const newX = viewStateRef.current.group[child.id].x + deltaX;
              const newY = viewStateRef.current.group[child.id].y + deltaY;
              viewStateRef.current.group[child.id] = {
                ...viewStateRef.current.group[child.id],
                x: newX,
                y: newY,
              };
              // Also add to childPositions if not already added
              if (!childPositions.find(p => p.id === child.id)) {
                childPositions.push({ id: child.id, x: newX, y: newY });
              }
            }
          }
        }
      }
      
      results.push({
        viewStateUpdated: true,
        groupId: changedNode.id,
        newPosition: { x: absoluteX, y: absoluteY },
        childrenUpdated,
        childPositions,
      });
    }
  }
  
  // Emit obstacle moved event for edge routing updates
  // Include both group results AND regular node updates
  if (viewStateRef.current) {
    const routingUpdates: Array<{ nodeId: string; geometry: { x: number; y: number; w: number; h: number } }> = [
      ...allRoutingUpdates // Include regular node updates
    ];
    
    for (const result of results) {
      // Add the group itself
      const groupGeom = viewStateRef.current.group?.[result.groupId];
      if (groupGeom) {
        routingUpdates.push({ nodeId: result.groupId, geometry: groupGeom });
      }
      
      // Add all children
      for (const childPos of result.childPositions) {
        const childGeom = viewStateRef.current.node?.[childPos.id] || viewStateRef.current.group?.[childPos.id];
        if (childGeom) {
          routingUpdates.push({ nodeId: childPos.id, geometry: childGeom });
        }
      }
    }
    
    if (routingUpdates.length > 0) {
      // Call routing update directly (for immediate effect)
      batchUpdateObstaclesAndReroute(routingUpdates);
      // Also emit event (for subscribers/future extensibility)
      emitObstaclesMoved(routingUpdates);
      
      // CRITICAL: Emit viewstate-updated event so StepEdge can re-read ViewState
      // This is needed during LOCK→FREE transition when libavoid router isn't ready yet
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('viewstate-updated', { 
          detail: { nodeIds: routingUpdates.map(u => u.nodeId) }
        }));
      }
    }
  }
  
  return results;
}

/**
 * Check if any of the changes are for group nodes
 */
export function hasGroupChanges(changes: NodeChange[], nodes: Node[]): boolean {
  return changes.some((ch) => {
    if (ch.type !== 'position') return false;
    const node = nodes.find((n) => n.id === (ch as any).id);
    return node?.type === 'group' || node?.type === 'draftGroup';
  });
}

/**
 * Handle regular node position changes during drag
 * Updates ViewState and triggers edge routing updates
 * 
 * Call this for ALL position changes, not just groups.
 * Groups will be filtered out (handled by handleGroupDrag).
 */
export function handleNodeDragDuringDrag(
  changes: NodeChange[],
  currentNodes: Node[],
  viewStateRef: { current: ViewState | null }
): void {
  // Filter to only position changes for non-group nodes
  const positionChanges = changes.filter(
    (ch): ch is NodeChange & { type: 'position'; id: string; position: { x: number; y: number }; dragging?: boolean } =>
      ch.type === 'position' && 'position' in ch && ch.position !== undefined && (ch as any).dragging === true
  );
  
  const routingUpdates: Array<{ nodeId: string; geometry: { x: number; y: number; w: number; h: number } }> = [];
  
  for (const change of positionChanges) {
    const changedNode = currentNodes.find((n) => n.id === change.id);
    if (!changedNode) continue;
    
    // Skip groups - they're handled by handleGroupDrag
    const isGroup = changedNode.type === 'group' || changedNode.type === 'draftGroup';
    if (isGroup) continue;
    
    const absoluteX = snap(change.position.x);
    const absoluteY = snap(change.position.y);
    
    // Update ViewState during drag
    if (viewStateRef.current) {
      const existingGeom = viewStateRef.current.node?.[changedNode.id];
      const geometry = {
        x: absoluteX,
        y: absoluteY,
        w: existingGeom?.w ?? (changedNode.width || 96),
        h: existingGeom?.h ?? (changedNode.height || 96),
      };
      
      if (!viewStateRef.current.node) viewStateRef.current.node = {};
      viewStateRef.current.node[changedNode.id] = geometry;
      
      routingUpdates.push({ nodeId: changedNode.id, geometry });
    }
  }
  
  // Emit obstacle moved event for edge routing updates
  if (routingUpdates.length > 0) {
    emitObstaclesMoved(routingUpdates);
  }
}

