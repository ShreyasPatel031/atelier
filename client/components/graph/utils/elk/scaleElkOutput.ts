/**
 * Scale ELK Output by Grid Size
 * 
 * ELK computes layout in UNITS (small integers).
 * This function multiplies ALL coordinates by GRID_SIZE to get pixel values.
 * 
 * This ensures all node positions land on the 16px grid,
 * and edges connect to the correct positions.
 */

import { GRID_SIZE } from "./elkOptions";

/**
 * Recursively scale all coordinates in an ELK layout by GRID_SIZE.
 * 
 * Scales:
 * - Node positions (x, y)
 * - Node dimensions (width, height)
 * - Edge sections (startPoint, endPoint, bendPoints)
 * - Labels (x, y)
 * 
 * @param elkNode - The ELK layout graph (after elk.layout())
 * @returns The same graph with all coordinates multiplied by GRID_SIZE
 */
export function scaleElkOutput(elkNode: any): any {
  if (!elkNode) return elkNode;
  
  // Debug specific nodes - show positions AND dimensions
  if (elkNode.id === 'cloud_storage' || elkNode.id === 'bigquery') {
    console.log(`[📐 scaleElkOutput] ${elkNode.id} BEFORE scale (UNITS):`, {
      x: elkNode.x,
      y: elkNode.y,
      width: elkNode.width,
      height: elkNode.height
    });
  }
  
  // Scale this node's position and dimensions
  const scaled: any = {
    ...elkNode,
    x: elkNode.x != null ? elkNode.x * GRID_SIZE : elkNode.x,
    y: elkNode.y != null ? elkNode.y * GRID_SIZE : elkNode.y,
    width: elkNode.width != null ? elkNode.width * GRID_SIZE : elkNode.width,
    height: elkNode.height != null ? elkNode.height * GRID_SIZE : elkNode.height,
  };
  
  // Debug specific nodes after scaling
  if (elkNode.id === 'cloud_storage' || elkNode.id === 'bigquery') {
    const xAligned = scaled.x % 16 === 0;
    const yAligned = scaled.y % 16 === 0;
    const wAligned = scaled.width % 16 === 0;
    const hAligned = scaled.height % 16 === 0;
    console.log(`[📐 scaleElkOutput] ${elkNode.id} AFTER scale (PIXELS):`, {
      x: scaled.x,
      y: scaled.y,
      width: scaled.width,
      height: scaled.height,
      gridAligned: (xAligned && yAligned && wAligned && hAligned) 
        ? '✅ ALL ALIGNED' 
        : `❌ x:${xAligned?'✓':'✗'} y:${yAligned?'✓':'✗'} w:${wAligned?'✓':'✗'} h:${hAligned?'✓':'✗'}`
    });
  }
  
  // Scale labels
  if (elkNode.labels && Array.isArray(elkNode.labels)) {
    scaled.labels = elkNode.labels.map((label: any) => ({
      ...label,
      x: label.x != null ? label.x * GRID_SIZE : label.x,
      y: label.y != null ? label.y * GRID_SIZE : label.y,
      width: label.width != null ? label.width * GRID_SIZE : label.width,
      height: label.height != null ? label.height * GRID_SIZE : label.height,
    }));
  }
  
  // Scale edges
  if (elkNode.edges && Array.isArray(elkNode.edges)) {
    scaled.edges = elkNode.edges.map((edge: any) => {
      const scaledEdge: any = { ...edge };
      
      // Scale edge sections
      if (edge.sections && Array.isArray(edge.sections)) {
        scaledEdge.sections = edge.sections.map((section: any) => ({
          ...section,
          startPoint: section.startPoint ? {
            x: section.startPoint.x * GRID_SIZE,
            y: section.startPoint.y * GRID_SIZE,
          } : section.startPoint,
          endPoint: section.endPoint ? {
            x: section.endPoint.x * GRID_SIZE,
            y: section.endPoint.y * GRID_SIZE,
          } : section.endPoint,
          bendPoints: section.bendPoints ? section.bendPoints.map((bp: any) => ({
            x: bp.x * GRID_SIZE,
            y: bp.y * GRID_SIZE,
          })) : section.bendPoints,
        }));
      }
      
      // Scale edge labels
      if (edge.labels && Array.isArray(edge.labels)) {
        scaledEdge.labels = edge.labels.map((label: any) => ({
          ...label,
          x: label.x != null ? label.x * GRID_SIZE : label.x,
          y: label.y != null ? label.y * GRID_SIZE : label.y,
          width: label.width != null ? label.width * GRID_SIZE : label.width,
          height: label.height != null ? label.height * GRID_SIZE : label.height,
        }));
      }
      
      return scaledEdge;
    });
  }
  
  // Recursively scale children
  if (elkNode.children && Array.isArray(elkNode.children)) {
    scaled.children = elkNode.children.map((child: any) => scaleElkOutput(child));
  }
  
  return scaled;
}

/**
 * Debug helper: log coordinates before and after scaling
 */
export function logScalingDiff(before: any, after: any, nodeId: string = 'root') {
  console.log(`[📐 SCALE] Node ${nodeId}:`, {
    before: { x: before.x, y: before.y, w: before.width, h: before.height },
    after: { x: after.x, y: after.y, w: after.width, h: after.height },
    factor: GRID_SIZE,
  });
}

