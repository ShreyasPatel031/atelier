# Edge Routing Problem Space Analysis

## Problem Statement
The `edge-reroute-on-node-move.test.ts` test fails because the edge path becomes empty after dragging a node. The test expects:
1. Edge is created between two nodes ✅ (works)
2. Edge path is valid initially ✅ (works)
3. Node is dragged to new position ✅ (works)
4. Edge path updates and is valid after drag ❌ (FAILS - path is empty)

## Test Failure Details

### Error
```
Expected: >= 2
Received: 0

pathCommands.length).toBeGreaterThanOrEqual(2)
```

### Test Flow
1. Create two nodes
2. Create edge between them using connector tool
3. Get initial edge path (works)
4. Drag node1 200px right, 100px down
5. Wait 2 seconds for rerouting
6. Get final edge path (FAILS - empty string)

## Architecture Overview

### Key Components

1. **StepEdge.tsx** - Edge component that handles routing
   - Uses libavoid-js for routing
   - Integrates with BatchRoutingCoordinator for batch processing
   - Watches `obstacleSignature` and `rerouteKey` to trigger rerouting

2. **BatchRoutingCoordinator.ts** - Manages batch routing
   - Coordinates multiple edges for batch processing
   - Handles router initialization and resets
   - Processes routes when router version changes

3. **InteractiveCanvas.tsx** - Main canvas component
   - AutoObstacleConfig useEffect updates obstacle positions
   - Sets `rerouteKey` when obstacles change
   - Updates `staticObstacles` and `staticObstacleIds` on edges

### Data Flow

```
Node Drag
  ↓
InteractiveCanvas: AutoObstacleConfig useEffect
  ↓
Updates edge.data.staticObstacles (new positions)
Updates edge.data.rerouteKey (Date.now())
  ↓
StepEdge: useEffect dependencies change (obstacleSignature, rerouteKey)
  ↓
routeWithLibavoid() called
  ↓
Router version changes (obstacleSignature changed)
  ↓
New router created, old router aborted
  ↓
BatchRoutingCoordinator.initialize() called with new router
  ↓
Coordinator resets (clears pendingEdges, computedRoutes)
  ↓
Edge registers with coordinator
  ↓
Coordinator.processBatch() called
  ↓
[PROBLEM AREA] Router may be aborted or route extraction fails
  ↓
Edge path not set (empty)
```

## Problem Areas Identified

### 1. Router Abort During Drag

**Location**: `BatchRoutingCoordinator.ts:processBatch()`

**Issue**: When nodes move, `obstacleSignature` changes, causing router version to change. The old router is aborted, but edges may still be trying to use it.

**Current Code (edge-routing branch)**:
```typescript
try {
  this.router.processTransaction?.();
  // Extract routes...
} catch (error) {
  console.error(`[BatchRoutingCoordinator] ❌ Batch processing failed:`, error);
  this.processingInProgress = false;
  // NO RETRY MECHANISM - batch marked as failed permanently
}
```

**Current Code (main branch - after fixes)**:
```typescript
try {
  this.router.processTransaction?.();
  // Extract routes...
} catch (error: any) {
  if (error?.message?.includes('aborted')) {
    this.processingInProgress = false;
    this.reset(); // Reset to allow retries
    return;
  }
  // ... other error handling
}
```

**Problem**: Even with reset, edges may not re-register properly if router version changed during processing.

### 2. Edge Path Not Set When Routing Fails

**Location**: `StepEdge.tsx:routeWithLibavoid()`

**Issue**: When coordinator returns empty route or routing fails, edge path may not be set to fallback.

**Current Code**:
```typescript
if (!routeFromCoordinator || routeFromCoordinator.length === 0) {
  // Use fallback routing
  const fallbackPoints = createSmartFallbackRoute(...);
  setEdgePath(pointsToPath(fallbackPoints));
  return;
}
```

**Problem**: This fallback is only used when coordinator returns empty route. If routing fails before coordinator callback, path may not be set.

### 3. Router Version Change Race Condition

**Location**: `StepEdge.tsx:routeWithLibavoid()`

**Issue**: When `obstacleSignature` changes during drag:
1. Router version changes
2. New router created
3. Old router aborted
4. Coordinator resets
5. Edge tries to register with new router
6. But obstacle positions may still be updating (debounced)

**Current Code**:
```typescript
const routerVersion = `${optionsVersion}:${obstacleSignature}`;

if (!(window as any).__libavoidSharedRouter || 
    (window as any).__libavoidSharedRouterVersion !== routerVersion) {
  // Create new router
  const newRouter = new avoidModule.Router(...);
  (window as any).__libavoidSharedRouter = newRouter;
  (window as any).__libavoidSharedRouterVersion = routerVersion;
  coordinator.reset();
  coordinator.initialize(newRouter, avoidModule, routerVersion);
}
```

**Problem**: Router is recreated on every obstacle signature change, but obstacles may be updating multiple times during drag (grid rounding helps but may not be enough).

### 4. Obstacle Position Updates During Drag

**Location**: `InteractiveCanvas.tsx:AutoObstacleConfig`

**Issue**: Obstacle positions are updated on every node position change, causing:
- Router to reset frequently
- Edges to re-register repeatedly
- Potential race conditions

**Current Code (main branch)**:
```typescript
const obstacleSignature = allObstacles
  .map(o => `${o.id}:${Math.round(o.x / 16) * 16}:${Math.round(o.y / 16) * 16}:...`)
  .sort()
  .join('|');
```

**Problem**: Even with grid rounding, if nodes move quickly, router may reset multiple times during a single drag operation.

### 5. Coordinator Reset Clears Routes

**Location**: `BatchRoutingCoordinator.ts:reset()`

**Issue**: When coordinator resets, it clears `computedRoutes`, but edges may still be waiting for routes.

**Current Code**:
```typescript
reset(): void {
  this.pendingEdges.clear();
  this.computedRoutes.clear(); // Routes cleared
  this.routeCallbacks.clear();
  this.batchProcessed = false;
  this.processingInProgress = false;
}
```

**Problem**: If edge is waiting for route via callback, and coordinator resets, callback may never fire with valid route.

## Comparison: edge-routing branch vs main branch

### BatchRoutingCoordinator Differences

**edge-routing branch**:
- Simple error handling - just logs error
- No retry mechanism
- No abort detection

**main branch (after fixes)**:
- Detects abort errors
- Resets coordinator on abort
- Clears routes to allow retries
- But may still have issues with edge re-registration

### StepEdge Differences

**edge-routing branch**:
- Basic fallback when coordinator returns empty
- No special handling for router version changes during routing

**main branch (after fixes)**:
- Enhanced fallback logic
- Clears empty routes to allow retries
- Watches `obstacleSignature` and `rerouteKey` for retries
- But fallback may not be applied if routing fails before coordinator callback

## Root Cause Hypothesis

The edge path becomes empty because:

1. **During drag**: Node position updates trigger `AutoObstacleConfig` to update `rerouteKey`
2. **Router version changes**: `obstacleSignature` changes, new router created
3. **Coordinator resets**: Old routes cleared, edges need to re-register
4. **Edge tries to route**: `routeWithLibavoid()` called, registers with coordinator
5. **Router aborted**: New router may be aborted if obstacle positions change again before processing
6. **Route extraction fails**: `extractRoute()` fails because connection is invalid
7. **No fallback applied**: Edge path not set because routing failed before fallback logic runs
8. **Edge path empty**: `edgePath` state remains empty or gets cleared

## Potential Solutions

### Solution 1: Debounce Router Resets
- Only reset router when obstacle positions stabilize
- Use a debounce timer before creating new router
- **Pros**: Reduces router resets during drag
- **Cons**: May delay routing updates

### Solution 2: Always Set Fallback Path
- Ensure `edgePath` is always set, even when routing fails
- Set fallback immediately if routing hasn't completed within timeout
- **Pros**: Edge always visible
- **Cons**: May show suboptimal routes temporarily

### Solution 3: Queue Route Updates
- Queue route updates during drag
- Process queue when drag ends
- **Pros**: Avoids race conditions during drag
- **Cons**: Delays routing updates

### Solution 4: Use Previous Router Until New One Ready
- Keep old router active until new router has processed routes
- Only switch when new routes are ready
- **Pros**: Avoids gaps in routing
- **Cons**: Complex state management

### Solution 5: Improve Error Recovery
- Detect when route extraction fails
- Automatically retry with fallback
- **Pros**: Handles failures gracefully
- **Cons**: May mask underlying issues

## Test Evidence

### edge-routing branch
- Test fails with same error (path empty)
- No abort error handling
- Simple error logging

### main branch
- Test fails with same error (path empty)
- Has abort error handling
- Has retry mechanisms
- But still fails

## Next Steps for Investigation

1. **Add logging** to track:
   - When router version changes
   - When coordinator resets
   - When routes are extracted
   - When fallback is applied
   - When edge path is set

2. **Check timing**:
   - How long does drag take?
   - How many router resets occur during drag?
   - When does route extraction happen relative to router reset?

3. **Verify fallback logic**:
   - Is `createSmartFallbackRoute()` called?
   - Is `setEdgePath()` called with fallback?
   - Why is path still empty?

4. **Check React state updates**:
   - Is `edgePath` state being cleared somewhere?
   - Is component re-rendering clearing state?
   - Is there a race condition with state updates?

## Files to Examine

1. `client/components/StepEdge.tsx` - Edge routing logic
2. `client/lib/BatchRoutingCoordinator.ts` - Batch processing
3. `client/components/ui/InteractiveCanvas.tsx` - Obstacle updates
4. `e2e/canvas-comprehensive/edge-routing/edge-reroute-on-node-move.test.ts` - Test

## Key Questions

1. Why is `edgePath` empty after drag?
2. Is fallback routing being called?
3. Is router being reset too frequently?
4. Are edges re-registering properly after coordinator reset?
5. Is there a timing issue with state updates?

