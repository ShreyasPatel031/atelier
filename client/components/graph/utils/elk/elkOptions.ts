/**
 * ELK Layout Options - Grid-Aligned Unit System
 * 
 * All dimensions and spacing are specified in UNITS (integers).
 * After ELK computes layout, all coordinates are multiplied by GRID_SIZE (16px).
 * This ensures all nodes land perfectly on the 16px grid.
 * 
 * Example: nodeNode spacing = 2 units → 2 × 16 = 32px actual spacing
 */

// Import consolidated constants (re-exported for backwards compatibility)
import {
  GRID_SIZE_PX,
  NODE_WIDTH_UNITS,
  NODE_HEIGHT_BASE_UNITS,
  HEIGHT_PER_LINE_UNITS,
  GROUP_FRAME_PADDING_UNITS,
} from '../../../../utils/nodeConstants';

// Grid size in pixels - all ELK output is multiplied by this
export const GRID_SIZE = GRID_SIZE_PX;

// Node dimensions in units (re-exported for backwards compatibility)
export { NODE_WIDTH_UNITS, HEIGHT_PER_LINE_UNITS };

// Legacy export name (NODE_HEIGHT_UNITS -> NODE_HEIGHT_BASE_UNITS)
export const NODE_HEIGHT_UNITS = NODE_HEIGHT_BASE_UNITS;

// Default spacing options (can be overridden by ElkDebugContext)
const DEFAULT_SPACING = {
  spacingEdgeNode: 1,
  spacingNodeNode: 1,
  spacingEdgeEdge: 1,
  spacingEdgeEdgeBetweenLayers: 1,
  spacingNodeNodeBetweenLayers: 1,
  spacingEdgeNodeBetweenLayers: 1,
  // Additional spacing parameters for vertical edge control
  spacingPortPort: 1,
  spacingComponentComponent: 1,
  spacingLabelLabel: 1,
  spacingLabelNode: 1,
  spacingEdgeLabel: 0,
};

// Function to get current spacing options (allows dynamic override)
let getSpacingOptions: () => typeof DEFAULT_SPACING = () => DEFAULT_SPACING;

export function setElkSpacingGetter(getter: () => typeof DEFAULT_SPACING) {
  getSpacingOptions = getter;
}

export function getRootDefaultOptions() {
  const spacing = getSpacingOptions();
  return {
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
      "spacing.edgeNode": spacing.spacingEdgeNode,
      "spacing.nodeNode": spacing.spacingNodeNode,
      "spacing.edgeEdge": spacing.spacingEdgeEdge,
      "spacing.edgeEdgeBetweenLayers": spacing.spacingEdgeEdgeBetweenLayers,
      "spacing.nodeNodeBetweenLayers": spacing.spacingNodeNodeBetweenLayers,
      "spacing.edgeNodeBetweenLayers": spacing.spacingEdgeNodeBetweenLayers,
      // Additional spacing for vertical edge control
      "spacing.portPort": spacing.spacingPortPort,
      "spacing.componentComponent": spacing.spacingComponentComponent,
      "spacing.labelLabel": spacing.spacingLabelLabel,
      "spacing.labelNode": spacing.spacingLabelNode,
      "spacing.edgeLabel": spacing.spacingEdgeLabel,
    }
  };
}

export function getNonRootDefaultOptions() {
  const spacing = getSpacingOptions();
  return {
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
      // Spacing in units - all standardized to 2 units (32px) to match libavoid spacing
      "spacing.edgeNode": spacing.spacingEdgeNode,
      "spacing.nodeNode": spacing.spacingNodeNode,
      "spacing.edgeEdge": spacing.spacingEdgeEdge,
      "spacing.edgeEdgeBetweenLayers": spacing.spacingEdgeEdgeBetweenLayers,
      "spacing.nodeNodeBetweenLayers": spacing.spacingNodeNodeBetweenLayers,
      "spacing.edgeNodeBetweenLayers": spacing.spacingEdgeNodeBetweenLayers,
      // Additional spacing for vertical edge control
      "spacing.portPort": spacing.spacingPortPort,
      "spacing.componentComponent": spacing.spacingComponentComponent,
      "spacing.labelLabel": spacing.spacingLabelLabel,
      "spacing.labelNode": spacing.spacingLabelNode,
      "spacing.edgeLabel": spacing.spacingEdgeLabel,
      // Enable edge label placement
      "edgeLabels.placement": "CENTER",
      "elk.edgeLabels.inline": true,
    }
  };
}

// Legacy exports for backwards compatibility
export const ROOT_DEFAULT_OPTIONS = getRootDefaultOptions();
export const NON_ROOT_DEFAULT_OPTIONS = getNonRootDefaultOptions();

// Frame padding for group/section frames in units (re-exported from consolidated constants)
export const GROUP_FRAME_PADDING = GROUP_FRAME_PADDING_UNITS; // 2 × 16 = 32px 