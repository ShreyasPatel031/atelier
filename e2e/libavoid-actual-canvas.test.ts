import { test, expect } from '@playwright/test';
import { getBaseUrl } from './test-config.js';

/**
 * Actual Canvas Test - Adapted from edge-routing branch
 * 
 * Creates test nodes and edges similar to libavoid fixtures,
 * then verifies routing quality and no overlaps.
 * 
 * This test replicates the node and edge creation process
 * from the edge-routing branch but adapted to current architecture.
 */

test.describe('Actual Canvas Rendering (Libavoid)', () => {
  
  test('should render edges without overlapping segments', async ({ page }) => {
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
    
    // Create test graph similar to libavoid fixtures
    // This creates nodes and edges that should test routing scenarios
    console.log('📦 Creating test nodes and edges...');
    
    await page.evaluate(() => {
      const testGraph = {
        id: 'root',
        children: [
          // Source node with port
          {
            id: 'libavoid-port-source',
            labels: [{ text: 'Source' }],
            data: { label: 'Source', icon: 'api' }
          },
          // Middle nodes
          {
            id: 'libavoid-port-middle1',
            labels: [{ text: 'Middle 1' }],
            data: { label: 'Middle 1', icon: 'server_generic' }
          },
          {
            id: 'libavoid-port-middle2',
            labels: [{ text: 'Middle 2' }],
            data: { label: 'Middle 2', icon: 'server_generic' }
          },
          // Target node
          {
            id: 'libavoid-port-target',
            labels: [{ text: 'Target' }],
            data: { label: 'Target', icon: 'database_generic' }
          },
          // Block node (obstacle)
          {
            id: 'libavoid-v-block',
            labels: [{ text: 'Block' }],
            data: { label: 'Block', icon: 'block' }
          }
        ],
        edges: [
          // Two edges from same port (should have spacing)
          {
            id: 'edge-port-from-1',
            sources: ['libavoid-port-source'],
            targets: ['libavoid-port-middle1'],
            labels: [{ text: '' }]
          },
          {
            id: 'edge-port-from-2',
            sources: ['libavoid-port-source'],
            targets: ['libavoid-port-middle2'],
            labels: [{ text: '' }]
          },
          // Edge to target
          {
            id: 'edge-port-to-2',
            sources: ['libavoid-port-middle2'],
            targets: ['libavoid-port-target'],
            labels: [{ text: '' }]
          },
          // Straight edge
          {
            id: 'edge-straight',
            sources: ['libavoid-port-middle1'],
            targets: ['libavoid-port-middle2'],
            labels: [{ text: '' }]
          }
        ]
      };
      
      // Dispatch event to set graph
      window.dispatchEvent(
        new CustomEvent('elkGraph:set', {
          detail: {
            elkGraph: testGraph,
            source: 'user',
            reason: 'test-libavoid-fixtures',
          },
        })
      );
    });
    
    // Wait for nodes to render
    await page.waitForFunction(() => {
      const nodes = document.querySelectorAll('.react-flow__node');
      return nodes.length >= 5;
    }, { timeout: 5000 });
    
    // Wait for edges and routing to complete
    await page.waitForTimeout(2000);
    
    // Capture the actual canvas state
    const canvasState = await page.evaluate(() => {
      const nodes = document.querySelectorAll('.react-flow__node');
      const edges = document.querySelectorAll('.react-flow__edge');
      
      const nodeData = Array.from(nodes).map(node => {
        const rect = node.getBoundingClientRect();
        const id = node.getAttribute('data-id') || '';
        return {
          id,
          x: Math.round(rect.left),
          y: Math.round(rect.top),
          width: Math.round(rect.width),
          height: Math.round(rect.height)
        };
      });
      
      const edgeData = Array.from(edges).map((edge, index) => {
        const path = edge.querySelector('.react-flow__edge-path');
        // Try multiple ways to identify edge
        const testId = edge.getAttribute('data-testid') || '';
        const dataId = edge.getAttribute('data-id') || '';
        const edgeId = testId.replace('rf__edge-', '') || dataId || `unknown-${index}`;
        
        return {
          id: edgeId,
          pathData: path?.getAttribute('d') || '',
        };
      });
      
      return {
        nodeCount: nodes.length,
        edgeCount: edges.length,
        nodes: nodeData,
        edges: edgeData
      };
    });
    
    console.log('🎯 ACTUAL CANVAS STATE:', JSON.stringify(canvasState, null, 2));
    
    // Verify we have the expected counts
    expect(canvasState.nodeCount).toBeGreaterThanOrEqual(5);
    expect(canvasState.edgeCount).toBeGreaterThanOrEqual(4);
    
    // Find the two edges from port-source that should NOT overlap
    const edgePortFrom1 = canvasState.edges.find(e => 
      e.id === 'edge-port-from-1' || e.id.includes('edge-port-from-1')
    );
    const edgePortFrom2 = canvasState.edges.find(e => 
      e.id === 'edge-port-from-2' || e.id.includes('edge-port-from-2')
    );
    
    expect(edgePortFrom1).toBeDefined();
    expect(edgePortFrom2).toBeDefined();
    
    console.log('edge-port-from-1 path:', edgePortFrom1?.pathData);
    console.log('edge-port-from-2 path:', edgePortFrom2?.pathData);
    
    // Parse the path data to extract vertical segments
    const extractVerticalSegments = (pathData: string): { x: number; y1: number; y2: number }[] => {
      const segments: { x: number; y1: number; y2: number }[] = [];
      const coords = pathData.match(/[\d.]+/g)?.map(Number) || [];
      
      for (let i = 2; i < coords.length - 1; i += 2) {
        const x1 = coords[i - 2];
        const y1 = coords[i - 1];
        const x2 = coords[i];
        const y2 = coords[i + 1];
        
        // Vertical segment: same X, different Y
        if (Math.abs(x1 - x2) < 1 && Math.abs(y1 - y2) > 10) {
          segments.push({
            x: Math.round(x1),
            y1: Math.min(y1, y2),
            y2: Math.max(y1, y2)
          });
        }
      }
      return segments;
    };
    
    const segments1 = extractVerticalSegments(edgePortFrom1?.pathData || '');
    const segments2 = extractVerticalSegments(edgePortFrom2?.pathData || '');
    
    console.log('edge-port-from-1 vertical segments:', segments1);
    console.log('edge-port-from-2 vertical segments:', segments2);
    
    // Check if any vertical segments overlap (same X coordinate with overlapping Y ranges)
    let hasOverlap = false;
    for (const seg1 of segments1) {
      for (const seg2 of segments2) {
        // Same X coordinate?
        if (Math.abs(seg1.x - seg2.x) < 2) {
          // Check Y overlap
          const overlap = !(seg1.y2 < seg2.y1 || seg2.y2 < seg1.y1);
          if (overlap) {
            console.log(`❌ OVERLAP DETECTED at X=${seg1.x}:`);
            console.log(`   edge-port-from-1: Y=${seg1.y1} to Y=${seg1.y2}`);
            console.log(`   edge-port-from-2: Y=${seg2.y1} to Y=${seg2.y2}`);
            hasOverlap = true;
          }
        }
      }
    }
    
    // This is the key assertion: edges should NOT overlap
    expect(hasOverlap).toBe(false);
    console.log('✅ No overlapping segments detected');
  });
  
  test('should route edge around obstacles', async ({ page }) => {
    test.setTimeout(15000);
    
    // Get dynamic base URL (detects running server port)
    const baseUrl = await getBaseUrl();
    const canvasUrl = `${baseUrl}/canvas`;
    
    await page.goto(canvasUrl, { waitUntil: 'domcontentloaded', timeout: 5000 });
    await page.waitForSelector('.react-flow__renderer', { timeout: 5000 });
    
    // Create graph with obstacle
    await page.evaluate(() => {
      const testGraph = {
        id: 'root',
        children: [
          {
            id: 'node-left',
            labels: [{ text: 'Left' }],
            data: { label: 'Left', icon: 'api' }
          },
          {
            id: 'node-block',
            labels: [{ text: 'Block' }],
            data: { label: 'Block', icon: 'block' }
          },
          {
            id: 'node-right',
            labels: [{ text: 'Right' }],
            data: { label: 'Right', icon: 'database_generic' }
          }
        ],
        edges: [
          {
            id: 'edge-around-block',
            sources: ['node-left'],
            targets: ['node-right'],
            labels: [{ text: '' }]
          }
        ]
      };
      
      window.dispatchEvent(
        new CustomEvent('elkGraph:set', {
          detail: {
            elkGraph: testGraph,
            source: 'user',
            reason: 'test-obstacle-routing',
          },
        })
      );
    });
    
    // Wait for nodes and routing
    await page.waitForFunction(() => {
      const nodes = document.querySelectorAll('.react-flow__node');
      return nodes.length >= 3;
    }, { timeout: 5000 });
    await page.waitForTimeout(2000);
    
    // Get edge path
    const result = await page.evaluate(() => {
      const edges = document.querySelectorAll('.react-flow__edge');
      let edgePath = '';
      
      edges.forEach(edge => {
        const testId = edge.getAttribute('data-testid') || '';
        const dataId = edge.getAttribute('data-id') || '';
        const id = testId.replace('rf__edge-', '') || dataId;
        
        if (id.includes('edge-around-block')) {
          const path = edge.querySelector('.react-flow__edge-path');
          edgePath = path?.getAttribute('d') || '';
        }
      });
      
      return { edgePath };
    });
    
    console.log('edge-around-block path:', result.edgePath);
    
    // Verify the edge has routing (more than 2 points means it's routing around something)
    const coordCount = (result.edgePath.match(/[\d.]+/g) || []).length;
    console.log(`edge-around-block has ${coordCount / 2} points`);
    
    // A straight line would have 4 coordinates (2 points), routed path has more
    expect(coordCount).toBeGreaterThan(4);
    console.log('✅ Edge routes around obstacle');
  });
});

