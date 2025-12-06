/**
 * Playwright test to verify Joint.js libavoid behavior during node drag
 */
import { test, expect } from '@playwright/test';

test.describe('Joint.js Libavoid Node Drag Test', () => {
    test('should maintain edge path when node is dragged', async ({ page }) => {
        test.setTimeout(30000);
        
        // Navigate to Joint.js example
        await page.goto('http://localhost:8080', { waitUntil: 'networkidle' });
        
        // Wait for page to load
        await page.waitForTimeout(3000);
        
        // Check if graph is exposed and get initial state
        const initialState = await page.evaluate(() => {
            const graph = window.__testGraph;
            if (!graph) {
                return { error: 'Graph not found' };
            }
            
            const nodes = graph.getElements();
            const links = graph.getLinks();
            
            if (nodes.length < 2 || links.length === 0) {
                return { error: 'Not enough nodes/links', nodeCount: nodes.length, linkCount: links.length };
            }
            
            const testLink = links[0];
            const vertices = testLink.get('vertices') || [];
            const router = testLink.get('router');
            
            return {
                nodeCount: nodes.length,
                linkCount: links.length,
                vertices: vertices.length,
                router: router ? router.name : null,
                pathValid: vertices.length > 0 || router !== null,
                initialRouter: window.__testRouter ? 'exists' : 'missing'
            };
        });
        
        console.log('Initial state:', JSON.stringify(initialState, null, 2));
        
        if (initialState.error) {
            throw new Error(`Test setup failed: ${initialState.error}`);
        }
        
        expect(initialState.pathValid).toBe(true);
        expect(initialState.initialRouter).toBe('exists');
        
        // Drag node and check final state
        const finalState = await page.evaluate(() => {
            const graph = window.__testGraph;
            const nodes = graph.getElements();
            const testNode = nodes[0];
            const testLink = graph.getLinks()[0];
            
            const initialPos = testNode.get('position');
            
            // Drag node
            testNode.set('position', { x: initialPos.x + 200, y: initialPos.y + 100 });
            
            // Wait for routing to complete
            return new Promise(resolve => {
                setTimeout(() => {
                    const finalVertices = testLink.get('vertices') || [];
                    const finalRouter = testLink.get('router');
                    const routerUnchanged = window.__testRouter === window.__initialRouter;
                    
                    resolve({
                        vertices: finalVertices.length,
                        router: finalRouter ? finalRouter.name : null,
                        pathValid: finalVertices.length > 0 || finalRouter !== null,
                        routerUnchanged,
                        finalRouterExists: window.__testRouter ? 'exists' : 'missing'
                    });
                }, 1500);
            });
        });
        
        console.log('Final state after drag:', JSON.stringify(finalState, null, 2));
        
        // Verify results
        expect(finalState.pathValid).toBe(true);
        expect(finalState.routerUnchanged).toBe(true);
        
        console.log('\n✅ TEST PASSED: Joint.js maintains edge path during node drag');
        console.log('✅ Router instance unchanged:', finalState.routerUnchanged);
        console.log('✅ Path remains valid:', finalState.pathValid);
    });
});




