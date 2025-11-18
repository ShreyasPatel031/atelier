/**
 * Test that captures what's ACTUALLY rendered on the canvas by running the dev server
 * and using Playwright to inspect the real DOM
 */

import { test, expect } from '@playwright/test';

test.describe('Actual Canvas Rendering', () => {
  test('should render edges with reasonable coordinates on the actual canvas', async ({ page }) => {
    // Navigate to the actual running application
    await page.goto('http://localhost:3001/canvas');
    
    // Wait for the canvas to load
    await page.waitForSelector('.react-flow__renderer');
    
    // Wait a bit more for any async ELK processing
    await page.waitForTimeout(2000);
    
    // Capture all edge paths that are actually rendered
    const edgePaths = await page.evaluate(() => {
      const pathElements = document.querySelectorAll('.react-flow__edge-path');
      return Array.from(pathElements).map((path, index) => {
        const d = path.getAttribute('d');
        const edgeElement = path.closest('.react-flow__edge');
        const edgeId = edgeElement?.getAttribute('data-id') || `edge-${index}`;
        
        // Parse coordinates from the path
        const coords = d?.match(/[\d.-]+/g)?.map(Number) || [];
        
        return {
          edgeId,
          pathData: d,
          coordinates: coords,
          coordinateCount: coords.length
        };
      });
    });
    
    console.log('🎯 ACTUAL CANVAS EDGES:', JSON.stringify(edgePaths, null, 2));
    
    // Verify we have edges
    expect(edgePaths.length).toBeGreaterThan(0);
    
    // Check each edge for reasonable coordinates
    for (const edge of edgePaths) {
      console.log(`\n🔍 Testing edge: ${edge.edgeId}`);
      console.log(`📍 Coordinates: ${edge.coordinates}`);
      
      // All coordinates should be reasonable (not in thousands)
      for (const coord of edge.coordinates) {
        expect(coord).toBeLessThan(2000);
        expect(coord).toBeGreaterThan(-200);
      }
      
      // Should have at least start and end coordinates
      expect(edge.coordinates.length).toBeGreaterThanOrEqual(4);
    }
    
    // Test specific edges if they exist
    const horizontalEdge = edgePaths.find(e => e.edgeId.includes('horizontal'));
    if (horizontalEdge) {
      console.log('\n🔍 HORIZONTAL EDGE:', horizontalEdge);
      
      // Should not have coordinates in the thousands
      const maxCoord = Math.max(...horizontalEdge.coordinates);
      const minCoord = Math.min(...horizontalEdge.coordinates);
      
      expect(maxCoord).toBeLessThan(1000);
      expect(minCoord).toBeGreaterThan(-100);
    }
    
    const straightEdge = edgePaths.find(e => e.edgeId.includes('straight'));
    if (straightEdge) {
      console.log('\n🔍 STRAIGHT EDGE:', straightEdge);
      
      // Should be a simple line (4 coordinates: x1,y1,x2,y2)
      expect(straightEdge.coordinates.length).toBeLessThanOrEqual(6);
    }
  });
  
  test('should not have edges passing through nodes', async ({ page }) => {
    await page.goto('http://localhost:3001/canvas');
    await page.waitForSelector('.react-flow__renderer');
    await page.waitForTimeout(2000);
    
    // Get node positions and edge paths
    const canvasData = await page.evaluate(() => {
      // Get ReactFlow instance to access internal node positions
      const reactFlowInstance = (window as any).__RF__?.['1'];
      
      // Get all nodes using ReactFlow's internal state (canvas coordinates)
      const nodes = [];
      if (reactFlowInstance) {
        const nodeElements = document.querySelectorAll('.react-flow__node');
        nodeElements.forEach(nodeElement => {
          const id = nodeElement.getAttribute('data-id');
          if (id) {
            // Get node from ReactFlow store
            const node = reactFlowInstance.getNode(id);
            if (node) {
              nodes.push({
                id: node.id,
                x: node.position.x,
                y: node.position.y,
                width: node.width || 100,
                height: node.height || 100
              });
            }
          }
        });
      }
      
      // Fallback: use DOM if ReactFlow instance not available
      if (nodes.length === 0) {
        const nodeElements = document.querySelectorAll('.react-flow__node');
        nodeElements.forEach(nodeElement => {
          const id = nodeElement.getAttribute('data-id');
          const rect = nodeElement.getBoundingClientRect();
          const transform = nodeElement.style.transform;
          
          // Parse transform to get position (these are canvas coordinates in ReactFlow)
          const match = transform.match(/translate\(([^,]+),([^)]+)\)/);
          const x = match ? parseFloat(match[1].replace('px', '').trim()) : 0;
          const y = match ? parseFloat(match[2].replace('px', '').trim()) : 0;
          
          nodes.push({
            id,
            x,
            y,
            width: rect.width,
            height: rect.height
          });
        });
      }
      
      // Get all edge paths
      const pathElements = document.querySelectorAll('.react-flow__edge-path');
      const edges = Array.from(pathElements).map(path => {
        const d = path.getAttribute('d');
        const edgeElement = path.closest('.react-flow__edge');
        const edgeId = edgeElement?.getAttribute('data-id');
        const coords = d?.match(/[\d.-]+/g)?.map(Number) || [];
        
        return { edgeId, pathData: d, coordinates: coords };
      });
      
      return { nodes, edges };
    });
    
    console.log('🏠 CANVAS NODES:', canvasData.nodes);
    console.log('🔗 CANVAS EDGES:', canvasData.edges);
    
    // Test each edge for collision with nodes
    for (const edge of canvasData.edges) {
      if (edge.coordinates.length >= 4) {
        console.log(`\n🔍 Testing collision for edge: ${edge.edgeId}`);
        
        // Convert coordinates to points
        const points = [];
        for (let i = 0; i < edge.coordinates.length; i += 2) {
          if (edge.coordinates[i + 1] !== undefined) {
            points.push({
              x: edge.coordinates[i],
              y: edge.coordinates[i + 1]
            });
          }
        }
        
        console.log(`📍 Edge points: ${JSON.stringify(points)}`);
        
        // Check if any segment passes through any node
        for (let i = 0; i < points.length - 1; i++) {
          const start = points[i];
          const end = points[i + 1];
          
          for (const node of canvasData.nodes) {
            // Simple line-rectangle intersection test
            const nodeRect = {
              x: node.x,
              y: node.y,
              width: node.width,
              height: node.height
            };
            
            // Check if line segment intersects with node rectangle
            const intersects = lineIntersectsRect(start, end, nodeRect);
            
            if (intersects) {
              console.error(`❌ COLLISION: Edge ${edge.edgeId} passes through node ${node.id}`);
              console.error(`   Line: (${start.x},${start.y}) → (${end.x},${end.y})`);
              console.error(`   Node: (${node.x},${node.y}) ${node.width}x${node.height}`);
              
              // Fail the test
              expect(intersects).toBe(false);
            }
          }
        }
      }
    }
  });
});

// Helper function for line-rectangle intersection
function lineIntersectsRect(start: {x: number, y: number}, end: {x: number, y: number}, rect: {x: number, y: number, width: number, height: number}): boolean {
  // Simple bounding box check first
  const lineMinX = Math.min(start.x, end.x);
  const lineMaxX = Math.max(start.x, end.x);
  const lineMinY = Math.min(start.y, end.y);
  const lineMaxY = Math.max(start.y, end.y);
  
  const rectMaxX = rect.x + rect.width;
  const rectMaxY = rect.y + rect.height;
  
  // If line bounding box doesn't overlap with rect, no intersection
  if (lineMaxX < rect.x || lineMinX > rectMaxX || lineMaxY < rect.y || lineMinY > rectMaxY) {
    return false;
  }
  
  // Check if line passes through the interior of the rectangle (not just touching edges)
  const margin = 2; // Small margin to avoid edge cases
  const innerRect = {
    x: rect.x + margin,
    y: rect.y + margin,
    width: rect.width - 2 * margin,
    height: rect.height - 2 * margin
  };
  
  if (innerRect.width <= 0 || innerRect.height <= 0) return false;
  
  // Check if line segment intersects with inner rectangle
  return lineSegmentIntersectsRect(start, end, innerRect);
}

function lineSegmentIntersectsRect(start: {x: number, y: number}, end: {x: number, y: number}, rect: {x: number, y: number, width: number, height: number}): boolean {
  const rectMaxX = rect.x + rect.width;
  const rectMaxY = rect.y + rect.height;
  
  // Check intersection with each edge of the rectangle
  return (
    lineSegmentsIntersect(start, end, {x: rect.x, y: rect.y}, {x: rectMaxX, y: rect.y}) ||
    lineSegmentsIntersect(start, end, {x: rectMaxX, y: rect.y}, {x: rectMaxX, y: rectMaxY}) ||
    lineSegmentsIntersect(start, end, {x: rectMaxX, y: rectMaxY}, {x: rect.x, y: rectMaxY}) ||
    lineSegmentsIntersect(start, end, {x: rect.x, y: rectMaxY}, {x: rect.x, y: rect.y})
  );
}

function lineSegmentsIntersect(p1: {x: number, y: number}, p2: {x: number, y: number}, p3: {x: number, y: number}, p4: {x: number, y: number}): boolean {
  const denom = (p4.y - p3.y) * (p2.x - p1.x) - (p4.x - p3.x) * (p2.y - p1.y);
  if (Math.abs(denom) < 1e-10) return false; // Lines are parallel
  
  const ua = ((p4.x - p3.x) * (p1.y - p3.y) - (p4.y - p3.y) * (p1.x - p3.x)) / denom;
  const ub = ((p2.x - p1.x) * (p1.y - p3.y) - (p2.y - p1.y) * (p1.x - p3.x)) / denom;
  
  return ua >= 0 && ua <= 1 && ub >= 0 && ub <= 1;
}
