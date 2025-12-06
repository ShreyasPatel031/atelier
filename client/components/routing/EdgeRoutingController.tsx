/**
 * EdgeRoutingController
 * 
 * Handles edge routing updates via callback-based event system.
 * Zero latency - callbacks fire immediately when positions change.
 * No ReactFlow dependencies - works with any canvas implementation.
 * 
 * Flow:
 * 1. Subscribes to obstacle moved events from routingEvents
 * 2. When callback fires, updates obstacles in LibavoidRoutingService
 * 3. Calls processTransaction() to trigger rerouting
 * 4. Service callbacks write waypoints to ViewState
 * 5. StepEdge reads from ViewState (pure renderer pattern)
 */

import { useEffect, useRef, memo } from 'react';
import type { ViewState } from '../../core/viewstate/ViewState';
import { onObstaclesMoved } from '../../core/events/routingEvents';
import { batchUpdateObstaclesAndReroute } from '../../utils/canvas/routingUpdates';

interface EdgeRoutingControllerProps {
  viewStateRef: { current: ViewState | undefined };
  enabled?: boolean;
}

const EdgeRoutingController: React.FC<EdgeRoutingControllerProps> = memo(({ 
  viewStateRef, 
  enabled = true 
}) => {
  const updateCountRef = useRef<number>(0);
  
  useEffect(() => {
    if (!enabled) return;
    
    // Subscribe to obstacle moved events
    const unsubscribe = onObstaclesMoved((updates) => {
      updateCountRef.current++;
      
      // Trigger routing update
      batchUpdateObstaclesAndReroute(updates);
    });
    
    return unsubscribe;
  }, [enabled]);
  
  // Expose update count for testing
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).__edgeRoutingUpdateCount = () => updateCountRef.current;
    }
  }, []);
  
  // Render nothing - this is just a controller
  return null;
});

EdgeRoutingController.displayName = 'EdgeRoutingController';

export default EdgeRoutingController;
