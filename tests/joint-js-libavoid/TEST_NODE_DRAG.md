# Joint.js Libavoid Node Drag Test

## Test Scenario
Replicate our edge routing failure: drag a node and verify edge path remains valid.

## Manual Test Instructions

1. Navigate to `/tmp/joint/examples/libavoid`
2. Run `yarn start`
3. Open http://localhost:8080
4. Open browser console and run the test script below

## Browser Console Test Script

```javascript
// Wait for page to load
await new Promise(r => setTimeout(r, 2000));

// Get graph from the page (may need to inspect the page to find the right reference)
// The graph is typically available in the closure or as a global

// Create test scenario
const graph = window.__graph || document.querySelector('canvas')?.__graph;
if (!graph) {
    console.error('Graph not found. Inspect the page to find graph reference.');
}

// Find or create test nodes and link
let nodes = graph.getElements();
let links = graph.getLinks();

if (nodes.length < 2) {
    console.log('Creating test nodes...');
    // You'll need to access Node and Edge constructors from the page
    // This depends on how Joint.js exposes them
}

// Get initial link state
const testLink = links[0];
const initialState = {
    vertices: testLink.get('vertices') || [],
    router: testLink.get('router'),
    valid: (testLink.get('vertices') || []).length > 0 || testLink.get('router') !== null
};

console.log('=== INITIAL STATE ===');
console.log(initialState);

// Drag first node
const testNode = nodes[0];
const initialPos = testNode.get('position');
testNode.set('position', { x: initialPos.x + 200, y: initialPos.y + 100 });

// Wait for routing
setTimeout(() => {
    const finalState = {
        vertices: testLink.get('vertices') || [],
        router: testLink.get('router'),
        valid: (testLink.get('vertices') || []).length > 0 || testLink.get('router') !== null
    };
    
    console.log('=== FINAL STATE ===');
    console.log(finalState);
    
    if (finalState.valid) {
        console.log('✅ TEST PASSED: Edge path remains valid after drag');
    } else {
        console.log('❌ TEST FAILED: Edge path is empty after drag');
    }
}, 1000);
```

## Key Observations to Verify

1. **Router instance**: Does it stay the same or get recreated?
2. **Route validity**: Is the route always valid (never empty)?
3. **Fallback behavior**: Does it use `rightAngle` router when libavoid fails?
4. **moveShape() usage**: Are obstacles moved or recreated?

## Expected Results

- ✅ Router instance stays the same
- ✅ Edge always has a route (vertices or router)
- ✅ No "router aborted" errors
- ✅ Fallback applied immediately if route invalid




