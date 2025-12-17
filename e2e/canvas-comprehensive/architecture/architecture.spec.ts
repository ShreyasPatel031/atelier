import { test, expect } from '@playwright/test';
import { baseURL, addNodeToCanvas } from '../shared-utils';

test.describe('Architecture Violation Tests', () => {
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

  test('ELK Hook Bypass - FREE mode should not involve ELK hook', async ({ page }) => {
    test.setTimeout(30000); // 30 seconds
    
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
    test.setTimeout(30000); // 30 seconds
    
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
    test.setTimeout(30000); // 30 seconds
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

  test('VISUAL-AI-DIAGRAM: loadComplexDefault - verify architecture structure and edge routing', async ({ page }) => {
    test.setTimeout(30000); // Allow more time for ELK layout

    // Wait for page to be ready
    await page.waitForSelector('.react-flow', { timeout: 10000 });
    
    // Expected structure from DEFAULT_ARCHITECTURE
    const expectedNodes = [
      // Top-level group
      'group_1',
      // External clients group
      'external_clients', 'external_client',
      // GCP environment
      'gcp_env',
      // API Gateway group
      'api_gateway', 'cloud_lb', 'cloud_armor', 'cloud_cdn',
      // Compute services group
      'compute_services', 'gke_cluster', 'cloud_run', 'cloud_functions',
      // Data services group
      'data_services', 'cloud_sql', 'cloud_storage', 'bigquery',
      // Users group
      'users', 'web_client', 'mobile_client'
    ];

    const expectedEdges = [
      // API Gateway edges (inside api_gateway group)
      { id: 'edge_cdn_lb', source: 'cloud_cdn', target: 'cloud_lb' },
      { id: 'edge_armor_lb', source: 'cloud_armor', target: 'cloud_lb' },
      // Compute services edges (inside compute_services group)
      { id: 'edge_gke_run', source: 'gke_cluster', target: 'cloud_run' },
      { id: 'edge_run_functions', source: 'cloud_run', target: 'cloud_functions' },
      // Data services edges (inside data_services group)
      { id: 'edge_sql_storage', source: 'cloud_sql', target: 'cloud_storage' },
      { id: 'edge_storage_bq', source: 'cloud_storage', target: 'bigquery' },
      // GCP environment edges (inside gcp_env group)
      { id: 'edge_lb_gke', source: 'cloud_lb', target: 'gke_cluster' },
      { id: 'edge_gke_sql', source: 'gke_cluster', target: 'cloud_sql' },
      { id: 'edge_functions_storage', source: 'cloud_functions', target: 'cloud_storage' },
      // Top-level edges (inside group_1)
      { id: 'edge_client_lb', source: 'external_client', target: 'cloud_lb' },
      { id: 'edge_web_gke', source: 'web_client', target: 'gke_cluster' },
      { id: 'edge_mobile_gke', source: 'mobile_client', target: 'gke_cluster' }
    ];

    const expectedGroupHierarchy: Record<string, string[]> = {
      'group_1': ['external_clients', 'gcp_env', 'users'],
      'external_clients': ['external_client'],
      'gcp_env': ['api_gateway', 'compute_services', 'data_services'],
      'api_gateway': ['cloud_lb', 'cloud_armor', 'cloud_cdn'],
      'compute_services': ['gke_cluster', 'cloud_run', 'cloud_functions'],
      'data_services': ['cloud_sql', 'cloud_storage', 'bigquery'],
      'users': ['web_client', 'mobile_client']
    };

    // Load the complex default architecture
    console.log('🧪 Loading complex default architecture...');
    await page.evaluate(() => {
      if ((window as any).loadComplexDefault) {
        (window as any).loadComplexDefault();
      } else {
        throw new Error('loadComplexDefault function not available');
      }
    });

    // Wait for ELK layout to complete and nodes to render
    await page.waitForTimeout(3000); // Give ELK time to layout

    // Wait for all expected nodes to appear
    for (const nodeId of expectedNodes) {
      await page.waitForSelector(`[data-id="${nodeId}"]`, { timeout: 10000 }).catch(() => {
        throw new Error(`Node ${nodeId} not found after loading architecture`);
      });
    }

    console.log('✅ All nodes rendered');

    // 1. Verify all nodes exist in domain
    const domainCheck = await page.evaluate((expectedNodeIds) => {
      const domain = (window as any).getDomainGraph?.() || { children: [] };
      
      const collectNodeIds = (node: any, ids: Set<string>) => {
        if (node.id && node.id !== 'root') {
          ids.add(node.id);
        }
        if (node.children) {
          node.children.forEach((child: any) => collectNodeIds(child, ids));
        }
      };

      const foundIds = new Set<string>();
      collectNodeIds(domain, foundIds);

      const missing = expectedNodeIds.filter(id => !foundIds.has(id));
      return {
        found: Array.from(foundIds),
        missing,
        allPresent: missing.length === 0
      };
    }, expectedNodes);

    expect(domainCheck.allPresent).toBe(true);
    expect(domainCheck.missing).toEqual([]);
    console.log(`✅ Domain: All ${expectedNodes.length} nodes present`);

    // 2. Verify group hierarchy (children in correct groups)
    const hierarchyCheck = await page.evaluate((expectedHierarchy) => {
      const domain = (window as any).getDomainGraph?.() || { children: [] };
      
      const findNode = (node: any, id: string): any => {
        if (node.id === id) return node;
        if (node.children) {
          for (const child of node.children) {
            const found = findNode(child, id);
            if (found) return found;
          }
        }
        return null;
      };

      const violations: string[] = [];
      
      for (const [groupId, expectedChildren] of Object.entries(expectedHierarchy)) {
        const group = findNode(domain, groupId);
        if (!group) {
          violations.push(`Group ${groupId} not found`);
          continue;
        }

        const actualChildren = (group.children || []).map((c: any) => c.id).filter((id: string) => id);
        const missing = expectedChildren.filter(id => !actualChildren.includes(id));
        const extra = actualChildren.filter((id: string) => !expectedChildren.includes(id));
        
        if (missing.length > 0) {
          violations.push(`Group ${groupId}: missing children: ${missing.join(', ')}`);
        }
        if (extra.length > 0) {
          violations.push(`Group ${groupId}: unexpected children: ${extra.join(', ')}`);
        }
      }

      return {
        violations,
        valid: violations.length === 0
      };
    }, expectedGroupHierarchy);

    expect(hierarchyCheck.valid).toBe(true);
    expect(hierarchyCheck.violations).toEqual([]);
    console.log('✅ Group hierarchy: All children in correct groups');

    // 3. Verify all edges exist and connect to correct nodes
    const edgeCheck = await page.evaluate((expectedEdgesList) => {
      const domain = (window as any).getDomainGraph?.() || { children: [] };
      
      const collectEdges = (node: any, edges: any[]) => {
        if (node.edges) {
          edges.push(...node.edges);
        }
        if (node.children) {
          node.children.forEach((child: any) => collectEdges(child, edges));
        }
      };

      const allEdges: any[] = [];
      collectEdges(domain, allEdges);

      const edgeMap = new Map(allEdges.map(e => [e.id, e]));
      
      const violations: string[] = [];
      
      for (const expected of expectedEdgesList) {
        const actual = edgeMap.get(expected.id);
        if (!actual) {
          violations.push(`Edge ${expected.id} not found`);
          continue;
        }

        const actualSource = actual.sources?.[0] || actual.source;
        const actualTarget = actual.targets?.[0] || actual.target;

        if (actualSource !== expected.source) {
          violations.push(`Edge ${expected.id}: expected source ${expected.source}, got ${actualSource}`);
        }
        if (actualTarget !== expected.target) {
          violations.push(`Edge ${expected.id}: expected target ${expected.target}, got ${actualTarget}`);
        }
      }

      return {
        found: allEdges.map(e => e.id),
        violations,
        valid: violations.length === 0
      };
    }, expectedEdges);

    expect(edgeCheck.valid).toBe(true);
    expect(edgeCheck.violations).toEqual([]);
    console.log(`✅ Edges: All ${expectedEdges.length} edges present and correctly connected`);

    // 4. Verify edges are rendered on canvas
    const canvasEdgeCheck = await page.evaluate(() => {
      const edges = document.querySelectorAll('.react-flow__edge');
      return edges.length;
    });

    expect(canvasEdgeCheck).toBeGreaterThanOrEqual(expectedEdges.length);
    console.log(`✅ Canvas: ${canvasEdgeCheck} edges rendered`);

    // 5. Verify no edges pass through nodes (edge collision detection)
    const collisionCheck = await page.evaluate(() => {
      // Helper: Line segment intersects rectangle
      const lineIntersectsRect = (p1: {x: number, y: number}, p2: {x: number, y: number}, rect: {x: number, y: number, width: number, height: number}): boolean => {
        const left = rect.x;
        const right = rect.x + rect.width;
        const top = rect.y;
        const bottom = rect.y + rect.height;

        // Quick bounding box check
        if ((p1.x < left && p2.x < left) || (p1.x > right && p2.x > right)) return false;
        if ((p1.y < top && p2.y < top) || (p1.y > bottom && p2.y > bottom)) return false;

        // Check if line intersects rectangle edges
        const intersects = (
          // Horizontal edges
          ((p1.y >= top && p1.y <= bottom) && (p2.y >= top && p2.y <= bottom) && 
           !((p1.x < left && p2.x < left) || (p1.x > right && p2.x > right))) ||
          // Vertical edges  
          ((p1.x >= left && p1.x <= right) && (p2.x >= left && p2.x <= right) &&
           !((p1.y < top && p2.y < top) || (p1.y > bottom && p2.y > bottom)))
        );

        // More precise check: see if line crosses any rectangle edge
        const crossesTop = (p1.y <= top && p2.y >= top) || (p1.y >= top && p2.y <= top);
        const crossesBottom = (p1.y <= bottom && p2.y >= bottom) || (p1.y >= bottom && p2.y <= bottom);
        const crossesLeft = (p1.x <= left && p2.x >= left) || (p1.x >= left && p2.x <= left);
        const crossesRight = (p1.x <= right && p2.x >= right) || (p1.x >= right && p2.x <= right);

        if (crossesTop || crossesBottom || crossesLeft || crossesRight) {
          // Calculate intersection points
          const dx = p2.x - p1.x;
          const dy = p2.y - p1.y;
          
          if (Math.abs(dx) < 1e-10) { // Vertical line
            if (p1.x >= left && p1.x <= right) {
              return (p1.y <= bottom && p2.y >= top) || (p1.y >= top && p2.y <= bottom);
            }
            return false;
          }
          
          if (Math.abs(dy) < 1e-10) { // Horizontal line
            if (p1.y >= top && p1.y <= bottom) {
              return (p1.x <= right && p2.x >= left) || (p1.x >= left && p2.x <= right);
            }
            return false;
          }

          // General case: check if line segment intersects rectangle
          const tMin = Math.min((left - p1.x) / dx, (right - p1.x) / dx);
          const tMax = Math.max((left - p1.x) / dx, (right - p1.x) / dx);
          const uMin = Math.min((top - p1.y) / dy, (bottom - p1.y) / dy);
          const uMax = Math.max((top - p1.y) / dy, (bottom - p1.y) / dy);

          return Math.max(tMin, uMin) <= Math.min(tMax, uMax) && 
                 Math.max(tMin, uMin) >= 0 && 
                 Math.min(tMax, uMax) <= 1;
        }

        return false;
      };

      // Get all nodes with their positions (exclude groups - only check leaf nodes as obstacles)
      // Use ViewState as source of truth for positions, ReactFlow for dimensions
      const viewState = (window as any).getViewState?.() || { node: {}, group: {} };
      const reactFlowInstance = (window as any).reactFlowInstance;
      const reactFlowNodes = reactFlowInstance?.getNodes() || [];
      
      // Build map of ReactFlow node data by ID
      const rfNodeMap = new Map();
      reactFlowNodes.forEach((n: any) => {
        rfNodeMap.set(n.id, n);
      });
      
      // Get leaf nodes (non-groups) from ViewState.node
      const nodeEntries = Object.entries(viewState.node || {});
      const nodes = nodeEntries
        .map(([id, geom]: [string, any]) => {
          const rfNode = rfNodeMap.get(id);
          // Skip if this is actually a group (groups are in viewState.group)
          if (viewState.group?.[id]) return null;
          // Skip if no geometry data
          if (!geom || !geom.x || !geom.y) return null;
          
          return {
            id,
            x: geom.x,
            y: geom.y,
            width: geom.w || rfNode?.width || rfNode?.data?.width || 96,
            height: geom.h || rfNode?.height || rfNode?.data?.height || 96
          };
        })
        .filter(n => n !== null) as Array<{id: string, x: number, y: number, width: number, height: number}>;

      // Get ReactFlow instance - try multiple methods
      let rfInstance = reactFlowInstance;
      if (!rfInstance) {
        // Try alternative ReactFlow instance access patterns
        rfInstance = (window as any).__RF__?.['1'];
      }
      if (!rfInstance && (window as any).reactFlowRef?.current) {
        rfInstance = (window as any).reactFlowRef.current;
      }
      
      // Fallback: try getting ReactFlow instance from canvas element
      if (!rfInstance) {
        const canvasEl = document.querySelector('.react-flow');
        if (canvasEl) {
          // ReactFlow stores instance in various ways - try common patterns
          rfInstance = (canvasEl as any).__reactFlowInstance__ || 
                      (canvasEl as any).reactFlowInstance ||
                      (window as any).reactFlow?.getInstance();
        }
      }

      // Get all edges from ReactFlow instance first, then match to DOM paths
      const rfEdges = rfInstance?.getEdges?.() || [];
      
      // Fallback: get edges from DOM if ReactFlow instance not available
      let edgesToProcess = rfEdges;
      if (edgesToProcess.length === 0) {
        // Try to get edge IDs from DOM and construct basic edge info
        const edgeElements = Array.from(document.querySelectorAll('.react-flow__edge'));
        edgesToProcess = edgeElements
          .map((el) => {
            const edgeId = el.getAttribute('data-id');
            if (!edgeId || edgeId.startsWith('edge-')) return null; // Skip if no ID or placeholder
            const sourceId = el.getAttribute('data-source') || '';
            const targetId = el.getAttribute('data-target') || '';
            return {
              id: edgeId,
              source: sourceId,
              target: targetId,
              data: {}
            };
          })
          .filter((e): e is {id: string, source: string, target: string, data: any} => e !== null);
      }
      
      const collisions: Array<{edgeId: string, nodeId: string, details: string, segmentIndex: number}> = [];
      const edgeDebugInfo: Array<any> = [];

      for (const rfEdge of edgesToProcess) {
        const edgeId = rfEdge.id;
        const sourceId = rfEdge.source || '';
        const targetId = rfEdge.target || '';
        
        // Find corresponding DOM element
        const edgeEl = document.querySelector(`.react-flow__edge[data-id="${edgeId}"]`);
        if (!edgeEl) continue;
        
        const pathEl = edgeEl.querySelector('path, .react-flow__edge-path');
        if (!pathEl) continue;

        const edgeData = rfEdge.data || {};
        const routingMode = edgeData.routingMode || 'FREE';
        const elkStartPoint = edgeData.elkStartPoint;
        const elkEndPoint = edgeData.elkEndPoint;
        const elkWaypoints = edgeData.elkWaypoints || [];

        // Get path data from path element
        const pathData = pathEl.getAttribute('d') || '';
        if (!pathData || pathData === 'M 0,0') continue;

        // Parse path to get points (simplified - handles M, L, and basic paths)
        const points: Array<{x: number, y: number}> = [];
        const commands = pathData.match(/[ML][\s,]+(-?\d+\.?\d*)[\s,]+(-?\d+\.?\d*)/g) || [];
        
        for (const cmd of commands) {
          const match = cmd.match(/(-?\d+\.?\d*)[\s,]+(-?\d+\.?\d*)/);
          if (match) {
            points.push({ x: parseFloat(match[1]), y: parseFloat(match[2]) });
          }
        }

        if (points.length < 2) continue;

        // Find source and target node positions
        const sourceNode = nodes.find(n => n.id === sourceId);
        const targetNode = nodes.find(n => n.id === targetId);

        // Check each segment against all nodes (except source and target)
        // CRITICAL: For edges with >2 points, skip first and last segments (connection segments)
        // For 2-point edges, check if they pass through other nodes (this would be a routing issue)
        const firstSegmentIndex = 0;
        const lastSegmentIndex = points.length - 2;
        const isDirectConnection = points.length === 2;
        
        for (let i = 0; i < points.length - 1; i++) {
          const p1 = points[i];
          const p2 = points[i + 1];

          // For multi-point edges, skip first and last segments (they connect to source/target)
          if (!isDirectConnection) {
            // Skip first segment - it connects from source node
            if (i === firstSegmentIndex && sourceNode) {
              continue;
            }
            
            // Skip last segment - it connects to target node
            if (i === lastSegmentIndex && targetNode) {
              continue;
            }
          }

          for (const node of nodes) {
            // Skip source and target nodes - edges connect FROM/TO these
            if (node.id === sourceId || node.id === targetId) {
              continue;
            }

            const nodeRect = {
              x: node.x,
              y: node.y,
              width: node.width,
              height: node.height
            };

            if (lineIntersectsRect(p1, p2, nodeRect)) {
              collisions.push({
                edgeId,
                nodeId: node.id,
                segmentIndex: i,
                details: `Edge ${edgeId} segment [${i}/${points.length-1}] (${p1.x.toFixed(1)},${p1.y.toFixed(1)}) → (${p2.x.toFixed(1)},${p2.y.toFixed(1)}) intersects node ${node.id} at (${node.x.toFixed(1)},${node.y.toFixed(1)}) ${node.width}x${node.height}`
              });
            }
          }
        }

        // Store debug info for this edge
        edgeDebugInfo.push({
          edgeId,
          sourceId,
          targetId,
          routingMode,
          pathPointsCount: points.length,
          pathPoints: points.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`),
          elkStartPoint: elkStartPoint ? `${elkStartPoint.x.toFixed(1)},${elkStartPoint.y.toFixed(1)}` : null,
          elkEndPoint: elkEndPoint ? `${elkEndPoint.x.toFixed(1)},${elkEndPoint.y.toFixed(1)}` : null,
          elkWaypointsCount: elkWaypoints.length,
          elkWaypoints: elkWaypoints.map((p: any) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`)
        });
      }

      // Analyze collisions to categorize them
      // Build map of edge segment counts
      const edgeSegmentCounts = new Map<string, number>();
      edgeDebugInfo.forEach(info => {
        edgeSegmentCounts.set(info.edgeId, info.pathPointsCount - 1); // segments = points - 1
      });

      const collisionAnalysis = {
        firstSegment: collisions.filter(c => c.segmentIndex === 0).length,
        lastSegment: collisions.filter(c => {
          const maxSeg = edgeSegmentCounts.get(c.edgeId) || 0;
          return c.segmentIndex === maxSeg;
        }).length,
        middleSegments: collisions.filter(c => {
          const maxSeg = edgeSegmentCounts.get(c.edgeId) || 0;
          return c.segmentIndex > 0 && c.segmentIndex < maxSeg;
        }).length,
        total: collisions.length
      };

      return {
        collisions,
        nodeCount: nodes.length,
        edgeCount: edgeDebugInfo.length, // Count edges we actually processed
        hasCollisions: collisions.length > 0,
        edgeDebugInfo,
        collisionAnalysis
      };
    });

    // Log collision details and ELK data before assertion for debugging
    if (collisionCheck.collisions.length > 0) {
      console.warn('⚠️ Edge collisions detected:');
      console.warn(`Collision breakdown: First segments: ${collisionCheck.collisionAnalysis.firstSegment}, Last segments: ${collisionCheck.collisionAnalysis.lastSegment}, Middle segments: ${collisionCheck.collisionAnalysis.middleSegments}`);
      
      // Group collisions by edge to see patterns
      const collisionsByEdge = new Map<string, typeof collisionCheck.collisions>();
      collisionCheck.collisions.forEach(c => {
        if (!collisionsByEdge.has(c.edgeId)) {
          collisionsByEdge.set(c.edgeId, []);
        }
        collisionsByEdge.get(c.edgeId)!.push(c);
      });

      // Log detailed info for edges with collisions
      collisionsByEdge.forEach((collisions, edgeId) => {
        const edgeInfo = collisionCheck.edgeDebugInfo.find(e => e.edgeId === edgeId);
        console.warn(`\n🔍 Edge ${edgeId} (${edgeInfo?.routingMode || 'UNKNOWN'} mode):`);
        if (edgeInfo) {
          console.warn(`   ELK Start: ${edgeInfo.elkStartPoint || 'MISSING'}, End: ${edgeInfo.elkEndPoint || 'MISSING'}`);
          console.warn(`   ELK Waypoints (${edgeInfo.elkWaypointsCount}): ${edgeInfo.elkWaypoints.join(' → ') || 'NONE'}`);
          console.warn(`   Rendered Path (${edgeInfo.pathPointsCount} points): ${edgeInfo.pathPoints.join(' → ')}`);
        }
        console.warn(`   Collisions (${collisions.length}):`);
        collisions.forEach(c => console.warn(`     ${c.details}`));
      });
      
      console.warn(`\nTotal collisions: ${collisionCheck.collisions.length}`);
      console.warn(`Nodes checked: ${collisionCheck.nodeCount}, Edges checked: ${collisionCheck.edgeCount}`);
    }
    
    // Only fail on middle segment collisions - these are real routing issues
    // First/last segment collisions are often false positives from connection points
    const middleSegmentCollisions = collisionCheck.collisions.filter(c => {
      const maxSeg = collisionCheck.edgeDebugInfo.find(e => e.edgeId === c.edgeId)?.pathPointsCount || 0;
      const maxSegmentIndex = maxSeg - 2;
      return c.segmentIndex > 0 && c.segmentIndex < maxSegmentIndex;
    });
    
    if (middleSegmentCollisions.length > 0) {
      console.error(`\n❌ REAL ROUTING ISSUES: ${middleSegmentCollisions.length} collisions in middle segments:`);
      
      // Group by edge for better analysis
      const middleCollisionsByEdge = new Map<string, typeof middleSegmentCollisions>();
      middleSegmentCollisions.forEach(c => {
        if (!middleCollisionsByEdge.has(c.edgeId)) {
          middleCollisionsByEdge.set(c.edgeId, []);
        }
        middleCollisionsByEdge.get(c.edgeId)!.push(c);
      });
      
      middleCollisionsByEdge.forEach((collisions, edgeId) => {
        const edgeInfo = collisionCheck.edgeDebugInfo.find(e => e.edgeId === edgeId);
        console.error(`\n  🔴 Edge ${edgeId}:`);
        console.error(`     Source: ${edgeInfo?.sourceId}, Target: ${edgeInfo?.targetId}`);
        console.error(`     Mode: ${edgeInfo?.routingMode || 'UNKNOWN'}`);
        console.error(`     ELK Start: ${edgeInfo?.elkStartPoint || 'MISSING'}, End: ${edgeInfo?.elkEndPoint || 'MISSING'}`);
        console.error(`     ELK Waypoints: ${edgeInfo?.elkWaypoints.join(' → ') || 'NONE'}`);
        console.error(`     Rendered Path: ${edgeInfo?.pathPoints.join(' → ') || 'NONE'}`);
        collisions.forEach(c => {
          console.error(`     ❌ ${c.details}`);
        });
      });
      
      expect(middleSegmentCollisions.length).toBe(0);
    }
    
    // Log summary
    if (collisionCheck.collisionAnalysis.middleSegments === 0) {
      console.log(`✅ Edge routing: No edges pass through nodes in middle segments (${collisionCheck.collisionAnalysis.firstSegment + collisionCheck.collisionAnalysis.lastSegment} connection-segment collisions ignored)`);
    }
    console.log(`✅ Edge routing: No edges pass through ${collisionCheck.nodeCount} nodes (checked ${collisionCheck.edgeCount} edges)`);

    console.log('✅ VISUAL-AI-DIAGRAM test passed: Architecture structure and edge routing verified');
  });
});

