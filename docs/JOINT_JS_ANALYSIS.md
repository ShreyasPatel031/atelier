# Joint.js Libavoid Analysis

## How Joint.js Implements Edge Routing

### 1. Single Router Instance
```javascript
constructor(graph, options = {}) {
    this.createAvoidRouter(options);  // Called ONCE
}
// Router is NEVER recreated
```

### 2. Shape Management (Obstacles)
```javascript
updateShape(element) {
    if (shapeRefs[element.id]) {
        // EXISTING: Use moveShape() - NEVER recreate
        avoidRouter.moveShape(shapeRef, shapeRect);
        return;
    }
    // NEW: Create ShapeRef only if doesn't exist
    const shapeRef = new Avoid.ShapeRef(avoidRouter, shapeRect);
    shapeRefs[element.id] = shapeRef;
}
```

### 3. ConnRef Management - THE KEY DIFFERENCE
```javascript
updateConnector(link) {
    let connRef;
    if (edgeRefs[link.id]) {
        // EXISTING: Reuse ConnRef
        connRef = edgeRefs[link.id];
    } else {
        // NEW: Create ConnRef ONCE
        connRef = new Avoid.ConnRef(this.avoidRouter);
        edgeRefs[link.id] = connRef;
        
        // 🔑 SET CALLBACK - This is how routes propagate!
        connRef.setCallback(this.avoidConnectorCallback, connRef);
    }
    
    // Always update endpoints
    connRef.setSourceEndpoint(sourceConnEnd);
    connRef.setDestEndpoint(targetConnEnd);
}
```

### 4. The Callback Pattern
```javascript
// Callback bound to each ConnRef
onAvoidConnectorChange(connRefPtr) {
    const link = this.linksByPointer[connRefPtr];
    if (!link) return;
    this.routeLink(link);  // Update link with new route
}

// routeLink extracts the route and applies it
routeLink(link) {
    const connRef = this.edgeRefs[link.id];
    const route = connRef.displayRoute();  // Get new route
    // Apply to link...
}
```

### 5. When processTransaction() is Called
```javascript
// Called ONCE after each change, not per-edge
onCellChanged(cell, opt) {
    if ('position' in cell.changed || 'size' in cell.changed) {
        this.updateShape(cell);  // moveShape() for obstacle
        needsRerouting = true;
    }
    if (needsRerouting) {
        this.avoidRouter.processTransaction();  // ONCE!
    }
}
```

## The Flow When a Node Moves

```
1. Node position changes
   ↓
2. updateShape() → router.moveShape(existingShape, newRect)
   ↓
3. processTransaction() called ONCE
   ↓
4. Libavoid internally routes ALL affected connectors
   ↓
5. Libavoid calls callback for EACH affected connector
   ↓
6. Each callback extracts route with displayRoute()
   ↓
7. Each link updates its vertices
```

## What We Were Doing Wrong

### ❌ Problem 1: Avoiding Callbacks
```javascript
// Our code in StepEdge:
// NOTE: We don't use callbacks for route updates because libavoid
// calls callbacks for ALL connectors when ANY obstacle moves.
// This causes "ballooning" where unrelated edges change their paths.
```

**Reality**: Joint.js DOES use callbacks. The "ballooning" was caused by something else (nudging options or router reset).

### ❌ Problem 2: Creating Duplicate ConnRefs
Our Step 5 created ConnRefs in the service AND StepEdge created its own. Joint.js creates ConnRefs in ONE place.

### ❌ Problem 3: Complex "Smart Route Extraction"
We added logic to manually determine which edges are "affected" by obstacle moves. Joint.js lets libavoid handle this via callbacks.

### ❌ Problem 4: Calling processTransaction() Per Edge
StepEdge calls `processTransaction()` for each new connection. Joint.js calls it ONCE after batch updates.

### ❌ Problem 5: Polling displayRoute() Instead of Using Callbacks
We poll `displayRoute()` in each StepEdge render. Joint.js receives routes via callbacks.

## The Correct Pattern

### Step 1: Create ConnRef with Callback (ONCE per edge)
```javascript
const connRef = new Avoid.ConnRef(router);
connRef.setCallback((connRefPtr) => {
    // Extract route and update ViewState
    const route = connRef.displayRoute();
    viewState.edge[edgeId].waypoints = extractPoints(route);
}, connRef);
```

### Step 2: Update Obstacle Position
```javascript
router.moveShape(existingShape, newRectangle);
```

### Step 3: Process Transaction ONCE
```javascript
router.processTransaction();
// Libavoid routes ALL connectors
// Callbacks fire for ALL affected connectors
```

### Step 4: Render from ViewState
StepEdge reads waypoints from ViewState, doesn't call displayRoute().

## Why This Fixes "Reroute ALL Edges"

1. Each edge has a ConnRef with a callback
2. When obstacle moves, `moveShape()` + `processTransaction()` is called
3. Libavoid internally determines which connectors are affected
4. Callbacks fire for affected connectors (not manually determined)
5. Each callback updates its edge's route

## Implementation Plan (Revised)

### Step 5A: Enable Callbacks in StepEdge
- When creating ConnRef, set a callback
- Callback writes route to ViewState
- Remove "smart route extraction" logic

### Step 5B: Single processTransaction() Call
- On node drag end, call `processTransaction()` ONCE (not per edge)
- Let callbacks handle route extraction

### Step 5C: Render from ViewState
- StepEdge reads waypoints from ViewState
- Doesn't poll displayRoute() directly

## Key Insight

**The callback IS the mechanism for "reroute all edges"**. We avoided it thinking it caused ballooning, but:
- Ballooning was caused by nudging options (we disabled them)
- Ballooning was caused by router reset (we fixed with moveShape())
- Callbacks are ESSENTIAL for batch rerouting

Joint.js proves this works. They use callbacks and don't have ballooning.

