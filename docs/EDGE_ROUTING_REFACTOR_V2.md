# Edge Routing Refactor V2 - Joint.js Pattern + FIGJAM Architecture

## Problem Statement

1. **StepEdge.tsx is 1600+ lines** - Does routing logic AND rendering
2. **We disabled callbacks** - Thinking they caused ballooning (they don't)
3. **Each edge manages its own routing** - Should be centralized
4. **"Reroute ALL edges" doesn't work** - Because we don't use callbacks

## Architecture Target (per FIGJAM_REFACTOR.md)

```
┌─────────────────────────────────────────────────────────────────┐
│ Layer 5: Layout Engine (LibavoidRoutingService)                 │
│   - Owns router instance (never resets)                         │
│   - Owns obstacle shapes (uses moveShape())                     │
│   - Owns ConnRefs (one per edge, with callbacks)                │
│   - Callbacks write waypoints to ViewState                      │
│   - processTransaction() triggers all affected callbacks        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ ViewState.edge[id].waypoints
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ Layer 6: ReactFlow View (StepEdge)                              │
│   - Pure renderer - reads waypoints from edge.data              │
│   - Converts waypoints to SVG path                              │
│   - NO libavoid code, NO routing logic                          │
│   - ~100 lines instead of 1600                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Joint.js Pattern Implementation

### Key Insight: Callbacks ARE the Solution

```javascript
// Joint.js creates ConnRef with callback
connRef.setCallback(this.avoidConnectorCallback, connRef);

// Callback fires when THIS connector's route changes
onAvoidConnectorChange(connRefPtr) {
    const link = this.linksByPointer[connRefPtr];
    this.routeLink(link);  // Extract route and apply
}
```

When `processTransaction()` is called:
1. Libavoid routes ALL affected connectors internally
2. Callbacks fire for EACH affected connector (not all connectors)
3. Each callback extracts its route via `displayRoute()`
4. Each callback writes waypoints to ViewState

**This is how "reroute ALL edges" works!**

## New File Structure

```
client/core/layout/
├── LibavoidRoutingService.ts    # Router, obstacles, ConnRefs, callbacks
├── libavoidHelpers.ts           # Pin creation, direction flags, etc.
└── routingUpdates.ts            # Entry point for drag handlers

client/components/
└── StepEdge.tsx                 # Pure renderer (~100 lines)
```

## Implementation Plan

### Step 1: Create libavoidHelpers.ts

Extract helper functions from StepEdge.tsx:
- `positionToFlag()` - Convert Position enum to libavoid direction
- `createConnEnd()` - Create ConnEnd with proper pin handling
- `extractRoute()` - Extract waypoints from ConnRef
- `createFallbackRoute()` - L-shaped fallback when libavoid fails

### Step 2: Enhance LibavoidRoutingService

Make service the single source of truth:

```typescript
class LibavoidRoutingService {
  private router: any;
  private shapeRefs: Map<string, any>;      // Obstacles
  private connRefs: Map<string, any>;        // ConnRefs with callbacks
  private viewStateRef: React.MutableRefObject<ViewState>;
  
  // Called once on canvas mount
  async initialize(options, viewStateRef) { ... }
  
  // Called when node is added/moved
  updateObstacle(nodeId, rect) {
    if (exists) router.moveShape(...)
    else create new ShapeRef
  }
  
  // Called when edge is added
  addEdge(edgeId, source, target, ...) {
    const connRef = new ConnRef(router);
    connRef.setCallback((ptr) => this.onRouteChange(edgeId), connRef);
    connRef.setSourceEndpoint(...);
    connRef.setDestEndpoint(...);
    this.connRefs.set(edgeId, connRef);
  }
  
  // Called when obstacles moved
  processTransaction() {
    router.processTransaction();
    // Callbacks fire automatically for affected edges!
  }
  
  // Callback - writes to ViewState
  private onRouteChange(edgeId) {
    const connRef = this.connRefs.get(edgeId);
    const route = connRef.displayRoute();
    const waypoints = extractRoute(route);
    
    // Write to ViewState
    this.viewStateRef.current.edge[edgeId] = { waypoints };
  }
}
```

### Step 3: Simplify StepEdge.tsx

StepEdge becomes a pure renderer:

```typescript
function StepEdge({ data, ...props }) {
  // Read waypoints from ViewState (passed via edge.data)
  const waypoints = data?.waypoints;
  
  // Convert to SVG path
  const path = waypoints?.length >= 2
    ? waypointsToPath(waypoints)
    : straightLinePath(props);
  
  return (
    <BaseEdge path={path} {...props} />
  );
}
```

### Step 4: Wire Up the Flow

**On Canvas Mount:**
```typescript
// InteractiveCanvas.tsx or useCanvasSetup hook
useEffect(() => {
  const service = getLibavoidRoutingService();
  await service.initialize(libavoidOptions, viewStateRef);
}, []);
```

**On Node Added:**
```typescript
// When node is created
service.updateObstacle(nodeId, { x, y, width, height });
service.processTransaction();
```

**On Edge Added:**
```typescript
// When edge is created
service.addEdge(edgeId, source, target, sourcePos, targetPos, ...);
service.processTransaction();
```

**On Node Moved (drag):**
```typescript
// DragReparentHandler.ts
service.updateObstacle(nodeId, newRect);  // moveShape internally
service.processTransaction();              // Callbacks fire for affected edges!
```

**Rendering:**
```typescript
// ViewStateToReactFlow.ts
const reactFlowEdge = {
  ...edge,
  data: {
    ...edge.data,
    waypoints: viewState.edge[edge.id]?.waypoints
  }
};
```

## Why This Fixes Everything

### "Reroute ALL edges" test
- Callbacks fire for ALL affected connectors when `processTransaction()` is called
- No manual "is this edge affected?" logic needed
- Libavoid knows internally which connectors changed

### No Ballooning
- We already fixed router reset with `moveShape()` pattern
- We already disabled problematic nudging options
- Callbacks were never the cause of ballooning

### Clean Architecture
- Layer 5 (Layout): LibavoidRoutingService owns all routing
- Layer 6 (View): StepEdge is a pure renderer
- Clear separation of concerns

### StepEdge is 100 lines instead of 1600
- No libavoid imports
- No router management
- No obstacle registration
- No pin creation
- No route extraction
- Just read waypoints → render path

## Migration Checkpoints

### Checkpoint 1: libavoidHelpers.ts created
- Extract helper functions from StepEdge
- Tests still pass (no behavior change)

### Checkpoint 2: Service with callbacks
- Service creates ConnRefs with callbacks
- Callbacks write to ViewState
- StepEdge still does its own routing (dual-mode)
- Tests still pass

### Checkpoint 3: StepEdge reads from ViewState
- StepEdge checks for `data.waypoints` first
- Falls back to own routing if not present
- Tests still pass

### Checkpoint 4: ViewStateToReactFlow passes waypoints
- Edge waypoints passed via `edge.data.waypoints`
- StepEdge uses ViewState waypoints
- Service is primary source
- Tests still pass

### Checkpoint 5: Remove old routing from StepEdge
- StepEdge is pure renderer
- All routing through service
- "Reroute ALL edges" test passes
- StepEdge ~100 lines

## Files to Create/Modify

**New Files:**
- `client/core/layout/libavoidHelpers.ts`

**Modify:**
- `client/core/layout/LibavoidRoutingService.ts` - Add ConnRef management with callbacks
- `client/core/renderer/ViewStateToReactFlow.ts` - Pass waypoints in edge.data
- `client/components/StepEdge.tsx` - Simplify to pure renderer
- `client/core/drag/DragReparentHandler.ts` - Use service for routing

**Delete (after complete):**
- Most of StepEdge.tsx routing code (~1500 lines)
- `client/lib/BatchRoutingCoordinator.ts`

## Test Strategy

Run after each checkpoint:
```bash
npx playwright test e2e/canvas-comprehensive/edge-routing/ --project=edge-routing
```

Key tests:
1. `create-edge-between-nodes.test.ts` - Edge creation works
2. `edge-reroute-on-node-move.test.ts:23` - Reroute during drag
3. `edge-reroute-on-node-move.test.ts:714` - No ballooning
4. `edge-reroute-on-node-move.test.ts:908` - Reroute ALL edges (target for callbacks)

