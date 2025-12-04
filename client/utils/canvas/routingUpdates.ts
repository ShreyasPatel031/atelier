/**
 * Centralized routing updates utility
 * 
 * Handles libavoid router updates using the Joint.js pattern:
 * - Updates obstacles using moveShape() (not recreate)
 * - Calls processTransaction() ONCE for ALL edges
 * - All ConnRefs get updated routes via their callbacks
 * 
 * This ensures ALL affected edges reroute when obstacles move,
 * not just the first one that triggers.
 */

import { getLibavoidRoutingService } from '../../core/layout/LibavoidRoutingService';

interface NodeGeometry {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Update obstacle position in the shared router and process all routes
 * Called after node drag ends to trigger rerouting of all affected edges
 * 
 * @param nodeId - ID of the node that moved
 * @param geometry - New position and size of the node
 */
export function updateObstacleAndReroute(nodeId: string, geometry: NodeGeometry): void {
  try {
    const service = getLibavoidRoutingService();
    const router = service.getRouter();
    
    // STEP 4: Use service method to update obstacle (service owns shapeRefs)
    service.updateObstacle({
      id: nodeId,
      x: geometry.x,
      y: geometry.y,
      width: geometry.w,
      height: geometry.h
    });
    
    // Process ALL routes at once - this is the key fix
    // All ConnRefs will get updated routes via their callbacks
    router.processTransaction?.();
  } catch (e) {
    // Service not initialized yet or router not ready - StepEdge will handle routing
  }
}

// Global routing update counter - StepEdge can watch this to trigger re-renders
let routingUpdateVersion = 0;

/**
 * Get the current routing update version
 * StepEdge can use this as a dependency to force re-renders when routes change
 */
export function getRoutingUpdateVersion(): number {
  return routingUpdateVersion;
}

/**
 * Update multiple obstacles at once and process all routes
 * Uses Joint.js callback pattern - processTransaction() triggers callbacks
 * for ALL affected edges automatically!
 * 
 * @param updates - Array of node IDs and their new geometries
 */
export function batchUpdateObstaclesAndReroute(
  updates: Array<{ nodeId: string; geometry: NodeGeometry }>
): void {
  if (updates.length === 0) return;
  if (typeof window === 'undefined') return;
  
  // Track how often this is called (for testing/debugging)
  (window as any).__routingUpdateCounter = ((window as any).__routingUpdateCounter || 0) + 1;
  
  // Use the shared router from window (created by StepEdge)
  // This is the router that all edges actually use
  const router = (window as any).__libavoidSharedRouter;
  const avoidModule = (window as any).__libavoidModule || (window as any).libavoid || (window as any).Avoid;
  const shapeRefs = router?.__shapeRefs as Map<string, any> | undefined;
  
  if (!router || !avoidModule || !shapeRefs) {
    // Router not ready yet - StepEdge will handle routing on its own
    return;
  }
  
  let anyUpdated = false;
  
  try {
    // Update all obstacle positions using moveShape() (Joint.js pattern)
    for (const { nodeId, geometry } of updates) {
      const existingShape = shapeRefs.get(nodeId);
      
      if (existingShape) {
        // Use moveShape() to update existing obstacle position
        const topLeft = new avoidModule.Point(geometry.x, geometry.y);
        const bottomRight = new avoidModule.Point(geometry.x + geometry.w, geometry.y + geometry.h);
        const newRectangle = new avoidModule.Rectangle(topLeft, bottomRight);
        router.moveShape(existingShape, newRectangle);
        anyUpdated = true;
      }
      // If shape doesn't exist yet, StepEdge will create it on next render
    }
    
    if (anyUpdated) {
      // Process transaction - triggers rerouting for ALL affected edges
      // This is the critical call that makes libavoid compute new routes
      router.processTransaction?.();
      
      // Increment version to signal that routing has changed
      routingUpdateVersion++;
      
      // Force StepEdge to re-extract routes by clearing the processed signature
      // When StepEdge sees a different signature, it will call processTransaction() and extract fresh routes
      // By setting this to a version number, StepEdge will always see a "different" signature
      // and re-extract routes from the router (which we just updated)
      (router as any).__lastProcessedObstacleSignature = `__force_refresh_${routingUpdateVersion}`;
      
      // Also update the position cache so StepEdge sees the moved obstacles
      const positionCache = (router as any).__nodePositionCache as Map<string, { x: number; y: number }> | undefined;
      if (positionCache) {
        for (const { nodeId, geometry } of updates) {
          positionCache.set(nodeId, { x: geometry.x, y: geometry.y });
        }
      }
      
      // Trigger a forced re-render by dispatching a custom event
      // Components can listen for this to know when to re-check routes
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('routing-update', { 
          detail: { version: routingUpdateVersion, updates }
        }));
      }
    }
  } catch (e) {
    // Router might be in an invalid state - let StepEdge handle routing
  }
}

