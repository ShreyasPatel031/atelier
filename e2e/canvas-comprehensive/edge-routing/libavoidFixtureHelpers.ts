/**
 * Helper utilities for libavoid test fixtures
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
export function getHandleIdsForFixtureEdge(
  sourceId: string,
  targetId: string,
  scenarioNodes: FixtureNode[]
): { sourceHandle: string | undefined; targetHandle: string | undefined } {
  const src = scenarioNodes.find(n => n.id === sourceId);
  const tgt = scenarioNodes.find(n => n.id === targetId);
  if (!src || !tgt) return { sourceHandle: undefined, targetHandle: undefined };
  
  // HANDLE IDs must match ConnectorDots.tsx pattern: connector-{position}-{type}
  // e.g., 'connector-right-source', 'connector-left-target'
  
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
  
  // Determine direction and return handle IDs matching ConnectorDots.tsx naming
  // Pattern: connector-{position}-{type}
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

