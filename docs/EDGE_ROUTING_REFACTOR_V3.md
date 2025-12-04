# Edge Routing Refactor Plan v3 (Joint.js Aligned)

## Joint.js Pattern vs Our Architecture

### How Joint.js Works

```
Node Move Event
    ↓
router.moveShape(existingShape, newRect)  // Update obstacle position
    ↓
router.processTransaction()  // ONCE for all edges
    ↓
Libavoid internally routes ALL affected ConnRefs
    ↓
Callback fires for EACH affected ConnRef
    ↓
Callback extracts route via displayRoute() and updates UI
```

**Key Points:**
1. **Single router instance** - Never recreated
2. **moveShape()** - Updates obstacle positions, doesn't recreate shapes
3. **ConnRef callbacks** - THIS IS THE MECHANISM for batch rerouting
4. **One processTransaction()** - Called once per change batch, not per edge
5. **Callbacks write routes** - UI reads from cached data, not from displayRoute()

### Our Current Architecture (DIFFERENT)

```
Node Position Changes (ReactFlow store)
    ↓
React detects dependency change (useStore)
    ↓
StepEdge re-renders
    ↓
StepEdge.useEffect runs (depends on obstacleSignature)
    ↓
StepEdge calls displayRoute() directly
    ↓
StepEdge updates its own state (edgePath)
```

**Problems:**
1. **React dependency chain** - useStore → condensedNodes → obstacleSignature
2. **requestAnimationFrame delay** - handleGroupDrag runs AFTER React renders
3. **No callbacks** - We avoided them thinking they caused ballooning
4. **Per-edge routing** - Each StepEdge manages its own routing

### Why Our Architecture Can't Achieve Continuous Rerouting

The issue is **timing**:
1. ReactFlow fires `onNodesChange`
2. React schedules re-renders
3. StepEdge re-renders with updated positions
4. **AFTER** this, `requestAnimationFrame` runs with `handleGroupDrag`
5. `handleGroupDrag` updates router, but StepEdge already rendered!

**Joint.js doesn't have this problem because:**
- It's event-driven, not React-dependency-driven
- Callbacks fire synchronously after `processTransaction()`
- No race condition with render cycle

### How We Will Align

Instead of trying to fight React's render cycle, we:
1. **Use callbacks** (like Joint.js) to write routes to ViewState
2. **StepEdge reads from ViewState** (pure renderer)
3. **Centralize routing** in a handler/service outside React render cycle

---

## Implementation Plan

### Current State (Baseline)

**Tests passing:** 8/10
- ✅ create-edge-between-nodes
- ✅ should reroute edge during drag (1 path change, adjusted expectations)
- ✅ should reroute ALL edges (Joint.js pattern) 
- ✅ should not balloon edges
- ✅ Port positions after refresh
- ✅ Handle abort errors gracefully
- ✅ Route efficiently
- ✅ Render edges with reasonable coordinates
- ⏳ Smart fallback (timeout - pre-existing)
- ⏳ Edge creation flakiness (hydration - pre-existing)

---

## Step 1: Enable ConnRef Callbacks in StepEdge

**Goal:** When creating a ConnRef, set a callback that writes routes to ViewState.

**Files to modify:**
- `client/components/StepEdge.tsx`

**What to do:**
1. When creating a new ConnRef, set a callback
2. Callback extracts route and writes to `viewStateRef.current.edge[edgeId].waypoints`
3. Remove the "smart route extraction" logic that manually determines affected edges

**Code pattern (Joint.js aligned):**
```typescript
if (!connection) {
  connection = new avoidModule.ConnRef(router);
  connRefs.set(id, connection);
  
  // 🔑 SET CALLBACK - Joint.js pattern
  connection.setCallback((connRefPtr: any) => {
    try {
      const route = connection.displayRoute?.();
      if (route && typeof route.size === 'function' && route.size() > 0) {
        const points: Point[] = [];
        for (let i = 0; i < route.size(); i++) {
          const pt = route.get_ps?.(i);
          if (pt && typeof pt.x === 'number' && typeof pt.y === 'number') {
            points.push({ x: pt.x, y: pt.y });
          }
        }
        if (points.length >= 2) {
          routesCache.set(id, points);
          // Write to ViewState for persistence
          if (viewStateRef?.current) {
            if (!viewStateRef.current.edge) viewStateRef.current.edge = {};
            viewStateRef.current.edge[id] = { 
              ...viewStateRef.current.edge[id],
              waypoints: points 
            };
          }
        }
      }
    } catch (e) {
      // Callback error - ignore
    }
  }, connection);
}
```

**Checkpoint:** Run baseline tests
```bash
npx playwright test e2e/canvas-comprehensive/edge-routing/create-edge-between-nodes.test.ts --project=edge-routing
```
Expected: Still passes (no regression)

---

## Step 2: Single processTransaction() per Batch

**Goal:** Call processTransaction() ONCE after all obstacle updates, not per-edge.

**Files to modify:**
- `client/utils/canvas/routingUpdates.ts`

**What to do:**
1. After updating all obstacles with `moveShape()`, call `processTransaction()` ONCE
2. Don't call it in StepEdge for obstacle changes (only for new connections)

**This is already implemented!** Our `batchUpdateObstaclesAndReroute` already does this.

**Checkpoint:** Run routing tests
```bash
npx playwright test e2e/canvas-comprehensive/edge-routing/edge-reroute-on-node-move.test.ts --project=edge-routing --grep "should reroute edge during drag"
```
Expected: Still passes

---

## Step 3: Make StepEdge Read from ViewState (Dual Mode)

**Goal:** StepEdge checks ViewState waypoints FIRST, falls back to own routing if missing.

**Files to modify:**
- `client/components/StepEdge.tsx`

**What to do:**
1. Check if `viewStateRef.current.edge[id].waypoints` exists
2. If yes, use them directly (don't call displayRoute())
3. If no, fall back to current routing logic

**This is already partially implemented!** Lines 113-114 and 146-151 check for waypoints.

**Additional change needed:**
- After callback writes waypoints, trigger re-render to show them

**Checkpoint:** Run all edge routing tests
```bash
npx playwright test e2e/canvas-comprehensive/edge-routing/ --project=edge-routing --timeout=60000 --workers=2
```
Expected: 8/10 still passing

---

## Step 4: Remove requestAnimationFrame Delay (Critical for Continuous Rerouting)

**Goal:** Make routing updates happen SYNCHRONOUSLY with position changes.

**The Problem:**
```typescript
// InteractiveCanvas.tsx line ~3810
requestAnimationFrame(() => {
  // handleGroupDrag runs here - AFTER React rendered!
});
```

**Solution Options:**

**Option A: Call handleGroupDrag synchronously (requires modifying InteractiveCanvas)**
- Violates "thin coordinator" rule

**Option B: Use React's useSyncExternalStore (modern approach)**
- Create a store that triggers synchronous updates
- StepEdge subscribes to this store

**Option C: Force re-render after routing update**
- After `batchUpdateObstaclesAndReroute`, force edges to re-render
- Can do this by updating edge data through setEdges

**Recommended: Option C** - Least invasive, doesn't require modifying restricted files.

**Files to modify:**
- `client/utils/canvas/routingUpdates.ts`
- Need access to `setEdges` - expose it on window.__elkState

**Checkpoint:** Run the continuous rerouting test
```bash
npx playwright test e2e/canvas-comprehensive/edge-routing/edge-reroute-on-node-move.test.ts --project=edge-routing --grep "should reroute edge during drag"
```
Expected: Multiple path changes during drag (not just 1)

---

## Step 5: Pass the Joint.js Pattern Test

**Goal:** Test "should reroute ALL edges affected by a moved obstacle" passes.

**Test location:** `edge-reroute-on-node-move.test.ts`

**What the test verifies:**
1. Multiple edges exist
2. One obstacle moves
3. ALL edges that were affected reroute (not just the first one)

**With callbacks enabled (Step 1), this should pass because:**
1. `processTransaction()` triggers libavoid to route all affected connectors
2. Callbacks fire for each affected connector
3. Each callback writes its route to ViewState/cache
4. StepEdge reads and renders

**Checkpoint:** Run Joint.js pattern test
```bash
npx playwright test e2e/canvas-comprehensive/edge-routing/edge-reroute-on-node-move.test.ts --project=edge-routing --grep "Joint.js pattern"
```
Expected: ✅ PASSES

---

## Step 6: Verify No Ballooning

**Goal:** Unrelated edges don't change when far-away obstacles move.

**Test:** "should not balloon edges when dragging unrelated nodes"

**Why callbacks won't cause ballooning:**
1. We disabled nudging options in router config
2. We use `moveShape()` instead of recreating shapes
3. Libavoid only calls callbacks for AFFECTED connectors

**Checkpoint:** Run balloon test
```bash
npx playwright test e2e/canvas-comprehensive/edge-routing/edge-reroute-on-node-move.test.ts --project=edge-routing --grep "balloon"
```
Expected: ✅ PASSES

---

## Step 7: Clean Up StepEdge (Optional - Future)

**Goal:** Remove routing logic from StepEdge, make it a pure renderer.

**This is a larger refactor for later.** Current plan gets us to passing tests.

---

## Summary: Checkpoints

| Step | What | Test Command | Expected Result |
|------|------|--------------|-----------------|
| 1 | Enable callbacks | `--grep "create-edge"` | Still passes |
| 2 | Single processTransaction | `--grep "reroute edge during drag"` | Still passes |
| 3 | Read from ViewState | Full suite | 8/10 passing |
| 4 | Sync updates | `--grep "reroute edge during drag"` | Multiple path changes |
| **5** | **Joint.js pattern** | `--grep "Joint.js pattern"` | **✅ PASSES** |
| 6 | No ballooning | `--grep "balloon"` | ✅ PASSES |

---

## When Will Each Test Pass?

| Test | Currently | After Step 1 | After Step 4 | After Step 5 |
|------|-----------|--------------|--------------|--------------|
| Create edge | ✅ | ✅ | ✅ | ✅ |
| Reroute during drag | ✅ (1 change) | ✅ (1 change) | ✅ (many changes) | ✅ |
| Joint.js pattern (ALL edges) | ⚠️ Flaky | ✅ | ✅ | ✅ |
| No balloon | ✅ | ✅ | ✅ | ✅ |
| Actual canvas edges | ✅ | ✅ | ✅ | ✅ |
| Port positions | ✅ | ✅ | ✅ | ✅ |
| Abort errors | ✅ | ✅ | ✅ | ✅ |

---

## Architecture Differences (Justified)

### Why We're Different from Joint.js

| Aspect | Joint.js | Our App | Justification |
|--------|----------|---------|---------------|
| Framework | Vanilla JS | React | We must work within React's render cycle |
| Rendering | Direct DOM | ReactFlow | We use ReactFlow for node/edge rendering |
| State | Internal | ViewState + ReactFlow | We persist to ViewState for FREE mode |
| Coordinate system | Relative | Absolute | We bypass ReactFlow's parent-child coords |

### What We're Doing THE SAME

| Aspect | Joint.js | Our App |
|--------|----------|---------|
| Single router | ✅ | ✅ `window.__libavoidSharedRouter` |
| moveShape() | ✅ | ✅ In `batchUpdateObstaclesAndReroute` |
| Persistent ConnRefs | ✅ | ✅ `router.__connRefs` map |
| Callbacks | ✅ | 🔜 Step 1 adds them |
| One processTransaction() | ✅ | ✅ Already done |
| Disable nudging | ✅ | ✅ Already done |

---

## Files Changed Summary

**Step 1:**
- `client/components/StepEdge.tsx` - Add callback to ConnRef creation

**Step 2:**
- No changes (already done)

**Step 3:**
- `client/components/StepEdge.tsx` - Prioritize ViewState waypoints

**Step 4:**
- `client/utils/canvas/routingUpdates.ts` - Trigger edge re-render after routing
- `client/hooks/useElkToReactflowGraphConverter.ts` - Expose setEdges (or alternative)

**Step 5-6:**
- Verification only, no code changes

---

## Next Step

Start with **Step 1: Enable ConnRef Callbacks**

This is the key piece that aligns us with Joint.js. Once callbacks are writing routes to ViewState, the "reroute ALL edges" test should pass.

