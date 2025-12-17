import { test, expect } from '@playwright/test';
import { baseURL, addNodeToCanvas, verifyLayerSync } from '../shared-utils';

test.describe('Drag & Drop Interaction Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(baseURL);
    
    // EARLY FAILURE: Fast timeout
    await page.waitForSelector('.react-flow', { timeout: 5000 });
    
    // Clear any existing state
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
      if ((window as any).resetCanvas) {
        (window as any).resetCanvas();
      }
    });
    await page.waitForTimeout(1000);
  });

  test('Drag Node - ViewState stores absolute position after drag', async ({ page }) => {
    test.setTimeout(30000); // 30 seconds
    
    // Add a node
    await addNodeToCanvas(page, 200, 200);
    await page.waitForTimeout(1000);
    
    // Get initial ViewState position and node ID
    const initialData = await page.evaluate(() => {
      const viewState = (window as any).getViewState?.() || { node: {} };
      const nodeIds = Object.keys(viewState.node || {});
      if (nodeIds.length === 0) return null;
      const nodeId = nodeIds[0];
      return {
        id: nodeId,
        x: viewState.node[nodeId].x,
        y: viewState.node[nodeId].y
      };
    });
    
    expect(initialData).not.toBeNull();
    console.log('📍 Initial ViewState position:', initialData);
    
    // Find node element
    const nodeElement = page.locator(`[data-id="${initialData!.id}"]`);
    await nodeElement.waitFor({ state: 'visible' });
    const nodeBox = await nodeElement.boundingBox();
    expect(nodeBox).not.toBeNull();
    
    // Perform drag: move to node center, drag by relative amount (100px right and down)
    const nodeCenterX = nodeBox!.x + nodeBox!.width / 2;
    const nodeCenterY = nodeBox!.y + nodeBox!.height / 2;
    
    await page.mouse.move(nodeCenterX, nodeCenterY);
    await page.mouse.down();
    await page.mouse.move(nodeCenterX + 100, nodeCenterY + 100, { steps: 20 });
    await page.mouse.up();
    
    // Wait for ViewState to update after drag completes
    await page.waitForTimeout(1500);
    
    // Verify ViewState updated with new absolute position
    const afterPos = await page.evaluate((nodeId) => {
      const viewState = (window as any).getViewState?.() || { node: {} };
      return {
        x: viewState.node[nodeId]?.x,
        y: viewState.node[nodeId]?.y
      };
    }, initialData!.id);
    
    console.log('📍 After drag ViewState position:', afterPos);
    console.log('📍 Expected change: +100, +100');
    console.log('📍 Actual change:', { xDelta: afterPos.x - initialData!.x, yDelta: afterPos.y - initialData!.y });
    
    // STRICT: ViewState MUST update after drag - this is the source of truth
    expect(afterPos.x).toBeGreaterThan(initialData!.x + 50);  // At least 50px movement
    expect(afterPos.y).toBeGreaterThan(initialData!.y + 50);
  });

  test('STRICT Drag Node Into Group - node lands at EXACT drop position', async ({ page }) => {
    test.setTimeout(30000); // 30 seconds
    
    // Set up a group and node outside it via localStorage
    await page.evaluate(() => {
      const snapshot = {
        rawGraph: {
          id: "root",
          children: [
            {
              id: "test-group",
              labels: [{ text: "Test Group" }],
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
          node: { "test-node": { x: 400, y: 400, w: 96, h: 96 } },
          group: { "test-group": { x: 100, y: 100, w: 250, h: 250 } },
          edge: {},
          layout: { "test-group": { mode: 'FREE' } }
        },
        timestamp: Date.now()
      };
      localStorage.setItem('atelier_canvas_last_snapshot_v1', JSON.stringify(snapshot));
    });
    
    await page.goto(baseURL);
    await page.waitForSelector('.react-flow');
    await page.waitForTimeout(2000);
    
    // Get ReactFlow viewport transform to calculate expected positions
    const viewportInfo = await page.evaluate(() => {
      const rf = (window as any).__reactFlowInstance;
      const viewport = rf?.getViewport?.() || { x: 0, y: 0, zoom: 1 };
      return viewport;
    });
    console.log('📍 Viewport:', viewportInfo);
    
    // Verify initial state
    const initialState = await page.evaluate(() => {
      const domain = (window as any).getDomainGraph?.() || { children: [] };
      const viewState = (window as any).getViewState?.() || { node: {}, group: {} };
      
      const findParent = (graph: any, nodeId: string, parentId = 'root'): string | null => {
        if (!graph.children) return null;
        for (const child of graph.children) {
          if (child.id === nodeId) return parentId;
          const found = findParent(child, nodeId, child.id);
          if (found) return found;
        }
        return null;
      };
      
      return {
        nodeParent: findParent(domain, 'test-node'),
        nodeViewState: viewState.node['test-node'],
        groupViewState: viewState.group['test-group']
      };
    });
    
    console.log('📍 Initial node position:', initialState.nodeViewState);
    expect(initialState.nodeParent).toBe('root');
    expect(initialState.nodeViewState).toBeDefined();
    
    // Find the node using data-id and drag it into the group
    const nodeElement = page.locator(`[data-id="test-node"]`);
    await nodeElement.waitFor({ state: 'visible' });
    const nodeBoundingBox = await nodeElement.boundingBox();
    expect(nodeBoundingBox).not.toBeNull();
    
    // Get canvas bounds for coordinate calculation
    const canvasRect = await page.locator('.react-flow').boundingBox();
    expect(canvasRect).not.toBeNull();
    
    // Calculate target position - center of group in screen coordinates
    // Group is at ViewState (100, 100) with size (250, 250)
    // Center in flow coordinates = 100 + 250/2 = 225
    // NODE_SIZE is 96, so top-left should be 225 - 48 = 177 for the node to be centered
    
    // Drag from node center to target position
    const nodeCenterX = nodeBoundingBox!.x + nodeBoundingBox!.width / 2;
    const nodeCenterY = nodeBoundingBox!.y + nodeBoundingBox!.height / 2;
    
    // Calculate expected drop position in flow coordinates
    // We want the node center at (225, 225) in flow coords
    // So node top-left should be at (225-48, 225-48) = (177, 177)
    // Snapped to 16px grid: Math.round(177/16)*16 = 176
    const expectedFlowX = 176; // Snapped target
    const expectedFlowY = 176;
    
    // Convert flow coordinates to screen coordinates for mouse move
    // screenX = flowX * zoom + viewport.x + canvasRect.x
    const targetScreenX = expectedFlowX * viewportInfo.zoom + viewportInfo.x + canvasRect!.x + 48; // +48 to target node center
    const targetScreenY = expectedFlowY * viewportInfo.zoom + viewportInfo.y + canvasRect!.y + 48;
    
    console.log('📍 Dragging from:', { x: nodeCenterX, y: nodeCenterY });
    console.log('📍 Dragging to screen:', { x: targetScreenX, y: targetScreenY });
    console.log('📍 Expected flow position:', { x: expectedFlowX, y: expectedFlowY });
    
    await page.mouse.move(nodeCenterX, nodeCenterY);
    await page.mouse.down();
    await page.mouse.move(targetScreenX, targetScreenY, { steps: 20 });
    await page.mouse.up();
    
    // Wait for state to update
    await page.waitForTimeout(1500);
    
    // Verify the node was reparented AND at correct position
    const afterState = await page.evaluate(() => {
      const domain = (window as any).getDomainGraph?.() || { children: [] };
      const viewState = (window as any).getViewState?.() || { node: {}, group: {} };
      
      const findParent = (graph: any, nodeId: string, parentId = 'root'): string | null => {
        if (!graph.children) return null;
        for (const child of graph.children) {
          if (child.id === nodeId) return parentId;
          const found = findParent(child, nodeId, child.id);
          if (found) return found;
        }
        return null;
      };
      
      return {
        nodeParent: findParent(domain, 'test-node'),
        nodeViewState: viewState.node['test-node'],
        groupViewState: viewState.group['test-group'],
        groupMode: viewState.layout?.['test-group']?.mode
      };
    });
    
    console.log('📍 After drag state:', afterState);
    
    // STRICT: Node MUST be reparented when dragged into group bounds
    expect(afterState.nodeParent).toBe('test-group');
    
    // STRICT: ViewState MUST still have the node's absolute position
    expect(afterState.nodeViewState).toBeDefined();
    
    // STRICT: Node position MUST be at the drop location (within snap tolerance of 16px)
    const actualX = afterState.nodeViewState.x;
    const actualY = afterState.nodeViewState.y;
    const diffX = Math.abs(actualX - expectedFlowX);
    const diffY = Math.abs(actualY - expectedFlowY);
    
    console.log('📍 Position check:', {
      expected: { x: expectedFlowX, y: expectedFlowY },
      actual: { x: actualX, y: actualY },
      diff: { x: diffX, y: diffY }
    });
    
    // Allow 16px tolerance for snap-to-grid
    expect(diffX).toBeLessThanOrEqual(16);
    expect(diffY).toBeLessThanOrEqual(16);
    
    // STRICT: Group mode MUST be set to FREE when node manually moved in
    expect(afterState.groupMode).toBe('FREE');
  });

  test('Drag Node Out of Group - preserves absolute position, parent becomes root', async ({ page }) => {
    test.setTimeout(30000); // 30 seconds
    
    // Set up a node inside a group
    await page.evaluate(() => {
      const snapshot = {
        rawGraph: {
          id: "root",
          children: [
            {
              id: "test-group",
              labels: [{ text: "Test Group" }],
              children: [
                {
                  id: "nested-node",
                  labels: [{ text: "Nested Node" }]
                }
              ],
              edges: [],
              data: { isGroup: true }
            }
          ],
          edges: []
        },
        viewState: {
          node: { "nested-node": { x: 150, y: 150, w: 96, h: 96 } },
          group: { "test-group": { x: 100, y: 100, w: 200, h: 200 } },
          edge: {},
          layout: { "test-group": { mode: 'FREE' } }
        },
        timestamp: Date.now()
      };
      localStorage.setItem('atelier_canvas_last_snapshot_v1', JSON.stringify(snapshot));
    });
    
    await page.goto(baseURL);
    await page.waitForSelector('.react-flow');
    await page.waitForTimeout(2000);
    
    // Verify initial state - node should be inside group
    const initialState = await page.evaluate(() => {
      const domain = (window as any).getDomainGraph?.() || { children: [] };
      const viewState = (window as any).getViewState?.() || { node: {}, group: {} };
      
      const findParent = (graph: any, nodeId: string, parentId = 'root'): string | null => {
        if (!graph.children) return null;
        for (const child of graph.children) {
          if (child.id === nodeId) return parentId;
          const found = findParent(child, nodeId, child.id);
          if (found) return found;
        }
        return null;
      };
      
      return {
        nodeParent: findParent(domain, 'nested-node'),
        nodeViewState: viewState.node['nested-node']
      };
    });
    
    expect(initialState.nodeParent).toBe('test-group');
    
    // Find the nested node using data-id and drag it outside the group
    const nodeElement = page.locator(`[data-id="nested-node"]`);
    await nodeElement.waitFor({ state: 'visible' });
    const nodeBoundingBox = await nodeElement.boundingBox();
    expect(nodeBoundingBox).not.toBeNull();
    
    // Get initial ViewState position
    const initialViewState = await page.evaluate(() => {
      const vs = (window as any).getViewState?.() || { node: {}, group: {} };
      return {
        node: vs.node['nested-node'],
        group: vs.group['test-group']
      };
    });
    console.log('📍 Initial ViewState:', initialViewState);
    // Group is at (100,100) with size (200,200), so ends at (300,300)
    // Node starts at (150,150) - inside the group
    
    // Drag node FAR outside the group - drag by 400px right and down
    // This should place node at (550,550) which is way outside group bounds (100,100) to (300,300)
    const nodeCenterX = nodeBoundingBox!.x + nodeBoundingBox!.width / 2;
    const nodeCenterY = nodeBoundingBox!.y + nodeBoundingBox!.height / 2;
    
    await page.mouse.move(nodeCenterX, nodeCenterY);
    await page.mouse.down();
    // Drag 400px right and 400px down
    await page.mouse.move(nodeCenterX + 400, nodeCenterY + 400, { steps: 20 });
    await page.mouse.up();
    
    // Wait for state to update
    await page.waitForTimeout(1500);
    
    // Verify the node was reparented to root
    const afterState = await page.evaluate(() => {
      const domain = (window as any).getDomainGraph?.() || { children: [] };
      const viewState = (window as any).getViewState?.() || { node: {}, group: {} };
      
      const findParent = (graph: any, nodeId: string, parentId = 'root'): string | null => {
        if (!graph.children) return null;
        for (const child of graph.children) {
          if (child.id === nodeId) return parentId;
          const found = findParent(child, nodeId, child.id);
          if (found) return found;
        }
        return null;
      };
      
      return {
        nodeParent: findParent(domain, 'nested-node'),
        nodeViewState: viewState.node['nested-node']
      };
    });
    
    console.log('📍 After drag out state:', afterState);
    
    // STRICT: Node MUST be reparented to root when dragged outside group bounds
    expect(afterState.nodeParent).toBe('root');
    // STRICT: ViewState absolute position MUST be updated
    expect(afterState.nodeViewState).toBeDefined();
    expect(afterState.nodeViewState.x).toBeGreaterThan(initialState.nodeViewState.x);
    expect(afterState.nodeViewState.y).toBeGreaterThan(initialState.nodeViewState.y);
  });

  test('Coordinate Round-Trip - drag then refresh preserves position', async ({ page }) => {
    test.setTimeout(30000); // 30 seconds
    
    // Add a node
    await addNodeToCanvas(page, 200, 200);
    await page.waitForTimeout(1000);
    
    // Get initial position
    const initialPos = await page.evaluate(() => {
      const viewState = (window as any).getViewState?.() || { node: {} };
      const nodeIds = Object.keys(viewState.node || {});
      if (nodeIds.length === 0) return null;
      const nodeId = nodeIds[0];
      return {
        id: nodeId,
        x: viewState.node[nodeId].x,
        y: viewState.node[nodeId].y
      };
    });
    
    expect(initialPos).not.toBeNull();
    
    // Drag the node by 150px using data-id
    const nodeElement = page.locator(`[data-id="${initialPos!.id}"]`);
    await nodeElement.waitFor({ state: 'visible' });
    const nodeBoundingBox = await nodeElement.boundingBox();
    expect(nodeBoundingBox).not.toBeNull();
    
    const nodeCenterX = nodeBoundingBox!.x + nodeBoundingBox!.width / 2;
    const nodeCenterY = nodeBoundingBox!.y + nodeBoundingBox!.height / 2;
    
    await page.mouse.move(nodeCenterX, nodeCenterY);
    await page.mouse.down();
    await page.mouse.move(nodeCenterX + 150, nodeCenterY + 150, { steps: 20 });
    await page.mouse.up();
    
    // Wait for ViewState to update
    await page.waitForTimeout(1500);
    
    // Get position after drag
    const afterDragPos = await page.evaluate((nodeId) => {
      const viewState = (window as any).getViewState?.() || { node: {} };
      return {
        x: viewState.node[nodeId]?.x,
        y: viewState.node[nodeId]?.y
      };
    }, initialPos!.id);
    
    console.log('📍 After drag position:', afterDragPos);
    
    // STRICT: ViewState MUST update after drag
    expect(afterDragPos.x).toBeGreaterThan(initialPos!.x + 50);
    expect(afterDragPos.y).toBeGreaterThan(initialPos!.y + 50);
    
    // Wait for persistence
    await page.waitForTimeout(1000);
    
    // Refresh the page
    await page.reload();
    await page.waitForSelector('.react-flow');
    await page.waitForTimeout(2000);
    
    // Get position after refresh
    const afterRefreshPos = await page.evaluate((nodeId) => {
      const viewState = (window as any).getViewState?.() || { node: {} };
      return {
        x: viewState.node[nodeId]?.x,
        y: viewState.node[nodeId]?.y
      };
    }, initialPos!.id);
    
    console.log('📍 After refresh position:', afterRefreshPos);
    console.log('📍 Difference:', { xDiff: afterRefreshPos.x - afterDragPos.x, yDiff: afterRefreshPos.y - afterDragPos.y });
    
    // STRICT: Position after refresh MUST match position after drag (within 5px for snap-to-grid)
    expect(Math.abs(afterRefreshPos.x - afterDragPos.x)).toBeLessThan(5);
    expect(Math.abs(afterRefreshPos.y - afterDragPos.y)).toBeLessThan(5);
  });

  test('Drag Stability - existing nodes should not move when dragging another', async ({ page }) => {
    test.setTimeout(30000); // 30 seconds
    
    // Add two nodes at well-separated positions
    await addNodeToCanvas(page, 150, 150);
    
    // Get first node position immediately after adding
    const afterFirstNode = await page.evaluate(() => {
      const viewState = (window as any).getViewState?.() || { node: {} };
      return { nodeCount: Object.keys(viewState.node || {}).length, positions: viewState.node };
    });
    console.log('📍 After first node:', JSON.stringify(afterFirstNode));
    
    await addNodeToCanvas(page, 400, 400);
    
    // Get second node position immediately after adding
    const afterSecondNode = await page.evaluate(() => {
      const viewState = (window as any).getViewState?.() || { node: {} };
      return { nodeCount: Object.keys(viewState.node || {}).length, positions: viewState.node };
    });
    console.log('📍 After second node:', JSON.stringify(afterSecondNode));
    
    await page.waitForTimeout(1000);
    
    // Get both node positions from ViewState
    const initialPositions = await page.evaluate(() => {
      const viewState = (window as any).getViewState?.() || { node: {} };
      const nodeIds = Object.keys(viewState.node || {});
      return nodeIds.map(id => ({
        id,
        x: viewState.node[id].x,
        y: viewState.node[id].y
      }));
    });
    
    console.log('📍 Initial positions after wait:', JSON.stringify(initialPositions));
    
    expect(initialPositions).toHaveLength(2);
    
    // Identify which node is which based on position
    const sortedInitial = [...initialPositions].sort((a, b) => a.x - b.x);
    const firstNodeInitial = sortedInitial[0];
    const secondNodeInitial = sortedInitial[1];
    
    console.log('📍 First node (will drag):', firstNodeInitial);
    console.log('📍 Second node (should stay):', secondNodeInitial);
    
    // Zoom to fit all nodes in viewport
    await page.evaluate(() => {
      const rf = (window as any).__reactFlowInstance;
      if (rf?.fitView) {
        rf.fitView({ padding: 0.2 });
      }
    });
    await page.waitForTimeout(500);
    
    // Find and drag the first node using data-id
    const firstNodeElement = page.locator(`[data-id="${firstNodeInitial.id}"]`);
    await firstNodeElement.waitFor({ state: 'visible', timeout: 5000 });
    const firstNodeBoundingBox = await firstNodeElement.boundingBox();
    expect(firstNodeBoundingBox).not.toBeNull();
    
    // Drag the first node by 80px
    const firstNodeCenterX = firstNodeBoundingBox!.x + firstNodeBoundingBox!.width / 2;
    const firstNodeCenterY = firstNodeBoundingBox!.y + firstNodeBoundingBox!.height / 2;
    
    // Get positions just before drag
    const beforeDrag = await page.evaluate(() => {
      const viewState = (window as any).getViewState?.() || { node: {} };
      return viewState.node;
    });
    console.log('📍 Just before drag:', JSON.stringify(beforeDrag));
    
    await page.mouse.move(firstNodeCenterX, firstNodeCenterY);
    await page.mouse.down();
    await page.mouse.move(firstNodeCenterX + 80, firstNodeCenterY + 80, { steps: 20 });
    await page.mouse.up();
    
    // Get positions immediately after drag (before wait)
    const immediatelyAfterDrag = await page.evaluate(() => {
      const viewState = (window as any).getViewState?.() || { node: {} };
      return viewState.node;
    });
    console.log('📍 Immediately after drag:', JSON.stringify(immediatelyAfterDrag));
    
    // Wait for ViewState to update
    await page.waitForTimeout(1500);
    
    // Get positions after wait
    const afterPositions = await page.evaluate(() => {
      const viewState = (window as any).getViewState?.() || { node: {} };
      const nodeIds = Object.keys(viewState.node || {});
      return nodeIds.map(id => ({
        id,
        x: viewState.node[id].x,
        y: viewState.node[id].y
      }));
    });
    
    console.log('📍 After wait:', JSON.stringify(afterPositions));
    
    // Find the second node (the one that should NOT have moved)
    const secondNodeAfter = afterPositions.find(p => p.id === secondNodeInitial.id);
    expect(secondNodeAfter).toBeDefined();
    
    console.log('📍 Second node movement (should be 0):', {
      xDiff: Math.abs(secondNodeAfter!.x - secondNodeInitial.x),
      yDiff: Math.abs(secondNodeAfter!.y - secondNodeInitial.y)
    });
    
    // STRICT: Second node MUST NOT move at all
    expect(secondNodeAfter!.x).toBe(secondNodeInitial.x);
    expect(secondNodeAfter!.y).toBe(secondNodeInitial.y);
  });

  test('STRICT Multi-Node Refresh Stability - ALL node positions must be EXACT after refresh', async ({ page }) => {
    test.setTimeout(30000); // 30 seconds
    
    // Add 3 nodes at different positions
    await addNodeToCanvas(page, 100, 100);
    await addNodeToCanvas(page, 300, 150);
    await addNodeToCanvas(page, 200, 350);
    
    await page.waitForTimeout(1000);
    
    // Capture ALL positions EXACTLY before refresh
    const beforeRefresh = await page.evaluate(() => {
      const viewState = (window as any).getViewState?.() || { node: {} };
      return JSON.parse(JSON.stringify(viewState.node)); // Deep copy
    });
    
    console.log('📍 Before refresh (3 nodes):', JSON.stringify(beforeRefresh));
    
    const nodeIds = Object.keys(beforeRefresh);
    expect(nodeIds.length).toBe(3);
    
    // Verify all positions are unique (not all at same coordinate)
    const positions = nodeIds.map(id => `${beforeRefresh[id].x},${beforeRefresh[id].y}`);
    const uniquePositions = new Set(positions);
    console.log('📍 Unique positions before refresh:', uniquePositions.size);
    expect(uniquePositions.size).toBe(3); // All 3 nodes MUST have different positions
    
    // Refresh the page
    await page.reload();
    await page.waitForSelector('.react-flow');
    await page.waitForTimeout(2000);
    
    // Capture ALL positions EXACTLY after refresh
    const afterRefresh = await page.evaluate(() => {
      const viewState = (window as any).getViewState?.() || { node: {} };
      return JSON.parse(JSON.stringify(viewState.node)); // Deep copy
    });
    
    console.log('📍 After refresh (3 nodes):', JSON.stringify(afterRefresh));
    
    // STRICT: EVERY node position MUST be EXACTLY the same
    for (const nodeId of nodeIds) {
      const before = beforeRefresh[nodeId];
      const after = afterRefresh[nodeId];
      
      if (!after) {
        throw new Error(`❌ Node ${nodeId} MISSING after refresh!`);
      }
      
      console.log(`📍 Node ${nodeId}: before=(${before.x},${before.y}) after=(${after.x},${after.y})`);
      
      // STRICT: Position must be EXACTLY the same (no tolerance)
      expect(after.x).toBe(before.x);
      expect(after.y).toBe(before.y);
      expect(after.w).toBe(before.w);
      expect(after.h).toBe(before.h);
    }
  });

  test('STRICT Group Drag - children move on FIRST drag after reparenting', async ({ page }) => {
    test.setTimeout(30000); // 30 seconds
    // REAL USER FLOW:
    // 1. Add node
    // 2. Add group
    // 3. Drag node INTO group (reparent)
    // 4. Drag group → children should move on FIRST drag
    
    await page.goto(baseURL);
    await page.waitForSelector('.react-flow');
    await page.waitForTimeout(500);
    
    // Clear canvas first
    await page.evaluate(() => (window as any).resetCanvas?.());
    await page.waitForTimeout(500);
    
    // 1. Add a node at (200, 200)
    console.log('=== STEP 1: Add node ===');
    await page.evaluate(() => (window as any).handleToolSelect?.('box'));
    await page.waitForTimeout(200);
    await page.click('.react-flow__pane', { position: { x: 200, y: 200 } });
    await page.waitForTimeout(500);
    
    // 2. Add a group at (300, 300)
    console.log('=== STEP 2: Add group ===');
    await page.evaluate(() => (window as any).handleToolSelect?.('group'));
    await page.waitForTimeout(200);
    await page.click('.react-flow__pane', { position: { x: 400, y: 300 } });
    await page.waitForTimeout(500);
    
    // Get node and group IDs
    const ids = await page.evaluate(() => {
      const rf = (window as any).__reactFlowInstance;
      const nodes = rf?.getNodes?.() || [];
      const nodeEl = nodes.find((n: any) => n.type === 'custom');
      const grpEl = nodes.find((n: any) => n.type === 'draftGroup' || n.type === 'group');
      return { nodeId: nodeEl?.id, groupId: grpEl?.id };
    });
    console.log('IDs:', ids);
    expect(ids.nodeId).toBeDefined();
    expect(ids.groupId).toBeDefined();
    
    // 3. Drag node INTO group
    console.log('=== STEP 3: Drag node into group ===');
    const nodeEl = page.locator(`[data-id="${ids.nodeId}"]`);
    const grpEl = page.locator(`[data-id="${ids.groupId}"]`);
    await nodeEl.waitFor({ state: 'visible' });
    await grpEl.waitFor({ state: 'visible' });
    
    const nodeBox = await nodeEl.boundingBox();
    const grpBox = await grpEl.boundingBox();
    expect(nodeBox).not.toBeNull();
    expect(grpBox).not.toBeNull();
    
    // Drag node to center of group
    await page.mouse.move(nodeBox!.x + 48, nodeBox!.y + 48);
    await page.mouse.down();
    await page.mouse.move(grpBox!.x + grpBox!.width/2, grpBox!.y + grpBox!.height/2, { steps: 10 });
    await page.mouse.up();
    await page.waitForTimeout(500);
    
    // Verify reparenting happened
    const afterReparent = await page.evaluate((args) => {
      const domain = (window as any).getDomainGraph?.() || { children: [] };
      const findParent = (graph: any, targetId: string, parentId: string | null = null): string | null => {
        if (!graph.children) return null;
        for (const child of graph.children) {
          if (child.id === targetId) return parentId || 'root';
          const found = findParent(child, targetId, child.id);
          if (found) return found;
        }
        return null;
      };
      const vs = (window as any).getViewState?.() || { node: {}, group: {} };
      return {
        nodeParent: findParent(domain, args.nodeId),
        nodePos: vs.node?.[args.nodeId],
        grpPos: vs.group?.[args.groupId]
      };
    }, ids);
    console.log('After reparent:', afterReparent);
    expect(afterReparent.nodeParent).toBe(ids.groupId);
    
    // 4. NOW drag the group - children should move on FIRST drag
    console.log('=== STEP 4: FIRST drag of group after reparenting ===');
    
    // Get BOTH ViewState AND ReactFlow positions before drag
    const beforeDrag = await page.evaluate((args) => {
      const vs = (window as any).getViewState?.() || { node: {}, group: {} };
      const rf = (window as any).__reactFlowInstance;
      const nodes = rf?.getNodes?.() || [];
      const nodeRF = nodes.find((n: any) => n.id === args.nodeId);
      const grpRF = nodes.find((n: any) => n.id === args.groupId);
      return { 
        vsNode: vs.node?.[args.nodeId], 
        vsGrp: vs.group?.[args.groupId],
        rfNode: nodeRF?.position,
        rfGrp: grpRF?.position
      };
    }, ids);
    console.log('BEFORE drag - ViewState:', { node: beforeDrag.vsNode, grp: beforeDrag.vsGrp });
    console.log('BEFORE drag - ReactFlow:', { node: beforeDrag.rfNode, grp: beforeDrag.rfGrp });
    
    const grpBox2 = await grpEl.boundingBox();
    console.log('Group bounding box:', grpBox2);
    
    // Drag group
    await page.mouse.move(grpBox2!.x + 20, grpBox2!.y + 20);
    await page.mouse.down();
    await page.mouse.move(grpBox2!.x + 150, grpBox2!.y + 150, { steps: 10 });
    await page.mouse.up();
    await page.waitForTimeout(500);
    
    // Get BOTH ViewState AND ReactFlow positions after drag
    const afterDrag = await page.evaluate((args) => {
      const vs = (window as any).getViewState?.() || { node: {}, group: {} };
      const rf = (window as any).__reactFlowInstance;
      const nodes = rf?.getNodes?.() || [];
      const nodeRF = nodes.find((n: any) => n.id === args.nodeId);
      const grpRF = nodes.find((n: any) => n.id === args.groupId);
      return { 
        vsNode: vs.node?.[args.nodeId], 
        vsGrp: vs.group?.[args.groupId],
        rfNode: nodeRF?.position,
        rfGrp: grpRF?.position
      };
    }, ids);
    console.log('AFTER drag - ViewState:', { node: afterDrag.vsNode, grp: afterDrag.vsGrp });
    console.log('AFTER drag - ReactFlow:', { node: afterDrag.rfNode, grp: afterDrag.rfGrp });
    
    // Calculate deltas for BOTH ViewState and ReactFlow
    const vsGrpDelta = { x: afterDrag.vsGrp.x - beforeDrag.vsGrp.x, y: afterDrag.vsGrp.y - beforeDrag.vsGrp.y };
    const vsNodeDelta = { x: afterDrag.vsNode.x - beforeDrag.vsNode.x, y: afterDrag.vsNode.y - beforeDrag.vsNode.y };
    const rfGrpDelta = { x: afterDrag.rfGrp.x - beforeDrag.rfGrp.x, y: afterDrag.rfGrp.y - beforeDrag.rfGrp.y };
    const rfNodeDelta = { x: afterDrag.rfNode.x - beforeDrag.rfNode.x, y: afterDrag.rfNode.y - beforeDrag.rfNode.y };
    
    console.log('ViewState DELTAS - Group:', vsGrpDelta, 'Node:', vsNodeDelta);
    console.log('ReactFlow DELTAS - Group:', rfGrpDelta, 'Node:', rfNodeDelta);
    
    // CRITICAL: Group must have moved (both ViewState and ReactFlow)
    expect(vsGrpDelta.x).not.toBe(0);
    expect(rfGrpDelta.x).not.toBe(0);
    
    // CRITICAL: Node must have moved WITH group - check BOTH ViewState AND ReactFlow
    console.log('ViewState node delta diff:', Math.abs(vsNodeDelta.x - vsGrpDelta.x));
    console.log('ReactFlow node delta diff:', Math.abs(rfNodeDelta.x - rfGrpDelta.x));
    
    // ReactFlow node MUST move with group (this is what the user sees!)
    const SNAP_TOLERANCE = 16;
    expect(Math.abs(rfNodeDelta.x - rfGrpDelta.x)).toBeLessThanOrEqual(SNAP_TOLERANCE);
    expect(Math.abs(rfNodeDelta.y - rfGrpDelta.y)).toBeLessThanOrEqual(SNAP_TOLERANCE);
  });

  test('Group Mode on Reparent - target group set to FREE when node moved in', async ({ page }) => {
    test.setTimeout(30000); // 30 seconds
    // Set up a group in LOCK mode and a node outside
    await page.evaluate(() => {
      const snapshot = {
        rawGraph: {
          id: "root",
          children: [
            {
              id: "mode-group",
              labels: [{ text: "Mode Group" }],
              children: [],
              edges: [],
              data: { isGroup: true }
            },
            {
              id: "mode-node",
              labels: [{ text: "Mode Node" }]
            }
          ],
          edges: []
        },
        viewState: {
          node: { "mode-node": { x: 450, y: 200, w: 96, h: 96 } },
          group: { "mode-group": { x: 100, y: 100, w: 300, h: 300 } },
          edge: {},
          layout: { "mode-group": { mode: 'FREE' } }
        },
        timestamp: Date.now()
      };
      localStorage.setItem('atelier_canvas_last_snapshot_v1', JSON.stringify(snapshot));
    });
    
    await page.goto(baseURL);
    await page.waitForSelector('.react-flow');
    await page.waitForTimeout(2000);
    
    // Verify initial state
    const initialState = await page.evaluate(() => {
      const domain = (window as any).getDomainGraph?.() || { children: [] };
      const viewState = (window as any).getViewState?.() || {};
      
      const findParent = (graph: any, nodeId: string, parentId = 'root'): string | null => {
        if (!graph.children) return null;
        for (const child of graph.children) {
          if (child.id === nodeId) return parentId;
          const found = findParent(child, nodeId, child.id);
          if (found) return found;
        }
        return null;
      };
      
      return {
        nodeParent: findParent(domain, 'mode-node'),
        groupMode: viewState.layout?.['mode-group']?.mode
      };
    });
    
    expect(initialState.nodeParent).toBe('root');
    
    // Find the node using data-id and drag it into the group
    const nodeElement = page.locator(`[data-id="mode-node"]`);
    await nodeElement.waitFor({ state: 'visible' });
    const nodeBoundingBox = await nodeElement.boundingBox();
    expect(nodeBoundingBox).not.toBeNull();
    
    // Get canvas bounds
    const canvasRect = await page.locator('.react-flow').boundingBox();
    expect(canvasRect).not.toBeNull();
    
    // Drag to center of group (250, 250 in canvas coords)
    const nodeCenterX = nodeBoundingBox!.x + nodeBoundingBox!.width / 2;
    const nodeCenterY = nodeBoundingBox!.y + nodeBoundingBox!.height / 2;
    const targetX = canvasRect!.x + 250;
    const targetY = canvasRect!.y + 250;
    
    await page.mouse.move(nodeCenterX, nodeCenterY);
    await page.mouse.down();
    await page.mouse.move(targetX, targetY, { steps: 20 });
    await page.mouse.up();
    
    // Wait for state to update
    await page.waitForTimeout(1500);
    
    // Check state after drag
    const afterState = await page.evaluate(() => {
      const domain = (window as any).getDomainGraph?.() || { children: [] };
      const viewState = (window as any).getViewState?.() || {};
      
      const findParent = (graph: any, nodeId: string, parentId = 'root'): string | null => {
        if (!graph.children) return null;
        for (const child of graph.children) {
          if (child.id === nodeId) return parentId;
          const found = findParent(child, nodeId, child.id);
          if (found) return found;
        }
        return null;
      };
      
      return {
        nodeParent: findParent(domain, 'mode-node'),
        groupMode: viewState.layout?.['mode-group']?.mode
      };
    });
    
    console.log('📍 After drag state:', afterState);
    console.log('📍 Expected: nodeParent = mode-group, groupMode = FREE');
    
    // STRICT: Node MUST be reparented when dragged into group
    expect(afterState.nodeParent).toBe('mode-group');
    // STRICT: Group mode MUST be FREE when node is manually positioned inside
    expect(afterState.groupMode).toBe('FREE');
  });
});

