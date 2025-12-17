/**
 * Universal ViewState → ReactFlow converter
 * Used by ALL scenarios: FREE mode, AI mode, LOCK mode
 * 
 * Write once, use everywhere - no duplication
 * 
 * ============================================================================
 * ARCHITECTURAL DECISION: NO REACTFLOW PARENT-CHILD SYSTEM
 * ============================================================================
 * We explicitly DO NOT use ReactFlow's parentId or relative positioning.
 * 
 * Reasons:
 * 1. ReactFlow's parent-child coordinate conversion is unreliable during drags
 * 2. Group drag behavior is inconsistent with parentId
 * 3. Reparenting during drag causes coordinate jumps
 * 
 * Our approach:
 * - ALL nodes use ABSOLUTE coordinates from ViewState
 * - NO parentId is set on any ReactFlow node
 * - Group membership is tracked in Domain graph only
 * - When a group moves, we manually update all children's ViewState positions
 * - This gives us full control over drag behavior
 * ============================================================================
 */

import type { Node, Edge } from 'reactflow';
import { MarkerType } from 'reactflow';
import type { RawGraph } from '../../components/graph/types/index';
import type { ViewState } from '../viewstate/ViewState';
import { CANVAS_STYLES } from '../../components/graph/styles/canvasStyles';
import { getEdgeRoutingMode } from '../../utils/edgeRoutingMode';

export interface ReactFlowOutput {
  nodes: Node[];
  edges: Edge[];
}

/**
 * Convert Domain + ViewState → ReactFlow nodes/edges
 * Universal function used by all modes (FREE, AI, LOCK)
 * 
 * CRITICAL: All positions are ABSOLUTE. No parentId. No relative coords.
 * 
 * @param domainGraph - Domain structure (node IDs, hierarchy, data)
 * @param viewState - ViewState geometry (ABSOLUTE positions, sizes)
 * @returns ReactFlow nodes and edges (all with ABSOLUTE positions)
 */
export function convertViewStateToReactFlow(
  domainGraph: RawGraph,
  viewState: ViewState
): ReactFlowOutput {
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  // ViewState → ReactFlow conversion (removed excessive logging)

  // Process all domain nodes - NO parentId, all ABSOLUTE positions
  const processNode = (domainNode: any) => {
    const nodeId = domainNode.id;
    
    // Standard group detection
    const hasChildren = Array.isArray(domainNode.children) && domainNode.children.length > 0;
    const isGroup = 
      domainNode.data?.isGroup === true || 
      hasChildren ||
      (Array.isArray(domainNode.edges) && domainNode.edges.length > 0);

    // Read ABSOLUTE geometry from ViewState
    const geometry = isGroup
      ? viewState.group?.[nodeId]
      : viewState.node?.[nodeId];

    if (!geometry) {
      console.warn(`[🎯COORD] Missing ViewState geometry for ${isGroup ? 'group' : 'node'} "${nodeId}" - skipping`);
      return;
    }

    // ABSOLUTE position - no conversion, no parentId
    const position = { x: geometry.x, y: geometry.y };

    // Node conversion (removed excessive logging)

    // Read mode from ViewState.layout (source of truth) or domain node (fallback)
    // CRITICAL: Always read from ViewState.layout first, it's the source of truth
    const modeFromViewState = viewState.layout?.[nodeId]?.mode;
    const modeFromDomain = domainNode.mode;
    // Prefer ViewState, fallback to domain, default to FREE if neither exists
    const nodeMode = modeFromViewState || modeFromDomain || (isGroup ? 'FREE' : undefined);

    // Extract label from domainNode.labels (ELK format) or domainNode.data.label
    // CRITICAL: Labels are stored in domainNode.labels array in ELK format: [{ text: "Label" }]
    // But ReactFlow expects data.label as a string
    const labelFromLabels = domainNode.labels?.[0]?.text;
    const labelFromData = domainNode.data?.label;
    const nodeLabel = labelFromData || labelFromLabels || (nodeId === 'root' ? '' : nodeId);

    // Use 'draftGroup' instead of 'group' to avoid ReactFlow's built-in group behavior
    // The built-in 'group' type has special non-draggable behavior we don't want
    const reactFlowNode: Node = {
      id: nodeId,
      type: isGroup ? 'draftGroup' : 'custom',
      position, // ABSOLUTE - never relative
      draggable: true,
      zIndex: isGroup ? CANVAS_STYLES.zIndex.groups : CANVAS_STYLES.zIndex.nodes, // Explicit z-index from config
      // NO parentId - we handle group membership ourselves
      data: {
        ...domainNode.data,
        // CRITICAL: Ensure label is always set from labels array or data.label
        // This fixes labels disappearing on refresh
        label: nodeLabel,
        width: geometry.w,
        height: geometry.h,
        isGroup, // Pass flag for component to know it's a group
        // CRITICAL: Pass mode to ReactFlow node data so DraftGroupNode can read it
        // Always include mode for groups (default to FREE if not set)
        mode: nodeMode || (isGroup ? 'FREE' : undefined),
        // Restore port positions from ViewState if they exist
        ...(geometry.ports?.leftHandles && { leftHandles: geometry.ports.leftHandles }),
        ...(geometry.ports?.rightHandles && { rightHandles: geometry.ports.rightHandles }),
        ...(geometry.ports?.topHandles && { topHandles: geometry.ports.topHandles }),
        ...(geometry.ports?.bottomHandles && { bottomHandles: geometry.ports.bottomHandles }),
      },
      style: {
        width: geometry.w,
        height: geometry.h,
      },
    };

    nodes.push(reactFlowNode);

    // Process children recursively (still no parentId passed)
    if (domainNode.children?.length > 0) {
      for (const child of domainNode.children) {
        processNode(child);
      }
    }
  };

  // Process all nodes from root
  if (domainGraph.children?.length > 0) {
    for (const child of domainGraph.children) {
      processNode(child);
    }
  }

  // Collect all edges from the domain graph
  // Edges are stored in node.edges arrays throughout the hierarchy, not just at root level
  const allDomainEdges: any[] = [];
  
  // Helper to recursively collect edges from all nodes
  const collectEdgesFromNode = (node: any) => {
    if (node.edges && Array.isArray(node.edges)) {
      allDomainEdges.push(...node.edges);
    }
    if (node.children) {
      node.children.forEach((child: any) => collectEdgesFromNode(child));
    }
  };
  
  // Check root level edges (if any)
  if (domainGraph.edges && Array.isArray(domainGraph.edges)) {
    allDomainEdges.push(...domainGraph.edges);
  }
  
  // Collect edges from all nodes in the graph
  collectEdgesFromNode(domainGraph);
  
  // Deduplicate edges by ID to prevent React key warnings
  const edgeMap = new Map<string, any>();
  allDomainEdges.forEach((edge: any) => {
    const edgeId = edge.id || `edge-${edge.sources?.[0] || edge.source}-${edge.targets?.[0] || edge.target}`;
    // Only keep the first occurrence of each edge ID
    if (!edgeMap.has(edgeId)) {
      edgeMap.set(edgeId, { ...edge, id: edgeId });
    }
  });
  
  // Process all collected edges (now deduplicated)
  Array.from(edgeMap.values()).forEach((edge: any, index: number) => {
    const edgeId = edge.id;
    const sourceNodeId = edge.sources?.[0] || edge.source;
    const targetNodeId = edge.targets?.[0] || edge.target;
    
    // Read waypoints and handles from ViewState if available (persisted state)
    const edgeViewState = viewState.edge?.[edgeId];
    const waypoints = edgeViewState?.waypoints;
    
    // CRITICAL: Prioritize ViewState handles (persisted) over edge.data handles (Domain layer)
    // ViewState is the source of truth for persisted geometry
    const sourceHandle = edgeViewState?.sourceHandle || edge.data?.sourceHandle;
    const targetHandle = edgeViewState?.targetHandle || edge.data?.targetHandle;
    
    // CRITICAL: Check ViewState edge override first (for crossing edges)
    // If override exists, use it; otherwise infer from LCG group mode
    const routingModeOverride = edgeViewState?.routingMode;
    
    let routingMode: 'FREE' | 'LOCK';
    if (routingModeOverride) {
      // Override exists - use it (typically FREE for crossing edges)
      routingMode = routingModeOverride;
    } else {
      // No override - infer from LCG group mode (standard behavior)
      const routingModeValue = getEdgeRoutingMode(sourceNodeId, targetNodeId, domainGraph, viewState);
      routingMode = routingModeValue === 'ELK' ? 'LOCK' : 'FREE';
    }
    
    // Extract ELK start/end points from waypoints for LOCK mode ONLY
    // ELK waypoints: [startPoint, ...bendPoints, endPoint]
    // CRITICAL: Only use waypoints as ELK coordinates if edge is in LOCK mode
    // FREE mode waypoints are libavoid routes, NOT ELK coordinates!
    const elkStartPoint = (routingMode === 'LOCK' && waypoints && waypoints.length >= 2) ? waypoints[0] : undefined;
    const elkEndPoint = (routingMode === 'LOCK' && waypoints && waypoints.length >= 2) ? waypoints[waypoints.length - 1] : undefined;
    const elkWaypoints = (routingMode === 'LOCK' && waypoints && waypoints.length > 2)
      ? waypoints.slice(1, waypoints.length - 1) // Middle points (bend points)
      : [];
    
    // Get visual debug options for edge type and marker
    // Default to 'step' if visual options not available
    const edgeType = (typeof window !== 'undefined' && (window as any).__visualDebugOptions?.edgeType) || 'step';
    const edgeMarkerType = (typeof window !== 'undefined' && (window as any).__visualDebugOptions?.edgeMarkerType) || 'arrowclosed';
    
    // Convert marker type string to MarkerType enum
    const markerTypeMap: Record<string, any> = {
      'arrow': MarkerType.Arrow,
      'arrowclosed': MarkerType.ArrowClosed,
      'none': undefined,
    };
    const markerType = markerTypeMap[edgeMarkerType];

    const reactFlowEdge: Edge = {
      id: edgeId,
      source: sourceNodeId,
      target: targetNodeId,
      type: edgeType as any, // Use visual debug option or default 'step'
      zIndex: CANVAS_STYLES.zIndex.edges, // Explicit z-index from config (below nodes)
      // CRITICAL: Preserve sourceHandle and targetHandle so edges connect to correct ports
      sourceHandle: sourceHandle,
      targetHandle: targetHandle,
      style: CANVAS_STYLES.edges.default, // This will use visual debug color/opacity
      markerEnd: markerType ? {
        type: markerType,
        width: CANVAS_STYLES.edges.marker.width,
        height: CANVAS_STYLES.edges.marker.height,
        color: CANVAS_STYLES.edges.default.stroke,
      } : undefined,
      data: {
        ...edge.data,
        // CRITICAL: Set routing mode and ELK coordinates for LOCK mode edges
        routingMode: routingMode,
        // For LOCK mode, StepEdge needs elkStartPoint, elkEndPoint, and elkWaypoints
        elkStartPoint: elkStartPoint,
        elkEndPoint: elkEndPoint,
        elkWaypoints: elkWaypoints,
        // Also pass waypoints for FREE mode compatibility
        waypoints: waypoints && waypoints.length >= 2 ? waypoints : undefined,
      },
    };

    edges.push(reactFlowEdge);
  });

  // Conversion complete (removed excessive logging)

  return { nodes, edges };
}
