import { test, expect } from '@playwright/test';
import { getBaseUrl } from '../../test-config.js';
import {
  waitForNodes,
  waitForEdges,
  waitForConnectorDots,
  waitForEdgePath,
  waitForRoutingComplete,
  activateConnectorTool,
  createNodeWithWait
} from './testHelpers';

/**
 * Edge Routing Robustness Tests
 * 
 * Tests for:
 * 1. Port position persistence on refresh
 * 2. Libavoid abort error handling
 * 3. Fallback routing when libavoid fails
 */

test.describe('Edge Routing Robustness', () => {
  let BASE_URL: string;

  test.beforeAll(async () => {
    BASE_URL = await getBaseUrl();
  });

  test('should preserve port positions after page refresh', async ({ page }) => {
    test.setTimeout(8000);
    
    await page.goto(`${BASE_URL}/canvas`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.react-flow__renderer', { timeout: 3000 });

    // Add two nodes
    const node1Id = await page.evaluate(() => {
      const btn = document.querySelector('button[title*="box" i]');
      if (btn) {
        btn.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
        btn.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true }));
        btn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      }
      return `user-node-${Date.now()}`;
    });
    await page.waitForTimeout(200);

    const pane = page.locator('.react-flow__pane');
    const paneBox = await pane.boundingBox();
    if (!paneBox) throw new Error('ReactFlow pane not found');

    await page.mouse.click(paneBox.x + 200, paneBox.y + 200);
    await page.waitForTimeout(1000);
    await page.keyboard.press('Escape');

    await page.waitForTimeout(500);

    await page.evaluate(() => {
      const btn = document.querySelector('button[title*="box" i]');
      if (btn) {
        btn.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
        btn.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true }));
        btn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      }
    });
    await page.waitForTimeout(200);

    await page.mouse.click(paneBox.x + 400, paneBox.y + 200);
    await page.waitForTimeout(1000);
    await page.keyboard.press('Escape');

    await page.waitForTimeout(1000);

    // Wait for nodes
    await page.waitForFunction(
      () => document.querySelectorAll('.react-flow__node').length >= 2,
      { timeout: 5000 }
    );

    // Get node IDs and positions (same pattern as working test)
    const nodeInfo = await page.evaluate(() => {
      const nodes = Array.from(document.querySelectorAll('.react-flow__node'));
      return nodes.map(node => {
        const rect = node.getBoundingClientRect();
        return {
          id: node.getAttribute('data-id'),
          rect: {
            x: rect.x,
            y: rect.y,
            width: rect.width,
            height: rect.height,
            right: rect.right,
            left: rect.left,
            top: rect.top,
            bottom: rect.bottom,
          },
        };
      });
    });

    if (nodeInfo.length < 2) throw new Error('Not enough nodes');

    const node1 = nodeInfo[0];
    const node2 = nodeInfo[1];

    // Activate connector tool - use evaluate to avoid DOM detachment issues
    await page.evaluate(() => {
      const btn = document.querySelector('button[aria-label="Add connector (C)"]') as HTMLButtonElement;
      if (btn) {
        btn.click();
      } else {
        throw new Error('Connector button not found');
      }
    });
    
    // Wait a bit for state to propagate
    await page.waitForTimeout(500);
    
    // Wait for connector dots to appear (simpler check)
    await page.waitForFunction(
      () => {
        const dots = Array.from(document.querySelectorAll('div')).filter(el => {
          const style = window.getComputedStyle(el);
          return style.backgroundColor.includes('rgb(0, 255, 0)') || style.backgroundColor.includes('rgba(0, 255, 0');
        });
        return dots.length >= 2;
      },
      { timeout: 10000 }
    );

    // Get actual green connector dot positions
    const nodePositions = await page.evaluate(
      ([node1Id, node2Id]: [string, string]) => {
        const node1 = document.querySelector(`[data-id="${node1Id}"]`);
        const node2 = document.querySelector(`[data-id="${node2Id}"]`);
        if (!node1 || !node2) return null;
        const rect1 = node1.getBoundingClientRect();
        const rect2 = node2.getBoundingClientRect();
        
        // Find actual green dots
        const allDivs = Array.from(document.querySelectorAll('div'));
        const greenDots = allDivs.filter(el => {
          const style = window.getComputedStyle(el);
          const bg = style.backgroundColor;
          return bg.includes('rgb(0, 255, 0)') || bg.includes('rgba(0, 255, 0');
        });
        
        // Find source dot (right of node1)
        const sourceDot = greenDots.find(dot => {
          const r = dot.getBoundingClientRect();
          const cx = r.x + r.width / 2;
          const cy = r.y + r.height / 2;
          return Math.abs(cx - rect1.right) < 50 && Math.abs(cy - (rect1.top + rect1.height / 2)) < 50;
        });
        
        // Find target dot (left of node2)
        const targetDot = greenDots.find(dot => {
          const r = dot.getBoundingClientRect();
          const cx = r.x + r.width / 2;
          const cy = r.y + r.height / 2;
          return Math.abs(cx - rect2.left) < 50 && Math.abs(cy - (rect2.top + rect2.height / 2)) < 50;
        });
        
        if (sourceDot && targetDot) {
          const sr = sourceDot.getBoundingClientRect();
          const tr = targetDot.getBoundingClientRect();
          return {
            source: { x: sr.x + sr.width / 2, y: sr.y + sr.height / 2 },
            target: { x: tr.x + tr.width / 2, y: tr.y + tr.height / 2 },
          };
        }
        
        // Fallback: use node edges
        return {
          source: { x: rect1.right, y: rect1.top + rect1.height / 2 },
          target: { x: rect2.left, y: rect2.top + rect2.height / 2 },
        };
      },
      [node1.id, node2.id] as [string, string]
    );

    if (!nodePositions) throw new Error('Could not find node positions');

    // Click source connector dot (right side of node1)
    await page.mouse.click(nodePositions.source.x, nodePositions.source.y, { delay: 100 });
    await page.waitForTimeout(1000); // Wait longer for state to propagate

    // Click target connector dot (left side of node2)  
    await page.mouse.click(nodePositions.target.x, nodePositions.target.y, { delay: 100 });
    
    // Wait for edge to be created with early failure
    await waitForEdges(page, 1, 5000);
    await waitForEdgePath(page, '.react-flow__edge', 3000);
    
    // Get edge data before refresh
    const edgeDataBefore = await page.evaluate(() => {
      const edges = Array.from(document.querySelectorAll('.react-flow__edge'));
      if (edges.length === 0) return null;
      const edge = edges[0] as any;
      const edgeData = edge.__rf?.edge?.data;
      const rfEdge = edge.__rf?.edge;
      // Derive positions from handles if not in data
      const sourceHandle = edgeData?.sourceHandle || rfEdge?.sourceHandle || '';
      const targetHandle = edgeData?.targetHandle || rfEdge?.targetHandle || '';
      const sourcePosition = edgeData?.sourcePosition || 
        (sourceHandle.includes('top') ? 'top' :
         sourceHandle.includes('bottom') ? 'bottom' :
         sourceHandle.includes('left') ? 'left' : 
         sourceHandle.includes('right') ? 'right' : 'right');
      const targetPosition = edgeData?.targetPosition ||
        (targetHandle.includes('top') ? 'top' :
         targetHandle.includes('bottom') ? 'bottom' :
         targetHandle.includes('left') ? 'left' :
         targetHandle.includes('right') ? 'right' : 'left');
      
      return {
        sourcePosition,
        targetPosition,
        sourceHandle,
        targetHandle,
      };
    });

    expect(edgeDataBefore).not.toBeNull();
    expect(edgeDataBefore?.sourcePosition).toBeTruthy();
    expect(edgeDataBefore?.targetPosition).toBeTruthy();

    // Refresh page
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.react-flow__renderer', { timeout: 3000 });
    
    // Wait for edge to be restored with early failure
    await waitForEdges(page, 1, 3000);
    await waitForEdgePath(page, '.react-flow__edge', 5000);
    
    // Get edge data after refresh
    const edgeDataAfter = await page.evaluate(() => {
      const edges = Array.from(document.querySelectorAll('.react-flow__edge'));
      if (edges.length === 0) return null;
      const edge = edges[0] as any;
      const edgeData = edge.__rf?.edge?.data;
      const rfEdge = edge.__rf?.edge;
      // Derive positions from handles if not in data
      const sourceHandle = edgeData?.sourceHandle || rfEdge?.sourceHandle || '';
      const targetHandle = edgeData?.targetHandle || rfEdge?.targetHandle || '';
      const sourcePosition = edgeData?.sourcePosition || 
        (sourceHandle.includes('top') ? 'top' :
         sourceHandle.includes('bottom') ? 'bottom' :
         sourceHandle.includes('left') ? 'left' : 
         sourceHandle.includes('right') ? 'right' : 'right');
      const targetPosition = edgeData?.targetPosition ||
        (targetHandle.includes('top') ? 'top' :
         targetHandle.includes('bottom') ? 'bottom' :
         targetHandle.includes('left') ? 'left' :
         targetHandle.includes('right') ? 'right' : 'left');
      
      return {
        sourcePosition,
        targetPosition,
        sourceHandle,
        targetHandle,
      };
    });

    expect(edgeDataAfter).not.toBeNull();
    expect(edgeDataAfter?.sourcePosition).toBe(edgeDataBefore?.sourcePosition);
    expect(edgeDataAfter?.targetPosition).toBe(edgeDataBefore?.targetPosition);
  });

  test('should handle libavoid abort errors gracefully', async ({ page }) => {
    test.setTimeout(8000);
    
    await page.goto(`${BASE_URL}/canvas`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.react-flow__renderer', { timeout: 3000 });

    // Add multiple nodes and edges rapidly to trigger potential race conditions
    const pane = page.locator('.react-flow__pane');
    const paneBox = await pane.boundingBox();
    if (!paneBox) throw new Error('ReactFlow pane not found');

    // Add 3 nodes
    for (let i = 0; i < 3; i++) {
      await page.evaluate(() => {
        const btn = document.querySelector('button[title*="box" i]');
        if (btn) {
          btn.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
          btn.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true }));
          btn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
        }
      });
      await page.waitForTimeout(100);
      await page.mouse.click(paneBox.x + 200 + i * 200, paneBox.y + 200);
      await page.waitForTimeout(500);
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
    }

    // Activate connector tool - use evaluate to avoid DOM detachment issues
    await page.evaluate(() => {
      const btn = document.querySelector('button[aria-label="Add connector (C)"]') as HTMLButtonElement;
      if (btn) {
        btn.click();
      } else {
        throw new Error('Connector button not found');
      }
    });
    await page.waitForTimeout(500);
    
    // Wait for connector dots to appear (simpler check)
    await page.waitForFunction(
      () => {
        const dots = Array.from(document.querySelectorAll('div')).filter(el => {
          const style = window.getComputedStyle(el);
          return style.backgroundColor.includes('rgb(0, 255, 0)') || style.backgroundColor.includes('rgba(0, 255, 0');
        });
        return dots.length > 0;
      },
      { timeout: 10000 }
    );

    // Create edges rapidly
    const errors: string[] = [];
    page.on('console', msg => {
      const text = msg.text();
      // Only count unhandled errors - handled abort errors are OK
      if (text.includes('routing error') && !text.includes('Using smart fallback') && !text.includes('Libavoid unavailable')) {
        errors.push(text);
      }
    });

    // Create edges between nodes
    const nodes = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('.react-flow__node')).map((n, i) => ({
        index: i,
        id: n.getAttribute('data-id'),
        rect: n.getBoundingClientRect(),
      }));
    });

    for (let i = 0; i < nodes.length - 1; i++) {
      const node1 = nodes[i];
      const node2 = nodes[i + 1];
      
      // Click source (right side of node1)
      await page.mouse.click(node1.rect.right + 16, node1.rect.top + node1.rect.height / 2);
      await page.waitForTimeout(300);
      
      // Click target (left side of node2)
      await page.mouse.click(node2.rect.left - 16, node2.rect.top + node2.rect.height / 2);
      await page.waitForTimeout(300);
    }

    // Wait for edges to be created with early failure
    await waitForEdges(page, 1, 5000);

    // Verify edges were created successfully (abort errors are handled gracefully)
    const edgeCount = await page.evaluate(() => {
      return document.querySelectorAll('.react-flow__edge').length;
    });
    expect(edgeCount).toBeGreaterThan(0);
    
    // Verify no unhandled routing errors occurred
    const unhandledErrors = errors.filter(e => !e.includes('Using smart fallback') && !e.includes('Libavoid unavailable'));
    expect(unhandledErrors.length).toBe(0);
  });

  test('should use smart fallback when libavoid fails', async ({ page }) => {
    test.setTimeout(8000);
    
    await page.goto(`${BASE_URL}/canvas`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.react-flow__renderer', { timeout: 3000 });

    // Add two nodes with a third node in between (to force routing around)
    const pane = page.locator('.react-flow__pane');
    const paneBox = await pane.boundingBox();
    if (!paneBox) throw new Error('ReactFlow pane not found');

    // Add source node (left)
    await page.evaluate(() => {
      const btn = document.querySelector('button[title*="box" i]');
      if (btn) {
        btn.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
        btn.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true }));
        btn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      }
    });
    await page.waitForTimeout(100);
    await page.mouse.click(paneBox.x + 100, paneBox.y + 200);
    await page.waitForTimeout(500);
    await page.keyboard.press('Escape');

    // Add obstacle node (middle)
    await page.evaluate(() => {
      const btn = document.querySelector('button[title*="box" i]');
      if (btn) {
        btn.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
        btn.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true }));
        btn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      }
    });
    await page.waitForTimeout(100);
    await page.mouse.click(paneBox.x + 300, paneBox.y + 200);
    await page.waitForTimeout(500);
    await page.keyboard.press('Escape');

    // Add target node (right)
    await page.evaluate(() => {
      const btn = document.querySelector('button[title*="box" i]');
      if (btn) {
        btn.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
        btn.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true }));
        btn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      }
    });
    await page.waitForTimeout(100);
    await page.mouse.click(paneBox.x + 500, paneBox.y + 200);
    await page.waitForTimeout(500);
    await page.keyboard.press('Escape');

    await page.waitForTimeout(1000);

    // Activate connector tool first - ensure it's actually activated
    const connectorButton = page.locator('button[aria-label="Add connector (C)"]');
    await connectorButton.waitFor({ state: 'visible', timeout: 5000 });
    await connectorButton.click({ timeout: 5000 });
    await page.waitForTimeout(500);
    
    // Wait for connector tool to be active
    await page.waitForFunction(
      () => {
        const btn = document.querySelector('button[aria-label="Add connector (C)"]');
        const isPressed = btn?.getAttribute('aria-pressed') === 'true';
        const greenDots = Array.from(document.querySelectorAll('div')).filter(el => {
          const style = window.getComputedStyle(el);
          return style.backgroundColor.includes('rgb(0, 255, 0)') || style.backgroundColor.includes('rgba(0, 255, 0');
        });
        return isPressed || greenDots.length > 0;
      },
      { timeout: 3000 }
    );
    
    // Force libavoid to fail AFTER tool is activated but BEFORE creating edge
    await page.evaluate(() => {
      // Break libavoid by making the instance promise fail
      const win = window as any;
      if (win.AvoidLib) {
        const originalLoad = win.AvoidLib.load;
        win.AvoidLib.load = () => Promise.reject(new Error('Simulated libavoid failure'));
      }
      // Also break any existing instance
      if (win.libavoid) {
        delete win.libavoid;
      }
      if (win.Avoid) {
        delete win.Avoid;
      }
    });
    await page.waitForTimeout(500);

    // Create edge from left to right (must route around middle node)
    const nodes = await page.evaluate(() => {
      const nodeElements = Array.from(document.querySelectorAll('.react-flow__node'));
      return nodeElements.map(n => ({
        id: n.getAttribute('data-id'),
        rect: n.getBoundingClientRect(),
      }));
    });

    const sourceNode = nodes[0];
    const targetNode = nodes[2];

    await page.mouse.click(sourceNode.rect.right + 16, sourceNode.rect.top + sourceNode.rect.height / 2);
    await page.waitForTimeout(500);
    await page.mouse.click(targetNode.rect.left - 16, targetNode.rect.top + targetNode.rect.height / 2);
    
    // Wait for edge to be created (should happen even if libavoid fails) with early failure
    await waitForEdges(page, 1, 3000);
    await waitForEdgePath(page, '.react-flow__edge', 5000);
    
    // Verify edge exists and has a path
    const edgePath = await page.evaluate(() => {
      const edges = Array.from(document.querySelectorAll('.react-flow__edge path'));
      if (edges.length === 0) return null;
      const path = edges[0] as SVGPathElement;
      return path.getAttribute('d');
    });

    expect(edgePath).not.toBeNull();
    
    // Verify path has more than 2 points (not a straight line)
    const pathCommands = edgePath?.match(/[ML][\d.-]+ [\d.-]+/g) || [];
    expect(pathCommands.length).toBeGreaterThan(2);

    // Verify path doesn't pass through middle node (if we can get node positions)
    const middleNodeInfo = await page.evaluate(() => {
      const nodeElements = Array.from(document.querySelectorAll('.react-flow__node'));
      if (nodeElements.length < 3) return null;
      const middleEl = nodeElements[1];
      const rect = middleEl.getBoundingClientRect();
      return {
        left: rect.left,
        right: rect.right,
        top: rect.top,
        bottom: rect.bottom,
      };
    });
    
    if (middleNodeInfo) {
      const pathPoints = pathCommands.map(cmd => {
        const match = cmd.match(/[\d.-]+/g);
        if (match && match.length >= 2) {
          return { x: parseFloat(match[0]), y: parseFloat(match[1]) };
        }
        return null;
      }).filter(p => p !== null) as { x: number; y: number }[];

      // Check if any path point is inside the middle node
      const passesThroughObstacle = pathPoints.some(point => {
        return point.x >= middleNodeInfo.left &&
               point.x <= middleNodeInfo.right &&
               point.y >= middleNodeInfo.top &&
               point.y <= middleNodeInfo.bottom;
      });

      expect(passesThroughObstacle).toBe(false);
    }
  });
});

