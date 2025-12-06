# Joint.js Libavoid Implementation Analysis

## Key Findings: How Joint.js Handles Edge Routing Failures

### 1. **Always Set a Route - Never Leave Empty**

**Location**: `avoid-router.js:routeLink()`

**Critical Pattern**:
```javascript
routeLink(link) {
    const connRef = this.edgeRefs[link.id];
    if (!connRef) return;

    const route = connRef.displayRoute();
    // ... extract route points ...

    if (this.isRouteValid(route, ...)) {
        // Use libavoid route
        linkAttributes.vertices = this.getVerticesFromAvoidRoute(route);
        linkAttributes.router = null;
    } else {
        // FALLBACK: Use rightAngle router
        linkAttributes.vertices = [];
        linkAttributes.router = {
            name: 'rightAngle',
            args: { margin: this.margin - this.portOverflow }
        };
    }

    link.set(linkAttributes, { avoidRouter: true });
}
```

**Key Insight**: They **ALWAYS** set a route. If libavoid route is invalid, they immediately fall back to `rightAngle` router. The link is never left without a route.

### 2. **Route Validation Heuristics**

**Location**: `avoid-router.js:isRouteValid()`

**Validation Logic**:
```javascript
isRouteValid(route, sourceElement, targetElement, sourcePortId, targetPortId) {
    const size = route.size();
    
    // If route has more than 2 points, it's valid
    if (size > 2) {
        return true;
    }

    // If route is not straight (diagonal), it's invalid
    const sourcePs = route.get_ps(0);
    const targetPs = route.get_ps(size - 1);
    if (sourcePs.x !== targetPs.x && sourcePs.y !== targetPs.y) {
        return false;
    }

    // Check if source point is inside target element
    if (sourcePortId && targetElement.getBBox().inflate(margin).containsPoint(sourcePs)) {
        return false;
    }

    // Check if target point is inside source element
    if (targetPortId && sourceElement.getBBox().inflate(margin).containsPoint(targetPs)) {
        return false;
    }

    return true;
}
```

**Key Insight**: They validate routes using heuristics:
- Route must have > 2 points (not a straight line)
- Route must not be diagonal
- Route must not pass through elements

### 3. **No Router Resets - Just Updates**

**Location**: `avoid-router.js:onCellChanged()`

**Pattern**:
```javascript
onCellChanged(cell, opt) {
    if (opt.avoidRouter) return; // Prevent infinite loops
    
    let needsRerouting = false;
    
    if ('position' in cell.changed || 'size' in cell.changed) {
        if (!cell.isElement()) return;
        this.updateShape(cell); // Just update shape position
        needsRerouting = true;
    }
    
    if (this.commitTransactions && needsRerouting) {
        this.avoidRouter.processTransaction(); // Process transaction, don't reset router
    }
}
```

**Key Insight**: They **NEVER reset the router**. They just:
1. Update shape positions with `moveShape()`
2. Call `processTransaction()` to reroute

**No router version changes, no resets, no coordinator resets.**

### 4. **Shape Updates Use moveShape()**

**Location**: `avoid-router.js:updateShape()`

**Pattern**:
```javascript
updateShape(element) {
    const shapeRect = this.getAvoidRectFromElement(element);
    if (shapeRefs[element.id]) {
        // Only update the position and size of the shape.
        const shapeRef = shapeRefs[element.id];
        avoidRouter.moveShape(shapeRef, shapeRect); // Move existing shape
        return;
    }
    // ... create new shape if doesn't exist ...
}
```

**Key Insight**: They use `moveShape()` to update existing shapes instead of deleting and recreating them. This preserves connections and doesn't require router reset.

### 5. **Callback-Based Route Updates**

**Location**: `avoid-router.js:onAvoidConnectorChange()`

**Pattern**:
```javascript
constructor(graph, options = {}) {
    // ...
    this.avoidConnectorCallback = this.onAvoidConnectorChange.bind(this);
    // ...
}

updateConnector(link) {
    // ...
    connRef.setCallback(this.avoidConnectorCallback, connRef);
    // ...
}

onAvoidConnectorChange(connRefPtr) {
    const link = this.linksByPointer[connRefPtr];
    if (!link) return;
    this.routeLink(link); // Route the link when callback fires
}
```

**Key Insight**: They use libavoid's callback mechanism to update routes. When libavoid finishes routing, it calls the callback, which then routes the link.

### 6. **No Error Handling Around processTransaction()**

**Location**: `avoid-router.js:routeAll()`, `onCellChanged()`, etc.

**Pattern**:
```javascript
routeAll() {
    graph.getElements().forEach((element) => this.updateShape(element));
    graph.getLinks().forEach((link) => this.updateConnector(link));
    avoidRouter.processTransaction(); // No try-catch!
}
```

**Key Insight**: They don't wrap `processTransaction()` in try-catch. They rely on:
1. Route validation to catch invalid routes
2. Fallback router to handle failures
3. Callback mechanism to update routes

### 7. **Immediate Fallback on Invalid Route**

**Location**: `avoid-router.js:routeLink()`

**Pattern**:
```javascript
if (this.isRouteValid(route, ...)) {
    // Use libavoid route
    linkAttributes.vertices = this.getVerticesFromAvoidRoute(route);
    linkAttributes.router = null;
} else {
    // IMMEDIATE FALLBACK - no delay, no retry
    linkAttributes.vertices = [];
    linkAttributes.router = {
        name: 'rightAngle',
        args: { margin: this.margin - this.portOverflow }
    };
}
link.set(linkAttributes, { avoidRouter: true }); // Always set something
```

**Key Insight**: Fallback is applied **immediately** when route is invalid. No waiting, no retries, no empty states.

## Comparison with Our Implementation

### What We Do Wrong:

1. **Router Resets**: We reset the router on every obstacle signature change
   - Joint.js: Never resets, just updates shapes
   
2. **Empty Paths**: We sometimes leave `edgePath` empty when routing fails
   - Joint.js: Always sets a route (libavoid or fallback)
   
3. **Complex Error Handling**: We have try-catch blocks and retry logic
   - Joint.js: Simple validation + immediate fallback
   
4. **Coordinator Resets**: We reset coordinator when router version changes
   - Joint.js: No coordinator, direct router usage
   
5. **Delayed Fallback**: We wait for routing to complete before applying fallback
   - Joint.js: Validates route immediately and applies fallback if invalid

### What We Should Do:

1. **Stop Resetting Router**: Use `moveShape()` to update obstacle positions instead of recreating router
2. **Always Set Route**: Never leave `edgePath` empty - always use fallback if libavoid fails
3. **Immediate Validation**: Validate route immediately after extraction, apply fallback if invalid
4. **Simplify Error Handling**: Remove complex retry logic, rely on validation + fallback
5. **Use moveShape()**: Update obstacle positions without router reset

## Implementation Strategy

### Step 1: Remove Router Resets
- Don't reset router on obstacle signature changes
- Use `moveShape()` to update obstacle positions
- Keep same router instance throughout

### Step 2: Always Set Route
- After route extraction, validate immediately
- If invalid, use smart fallback immediately
- Never leave `edgePath` empty

### Step 3: Simplify Coordinator
- Remove router version tracking
- Don't reset coordinator on obstacle changes
- Just process transactions when obstacles move

### Step 4: Route Validation
- Implement `isRouteValid()` similar to Joint.js
- Check route points, straight lines, element intersections
- Apply fallback immediately if invalid

## Code Changes Needed

1. **StepEdge.tsx**:
   - Remove router version tracking
   - Add route validation
   - Always set fallback if route invalid
   - Use `moveShape()` instead of recreating shapes

2. **BatchRoutingCoordinator.ts**:
   - Remove router reset logic
   - Simplify to just process transactions

3. **InteractiveCanvas.tsx**:
   - Don't trigger router resets on obstacle changes
   - Just update obstacle positions




