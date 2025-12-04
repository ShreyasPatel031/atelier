/**
 * Routing Events - Callback-based system for edge routing updates
 * 
 * Zero-latency event system that can be reused across different canvases.
 * No polling - callbacks fire immediately when positions change.
 * 
 * Usage:
 * - Drag handlers call `emitObstaclesMoved(updates)` when positions change
 * - EdgeRoutingController subscribes via `onObstaclesMoved(callback)`
 * - Callback fires immediately with near-zero latency
 */

type Geometry = { x: number; y: number; w: number; h: number };
type ObstacleUpdate = { nodeId: string; geometry: Geometry };
type ObstaclesMovedCallback = (updates: ObstacleUpdate[]) => void;

// Subscribers for obstacle move events
const obstaclesMovedSubscribers: Set<ObstaclesMovedCallback> = new Set();

/**
 * Subscribe to obstacle moved events
 * @returns Unsubscribe function
 */
export function onObstaclesMoved(callback: ObstaclesMovedCallback): () => void {
  obstaclesMovedSubscribers.add(callback);
  return () => {
    obstaclesMovedSubscribers.delete(callback);
  };
}

/**
 * Emit obstacle moved event - fires all callbacks immediately
 * Call this from drag handlers when node positions change
 */
export function emitObstaclesMoved(updates: ObstacleUpdate[]): void {
  if (updates.length === 0) return;
  
  // Fire all callbacks synchronously for minimum latency
  for (const callback of obstaclesMovedSubscribers) {
    try {
      callback(updates);
    } catch (e) {
      // Don't let one bad subscriber break others
      console.error('[routingEvents] Callback error:', e);
    }
  }
}

/**
 * Get current subscriber count (for debugging)
 */
export function getSubscriberCount(): number {
  return obstaclesMovedSubscribers.size;
}

/**
 * Clear all subscribers (for testing/cleanup)
 */
export function clearAllSubscribers(): void {
  obstaclesMovedSubscribers.clear();
}

