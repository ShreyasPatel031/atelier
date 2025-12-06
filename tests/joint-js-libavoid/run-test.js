/**
 * Test script to verify Joint.js libavoid behavior during node drag
 * This can be run in Node.js with Playwright or in browser console
 */

// This is a browser console test script
// To run: Copy and paste into browser console at http://localhost:8080

(async function testJointJsNodeDrag() {
    console.log('=== Joint.js Libavoid Node Drag Test ===\n');
    
    // Wait for page to fully load
    await new Promise(r => setTimeout(r, 2000));
    
    // Try to find graph - Joint.js typically stores it in a closure
    // We'll need to inspect the page or modify the app.js to expose it
    console.log('Looking for graph instance...');
    
    // Check if graph is exposed globally (we may need to modify app.js)
    let graph = window.__testGraph;
    let router = window.__testRouter;
    
    if (!graph) {
        console.log('Graph not found. Checking if we can access it via DOM...');
        // Try to find via paper element
        const canvas = document.getElementById('canvas');
        if (canvas && canvas.__paper) {
            graph = canvas.__paper.model;
            router = canvas.__paper.__router;
        }
    }
    
    if (!graph) {
        console.error('❌ Could not find graph instance.');
        console.log('You may need to modify app.js to expose graph and router:');
        console.log('  window.__testGraph = graph;');
        console.log('  window.__testRouter = router;');
        return;
    }
    
    console.log('✅ Found graph instance\n');
    
    // Get or create test nodes
    let nodes = graph.getElements();
    let links = graph.getLinks();
    
    console.log(`Found ${nodes.length} nodes and ${links.length} links`);
    
    // If we have at least 2 nodes and 1 link, use them
    // Otherwise, we'll need to create test scenario
    if (nodes.length < 2 || links.length === 0) {
        console.log('Creating test nodes and link...');
        // We'd need access to Node and Edge constructors
        // For now, assume they exist in the page
        console.log('⚠️  Need to manually create nodes via UI or modify app.js');
        return;
    }
    
    const testNode = nodes[0];
    const testLink = links[0];
    
    // Get initial state
    const initialVertices = testLink.get('vertices') || [];
    const initialRouter = testLink.get('router');
    const initialPos = testNode.get('position');
    
    console.log('=== INITIAL STATE ===');
    console.log('Node position:', initialPos);
    console.log('Link vertices:', initialVertices.length);
    console.log('Link router:', initialRouter ? initialRouter.name : 'null');
    console.log('Path valid:', initialVertices.length > 0 || initialRouter !== null);
    
    if (initialVertices.length === 0 && !initialRouter) {
        console.error('❌ Initial state invalid - link has no route!');
        return;
    }
    
    console.log('\n=== DRAGGING NODE ===');
    const newPos = { x: initialPos.x + 200, y: initialPos.y + 100 };
    console.log(`Moving node from (${initialPos.x}, ${initialPos.y}) to (${newPos.x}, ${newPos.y})`);
    testNode.set('position', newPos);
    
    // Wait for routing to complete
    console.log('Waiting for routing to complete...');
    await new Promise(r => setTimeout(r, 1000));
    
    // Get final state
    const finalVertices = testLink.get('vertices') || [];
    const finalRouter = testLink.get('router');
    const finalPos = testNode.get('position');
    
    console.log('\n=== FINAL STATE ===');
    console.log('Node position:', finalPos);
    console.log('Link vertices:', finalVertices.length);
    console.log('Link router:', finalRouter ? finalRouter.name : 'null');
    console.log('Path valid:', finalVertices.length > 0 || finalRouter !== null);
    
    // Check router instance (if we can access it)
    if (router) {
        console.log('Router instance unchanged:', router === window.__initialRouter);
    }
    
    // Test result
    console.log('\n=== TEST RESULT ===');
    if (finalVertices.length > 0 || finalRouter !== null) {
        console.log('✅ TEST PASSED: Edge path remains valid after drag');
        console.log('✅ Joint.js successfully maintains route during node movement');
        return true;
    } else {
        console.log('❌ TEST FAILED: Edge path is empty after drag');
        console.log('❌ This matches our bug - edge path becomes empty');
        return false;
    }
})();




