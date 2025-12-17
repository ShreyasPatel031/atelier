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

/**
 * Calculate edge endpoint based on node geometry, handle position, and edge offset
 * Position can be a string ('left', 'right', 'top', 'bottom') or Position enum value
 */
function calculateEndpointWithOffset(
  geom: { x: number; y: number; w: number; h: number },
  position: string,
  edgeOffset: number = 0
): { x: number; y: number } {
  // Normalize position to lowercase string for comparison
  const pos = String(position).toLowerCase();
  
  switch (pos) {
    case 'right':
      return { x: geom.x + geom.w, y: geom.y + geom.h / 2 + edgeOffset };
    case 'left':
      return { x: geom.x, y: geom.y + geom.h / 2 + edgeOffset };
    case 'top':
      return { x: geom.x + geom.w / 2 + edgeOffset, y: geom.y };
    case 'bottom':
      return { x: geom.x + geom.w / 2 + edgeOffset, y: geom.y + geom.h };
    default:
      // Default to right for unknown positions
      return { x: geom.x + geom.w, y: geom.y + geom.h / 2 + edgeOffset };
  }
}

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
 * CRITICAL: Also updates connection endpoints for edges connected to moved nodes
 * so edges follow their connected nodes during drag.
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
    const debugInfo = { hasRouter: !!router, hasAvoidModule: !!avoidModule, hasShapeRefs: !!shapeRefs };
    (window as any).__routingUpdateDebug = { ...((window as any).__routingUpdateDebug || {}), lastEarlyReturn: debugInfo, lastEarlyReturnTime: Date.now() };
    return;
  }
  
  let anyUpdated = false;
  const movedNodeIds = new Set<string>();
  const nodePositions = new Map<string, { x: number; y: number; w: number; h: number }>();
  
  try {
    // Update all obstacle positions using moveShape() (Joint.js pattern)
    for (const { nodeId, geometry } of updates) {
      movedNodeIds.add(nodeId);
      nodePositions.set(nodeId, geometry);
      
      const existingShape = shapeRefs.get(nodeId);
      
      if (existingShape) {
        // Use moveShape() to update existing obstacle position
        const topLeft = new avoidModule.Point(geometry.x, geometry.y);
        const bottomRight = new avoidModule.Point(geometry.x + geometry.w, geometry.y + geometry.h);
        const newRectangle = new avoidModule.Rectangle(topLeft, bottomRight);
        router.moveShape(existingShape, newRectangle);
        anyUpdated = true;
      } else {
        // CRITICAL: Create obstacle if it doesn't exist yet
        // This ensures obstacles are registered even if StepEdge hasn't routed yet
        // This is needed for edges to reroute during drag when obstacles move
        try {
          const topLeft = new avoidModule.Point(geometry.x, geometry.y);
          const bottomRight = new avoidModule.Point(geometry.x + geometry.w, geometry.y + geometry.h);
          const rectangle = new avoidModule.Rectangle(topLeft, bottomRight);
          const shape = new avoidModule.ShapeRef(router, rectangle);
          shapeRefs.set(nodeId, shape);
          anyUpdated = true;
        } catch (e) {
          // Ignore errors - obstacle might be invalid
        }
      }
    }
    
    // CRITICAL: Always process transaction if we have any updates, even if some obstacles aren't registered yet
    // This ensures edges reroute when obstacles that ARE registered move
    // StepEdge will register missing obstacles on next render
    if (updates.length > 0) {
      const debugInfo = { anyUpdated, updatesCount: updates.length, movedNodeIds: Array.from(movedNodeIds), shapeRefsSize: shapeRefs.size };
      (window as any).__routingUpdateDebug = { ...((window as any).__routingUpdateDebug || {}), lastProcessTransaction: debugInfo, lastProcessTransactionTime: Date.now() };
      // CRITICAL: Update connection endpoints for edges connected to moved nodes
      // This is what makes edges follow their connected nodes during drag
      // StepEdge stores connection metadata in router.__connMetadata
      const connMetadata = router.__connMetadata as Map<string, { 
        connRef: any;
        source: string;
        target: string;
        sourcePoint: { x: number; y: number };
        targetPoint: { x: number; y: number };
        sourcePosition: string;
        targetPosition: string;
        srcEdgeOffset?: number;
        tgtEdgeOffset?: number;
        // Shape and pin IDs for proper port-based routing
        srcShape?: any;
        tgtShape?: any;
        srcPinId?: number;
        tgtPinId?: number;
      }> | undefined;
      
      console.log(`[batchUpdateObstacles] connMetadata exists: ${!!connMetadata}, size: ${connMetadata?.size || 0}`);
      console.log(`[batchUpdateObstacles] movedNodeIds: ${Array.from(movedNodeIds).join(', ')}`);
      if (connMetadata) {
        console.log(`[batchUpdateObstacles] Registered edges: ${Array.from(connMetadata.keys()).join(', ')}`);
      }
      
      if (connMetadata && avoidModule && connMetadata.size > 0) {
        let edgesUpdated = 0;
        for (const [edgeId, conn] of connMetadata) {
          const sourceMoved = movedNodeIds.has(conn.source);
          const targetMoved = movedNodeIds.has(conn.target);
          
          if (!sourceMoved && !targetMoved) continue;
          
          console.log(`[batchUpdateObstacles] Edge ${edgeId}: source=${conn.source} (moved=${sourceMoved}), target=${conn.target} (moved=${targetMoved})`);
          
          const sourceGeom = nodePositions.get(conn.source);
          const targetGeom = nodePositions.get(conn.target);
          
          try {
            edgesUpdated++;
            // CRITICAL: Use shape pins for proper port-based routing, not raw points
            // This ensures edges connect to actual node ports, not intermediate positions
            // Get updated shape references from shapeRefs (shapes may have moved)
            const srcShapeRef = shapeRefs.get(conn.source);
            const tgtShapeRef = shapeRefs.get(conn.target);
            
            if (sourceMoved && sourceGeom) {
              const newSourcePoint = calculateEndpointWithOffset(
                sourceGeom, 
                conn.sourcePosition as any,
                conn.srcEdgeOffset || 0
              );
              conn.sourcePoint = newSourcePoint;
              
              // Use shape and pin ID if available (proper port-based routing)
              // Prefer shapeRef from shapeRefs (updated after moveShape), fallback to stored shape
              const shapeToUse = srcShapeRef || conn.srcShape;
              if (shapeToUse && conn.srcPinId !== undefined) {
                const srcEnd = new avoidModule.ConnEnd(shapeToUse, conn.srcPinId);
                conn.connRef.setSourceEndpoint?.(srcEnd);
                // Update stored shape reference
                conn.srcShape = shapeToUse;
              } else {
                // Fallback to raw point if shape/pin not available
                const srcPt = new avoidModule.Point(newSourcePoint.x, newSourcePoint.y);
                const srcEnd = new avoidModule.ConnEnd(srcPt);
                conn.connRef.setSourceEndpoint?.(srcEnd);
              }
            }
            
            if (targetMoved && targetGeom) {
              const newTargetPoint = calculateEndpointWithOffset(
                targetGeom, 
                conn.targetPosition as any,
                conn.tgtEdgeOffset || 0
              );
              conn.targetPoint = newTargetPoint;
              
              // Use shape and pin ID if available (proper port-based routing)
              // Prefer shapeRef from shapeRefs (updated after moveShape), fallback to stored shape
              const shapeToUse = tgtShapeRef || conn.tgtShape;
              if (shapeToUse && conn.tgtPinId !== undefined) {
                const tgtEnd = new avoidModule.ConnEnd(shapeToUse, conn.tgtPinId);
                conn.connRef.setDestEndpoint?.(tgtEnd);
                // Update stored shape reference
                conn.tgtShape = shapeToUse;
              } else {
                // Fallback to raw point if shape/pin not available
                const tgtPt = new avoidModule.Point(newTargetPoint.x, newTargetPoint.y);
                const tgtEnd = new avoidModule.ConnEnd(tgtPt);
                conn.connRef.setDestEndpoint?.(tgtEnd);
              }
            }
          } catch (e) {
            // Ignore errors
          }
        }
      }
      
      // Process transaction - triggers rerouting for ALL affected edges
      // This is the critical call that makes libavoid compute new routes
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/cc01c551-14ba-42f2-8fd9-8753b66b462f',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'routingUpdates.ts:213',message:'Calling processTransaction',data:{hasProcessTransaction:typeof router.processTransaction==='function'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
      // #endregion
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
        
        // CRITICAL: Also dispatch viewstate-updated event to ensure StepEdge re-reads waypoints
        // Libavoid callbacks write waypoints to ViewState during processTransaction(),
        // but StepEdge might not re-render unless we explicitly signal ViewState changed
        window.dispatchEvent(new CustomEvent('viewstate-updated', {
          detail: { nodeIds: updates.map(u => u.nodeId) }
        }));
      }
    }
  } catch (e) {
    // Router might be in an invalid state - let StepEdge handle routing
  }
}

