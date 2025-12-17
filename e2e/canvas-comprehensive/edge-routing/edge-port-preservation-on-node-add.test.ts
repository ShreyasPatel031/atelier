import { test, expect, Page } from '@playwright/test';
import { getBaseUrl } from '../../test-config.js';
import { addNodeToCanvas } from '../shared-utils';
import { activateConnectorTool, waitForRoutingComplete, waitForNodes, waitForEdges } from './testHelpers';

/**
 * Test to verify that existing edges maintain their port positions when new nodes are added.
 * This prevents regression where adding a new node causes existing edges to lose their
 * handle/port information and default to the top of nodes.
 */
test.describe('Edge Port Preservation on Node Add', () => {
  let BASE_URL: string;

  test.beforeAll(async () => {
    BASE_URL = await getBaseUrl();
  });

  test('should preserve edge port positions when new node is added', async ({ page }) => {
    test.setTimeout(30000);
    
    await page.goto(`${BASE_URL}/canvas`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.react-flow__renderer', { timeout: 10000 });

    // Step 1: Create two nodes
    console.log('📦 Creating two nodes...');
    await addNodeToCanvas(page, 200, 200);
    await waitForNodes(page, 1, 5000);
    await page.waitForTimeout(500);
    
    await addNodeToCanvas(page, 400, 200);
    await waitForNodes(page, 2, 5000);
    await page.waitForTimeout(500);

    // Step 2: Get node positions and handle locations
    const getNodeInfo = async (index: number) => {
      return await page.evaluate((idx) => {
        const nodes = Array.from(document.querySelectorAll('.react-flow__node'));
        if (nodes.length <= idx) return null;
        
        const node = nodes[idx] as HTMLElement;
        if (!node) return null;
        
        const nodeId = node.getAttribute('data-id');
        const rect = node.getBoundingClientRect();
        const pane = document.querySelector('.react-flow__pane') as HTMLElement;
        if (!pane) return null;
        const paneRect = pane.getBoundingClientRect();
        
        // Get node position relative to pane
        const x = rect.left - paneRect.left;
        const y = rect.top - paneRect.top;
        
        return {
          id: nodeId,
          x,
          y,
          width: rect.width,
          height: rect.height,
          centerX: x + rect.width / 2,
          centerY: y + rect.height / 2,
          rightX: x + rect.width,
          leftX: x,
          topY: y,
          bottomY: y + rect.height,
        };
      }, index);
    };

    const sourceNode = await getNodeInfo(0);
    const targetNode = await getNodeInfo(1);
    
    expect(sourceNode).not.toBeNull();
    expect(targetNode).not.toBeNull();
    
    const sourceId = sourceNode!.id!;
    const targetId = targetNode!.id!;

    // Step 3: Create edge from right side of source to left side of target
    console.log('🔗 Creating edge from source right to target left...');
    await activateConnectorTool(page, 5000);
    
    // Get pane bounds for coordinate conversion
    const pane = page.locator('.react-flow__pane');
    const paneBox = await pane.boundingBox();
    expect(paneBox).not.toBeNull();
    
    // Click on right side of source node (right connector dot)
    // Convert relative coordinates to screen coordinates
    const sourceRightX = paneBox!.x + sourceNode!.rightX;
    const sourceRightY = paneBox!.y + sourceNode!.centerY;
    await page.mouse.click(sourceRightX, sourceRightY);
    await page.waitForTimeout(200);
    
    // Click on left side of target node (left connector dot)
    const targetLeftX = paneBox!.x + targetNode!.leftX;
    const targetLeftY = paneBox!.y + targetNode!.centerY;
    await page.mouse.click(targetLeftX, targetLeftY);
    await page.waitForTimeout(1000);
    
    await waitForEdges(page, 1, 5000);
    await waitForRoutingComplete(page, '.react-flow__edge', 300, 3000);

    // Step 4: Wait for edge to be created and verify it has handles
    await page.waitForTimeout(2000); // Wait for edge routing to complete
    
    // Check that edge has sourceHandle and targetHandle set correctly
    const getEdgeHandleInfo = async () => {
      return await page.evaluate(() => {
        // Get edge from ReactFlow's internal store via window
        const rfInstance = (window as any).__reactFlowInstance;
        if (!rfInstance) {
          console.log('❌ ReactFlow instance not found');
          return null;
        }
        
        const edges = rfInstance.getEdges();
        console.log(`🔍 Found ${edges.length} edges in ReactFlow`);
        
        if (edges.length === 0) return null;
        
        // Get the first edge (should be our edge)
        const edge = edges[0];
        
        console.log('🔍 Edge info:', {
          id: edge.id,
          source: edge.source,
          target: edge.target,
          sourceHandle: edge.sourceHandle,
          targetHandle: edge.targetHandle,
        });
        
        return {
          sourceHandle: edge.sourceHandle,
          targetHandle: edge.targetHandle,
          source: edge.source,
          target: edge.target,
        };
      });
    };

    const initialEdgeInfo = await getEdgeHandleInfo();
    expect(initialEdgeInfo).not.toBeNull();
    
    // Verify edge has handles set (not undefined/null)
    // For connector tool edges, handles should be like "connector-right-source" and "connector-left-target"
    expect(initialEdgeInfo!.sourceHandle).toBeDefined();
    expect(initialEdgeInfo!.targetHandle).toBeDefined();
    expect(initialEdgeInfo!.sourceHandle).toContain('right'); // Should connect to right side
    expect(initialEdgeInfo!.targetHandle).toContain('left'); // Should connect to left side

    console.log('✅ Initial edge handles verified:', initialEdgeInfo);

    // Step 5: Add a new node (this should NOT affect existing edge)
    console.log('➕ Adding new node...');
    await addNodeToCanvas(page, 300, 300);
    await waitForNodes(page, 3, 5000);
    await page.waitForTimeout(1000);
    
    // Wait for any routing to stabilize
    await waitForRoutingComplete(page, '.react-flow__edge', 300, 3000);

    // Step 6: Verify edge STILL has correct handles after new node is added
    const afterAddEdgeInfo = await getEdgeHandleInfo();
    expect(afterAddEdgeInfo).not.toBeNull();

    console.log('🔍 Verifying edge handles after node add:', {
      before: initialEdgeInfo,
      after: afterAddEdgeInfo,
    });

    // CRITICAL ASSERTION: Edge should STILL have the same handles
    // This is the regression test - if handles are lost, they'll be undefined or changed
    expect(afterAddEdgeInfo!.sourceHandle).toBe(initialEdgeInfo!.sourceHandle);
    expect(afterAddEdgeInfo!.targetHandle).toBe(initialEdgeInfo!.targetHandle);
    
    // Verify handles are still correct (right side of source, left side of target)
    expect(afterAddEdgeInfo!.sourceHandle).toContain('right');
    expect(afterAddEdgeInfo!.targetHandle).toContain('left');
    
    // Verify edge still connects to same source and target nodes
    expect(afterAddEdgeInfo!.source).toBe(sourceId);
    expect(afterAddEdgeInfo!.target).toBe(targetId);

    console.log('✅ Edge port positions (handles) preserved after node add!');
  });
});

