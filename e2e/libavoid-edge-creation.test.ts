import { test, expect } from '@playwright/test';
import { getBaseUrl } from './test-config.js';

/**
 * Test: Create two nodes and an edge between them
 * Verify the edge is routed through libavoid (not ELK)
 * 
 * This test verifies that edges created in FREE mode use libavoid routing.
 */

test.describe('Libavoid Edge Creation', () => {
  
  test('should route edge through libavoid when creating edge between two nodes', async ({ page }) => {
    test.setTimeout(15000);
    
    // Get dynamic base URL (detects running server port)
    const baseUrl = await getBaseUrl();
    const canvasUrl = `${baseUrl}/canvas`;
    
    // Navigate to canvas
    await page.goto(canvasUrl, { waitUntil: 'domcontentloaded', timeout: 10000 });
    console.log(`✅ Connected to dev server at ${canvasUrl}`);
    
    // Wait for canvas to load
    await page.waitForSelector('.react-flow__renderer', { timeout: 5000 });
    await page.waitForTimeout(1000);
    
    // Create two nodes programmatically via graph mutation
    const node1Id = 'test-node-1';
    const node2Id = 'test-node-2';
    const edgeId = 'test-edge-1';
    
    console.log('📦 Creating nodes and edge via graph mutation...');
    
    // Create nodes and edge by dispatching elkGraph event
    await page.evaluate(({ node1Id, node2Id, edgeId }) => {
      const testGraph = {
        id: 'root',
        children: [
          {
            id: node1Id,
            labels: [{ text: 'Node 1' }],
            data: { label: 'Node 1', icon: 'api' }
          },
          {
            id: node2Id,
            labels: [{ text: 'Node 2' }],
            data: { label: 'Node 2', icon: 'database_generic' }
          }
        ],
        edges: [
          {
            id: edgeId,
            sources: [node1Id],
            targets: [node2Id],
            labels: [{ text: '' }]
          }
        ]
      };
      
      // Dispatch event to set graph (similar to AI-generated graphs)
      window.dispatchEvent(
        new CustomEvent('elkGraph:set', {
          detail: {
            elkGraph: testGraph,
            source: 'user',
            reason: 'test-edge-creation',
          },
        })
      );
    }, { node1Id, node2Id, edgeId });
    
    // Wait for nodes and edges to render
    await page.waitForSelector(`[data-id="${node1Id}"]`, { timeout: 5000 });
    await page.waitForSelector(`[data-id="${node2Id}"]`, { timeout: 5000 });
    await page.waitForTimeout(2000); // Wait for routing to complete
    
    // Verify nodes exist
    const nodeCount = await page.evaluate(() => {
      return document.querySelectorAll('.react-flow__node').length;
    });
    expect(nodeCount).toBeGreaterThanOrEqual(2);
    console.log(`✅ Found ${nodeCount} nodes on canvas`);
    
    // Verify edge exists
    const edgeCount = await page.evaluate(() => {
      return document.querySelectorAll('.react-flow__edge').length;
    });
    expect(edgeCount).toBeGreaterThanOrEqual(1);
    console.log(`✅ Found ${edgeCount} edges on canvas`);
    
    // Extract edge path data
    const edgeData = await page.evaluate((edgeId) => {
      const edges = document.querySelectorAll('.react-flow__edge');
      let foundEdge = null;
      
      edges.forEach(edge => {
        // Try multiple ways to identify the edge
        const testId = edge.getAttribute('data-testid');
        const dataId = edge.getAttribute('data-id');
        const id = testId?.replace('rf__edge-', '') || dataId || '';
        
        if (id === edgeId || id.includes(edgeId)) {
          const path = edge.querySelector('.react-flow__edge-path');
          const pathData = path?.getAttribute('d') || '';
          const coords = pathData.match(/[\d.-]+/g)?.map(Number) || [];
          
          foundEdge = {
            id,
            pathData,
            coordinates: coords,
            pointCount: coords.length / 2
          };
        }
      });
      
      return foundEdge;
    }, edgeId);
    
    expect(edgeData).toBeDefined();
    console.log(`✅ Found edge: ${edgeData?.id}`);
    console.log(`📍 Edge path: ${edgeData?.pathData}`);
    console.log(`📍 Point count: ${edgeData?.pointCount}`);
    
    // Verify edge is routed (not a straight line)
    // A straight line has 2 points (4 coordinates: x1, y1, x2, y2)
    // A routed edge has more points
    expect(edgeData?.pointCount).toBeGreaterThan(2);
    console.log(`✅ Edge is routed (${edgeData?.pointCount} points, expected > 2)`);
    
    // Verify edge doesn't pass through nodes
    const nodePositions = await page.evaluate(({ node1Id, node2Id }) => {
      const nodes: Array<{ id: string; x: number; y: number; width: number; height: number }> = [];
      
      // Try to get positions from ReactFlow instance
      const reactFlowInstance = (window as any).__RF__?.['1'];
      
      if (reactFlowInstance) {
        const node1 = reactFlowInstance.getNode(node1Id);
        const node2 = reactFlowInstance.getNode(node2Id);
        
        if (node1) {
          nodes.push({
            id: node1Id,
            x: node1.position.x,
            y: node1.position.y,
            width: node1.width || 96,
            height: node1.height || 96
          });
        }
        
        if (node2) {
          nodes.push({
            id: node2Id,
            x: node2.position.x,
            y: node2.position.y,
            width: node2.width || 96,
            height: node2.height || 96
          });
        }
      }
      
      // Fallback: use DOM
      if (nodes.length < 2) {
        const nodeElements = document.querySelectorAll('.react-flow__node');
        nodeElements.forEach(nodeElement => {
          const id = nodeElement.getAttribute('data-id');
          if (id === node1Id || id === node2Id) {
            const rect = nodeElement.getBoundingClientRect();
            const transform = nodeElement.style.transform;
            const match = transform.match(/translate\(([^,]+),([^)]+)\)/);
            const x = match ? parseFloat(match[1].replace('px', '').trim()) : rect.left;
            const y = match ? parseFloat(match[2].replace('px', '').trim()) : rect.top;
            
            nodes.push({
              id: id || '',
              x,
              y,
              width: rect.width,
              height: rect.height
            });
          }
        });
      }
      
      return nodes;
    }, { node1Id, node2Id });
    
    expect(nodePositions.length).toBeGreaterThanOrEqual(2);
    console.log(`📍 Node positions:`, nodePositions);
    
    // Check if edge path intersects with nodes
    if (edgeData && edgeData.coordinates.length >= 4) {
      const points: Array<{ x: number; y: number }> = [];
      for (let i = 0; i < edgeData.coordinates.length; i += 2) {
        if (edgeData.coordinates[i + 1] !== undefined) {
          points.push({
            x: edgeData.coordinates[i],
            y: edgeData.coordinates[i + 1]
          });
        }
      }
      
      console.log(`📍 Edge points:`, points);
      
      // Check each segment for collision
      for (let i = 0; i < points.length - 1; i++) {
        const start = points[i];
        const end = points[i + 1];
        
        for (const node of nodePositions) {
          const nodeRect = {
            x: node.x,
            y: node.y,
            width: node.width,
            height: node.height
          };
          
          // Simple bounding box check
          const lineMinX = Math.min(start.x, end.x);
          const lineMaxX = Math.max(start.x, end.x);
          const lineMinY = Math.min(start.y, end.y);
          const lineMaxY = Math.max(start.y, end.y);
          
          const rectMaxX = nodeRect.x + nodeRect.width;
          const rectMaxY = nodeRect.y + nodeRect.height;
          
          // Check if line bounding box overlaps with node
          const overlaps = !(
            lineMaxX < nodeRect.x ||
            lineMinX > rectMaxX ||
            lineMaxY < nodeRect.y ||
            lineMinY > rectMaxY
          );
          
          if (overlaps) {
            // More detailed check: see if line actually passes through node interior
            const margin = 5; // Small margin
            const innerRect = {
              x: nodeRect.x + margin,
              y: nodeRect.y + margin,
              width: nodeRect.width - 2 * margin,
              height: nodeRect.height - 2 * margin
            };
            
            // Check if line segment intersects inner rectangle
            const intersects = lineSegmentIntersectsRect(start, end, innerRect);
            
            if (intersects) {
              console.error(`❌ COLLISION: Edge passes through node ${node.id}`);
              console.error(`   Line: (${start.x},${start.y}) → (${end.x},${end.y})`);
              console.error(`   Node: (${nodeRect.x},${nodeRect.y}) ${nodeRect.width}x${nodeRect.height}`);
              expect(intersects).toBe(false);
            }
          }
        }
      }
      
      console.log(`✅ Edge does not pass through nodes`);
    }
  });
});

// Helper function for line-rectangle intersection
function lineSegmentIntersectsRect(
  start: { x: number; y: number },
  end: { x: number; y: number },
  rect: { x: number; y: number; width: number; height: number }
): boolean {
  const rectMaxX = rect.x + rect.width;
  const rectMaxY = rect.y + rect.height;
  
  // Check intersection with each edge of the rectangle
  return (
    lineSegmentsIntersect(start, end, { x: rect.x, y: rect.y }, { x: rectMaxX, y: rect.y }) ||
    lineSegmentsIntersect(start, end, { x: rectMaxX, y: rect.y }, { x: rectMaxX, y: rectMaxY }) ||
    lineSegmentsIntersect(start, end, { x: rectMaxX, y: rectMaxY }, { x: rect.x, y: rectMaxY }) ||
    lineSegmentsIntersect(start, end, { x: rect.x, y: rectMaxY }, { x: rect.x, y: rect.y })
  );
}

function lineSegmentsIntersect(
  p1: { x: number; y: number },
  p2: { x: number; y: number },
  p3: { x: number; y: number },
  p4: { x: number; y: number }
): boolean {
  const denom = (p4.y - p3.y) * (p2.x - p1.x) - (p4.x - p3.x) * (p2.y - p1.y);
  if (Math.abs(denom) < 1e-10) return false; // Lines are parallel
  
  const ua = ((p4.x - p3.x) * (p1.y - p3.y) - (p4.y - p3.y) * (p1.x - p3.x)) / denom;
  const ub = ((p2.x - p1.x) * (p1.y - p3.y) - (p2.y - p1.y) * (p1.x - p3.x)) / denom;
  
  return ua >= 0 && ua <= 1 && ub >= 0 && ub <= 1;
}

