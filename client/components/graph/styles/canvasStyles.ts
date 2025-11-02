/**
 * Centralized canvas styling configuration
 * Single source of truth for all ReactFlow canvas colors, sizes, and styles
 */

export const CANVAS_STYLES = {
  // Edge styles
  edges: {
    default: {
      stroke: '#bbb',
      strokeWidth: 2,
      opacity: 1,
    },
    selected: {
      strokeDasharray: '5,5', // Dotted pattern when selected
    },
    connected: {
      stroke: '#0066cc', // Blue when connected to selected nodes
      strokeWidth: 2,
      animated: true,
    },
    marker: {
      color: '#555',
      width: 20,
      height: 20,
    },
  },

  // Node styles
  nodes: {
    selected: {
      // Node selection styles can be added here
    },
    group: {
      background: 'rgba(240, 240, 240, 0.5)',
      border: '#adb5bd',
    },
  },

  // Z-index hierarchy (from highest to lowest)
  // 1. Dots (node handles) - always on top (CSS z-index within node)
  // 2. Edge labels - above edges but below dots
  // 3. Regular nodes - above edges so dots (inside nodes) are visible
  // 4. Edges - above groups so they're visible when connecting nodes
  // 5. Groups - lowest so edges connecting nodes within/across groups are visible
  zIndex: {
    // Node dots/handles (highest priority - CSS z-index within node)
    nodeDots: 6000,
    nodeDotsExpanded: 7000,
    nodeDotsHoverArea: 6000,
    // Edge labels (second priority)
    edgeLabels: 5000,
    // Regular nodes (must be above edges so dots render on top)
    nodes: 4000,
    selectedNodes: 4000,
    // Edges (above groups but below nodes)
    edges: 2000,
    selectedEdges: 2000,
    // Groups (lowest so edges are visible)
    groups: 1000,
  },

  // Canvas background and viewport
  canvas: {
    background: {
      light: 'bg-gray-50',
      dark: 'bg-gray-950',
    },
    zoom: {
      min: 0.2,
      max: 3,
      default: 1,
    },
    viewport: {
      default: { x: 0, y: 0, zoom: 1 },
    },
  },
} as const;

// Helper functions for dynamic styling
export const getEdgeStyle = (isSelected: boolean, isConnected: boolean) => ({
  ...CANVAS_STYLES.edges.default,
  ...(isSelected && CANVAS_STYLES.edges.selected),
  ...(isConnected && {
    stroke: CANVAS_STYLES.edges.connected.stroke,
    strokeWidth: CANVAS_STYLES.edges.connected.strokeWidth,
  }),
});

export const getEdgeZIndex = (isSelected: boolean) => 
  isSelected ? CANVAS_STYLES.zIndex.selectedEdges : CANVAS_STYLES.zIndex.edges;
