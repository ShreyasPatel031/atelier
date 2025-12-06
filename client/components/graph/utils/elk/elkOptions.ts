/**
 * ELK Layout Options - Grid-Aligned Unit System
 * 
 * All dimensions and spacing are specified in UNITS (integers).
 * After ELK computes layout, all coordinates are multiplied by GRID_SIZE (16px).
 * This ensures all nodes land perfectly on the 16px grid.
 * 
 * Example: nodeNode spacing = 2 units → 2 × 16 = 32px actual spacing
 */

// Grid size in pixels - all ELK output is multiplied by this
export const GRID_SIZE = 16;

// Node dimensions in units
export const NODE_WIDTH_UNITS = 6;  // 6 × 16 = 96px
export const NODE_HEIGHT_UNITS = 6; // 6 × 16 = 96px (base height for 1 line)
export const HEIGHT_PER_LINE_UNITS = 1; // Each additional line adds 1 unit (16px)

export const ROOT_DEFAULT_OPTIONS = {
  layoutOptions: {
    "algorithm": "layered",
    "elk.direction": "RIGHT",
    "hierarchyHandling": "INCLUDE_CHILDREN",
    "elk.layered.nodePlacement.strategy": "NETWORK_SIMPLEX",
    "elk.layered.considerModelOrder": true,
    "elk.layered.considerModelOrder.strategy": "NODES_AND_EDGES",
    "elk.layered.nodePlacement.favorStraightEdges": true,
    "elk.layered.cycleBreaking.strategy": "INTERACTIVE",
    // Spacing in units (will be multiplied by GRID_SIZE after ELK)
    "spacing.edgeNode": 2,      // 2 × 16 = 32px
    "spacing.nodeNode": 2,      // 2 × 16 = 32px
    "spacing.edgeEdge": 2,      // 2 × 16 = 32px
    "spacing.edgeEdgeBetweenLayers": 2,  // 2 × 16 = 32px
    "spacing.nodeNodeBetweenLayers": 2,  // 2 × 16 = 32px
    "spacing.edgeNodeBetweenLayers": 2,  // 2 × 16 = 32px
  }
};

export const NON_ROOT_DEFAULT_OPTIONS = {
  width: NODE_WIDTH_UNITS,    // 6 units → 96px after scaling
  height: NODE_HEIGHT_UNITS,  // 6 units → 96px after scaling (base)
  layoutOptions: {
    "nodeLabels.placement": "INSIDE V_TOP H_LEFT",
    "algorithm": "layered",
    "elk.direction": "RIGHT",
    // Padding in units: [top=4, left=2, bottom=2, right=2]
    "elk.padding": "[top=4.0,left=2.0,bottom=2.0,right=2.0]",
    "elk.layered.nodePlacement.favorStraightEdges": true,
    "elk.layered.priority.shortness": 100, 
    // Enable orthogonal edge routing (routes edges around nodes)
    "elk.edgeRouting": "ORTHOGONAL",
    // Spacing in units
    "spacing.edgeNode": 2,      // 2 × 16 = 32px
    "spacing.nodeNode": 2,      // 2 × 16 = 32px
    "spacing.edgeEdge": 1,      // 1 × 16 = 16px
    "spacing.edgeEdgeBetweenLayers": 3,  // 3 × 16 = 48px
    "spacing.nodeNodeBetweenLayers": 3,  // 3 × 16 = 48px
    "spacing.edgeNodeBetweenLayers": 3,  // 3 × 16 = 48px
    // Enable edge label placement
    "edgeLabels.placement": "CENTER",
    "elk.edgeLabels.inline": true,
  }
};

// Frame padding for group/section frames in units
export const GROUP_FRAME_PADDING = 2; // 2 × 16 = 32px 