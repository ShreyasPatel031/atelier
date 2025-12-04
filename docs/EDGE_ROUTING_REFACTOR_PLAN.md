# Edge Routing Refactor Plan

## Architecture (per FIGJAM_REFACTOR.md)

| Mode | Node Positions | Edge Routing |
|------|---------------|--------------|
| **FREE** | ViewState (manual drags) | **Libavoid** |
| **LOCK** | ELK | ELK |

**Key insight:** In FREE mode, libavoid routes ALL edges. ViewState.edge[id].waypoints is for **persistence only** (reload), not to skip routing.

## Current Problems

1. **StepEdge is 1600+ lines** - does routing in React render cycle
2. **Each StepEdge routes independently** - race conditions, "router aborted" errors
3. **Router resets on obstacle moves** - not using Joint.js pattern (moveShape)
4. **ConnRefs recreated every render** - causes ballooning/nudging instability

## Target Architecture (Joint.js Pattern)

```
Node Drag (FREE mode)
    ↓
DragReparentHandler.ts
    ↓
batchUpdateObstaclesAndReroute() [already done]
    ↓
LibavoidRoutingService.updateObstacles()
    ↓
router.moveShape() for each moved node
    ↓
router.processTransaction() ONCE
    ↓
All ConnRefs get updated routes via callbacks
    ↓
Write routes to ViewState.edge[edgeId].waypoints (persistence)
    ↓
StepEdge renders path from computed route
```

---

## Implementation Steps

### ✅ Step 1: Centralized Routing Utility (DONE)

**Files created:**
- `client/utils/canvas/routingUpdates.ts`

**What it does:**
- `batchUpdateObstaclesAndReroute()` - updates obstacles via moveShape, calls processTransaction once

### ✅ Step 2: Wire to DragReparentHandler (DONE)

**Files modified:**
- `client/core/drag/DragReparentHandler.ts`

**What it does:**
- After ViewState position update, calls `batchUpdateObstaclesAndReroute()`
- This triggers rerouting during drag

**Current test status:** 7/10 passing

---

### Step 3: Make LibavoidRoutingService the Single Router Owner

**File:** `client/core/layout/LibavoidRoutingService.ts`

**What to do:**
1. Service creates and owns the SINGLE router instance
2. Move router creation from StepEdge to service
3. Service exposes: `getRouter()`, `registerObstacle()`, `registerEdge()`, `processTransaction()`
4. All routing goes through service, not directly through window globals

**Changes:**
- Remove `(window as any).__libavoidSharedRouter` from StepEdge
- Service sets `(window as any).__libavoidSharedRouter` once
- StepEdge gets router via `LibavoidRoutingService.getRouter()`

**Checkpoint:**
```bash
npx playwright test e2e/canvas-comprehensive/edge-routing/ --project=edge-routing --workers=4 --timeout=60000
```

---

### Step 4: Move Obstacle Registration to Service

**Files:**
- `client/core/layout/LibavoidRoutingService.ts`
- `client/utils/canvas/routingUpdates.ts`

**What to do:**
1. Service maintains `__shapeRefs` map internally (not on router object)
2. `routingUpdates.ts` calls `service.updateObstacle()` instead of accessing router directly
3. Service uses `moveShape()` for existing obstacles (Joint.js pattern)

**Checkpoint:**
```bash
npx playwright test e2e/canvas-comprehensive/edge-routing/ --project=edge-routing --workers=4 --timeout=60000
```

---

### Step 5: Move ConnRef Management to Service

**Files:**
- `client/core/layout/LibavoidRoutingService.ts`
- `client/components/StepEdge.tsx`

**What to do:**
1. Service maintains `__connRefs` map internally
2. StepEdge calls `service.registerEdge(edgeId, source, target, positions)` on mount
3. Service reuses existing ConnRef (no recreate)
4. Service sets callback that updates edge route state

**Checkpoint:**
```bash
npx playwright test e2e/canvas-comprehensive/edge-routing/ --project=edge-routing --workers=4 --timeout=60000
```

---

### Step 6: Write Routes to ViewState (Persistence)

**Files:**
- `client/core/layout/LibavoidRoutingService.ts`
- `client/core/renderer/ViewStateToReactFlow.ts`

**What to do:**
1. After processTransaction, service writes routes to `viewStateRef.current.edge[edgeId].waypoints`
2. On page reload, ViewStateToReactFlow passes waypoints to edge.data
3. StepEdge can use these as initial render hint before libavoid re-routes

**Checkpoint:**
```bash
npx playwright test e2e/canvas-comprehensive/edge-routing/ --project=edge-routing --workers=4 --timeout=60000
```

---

### Step 7: Simplify StepEdge

**File:** `client/components/StepEdge.tsx`

**What to do:**
1. Remove router creation code (router owned by service)
2. Remove obstacle registration code (handled by InteractiveCanvas/handlers)
3. Remove ConnRef management (handled by service)
4. Keep: endpoint calculations, path rendering, fallback logic
5. StepEdge becomes ~200 lines (just rendering)

**Target:** StepEdge only:
- Calculates source/target points based on handles
- Calls `service.getRoute(edgeId)` to get path points
- Renders SVG path
- Falls back to L-shape if no route

**Checkpoint:**
```bash
npx playwright test e2e/canvas-comprehensive/edge-routing/ --project=edge-routing --workers=4 --timeout=60000
```

---

### Step 8: Cleanup

**Files:**
- `client/lib/BatchRoutingCoordinator.ts` (DELETE)
- Remove unused imports

**Checkpoint (full suite):**
```bash
npx playwright test e2e/canvas-comprehensive/edge-routing/ e2e/canvas-comprehensive/core-interactions/ e2e/canvas-comprehensive/drag/ --project=edge-routing --workers=4 --timeout=60000
```

---

## Success Criteria

1. ✅ `should reroute edge during drag` - PASSES
2. ⏳ `should reroute ALL edges affected by a moved obstacle` - target test
3. ⏳ `should not balloon edges when dragging unrelated nodes` - PASSES
4. ✅ `should create two nodes and draw edge between them` - PASSES
5. ⏳ No "program aborted" errors in console
6. ⏳ StepEdge.tsx < 300 lines

---

## Current Progress

| Step | Status | Tests Passing | Expected Test Pass |
|------|--------|---------------|---------------------|
| 1. Centralized utility | ✅ Done | 7/10 | - |
| 2. Wire to DragReparentHandler | ✅ Done | 7/10 | - |
| 3. Service owns router | ✅ Done | 7/10 | - |
| 4. Service owns obstacles | ✅ Done | 7/10 | - |
| 5. Service with callbacks | ✅ Done | 7/10 | Infrastructure ready, but StepEdge not using it yet |
| 6. StepEdge uses service callbacks | ⏳ Next | - | **Step 6** - "should reroute ALL edges" test will PASS |
| 7. Simplify StepEdge | ⏳ Pending | - | - |
| 8. Cleanup | ⏳ Pending | - | - |

**Why Step 5 doesn't pass the test:**
- Service has callbacks ✅
- But StepEdge still creates its own ConnRefs (not using `service.addEdge()`) ❌
- StepEdge doesn't read routes from ViewState (written by callbacks) ❌
- So when obstacles move, service callbacks fire but StepEdge doesn't see the updates

**Step 6 will make the test pass by:**
- StepEdge calls `service.addEdge()` to register edges
- StepEdge reads routes from `edge.data.waypoints` (from ViewState)
- When obstacles move → callbacks fire → ViewState updated → StepEdge renders new route

**Step 3 Changes:**
- Service exposes router via `getRouter()` and `getAvoidModule()`
- Service exposes router on window for backward compatibility
- `routingUpdates.ts` uses service instead of window globals
- StepEdge tries service first, falls back to window router if not initialized

**Step 4 Changes:**
- Service maintains `shapeRefs` internally (not just on router object)
- `routingUpdates.ts` uses `service.updateObstacle()` and `service.batchUpdateObstacles()`
- Service owns obstacle registration - single source of truth
- Backward compatibility: also updates `router.__shapeRefs` for existing code

**Step 5 Approach (Revised):**
The initial Step 5 approach (service creates ConnRefs) broke existing tests because it created duplicate ConnRefs.
New approach: Service READS ConnRefs from router's `__connRefs` map - does NOT create them.
- StepEdge continues to create and manage ConnRefs on `router.__connRefs`
- Service's `processTransactionAndExtractRoutes` iterates over `router.__connRefs` instead of `this.connections`
- Service doesn't create ConnRefs, only reads them for batch processing

**Currently failing tests:**
- `should not balloon edges` - StepEdge still has its own routing logic
- `should reroute ALL edges affected by obstacle` - need service to own all routing
- `should use smart fallback` - timeout issue
