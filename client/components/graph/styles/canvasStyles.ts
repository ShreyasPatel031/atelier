/**
 * Centralized canvas styling configuration
 * Single source of truth for all ReactFlow canvas colors, sizes, and styles
 */

// Function to get current visual options (allows dynamic override)
let getVisualOptions: (() => {
  groupColor: string;
  groupOpacity: number;
  groupStrokeColor: string;
  nodeColor: string;
  nodeOpacity: number;
  nodeStrokeColor: string;
  edgeColor: string;
  edgeOpacity: number;
}) | null = null;

// Also allow direct setting of values (for testing)
let currentVisualOptions: {
  groupColor: string;
  groupOpacity: number;
  groupStrokeColor: string;
  nodeColor: string;
  nodeOpacity: number;
  nodeStrokeColor: string;
  edgeColor: string;
  edgeOpacity: number;
} | null = null;

export function setVisualOptionsGetter(getter: () => {
  groupColor: string;
  groupOpacity: number;
  nodeColor: string;
  nodeOpacity: number;
  edgeColor: string;
  edgeOpacity: number;
}) {
  getVisualOptions = getter;
  // Also update current options immediately
  try {
    currentVisualOptions = getter();
  } catch (e) {
    // Ignore errors
  }
}

// Allow direct setting for testing
// NOTE: This should only be used for testing. In production, use setVisualOptionsGetter.
export function setVisualOptionsDirect(options: {
  groupColor: string;
  groupOpacity: number;
  groupStrokeColor: string;
  nodeColor: string;
  nodeOpacity: number;
  nodeStrokeColor: string;
  edgeColor: string;
  edgeOpacity: number;
}) {
  // Update currentVisualOptions (used as fallback)
  currentVisualOptions = options;
  
  // Only set getter if one doesn't exist (don't overwrite existing getter from DevPanel)
  // This allows DevPanel's getter (which reads from ref) to take precedence
  if (!getVisualOptions) {
    getVisualOptions = () => options;
  }
  
  // Debug logging in development
  if (process.env.NODE_ENV === 'development') {
    console.log('[canvasStyles] setVisualOptionsDirect called:', options);
  }
}

function getVisualOptionOrDefault<T>(key: string, defaultValue: T): T {
  // Try getter first, then fallback to direct options, then default
  if (getVisualOptions) {
    try {
      const options = getVisualOptions();
      const value = (options as any)[key];
      if (value !== undefined && value !== null) {
        // Debug logging in development
        if (process.env.NODE_ENV === 'development' && key === 'groupColor') {
          console.log(`[canvasStyles] getVisualOptionOrDefault('${key}'):`, value, 'from getter');
        }
        return value;
      }
    } catch (error) {
      console.warn(`[canvasStyles] Error getting visual option '${key}':`, error);
    }
  }
  
  // Fallback to direct options if getter failed
  if (currentVisualOptions) {
    const value = (currentVisualOptions as any)[key];
    if (value !== undefined && value !== null) {
      // Debug logging in development
      if (process.env.NODE_ENV === 'development' && key === 'groupColor') {
        console.log(`[canvasStyles] getVisualOptionOrDefault('${key}'):`, value, 'from currentVisualOptions');
      }
      return value;
    }
  }
  
  // Debug logging in development
  if (process.env.NODE_ENV === 'development' && key === 'groupColor') {
    console.log(`[canvasStyles] getVisualOptionOrDefault('${key}'):`, defaultValue, 'using default');
  }
  
  return defaultValue;
}

// Helper to convert hex + opacity to rgba
function hexToRgba(hex: string, opacity: number): string {
  // Validate hex color format
  if (!hex || !hex.startsWith('#') || hex.length !== 7) {
    console.warn(`[canvasStyles] Invalid hex color: ${hex}, using fallback`);
    hex = '#ffffff'; // Fallback to white
  }
  try {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    if (isNaN(r) || isNaN(g) || isNaN(b)) {
      throw new Error('Invalid hex values');
    }
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  } catch (error) {
    console.warn(`[canvasStyles] Error converting hex to rgba: ${hex}`, error);
    return `rgba(255, 255, 255, ${opacity})`; // Fallback to white
  }
}

// Helper functions to get dynamic styles
function getEdgeDefaultStyle() {
  const edgeColor = getVisualOptionOrDefault('edgeColor', '#D4D4DB');
  const edgeOpacity = getVisualOptionOrDefault('edgeOpacity', 1);
  
  // Debug logging in development
  if (process.env.NODE_ENV === 'development') {
    // Removed console.log to prevent infinite logs
  }
  
  return {
    stroke: edgeColor,
    strokeWidth: 2,
    opacity: edgeOpacity,
  };
}

function getGroupStyle() {
  const groupColor = getVisualOptionOrDefault('groupColor', '#F5F5F5');
  const groupOpacity = getVisualOptionOrDefault('groupOpacity', 0.5);
  const groupStrokeColor = getVisualOptionOrDefault('groupStrokeColor', '#adb5bd');
  const background = hexToRgba(groupColor, groupOpacity);
  
  // Debug logging in development
  if (process.env.NODE_ENV === 'development') {
    console.log('[canvasStyles] getGroupStyle called:', { groupColor, groupOpacity, groupStrokeColor, background });
  }
  
  return {
    background: background,
    border: groupStrokeColor,
  };
}

function getNodeDefaultStyle() {
  const nodeColor = getVisualOptionOrDefault('nodeColor', '#ffffff');
  const nodeOpacity = getVisualOptionOrDefault('nodeOpacity', 1);
  const nodeStrokeColor = getVisualOptionOrDefault('nodeStrokeColor', '#e4e4e4');
  return {
    background: hexToRgba(nodeColor, nodeOpacity),
    border: nodeStrokeColor,
  };
}

// Define CANVAS_STYLES with static properties first
const edgesStatic = {
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
};

const nodesStatic = {
  selected: {
    // Node selection styles can be added here
  },
};

export const CANVAS_STYLES = {
  // Edge styles
  edges: {
    get default() {
      try {
        return getEdgeDefaultStyle();
      } catch (error) {
        console.warn('[canvasStyles] Error getting edge default style, using fallback', error);
        return { stroke: '#bbb', strokeWidth: 2, opacity: 1 };
      }
    },
    selected: edgesStatic.selected,
    connected: edgesStatic.connected,
    marker: edgesStatic.marker,
  },

  // Node styles
  nodes: {
    selected: nodesStatic.selected,
    get group() {
      try {
        return getGroupStyle();
      } catch (error) {
        console.warn('[canvasStyles] Error getting group style, using fallback', error);
        return { background: 'rgba(240, 240, 240, 0.5)', border: '#adb5bd' };
      }
    },
    get default() {
      try {
        return getNodeDefaultStyle();
      } catch (error) {
        console.warn('[canvasStyles] Error getting node default style, using fallback', error);
        return { background: 'white' };
      }
    },
  },

  // Z-index hierarchy (from highest to lowest)
  // 1. Dots (node handles) - always on top (CSS z-index within node)
  // 2. Edge labels - above edges
  // 3. Edges - above nodes so edge paths are visible over node boxes
  // 4. Regular nodes - above groups
  // 5. Groups - lowest layer
  zIndex: {
    // Node dots/handles (highest priority - CSS z-index within node)
    nodeDots: 6000,
    nodeDotsExpanded: 7000,
    nodeDotsHoverArea: 6000,
    // Edge labels (second priority)
    edgeLabels: 5000,
    // Regular nodes (must be above edges so dots render on top)
    nodes: 3000,
    selectedNodes: 3000,
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
};

// Helper functions for dynamic styling
// These must be defined after CANVAS_STYLES to avoid reference errors
export function getEdgeStyle(isSelected: boolean, isConnected: boolean) {
  const defaultStyle = CANVAS_STYLES.edges.default;
  return {
    ...defaultStyle,
    ...(isSelected && CANVAS_STYLES.edges.selected),
    ...(isConnected && {
      stroke: CANVAS_STYLES.edges.connected.stroke,
      strokeWidth: CANVAS_STYLES.edges.connected.strokeWidth,
    }),
  };
}

export function getEdgeZIndex(isSelected: boolean) {
  return isSelected ? CANVAS_STYLES.zIndex.selectedEdges : CANVAS_STYLES.zIndex.edges;
}

// Expose setVisualOptionsDirect to window for testing
if (typeof window !== 'undefined') {
  (window as any).__setVisualOptionsDirect = setVisualOptionsDirect;
}
