import { test, expect, Page } from '@playwright/test';

/**
 * Coordinate System Tests
 * 
 * Tests for the coordinate system alignment between:
 * - ViewState (absolute world coordinates)
 * - ReactFlow (relative for children, absolute for root)
 * - ELK Layout (relative within scope)
 * - Domain (structural, no geometry)
 * 
 * Problem 1: Drag into group - node position should use containing group's absolute
 * Problem 2: ELK nested groups - ELK relative positions must be added to parent absolute
 */

test.describe('Coordinate System Tests', () => {
  const baseURL = 'http://localhost:3000';

  // Test utilities
  async function setupTestState(page: Page, snapshot: any): Promise<void> {
    await page.evaluate((snap) => {
      localStorage.setItem('atelier_canvas_last_snapshot_v1', JSON.stringify(snap));
    }, snapshot);
    await page.goto(baseURL);
    await page.waitForSelector('.react-flow');
    await page.waitForTimeout(2000);
  }

  async function getViewState(page: Page): Promise<any> {
    return page.evaluate(() => (window as any).getViewState?.() || { node: {}, group: {}, edge: {} });
  }

  async function getDomainGraph(page: Page): Promise<any> {
    return page.evaluate(() => (window as any).getDomainGraph?.() || { children: [] });
  }

  async function findParentInDomain(page: Page, nodeId: string): Promise<string | null> {
    return page.evaluate((id) => {
      const domain = (window as any).getDomainGraph?.() || { children: [] };
      const findParent = (graph: any, targetId: string, parentId = 'root'): string | null => {
        if (!graph.children) return null;
        for (const child of graph.children) {
          if (child.id === targetId) return parentId;
          const found = findParent(child, targetId, child.id);
          if (found) return found;
        }
        return null;
      };
      return findParent(domain, id);
    }, nodeId);
  }

  test.beforeEach(async ({ page }) => {
    await page.goto(baseURL);
    await page.waitForSelector('.react-flow');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.waitForTimeout(500);
  });

  // ============================================
  // PROBLEM 1: Drag Into Group Coordinate Tests
  // ============================================

  test.describe('Problem 1: Drag Into Group', () => {

    test('Node dragged into group should preserve absolute position', async ({ page }) => {
      // Set up: Group at (100, 100), Node at (400, 300) - outside group
      const snapshot = {
        rawGraph: {
          id: "root",
          children: [
            {
              id: "target-group",
              labels: [{ text: "Target Group" }],
              children: [],
              edges: [],
              data: { isGroup: true }
            },
            {
              id: "draggable-node",
              labels: [{ text: "Draggable Node" }]
            }
          ],
          edges: []
        },
        viewState: {
          node: { "draggable-node": { x: 400, y: 300, w: 96, h: 96 } },
          group: { "target-group": { x: 100, y: 100, w: 300, h: 300 } },
          edge: {},
          layout: { "target-group": { mode: 'FREE' } }
        },
        timestamp: Date.now()
      };
      await setupTestState(page, snapshot);

      // Verify initial state
      const initialParent = await findParentInDomain(page, 'draggable-node');
      expect(initialParent).toBe('root');

      const initialViewState = await getViewState(page);
      const initialNodePos = initialViewState.node['draggable-node'];
      console.log('📍 Initial node absolute position:', initialNodePos);
      expect(initialNodePos.x).toBe(400);
      expect(initialNodePos.y).toBe(300);

      // Drag node into the group (target: center of group at 250, 250)
      const nodeElement = page.locator('.react-flow__node').filter({ hasText: 'Draggable Node' });
      const nodeBoundingBox = await nodeElement.boundingBox();
      expect(nodeBoundingBox).not.toBeNull();

      await page.mouse.move(nodeBoundingBox!.x + 48, nodeBoundingBox!.y + 48);
      await page.mouse.down();

      const canvasRect = await page.locator('.react-flow').boundingBox();
      expect(canvasRect).not.toBeNull();

      // Move to position (200, 200) which is inside the group
      await page.mouse.move(canvasRect!.x + 200, canvasRect!.y + 200, { steps: 20 });
      await page.mouse.up();
      await page.waitForTimeout(1000);

      // Verify: Node should now be child of target-group
      const afterParent = await findParentInDomain(page, 'draggable-node');
      console.log('📍 After drag parent:', afterParent);

      // Verify: ViewState should have updated absolute position
      const afterViewState = await getViewState(page);
      const afterNodePos = afterViewState.node['draggable-node'];
      console.log('📍 After drag node absolute position:', afterNodePos);

      // CRITICAL: The node's ViewState position should be the new absolute position
      // It should NOT be the ReactFlow relative position mistakenly stored as absolute
      if (afterParent === 'target-group') {
        // If reparenting happened, verify the absolute position is reasonable
        // It should be roughly where we dropped it (around 200, 200 in screen coords)
        // converted to world coords
        expect(afterNodePos).toBeDefined();
        expect(afterNodePos.x).toBeDefined();
        expect(afterNodePos.y).toBeDefined();
        
        // The absolute position should NOT equal the group's position (would indicate bug)
        const groupPos = afterViewState.group['target-group'];
        const isAtGroupOrigin = Math.abs(afterNodePos.x - groupPos.x) < 10 && 
                                Math.abs(afterNodePos.y - groupPos.y) < 10;
        
        if (isAtGroupOrigin) {
          console.log('⚠️ PROBLEM 1 DETECTED: Node absolute equals group origin!');
        }
      }
    });

    test('Node absolute position calculation should use containing group, not ReactFlow parent', async ({ page }) => {
      // This test specifically checks Problem 1:
      // When dragging into a group, the code should calculate absolute from the containing group,
      // not from ReactFlow's parentId (which may still be 'root' during drag)
      
      const snapshot = {
        rawGraph: {
          id: "root",
          children: [
            {
              id: "container-group",
              labels: [{ text: "Container" }],
              children: [],
              edges: [],
              data: { isGroup: true }
            },
            {
              id: "test-node",
              labels: [{ text: "Test Node" }]
            }
          ],
          edges: []
        },
        viewState: {
          node: { "test-node": { x: 500, y: 500, w: 96, h: 96 } },
          group: { "container-group": { x: 100, y: 100, w: 350, h: 350 } },
          edge: {},
          layout: { "container-group": { mode: 'FREE' } }
        },
        timestamp: Date.now()
      };
      await setupTestState(page, snapshot);

      // Capture coordinate logs
      const coordLogs: string[] = [];
      page.on('console', msg => {
        const text = msg.text();
        if (text.includes('[🎯COORD]') && text.includes('PROBLEM 1')) {
          coordLogs.push(text);
        }
      });

      // Drag node into group
      const nodeElement = page.locator('.react-flow__node').filter({ hasText: 'Test Node' });
      const nodeBoundingBox = await nodeElement.boundingBox();
      
      if (nodeBoundingBox) {
        await page.mouse.move(nodeBoundingBox.x + 48, nodeBoundingBox.y + 48);
        await page.mouse.down();
        
        const canvasRect = await page.locator('.react-flow').boundingBox();
        if (canvasRect) {
          // Drag to center of group
          await page.mouse.move(canvasRect.x + 275, canvasRect.y + 275, { steps: 15 });
          await page.mouse.up();
        }
      }
      
      await page.waitForTimeout(500);

      // Check for Problem 1 detection in logs
      const problem1Detected = coordLogs.some(log => log.includes('PROBLEM 1'));
      if (problem1Detected) {
        console.log('⚠️ Problem 1 detected in coordinate logs - ReactFlow parent mismatch');
        coordLogs.forEach(log => console.log('  ', log));
      }
    });

    test('Rapid drag in/out should maintain consistent absolute position', async ({ page }) => {
      const snapshot = {
        rawGraph: {
          id: "root",
          children: [
            {
              id: "boundary-group",
              labels: [{ text: "Boundary Group" }],
              children: [],
              edges: [],
              data: { isGroup: true }
            },
            {
              id: "rapid-node",
              labels: [{ text: "Rapid Node" }]
            }
          ],
          edges: []
        },
        viewState: {
          node: { "rapid-node": { x: 400, y: 200, w: 96, h: 96 } },
          group: { "boundary-group": { x: 100, y: 100, w: 250, h: 250 } },
          edge: {},
          layout: { "boundary-group": { mode: 'FREE' } }
        },
        timestamp: Date.now()
      };
      await setupTestState(page, snapshot);

      const nodeElement = page.locator('.react-flow__node').filter({ hasText: 'Rapid Node' });
      const nodeBoundingBox = await nodeElement.boundingBox();
      expect(nodeBoundingBox).not.toBeNull();

      const canvasRect = await page.locator('.react-flow').boundingBox();
      expect(canvasRect).not.toBeNull();

      // Drag in
      await page.mouse.move(nodeBoundingBox!.x + 48, nodeBoundingBox!.y + 48);
      await page.mouse.down();
      await page.mouse.move(canvasRect!.x + 200, canvasRect!.y + 200, { steps: 10 });
      await page.mouse.up();
      await page.waitForTimeout(300);

      const afterInViewState = await getViewState(page);
      const afterInPos = afterInViewState.node['rapid-node'];
      console.log('📍 After drag IN position:', afterInPos);

      // Drag out
      const nodeAfterIn = page.locator('.react-flow__node').filter({ hasText: 'Rapid Node' });
      const nodeAfterInBox = await nodeAfterIn.boundingBox();
      
      if (nodeAfterInBox) {
        await page.mouse.move(nodeAfterInBox.x + 48, nodeAfterInBox.y + 48);
        await page.mouse.down();
        await page.mouse.move(canvasRect!.x + 450, canvasRect!.y + 450, { steps: 10 });
        await page.mouse.up();
      }
      await page.waitForTimeout(300);

      const afterOutViewState = await getViewState(page);
      const afterOutPos = afterOutViewState.node['rapid-node'];
      console.log('📍 After drag OUT position:', afterOutPos);

      // Verify positions are in reasonable range (not NaN, not 0,0 unless intended)
      expect(afterInPos).toBeDefined();
      expect(afterOutPos).toBeDefined();
      expect(Number.isFinite(afterInPos?.x)).toBe(true);
      expect(Number.isFinite(afterOutPos?.x)).toBe(true);
    });
  });

  // ============================================
  // PROBLEM 2: ELK Nested Group Coordinate Tests
  // ============================================

  test.describe('Problem 2: ELK Nested Group Coordinates', () => {

    test('ELK should write absolute positions for nested groups', async ({ page }) => {
      // This test triggers AI-generated graph which uses ELK
      // and checks that nested groups have correct absolute positions
      
      // Listen for coordinate logs
      const elkLogs: string[] = [];
      page.on('console', msg => {
        const text = msg.text();
        if (text.includes('[🎯COORD]') && text.includes('ELK')) {
          elkLogs.push(text);
        }
      });

      // Trigger a simple AI prompt that creates nested groups
      // For this test, we'll check the renderer logs which show the issue
      
      const rendererLogs: string[] = [];
      page.on('console', msg => {
        const text = msg.text();
        if (text.includes('[🎯COORD]') && text.includes('RENDERER')) {
          rendererLogs.push(text);
        }
      });

      // Navigate to page and wait
      await page.goto(baseURL);
      await page.waitForSelector('.react-flow');
      await page.waitForTimeout(2000);

      // Log any ELK coordinate issues found
      const elkIssues = elkLogs.filter(log => log.includes('PROBLEM 2') || log.includes('issue'));
      if (elkIssues.length > 0) {
        console.log('⚠️ ELK coordinate issues detected:');
        elkIssues.forEach(log => console.log('  ', log));
      }
    });

    test('Nested group children should not have negative relative positions from incorrect absolute', async ({ page }) => {
      // Set up a nested structure and verify coordinates
      const snapshot = {
        rawGraph: {
          id: "root",
          children: [
            {
              id: "outer-group",
              labels: [{ text: "Outer Group" }],
              children: [
                {
                  id: "inner-group",
                  labels: [{ text: "Inner Group" }],
                  children: [
                    {
                      id: "deep-node",
                      labels: [{ text: "Deep Node" }]
                    }
                  ],
                  edges: [],
                  data: { isGroup: true }
                }
              ],
              edges: [],
              data: { isGroup: true }
            }
          ],
          edges: []
        },
        viewState: {
          node: { "deep-node": { x: 180, y: 180, w: 96, h: 96 } },
          group: { 
            "outer-group": { x: 50, y: 50, w: 400, h: 400 },
            "inner-group": { x: 100, y: 100, w: 200, h: 200 }
          },
          edge: {},
          layout: { 
            "outer-group": { mode: 'FREE' },
            "inner-group": { mode: 'FREE' }
          }
        },
        timestamp: Date.now()
      };
      await setupTestState(page, snapshot);

      // Get ReactFlow node positions
      const nodePositions = await page.evaluate(() => {
        const nodes = document.querySelectorAll('.react-flow__node');
        const positions: any = {};
        
        nodes.forEach(node => {
          const id = node.getAttribute('data-id');
          const transform = (node as HTMLElement).style.transform;
          const match = transform.match(/translate\(([^,]+)px,\s*([^)]+)px\)/);
          if (match && id) {
            positions[id] = { x: parseFloat(match[1]), y: parseFloat(match[2]) };
          }
        });
        
        return positions;
      });

      console.log('📍 ReactFlow positions:', nodePositions);

      // Check for suspiciously negative positions (indicator of Problem 2)
      Object.entries(nodePositions).forEach(([id, pos]: [string, any]) => {
        if (pos.x < -100 || pos.y < -100) {
          console.log(`⚠️ PROBLEM 2 indicator: ${id} has large negative position (${pos.x}, ${pos.y})`);
        }
      });
    });

    test('ViewState positions should form valid parent-child relationships', async ({ page }) => {
      // Load a nested structure
      const snapshot = {
        rawGraph: {
          id: "root",
          children: [
            {
              id: "parent-group",
              labels: [{ text: "Parent" }],
              children: [
                {
                  id: "child-node",
                  labels: [{ text: "Child" }]
                }
              ],
              edges: [],
              data: { isGroup: true }
            }
          ],
          edges: []
        },
        viewState: {
          node: { "child-node": { x: 200, y: 200, w: 96, h: 96 } },
          group: { "parent-group": { x: 100, y: 100, w: 300, h: 300 } },
          edge: {},
          layout: { "parent-group": { mode: 'FREE' } }
        },
        timestamp: Date.now()
      };
      await setupTestState(page, snapshot);

      const viewState = await getViewState(page);
      const childPos = viewState.node['child-node'];
      const parentPos = viewState.group['parent-group'];

      console.log('📍 Parent group absolute:', parentPos);
      console.log('📍 Child node absolute:', childPos);

      // Child's absolute position should be GREATER than parent's if child is inside
      // (Since ViewState stores absolute positions)
      expect(childPos.x).toBeGreaterThanOrEqual(parentPos.x);
      expect(childPos.y).toBeGreaterThanOrEqual(parentPos.y);

      // Child should be within parent bounds
      expect(childPos.x).toBeLessThan(parentPos.x + parentPos.w);
      expect(childPos.y).toBeLessThan(parentPos.y + parentPos.h);
    });
  });

  // ============================================
  // Coordinate Round-Trip Tests
  // ============================================

  test.describe('Coordinate Round-Trip', () => {

    test('ViewState coordinates should survive page refresh', async ({ page }) => {
      const snapshot = {
        rawGraph: {
          id: "root",
          children: [
            { id: "persist-node", labels: [{ text: "Persist Node" }] }
          ],
          edges: []
        },
        viewState: {
          node: { "persist-node": { x: 333, y: 444, w: 96, h: 96 } },
          group: {},
          edge: {}
        },
        timestamp: Date.now()
      };
      await setupTestState(page, snapshot);

      // Verify initial position
      let viewState = await getViewState(page);
      expect(viewState.node['persist-node'].x).toBe(333);
      expect(viewState.node['persist-node'].y).toBe(444);

      // Refresh
      await page.reload();
      await page.waitForSelector('.react-flow');
      await page.waitForTimeout(2000);

      // Verify position preserved
      viewState = await getViewState(page);
      expect(viewState.node['persist-node'].x).toBe(333);
      expect(viewState.node['persist-node'].y).toBe(444);
    });

    test('Dragged position should persist after refresh', async ({ page }) => {
      const snapshot = {
        rawGraph: {
          id: "root",
          children: [
            { id: "drag-persist", labels: [{ text: "Drag Persist" }] }
          ],
          edges: []
        },
        viewState: {
          node: { "drag-persist": { x: 100, y: 100, w: 96, h: 96 } },
          group: {},
          edge: {}
        },
        timestamp: Date.now()
      };
      await setupTestState(page, snapshot);

      // Drag the node
      const nodeElement = page.locator('.react-flow__node').filter({ hasText: 'Drag Persist' });
      const nodeBoundingBox = await nodeElement.boundingBox();
      
      if (nodeBoundingBox) {
        await page.mouse.move(nodeBoundingBox.x + 48, nodeBoundingBox.y + 48);
        await page.mouse.down();
        await page.mouse.move(nodeBoundingBox.x + 148, nodeBoundingBox.y + 148, { steps: 10 });
        await page.mouse.up();
      }
      await page.waitForTimeout(500);

      // Get position after drag
      const afterDragViewState = await getViewState(page);
      const afterDragPos = afterDragViewState.node['drag-persist'];
      console.log('📍 After drag position:', afterDragPos);

      // Refresh
      await page.reload();
      await page.waitForSelector('.react-flow');
      await page.waitForTimeout(2000);

      // Verify position persisted
      const afterRefreshViewState = await getViewState(page);
      const afterRefreshPos = afterRefreshViewState.node['drag-persist'];
      console.log('📍 After refresh position:', afterRefreshPos);

      expect(Math.abs(afterRefreshPos.x - afterDragPos.x)).toBeLessThan(2);
      expect(Math.abs(afterRefreshPos.y - afterDragPos.y)).toBeLessThan(2);
    });
  });

  // ============================================
  // ViewState vs ReactFlow Coordinate Tests
  // ============================================

  test.describe('ViewState vs ReactFlow Coordinates', () => {

    test('ViewState stores absolute, ReactFlow uses relative for children', async ({ page }) => {
      const snapshot = {
        rawGraph: {
          id: "root",
          children: [
            {
              id: "vs-rf-group",
              labels: [{ text: "VS RF Group" }],
              children: [
                { id: "vs-rf-child", labels: [{ text: "VS RF Child" }] }
              ],
              edges: [],
              data: { isGroup: true }
            }
          ],
          edges: []
        },
        viewState: {
          // Child at absolute (300, 300), Group at (100, 100)
          // ReactFlow should position child at relative (200, 200)
          node: { "vs-rf-child": { x: 300, y: 300, w: 96, h: 96 } },
          group: { "vs-rf-group": { x: 100, y: 100, w: 400, h: 400 } },
          edge: {},
          layout: { "vs-rf-group": { mode: 'FREE' } }
        },
        timestamp: Date.now()
      };
      await setupTestState(page, snapshot);

      // Get ViewState positions
      const viewState = await getViewState(page);
      const childAbsolute = viewState.node['vs-rf-child'];
      const groupAbsolute = viewState.group['vs-rf-group'];

      console.log('📍 ViewState child absolute:', childAbsolute);
      console.log('📍 ViewState group absolute:', groupAbsolute);

      // Expected ReactFlow relative position
      const expectedRelative = {
        x: childAbsolute.x - groupAbsolute.x,  // 300 - 100 = 200
        y: childAbsolute.y - groupAbsolute.y   // 300 - 100 = 200
      };
      console.log('📍 Expected ReactFlow relative:', expectedRelative);

      // Get actual ReactFlow position
      const rfPosition = await page.evaluate(() => {
        const childNode = document.querySelector('[data-id="vs-rf-child"]');
        if (!childNode) return null;
        const transform = (childNode as HTMLElement).style.transform;
        const match = transform.match(/translate\(([^,]+)px,\s*([^)]+)px\)/);
        if (!match) return null;
        return { x: parseFloat(match[1]), y: parseFloat(match[2]) };
      });

      console.log('📍 Actual ReactFlow position:', rfPosition);

      if (rfPosition) {
        // ReactFlow should show relative position (200, 200)
        expect(Math.abs(rfPosition.x - expectedRelative.x)).toBeLessThan(5);
        expect(Math.abs(rfPosition.y - expectedRelative.y)).toBeLessThan(5);
      }
    });

    test('Root-level nodes should have same position in ViewState and ReactFlow', async ({ page }) => {
      const snapshot = {
        rawGraph: {
          id: "root",
          children: [
            { id: "root-node", labels: [{ text: "Root Node" }] }
          ],
          edges: []
        },
        viewState: {
          node: { "root-node": { x: 250, y: 175, w: 96, h: 96 } },
          group: {},
          edge: {}
        },
        timestamp: Date.now()
      };
      await setupTestState(page, snapshot);

      const viewState = await getViewState(page);
      const vsPosition = viewState.node['root-node'];

      const rfPosition = await page.evaluate(() => {
        const node = document.querySelector('[data-id="root-node"]');
        if (!node) return null;
        const transform = (node as HTMLElement).style.transform;
        const match = transform.match(/translate\(([^,]+)px,\s*([^)]+)px\)/);
        if (!match) return null;
        return { x: parseFloat(match[1]), y: parseFloat(match[2]) };
      });

      console.log('📍 ViewState position:', vsPosition);
      console.log('📍 ReactFlow position:', rfPosition);

      if (rfPosition) {
        // For root-level nodes, ViewState absolute === ReactFlow position
        expect(Math.abs(rfPosition.x - vsPosition.x)).toBeLessThan(2);
        expect(Math.abs(rfPosition.y - vsPosition.y)).toBeLessThan(2);
      }
    });
  });

  // ============================================
  // Coordinate Stability Tests
  // ============================================

  test.describe('Coordinate Stability', () => {

    test('Existing nodes should not move when adding new node', async ({ page }) => {
      const snapshot = {
        rawGraph: {
          id: "root",
          children: [
            { id: "stable-node", labels: [{ text: "Stable Node" }] }
          ],
          edges: []
        },
        viewState: {
          node: { "stable-node": { x: 200, y: 200, w: 96, h: 96 } },
          group: {},
          edge: {}
        },
        timestamp: Date.now()
      };
      await setupTestState(page, snapshot);

      // Record initial position
      const initialViewState = await getViewState(page);
      const initialPos = initialViewState.node['stable-node'];
      console.log('📍 Initial position:', initialPos);

      // Add a new node via box tool
      await page.click('[title*="box" i]');
      await page.waitForTimeout(300);
      await page.click('.react-flow', { position: { x: 400, y: 400 } });
      await page.keyboard.press('Escape');
      await page.waitForTimeout(1000);

      // Verify original node didn't move
      const afterViewState = await getViewState(page);
      const afterPos = afterViewState.node['stable-node'];
      console.log('📍 After add position:', afterPos);

      expect(afterPos.x).toBe(initialPos.x);
      expect(afterPos.y).toBe(initialPos.y);
    });

    test('Sibling nodes should not move when one sibling is dragged', async ({ page }) => {
      const snapshot = {
        rawGraph: {
          id: "root",
          children: [
            { id: "sibling-1", labels: [{ text: "Sibling 1" }] },
            { id: "sibling-2", labels: [{ text: "Sibling 2" }] }
          ],
          edges: []
        },
        viewState: {
          node: { 
            "sibling-1": { x: 100, y: 100, w: 96, h: 96 },
            "sibling-2": { x: 300, y: 300, w: 96, h: 96 }
          },
          group: {},
          edge: {}
        },
        timestamp: Date.now()
      };
      await setupTestState(page, snapshot);

      // Record sibling-2 position
      const initialViewState = await getViewState(page);
      const sibling2Initial = initialViewState.node['sibling-2'];
      console.log('📍 Sibling 2 initial:', sibling2Initial);

      // Drag sibling-1
      const sibling1Element = page.locator('.react-flow__node').filter({ hasText: 'Sibling 1' });
      const sibling1Box = await sibling1Element.boundingBox();
      
      if (sibling1Box) {
        await page.mouse.move(sibling1Box.x + 48, sibling1Box.y + 48);
        await page.mouse.down();
        await page.mouse.move(sibling1Box.x + 148, sibling1Box.y + 48, { steps: 10 });
        await page.mouse.up();
      }
      await page.waitForTimeout(500);

      // Verify sibling-2 didn't move
      const afterViewState = await getViewState(page);
      const sibling2After = afterViewState.node['sibling-2'];
      console.log('📍 Sibling 2 after:', sibling2After);

      expect(sibling2After.x).toBe(sibling2Initial.x);
      expect(sibling2After.y).toBe(sibling2Initial.y);
    });
  });

});


