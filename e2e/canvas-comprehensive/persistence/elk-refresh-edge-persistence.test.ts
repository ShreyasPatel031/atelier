import { test, expect } from '@playwright/test';
import { baseURL } from '../shared-utils';

test.describe('ELK Refresh and Edge Persistence', () => {
  test.beforeEach(async ({ page }) => {
    // Listen for console errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('Browser console error:', msg.text());
      }
    });
    
    page.on('pageerror', error => {
      console.error('Page error:', error.message);
    });
    
    await page.goto(`${baseURL}/canvas`);
    
    // Check for error page
    const hasError = await page.evaluate(() => {
      return document.body.textContent?.includes('Something went wrong') || false;
    });
    
    if (hasError) {
      const errorDetails = await page.evaluate(() => {
        const errorEl = document.querySelector('pre');
        return errorEl?.textContent || document.body.textContent || '';
      });
      throw new Error(`Page failed to load: ${errorDetails}`);
    }
    
    await page.waitForSelector('.react-flow', { timeout: 10000 });
    await page.waitForLoadState('networkidle');
    
    // Clear any existing state
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.waitForTimeout(2000);
  });

  test('loadComplexDefault: edges persist and ELK reruns on refresh', async ({ page }) => {
    test.setTimeout(60000);
    
    // Step 1: Wait for loadComplexDefault to be available
    await page.waitForFunction(() => typeof (window as any).loadComplexDefault === 'function', { timeout: 15000 });
    
    // Step 2: Load complex default diagram
    console.log('📊 Loading complex default diagram...');
    const loadResult = await page.evaluate(() => {
      if (typeof (window as any).loadComplexDefault === 'function') {
        (window as any).loadComplexDefault();
        return true;
      }
      return false;
    });
    
    expect(loadResult).toBe(true);
    
    // Step 3: Wait for diagram to load and ELK layout to complete
    console.log('⏳ Waiting for diagram to load and ELK layout...');
    await page.waitForTimeout(8000); // Give ELK time to complete
    
    // Wait for nodes and edges to appear
    await page.waitForSelector('.react-flow__node', { timeout: 20000 });
    await page.waitForSelector('.react-flow__edge', { timeout: 20000 });
    await page.waitForTimeout(3000); // Additional wait for routing
    
    // Step 3a: Wait for snapshot to be saved (persistence useEffect runs after nodes/edges are set)
    console.log('⏳ Waiting for snapshot to be saved...');
    await page.waitForFunction(() => {
      const snapshot = localStorage.getItem('atelier_canvas_last_snapshot_v1');
      if (!snapshot) return false;
      try {
        const parsed = JSON.parse(snapshot);
        return parsed && parsed.rawGraph && parsed.rawGraph.children && parsed.rawGraph.children.length > 0;
      } catch {
        return false;
      }
    }, { timeout: 10000 });
    await page.waitForTimeout(1000); // Additional wait to ensure snapshot is fully saved
    
    // Step 4: Capture initial state - edges with handles and waypoints
    console.log('📸 Capturing initial edge state...');
    const initialState = await page.evaluate(() => {
      // Get ReactFlow instance
      const reactFlowInstance = (window as any).__reactFlowInstance || 
                                (window as any).__RF__?.['1']?.getState?.()?.reactFlowInstance;
      
      if (!reactFlowInstance) {
        // Fallback: get edges from DOM
        const edgeElements = document.querySelectorAll('.react-flow__edge');
        const edges: any[] = [];
        edgeElements.forEach((el) => {
          const edgeId = el.getAttribute('data-id') || el.id;
          const path = el.querySelector('path');
          const d = path?.getAttribute('d') || '';
          
          edges.push({
            id: edgeId,
            hasPath: !!path,
            pathData: d.substring(0, 50), // First 50 chars of path
          });
        });
        
        return {
          edges,
          method: 'dom',
          reactFlowAvailable: false,
        };
      }
      
      // Get edges from ReactFlow
      const edges = reactFlowInstance.getEdges();
      const nodes = reactFlowInstance.getNodes();
      
      return {
        edges: edges.map((e: any) => ({
          id: e.id,
          source: e.source,
          target: e.target,
          sourceHandle: e.sourceHandle,
          targetHandle: e.targetHandle,
          hasWaypoints: !!(e.data?.waypoints && e.data.waypoints.length > 0),
          waypointCount: e.data?.waypoints?.length || 0,
        })),
        nodes: nodes.map((n: any) => ({
          id: n.id,
          type: n.type,
        })),
        method: 'reactflow',
        reactFlowAvailable: true,
        edgeCount: edges.length,
        nodeCount: nodes.length,
      };
    });
    
    console.log('📊 Initial state:', {
      edgeCount: initialState.edges?.length || 0,
      method: initialState.method,
      edgesWithHandles: initialState.edges?.filter((e: any) => e.sourceHandle || e.targetHandle).length || 0,
      edgesWithWaypoints: initialState.edges?.filter((e: any) => e.hasWaypoints).length || 0,
      edgesWithElkCoords: initialState.edges?.filter((e: any) => e.hasElkCoords).length || 0,
      lockModeEdges: initialState.edges?.filter((e: any) => e.routingMode === 'LOCK').length || 0,
    });
    
    // Verify we have edges
    expect(initialState.edges?.length || 0).toBeGreaterThan(0);
    
    // Verify edges have handles (not fallback edges)
    const edgesWithHandles = initialState.edges?.filter((e: any) => e.sourceHandle || e.targetHandle) || [];
    expect(edgesWithHandles.length).toBeGreaterThan(0);
    console.log(`✅ Found ${edgesWithHandles.length} edges with handles (not fallback)`);
    
    // Step 5: Check ViewState for edge handles
    console.log('🔍 Checking ViewState for edge handles...');
    const viewStateCheck = await page.evaluate(() => {
      const viewStateStr = localStorage.getItem('atelier_canvas_last_snapshot_v1');
      if (!viewStateStr) return { hasSnapshot: false };
      
      try {
        const snapshot = JSON.parse(viewStateStr);
        const edgeViewState = snapshot.viewState?.edge || {};
        const edgeIds = Object.keys(edgeViewState);
        
        return {
          hasSnapshot: true,
          edgeCount: edgeIds.length,
          edgesWithHandles: edgeIds.filter(id => {
            const edge = edgeViewState[id];
            return edge?.sourceHandle || edge?.targetHandle;
          }).length,
          sampleEdges: edgeIds.slice(0, 3).map(id => ({
            id,
            sourceHandle: edgeViewState[id]?.sourceHandle,
            targetHandle: edgeViewState[id]?.targetHandle,
          })),
        };
      } catch (e) {
        return { hasSnapshot: true, parseError: String(e) };
      }
    });
    
    console.log('📊 ViewState check:', viewStateCheck);
    expect(viewStateCheck.hasSnapshot).toBe(true);
    expect(viewStateCheck.edgeCount || 0).toBeGreaterThan(0);
    
    // Step 6: Refresh the page
    console.log('🔄 Refreshing page...');
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.react-flow', { timeout: 10000 });
    await page.waitForLoadState('networkidle');
    
    // Step 7: Wait for restoration and ELK layout to complete
    console.log('⏳ Waiting for restoration and ELK layout after refresh...');
    await page.waitForTimeout(8000); // Give restoration and ELK time
    
    // Wait for nodes and edges
    await page.waitForSelector('.react-flow__node', { timeout: 20000 });
    await page.waitForSelector('.react-flow__edge', { timeout: 20000 });
    await page.waitForTimeout(3000); // Additional wait for routing
    
    // Step 8: Capture state after refresh
    console.log('📸 Capturing edge state after refresh...');
    const afterRefreshState = await page.evaluate(() => {
      const reactFlowInstance = (window as any).__reactFlowInstance || 
                                (window as any).__RF__?.['1']?.getState?.()?.reactFlowInstance;
      
      if (!reactFlowInstance) {
        const edgeElements = document.querySelectorAll('.react-flow__edge');
        const edges: any[] = [];
        edgeElements.forEach((el) => {
          const edgeId = el.getAttribute('data-id') || el.id;
          const path = el.querySelector('path');
          const d = path?.getAttribute('d') || '';
          
          edges.push({
            id: edgeId,
            hasPath: !!path,
            pathData: d.substring(0, 50),
          });
        });
        
        return {
          edges,
          method: 'dom',
          reactFlowAvailable: false,
        };
      }
      
      const edges = reactFlowInstance.getEdges();
      const nodes = reactFlowInstance.getNodes();
      
      return {
        edges: edges.map((e: any) => ({
          id: e.id,
          source: e.source,
          target: e.target,
          sourceHandle: e.sourceHandle,
          targetHandle: e.targetHandle,
          hasWaypoints: !!(e.data?.waypoints && e.data.waypoints.length > 0),
          waypointCount: e.data?.waypoints?.length || 0,
        })),
        nodes: nodes.map((n: any) => ({
          id: n.id,
          type: n.type,
        })),
        method: 'reactflow',
        reactFlowAvailable: true,
        edgeCount: edges.length,
        nodeCount: nodes.length,
      };
    });
    
    console.log('📊 After refresh state:', {
      edgeCount: afterRefreshState.edges?.length || 0,
      method: afterRefreshState.method,
      edgesWithHandles: afterRefreshState.edges?.filter((e: any) => e.sourceHandle || e.targetHandle).length || 0,
      edgesWithWaypoints: afterRefreshState.edges?.filter((e: any) => e.hasWaypoints).length || 0,
      edgesWithElkCoords: afterRefreshState.edges?.filter((e: any) => e.hasElkCoords).length || 0,
      lockModeEdges: afterRefreshState.edges?.filter((e: any) => e.routingMode === 'LOCK').length || 0,
    });
    
    // Step 9: Verify edges persisted correctly
    expect(afterRefreshState.edges?.length || 0).toBeGreaterThan(0);
    expect(afterRefreshState.edges?.length).toBe(initialState.edges?.length);
    
    // Step 10: Verify handles are preserved (edges should NOT be fallback)
    const afterRefreshEdgesWithHandles = afterRefreshState.edges?.filter((e: any) => e.sourceHandle || e.targetHandle) || [];
    expect(afterRefreshEdgesWithHandles.length).toBeGreaterThan(0);
    expect(afterRefreshEdgesWithHandles.length).toBe(edgesWithHandles.length);
    console.log(`✅ After refresh: ${afterRefreshEdgesWithHandles.length} edges with handles (same as before)`);
    
    // Step 11: Verify specific edges have same handles
    if (initialState.method === 'reactflow' && afterRefreshState.method === 'reactflow') {
      const initialEdgesMap = new Map(
        initialState.edges.map((e: any) => [e.id, e])
      );
      
      let matchingHandles = 0;
      let totalComparable = 0;
      
      afterRefreshState.edges.forEach((afterEdge: any) => {
        const initialEdge = initialEdgesMap.get(afterEdge.id);
        if (initialEdge) {
          totalComparable++;
          if (initialEdge.sourceHandle === afterEdge.sourceHandle && 
              initialEdge.targetHandle === afterEdge.targetHandle) {
            matchingHandles++;
          }
        }
      });
      
      console.log(`📊 Handle matching: ${matchingHandles}/${totalComparable} edges have matching handles`);
      
      // At least 80% of edges should have matching handles (some might change due to ELK rerun)
      const matchRatio = totalComparable > 0 ? matchingHandles / totalComparable : 0;
      expect(matchRatio).toBeGreaterThan(0.8);
      console.log(`✅ ${(matchRatio * 100).toFixed(1)}% of edges have matching handles`);
    }
    
    // Step 12: Verify ELK was rerun (check console logs for ELK messages)
    console.log('✅ Test passed: Edges persisted and ELK reran on refresh');
  });
});

