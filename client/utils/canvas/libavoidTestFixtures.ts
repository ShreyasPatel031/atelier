/**
 * Libavoid test fixture utilities
 * Extracted from InteractiveCanvas.tsx to keep it thin
 */

export interface FixtureNode {
  id: string;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface FixtureEdge {
  id: string;
  source: string;
  target: string;
}

/**
 * Calculate correct handle IDs based on node positions
 * For port spacing tests, edges from same source should use same port
 */
function getHandleIdsForFixtureEdge(
  sourceId: string,
  targetId: string,
  scenarioNodes: FixtureNode[]
): { sourceHandle: string | undefined; targetHandle: string | undefined } {
  const src = scenarioNodes.find(n => n.id === sourceId);
  const tgt = scenarioNodes.find(n => n.id === targetId);
  if (!src || !tgt) return { sourceHandle: undefined, targetHandle: undefined };
  
  // Special case: port spacing test - edges from port-source should use same port
  if (sourceId === 'libavoid-port-source') {
    // port-source (224, 656) -> port-middle1/2 (300, 280/360)
    // Both targets are to the RIGHT (dx=76) and ABOVE (dy=-376/-296)
    // For port spacing test, both edges should use the SAME port on source
    // Since both go RIGHT, use RIGHT port on source
    // Targets are to the right, so they receive from LEFT
    return { 
      sourceHandle: 'connector-right-source', 
      targetHandle: 'connector-left-target' 
    };
  }
  
  // Special case: port spacing test - edges to port-target should use right port on sources
  if (targetId === 'libavoid-port-target') {
    // Sources are to the left, use right port on sources, left port on target
    return { 
      sourceHandle: 'connector-right-source', 
      targetHandle: 'connector-left-target' 
    };
  }
  
  const dx = tgt.x - src.x;
  const dy = tgt.y - src.y;
  
  // Determine direction and return handle IDs matching ConnectorDots/NodeHandles naming
  if (Math.abs(dx) > Math.abs(dy)) {
    // Horizontal - use right/left
    return dx >= 0 
      ? { sourceHandle: 'connector-right-source', targetHandle: 'connector-left-target' }
      : { sourceHandle: 'connector-left-source', targetHandle: 'connector-right-target' };
  } else {
    // Vertical - use bottom/top
    return dy >= 0
      ? { sourceHandle: 'connector-bottom-source', targetHandle: 'connector-top-target' }
      : { sourceHandle: 'connector-top-source', targetHandle: 'connector-bottom-target' };
  }
}

/**
 * Create libavoid test fixtures
 * Returns ReactFlow nodes and edges with correct port positions
 */
export function createLibavoidFixtures(options: {
  setNodes: (nodes: any[]) => void;
  setEdges: (edges: any[]) => void;
  viewStateRef: React.MutableRefObject<any>;
}) {
  const { setNodes, setEdges, viewStateRef } = options;
  
  console.log('🧪 Loading libavoid canvas fixtures (15 nodes, 8 edges)...');
  
  // Clear existing state
  viewStateRef.current = { node: {}, group: {}, edge: {} };
  setNodes([]);
  setEdges([]);
  
  // 15 nodes matching BtybA loadLibavoidFixtures
  const scenarioNodes: FixtureNode[] = [
    // Horizontal test: edge routes around h-block
    { id: 'libavoid-h-left', label: 'H-Left', x: 160, y: 200, width: 96, height: 96 },
    { id: 'libavoid-h-block', label: 'H-Block', x: 320, y: 184, width: 96, height: 128 },
    { id: 'libavoid-h-right', label: 'H-Right', x: 500, y: 200, width: 96, height: 96 },
    // Vertical test: edge routes around v-block
    { id: 'libavoid-v-top', label: 'V-Top', x: 640, y: 80, width: 96, height: 96 },
    { id: 'libavoid-v-block', label: 'V-Block', x: 620, y: 216, width: 128, height: 96 },
    { id: 'libavoid-v-bottom', label: 'V-Bottom', x: 640, y: 420, width: 96, height: 96 },
    // Straight line test: no obstacle
    { id: 'libavoid-straight-left', label: 'Straight-L', x: 160, y: 520, width: 96, height: 96 },
    { id: 'libavoid-straight-right', label: 'Straight-R', x: 320, y: 520, width: 96, height: 96 },
    // Diagonal test: edge routes around d-block
    { id: 'libavoid-d-top-left', label: 'Diag-Top', x: 480, y: 520, width: 96, height: 96 },
    { id: 'libavoid-d-block', label: 'Diag-Block', x: 600, y: 600, width: 96, height: 96 },
    { id: 'libavoid-d-bottom-right', label: 'Diag-Bottom', x: 760, y: 760, width: 96, height: 96 },
    // Port spacing test: multiple edges from/to same ports
    { id: 'libavoid-port-source', label: 'Port-Source', x: 224, y: 656, width: 96, height: 96 },
    { id: 'libavoid-port-middle1', label: 'Port-Mid1', x: 300, y: 280, width: 96, height: 96 },
    { id: 'libavoid-port-middle2', label: 'Port-Mid2', x: 300, y: 360, width: 96, height: 96 },
    { id: 'libavoid-port-target', label: 'Port-Target', x: 500, y: 320, width: 96, height: 96 },
  ];

  // 8 edges matching BtybA loadLibavoidFixtures
  const scenarioEdges: FixtureEdge[] = [
    { id: 'edge-horizontal', source: 'libavoid-h-left', target: 'libavoid-h-right' },
    { id: 'edge-vertical', source: 'libavoid-v-top', target: 'libavoid-v-bottom' },
    { id: 'edge-straight', source: 'libavoid-straight-left', target: 'libavoid-straight-right' },
    { id: 'edge-diagonal', source: 'libavoid-d-top-left', target: 'libavoid-d-bottom-right' },
    // Port spacing: two edges FROM same source
    { id: 'edge-port-from-1', source: 'libavoid-port-source', target: 'libavoid-port-middle1' },
    { id: 'edge-port-from-2', source: 'libavoid-port-source', target: 'libavoid-port-middle2' },
    // Port spacing: two edges TO same target
    { id: 'edge-port-to-1', source: 'libavoid-port-middle1', target: 'libavoid-port-target' },
    { id: 'edge-port-to-2', source: 'libavoid-port-middle2', target: 'libavoid-port-target' },
  ];

  // Initialize ViewState with node positions
  scenarioNodes.forEach(node => {
    viewStateRef.current.node[node.id] = {
      x: node.x,
      y: node.y,
      w: node.width,
      h: node.height
    };
  });

  // Create ReactFlow nodes
  const rfNodes = scenarioNodes.map(node => ({
    id: node.id,
    type: 'custom',
    position: { x: node.x, y: node.y },
    positionAbsolute: { x: node.x, y: node.y },
    data: { 
      label: node.label,
      width: node.width,
      height: node.height,
      icon: 'default'
    },
    style: { width: node.width, height: node.height }
  }));

  // Convert nodes to obstacle rectangles for libavoid routing
  const obstacleRects = scenarioNodes.map(node => ({
    id: node.id,
    x: node.x,
    y: node.y,
    width: node.width,
    height: node.height
  }));

  // Create ReactFlow edges with correct port positions
  const rfEdges = scenarioEdges.map(edge => {
    const { sourceHandle, targetHandle } = getHandleIdsForFixtureEdge(
      edge.source,
      edge.target,
      scenarioNodes
    );
    return {
      id: edge.id,
      source: edge.source,
      target: edge.target,
      sourceHandle,
      targetHandle,
      type: 'step',
      data: {
        staticObstacles: obstacleRects,
        staticObstacleIds: scenarioNodes.map(n => n.id),
        rerouteKey: Date.now()
      }
    };
  });

  // Set nodes and edges
  setNodes(rfNodes as any);
  setEdges(rfEdges as any);
  
  // Store fixture edges in a ref for restoration if needed
  const fixtureEdgesRef = { current: rfEdges };
  (window as any).__libavoidFixtureEdges = fixtureEdgesRef;
  
  console.log('🧪 [LIBAVOID] Loaded fixture with', scenarioNodes.length, 'nodes and', scenarioEdges.length, 'edges');
  
  // Fit view to show all nodes after a short delay
  setTimeout(() => {
    const rfInstance = (window as any).__RF__?.['1'];
    if (rfInstance) {
      rfInstance.fitView({ padding: 0.2, duration: 300 });
      console.log('🧪 [LIBAVOID] Fitted view to show all fixtures');
    }
  }, 1000);
}

