export type ViewState = {
  node?: Record<string, NodeGeometry>;
  group?: Record<string, NodeGeometry>;
  edge?: Record<string, EdgeGeometry>;
  layout?: Record<string, { mode?: 'FREE' | 'LOCK' }>;
};

export type EdgeGeometry = {
  waypoints?: Array<{ x: number; y: number }>;
  sourceHandle?: string;  // Port handle ID (e.g., 'right-0-source')
  targetHandle?: string;  // Port handle ID (e.g., 'left-0-target')
  routingMode?: 'FREE' | 'LOCK'; // Overrides LCG-based inference (for crossing edges)
};

export type NodeGeometry = { 
  x: number; 
  y: number; 
  w?: number; 
  h?: number;
  // Port positions - stored as deltas from node top-left corner
  ports?: {
    leftHandles?: number[];   // Y offsets from top
    rightHandles?: number[];  // Y offsets from top
    topHandles?: number[];    // X offsets from left
    bottomHandles?: number[]; // X offsets from left
  };
};

export type Geometry = { x: number; y: number; w?: number; h?: number };

/**
 * Creates an empty ViewState
 */
export function createEmptyViewState(): ViewState {
  return {
    node: {},
    group: {},
    edge: {},
    layout: {},
  };
}
