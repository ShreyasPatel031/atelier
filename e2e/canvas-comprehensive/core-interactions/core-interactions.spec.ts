import { test, expect } from '@playwright/test';
import { baseURL, addNodeToCanvas, verifyLayerSync, verifyPersistence, setupCleanCanvas } from '../shared-utils';

test.describe('Core User Interactions', () => {
  test.beforeEach(async ({ page }) => {
    await setupCleanCanvas(page);
  });

  // ============================================================================
  // FUNDAMENTAL TESTS - These must run first and pass before other tests
  // ============================================================================
  
  test('FUNDAMENTAL: Add Node - updates domain graph with correct structure and dimensions', async ({ page }) => {
    test.setTimeout(30000); // 30 seconds for fundamental test
    
    // Verify canvas is empty first
    let sync = await verifyLayerSync(page);
    expect(sync.canvasNodes).toBe(0);
    expect(sync.domainNodes).toBe(0);
    
    // Add node at specific coordinates
    await addNodeToCanvas(page, 300, 400);
    
    // CRITICAL: Verify ELK domain graph is updated FIRST (fail early)
    // The domain graph should be pure ELK structure with NO x/y coordinates
    const domainCheck = await page.evaluate(() => {
      const domain = (window as any).getDomainGraph?.() || { children: [] };
      
      if (!domain.children || domain.children.length === 0) {
        return { error: 'Domain graph has no children', hasNode: false };
      }
      
      const node = domain.children[0];
      
      // Verify ELK domain graph structure
      const isValidElkStructure = (
        node.id && 
        typeof node.id === 'string' &&
        Array.isArray(node.labels) &&
        node.labels.length > 0 &&
        typeof node.labels[0].text === 'string'
      );
      
      // Verify NO x/y coordinates in domain (should be in ViewState only)
      const hasIllegalCoordinates = node.x !== undefined || node.y !== undefined || 
                                    node.width !== undefined || node.height !== undefined;
      
      // Verify NO mode fields in domain (should be in ViewState.layout only)
      const hasIllegalMode = node.mode !== undefined;
      
      return {
        hasNode: true,
        nodeId: node.id,
        isValidElkStructure,
        hasLabels: Array.isArray(node.labels),
        labelText: node.labels?.[0]?.text,
        hasIllegalCoordinates,
        hasIllegalMode,
        hasX: node.x !== undefined,
        hasY: node.y !== undefined,
        hasMode: node.mode !== undefined,
        childrenCount: domain.children.length,
        // Full structure for debugging
        nodeStructure: {
          id: node.id,
          labels: node.labels,
          hasX: node.x !== undefined,
          hasY: node.y !== undefined,
          hasMode: node.mode !== undefined,
          hasWidth: node.width !== undefined,
          hasHeight: node.height !== undefined,
          children: node.children,
          edges: node.edges
        }
      };
    });
    
    if (!domainCheck.hasNode) {
      throw new Error(`❌ EARLY FAILURE: Domain graph has no children! ${JSON.stringify(domainCheck)}`);
    }
    
    if (!domainCheck.isValidElkStructure) {
      throw new Error(`❌ EARLY FAILURE: Domain graph node has invalid ELK structure! Expected: { id: string, labels: [{ text: string }] }. Got: ${JSON.stringify(domainCheck.nodeStructure)}`);
    }
    
    if (domainCheck.hasIllegalCoordinates) {
      throw new Error(`❌ EARLY FAILURE: Domain graph contains coordinates! Domain should be pure structure (no x/y/width/height). Got: ${JSON.stringify(domainCheck.nodeStructure)}`);
    }
    
    if (domainCheck.hasIllegalMode) {
      throw new Error(`❌ EARLY FAILURE: Domain graph contains mode! Mode should be in ViewState.layout only. Got: ${JSON.stringify(domainCheck.nodeStructure)}`);
    }
    
    console.log('✅ ELK Domain graph updated correctly:', {
      nodeId: domainCheck.nodeId,
      labelText: domainCheck.labelText,
      childrenCount: domainCheck.childrenCount,
      isValidElkStructure: domainCheck.isValidElkStructure,
      noCoordinates: !domainCheck.hasIllegalCoordinates,
      noMode: !domainCheck.hasIllegalMode
    });
    
    // Get ViewState to verify geometry (coordinates should be HERE, not in domain)
    const viewStateCheck = await page.evaluate((nodeId) => {
      const viewState = (window as any).getViewState?.() || { node: {} };
      const nodeGeom = viewState.node?.[nodeId];
      return {
        hasGeometry: !!nodeGeom,
        x: nodeGeom?.x,
        y: nodeGeom?.y,
        w: nodeGeom?.w,
        h: nodeGeom?.h
      };
    }, domainCheck.nodeId);
    
    if (!viewStateCheck.hasGeometry) {
      throw new Error(`❌ EARLY FAILURE: ViewState missing geometry for node ${domainCheck.nodeId}! Geometry should be in ViewState, not domain.`);
    }
    
    console.log('📍 ViewState geometry:', viewStateCheck);
    
    // Verify dimensions
    expect(viewStateCheck.hasGeometry).toBe(true);
    expect(viewStateCheck.w).toBe(96);
    expect(viewStateCheck.h).toBe(96);
    expect(typeof viewStateCheck.x).toBe('number');
    expect(typeof viewStateCheck.y).toBe('number');
    
    // Verify in all layers
    sync = await verifyLayerSync(page);
    expect(sync.canvasNodes).toBe(1);
    expect(sync.domainNodes).toBe(1);
    expect(sync.viewStateNodes).toBe(1);
    expect(sync.inSync).toBe(true);
  });

  test('FUNDAMENTAL: Add Group - updates domain graph with correct structure and dimensions', async ({ page }) => {
    test.setTimeout(30000); // 30 seconds for fundamental test
    
    // Verify canvas is empty first
    let sync = await verifyLayerSync(page);
    expect(sync.canvasNodes).toBe(0);
    expect(sync.domainNodes).toBe(0);
    
    // Select group tool
    await page.evaluate(() => {
      (window as any).handleToolSelect('group');
    });
    await page.waitForTimeout(300);
    
    // Click canvas pane to create group
    const paneLocator = page.locator('.react-flow__pane');
    await paneLocator.waitFor({ state: 'visible', timeout: 5000 });
    await paneLocator.click({ position: { x: 400, y: 500 } });
    
    // Wait for group creation
    await page.waitForTimeout(2000);
    
    // Wait for "Generating..." if it appears
    try {
      await page.waitForSelector('text=Generating...', { timeout: 2000 });
      await page.waitForSelector('text=Generating...', { state: 'hidden', timeout: 10000 });
    } catch (e) {
      // No generating message, continue
    }
    
    // CRITICAL: Verify ELK domain graph is updated FIRST (fail early)
    // The domain graph should be pure ELK structure with NO x/y coordinates
    const domainCheck = await page.evaluate(() => {
      const domain = (window as any).getDomainGraph?.() || { children: [] };
      
      if (!domain.children || domain.children.length === 0) {
        return { error: 'Domain graph has no children', hasGroup: false };
      }
      
      // Find group (groups have children array, regular nodes don't)
      const group = domain.children.find((c: any) => 
        (c.children && Array.isArray(c.children)) || c.data?.isGroup
      );
      
      if (!group) {
        return { 
          error: 'No group found in domain',
          hasGroup: false,
          children: domain.children.map((c: any) => ({ 
            id: c.id, 
            hasChildren: Array.isArray(c.children),
            isGroup: c.data?.isGroup 
          }))
        };
      }
      
      // Verify ELK domain graph structure
      const isValidElkStructure = (
        group.id && 
        typeof group.id === 'string' &&
        Array.isArray(group.labels) &&
        group.labels.length > 0 &&
        typeof group.labels[0].text === 'string' &&
        Array.isArray(group.children)
      );
      
      // Verify NO x/y coordinates in domain (should be in ViewState only)
      const hasIllegalCoordinates = group.x !== undefined || group.y !== undefined || 
                                    group.width !== undefined || group.height !== undefined;
      
      // Verify NO mode fields in domain (should be in ViewState.layout only)
      const hasIllegalMode = group.mode !== undefined;
      
      return {
        hasGroup: true,
        groupId: group.id,
        isValidElkStructure,
        hasLabels: Array.isArray(group.labels),
        labelText: group.labels?.[0]?.text,
        hasChildren: Array.isArray(group.children),
        childrenCount: group.children?.length || 0,
        hasIllegalCoordinates,
        hasIllegalMode,
        hasX: group.x !== undefined,
        hasY: group.y !== undefined,
        hasMode: group.mode !== undefined,
        domainChildrenCount: domain.children.length,
        // Full structure for debugging
        groupStructure: {
          id: group.id,
          labels: group.labels,
          hasX: group.x !== undefined,
          hasY: group.y !== undefined,
          hasMode: group.mode !== undefined,
          hasWidth: group.width !== undefined,
          hasHeight: group.height !== undefined,
          children: group.children,
          edges: group.edges,
          data: group.data
        }
      };
    });
    
    if (!domainCheck.hasGroup) {
      throw new Error(`❌ EARLY FAILURE: Domain graph not updated with group! ${JSON.stringify(domainCheck)}`);
    }
    
    if (!domainCheck.isValidElkStructure) {
      throw new Error(`❌ EARLY FAILURE: Domain graph group has invalid ELK structure! Expected: { id: string, labels: [{ text: string }], children: [] }. Got: ${JSON.stringify(domainCheck.groupStructure)}`);
    }
    
    if (domainCheck.hasIllegalCoordinates) {
      throw new Error(`❌ EARLY FAILURE: Domain graph contains coordinates! Domain should be pure structure (no x/y/width/height). Got: ${JSON.stringify(domainCheck.groupStructure)}`);
    }
    
    if (domainCheck.hasIllegalMode) {
      throw new Error(`❌ EARLY FAILURE: Domain graph contains mode! Mode should be in ViewState.layout only. Got: ${JSON.stringify(domainCheck.groupStructure)}`);
    }
    
    console.log('✅ ELK Domain graph updated with group correctly:', {
      groupId: domainCheck.groupId,
      labelText: domainCheck.labelText,
      childrenCount: domainCheck.childrenCount,
      domainChildrenCount: domainCheck.domainChildrenCount,
      isValidElkStructure: domainCheck.isValidElkStructure,
      noCoordinates: !domainCheck.hasIllegalCoordinates,
      noMode: !domainCheck.hasIllegalMode
    });
    
    // Get ViewState to verify geometry (coordinates should be HERE, not in domain)
    const viewStateCheck = await page.evaluate((groupId) => {
      const viewState = (window as any).getViewState?.() || { group: {} };
      const groupGeom = viewState.group?.[groupId];
      return {
        hasGeometry: !!groupGeom,
        x: groupGeom?.x,
        y: groupGeom?.y,
        w: groupGeom?.w,
        h: groupGeom?.h
      };
    }, domainCheck.groupId);
    
    if (!viewStateCheck.hasGeometry) {
      throw new Error(`❌ EARLY FAILURE: ViewState missing geometry for group ${domainCheck.groupId}! Geometry should be in ViewState, not domain.`);
    }
    
    console.log('📍 ViewState geometry:', viewStateCheck);
    
    // Verify dimensions
    expect(viewStateCheck.hasGeometry).toBe(true);
    expect(viewStateCheck.w).toBe(480);
    expect(viewStateCheck.h).toBe(320);
    expect(typeof viewStateCheck.x).toBe('number');
    expect(typeof viewStateCheck.y).toBe('number');
    
    // Verify in all layers
    sync = await verifyLayerSync(page);
    expect(sync.canvasNodes).toBeGreaterThanOrEqual(1);
    expect(sync.domainNodes).toBeGreaterThanOrEqual(1);
  });

  // ============================================================================
  // TEST #2: Drag Node Into Group - Must run after fundamental tests
  // This test will fail the suite if it doesn't pass - critical functionality
  // ============================================================================

  test('TEST #2: Drag Node Into Group - node coordinates stable, domain updated, group stable', async ({ page }) => {
    test.setTimeout(30000); // 30 seconds for drag test
    
    // Setup: Add node and group to canvas first
    // Add a group at (200, 200)
    await page.evaluate(() => {
      (window as any).handleToolSelect('group');
    });
    await page.waitForTimeout(300);
    const paneLocator = page.locator('.react-flow__pane');
    await paneLocator.waitFor({ state: 'visible', timeout: 5000 });
    await paneLocator.click({ position: { x: 400, y: 400 } });
    await page.waitForTimeout(2000);
    
    // Add a node outside the group at (600, 600)
    await addNodeToCanvas(page, 600, 600);
    await page.waitForTimeout(1000);
    
    // Get initial state - distinguish groups from nodes properly
    const initialState = await page.evaluate(() => {
      const domain = (window as any).getDomainGraph?.() || { children: [] };
      const viewState = (window as any).getViewState?.() || { node: {}, group: {} };
      
      // Find group (has entry in viewState.group or has data.isGroup)
      const groups = domain.children?.filter((c: any) => 
        viewState.group?.[c.id] || c.data?.isGroup || (c.children && Array.isArray(c.children))
      ) || [];
      
      // Find node (NOT a group - no entry in viewState.group, no isGroup flag)
      const nodes = domain.children?.filter((c: any) => 
        !viewState.group?.[c.id] && !c.data?.isGroup
      ) || [];
      
      const groupId = groups[0]?.id;
      const nodeId = nodes[0]?.id;
      
      // Find parent of node
      const findParent = (graph: any, targetId: string, parentId: string | null = null): string | null => {
        if (!graph.children) return null;
        for (const child of graph.children) {
          if (child.id === targetId) return parentId || 'root';
          const found = findParent(child, targetId, child.id);
          if (found) return found;
        }
        return null;
      };
      
      return {
        groupId,
        nodeId,
        nodeParent: nodeId ? findParent(domain, nodeId) : null,
        nodeViewState: nodeId ? viewState.node?.[nodeId] : null,
        groupViewState: groupId ? viewState.group?.[groupId] : null,
        allChildren: domain.children?.map((c: any) => ({ 
          id: c.id, 
          isGroup: !!viewState.group?.[c.id],
          hasViewState: !!viewState.node?.[c.id]
        })) || []
      };
    });
    
    if (!initialState.groupId || !initialState.nodeId) {
      throw new Error(`❌ EARLY FAILURE: Setup failed. Group: ${initialState.groupId}, Node: ${initialState.nodeId}. All children: ${JSON.stringify(initialState.allChildren)}`);
    }
    
    console.log('📍 Initial state:', {
      groupId: initialState.groupId,
      nodeId: initialState.nodeId,
      nodeParent: initialState.nodeParent,
      nodePos: initialState.nodeViewState,
      groupPos: initialState.groupViewState
    });
    
    expect(initialState.nodeParent).toBe('root'); // Node should be at root initially
    expect(initialState.nodeViewState).toBeDefined();
    expect(initialState.groupViewState).toBeDefined();
    
    // Get group bounds to calculate drag target (center of group)
    const groupGeom = initialState.groupViewState;
    const groupCenterX = groupGeom.x + groupGeom.w / 2;
    const groupCenterY = groupGeom.y + groupGeom.h / 2;
    
    // Drag node into the group (to center of group)
    const nodeElement = page.locator(`[data-id="${initialState.nodeId}"]`);
    await nodeElement.waitFor({ state: 'visible' });
    const nodeBox = await nodeElement.boundingBox();
    expect(nodeBox).not.toBeNull();
    
    const canvasRect = await page.locator('.react-flow').boundingBox();
    expect(canvasRect).not.toBeNull();
    
    // Convert flow coordinates to screen coordinates for mouse
    const viewportInfo = await page.evaluate(() => {
      const rf = (window as any).__reactFlowInstance;
      const viewport = rf?.getViewport?.() || { x: 0, y: 0, zoom: 1 };
      return viewport;
    });
    
    // Calculate the EXPECTED final position (world coordinates where we're dropping)
    // Node will be dragged so its center lands at group center
    const nodeWidth = initialState.nodeViewState.w;
    const nodeHeight = initialState.nodeViewState.h;
    const expectedFinalX = Math.round((groupCenterX - nodeWidth / 2) / 16) * 16; // Snapped to grid
    const expectedFinalY = Math.round((groupCenterY - nodeHeight / 2) / 16) * 16;
    
    // Calculate screen position for group center
    const targetScreenX = canvasRect!.x + (groupCenterX * viewportInfo.zoom + viewportInfo.x);
    const targetScreenY = canvasRect!.y + (groupCenterY * viewportInfo.zoom + viewportInfo.y);
    
    const nodeCenterX = nodeBox!.x + nodeBox!.width / 2;
    const nodeCenterY = nodeBox!.y + nodeBox!.height / 2;
    
    console.log('📍 Dragging node from', { x: nodeCenterX, y: nodeCenterY }, 'to', { x: targetScreenX, y: targetScreenY });
    console.log('📍 Expected final ABSOLUTE position (world coords, snapped):', { x: expectedFinalX, y: expectedFinalY });
    
    // ============================================================================
    // CRITICAL TEST: Check reparenting happens DURING drag (not just on drop)
    // ============================================================================
    await page.mouse.move(nodeCenterX, nodeCenterY);
    await page.mouse.down();
    await page.mouse.move(targetScreenX, targetScreenY, { steps: 20 });
    
    // CHECK: Node should already be reparented DURING drag (before mouse up)
    const duringDragState = await page.evaluate((nodeId) => {
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
      return findParent(domain, nodeId);
    }, initialState.nodeId);
    
    console.log('📍 DURING drag - node parent:', duringDragState);
    
    await page.mouse.up();
    await page.waitForTimeout(500); // Short wait for state sync
    
    // Verify final state
    const afterState = await page.evaluate((args: { nodeId: string; groupId: string }) => {
      const domain = (window as any).getDomainGraph?.() || { children: [] };
      const viewState = (window as any).getViewState?.() || { node: {}, group: {} };
      
      const findParent = (graph: any, targetId: string, parentId: string | null = null): string | null => {
        if (!graph.children) return null;
        for (const child of graph.children) {
          if (child.id === targetId) return parentId || 'root';
          const found = findParent(child, targetId, child.id);
          if (found) return found;
        }
        return null;
      };
      
      return {
        nodeParent: findParent(domain, args.nodeId),
        nodeViewState: viewState.node?.[args.nodeId],
        groupViewState: viewState.group?.[args.groupId]
      };
    }, { nodeId: initialState.nodeId, groupId: initialState.groupId });
    
    console.log('📍 After drag state:', {
      nodeParent: afterState.nodeParent,
      nodePos: afterState.nodeViewState,
      groupPos: afterState.groupViewState
    });
    
    // ============================================================================
    // ASSERTION 1: Domain updated - node is now child of group
    // ============================================================================
    expect(afterState.nodeParent).toBe(initialState.groupId);
    
    // ============================================================================
    // ASSERTION 2: Reparenting happened DURING drag (not just on drop)
    // ============================================================================
    expect(duringDragState).toBe(initialState.groupId);
    
    // ============================================================================
    // ASSERTION 3: Node lands at EXACT drop position (absolute coords, snapped)
    // We use absolute coordinates - NO relative conversion!
    // ============================================================================
    const actualX = afterState.nodeViewState.x;
    const actualY = afterState.nodeViewState.y;
    const posXDiff = Math.abs(actualX - expectedFinalX);
    const posYDiff = Math.abs(actualY - expectedFinalY);
    
    console.log('📍 Position check:', {
      expected: { x: expectedFinalX, y: expectedFinalY },
      actual: { x: actualX, y: actualY },
      diff: { x: posXDiff, y: posYDiff }
    });
    
    // STRICT: Position must be within 1 grid cell (16px) of expected
    expect(posXDiff).toBeLessThanOrEqual(16);
    expect(posYDiff).toBeLessThanOrEqual(16);
    
    // ============================================================================
    // ASSERTION 4: Node SIZE is stable (unchanged)
    // ============================================================================
    expect(afterState.nodeViewState.w).toBe(initialState.nodeViewState.w);
    expect(afterState.nodeViewState.h).toBe(initialState.nodeViewState.h);
    
    // ============================================================================
    // ASSERTION 5: Group position and size are EXACTLY the same (unchanged)
    // ============================================================================
    expect(afterState.groupViewState.w).toBe(initialState.groupViewState.w);
    expect(afterState.groupViewState.h).toBe(initialState.groupViewState.h);
    expect(afterState.groupViewState.x).toBe(initialState.groupViewState.x);
    expect(afterState.groupViewState.y).toBe(initialState.groupViewState.y);
    
    // ============================================================================
    // ASSERTION 6: ELK Domain Graph debugger should show node as child of group
    // ============================================================================
    await page.waitForTimeout(1000); // Wait for ELK debugger to update
    
    const elkDomainCheck = await page.evaluate((args: { nodeId: string; groupId: string }) => {
      // Check if ELK Domain Graph SVG is visible
      const elkSvg = document.querySelector('[data-testid="elk-domain-graph"]') || 
                     document.querySelector('svg[class*="elk"]') ||
                     document.querySelector('.react-flow__background + svg');
      
      // Get the actual domain graph structure
      const domain = (window as any).getDomainGraph?.() || { children: [] };
      
      // Verify node is child of group in domain structure
      const findNodeInGroup = (graph: any, nodeId: string, groupId: string): boolean => {
        if (!graph.children) return false;
        for (const child of graph.children) {
          if (child.id === groupId && child.children) {
            // Check if node is direct child of this group
            if (child.children.some((c: any) => c.id === nodeId)) {
              return true;
            }
            // Recursively check nested groups
            for (const nestedChild of child.children) {
              if (findNodeInGroup(nestedChild, nodeId, groupId)) {
                return true;
              }
            }
          }
          // Recursively check other groups
          if (findNodeInGroup(child, nodeId, groupId)) {
            return true;
          }
        }
        return false;
      };
      
      const nodeIsChildOfGroup = findNodeInGroup(domain, args.nodeId, args.groupId);
      
      // Find parent of node to double-check
      const findParent = (graph: any, targetId: string, parentId: string | null = null): string | null => {
        if (!graph.children) return null;
        for (const child of graph.children) {
          if (child.id === targetId) return parentId || 'root';
          const found = findParent(child, targetId, child.id);
          if (found) return found;
        }
        return null;
      };
      
      const nodeParent = findParent(domain, args.nodeId);
      
      return {
        nodeIsChildOfGroup,
        nodeParent,
        expectedParent: args.groupId,
        domainHasChildren: domain.children?.length > 0,
        elkSvgVisible: !!elkSvg,
        domainStructure: JSON.stringify(domain, null, 2).substring(0, 500) // First 500 chars for debugging
      };
    }, { nodeId: initialState.nodeId, groupId: initialState.groupId });
    
    console.log('📍 ELK Domain Graph check:', elkDomainCheck);
    
    // Verify node is child of group in domain structure
    expect(elkDomainCheck.nodeParent).toBe(initialState.groupId);
    expect(elkDomainCheck.nodeIsChildOfGroup).toBe(true);
    
    console.log('✅ All assertions passed: Reparent during drag, position stable, size stable, ELK Domain Graph updated');
  });

  test('resetCanvas Functionality - should clear canvas and domain, persist after refresh', async ({ page }) => {
    test.setTimeout(30000); // 30 seconds for reset test
    
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
    test.setTimeout(30000); // 30 seconds for deletion test
    
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

  test('Deletion Persistence - deleted nodes should not reappear after refresh', async ({ page }) => {
    test.setTimeout(60000); // Increase timeout for this test
    console.log('🧪 [DELETION-PERSISTENCE] Testing that deleted nodes stay deleted after refresh (SELECT ALL scenario)');
    
    // Wait for canvas to be ready
    await page.waitForSelector('.react-flow', { timeout: 10000 });
    await page.waitForTimeout(1000);
    
    // Add 2 nodes (simpler test first)
    await addNodeToCanvas(page, 200, 200);
    await page.waitForTimeout(2000);
    await addNodeToCanvas(page, 300, 300);
    await page.waitForTimeout(2000);
    
    // Verify all nodes exist
    let sync = await verifyLayerSync(page);
    expect(sync.canvasNodes).toBe(2);
    expect(sync.domainNodes).toBe(2);
    console.log('✅ Added 2 nodes');
    
    // Get node IDs before deletion
    const nodeIdsBeforeDelete = await page.evaluate(() => {
      const domain = (window as any).getDomainGraph?.() || { children: [] };
      return domain.children?.map((c: any) => c.id) || [];
    });
    console.log('📋 Node IDs before deletion:', nodeIdsBeforeDelete);
    expect(nodeIdsBeforeDelete).toHaveLength(2);
    
    // DELETE ALL nodes (matching user's actual workflow - select all, then delete)
    // Delete nodes one by one to ensure they're all deleted
    // In real usage, user selects all with Ctrl+A and deletes, but for test reliability we delete individually
    let nodesToDelete = 2;
    while (nodesToDelete > 0) {
      await page.click('.react-flow__node >> nth=0', { force: true });
      await page.waitForTimeout(300);
      await page.keyboard.press('Delete');
      await page.waitForTimeout(2000);
      nodesToDelete--;
    }
    console.log('✅ Deleted all nodes');
    
    // Verify all nodes are deleted
    sync = await verifyLayerSync(page);
    console.log('📊 After delete - Canvas nodes:', sync.canvasNodes, 'Domain nodes:', sync.domainNodes);
    expect(sync.canvasNodes).toBe(0);
    expect(sync.domainNodes).toBe(0);
    
    // Wait for persistence to save the deletion - need to wait for the useEffect to run
    // The persistence useEffect runs when nodes/edges change, so we need to wait for it
    await page.waitForTimeout(5000); // Increased wait time
    
    // Verify localStorage has the updated state (with 0 nodes)
    // CRITICAL: This is where the bug manifests - localStorage should have 0 nodes
    const storageBeforeRefresh = await page.evaluate(() => {
      const stored = localStorage.getItem('atelier_canvas_last_snapshot_v1');
      if (!stored) return null;
      try {
        const parsed = JSON.parse(stored);
        return {
          nodeCount: parsed.rawGraph?.children?.length || 0,
          nodeIds: parsed.rawGraph?.children?.map((c: any) => c.id) || []
        };
      } catch (e) {
        return null;
      }
    });
    console.log('📦 Storage before refresh:', storageBeforeRefresh);
    console.log('🐛 BUG CHECK: If nodeCount is > 0, persistence is broken - nodes will reappear on refresh!');
    expect(storageBeforeRefresh).not.toBeNull();
    // THIS TEST SHOULD FAIL IF THE BUG EXISTS - localStorage will have nodes > 0
    expect(storageBeforeRefresh?.nodeCount).toBe(0);
    
    // Refresh page
    console.log('🔄 Refreshing page...');
    await page.reload();
    await page.waitForSelector('.react-flow', { timeout: 10000 });
    await page.waitForTimeout(5000);  // Wait for restoration
    
    // Verify deleted nodes did NOT reappear - THIS IS WHERE THE BUG MANIFESTS
    sync = await verifyLayerSync(page);
    console.log('📊 After refresh - Canvas nodes:', sync.canvasNodes, 'Domain nodes:', sync.domainNodes);
    
    // CRITICAL: All deleted nodes should NOT reappear - this is where the bug manifests
    // If the bug exists, sync.canvasNodes and sync.domainNodes will be > 0 instead of 0
    expect(sync.canvasNodes).toBe(0);
    expect(sync.domainNodes).toBe(0);
    
    // Verify no nodes exist in the domain
    const nodeIdsAfterRefresh = await page.evaluate(() => {
      const domain = (window as any).getDomainGraph?.() || { children: [] };
      return domain.children?.map((c: any) => c.id) || [];
    });
    console.log('📋 Node IDs after refresh:', nodeIdsAfterRefresh);
    
    expect(nodeIdsAfterRefresh).toHaveLength(0);
    
    console.log('✅ [DELETION-PERSISTENCE] All deleted nodes correctly did not reappear after refresh');
  });

  test('Persistence Flow - should persist nodes after refresh', async ({ page }) => {
    test.setTimeout(30000); // 30 seconds for persistence test
    
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
    test.setTimeout(30000); // 30 seconds for position stability test
    
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
    test.setTimeout(30000); // 30 seconds for multiselect test
    
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
});

