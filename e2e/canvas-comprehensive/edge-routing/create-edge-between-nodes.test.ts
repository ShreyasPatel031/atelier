import { test, expect } from '@playwright/test';
import { getBaseUrl } from '../../test-config.js';
import {
  waitForNodes,
  waitForEdges,
  waitForConnectorDots,
  waitForEdgePath,
  activateConnectorTool,
  createNodeWithWait
} from './testHelpers';

test.describe('Create Edge Between Nodes', () => {
  let BASE_URL: string;

  test.beforeAll(async () => {
    BASE_URL = await getBaseUrl();
  });

  test('should create two nodes and draw edge between them', async ({ page }) => {
    test.setTimeout(8000);
    
    // Capture console logs
    const consoleLogs: string[] = [];
    page.on('console', msg => {
      const text = msg.text();
      consoleLogs.push(`[${msg.type()}] ${text}`);
      // Print important messages
      if (text.includes('Error') || text.includes('error') || text.includes('EdgeInteractions') || text.includes('ConnectorTool') || text.includes('ConnectorDots')) {
        console.log(`[browser] ${text}`);
      }
    });
    page.on('pageerror', error => {
      consoleLogs.push(`[PAGE ERROR] ${error.message}`);
      console.log(`[PAGE ERROR] ${error.message}`);
    });
    
    await page.goto(`${BASE_URL}/canvas`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.react-flow__renderer', { timeout: 5000 });

    const pane = page.locator('.react-flow__pane');
    const paneBox = await pane.boundingBox();
    if (!paneBox) throw new Error('ReactFlow pane not found');

    // Create first node
    await createNodeWithWait(page, 150, 200, 3000);

    // Create second node (300px to the right)
    await createNodeWithWait(page, 450, 200, 3000);
    await waitForNodes(page, 2, 3000);

    // Get node IDs and their positions
    const nodeInfo = await page.evaluate(() => {
      const nodes = Array.from(document.querySelectorAll('.react-flow__node'));
      return nodes.map(n => {
        const rect = n.getBoundingClientRect();
        return { 
          id: n.getAttribute('data-id'),
          x: rect.x,
          y: rect.y,
          width: rect.width,
          height: rect.height
        };
      });
    });
    expect(nodeInfo.length).toBe(2);
    console.log('Nodes:', nodeInfo);

    // Sort by x position to get left and right nodes
    nodeInfo.sort((a, b) => a.x - b.x);
    const leftNode = nodeInfo[0];
    const rightNode = nodeInfo[1];

    // Activate connector tool
    await activateConnectorTool(page, 5000);
    await waitForConnectorDots(page, 1, 3000);

    // Calculate click positions - click on the visual dots (small circles)
    // For left node: click its right side dot
    const leftNodeRightDotX = leftNode.x + leftNode.width;  // Right edge
    const leftNodeRightDotY = leftNode.y + leftNode.height / 2;  // Vertical center

    // For right node: click its left side dot
    const rightNodeLeftDotX = rightNode.x;  // Left edge
    const rightNodeLeftDotY = rightNode.y + rightNode.height / 2;  // Vertical center

    console.log('Click positions:', {
      source: { x: leftNodeRightDotX, y: leftNodeRightDotY },
      target: { x: rightNodeLeftDotX, y: rightNodeLeftDotY }
    });

    // Click source dot to start connection
    console.log('Clicking source dot...');
    await page.mouse.click(leftNodeRightDotX, leftNodeRightDotY);
    await page.waitForTimeout(200); // Brief wait for state update

    // Click target dot to complete connection
    console.log('Clicking target dot...');
    await page.mouse.click(rightNodeLeftDotX, rightNodeLeftDotY);
    
    // Wait for edge to be created with early failure
    try {
      await waitForEdges(page, 1, 5000);
    } catch (error) {
      // Print last 20 console logs for debugging
      console.log('=== Last 20 console logs ===');
      consoleLogs.slice(-20).forEach(log => console.log(log));
      console.log('=== End console logs ===');
      throw new Error('Edge was not created after clicking connector dots: ' + error);
    }

    // Verify edge exists and is visible with early failure
    const edgePath = await waitForEdgePath(page, '.react-flow__edge', 5000);
    expect(edgePath.length).toBeGreaterThan(10);
    
    const edgeInfo = await page.evaluate(() => {
      const edge = document.querySelector('.react-flow__edge');
      if (!edge) return null;
      
      // Get all attributes for debugging
      const attrs: Record<string, string | null> = {};
      for (const attr of edge.attributes) {
        attrs[attr.name] = attr.value;
      }
      
      return {
        hasEdge: true,
        attributes: attrs,
      };
    });

    console.log('Edge info:', edgeInfo);
    expect(edgeInfo).not.toBeNull();
    expect(edgeInfo?.hasEdge).toBe(true);
  });
});
