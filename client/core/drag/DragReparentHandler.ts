/**
 * Drag Reparent Handler
 * 
 * Isolated module for handling drag-to-reparent logic (moving nodes into/out of groups).
 * This was extracted from InteractiveCanvas.tsx to prevent it from breaking when other parts change.
 * 
 * ============================================================================
 * CRITICAL: BYPASSING ReactFlow Parent-Child System
 * ============================================================================
 * 
 * We explicitly DO NOT rely on ReactFlow's built-in parent-child behavior:
 * - ReactFlow's parentId/relative positioning is unreliable during drags
 * - ReactFlow's coordinate conversion causes jumps and inconsistencies
 * - We handle parent-child relationships ourselves via Domain graph
 * 
 * What we do instead:
 * - Domain Graph: Pure structure, tracks parent-child relationships
 * - ViewState: Stores ABSOLUTE coordinates for ALL nodes (even children)
 * - ReactFlow: We manually set parentId ONLY for visual grouping, but positions are calculated
 * 
 * Architecture:
 * - Domain Graph: Pure structure, no coordinates
 * - ViewState: Stores absolute coordinates and geometry (ALL nodes use absolute)
 * - ReactFlow: parentId is set for visual grouping, but we calculate relative positions ourselves
 * 
 * This handler:
 * 1. Detects when nodes are dragged into/out of groups (using containment detection)
 * 2. Updates domain graph structure (moveNode) - this is the source of truth
 * 3. Preserves absolute coordinates in ViewState (never loses position)
 * 4. Manually calculates and sets ReactFlow relative positions (we control the math)
 * 5. Sets group mode to FREE when user manually positions
 * 
 * See docs/FIGJAM_REFACTOR.md section 0.1 for architectural details
 */

import type { Node, NodeChange } from 'reactflow';
import type { RawGraph } from '../../components/graph/types/index';
import type { ViewState } from '../viewstate/ViewState';
import { moveNode } from '../../components/graph/mutations';
import { findContainingGroup, findFullyContainedNodes } from '../../utils/containmentDetection';
import { setModeInViewState } from '../viewstate/modeHelpers';
import { apply as orchestratorApply } from '../orchestration/Orchestrator';
import { batchUpdateObstaclesAndReroute } from '../../utils/canvas/routingUpdates';

export interface DragReparentResult {
  graphUpdated: boolean;
  updatedGraph: RawGraph | null;
  viewStateUpdated: boolean;
  reparentedNodes: Array<{ nodeId: string; oldParent: string | null; newParent: string }>;
}

interface DragReparentParams {
  movedNodeIds: string[];
  currentNodes: Node[];
  currentGraph: RawGraph;
  viewStateRef: { current: ViewState | undefined };
  setNodes: (updater: (nodes: Node[]) => Node[]) => void;
  setSelectedNodes: (nodes: Node[]) => void;
  setSelectedNodeIds: (ids: string[]) => void;
}

/**
 * Helper to find parent in domain graph
 */
function findParentInGraph(graph: RawGraph, nodeId: string): string | null {
  const findParent = (n: any, targetId: string, parentId: string | null = null): string | null => {
    if (n.id === targetId) return parentId === 'root' ? null : parentId;
    if (n.children) {
      for (const child of n.children) {
        const result = findParent(child, targetId, n.id);
        if (result !== null) return result;
      }
    }
    return null;
  };
  return findParent(graph, nodeId);
}

/**
 * Helper to find node in domain graph
 */
function findNodeInGraph(graph: RawGraph, nodeId: string): any {
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

/**
 * Handle drag reparenting for a single node
 */
function handleNodeReparent(
  node: Node,
  currentNodes: Node[],
  currentGraph: RawGraph,
  viewStateRef: { current: ViewState | undefined },
  setNodes: (updater: (nodes: Node[]) => Node[]) => void,
  setSelectedNodes: (nodes: Node[]) => void,
  setSelectedNodeIds: (ids: string[]) => void,
  updatedGraph: RawGraph
): { graphUpdated: boolean; updatedGraph: RawGraph; reparented: boolean } {
  const nodeId = node.id;
  let graphUpdated = false;
  let reparented = false;

    // Use ReactFlow position during drag (ViewState may be stale)
    const containingGroup = findContainingGroup(node, currentNodes, viewStateRef.current, true);
    const currentParentInGraph = findParentInGraph(updatedGraph, nodeId);
    
    // Normalize parent IDs: null means root
    const normalizedCurrentParent = currentParentInGraph || 'root';
    
    // Determine new parent: if node is fully contained in a group, use that group; otherwise use root
    const newParentId = containingGroup ? containingGroup.id : 'root';
    
    // Check if parent actually changed - skip if same
    if (normalizedCurrentParent === newParentId) {
      return { graphUpdated, updatedGraph, reparented };
    }
    
    // CRITICAL: Verify node exists in domain graph before moving
    const nodeInGraph = findNodeInGraph(updatedGraph, nodeId);
    if (!nodeInGraph) {
      return { graphUpdated, updatedGraph, reparented };
    }
    
    // ============================================================================
    // Route through Orchestrator for FREE mode reparenting
    // This bypasses useElkToReactflowGraphConverter entirely per architecture
    // ============================================================================
    try {
      // Use Orchestrator's move-node action (async but we fire-and-forget)
      orchestratorApply({
        kind: 'free-structural',
        source: 'user',
        payload: {
          action: 'move-node',
          nodeId,
          oldParentId: normalizedCurrentParent,
          newParentId
        }
      }).catch((error: any) => {
        // Only log if it's not a "already contains" error (which means parent is already correct)
        if (!error.message?.includes('already contains')) {
          console.warn(`[DragReparentHandler] Orchestrator move-node failed:`, error);
        }
      });
      
      // Update local graph ref for return value (Orchestrator updates graphStateRef)
      try {
        updatedGraph = moveNode(nodeId, newParentId, updatedGraph);
        graphUpdated = true;
        reparented = true;
      } catch (moveError: any) {
        // If moveNode fails with "already contains", parent is already correct - this is fine
        if (!moveError.message?.includes('already contains')) {
          throw moveError;
        }
        // Otherwise silently skip - parent is already correct
      }
      
      // If node was moved INTO a group (not root), set that group to FREE mode
      if (newParentId !== 'root' && viewStateRef.current) {
        viewStateRef.current = setModeInViewState(viewStateRef.current, newParentId, 'FREE');
      }
      
      // Update selection
      if (containingGroup) {
        setSelectedNodes([containingGroup]);
        setSelectedNodeIds([containingGroup.id]);
      }
    } catch (error: any) {
      // Only log if it's not a "already contains" error (which means parent is already correct)
      if (!error.message?.includes('already contains')) {
        console.warn(`[DragReparentHandler] Failed to move node ${nodeId}:`, error);
      }
    }

  return { graphUpdated, updatedGraph, reparented };
}

/**
 * Handle drag reparenting for a group
 */
function handleGroupReparent(
  group: Node,
  currentNodes: Node[],
  currentGraph: RawGraph,
  viewStateRef: { current: ViewState | undefined },
  setNodes: (updater: (nodes: Node[]) => Node[]) => void,
  setSelectedNodes: (nodes: Node[]) => void,
  setSelectedNodeIds: (ids: string[]) => void,
  updatedGraph: RawGraph
): { graphUpdated: boolean; updatedGraph: RawGraph } {
  const nodeId = group.id;
  let graphUpdated = false;

  // First check if the group itself was moved into another group
  const containingGroup = findContainingGroup(group, currentNodes, viewStateRef.current);
  const currentParentInGraph = findParentInGraph(updatedGraph, nodeId);
  
  // Normalize parent IDs: null means root
  const normalizedCurrentParent = currentParentInGraph || 'root';
  const newParentId = containingGroup ? containingGroup.id : 'root';
  
  // Only move if parent actually changed
  if (normalizedCurrentParent !== newParentId) {
    try {
      updatedGraph = moveNode(nodeId, newParentId, updatedGraph);
      graphUpdated = true;
      
      if (containingGroup) {
        setNodes((nds) =>
          nds.map((n) =>
            n.id === containingGroup.id ? { ...n, selected: true } : { ...n, selected: false }
          )
        );
        setSelectedNodes([containingGroup]);
        setSelectedNodeIds([containingGroup.id]);
      }
    } catch (error: any) {
      // Only log if it's not a "already contains" error
      if (!error.message?.includes('already contains')) {
        console.error(`[DragReparentHandler] Failed to move group ${nodeId}:`, error);
      }
    }
  }
  
  // Find nodes/groups fully contained in this group
  const containedNodes = findFullyContainedNodes(group, currentNodes, viewStateRef.current);
  
  if (containedNodes.length > 0) {
    let movedAny = false;
    
    // Update domain graph: move each contained node/group into the group
    // But SKIP nodes that are ALREADY children of this group
    containedNodes.forEach((containedNode) => {
      // Check if this node is already a child of the group
      const containedNodeParent = findParentInGraph(updatedGraph, containedNode.id);
      if (containedNodeParent === group.id) {
        return; // Skip - already a child
      }
      
      try {
        updatedGraph = moveNode(containedNode.id, group.id, updatedGraph);
        graphUpdated = true;
        movedAny = true;
      } catch (error: any) {
        // Only log if it's not a "already contains" error
        if (!error.message?.includes('already contains')) {
          console.warn(`[DragReparentHandler] Failed to move ${containedNode.id} into group ${group.id}:`, error);
        }
      }
    });
    
    // Set group to FREE mode only if we actually moved nodes
    if (movedAny && viewStateRef.current) {
      viewStateRef.current = setModeInViewState(viewStateRef.current, group.id, 'FREE');
    }
    
    // Select the contained nodes
    setNodes((nds) =>
      nds.map((n) =>
        containedNodes.some(cn => cn.id === n.id) ? { ...n, selected: true } : n
      )
    );
    setSelectedNodes(containedNodes);
    setSelectedNodeIds(containedNodes.map(n => n.id));
  }

  return { graphUpdated, updatedGraph };
}

/**
 * Main handler for drag reparenting
 * Processes all moved nodes and updates domain graph + ViewState accordingly
 * 
 * FLOW:
 * 1. Update ViewState FIRST with current positions (ViewState is source of truth)
 * 2. Check containment using ViewState positions
 * 3. Update domain graph if reparenting needed
 */
export function handleDragReparent(params: DragReparentParams): DragReparentResult {
  const {
    movedNodeIds,
    currentNodes,
    currentGraph,
    viewStateRef,
    setNodes,
    setSelectedNodes,
    setSelectedNodeIds
  } = params;

  if (!currentGraph) {
    console.warn('[DragReparentHandler] No domain graph available for reparenting');
    return {
      graphUpdated: false,
      updatedGraph: null,
      viewStateUpdated: false,
      reparentedNodes: []
    };
  }

  // ============================================================================
  // STEP 1: Update ViewState FIRST with current positions
  // ViewState is the source of truth - always absolute coordinates
  // This ensures containment detection uses the CURRENT position (where user dragged to)
  // ============================================================================
  const GRID_SIZE = 16;
  const snap = (v: number) => Math.round(v / GRID_SIZE) * GRID_SIZE;
  
  if (movedNodeIds.length > 0 && viewStateRef.current) {
    for (const nodeId of movedNodeIds) {
      const node = currentNodes.find(n => n.id === nodeId);
      if (!node) continue;
      
      // ReactFlow position during drag is absolute (we bypass ReactFlow's parent-child system)
      const absoluteX = snap(node.position.x);
      const absoluteY = snap(node.position.y);
      
      const isGroup = node.type === 'group' || node.type === 'draftGroup';
      const existingGeom = isGroup 
        ? viewStateRef.current.group?.[nodeId]
        : viewStateRef.current.node?.[nodeId];
      
      const geometry = {
        x: absoluteX,
        y: absoluteY,
        w: existingGeom?.w ?? 96,
        h: existingGeom?.h ?? 96,
      };
      
      // Update ViewState immediately with current absolute position
      if (isGroup) {
        if (!viewStateRef.current.group) viewStateRef.current.group = {};
        viewStateRef.current.group[nodeId] = geometry;
      } else {
        if (!viewStateRef.current.node) viewStateRef.current.node = {};
        viewStateRef.current.node[nodeId] = geometry;
      }
    }
    
    // ============================================================================
    // CENTRALIZED ROUTING UPDATE (Joint.js pattern)
    // After updating ViewState positions, update obstacles in libavoid router
    // and process ALL routes at once. This ensures ALL affected edges reroute.
    // ============================================================================
    const routingUpdates = movedNodeIds
      .map(nodeId => {
        const node = currentNodes.find(n => n.id === nodeId);
        if (!node) return null;
        const isGroup = node.type === 'group' || node.type === 'draftGroup';
        const geom = isGroup 
          ? viewStateRef.current?.group?.[nodeId]
          : viewStateRef.current?.node?.[nodeId];
        if (!geom) return null;
        return { nodeId, geometry: geom };
      })
      .filter((u): u is { nodeId: string; geometry: { x: number; y: number; w: number; h: number } } => u !== null);
    
    if (routingUpdates.length > 0) {
      batchUpdateObstaclesAndReroute(routingUpdates);
    }
  }

  // ============================================================================
  // STEP 2: Check containment and reparent using ViewState (now current)
  // ============================================================================
  let updatedGraph = structuredClone(currentGraph);
  let graphUpdated = false;
  const reparentedNodes: Array<{ nodeId: string; oldParent: string | null; newParent: string }> = [];

  // Process each moved node
  movedNodeIds.forEach((nodeId) => {
    const node = currentNodes.find(n => n.id === nodeId);
    if (!node) return;
    
    if (node.type === 'group' || node.type === 'draftGroup') {
      // Case 2: Group moved around nodes or other groups
      const result = handleGroupReparent(
        node,
        currentNodes,
        currentGraph,
        viewStateRef,
        setNodes,
        setSelectedNodes,
        setSelectedNodeIds,
        updatedGraph
      );
      graphUpdated = graphUpdated || result.graphUpdated;
      updatedGraph = result.updatedGraph;
    } else {
      // Case 1: Regular node moved into or out of a group
      const result = handleNodeReparent(
        node,
        currentNodes,
        currentGraph,
        viewStateRef,
        setNodes,
        setSelectedNodes,
        setSelectedNodeIds,
        updatedGraph
      );
      
      if (result.reparented) {
        const currentParent = findParentInGraph(currentGraph, nodeId);
        const newParent = findParentInGraph(result.updatedGraph, nodeId);
        reparentedNodes.push({
          nodeId,
          oldParent: currentParent,
          newParent: newParent || 'root'
        });
      }
      
      graphUpdated = graphUpdated || result.graphUpdated;
      updatedGraph = result.updatedGraph;
    }
  });

  return {
    graphUpdated,
    updatedGraph: graphUpdated ? updatedGraph : null,
    viewStateUpdated: graphUpdated,
    reparentedNodes
  };
}

