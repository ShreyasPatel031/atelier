# Joint.js Libavoid Implementation Analysis

## Key Findings from Code Review

### 1. They Never Reset the Router

**Location**: `src/shared/avoid-router.js:updateShape()`

```javascript
updateShape(element) {
    const shapeRect = this.getAvoidRectFromElement(element);
    if (shapeRefs[element.id]) {
        // Only update the position and size of the shape.
        const shapeRef = shapeRefs[element.id];
        avoidRouter.moveShape(shapeRef, shapeRect); // Move existing shape
        return;
    }
    // Create new shape only if doesn't exist
}
```

**Key**: They use `moveShape()` to update obstacles, not router reset.

### 2. They Always Set a Route

**Location**: `src/shared/avoid-router.js:routeLink()`

```javascript
if (this.isRouteValid(route, ...)) {
    // Use libavoid route
    linkAttributes.vertices = this.getVerticesFromAvoidRoute(route);
    linkAttributes.router = null;
} else {
    // IMMEDIATE FALLBACK
    linkAttributes.vertices = [];
    linkAttributes.router = {
        name: 'rightAngle',
        args: { margin: this.margin - this.portOverflow }
    };
}
link.set(linkAttributes, { avoidRouter: true }); // Always set something
```

**Key**: Link is never left without a route. Fallback is immediate.

### 3. Route Validation

**Location**: `src/shared/avoid-router.js:isRouteValid()`

- Route must have > 2 points (not straight line)
- Route must not be diagonal
- Route must not pass through elements

### 4. No Complex Error Handling

- No try-catch around `processTransaction()`
- No retry logic
- Simple validation + immediate fallback

## What We Should Change

1. **Stop resetting router** - Use `moveShape()` instead
2. **Always set route** - Never leave `edgePath` empty
3. **Immediate validation** - Validate route immediately, apply fallback if invalid
4. **Simplify coordinator** - Remove router version tracking

