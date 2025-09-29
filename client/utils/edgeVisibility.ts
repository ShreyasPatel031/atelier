
/**
 * Centralized edge visibility utilities
 * Replaces scattered edge styling logic in InteractiveCanvas
 */

import { Edge } from '@reactflow/core';
import { CANVAS_STYLES, getEdgeStyle, getEdgeZIndex } from '../components/graph/styles/canvasStyles';

/**
 * Apply consistent styling to ensure edges are always visible
 * Replaces duplicate edge styling logic throughout InteractiveCanvas
 */
export function ensureEdgeVisibility(
  edges: Edge[], 
  options: {
    isConnectedToSelected?: boolean;
    forceVisible?: boolean;
    customZIndex?: number;
  } = {}
): Edge[] {
  const {
    isConnectedToSelected = false,
    forceVisible = true,
    customZIndex = undefined
  } = options;

  return edges.map(edge => {
    const baseStyle = getEdgeStyle(false, isConnectedToSelected);
    const zIndex = customZIndex ?? getEdgeZIndex(isConnectedToSelected);
    
    return {
      ...edge,
      hidden: forceVisible ? false : edge.hidden,
      style: {
        ...edge.style,
        ...baseStyle,
        opacity: forceVisible ? 1 : edge.style?.opacity ?? 1,
        zIndex,
      },
      zIndex,
      // Set the label from data
      label: edge.data?.labelText || edge.label,
      // Animations for connected edges
      animated: isConnectedToSelected && CANVAS_STYLES.edges.connected.animated,
    };
  });
}

/**
 * When nodes are selected, update edge styling based on connections
 */
export function updateEdgeStylingOnSelection(
  edges: Edge[],
  selectedNodeIds: string[]
): Edge[] {
  return edges.map(edge => {
    // Check if edge connects to selected nodes
    const isConnectedToSelected = selectedNodeIds.includes(edge.source) || 
                                 selectedNodeIds.includes(edge.target);
    
    return {
      ...edge,
      hidden: false, // Always force visibility
      style: {
        ...edge.style,
        ...getEdgeStyle(false, isConnectedToSelected),
        zIndex: getEdgeZIndex(isConnectedToSelected),
      },
      zIndex: getEdgeZIndex(isConnectedToSelected),
      animated: isConnectedToSelected && CANVAS_STYLES.edges.connected.animated,
    };
  });
}

/**
 * When no nodes are selected, ensure all edges are visible with default styling
 */
export function updateEdgeStylingOnDeselection(edges: Edge[]): Edge[] {
  return edges.map(edge => ({
    ...edge,
    hidden: false,
    style: {
      ...edge.style,
      ...getEdgeStyle(false, false),
      zIndex: getEdgeZIndex(false),
    },
    zIndex: getEdgeZIndex(false)
  }));
}
