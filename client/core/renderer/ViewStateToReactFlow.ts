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
import type { RawGraph } from '../../components/graph/types/index';
import type { ViewState } from '../viewstate/ViewState';

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

  console.log('[🎯COORD] ViewState → ReactFlow (Universal, ABSOLUTE coords)', {
    domainChildren: domainGraph.children?.length || 0,
    viewStateNodeKeys: Object.keys(viewState.node || {}),
    viewStateGroupKeys: Object.keys(viewState.group || {})
  });

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

    console.log(`[🎯COORD] Converting ${nodeId}: ABSOLUTE (${position.x},${position.y}), size ${geometry.w}×${geometry.h}`);
    
    // Use 'draftGroup' instead of 'group' to avoid ReactFlow's built-in group behavior
    // The built-in 'group' type has special non-draggable behavior we don't want
    const reactFlowNode: Node = {
      id: nodeId,
      type: isGroup ? 'draftGroup' : 'custom',
      position, // ABSOLUTE - never relative
      draggable: true,
      // NO parentId - we handle group membership ourselves
      data: {
        ...domainNode.data,
        width: geometry.w,
        height: geometry.h,
        isGroup, // Pass flag for component to know it's a group
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

  // Process edges
  if (domainGraph.edges?.length > 0) {
    domainGraph.edges.forEach((edge: any, index: number) => {
      const edgeId = edge.id || `edge-${index}`;
      
      // Read waypoints from ViewState if available
      const edgeViewState = viewState.edge?.[edgeId];
      const waypoints = edgeViewState?.waypoints;
      
      const reactFlowEdge: Edge = {
        id: edgeId,
        source: edge.sources?.[0] || edge.source,
        target: edge.targets?.[0] || edge.target,
        type: 'step', // Use 'step' for libavoid routing (StepEdge handles both 'step' and 'smoothstep')
        data: {
          ...edge.data,
          // Pass waypoints from ViewState to edge.data for StepEdge to read
          waypoints: waypoints && waypoints.length >= 2 ? waypoints : undefined,
        },
      };

      edges.push(reactFlowEdge);
    });
  }

  console.log('[🎯COORD] ViewState → ReactFlow result:', {
    nodes: nodes.length,
    edges: edges.length,
    samplePosition: nodes[0]?.position
  });

  return { nodes, edges };
}
