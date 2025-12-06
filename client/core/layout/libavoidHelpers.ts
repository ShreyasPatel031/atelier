/**
 * libavoidHelpers.ts
 * 
 * Helper functions for libavoid routing, extracted from StepEdge.tsx
 * These can be used by LibavoidRoutingService for the callback-based pattern.
 */

import { Position } from 'reactflow';

export type Point = { x: number; y: number };
export type NodeRect = { id: string; x: number; y: number; width: number; height: number };

export const DEFAULT_NODE_WIDTH = 96;
export const DEFAULT_NODE_HEIGHT = 96;
export const DEFAULT_OBSTACLE_MARGIN = 32;
export const GRID_SIZE = 16;

/**
 * Safe number helper - ensures value is finite, falls back to default
 */
export const safeNumber = (value: unknown, fallback: number): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback;

/**
 * Snap value to grid
 */
export const snapToGrid = (value: number): number =>
  Math.round(value / GRID_SIZE) * GRID_SIZE;

/**
 * Convert Position enum to libavoid direction flag
 */
export function positionToFlag(avoidModule: any, position: Position): number {
  switch (position) {
    case Position.Top:
      return avoidModule.ConnDirUp ?? 1;
    case Position.Bottom:
      return avoidModule.ConnDirDown ?? 2;
    case Position.Left:
      return avoidModule.ConnDirLeft ?? 4;
    case Position.Right:
      return avoidModule.ConnDirRight ?? 8;
    default:
      return avoidModule.ConnDirRight ?? 8;
  }
}

/**
 * Get direction flag from delta (used when no explicit position)
 */
export function getConnDirFlag(avoidModule: any, dx: number, dy: number): number {
  if (Math.abs(dx) >= Math.abs(dy)) {
    return dx >= 0 
      ? (avoidModule.ConnDirRight ?? 8) 
      : (avoidModule.ConnDirLeft ?? 4);
  } else {
    return dy >= 0 
      ? (avoidModule.ConnDirDown ?? 2) 
      : (avoidModule.ConnDirUp ?? 1);
  }
}

/**
 * Convert waypoints to SVG path string
 */
export function waypointsToPath(waypoints: Point[]): string {
  if (!waypoints || waypoints.length < 2) {
    return '';
  }
  
  const parts = waypoints.map((pt, i) => {
    const cmd = i === 0 ? 'M' : 'L';
    return `${cmd} ${pt.x} ${pt.y}`;
  });
  
  return parts.join(' ');
}

/**
 * Extract waypoints from libavoid route
 */
export function extractWaypointsFromRoute(route: any): Point[] {
  const waypoints: Point[] = [];
  
  if (!route || typeof route.size !== 'function') {
    return waypoints;
  }
  
  const size = route.size();
  for (let i = 0; i < size; i++) {
    const pt = route.get_ps?.(i);
    if (pt && typeof pt.x === 'number' && typeof pt.y === 'number') {
      waypoints.push({
        x: Math.round(pt.x * 100) / 100,
        y: Math.round(pt.y * 100) / 100
      });
    }
  }
  
  return waypoints;
}

/**
 * Create a simple L-shaped fallback route when libavoid fails
 */
export function createFallbackRoute(
  sourcePoint: Point,
  targetPoint: Point,
  sourcePosition: Position
): Point[] {
  const midX = (sourcePoint.x + targetPoint.x) / 2;
  const midY = (sourcePoint.y + targetPoint.y) / 2;
  
  // L-shaped path based on source direction
  if (sourcePosition === Position.Right || sourcePosition === Position.Left) {
    // Horizontal first, then vertical
    return [
      sourcePoint,
      { x: midX, y: sourcePoint.y },
      { x: midX, y: targetPoint.y },
      targetPoint
    ];
  } else {
    // Vertical first, then horizontal
    return [
      sourcePoint,
      { x: sourcePoint.x, y: midY },
      { x: targetPoint.x, y: midY },
      targetPoint
    ];
  }
}

/**
 * Deduplicate consecutive points that are too close together
 */
export function deduplicatePoints(points: Point[], threshold: number = 0.01): Point[] {
  const result: Point[] = [];
  
  for (const point of points) {
    const last = result[result.length - 1];
    if (!last || Math.abs(last.x - point.x) > threshold || Math.abs(last.y - point.y) > threshold) {
      result.push(point);
    }
  }
  
  return result;
}

/**
 * Configure libavoid router with optimal settings (Joint.js pattern)
 */
export function configureRouter(
  router: any,
  avoidModule: any,
  options: {
    shapeBufferDistance?: number;
    idealNudgingDistance?: number;
    segmentPenalty?: number;
    crossingPenalty?: number;
    sharedPathPenalty?: number;
  }
): void {
  const {
    shapeBufferDistance = DEFAULT_OBSTACLE_MARGIN,
    idealNudgingDistance = 8,
    segmentPenalty = 10,
    crossingPenalty = 100,
    sharedPathPenalty = 10000
  } = options;
  
  // DISABLE nudging options to prevent ballooning (Joint.js pattern)
  if (typeof avoidModule.nudgeOrthogonalSegmentsConnectedToShapes === 'number') {
    router.setRoutingOption?.(avoidModule.nudgeOrthogonalSegmentsConnectedToShapes, false);
  }
  if (typeof avoidModule.nudgeSharedPathsWithCommonEndPoint === 'number') {
    router.setRoutingOption?.(avoidModule.nudgeSharedPathsWithCommonEndPoint, false);
  }
  if (typeof avoidModule.nudgeOrthogonalTouchingColinearSegments === 'number') {
    router.setRoutingOption?.(avoidModule.nudgeOrthogonalTouchingColinearSegments, false);
  }
  if (typeof avoidModule.performUnifyingNudgingPreprocessingStep === 'number') {
    router.setRoutingOption?.(avoidModule.performUnifyingNudgingPreprocessingStep, false);
  }
  if (typeof (avoidModule as any).improvingConnectorNudging === 'number') {
    router.setRoutingOption?.((avoidModule as any).improvingConnectorNudging, false);
  }
  
  // Enable side directions for proper pin constraints
  if (typeof (avoidModule as any).sideDirections === 'number') {
    router.setRoutingOption?.((avoidModule as any).sideDirections, true);
  }
  
  // Set routing parameters
  if (typeof avoidModule.shapeBufferDistance === 'number') {
    router.setRoutingParameter?.(avoidModule.shapeBufferDistance, shapeBufferDistance);
  }
  if (typeof avoidModule.idealNudgingDistance === 'number') {
    router.setRoutingParameter?.(avoidModule.idealNudgingDistance, idealNudgingDistance);
  }
  if (typeof avoidModule.segmentPenalty === 'number') {
    router.setRoutingParameter?.(avoidModule.segmentPenalty, segmentPenalty);
  }
  if (typeof avoidModule.crossingPenalty === 'number') {
    router.setRoutingParameter?.(avoidModule.crossingPenalty, crossingPenalty);
  }
  if (typeof avoidModule.sharedPathPenalty === 'number') {
    router.setRoutingParameter?.(avoidModule.sharedPathPenalty, sharedPathPenalty);
  }
}

/**
 * Calculate pin offset position on a shape
 */
export function calculatePinOffset(
  position: Position,
  edgeOffset: number,
  portEdgeSpacing: number,
  width: number,
  height: number
): { offsetX: number; offsetY: number } {
  // Base offset from direction
  let baseOffsetX: number;
  let baseOffsetY: number;
  
  switch (position) {
    case Position.Right:
      baseOffsetX = 1.0;
      baseOffsetY = 0.5;
      break;
    case Position.Left:
      baseOffsetX = 0.0;
      baseOffsetY = 0.5;
      break;
    case Position.Top:
      baseOffsetX = 0.5;
      baseOffsetY = 0.0;
      break;
    case Position.Bottom:
      baseOffsetX = 0.5;
      baseOffsetY = 1.0;
      break;
    default:
      baseOffsetX = 0.5;
      baseOffsetY = 0.5;
  }
  
  // Apply port edge spacing offset perpendicular to connection direction
  let offsetX = baseOffsetX;
  let offsetY = baseOffsetY;
  
  if (edgeOffset !== 0 && portEdgeSpacing > 0) {
    const offsetPixels = edgeOffset * portEdgeSpacing;
    
    if (position === Position.Left || position === Position.Right) {
      offsetY += offsetPixels / height;
    } else {
      offsetX += offsetPixels / width;
    }
  }
  
  return {
    offsetX: Math.min(1, Math.max(0, offsetX)),
    offsetY: Math.min(1, Math.max(0, offsetY))
  };
}




