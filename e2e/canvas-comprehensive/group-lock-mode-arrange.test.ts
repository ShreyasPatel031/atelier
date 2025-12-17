import { test, expect, Page } from '@playwright/test';
import { getBaseUrl } from '../test-config.js';
import { setupCleanCanvas } from './shared-utils';
import { waitForNodes, waitForEdges } from './edge-routing/testHelpers';

/**
 * Test to verify that selecting LOCK mode on a group runs ELK and arranges nodes inside the group.
 * 
 * This test reproduces the issue where selecting lock mode "completely fucks everything up".
 * 
 * Expected behavior:
 * 1. Create a group with 3 nodes and 2 edges (using snapshot setup)
 * 2. Click arrange button to set group to LOCK mode
 * 3. ELK should run and arrange all nodes inside the group
 * 4. Nodes should be properly positioned (not overlapping, not at origin)
 * 5. Edges should remain connected
 */
test.describe('Group Lock Mode Arrange', () => {
  let BASE_URL: string;

  test.beforeAll(async () => {
    BASE_URL = await getBaseUrl();
  });

  test.beforeEach(async ({ page }) => {
    test.setTimeout(60000); // Increase timeout for setup
    // This test sets up its own state, so we just need to clear storage
    await page.goto(`${BASE_URL}/canvas`, { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.react-flow__renderer', { timeout: 10000 });
    await page.waitForTimeout(1000); // Wait for canvas to initialize
  });

  test('should arrange nodes inside group when lock mode is selected', async ({ page }) => {
    test.setTimeout(120000);
    
    // Setup: Create a group with 3 nodes and 2 edges using snapshot
    const groupId = 'test-group-lock';
    const node1Id = 'test-node-1';
    const node2Id = 'test-node-2';
    const node3Id = 'test-node-3';
    const edge1Id = 'test-edge-1';
    const edge2Id = 'test-edge-2';
    
    const snapshot = {
      rawGraph: {
        id: "root",
        children: [
          {
            id: groupId,
            labels: [{ text: "Test Group" }],
            children: [
              { id: node1Id, labels: [{ text: "Node 1" }], children: [], edges: [], data: {} },
              { id: node2Id, labels: [{ text: "Node 2" }], children: [], edges: [], data: {} },
              { id: node3Id, labels: [{ text: "Node 3" }], children: [], edges: [], data: {} }
            ],
            edges: [
              { id: edge1Id, sources: [node1Id], targets: [node2Id], labels: [] },
              { id: edge2Id, sources: [node2Id], targets: [node3Id], labels: [] }
            ],
            data: { isGroup: true }
          }
        ],
        edges: []
      },
      viewState: {
        node: {
          [node1Id]: { x: 550, y: 450, w: 96, h: 96 },
          [node2Id]: { x: 650, y: 450, w: 96, h: 96 },
          [node3Id]: { x: 600, y: 550, w: 96, h: 96 }
        },
        group: {
          [groupId]: { x: 500, y: 400, w: 300, h: 250 }
        },
        edge: {},
        layout: {
          [groupId]: { mode: 'FREE' }
        }
      },
      selectedArchitectureId: 'new-architecture',
      timestamp: Date.now()
    };
    
    // Set up test state using localStorage snapshot
    await page.evaluate((snap) => {
      localStorage.setItem('atelier_canvas_last_snapshot_v1', JSON.stringify(snap));
    }, snapshot);
    
    await page.goto(`${BASE_URL}/canvas`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.react-flow__renderer', { timeout: 10000 });
    await page.waitForTimeout(2000); // Wait for restoration
    
    // Wait for nodes to render
    await waitForNodes(page, 4, 5000); // Group + 3 nodes
    await waitForEdges(page, 2, 5000); // 2 edges
    
    console.log('✅ Setup complete: Group with 3 nodes and 2 edges created');
    
    // Step 1: Get initial node positions before lock mode
    console.log('📦 Step 1: Recording initial node positions...');
    
    const nodeIds = [node1Id, node2Id, node3Id];
    
    const beforeState = await page.evaluate(([gId, nIds]) => {
      const viewState = (window as any).getViewState?.() || { node: {}, group: {} };
      const positions: Record<string, { x: number; y: number }> = {};
      
      for (const nodeId of nIds as string[]) {
        const geom = viewState.node?.[nodeId];
        if (geom) {
          positions[nodeId] = { x: geom.x, y: geom.y };
        }
      }
      
      // Capture group size from ViewState
      const groupGeom = viewState.group?.[gId];
      const groupSize = groupGeom ? { w: groupGeom.w, h: groupGeom.h } : null;
      
      // ALSO capture ReactFlow node dimensions and TYPE (actual rendered size and type)
      const groupNode = document.querySelector(`[data-id="${gId}"]`);
      let reactFlowSize = null;
      let reactFlowType = null;
      let reactFlowIsGroup = null;
      if (groupNode) {
        const rect = groupNode.getBoundingClientRect();
        // Get computed style dimensions
        const styles = window.getComputedStyle(groupNode);
        const width = parseFloat(styles.width) || rect.width;
        const height = parseFloat(styles.height) || rect.height;
        reactFlowSize = { w: width, h: height };
        
        // Check ReactFlow node type
        const reactFlowInstance = (window as any).__reactFlowInstance;
        if (reactFlowInstance) {
          const rfNode = reactFlowInstance.getNode(gId);
          if (rfNode) {
            reactFlowType = rfNode.type;
            reactFlowIsGroup = rfNode.data?.isGroup === true;
          }
        }
      }
      
      return { positions, groupSize, reactFlowSize, reactFlowType, reactFlowIsGroup };
    }, [groupId, nodeIds]);
    
    console.log('📍 Positions before lock mode:', beforeState.positions);
    console.log('📐 Group size before lock mode (ViewState):', beforeState.groupSize);
    console.log('📐 Group size before lock mode (ReactFlow):', beforeState.reactFlowSize);
    console.log('📐 Group type before lock mode (ReactFlow):', beforeState.reactFlowType);
    
    // Verify we have positions for all nodes and group size
    if (Object.keys(beforeState.positions).length !== 3) {
      throw new Error(`❌ Expected positions for 3 nodes, got ${Object.keys(beforeState.positions).length}`);
    }
    if (!beforeState.groupSize) {
      throw new Error('❌ Group size not found in ViewState before lock mode');
    }
    if (!beforeState.reactFlowSize) {
      throw new Error('❌ Group ReactFlow node not found before lock mode');
    }
    
    // Verify initial group size is reasonable (not huge)
    const MAX_REASONABLE_SIZE_INITIAL = 5000; // 5000px is huge, groups should be < 1000px
    if (beforeState.groupSize.w > MAX_REASONABLE_SIZE_INITIAL || beforeState.groupSize.h > MAX_REASONABLE_SIZE_INITIAL) {
      throw new Error(
        `❌ Initial group size is already huge! ViewState: ${beforeState.groupSize.w}x${beforeState.groupSize.h}. ` +
        `This suggests the group was created with incorrect dimensions.`
      );
    }
    if (beforeState.reactFlowSize && (beforeState.reactFlowSize.w > MAX_REASONABLE_SIZE_INITIAL || beforeState.reactFlowSize.h > MAX_REASONABLE_SIZE_INITIAL)) {
      throw new Error(
        `❌ Initial ReactFlow group size is already huge! ${beforeState.reactFlowSize.w}x${beforeState.reactFlowSize.h}. ` +
        `This suggests the group was rendered with incorrect dimensions.`
      );
    }
    
    // Step 2: Select the group and click arrange button to set LOCK mode
    console.log('📦 Step 2: Selecting group and clicking arrange button...');
    
    // Wait for group to be visible
    const groupElement = page.locator(`[data-id="${groupId}"]`);
    await groupElement.waitFor({ state: 'visible', timeout: 5000 });
    
    // Select the group by clicking on it
    // First, try clicking on the group's border/title area
    const groupBox = await groupElement.boundingBox();
    if (!groupBox) {
      throw new Error('❌ Group element not found or not visible');
    }
    
    // Click on the top area of the group (title bar) to select it
    const titleBarX = groupBox.x + groupBox.width / 2; // Center horizontally
    const titleBarY = groupBox.y + 15; // Top area (title bar)
    
    console.log(`📍 Clicking group at (${titleBarX}, ${titleBarY}) to select it`);
    await page.mouse.click(titleBarX, titleBarY);
    await page.waitForTimeout(500); // Wait for selection to register
    
    // Verify group is selected by checking ReactFlow's selection state
    const isSelected = await page.evaluate((gId) => {
      // Check ReactFlow's internal selection state
      const rfInstance = (window as any).__reactFlowInstance;
      if (rfInstance) {
        const nodes = rfInstance.getNodes();
        const groupNode = nodes.find((n: any) => n.id === gId);
        if (groupNode && groupNode.selected) {
          return true;
        }
      }
      
      // Also check DOM
      const groupNode = document.querySelector(`[data-id="${gId}"]`);
      if (!groupNode) return false;
      
      return groupNode.classList.contains('selected') || 
             groupNode.classList.contains('react-flow__node-selected') ||
             (groupNode as HTMLElement).getAttribute('data-selected') === 'true';
    }, groupId);
    
    if (!isSelected) {
      console.log('⚠️ Group not selected after first click, trying alternative selection method...');
      
      // Try using ReactFlow's API to select the node
      await page.evaluate((gId) => {
        const rfInstance = (window as any).__reactFlowInstance;
        if (rfInstance) {
          rfInstance.setNodes((nds: any[]) => 
            nds.map(n => ({ ...n, selected: n.id === gId }))
          );
        }
      }, groupId);
      
      await page.waitForTimeout(300);
      
      // Verify selection again
      const isSelectedAfter = await page.evaluate((gId) => {
        const rfInstance = (window as any).__reactFlowInstance;
        if (rfInstance) {
          const nodes = rfInstance.getNodes();
          const groupNode = nodes.find((n: any) => n.id === gId);
          return groupNode && groupNode.selected;
        }
        return false;
      }, groupId);
      
      if (!isSelectedAfter) {
        throw new Error('❌ Failed to select group - cannot proceed with arrange button click');
      }
      
      console.log('✅ Group selected using ReactFlow API');
    } else {
      console.log('✅ Group is selected');
    }
    
    // Wait for side toolbar to appear (it shows when group is selected)
    console.log('⏳ Waiting for side toolbar to appear...');
    await page.waitForTimeout(500); // Give React time to render the toolbar
    
    // Debug: Check if handleArrangeGroup is available and find the button
    const handlerAvailable = await page.evaluate((gId) => {
      const groupNode = document.querySelector(`[data-id="${gId}"]`);
      if (!groupNode) return { found: false, reason: 'Group node not found' };
      
      // Try to find the button - it should be in the side toolbar
      const buttons = Array.from(groupNode.querySelectorAll('button'));
      console.log(`Found ${buttons.length} buttons in group`);
      
      // Look for button with SVG (arrange button has LayoutPanelLeft icon)
      for (const btn of buttons) {
        const svg = btn.querySelector('svg');
        const rect = btn.getBoundingClientRect();
        const isVisible = rect.width > 0 && rect.height > 0 && 
                         window.getComputedStyle(btn).display !== 'none' &&
                         window.getComputedStyle(btn).visibility !== 'hidden';
        
        if (svg && isVisible) {
          // Check button's computed styles to ensure it's clickable
          const styles = window.getComputedStyle(btn);
          const pointerEvents = styles.pointerEvents;
          const zIndex = styles.zIndex;
          
          return {
            found: true,
            x: rect.left + rect.width / 2,
            y: rect.top + rect.height / 2,
            visible: true,
            pointerEvents,
            zIndex,
            buttonText: btn.textContent || '',
            buttonClasses: btn.className
          };
        }
      }
      return { found: false, reason: 'No suitable button found', buttonCount: buttons.length };
    }, groupId);
    
    console.log('🔍 Button debug info:', handlerAvailable);
    
    if (!handlerAvailable.found || !handlerAvailable.x) {
      // Take a screenshot for debugging
      await page.screenshot({ path: 'test-results/arrange-button-debug.png', fullPage: true });
      throw new Error(`❌ Could not find arrange button: ${JSON.stringify(handlerAvailable)}`);
    }
    
    // Verify the button is actually clickable (not covered by another element)
    const buttonElement = groupElement.locator('button').filter({ has: page.locator('svg') }).first();
    await buttonElement.waitFor({ state: 'visible', timeout: 2000 });
    
    // Check if button is actually in viewport and clickable
    const isClickable = await buttonElement.isVisible();
    if (!isClickable) {
      throw new Error('❌ Arrange button is not visible/clickable');
    }
    
    // Set up console listener to catch ALL logs including ELK debug
    const consoleMessages: string[] = [];
    const consoleListener = (msg: any) => {
      const text = msg.text();
      // Capture arrange logs and ELK debug logs
      if (text.includes('[ARRANGE]') || text.includes('handleArrangeGroup') || text.includes('ELK-DEBUG')) {
        consoleMessages.push(text);
        console.log('📋 Console:', text);
      }
    };
    page.on('console', consoleListener);
    
    // Try clicking the button using Playwright's native click first
    console.log(`📍 Clicking arrange button using Playwright...`);
    try {
      await buttonElement.click({ timeout: 2000, force: false });
      console.log('✅ Button clicked using Playwright locator');
    } catch (error) {
      console.log('⚠️ Playwright click failed, trying mouse click...');
      // Fallback to mouse click at button center
      await page.mouse.click(handlerAvailable.x, handlerAvailable.y);
      console.log('✅ Button clicked using mouse click');
    }
    
    // Also try triggering via React fiber as backup
    const fiberResult = await page.evaluate((gId) => {
      const groupElement = document.querySelector(`[data-id="${gId}"]`);
      if (!groupElement) return { called: false, reason: 'Group not found' };
      
      const buttons = Array.from(groupElement.querySelectorAll('button'));
      for (const btn of buttons) {
        const svg = btn.querySelector('svg');
        if (svg) {
          const reactKey = Object.keys(btn).find(key => key.startsWith('__react'));
          if (reactKey) {
            const fiber = (btn as any)[reactKey];
            if (fiber && fiber.memoizedProps && fiber.memoizedProps.onClick) {
              try {
                fiber.memoizedProps.onClick({ 
                  stopPropagation: () => {},
                  preventDefault: () => {},
                  target: btn,
                  currentTarget: btn
                });
                return { called: true, method: 'fiber' };
              } catch (e) {
                return { called: false, error: String(e) };
              }
            }
          }
        }
      }
      return { called: false, reason: 'Could not find onClick handler' };
    }, groupId);
    
    console.log('🔍 Fiber click result:', fiberResult);
    
    await page.waitForTimeout(1000); // Wait for handler to process
    
    // Remove console listener
    page.removeListener('console', consoleListener);
    
    // Verify handler was called
    if (consoleMessages.length === 0) {
      console.error('❌ handleArrangeGroup was NOT called - no console logs found');
      console.error('This suggests the button click is not triggering the handler');
      // Don't fail yet - maybe it's working but logs aren't captured
    } else {
      console.log('✅ handleArrangeGroup was called:', consoleMessages);
    }
    
    console.log('✅ Clicked arrange button - group should now be in LOCK mode');
    
    // Wait for mode to change to LOCK (with timeout)
    console.log('⏳ Waiting for mode to change to LOCK...');
    let modeChanged = false;
    for (let i = 0; i < 20; i++) {
      await page.waitForTimeout(200);
      const currentMode = await page.evaluate((gId) => {
        const viewState = (window as any).getViewState?.() || { layout: {} };
        return viewState.layout?.[gId]?.mode || 'FREE';
      }, groupId);
      
      if (currentMode === 'LOCK') {
        modeChanged = true;
        console.log(`✅ Mode changed to LOCK after ${(i + 1) * 200}ms`);
        break;
      }
    }
    
    if (!modeChanged) {
      console.error('❌ Mode did not change to LOCK after clicking arrange button');
      // Continue anyway to see what happened
    }
    
    // Step 3: Wait for ELK to run and arrange nodes
    console.log('📦 Step 3: Waiting for ELK to arrange nodes...');
    
    // Wait for any potential navigation to complete
    await page.waitForLoadState('domcontentloaded', { timeout: 5000 }).catch(() => {
      // Navigation might not happen, that's okay
    });
    
    // Wait for layout to complete - nodes should move
    await page.waitForTimeout(3000); // Give ELK time to run
    
    // Step 4: Verify nodes were arranged (positions changed) AND group size preserved
    console.log('📦 Step 4: Verifying nodes were arranged and group size preserved...');
    
    // Retry the evaluation in case of navigation
    let positionsAfter: any;
    try {
      positionsAfter = await page.evaluate(([gId, nIds]) => {
      const viewState = (window as any).getViewState?.() || { node: {}, group: {} };
      const positions: Record<string, { x: number; y: number }> = {};
      
      for (const nodeId of nIds as string[]) {
        const geom = viewState.node?.[nodeId];
        if (geom) {
          positions[nodeId] = { x: geom.x, y: geom.y };
        }
      }
      
      // Also check group mode and size from ViewState
      const groupMode = viewState.layout?.[gId]?.mode;
      const groupGeom = viewState.group?.[gId];
      const groupSize = groupGeom ? { w: groupGeom.w, h: groupGeom.h } : null;
      
      // ALSO check ReactFlow node dimensions and TYPE
      const groupNode = document.querySelector(`[data-id="${gId}"]`);
      let reactFlowSize = null;
      let reactFlowType = null;
      let reactFlowIsGroup = null;
      if (groupNode) {
        const rect = groupNode.getBoundingClientRect();
        const styles = window.getComputedStyle(groupNode);
        const width = parseFloat(styles.width) || rect.width;
        const height = parseFloat(styles.height) || rect.height;
        reactFlowSize = { w: width, h: height };
        
        // Check ReactFlow node type by inspecting the element's data attributes or class
        // Groups should have type 'draftGroup', not 'custom'
        const reactFlowInstance = (window as any).__reactFlowInstance;
        if (reactFlowInstance) {
          const rfNode = reactFlowInstance.getNode(gId);
          if (rfNode) {
            reactFlowType = rfNode.type;
            reactFlowIsGroup = rfNode.data?.isGroup === true;
          }
        }
      }
      
      return { positions, groupMode, groupSize, reactFlowSize, reactFlowType, reactFlowIsGroup };
    }, [groupId, nodeIds]);
    } catch (error: any) {
      if (error.message?.includes('Execution context was destroyed')) {
        console.log('⚠️ Navigation occurred, waiting and retrying...');
        await page.waitForLoadState('domcontentloaded', { timeout: 5000 });
        await page.waitForSelector('.react-flow__renderer', { timeout: 10000 });
        await page.waitForTimeout(2000);
        
        // Retry the evaluation
        positionsAfter = await page.evaluate(([gId, nIds]) => {
          const viewState = (window as any).getViewState?.() || { node: {}, group: {} };
          const positions: Record<string, { x: number; y: number }> = {};
          
          for (const nodeId of nIds) {
            const geom = viewState.node?.[nodeId];
            if (geom) {
              positions[nodeId] = { x: geom.x, y: geom.y };
            }
          }
          
          // Also check group mode and size from ViewState
          const groupMode = viewState.layout?.[gId]?.mode;
          const groupGeom = viewState.group?.[gId];
          const groupSize = groupGeom ? { w: groupGeom.w, h: groupGeom.h } : null;
          
          // ALSO check ReactFlow node dimensions and TYPE
          const groupNode = document.querySelector(`[data-id="${gId}"]`);
          let reactFlowSize = null;
          let reactFlowType = null;
          let reactFlowIsGroup = null;
          if (groupNode) {
            const rect = groupNode.getBoundingClientRect();
            const styles = window.getComputedStyle(groupNode);
            const width = parseFloat(styles.width) || rect.width;
            const height = parseFloat(styles.height) || rect.height;
            reactFlowSize = { w: width, h: height };
            
            // Check ReactFlow node type
            const reactFlowInstance = (window as any).__reactFlowInstance;
            if (reactFlowInstance) {
              const rfNode = reactFlowInstance.getNode(gId);
              if (rfNode) {
                reactFlowType = rfNode.type;
                reactFlowIsGroup = rfNode.data?.isGroup === true;
              }
            }
          }
          
          return { positions, groupMode, groupSize, reactFlowSize, reactFlowType, reactFlowIsGroup };
        }, [groupId, nodeIds]);
      } else {
        throw error;
      }
    }
    
    console.log('📍 Positions after lock mode:', positionsAfter.positions);
    console.log('🔒 Group mode:', positionsAfter.groupMode);
    
    // Verify group is in LOCK mode
    expect(positionsAfter.groupMode).toBe('LOCK');
    
    // CRITICAL: Verify group is still selected after clicking arrange button
    console.log('📦 Verifying group stays selected after locking...');
    const isStillSelectedAfterLock = await page.evaluate((gId) => {
      const reactFlowInstance = (window as any).__reactFlowInstance;
      if (!reactFlowInstance) return false;
      const nodes = reactFlowInstance.getNodes();
      const groupNode = nodes.find((n: any) => n.id === gId);
      return groupNode && groupNode.selected === true;
    }, groupId);
    
    expect(isStillSelectedAfterLock).toBe(true);
    console.log('✅ Group remains selected after locking');
    
    // Verify nodes have valid positions (not all at 0,0)
    const allAtOrigin = Object.values(positionsAfter.positions).every(
      pos => pos.x === 0 && pos.y === 0
    );
    
    if (allAtOrigin) {
      throw new Error('❌ All nodes are at origin (0,0) - ELK did not arrange them');
    }
    
    // Verify nodes are not overlapping (each node should have unique position)
    const positions = Object.values(positionsAfter.positions);
    const uniquePositions = new Set(positions.map(p => `${p.x},${p.y}`));
    
    if (uniquePositions.size < 3) {
      throw new Error(`❌ Nodes are overlapping - only ${uniquePositions.size} unique positions for 3 nodes`);
    }
    
    // Verify nodes moved (at least one node should have different position)
    const nodesMoved = nodeIds.some(nodeId => {
      const before = beforeState.positions[nodeId];
      const after = positionsAfter.positions[nodeId];
      if (!before || !after) return false;
      const dx = Math.abs(after.x - before.x);
      const dy = Math.abs(after.y - before.y);
      return dx > 10 || dy > 10; // Allow for small rounding differences
    });
    
    if (!nodesMoved) {
      throw new Error('❌ No nodes moved after lock mode - ELK did not arrange them');
    }
    
    // CRITICAL: Verify group size did NOT change in ViewState
    if (!positionsAfter.groupSize) {
      throw new Error('❌ Group size missing from ViewState after lock mode');
    }
    
    const sizeChangedViewState = 
      Math.abs(positionsAfter.groupSize.w - beforeState.groupSize!.w) > 1 ||
      Math.abs(positionsAfter.groupSize.h - beforeState.groupSize!.h) > 1;
    
    if (sizeChangedViewState) {
      throw new Error(
        `❌ Group size changed in ViewState! Before: ${beforeState.groupSize!.w}x${beforeState.groupSize!.h}, ` +
        `After: ${positionsAfter.groupSize.w}x${positionsAfter.groupSize.h}. ` +
        `Group size should stay the same when arranging nodes.`
      );
    }
    
    console.log('✅ Group size preserved in ViewState:', positionsAfter.groupSize);
    
    // CRITICAL: Verify ReactFlow node size did NOT become huge
    if (!positionsAfter.reactFlowSize) {
      throw new Error('❌ Group ReactFlow node missing after lock mode');
    }
    
    const MAX_REASONABLE_SIZE = 5000; // 5000px is huge, groups should be < 1000px
    if (positionsAfter.reactFlowSize.w > MAX_REASONABLE_SIZE || positionsAfter.reactFlowSize.h > MAX_REASONABLE_SIZE) {
      throw new Error(
        `❌ Group became HUGE in ReactFlow! Size: ${positionsAfter.reactFlowSize.w}x${positionsAfter.reactFlowSize.h}. ` +
        `This is the bug - selecting lock mode should NOT change group dimensions. ` +
        `Before: ${beforeState.reactFlowSize!.w}x${beforeState.reactFlowSize!.h}, ` +
        `After: ${positionsAfter.reactFlowSize.w}x${positionsAfter.reactFlowSize.h}`
      );
    }
    
    // Also verify ReactFlow size didn't change significantly (allowing small rendering differences)
    const sizeChangedReactFlow = 
      Math.abs(positionsAfter.reactFlowSize.w - beforeState.reactFlowSize!.w) > 10 ||
      Math.abs(positionsAfter.reactFlowSize.h - beforeState.reactFlowSize!.h) > 10;
    
    if (sizeChangedReactFlow) {
      throw new Error(
        `❌ Group size changed in ReactFlow! Before: ${beforeState.reactFlowSize!.w}x${beforeState.reactFlowSize!.h}, ` +
        `After: ${positionsAfter.reactFlowSize.w}x${positionsAfter.reactFlowSize.h}. ` +
        `Group size should stay the same when arranging nodes.`
      );
    }
    
    console.log('✅ Group size preserved in ReactFlow:', positionsAfter.reactFlowSize);
    
    // CRITICAL: Verify group is still a GROUP (type should be 'draftGroup', not 'custom')
    if (positionsAfter.reactFlowType && positionsAfter.reactFlowType !== 'draftGroup') {
      throw new Error(
        `❌ Group became a NODE instead of staying a GROUP! ReactFlow type: ${positionsAfter.reactFlowType}, expected: 'draftGroup'. ` +
        `This is the bug - selecting lock mode should NOT change the group type. ` +
        `isGroup flag: ${positionsAfter.reactFlowIsGroup}`
      );
    }
    
    if (positionsAfter.reactFlowIsGroup !== true) {
      throw new Error(
        `❌ Group lost its isGroup flag! ReactFlow isGroup: ${positionsAfter.reactFlowIsGroup}, expected: true. ` +
        `This is the bug - selecting lock mode should NOT remove the isGroup flag.`
      );
    }
    
    console.log('✅ Group type preserved:', { type: positionsAfter.reactFlowType, isGroup: positionsAfter.reactFlowIsGroup });
    
    // Step 5: Verify edges are still connected
    console.log('📦 Step 5: Verifying edges are still connected...');
    
    const edgesStillConnected = await page.evaluate((nIds) => {
      const domain = (window as any).getDomainGraph?.() || { children: [] };
      
      // Find all edges
      const findAllEdges = (graph: any): any[] => {
        const edges: any[] = [];
        if (graph.edges && Array.isArray(graph.edges)) {
          edges.push(...graph.edges);
        }
        if (graph.children) {
          for (const child of graph.children) {
            edges.push(...findAllEdges(child));
          }
        }
        return edges;
      };
      
      const allEdges = findAllEdges(domain);
      
      // Check if we have edges connecting our nodes
      const relevantEdges = allEdges.filter((edge: any) => {
        const source = edge.sources?.[0] || edge.source;
        const target = edge.targets?.[0] || edge.target;
        return nIds.includes(source) && nIds.includes(target);
      });
      
      return relevantEdges.length >= 2;
    }, nodeIds);
    
    expect(edgesStillConnected).toBe(true);
    
    console.log('✅ Part 1 passed: Nodes were arranged by ELK when lock mode was selected');
    
    // Step 6: Now deselect lock mode (toggle back to FREE)
    console.log('📦 Step 6: Deselecting lock mode (toggling back to FREE)...');
    
    // Wait a bit to ensure state is stable
    await page.waitForTimeout(1000);
    
    // Select the group again (it may have been deselected)
    const groupBox2 = await groupElement.boundingBox();
    if (!groupBox2) {
      throw new Error('❌ Group element not found for deselection');
    }
    
    // Click on the group to select it again
    await page.mouse.click(groupBox2.x + groupBox2.width / 2, groupBox2.y + 15);
    await page.waitForTimeout(500); // Wait for selection to register
    
    // Click the arrange button again to toggle to FREE
    const consoleMessages2: string[] = [];
    const consoleListener2 = (msg: any) => {
      const text = msg.text();
      if (text.includes('[ARRANGE]') || text.includes('handleArrangeGroup')) {
        consoleMessages2.push(text);
      }
    };
    page.on('console', consoleListener2);
    
    // Use React fiber to trigger the click (same approach as before)
    const fiberResult2 = await page.evaluate((gId) => {
      const groupElement = document.querySelector(`[data-id="${gId}"]`);
      if (!groupElement) return { called: false, reason: 'Group not found' };
      
      const buttons = Array.from(groupElement.querySelectorAll('button'));
      for (const btn of buttons) {
        const svg = btn.querySelector('svg');
        if (svg) {
          const reactKey = Object.keys(btn).find(key => key.startsWith('__react'));
          if (reactKey) {
            const fiber = (btn as any)[reactKey];
            if (fiber && fiber.memoizedProps && fiber.memoizedProps.onClick) {
              try {
                fiber.memoizedProps.onClick({ 
                  stopPropagation: () => {},
                  preventDefault: () => {},
                  nativeEvent: {
                    stopImmediatePropagation: () => {}
                  },
                  target: btn,
                  currentTarget: btn
                });
                return { called: true, method: 'fiber' };
              } catch (e) {
                return { called: false, error: String(e) };
              }
            }
          }
        }
      }
      return { called: false, reason: 'Could not find onClick handler' };
    }, groupId);
    
    console.log('🔍 Fiber click result (deselect):', fiberResult2);
    
    if (!fiberResult2.called) {
      // Fallback to Playwright click
      try {
        const buttonElement2 = groupElement.locator('button:has(svg)').first();
        await buttonElement2.click({ timeout: 2000, force: true });
        console.log('✅ Button clicked using Playwright as fallback');
      } catch (error) {
        console.log('⚠️ Both fiber and Playwright click failed');
      }
    }
    
    await page.waitForTimeout(1500);
    
    page.removeListener('console', consoleListener2);
    
    if (consoleMessages2.length > 0) {
      console.log('✅ handleArrangeGroup called for deselection:', consoleMessages2);
    }
    
    // Step 7: Verify mode changed back to FREE
    console.log('📦 Step 7: Verifying mode changed to FREE...');
    let modeChangedToFree = false;
    for (let i = 0; i < 30; i++) {
      await page.waitForTimeout(200);
      const currentMode = await page.evaluate((gId) => {
        const viewState = (window as any).getViewState?.() || { layout: {} };
        return viewState.layout?.[gId]?.mode || 'FREE';
      }, groupId);
      
      if (currentMode === 'FREE') {
        modeChangedToFree = true;
        console.log(`✅ Mode changed to FREE after deselection (${(i + 1) * 200}ms)`);
        break;
      }
    }
    
    expect(modeChangedToFree).toBe(true);
    
    // Step 8: Verify group is still a group (not a node) after deselection
    console.log('📦 Step 8: Verifying group remains a group after deselection...');
    const groupInfoAfterDeselect = await page.evaluate((gId) => {
      const reactFlowInstance = (window as any).__reactFlowInstance;
      if (!reactFlowInstance) return null;
      const rfNode = reactFlowInstance.getNode(gId);
      if (!rfNode) return null;
      return {
        type: rfNode.type,
        isGroup: rfNode.data?.isGroup === true,
        mode: rfNode.data?.mode,
        width: rfNode.data?.width,
        height: rfNode.data?.height
      };
    }, groupId);
    
    expect(groupInfoAfterDeselect).not.toBeNull();
    expect(groupInfoAfterDeselect?.type).toBe('draftGroup');
    expect(groupInfoAfterDeselect?.isGroup).toBe(true);
    expect(groupInfoAfterDeselect?.mode).toBe('FREE');
    
    // CRITICAL: Verify group is still selected after deselecting lock mode
    console.log('📦 Verifying group stays selected after unlocking...');
    const isStillSelectedAfterUnlock = await page.evaluate((gId) => {
      const reactFlowInstance = (window as any).__reactFlowInstance;
      if (!reactFlowInstance) return false;
      const nodes = reactFlowInstance.getNodes();
      const groupNode = nodes.find((n: any) => n.id === gId);
      return groupNode && groupNode.selected === true;
    }, groupId);
    
    expect(isStillSelectedAfterUnlock).toBe(true);
    console.log('✅ Group remains selected after unlocking');
    
    // Verify group size didn't change after deselection
    const groupSizeAfterDeselect = await page.evaluate((gId) => {
      const viewState = (window as any).getViewState?.() || { group: {} };
      const groupGeom = viewState.group?.[gId];
      return groupGeom ? { w: groupGeom.w, h: groupGeom.h } : null;
    }, groupId);
    
    expect(groupSizeAfterDeselect).not.toBeNull();
    expect(groupSizeAfterDeselect?.w).toBe(beforeState.groupSize!.w);
    expect(groupSizeAfterDeselect?.h).toBe(beforeState.groupSize!.h);
    
    console.log('✅ Group successfully deselected (FREE mode) and remains a group with preserved size');
    console.log('✅ Test passed: Lock mode selection AND deselection both work correctly');
  });
});
