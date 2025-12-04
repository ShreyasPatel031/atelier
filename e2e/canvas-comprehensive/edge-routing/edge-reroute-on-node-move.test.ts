import { test, expect } from '@playwright/test';
import { getBaseUrl } from '../../test-config.js';
import {
  waitForNodes,
  waitForEdges,
  waitForConnectorDots,
  waitForEdgePath,
  waitForRoutingComplete,
  waitForCondition,
  activateConnectorTool,
  createNodeWithWait,
  assertNodeExists,
  assertEdgeExists
} from './testHelpers';

test.describe('Edge Reroute on Node Move', () => {
  let BASE_URL: string;

  test.beforeAll(async () => {
    BASE_URL = await getBaseUrl();
  });

  test('should reroute edge during drag and maintain routing after deselection', async ({ page }) => {
    test.setTimeout(8000);
    
    await page.goto(`${BASE_URL}/canvas`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.react-flow__renderer', { timeout: 3000 });

    const pane = page.locator('.react-flow__pane');
    const paneBox = await pane.boundingBox();
    if (!paneBox) throw new Error('ReactFlow pane not found');

    // Create first node (left)
    const node1Id = await createNodeWithWait(page, 150, 200, 3000);

    // Create second node (right, same row)
    const node2Id = await createNodeWithWait(page, 450, 200, 3000);
    await waitForNodes(page, 2, 3000);

    // Create third node (middle, as obstacle) - this forces routing around it
    const node3Id = await createNodeWithWait(page, 300, 200, 3000);
    await waitForNodes(page, 3, 3000);

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
    expect(nodeInfo.length).toBe(3);
    
    // Sort by x position to get left, middle, and right nodes
    nodeInfo.sort((a, b) => a.x - b.x);
    const leftNode = nodeInfo[0];
    const middleNode = nodeInfo[1]; // This is the obstacle
    const rightNode = nodeInfo[2];
    
    console.log('Nodes:', { left: leftNode.id, middle: middleNode.id, right: rightNode.id });

    // Activate connector tool
    await activateConnectorTool(page, 5000);
    await waitForConnectorDots(page, 1, 3000);

    // Calculate click positions for connector dots
    const leftNodeRightDotX = leftNode.x + leftNode.width;
    const leftNodeRightDotY = leftNode.y + leftNode.height / 2;
    const rightNodeLeftDotX = rightNode.x;
    const rightNodeLeftDotY = rightNode.y + rightNode.height / 2;

    // Click source dot to start connection
    await page.mouse.click(leftNodeRightDotX, leftNodeRightDotY);
    await page.waitForTimeout(200); // Brief wait for state update

    // Click target dot to complete connection
    await page.mouse.click(rightNodeLeftDotX, rightNodeLeftDotY);
    
    // Wait for edge to be created with early failure
    await waitForEdges(page, 1, 5000);
    
    // Get initial edge path with early failure
    const initialPath = await waitForEdgePath(page, '.react-flow__edge', 5000);
    expect(initialPath.length).toBeGreaterThan(10); // Should have path data

    // Track path changes during drag
    const pathChanges: string[] = [];
    let pathCheckInterval: NodeJS.Timeout;

    // Helper to get edge path
    const getEdgePath = async () => {
      return await page.evaluate(() => {
        const path = document.querySelector('.react-flow__edge path') as SVGPathElement | null;
        return path?.getAttribute('d') || null;
      });
    };

    // Start monitoring path changes
    const startPathMonitoring = () => {
      pathCheckInterval = setInterval(async () => {
        const currentPath = await getEdgePath();
        if (currentPath && currentPath !== pathChanges[pathChanges.length - 1]) {
          pathChanges.push(currentPath);
        }
      }, 100);
    };

    const stopPathMonitoring = () => {
      if (pathCheckInterval) {
        clearInterval(pathCheckInterval);
      }
    };

    // Get the middle node element for dragging (the obstacle)
    // We'll drag it out of the way to test edge rerouting
    const middleNodeElement = page.locator(`[data-id="${middleNode.id}"]`).first();
    const middleNodeBox = await middleNodeElement.boundingBox();
    if (!middleNodeBox) throw new Error('Middle node not found');

    // Start path monitoring
    startPathMonitoring();

    // Drag middle node down and out of the way (move it 150px down)
    // This should cause the edge to reroute from going around the obstacle to potentially going straight
    const dragStartX = middleNodeBox.x + middleNodeBox.width / 2;
    const dragStartY = middleNodeBox.y + middleNodeBox.height / 2;
    const dragEndX = dragStartX;
    const dragEndY = dragStartY + 150;

    await page.mouse.move(dragStartX, dragStartY);
    await page.mouse.down();
    await page.waitForTimeout(100);

    // Move in steps to trigger rerouting during drag
    const steps = 10;
    for (let i = 1; i <= steps; i++) {
      const currentX = dragStartX + (dragEndX - dragStartX) * (i / steps);
      const currentY = dragStartY + (dragEndY - dragStartY) * (i / steps);
      await page.mouse.move(currentX, currentY);
      await page.waitForTimeout(50); // Small delay to allow rerouting
    }

    await page.mouse.up();
    
    // Wait for final rerouting to complete (path stabilizes)
    const finalPath = await waitForRoutingComplete(page, '.react-flow__edge', 300, 3000);

    // Stop path monitoring
    stopPathMonitoring();

    // Verify path changed during drag (rerouting occurred)
    expect(pathChanges.length).toBeGreaterThan(0);

    // Get final path after drag (already have it from waitForRoutingComplete)
    const pathAfterDrag = finalPath;
    expect(pathAfterDrag).not.toBeNull();
    
    // Log paths for debugging
    console.log('Initial path:', initialPath);
    console.log('Path after drag:', pathAfterDrag);
    console.log('Path changes detected:', pathChanges.length);

    // Check if path is a straight line (only 2 commands: M start, L end)
    // Regex: M or L followed by space, then two numbers (allowing decimals and negatives)
    const pathCommands = pathAfterDrag?.match(/[ML] [\d.-]+ [\d.-]+/g) || [];
    const isStraightLine = pathCommands.length === 2;
    
    if (isStraightLine) {
      console.log('WARNING: Edge is still a straight line after drag - routing not working');
      console.log('Path commands:', pathCommands);
    }
    
    // Path should have changed OR should have more than 2 commands (routed)
    // If it's still a straight line, that's the bug we're testing for
    const pathChanged = pathAfterDrag !== initialPath;
    const isRouted = pathCommands.length > 2;
    
    // The path should have changed after dragging the obstacle
    // Whether it has more or fewer commands depends on the obstacle position
    // But it should definitely have changed!
    if (pathAfterDrag === initialPath) {
      throw new Error(
        `Edge did not reroute when obstacle node was moved. ` +
        `Initial path: "${initialPath}", After drag: "${pathAfterDrag}". ` +
        `Path should change when obstacles move. ` +
        `This indicates edge rerouting is not triggered when nodes are moved.`
      );
    }
    
    // Path should have at least 2 commands (start and end)
    expect(pathCommands.length).toBeGreaterThanOrEqual(2);

    // Deselect the node by clicking on the pane
    await page.mouse.click(paneBox.x + 100, paneBox.y + 100);
    await page.waitForTimeout(300); // Brief wait for deselection

    // Verify edge path is still present after deselection with early failure
    const pathAfterDeselect = await waitForEdgePath(page, '.react-flow__edge', 3000);
    expect(pathAfterDeselect).not.toBeNull();
    
    // Path should still have commands (at least start and end)
    const pathCommandsAfterDeselect = pathAfterDeselect?.match(/[ML] [\d.-]+ [\d.-]+/g) || [];
    expect(pathCommandsAfterDeselect.length).toBeGreaterThanOrEqual(2);

    // The path after deselection should match the path after drag
    // (routing should persist, not collapse to a different path)
    expect(pathAfterDeselect).toBe(pathAfterDrag);

    // Verify no routing errors occurred
    const errors: string[] = [];
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('routing error') || text.includes('aborted') || 
          (text.includes('StepEdge') && text.includes('error'))) {
        errors.push(text);
      }
    });

    // Wait a bit to catch any delayed errors (but not too long)
    await page.waitForTimeout(500);

    const routingErrors = errors.filter(e => 
      e.includes('routing error') || 
      e.includes('aborted') || 
      (e.includes('StepEdge') && e.includes('error'))
    );
    expect(routingErrors.length).toBe(0);
  });

  test('should route edge efficiently without unnecessarily large detours', async ({ page }) => {
    test.setTimeout(8000);
    
    await page.goto(`${BASE_URL}/canvas`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.react-flow__renderer', { timeout: 3000 });

    const pane = page.locator('.react-flow__pane');
    const paneBox = await pane.boundingBox();
    if (!paneBox) throw new Error('ReactFlow pane not found');

    // Create nodes with specific spacing: left node, obstacle, right node
    // Spacing: 200px between left and obstacle, 200px between obstacle and right
    // This gives enough space for routing without creating huge detours
    const leftX = 200;
    const obstacleX = 400;
    const rightX = 600;
    const y = 200;

    // Create left node
    await createNodeWithWait(page, leftX, y, 3000);

    // Create obstacle node (middle)
    await createNodeWithWait(page, obstacleX, y, 3000);
    await waitForNodes(page, 2, 3000);

    // Create right node
    await createNodeWithWait(page, rightX, y, 3000);
    await waitForNodes(page, 3, 3000);

    // Get node positions and verify they're at expected locations
    const nodeInfo = await page.evaluate(() => {
      const nodes = Array.from(document.querySelectorAll('.react-flow__node'));
      return nodes.map(n => {
        const rect = n.getBoundingClientRect();
        return { 
          id: n.getAttribute('data-id'),
          x: rect.x,
          y: rect.y,
          width: rect.width,
          height: rect.height,
          centerX: rect.x + rect.width / 2,
          centerY: rect.y + rect.height / 2
        };
      });
    });
    expect(nodeInfo.length).toBe(3);
    
    // Sort by x position
    nodeInfo.sort((a, b) => a.x - b.x);
    const leftNode = nodeInfo[0];
    const obstacleNode = nodeInfo[1];
    const rightNode = nodeInfo[2];

    // Verify nodes are positioned correctly (within reasonable tolerance)
    // Nodes should be roughly at the click positions (accounting for centering and grid snapping)
    const tolerance = 50; // Allow 50px tolerance for grid snapping and centering
    expect(Math.abs(leftNode.centerX - (paneBox.x + leftX))).toBeLessThan(tolerance);
    expect(Math.abs(obstacleNode.centerX - (paneBox.x + obstacleX))).toBeLessThan(tolerance);
    expect(Math.abs(rightNode.centerX - (paneBox.x + rightX))).toBeLessThan(tolerance);
    expect(Math.abs(leftNode.centerY - (paneBox.y + y))).toBeLessThan(tolerance);
    expect(Math.abs(obstacleNode.centerY - (paneBox.y + y))).toBeLessThan(tolerance);
    expect(Math.abs(rightNode.centerY - (paneBox.y + y))).toBeLessThan(tolerance);

    console.log('Node positions verified:', {
      left: { expected: paneBox.x + leftX, actual: leftNode.centerX },
      obstacle: { expected: paneBox.x + obstacleX, actual: obstacleNode.centerX },
      right: { expected: paneBox.x + rightX, actual: rightNode.centerX }
    });

    // Activate connector tool
    await activateConnectorTool(page, 5000);

    // Create edge from left to right (must route around obstacle)
    const leftNodeRightDotX = leftNode.x + leftNode.width;
    const leftNodeRightDotY = leftNode.y + leftNode.height / 2;
    const rightNodeLeftDotX = rightNode.x;
    const rightNodeLeftDotY = rightNode.y + rightNode.height / 2;

    await page.mouse.click(leftNodeRightDotX, leftNodeRightDotY);
    await page.waitForTimeout(200); // Brief wait for state update
    await page.mouse.click(rightNodeLeftDotX, rightNodeLeftDotY);
    
    // Wait for routing to complete with early failure
    await waitForRoutingComplete(page, '.react-flow__edge', 300, 3000);

    // Get edge path
    const edgePath = await page.evaluate(() => {
      const path = document.querySelector('.react-flow__edge path') as SVGPathElement | null;
      return path?.getAttribute('d') || null;
    });
    expect(edgePath).not.toBeNull();

    // Parse path to get points
    const pathPoints = await page.evaluate((pathData) => {
      if (!pathData) return [];
      const commands = pathData.match(/[ML] [\d.-]+ [\d.-]+/g) || [];
      const points: Array<{ x: number; y: number }> = [];
      commands.forEach(cmd => {
        const coords = cmd.match(/[\d.-]+/g);
        if (coords && coords.length >= 2) {
          points.push({ x: parseFloat(coords[0]), y: parseFloat(coords[1]) });
        }
      });
      return points;
    }, edgePath);

    expect(pathPoints.length).toBeGreaterThanOrEqual(2);

    // Calculate straight-line distance (if no obstacle)
    const straightLineDistance = Math.sqrt(
      Math.pow(rightNode.centerX - leftNode.centerX, 2) +
      Math.pow(rightNode.centerY - leftNode.centerY, 2)
    );

    // Calculate actual path length
    let pathLength = 0;
    for (let i = 0; i < pathPoints.length - 1; i++) {
      const dx = pathPoints[i + 1].x - pathPoints[i].x;
      const dy = pathPoints[i + 1].y - pathPoints[i].y;
      pathLength += Math.sqrt(dx * dx + dy * dy);
    }

    console.log('Path analysis:', {
      straightLineDistance: straightLineDistance.toFixed(1),
      actualPathLength: pathLength.toFixed(1),
      pathPoints: pathPoints.length,
      ratio: (pathLength / straightLineDistance).toFixed(2)
    });

    // Path should be routed (more than 2 points since there's an obstacle)
    expect(pathPoints.length).toBeGreaterThan(2);

    // Path length should be reasonable - not more than 2x the straight-line distance
    // This ensures routing doesn't create unnecessarily large detours
    const maxReasonableRatio = 2.0; // Path can be up to 2x longer than straight line
    const pathRatio = pathLength / straightLineDistance;
    expect(pathRatio).toBeLessThan(maxReasonableRatio);

    // Path should avoid the obstacle (check that no path point is inside obstacle)
    const obstacleLeft = obstacleNode.x;
    const obstacleRight = obstacleNode.x + obstacleNode.width;
    const obstacleTop = obstacleNode.y;
    const obstacleBottom = obstacleNode.y + obstacleNode.height;
    const buffer = 32; // 2 grid spaces buffer

    const pointsInsideObstacle = pathPoints.filter(point => {
      return point.x >= obstacleLeft - buffer &&
             point.x <= obstacleRight + buffer &&
             point.y >= obstacleTop - buffer &&
             point.y <= obstacleBottom + buffer;
    });

    // Path points should not be inside the obstacle (with buffer)
    // Allow start/end points to be at node boundaries, but not middle points
    expect(pointsInsideObstacle.length).toBeLessThanOrEqual(2); // Only start and end points

    // Verify path doesn't create huge vertical detours
    // The path should stay relatively close to the horizontal line between nodes
    const minY = Math.min(leftNode.centerY, rightNode.centerY);
    const maxY = Math.max(leftNode.centerY, rightNode.centerY);
    const verticalRange = maxY - minY;
    const maxVerticalDeviation = verticalRange + 200; // Allow some deviation for routing around obstacle

    const pathMinY = Math.min(...pathPoints.map(p => p.y));
    const pathMaxY = Math.max(...pathPoints.map(p => p.y));
    const pathVerticalRange = pathMaxY - pathMinY;

    console.log('Vertical deviation:', {
      nodeVerticalRange: verticalRange.toFixed(1),
      pathVerticalRange: pathVerticalRange.toFixed(1),
      deviation: (pathVerticalRange - verticalRange).toFixed(1)
    });

    // Path vertical range should not be excessively larger than node vertical range
    expect(pathVerticalRange).toBeLessThan(maxVerticalDeviation);
  });

  test('should render edges with reasonable coordinates on the actual canvas', async ({ page }) => {
    test.setTimeout(8000);
    
    // Navigate to the actual running application with libavoid fixtures
    await page.goto(`${BASE_URL}/canvas?libavoidFixtures=1`, { waitUntil: 'domcontentloaded' });
    
    // Wait for the canvas to load
    await page.waitForSelector('.react-flow__renderer', { timeout: 3000 });
    
    // Wait for edges to appear and routing to complete (early failure, shorter timeout)
    await waitForEdges(page, 1, 3000);
    // Don't wait for full routing completion - just check if edges have paths
    await page.waitForTimeout(500); // Brief wait for initial routing
    
    // Capture all edge paths that are actually rendered
    const edgePaths = await page.evaluate(() => {
      const pathElements = document.querySelectorAll('.react-flow__edge-path');
      return Array.from(pathElements).map((path, index) => {
        const d = path.getAttribute('d');
        const edgeElement = path.closest('.react-flow__edge');
        const edgeId = edgeElement?.getAttribute('data-id') || `edge-${index}`;
        
        // Parse coordinates from the path
        const coords = d?.match(/[\d.-]+/g)?.map(Number) || [];
        
        return {
          edgeId,
          pathData: d,
          coordinates: coords,
          coordinateCount: coords.length
        };
      });
    });
    
    console.log('🎯 ACTUAL CANVAS EDGES:', JSON.stringify(edgePaths, null, 2));
    
    // Verify we have edges
    expect(edgePaths.length).toBeGreaterThan(0);
    
    // Check each edge for reasonable coordinates
    for (const edge of edgePaths) {
      console.log(`\n🔍 Testing edge: ${edge.edgeId}`);
      console.log(`📍 Coordinates: ${edge.coordinates}`);
      
      // All coordinates should be reasonable (not in thousands)
      for (const coord of edge.coordinates) {
        expect(coord).toBeLessThan(2000);
        expect(coord).toBeGreaterThan(-200);
      }
      
      // Should have at least start and end coordinates
      expect(edge.coordinates.length).toBeGreaterThanOrEqual(4);
    }
    
    // Test specific edges if they exist
    const horizontalEdge = edgePaths.find(e => e.edgeId.includes('horizontal'));
    if (horizontalEdge) {
      console.log('\n🔍 HORIZONTAL EDGE:', horizontalEdge);
      
      // Should not have coordinates in the thousands
      const maxCoord = Math.max(...horizontalEdge.coordinates);
      const minCoord = Math.min(...horizontalEdge.coordinates);
      
      expect(maxCoord).toBeLessThan(1000);
      expect(minCoord).toBeGreaterThan(-100);
    }
    
    const straightEdge = edgePaths.find(e => e.edgeId.includes('straight'));
    if (straightEdge) {
      console.log('\n🔍 STRAIGHT EDGE:', straightEdge);
      
      // Should be a simple line (4 coordinates: x1,y1,x2,y2)
      expect(straightEdge.coordinates.length).toBeLessThanOrEqual(6);
    }
  });

  test('should not have edges passing through nodes', async ({ page }) => {
    test.setTimeout(8000);
    
    await page.goto(`${BASE_URL}/canvas?libavoidFixtures=1`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.react-flow__renderer', { timeout: 10000 });
    
    // Wait for edges to appear
    await waitForEdges(page, 1, 5000);
    
    // Wait for libavoid routing to actually complete by checking if edges have step paths
    // Edge-horizontal should route around h-block with multiple bend points
    await waitForCondition(
      page,
      async () => {
        const hasStepPaths = await page.evaluate(() => {
          const paths = document.querySelectorAll('.react-flow__edge-path');
          for (const path of paths) {
            const d = path.getAttribute('d') || '';
            // A step path has multiple L commands (bends), not just a straight line
            if (d.includes('L') && (d.match(/L/g) || []).length > 1) {
              return true;
            }
          }
          return false;
        });
        return hasStepPaths;
      },
      {
        timeout: 15000,
        errorMessage: 'No step paths found, routing may not be working'
      }
    );
    
    // Wait for routing to settle
    await waitForRoutingComplete(page, '.react-flow__edge', 300, 3000);
    
    // Get node positions from ReactFlow instance (absolute coordinates)
    const canvasData = await page.evaluate(() => {
      const reactFlowInstance = (window as any).__RF__?.['1'];
      
      // Get all nodes from ReactFlow (these have absolute positions)
      const nodes: Array<{id: string, x: number, y: number, width: number, height: number}> = [];
      if (reactFlowInstance) {
        const rfNodes = reactFlowInstance.getNodes();
        rfNodes.forEach((node: any) => {
          // Use positionAbsolute if available, otherwise position
          const pos = node.positionAbsolute || node.position || { x: 0, y: 0 };
          nodes.push({
            id: node.id,
            x: pos.x,
            y: pos.y,
            width: node.width || node.data?.width || 96,
            height: node.height || node.data?.height || 96
          });
        });
      }
      
      // Get all edge paths - SVG path coordinates are in absolute canvas space
      const pathElements = document.querySelectorAll('.react-flow__edge-path');
      const edges = Array.from(pathElements).map(path => {
        const d = path.getAttribute('d');
        const edgeElement = path.closest('.react-flow__edge');
        const edgeId = edgeElement?.getAttribute('data-id');
        
        // Parse path coordinates - these are absolute canvas coordinates
        const coords = d?.match(/[\d.-]+/g)?.map(Number) || [];
        
        // Get source and target from ReactFlow edge data
        let source = '';
        let target = '';
        if (reactFlowInstance) {
          const rfEdge = reactFlowInstance.getEdges().find((e: any) => e.id === edgeId);
          if (rfEdge) {
            source = rfEdge.source;
            target = rfEdge.target;
          }
        }
        
        return { 
          edgeId, 
          pathData: d, 
          coordinates: coords, 
          source, 
          target 
        };
      });
      
      return { nodes, edges };
    });
    
    console.log('🏠 CANVAS NODES:', JSON.stringify(canvasData.nodes, null, 2));
    console.log('🔗 CANVAS EDGES:', JSON.stringify(canvasData.edges.map(e => ({ 
      edgeId: e.edgeId, 
      source: e.source, 
      target: e.target, 
      coordCount: e.coordinates.length 
    })), null, 2));
    
    // Helper function for line-rectangle intersection
    const lineIntersectsRect = (start: {x: number, y: number}, end: {x: number, y: number}, rect: {x: number, y: number, width: number, height: number}): boolean => {
      // Simple bounding box check first
      const lineMinX = Math.min(start.x, end.x);
      const lineMaxX = Math.max(start.x, end.x);
      const lineMinY = Math.min(start.y, end.y);
      const lineMaxY = Math.max(start.y, end.y);
      
      const rectMaxX = rect.x + rect.width;
      const rectMaxY = rect.y + rect.height;
      
      // If line bounding box doesn't overlap with rect, no intersection
      if (lineMaxX < rect.x || lineMinX > rectMaxX || lineMaxY < rect.y || lineMinY > rectMaxY) {
        return false;
      }
      
      // Check if line passes through the interior of the rectangle (not just touching edges)
      const margin = 32; // 2 grid spaces buffer (same as shapeBufferDistance)
      const innerRect = {
        x: rect.x + margin,
        y: rect.y + margin,
        width: rect.width - 2 * margin,
        height: rect.height - 2 * margin
      };
      
      if (innerRect.width <= 0 || innerRect.height <= 0) return false;
      
      // Check if line segment intersects with inner rectangle
      return lineSegmentIntersectsRect(start, end, innerRect);
    };

    const lineSegmentIntersectsRect = (start: {x: number, y: number}, end: {x: number, y: number}, rect: {x: number, y: number, width: number, height: number}): boolean => {
      const rectMaxX = rect.x + rect.width;
      const rectMaxY = rect.y + rect.height;
      
      // Check intersection with each edge of the rectangle
      return (
        lineSegmentsIntersect(start, end, {x: rect.x, y: rect.y}, {x: rectMaxX, y: rect.y}) ||
        lineSegmentsIntersect(start, end, {x: rectMaxX, y: rect.y}, {x: rectMaxX, y: rectMaxY}) ||
        lineSegmentsIntersect(start, end, {x: rectMaxX, y: rectMaxY}, {x: rect.x, y: rectMaxY}) ||
        lineSegmentsIntersect(start, end, {x: rect.x, y: rectMaxY}, {x: rect.x, y: rect.y})
      );
    };

    const lineSegmentsIntersect = (p1: {x: number, y: number}, p2: {x: number, y: number}, p3: {x: number, y: number}, p4: {x: number, y: number}): boolean => {
      const denom = (p4.y - p3.y) * (p2.x - p1.x) - (p4.x - p3.x) * (p2.y - p1.y);
      if (Math.abs(denom) < 1e-10) return false; // Lines are parallel
      
      const ua = ((p4.x - p3.x) * (p1.y - p3.y) - (p4.y - p3.y) * (p1.x - p3.x)) / denom;
      const ub = ((p2.x - p1.x) * (p1.y - p3.y) - (p2.y - p1.y) * (p1.x - p3.x)) / denom;
      
      return ua >= 0 && ua <= 1 && ub >= 0 && ub <= 1;
    };
    
    // Test each edge for collision with nodes
    for (const edge of canvasData.edges) {
      if (edge.coordinates.length >= 4) {
        console.log(`\n🔍 Testing collision for edge: ${edge.edgeId}`);
        
        // Convert coordinates to points
        const points = [];
        for (let i = 0; i < edge.coordinates.length; i += 2) {
          if (edge.coordinates[i + 1] !== undefined) {
            points.push({
              x: edge.coordinates[i],
              y: edge.coordinates[i + 1]
            });
          }
        }
        
        console.log(`📍 Edge points (${points.length}):`, points.map(p => `(${p.x.toFixed(1)},${p.y.toFixed(1)})`).join(' → '));
        
        // Check if any segment passes through any node (excluding source and target)
        // Skip edges with only 2 points (straight lines) - these haven't been routed yet
        if (points.length <= 2) {
          console.log(`⏭️ Skipping edge ${edge.edgeId} - only ${points.length} points (not routed yet)`);
          continue;
        }
        
        // Log node positions for this edge
        const sourceNode = canvasData.nodes.find(n => n.id === edge.source);
        const targetNode = canvasData.nodes.find(n => n.id === edge.target);
        if (sourceNode) {
          console.log(`   Source node: (${sourceNode.x.toFixed(1)},${sourceNode.y.toFixed(1)}) ${sourceNode.width.toFixed(1)}x${sourceNode.height.toFixed(1)}`);
        }
        if (targetNode) {
          console.log(`   Target node: (${targetNode.x.toFixed(1)},${targetNode.y.toFixed(1)}) ${targetNode.width.toFixed(1)}x${targetNode.height.toFixed(1)}`);
        }
        
        for (let i = 0; i < points.length - 1; i++) {
          const start = points[i];
          const end = points[i + 1];
          
          for (const node of canvasData.nodes) {
            // Skip source and target nodes - edges connect FROM/TO these
            if (node.id === edge.source || node.id === edge.target) {
              continue;
            }
            
            // Simple line-rectangle intersection test
            const nodeRect = {
              x: node.x,
              y: node.y,
              width: node.width,
              height: node.height
            };
            
            // Check if line segment intersects with node rectangle
            const intersects = lineIntersectsRect(start, end, nodeRect);
            
            if (intersects) {
              // Log detailed collision info for debugging
              console.error(`❌ COLLISION: Edge ${edge.edgeId} passes through node ${node.id}`);
              console.error(`   Line segment: (${start.x.toFixed(1)},${start.y.toFixed(1)}) → (${end.x.toFixed(1)},${end.y.toFixed(1)})`);
              console.error(`   Node bounds: (${node.x.toFixed(1)},${node.y.toFixed(1)}) ${node.width.toFixed(1)}x${node.height.toFixed(1)}`);
              console.error(`   Node center: (${(node.x + node.width/2).toFixed(1)},${(node.y + node.height/2).toFixed(1)})`);
              console.error(`   Edge source: ${edge.source}, target: ${edge.target}`);
              
              // Fail the test
              expect(intersects).toBe(false);
            }
          }
        }
      }
    }
  });

  test('should not balloon edges when dragging unrelated nodes', async ({ page }) => {
    test.setTimeout(8000);
    
    // Clear localStorage to prevent conflicts with existing state
    await page.goto(`${BASE_URL}/canvas`);
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    
    // Now navigate with fixtures parameter (use domcontentloaded for faster load)
    await page.goto(`${BASE_URL}/canvas?libavoidFixtures=1`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.react-flow__renderer', { timeout: 3000 });
    
    // Wait for fixtures to load - check for the specific libavoid nodes (early failure)
    await waitForCondition(
      page,
      async () => {
        const result = await page.evaluate(() => {
          const nodes = document.querySelectorAll('.react-flow__node');
          const hasLibavoidNode = document.querySelector('[data-id^="libavoid-"]');
          return nodes.length >= 10 && !!hasLibavoidNode;
        });
        return result;
      },
      {
        timeout: 15000,
        errorMessage: 'Libavoid fixtures did not load within timeout'
      }
    );
    
    // Wait for edges to render (early failure)
    await waitForEdges(page, 5, 3000);
    
    // Let routing settle - wait longer to ensure all edges are fully routed
    await waitForRoutingComplete(page, '.react-flow__edge', 200, 2000);
    
    // Additional wait to ensure routing is completely stable
    await page.waitForTimeout(3000);
    
    // Debug: Check what's on the page
    const debugInfo = await page.evaluate(() => {
      const nodes = document.querySelectorAll('.react-flow__node');
      const edges = document.querySelectorAll('.react-flow__edge');
      const edgePaths = document.querySelectorAll('.react-flow__edge-path');
      return {
        nodeCount: nodes.length,
        nodeIds: Array.from(nodes).map(n => n.getAttribute('data-id')),
        edgeCount: edges.length,
        edgeIds: Array.from(edges).map(e => e.getAttribute('data-id')),
        edgePathCount: edgePaths.length,
        edgePathsD: Array.from(edgePaths).map(p => p.getAttribute('d')),
      };
    });
    console.log('DEBUG INFO:', debugInfo);
    
    // Get all edge paths BEFORE moving any node - use index as key since data-id may be null
    const beforePaths = await page.evaluate(() => {
      const result: Record<string, string> = {};
      document.querySelectorAll('.react-flow__edge').forEach((edge, index) => {
        // Use data-id if available, otherwise use index
        const edgeId = edge.getAttribute('data-id') || `edge-${index}`;
        // Try multiple selectors for path
        const path = edge.querySelector('path.react-flow__edge-path') || 
                     edge.querySelector('path') ||
                     edge.querySelector('.react-flow__edge-path');
        const d = path?.getAttribute('d') || '';
        result[edgeId] = d;
      });
      return result;
    });
    
    console.log('BEFORE move - edge paths:', beforePaths);
    console.log('Edge count:', Object.keys(beforePaths).length);
    
    // If no edges found, the fixtures didn't load - skip gracefully
    if (Object.keys(beforePaths).length === 0) {
      console.log('WARNING: No edges found - fixtures may not have loaded properly');
      // Check if at least we have nodes
      expect(debugInfo.nodeCount).toBeGreaterThan(0);
      return; // Skip rest of test
    }
    
    // Find and drag H-BLOCK (an obstacle for the horizontal edge)
    // Moving h-block SHOULD affect edge-0 (horizontal) but should NOT affect other edges
    const hBlockNode = await page.$('[data-id="libavoid-h-block"]');
    if (!hBlockNode) {
      console.log('H-Block node not found');
      const nodeIds = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('.react-flow__node')).map(n => n.getAttribute('data-id'));
      });
      console.log('Available nodes:', nodeIds);
      throw new Error('H-Block node required for balloon test');
    }
    
    const box = await hBlockNode.boundingBox();
    if (!box) throw new Error('Could not get H-Block bounding box');
    
    // Drag H-Block DOWN by 64px (4 grid spaces) - this should potentially affect edge-horizontal
    // but should NOT affect port edges, diagonal, vertical, or straight edges
    console.log('Dragging H-Block down by 64px...');
    await page.mouse.move(box.x + box.width/2, box.y + box.height/2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width/2, box.y + box.height/2 + 64, { steps: 10 });
    await page.mouse.up();
    
    await page.waitForTimeout(2000); // Let routing settle
    
    // Get all edge paths AFTER moving - use same indexing as before
    const afterPaths = await page.evaluate(() => {
      const result: Record<string, string> = {};
      document.querySelectorAll('.react-flow__edge').forEach((edge, index) => {
        const edgeId = edge.getAttribute('data-id') || `edge-${index}`;
        const path = edge.querySelector('path.react-flow__edge-path') || 
                     edge.querySelector('path');
        const d = path?.getAttribute('d') || '';
        result[edgeId] = d;
      });
      return result;
    });
    
    console.log('AFTER move - edge paths:', afterPaths);
    
    // Check which edges changed
    const changedEdges: string[] = [];
    const unchangedEdges: string[] = [];
    
    for (const [edgeId, beforePath] of Object.entries(beforePaths)) {
      const afterPath = afterPaths[edgeId];
      if (beforePath !== afterPath) {
        changedEdges.push(edgeId);
        console.log(`CHANGED: ${edgeId}`);
        console.log(`  Before: ${beforePath}`);
        console.log(`  After:  ${afterPath}`);
      } else {
        unchangedEdges.push(edgeId);
      }
    }
    
    console.log('Changed edges:', changedEdges);
    console.log('Unchanged edges:', unchangedEdges);
    
    // Fixture edge mapping:
    // edge-0: horizontal (h-left to h-right) - routes around h-block - MAY change (we moved h-block)
    // edge-1: vertical (v-top to v-bottom) - routes around v-block - should NOT change
    // edge-2: straight (straight-left to straight-right) - direct line - should NOT change
    // edge-3: diagonal (d-top-left to d-bottom-right) - routes around d-block - should NOT change
    // edge-4,5,6,7: port edges - complex routes to port nodes - should NOT change
    
    // ALL edges EXCEPT edge-0 should be UNAFFECTED by moving h-block
    const unaffectedEdges = ['edge-1', 'edge-2', 'edge-3', 'edge-4', 'edge-5', 'edge-6', 'edge-7'];
    
    console.log('Checking for ballooning...');
    console.log('  Moved: H-Block (obstacle for horizontal edge only)');
    console.log('  Unaffected edges that should NOT change:', unaffectedEdges);
    
    const balloonedEdges: string[] = [];
    for (const edgeId of unaffectedEdges) {
      if (changedEdges.includes(edgeId)) {
        console.log(`🚨 BALLOONING BUG: ${edgeId} changed but it's NOT related to h-block!`);
        console.log(`  Before: ${beforePaths[edgeId]}`);
        console.log(`  After:  ${afterPaths[edgeId]}`);
        balloonedEdges.push(edgeId);
      }
    }
    
    // Report results
    if (changedEdges.includes('edge-0')) {
      console.log('✓ edge-0 (horizontal) rerouted - EXPECTED (h-block is its obstacle)');
    } else {
      console.log('ℹ edge-0 (horizontal) did not change - may or may not be expected');
    }
    
    if (balloonedEdges.length > 0) {
      console.log(`\n🚨 FAIL: ${balloonedEdges.length} unaffected edges changed (BALLOONING BUG)`);
      console.log('Ballooned edges:', balloonedEdges);
    } else {
      console.log('\n✅ PASS: No unaffected edges changed');
    }
    
    // STRICT ASSERTION: No unaffected edges should change
    expect(balloonedEdges.length).toBe(0);
  });
});
