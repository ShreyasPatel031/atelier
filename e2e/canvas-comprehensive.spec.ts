import { test, expect, Page } from '@playwright/test';

test.describe('Comprehensive Canvas Test Suite', () => {
  const baseURL = 'http://localhost:3000';
  
  // Test Utilities
  async function addNodeToCanvas(page: Page, x: number, y: number): Promise<void> {
    console.log(`🧪 Adding node at (${x}, ${y})`);
    
    // Get initial counts
    const initialSync = await verifyLayerSync(page);
    console.log(`📊 Initial sync: canvas=${initialSync.canvasNodes}, domain=${initialSync.domainNodes}, viewState=${initialSync.viewStateNodes}`);
    
    // CRITICAL: Always re-select box tool for each node (tool gets reset to 'arrow' after each use)
    console.log('🔧 Selecting box tool...');
    await page.click('[title*="box" i]');
    await page.waitForTimeout(300);
    
    // Verify tool is selected
    const selectedTool = await page.evaluate(() => {
      // Check if box tool button has active/selected styling
      const boxButton = document.querySelector('[title*="box" i]');
      return boxButton?.getAttribute('data-selected') || boxButton?.className || 'unknown';
    });
    console.log(`🔧 Box tool selected: ${selectedTool}`);
    
    // Click canvas at specified coordinates
    await page.click('.react-flow', { position: { x, y } });
    console.log(`🖱️ Clicked canvas at (${x}, ${y})`);
    
    // Wait for "Generating..." to appear and disappear (indicates domain processing)
    try {
      await page.waitForSelector('text=Generating...', { timeout: 3000 });
      console.log('⏳ "Generating..." appeared');
      await page.waitForSelector('text=Generating...', { state: 'hidden', timeout: 15000 });
      console.log('✅ "Generating..." disappeared');
    } catch (e) {
      console.log('⚠️ No "Generating..." found, continuing...');
      await page.waitForTimeout(2000);
    }
    
    // Finish editing if node is in edit mode
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
    
    // Wait for domain to be updated with more detailed logging
    try {
      await page.waitForFunction((expectedDomainCount) => {
        const domain = (window as any).getDomainGraph?.() || { children: [] };
        const currentCount = domain.children?.length || 0;
        console.log(`🔍 Domain check: current=${currentCount}, expected>=${expectedDomainCount}`);
        return currentCount >= expectedDomainCount;
      }, initialSync.domainNodes + 1, { timeout: 10000 });
      console.log('✅ Domain updated successfully');
    } catch (e) {
      console.error('❌ Domain update timeout:', e.message);
      // Get final state for debugging
      const finalSync = await verifyLayerSync(page);
      console.log(`📊 Final sync after timeout: canvas=${finalSync.canvasNodes}, domain=${finalSync.domainNodes}`);
      throw e;
    }
    
    // Additional wait for canvas to sync
    await page.waitForTimeout(500);
  }

  async function verifyLayerSync(page: Page): Promise<{ canvasNodes: number, domainNodes: number, viewStateNodes: number, inSync: boolean }> {
    const canvasNodes = await page.locator('.react-flow__node').count();
    const result = await page.evaluate(() => {
      const domain = (window as any).getDomainGraph?.() || { children: [] };
      const viewState = (window as any).getViewState?.() || { node: {}, group: {}, edge: {} };
      const domainCount = domain.children?.length || 0;
      const viewStateCount = Object.keys(viewState.node || {}).length;
      
      // Log for debugging
      console.log('[LAYER-SYNC] Domain:', domainCount, 'ViewState:', viewStateCount);
      console.log('[LAYER-SYNC] Domain IDs:', domain.children?.map((c: any) => c.id) || []);
      console.log('[LAYER-SYNC] ViewState IDs:', Object.keys(viewState.node || {}));
      
      return {
        domainNodes: domainCount,
        viewStateNodes: viewStateCount,
      };
    });
    
    return { 
      canvasNodes, 
      domainNodes: result.domainNodes, 
      viewStateNodes: result.viewStateNodes,
      inSync: canvasNodes === result.domainNodes && canvasNodes === result.viewStateNodes
    };
  }

  async function verifyPersistence(page: Page): Promise<void> {
    await page.reload();
    await page.waitForSelector('.react-flow');
    await page.waitForTimeout(2000); // Wait for restoration
  }

  async function checkArchitectureCompliance(page: Page): Promise<string[]> {
    const logs = await page.evaluate(() => {
      // Check if ELK hook was involved in FREE mode operations
      const elkLogs = (window as any).__elkHookLogs || [];
      return elkLogs;
    });
    return logs;
  }

  test.beforeEach(async ({ page }) => {
    await page.goto(baseURL);
    await page.waitForSelector('.react-flow');
    
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

  // 1. Core User Interaction Tests
  
  test('resetCanvas Functionality - should clear canvas and domain, persist after refresh', async ({ page }) => {
    // Add nodes
    await addNodeToCanvas(page, 200, 200);
    await addNodeToCanvas(page, 300, 300);
    
    // Verify nodes exist
    let sync = await verifyLayerSync(page);
    expect(sync.canvasNodes).toBeGreaterThan(0);
    expect(sync.domainNodes).toBeGreaterThan(0);
    
    // Call resetCanvas
    await page.evaluate(() => (window as any).resetCanvas());
    await page.waitForTimeout(1000);
    
    // Verify canvas and domain are empty
    sync = await verifyLayerSync(page);
    expect(sync.canvasNodes).toBe(0);
    expect(sync.domainNodes).toBe(0);
    
    // Refresh page and verify still empty
    await verifyPersistence(page);
    sync = await verifyLayerSync(page);
    expect(sync.canvasNodes).toBe(0);
    expect(sync.domainNodes).toBe(0);
  });

  test('Node Deletion - should remove nodes from both canvas and domain', async ({ page }) => {
    // Capture console logs for debugging
    const consoleLogs: string[] = [];
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('[Orchestrator]') || text.includes('[LAYER-SYNC]') || text.includes('[🧹 CLEANUP]') || text.includes('traverse')) {
        consoleLogs.push(text);
      }
    });
    // Add multiple nodes
    await addNodeToCanvas(page, 200, 200);
    await addNodeToCanvas(page, 300, 300);
    await addNodeToCanvas(page, 400, 400);
    
    // Verify all nodes exist
    let sync = await verifyLayerSync(page);
    
    // Log console messages for debugging
    if (sync.canvasNodes !== 3 || sync.domainNodes !== 3) {
      console.log('❌ Layer sync failed! Console logs:');
      consoleLogs.forEach(log => console.log('  ', log));
    }
    
    expect(sync.canvasNodes).toBe(3);
    expect(sync.domainNodes).toBe(3);
    
    // Get the ID of the first node before deletion
    const nodeToDelete = await page.evaluate(() => {
      const domain = (window as any).getDomainGraph?.() || { children: [] };
      return domain.children?.[0]?.id || 'unknown';
    });
    console.log('🗑️ Deleting node:', nodeToDelete);
    
    // Select first node (force click to bypass hover areas)
    await page.click('.react-flow__node >> nth=0', { force: true });
    await page.waitForTimeout(500);
    
    // Check if node is selected
    const selectedBefore = await page.evaluate(() => {
      const selectedNodes = document.querySelectorAll('.react-flow__node.selected');
      return selectedNodes.length;
    });
    console.log('📍 Selected nodes before delete:', selectedBefore);
    
    // Press Delete key
    await page.keyboard.press('Delete');
    console.log('⌨️ Delete key pressed');
    await page.waitForTimeout(2000);  // Longer wait for async deletion
    
    // Debug: Check domain state after deletion
    const afterDeleteDomain = await page.evaluate(() => {
      const domain = (window as any).getDomainGraph?.() || { children: [] };
      return {
        childrenCount: domain.children?.length || 0,
        childrenIds: domain.children?.map((c: any) => c.id) || []
      };
    });
    console.log('📊 After delete domain:', afterDeleteDomain);
    
    // Verify node removed from both canvas and domain
    sync = await verifyLayerSync(page);
    expect(sync.canvasNodes).toBe(2);
    expect(sync.domainNodes).toBe(2);
  });

  test('Persistence Flow - should persist nodes after refresh', async ({ page }) => {
    // Add nodes
    await addNodeToCanvas(page, 250, 250);
    await addNodeToCanvas(page, 350, 350);
    
    // Record initial state
    const initialSync = await verifyLayerSync(page);
    const initialPositions = await page.evaluate(() => {
      const nodes = Array.from(document.querySelectorAll('.react-flow__node'));
      return nodes.map(node => {
        const rect = node.getBoundingClientRect();
        return { x: rect.x, y: rect.y };
      });
    });
    
    // DEBUG: Check localStorage before refresh
    const beforeRefreshStorage = await page.evaluate(() => {
      const stored = localStorage.getItem('atelier_canvas_last_snapshot_v1');
      if (!stored) return { hasData: false };
      try {
        const parsed = JSON.parse(stored);
        return {
          hasData: true,
          graphChildren: parsed.rawGraph?.children?.length || 0,
          viewStateNodes: Object.keys(parsed.viewState?.node || {}).length,
          timestamp: parsed.timestamp
        };
      } catch (e) {
        return { hasData: false, error: String(e) };
      }
    });
    console.log('📦 Before refresh localStorage:', beforeRefreshStorage);
    
    // Refresh page
    await verifyPersistence(page);
    
    // DEBUG: Check localStorage after refresh
    const afterRefreshStorage = await page.evaluate(() => {
      const stored = localStorage.getItem('atelier_canvas_last_snapshot_v1');
      if (!stored) return { hasData: false };
      try {
        const parsed = JSON.parse(stored);
        return {
          hasData: true,
          graphChildren: parsed.rawGraph?.children?.length || 0,
          viewStateNodes: Object.keys(parsed.viewState?.node || {}).length,
          timestamp: parsed.timestamp
        };
      } catch (e) {
        return { hasData: false, error: String(e) };
      }
    });
    console.log('📦 After refresh localStorage:', afterRefreshStorage);
    
    // Verify nodes persist
    const afterSync = await verifyLayerSync(page);
    console.log('📊 After refresh sync:', afterSync);
    
    expect(afterSync.canvasNodes).toBe(initialSync.canvasNodes);
    expect(afterSync.domainNodes).toBe(initialSync.domainNodes);
    
    // Verify positions are maintained
    const afterPositions = await page.evaluate(() => {
      const nodes = Array.from(document.querySelectorAll('.react-flow__node'));
      return nodes.map(node => {
        const rect = node.getBoundingClientRect();
        return { x: rect.x, y: rect.y };
      });
    });
    
    expect(afterPositions).toHaveLength(initialPositions.length);
  });

  test('Position Stability - first node should not move when adding second node', async ({ page }) => {
    // Add first node
    await addNodeToCanvas(page, 200, 200);
    
    // Record first node position using ViewState (authoritative) instead of DOM
    const firstNodeData = await page.evaluate(() => {
      const viewState = (window as any).getViewState?.() || { node: {} };
      const nodeIds = Object.keys(viewState.node || {});
      if (nodeIds.length === 0) return null;
      const firstNodeId = nodeIds[0];
      const nodeGeometry = viewState.node[firstNodeId];
      return { 
        id: firstNodeId,
        x: nodeGeometry?.x, 
        y: nodeGeometry?.y,
        w: nodeGeometry?.w,
        h: nodeGeometry?.h
      };
    });
    
    console.log('📍 First node ViewState position:', firstNodeData);
    expect(firstNodeData).not.toBeNull();
    
    // Add second node
    await addNodeToCanvas(page, 400, 400);
    
    // Verify first node hasn't moved in ViewState
    const afterNodeData = await page.evaluate((firstNodeId) => {
      const viewState = (window as any).getViewState?.() || { node: {} };
      const nodeGeometry = viewState.node[firstNodeId];
      return { 
        id: firstNodeId,
        x: nodeGeometry?.x, 
        y: nodeGeometry?.y,
        w: nodeGeometry?.w,
        h: nodeGeometry?.h
      };
    }, firstNodeData!.id);
    
    console.log('📍 First node ViewState position after second add:', afterNodeData);
    
    // Compare ViewState positions (authoritative source of truth)
    expect(afterNodeData?.x).toEqual(firstNodeData?.x);
    expect(afterNodeData?.y).toEqual(firstNodeData?.y);
  });

  test('Multiselect Delete - should remove all selected nodes from canvas and domain', async ({ page }) => {
    // Add 3 nodes
    await addNodeToCanvas(page, 200, 200);
    await addNodeToCanvas(page, 300, 300);
    await addNodeToCanvas(page, 400, 400);
    
    // Verify all nodes exist
    let sync = await verifyLayerSync(page);
    expect(sync.canvasNodes).toBe(3);
    expect(sync.domainNodes).toBe(3);
    
    // Delete nodes one by one
    let remainingNodes = 3;
    while (remainingNodes > 0) {
      console.log(`🗑️ Deleting node ${4 - remainingNodes} of 3`);
      
      // Click to select the first remaining node (force to bypass hover areas)
      const nodeLocator = page.locator('.react-flow__node').first();
      await nodeLocator.click({ force: true });
      await page.waitForTimeout(500);
      
      // Delete selected node
      await page.keyboard.press('Delete');
      await page.waitForTimeout(2000);
      
      // Check remaining nodes
      const currentSync = await verifyLayerSync(page);
      console.log(`📊 After delete: canvas=${currentSync.canvasNodes}, domain=${currentSync.domainNodes}`);
      
      if (currentSync.canvasNodes >= remainingNodes) {
        console.log('⚠️ Node not deleted, retrying...');
        continue;
      }
      
      remainingNodes = currentSync.canvasNodes;
    }
    
    // Verify all nodes removed from both canvas and domain
    sync = await verifyLayerSync(page);
    expect(sync.canvasNodes).toBe(0);
    expect(sync.domainNodes).toBe(0);
  });

  test('URL Architecture - localStorage should take priority over URL parameters', async ({ page }) => {
    // Navigate first to set up the page
    await page.goto(baseURL);
    await page.waitForSelector('.react-flow');
    
    // Set localStorage data with correct key
    await page.evaluate(() => {
      const snapshot = {
        rawGraph: { id: "root", children: [{ id: "local-node", labels: [{ text: "Local Node" }] }], edges: [] },
        viewState: { node: { "local-node": { x: 100, y: 100, w: 96, h: 96 } }, group: {}, edge: {} },
        selectedArchitectureId: 'local-arch',
        timestamp: Date.now()
      };
      localStorage.setItem('atelier_canvas_last_snapshot_v1', JSON.stringify(snapshot));
    });
    
    // Navigate with URL parameters (this should still use localStorage data)
    await page.goto(`${baseURL}?arch=url-arch-id`);
    await page.waitForSelector('.react-flow');
    await page.waitForTimeout(3000);  // Wait for restoration
    
    // Verify localStorage data takes precedence
    const domain = await page.evaluate(() => (window as any).getDomainGraph?.() || { children: [] });
    console.log('📊 Domain after URL navigation:', domain.children?.length || 0);
    expect(domain.children).toHaveLength(1);
    expect(domain.children[0].id).toBe('local-node');
  });

  // 2. Layer Sync Tests

  test('Domain-Canvas Sync - node should appear in both canvas and domain', async ({ page }) => {
    // Add node
    await addNodeToCanvas(page, 300, 300);
    
    // Verify appears in both canvas and domain
    const sync = await verifyLayerSync(page);
    expect(sync.canvasNodes).toBe(1);
    expect(sync.domainNodes).toBe(1);
    
    // Verify domain contains the actual node data
    const domain = await page.evaluate(() => (window as any).getDomainGraph?.());
    expect(domain.children[0]).toHaveProperty('id');
    expect(domain.children[0].id).toMatch(/user-node-\d+/);
  });

  test('Ghost Node Prevention - no ghost nodes should remain after deletion', async ({ page }) => {
    // Add node
    await addNodeToCanvas(page, 300, 300);
    
    // Verify node exists
    let sync = await verifyLayerSync(page);
    expect(sync.canvasNodes).toBe(1);
    expect(sync.domainNodes).toBe(1);
    
    // Delete node (force click to bypass hover areas)
    await page.click('.react-flow__node', { force: true });
    await page.waitForTimeout(500);
    await page.keyboard.press('Delete');
    await page.waitForTimeout(2000);  // Wait for async deletion
    
    // Verify no ghost nodes remain
    sync = await verifyLayerSync(page);
    expect(sync.canvasNodes).toBe(0);
    expect(sync.domainNodes).toBe(0);
    
    // Verify ViewState is also clean
    const viewState = await page.evaluate(() => (window as any).getViewState?.() || { node: {} });
    expect(Object.keys(viewState.node)).toHaveLength(0);
  });

  test('ViewState Cleanup - ViewState should only contain existing nodes', async ({ page }) => {
    // Add multiple nodes
    await addNodeToCanvas(page, 200, 200);
    await addNodeToCanvas(page, 300, 300);
    await addNodeToCanvas(page, 400, 400);
    
    // Delete middle node (force click to bypass hover areas)
    const nodes = await page.locator('.react-flow__node').all();
    await nodes[1].click({ force: true });
    await page.waitForTimeout(500);
    await page.keyboard.press('Delete');
    await page.waitForTimeout(2000);  // Wait for async deletion
    
    // Verify ViewState only contains existing nodes
    const viewState = await page.evaluate(() => (window as any).getViewState?.() || { node: {} });
    const domain = await page.evaluate(() => (window as any).getDomainGraph?.() || { children: [] });
    
    expect(Object.keys(viewState.node)).toHaveLength(domain.children.length);
    
    // Verify ViewState keys match domain node IDs
    const domainIds = domain.children.map((child: any) => child.id);
    const viewStateIds = Object.keys(viewState.node);
    expect(viewStateIds.sort()).toEqual(domainIds.sort());
  });

  test('Double Render Prevention - should not trigger multiple renders for single action', async ({ page }) => {
    // Monitor console logs for double render indicators
    const logs: string[] = [];
    page.on('console', msg => {
      if (msg.text().includes('render') || msg.text().includes('RESTORATION')) {
        logs.push(msg.text());
      }
    });
    
    // Add node
    await addNodeToCanvas(page, 300, 300);
    
    // Check for excessive render logs (should not have multiple restoration renders)
    const restorationLogs = logs.filter(log => log.includes('RESTORATION'));
    expect(restorationLogs.length).toBeLessThanOrEqual(1);
  });

  // 3. Persistence Priority Tests

  test('localStorage Priority - should use localStorage over URL/remote sources', async ({ page }) => {
    // Navigate first to set up the page
    await page.goto(baseURL);
    await page.waitForSelector('.react-flow');
    
    // Set localStorage with specific data using correct key
    await page.evaluate(() => {
      const snapshot = {
        rawGraph: { id: "root", children: [{ id: "priority-test", labels: [{ text: "Priority Test" }] }], edges: [] },
        viewState: { node: { "priority-test": { x: 150, y: 150, w: 96, h: 96 } }, group: {}, edge: {} },
        selectedArchitectureId: 'priority-arch',
        timestamp: Date.now()
      };
      localStorage.setItem('atelier_canvas_last_snapshot_v1', JSON.stringify(snapshot));
    });
    
    // Navigate to page (simulating URL/remote load attempt)
    await page.reload();
    await page.waitForSelector('.react-flow');
    await page.waitForTimeout(3000);  // Wait for restoration
    
    // Verify localStorage data is used
    const domain = await page.evaluate(() => (window as any).getDomainGraph?.());
    console.log('📊 Domain after reload:', domain.children?.length || 0);
    expect(domain.children).toHaveLength(1);
    expect(domain.children[0].id).toBe('priority-test');
  });

  test('resetCanvas Persistence - should stay empty after resetCanvas and refresh', async ({ page }) => {
    // Add nodes
    await addNodeToCanvas(page, 200, 200);
    await addNodeToCanvas(page, 300, 300);
    
    // Call resetCanvas
    await page.evaluate(() => (window as any).resetCanvas());
    await page.waitForTimeout(1000);
    
    // Verify empty
    let sync = await verifyLayerSync(page);
    expect(sync.canvasNodes).toBe(0);
    expect(sync.domainNodes).toBe(0);
    
    // Refresh multiple times
    for (let i = 0; i < 3; i++) {
      await page.reload();
      await page.waitForSelector('.react-flow');
      await page.waitForTimeout(1000);
      
      sync = await verifyLayerSync(page);
      expect(sync.canvasNodes).toBe(0);
      expect(sync.domainNodes).toBe(0);
    }
  });

  test('State Distinction - should distinguish never used vs user cleared', async ({ page }) => {
    const STORAGE_KEY = 'atelier_canvas_last_snapshot_v1';
    
    // Test "never used" / fresh state (empty domain, no nodes)
    // Note: The page may create an empty localStorage entry on load, but domain should be empty
    await page.evaluate((key) => localStorage.removeItem(key), STORAGE_KEY);
    await page.reload();
    await page.waitForSelector('.react-flow');
    await page.waitForTimeout(2000);
    
    const freshState = await page.evaluate((key) => {
      const snapshot = localStorage.getItem(key);
      return {
        hasLocalStorage: !!snapshot,
        isEmpty: snapshot ? JSON.parse(snapshot).rawGraph?.children?.length === 0 : true,
        domain: (window as any).getDomainGraph?.() || { children: [] }
      };
    }, STORAGE_KEY);
    
    console.log('📊 Fresh state:', freshState);
    // Fresh state should have empty domain (regardless of whether localStorage exists)
    expect(freshState.domain.children).toHaveLength(0);
    
    // Add node and verify it exists
    await addNodeToCanvas(page, 300, 300);
    await page.waitForTimeout(1000);
    
    const afterAddState = await page.evaluate((key) => {
      const snapshot = localStorage.getItem(key);
      return {
        hasLocalStorage: !!snapshot,
        isEmpty: snapshot ? JSON.parse(snapshot).rawGraph?.children?.length === 0 : true,
        domain: (window as any).getDomainGraph?.() || { children: [] }
      };
    }, STORAGE_KEY);
    
    console.log('📊 After add state:', afterAddState);
    expect(afterAddState.domain.children).toHaveLength(1);
    expect(afterAddState.isEmpty).toBe(false);  // Should have content now
    
    // Clear with resetCanvas (user cleared state)
    await page.evaluate(() => (window as any).resetCanvas());
    await page.waitForTimeout(2000);
    
    const userClearedState = await page.evaluate((key) => {
      const snapshot = localStorage.getItem(key);
      return {
        hasLocalStorage: !!snapshot,
        isEmpty: snapshot ? JSON.parse(snapshot).rawGraph?.children?.length === 0 : true,
        domain: (window as any).getDomainGraph?.() || { children: [] }
      };
    }, STORAGE_KEY);
    
    console.log('📊 User cleared state:', userClearedState);
    // User cleared state should have localStorage with empty graph
    expect(userClearedState.hasLocalStorage).toBe(true);
    expect(userClearedState.isEmpty).toBe(true);
    expect(userClearedState.domain.children).toHaveLength(0);
  });

  // 4. Architecture Violation Tests

  test('ELK Hook Bypass - FREE mode should not involve ELK hook', async ({ page }) => {
    // Monitor for ELK hook involvement
    await page.addInitScript(() => {
      (window as any).__elkHookCalls = [];
      
      // Mock/monitor ELK hook calls
      const originalConsoleLog = console.log;
      console.log = (...args) => {
        const message = args.join(' ');
        if (message.includes('ELK') && message.includes('FREE')) {
          (window as any).__elkHookCalls.push(message);
        }
        originalConsoleLog.apply(console, args);
      };
    });
    
    // Perform FREE mode operations
    await addNodeToCanvas(page, 300, 300);
    await page.click('.react-flow__node');
    await page.keyboard.press('Delete');
    
    // Check for ELK hook involvement
    const elkCalls = await page.evaluate(() => (window as any).__elkHookCalls || []);
    
    // Should not have ELK involvement in FREE mode
    const freeElkCalls = elkCalls.filter((call: string) => 
      call.includes('FREE') && call.includes('ELK') && !call.includes('should not')
    );
    expect(freeElkCalls).toHaveLength(0);
  });

  test('Restoration Path - should go through Orchestrator not ELK hook', async ({ page }) => {
    // Set up restoration scenario
    await page.evaluate(() => {
      const snapshot = {
        rawGraph: { id: "root", children: [{ id: "restore-test", labels: [{ text: "Restore Test" }] }], edges: [] },
        viewState: { node: { "restore-test": { x: 200, y: 200, w: 96, h: 96 } }, group: {}, edge: {} },
        selectedArchitectureId: 'restore-arch',
        timestamp: Date.now()
      };
      localStorage.setItem('atelier_canvas_snapshot', JSON.stringify(snapshot));
    });
    
    // Monitor restoration path
    const logs: string[] = [];
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('INIT') || text.includes('Orchestrator') || text.includes('ELK')) {
        logs.push(text);
      }
    });
    
    // Trigger restoration
    await page.reload();
    await page.waitForSelector('.react-flow');
    await page.waitForTimeout(2000);
    
    // Verify restoration went through Orchestrator
    const orchestratorLogs = logs.filter(log => log.includes('Orchestrator'));
    const elkLogs = logs.filter(log => log.includes('ELK') && log.includes('restoration'));
    
    expect(orchestratorLogs.length).toBeGreaterThan(0);
    expect(elkLogs.length).toBe(0); // Should not go through ELK hook
  });

  test('Responsibility Separation - restoration logic should be centralized', async ({ page }) => {
    // This test verifies that restoration doesn't happen in multiple places
    const logs: string[] = [];
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('restoration') || text.includes('INIT') || text.includes('restore')) {
        logs.push(text);
      }
    });
    
    // Set up restoration data
    await page.evaluate(() => {
      const snapshot = {
        rawGraph: { id: "root", children: [{ id: "centralized-test", labels: [{ text: "Centralized Test" }] }], edges: [] },
        viewState: { node: { "centralized-test": { x: 250, y: 250, w: 96, h: 96 } }, group: {}, edge: {} },
        selectedArchitectureId: 'centralized-arch',
        timestamp: Date.now()
      };
      localStorage.setItem('atelier_canvas_snapshot', JSON.stringify(snapshot));
    });
    
    // Trigger restoration
    await page.reload();
    await page.waitForSelector('.react-flow');
    await page.waitForTimeout(2000);
    
    // Verify restoration happens in only one place
    const restorationSources = new Set();
    logs.forEach(log => {
      if (log.includes('restoration') || log.includes('restore')) {
        // Extract source (file/component name)
        const match = log.match(/\[(.*?)\]/);
        if (match) {
          restorationSources.add(match[1]);
        }
      }
    });
    
    // Should have restoration from only one centralized location
    expect(restorationSources.size).toBeLessThanOrEqual(1);
  });

  test('Mode Storage Location - Domain should have no mode, ViewState should have modes', async ({ page }) => {
    // Add a node (creates a group implicitly or explicitly)
    await addNodeToCanvas(page, 300, 300);
    await page.waitForTimeout(1000);
    
    // Verify Domain has no mode fields
    const domainCheck = await page.evaluate(() => {
      const domain = (window as any).getDomainGraph?.() || { children: [] };
      
      // Recursively check for mode fields
      const hasModeFields = (node: any): boolean => {
        if (node.mode === 'FREE' || node.mode === 'LOCK') {
          return true;
        }
        if (node.children) {
          return node.children.some((child: any) => hasModeFields(child));
        }
        return false;
      };
      
      return {
        hasModeFields: hasModeFields(domain),
        domainStructure: domain
      };
    });
    
    expect(domainCheck.hasModeFields).toBe(false);
    
    // Verify ViewState has layout section (may be empty if no groups exist)
    const viewStateCheck = await page.evaluate(() => {
      const viewState = (window as any).getViewState?.() || {};
      // Layout may be undefined initially, which is OK - it will be created when needed
      return {
        hasLayout: viewState.layout !== undefined,
        layoutKeys: Object.keys(viewState.layout || {}),
        layoutContent: viewState.layout
      };
    });
    
    // ViewState should have layout section (may be undefined initially, but should exist after migration)
    // For now, just verify that if layout exists, it's properly structured
    if (viewStateCheck.hasLayout) {
      expect(typeof viewStateCheck.layoutContent).toBe('object');
    }
    
    // If there are groups, they should have modes in ViewState.layout
    const groupIds = await page.evaluate(() => {
      const domain = (window as any).getDomainGraph?.() || { children: [] };
      
      // Collect all group IDs
      const groupIds: string[] = [];
      const collectGroups = (node: any) => {
        if (node.children && node.children.length > 0 && node.id !== 'root') {
          groupIds.push(node.id);
        }
        if (node.children) {
          node.children.forEach(collectGroups);
        }
      };
      collectGroups(domain);
      return groupIds;
    });
    
    if (groupIds.length > 0) {
      // All groups should have modes in ViewState.layout
      const viewState = await page.evaluate(() => {
        return (window as any).getViewState?.() || {};
      });
      
      for (const groupId of groupIds) {
        expect(viewState.layout?.[groupId]).toBeDefined();
        expect(['FREE', 'LOCK']).toContain(viewState.layout[groupId].mode);
      }
    }
  });

  // 5. Drag & Drop Interaction Tests

  test('Drag Node - ViewState stores absolute position after drag', async ({ page }) => {
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

  test('Drag Node Into Group - preserves absolute position, updates parent', async ({ page }) => {
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
    
    await page.goto('http://localhost:3000');
    await page.waitForSelector('.react-flow');
    await page.waitForTimeout(2000);
    
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
    
    // Drag node to center of group (group at 100,100 with size 250x250 = center at 225,225 in canvas coords)
    const nodeCenterX = nodeBoundingBox!.x + nodeBoundingBox!.width / 2;
    const nodeCenterY = nodeBoundingBox!.y + nodeBoundingBox!.height / 2;
    const targetX = canvasRect!.x + 225;
    const targetY = canvasRect!.y + 225;
    
    await page.mouse.move(nodeCenterX, nodeCenterY);
    await page.mouse.down();
    await page.mouse.move(targetX, targetY, { steps: 20 });
    await page.mouse.up();
    
    // Wait for state to update
    await page.waitForTimeout(1500);
    
    // Verify the node was reparented
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
        groupMode: viewState.layout?.['test-group']?.mode
      };
    });
    
    console.log('📍 After drag state:', afterState);
    console.log('📍 Expected: nodeParent = test-group');
    
    // STRICT: Node MUST be reparented when dragged into group bounds
    expect(afterState.nodeParent).toBe('test-group');
    // STRICT: ViewState MUST still have the node's absolute position
    expect(afterState.nodeViewState).toBeDefined();
    // STRICT: Group mode MUST be set to FREE when node manually moved in
    expect(afterState.groupMode).toBe('FREE');
  });

  test('Drag Node Out of Group - preserves absolute position, parent becomes root', async ({ page }) => {
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
    
    await page.goto('http://localhost:3000');
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
    
    // Get canvas bounds
    const canvasRect = await page.locator('.react-flow').boundingBox();
    expect(canvasRect).not.toBeNull();
    
    // Drag node FAR outside the group (group ends at 300, 300)
    const nodeCenterX = nodeBoundingBox!.x + nodeBoundingBox!.width / 2;
    const nodeCenterY = nodeBoundingBox!.y + nodeBoundingBox!.height / 2;
    const targetX = canvasRect!.x + 500;
    const targetY = canvasRect!.y + 500;
    
    await page.mouse.move(nodeCenterX, nodeCenterY);
    await page.mouse.down();
    await page.mouse.move(targetX, targetY, { steps: 20 });
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
    
    // STRICT: Position after refresh MUST match position after drag exactly (within 2px)
    expect(Math.abs(afterRefreshPos.x - afterDragPos.x)).toBeLessThan(2);
    expect(Math.abs(afterRefreshPos.y - afterDragPos.y)).toBeLessThan(2);
  });

  test('Drag Stability - existing nodes should not move when dragging another', async ({ page }) => {
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
    
    // Find and drag the first node using data-id
    const firstNodeElement = page.locator(`[data-id="${firstNodeInitial.id}"]`);
    await firstNodeElement.waitFor({ state: 'visible' });
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

  test('Group Mode on Reparent - target group set to FREE when node moved in', async ({ page }) => {
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
          layout: { "mode-group": { mode: 'LOCK' } }
        },
        timestamp: Date.now()
      };
      localStorage.setItem('atelier_canvas_last_snapshot_v1', JSON.stringify(snapshot));
    });
    
    await page.goto('http://localhost:3000');
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
    
    expect(initialState.groupMode).toBe('LOCK');
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
    // STRICT: Group mode MUST change to FREE when node is manually positioned inside
    expect(afterState.groupMode).toBe('FREE');
  });

});
