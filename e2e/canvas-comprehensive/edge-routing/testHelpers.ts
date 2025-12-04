/**
 * Test Helpers for Edge Routing Tests
 * 
 * Provides utilities for early failure detection and proper wait conditions
 * instead of using waitForTimeout which masks failures.
 */

import { Page, expect } from '@playwright/test';

/**
 * Wait for a condition with early failure
 * Fails fast if condition doesn't meet within timeout
 */
export async function waitForCondition(
  page: Page,
  condition: () => Promise<boolean> | boolean,
  options: { timeout?: number; interval?: number; errorMessage?: string } = {}
): Promise<void> {
  const { timeout = 5000, interval = 50, errorMessage = 'Condition not met within timeout' } = options;
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    try {
      const result = await condition();
      if (result) {
        return;
      }
    } catch (error) {
      // If condition throws, wait a bit and retry
    }
    await page.waitForTimeout(interval);
  }
  
  throw new Error(errorMessage);
}

/**
 * Wait for nodes to appear with early failure
 */
export async function waitForNodes(
  page: Page,
  count: number,
  timeout: number = 3000
): Promise<void> {
  await waitForCondition(
    page,
    async () => {
      const actualCount = await page.evaluate(() => {
        return document.querySelectorAll('.react-flow__node').length;
      });
      return actualCount >= count;
    },
    {
      timeout,
      errorMessage: `Expected at least ${count} nodes, but condition not met within ${timeout}ms`
    }
  );
}

/**
 * Wait for edges to appear with early failure
 */
export async function waitForEdges(
  page: Page,
  count: number,
  timeout: number = 3000
): Promise<void> {
  await waitForCondition(
    page,
    async () => {
      const actualCount = await page.evaluate(() => {
        return document.querySelectorAll('.react-flow__edge').length;
      });
      return actualCount >= count;
    },
    {
      timeout,
      errorMessage: `Expected at least ${count} edges, but condition not met within ${timeout}ms`
    }
  );
}

/**
 * Wait for connector dots to appear with early failure
 */
export async function waitForConnectorDots(
  page: Page,
  minCount: number = 2,
  timeout: number = 3000
): Promise<void> {
  await waitForCondition(
    page,
    async () => {
      const count = await page.evaluate((expectedMinCount) => {
        // Check for data-connector-dot attribute
        const dots = document.querySelectorAll('[data-connector-dot]');
        if (dots.length >= expectedMinCount) return dots.length;
        
        // Fallback: check for green dots by style
        const allDivs = Array.from(document.querySelectorAll('div'));
        const greenDots = allDivs.filter(el => {
          const style = window.getComputedStyle(el);
          const bg = style.backgroundColor;
          return bg.includes('rgb(0, 255, 0)') || bg.includes('rgba(0, 255, 0');
        });
        return greenDots.length;
      }, minCount);
      return count >= minCount;
    },
    {
      timeout,
      errorMessage: `Expected at least ${minCount} connector dots, but condition not met within ${timeout}ms`
    }
  );
}

/**
 * Wait for edge path to be valid with early failure
 */
export async function waitForEdgePath(
  page: Page,
  edgeSelector: string = '.react-flow__edge',
  timeout: number = 3000
): Promise<string> {
  let path: string | null = null;
  
  await waitForCondition(
    page,
    async () => {
      path = await page.evaluate((selector) => {
        const edge = document.querySelector(selector);
        if (!edge) return null;
        const pathEl = edge.querySelector('path, .react-flow__edge-path');
        return pathEl?.getAttribute('d') || null;
      }, edgeSelector);
      return path !== null && path.length > 10; // Valid path has data
    },
    {
      timeout,
      errorMessage: `Expected edge path to be valid, but condition not met within ${timeout}ms`
    }
  );
  
  if (!path) {
    throw new Error('Edge path is null after wait');
  }
  
  return path;
}

/**
 * Wait for routing to complete by checking if edge path exists and optionally stabilizes
 * Returns early if a valid path exists (doesn't wait for full stability unless needed)
 */
export async function waitForRoutingComplete(
  page: Page,
  edgeSelector: string = '.react-flow__edge',
  stabilityTime: number = 200, // Reduced - time path must remain unchanged
  maxWait: number = 3000 // Reduced default timeout
): Promise<string> {
  const startTime = Date.now();
  let lastPath: string | null = null;
  let stableSince = Date.now();
  let firstValidPath: string | null = null;
  let noEdgeCount = 0;
  const maxNoEdgeChecks = 5; // Fail fast if no edge after 5 checks
  
  while (Date.now() - startTime < maxWait) {
    const currentPath = await page.evaluate((selector) => {
      const edge = document.querySelector(selector);
      if (!edge) return null;
      const pathEl = edge.querySelector('path, .react-flow__edge-path');
      return pathEl?.getAttribute('d') || null;
    }, edgeSelector);
    
    if (!currentPath || currentPath.length <= 10) {
      noEdgeCount++;
      if (noEdgeCount >= maxNoEdgeChecks && !firstValidPath) {
        // No edge found after multiple checks - fail fast
        throw new Error(`No edge found with selector "${edgeSelector}" after ${maxNoEdgeChecks} checks`);
      }
      await page.waitForTimeout(100);
      continue;
    }
    
    // Reset no-edge counter when we find a path
    noEdgeCount = 0;
    
    // Store first valid path we see
    if (!firstValidPath) {
      firstValidPath = currentPath;
      // If we have a valid path and stability time is very short, return immediately
      if (stabilityTime <= 200) {
        await page.waitForTimeout(100); // Brief wait to ensure it's not transient
        return currentPath;
      }
    }
    
    if (currentPath === lastPath) {
      // Path is stable - return early if we've waited long enough
      if (Date.now() - stableSince >= stabilityTime) {
        return currentPath;
      }
    } else {
      // Path changed, reset stability timer
      lastPath = currentPath;
      stableSince = Date.now();
    }
    
    await page.waitForTimeout(50); // Reduced interval for faster checks
  }
  
  // Return first valid path we found, or last path, or fail
  const result = firstValidPath || lastPath;
  if (!result) {
    throw new Error(`Routing did not complete within ${maxWait}ms - no valid path found`);
  }
  
  return result;
}

/**
 * Assert that a node exists and return its info
 */
export async function assertNodeExists(
  page: Page,
  nodeId?: string,
  index?: number
): Promise<{ id: string; x: number; y: number; width: number; height: number }> {
  const nodeInfo = await page.evaluate(([id, idx]) => {
    const nodes = Array.from(document.querySelectorAll('.react-flow__node'));
    let targetNode: Element | null = null;
    
    if (id) {
      targetNode = nodes.find(n => n.getAttribute('data-id') === id) || null;
    } else if (idx !== undefined) {
      targetNode = nodes[idx] || null;
    } else {
      targetNode = nodes[0] || null;
    }
    
    if (!targetNode) return null;
    
    const rect = targetNode.getBoundingClientRect();
    return {
      id: targetNode.getAttribute('data-id') || '',
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height
    };
  }, [nodeId || '', index ?? -1]);
  
  if (!nodeInfo) {
    throw new Error(`Node not found: ${nodeId || `index ${index}`}`);
  }
  
  return nodeInfo;
}

/**
 * Assert that an edge exists and return its path
 */
export async function assertEdgeExists(
  page: Page,
  edgeId?: string,
  index?: number
): Promise<{ id: string; path: string }> {
  const edgeInfo = await page.evaluate(([id, idx]) => {
    const edges = Array.from(document.querySelectorAll('.react-flow__edge'));
    let targetEdge: Element | null = null;
    
    if (id) {
      targetEdge = edges.find(e => e.getAttribute('data-id') === id) || null;
    } else if (idx !== undefined) {
      targetEdge = edges[idx] || null;
    } else {
      targetEdge = edges[0] || null;
    }
    
    if (!targetEdge) return null;
    
    const pathEl = targetEdge.querySelector('path, .react-flow__edge-path');
    return {
      id: targetEdge.getAttribute('data-id') || '',
      path: pathEl?.getAttribute('d') || ''
    };
  }, [edgeId || '', index ?? -1]);
  
  if (!edgeInfo) {
    throw new Error(`Edge not found: ${edgeId || `index ${index}`}`);
  }
  
  if (!edgeInfo.path || edgeInfo.path.length < 10) {
    throw new Error(`Edge ${edgeInfo.id} has invalid path: ${edgeInfo.path}`);
  }
  
  return edgeInfo;
}

/**
 * Click connector tool and wait for it to be active
 */
export async function activateConnectorTool(page: Page, timeout: number = 3000): Promise<void> {
  const button = page.locator('button[aria-label="Add connector (C)"]');
  await button.waitFor({ state: 'visible', timeout });
  await button.click();
  
  // Wait for tool to be active (connector dots appear or button is pressed)
  await waitForCondition(
    page,
    async () => {
      const isActive = await page.evaluate(() => {
        const btn = document.querySelector('button[aria-label="Add connector (C)"]');
        const isPressed = btn?.getAttribute('aria-pressed') === 'true';
        const hasDots = document.querySelectorAll('[data-connector-dot]').length > 0;
        return isPressed || hasDots;
      });
      return isActive;
    },
    {
      timeout,
      errorMessage: 'Connector tool did not activate within timeout'
    }
  );
}

/**
 * Create a node and wait for it to appear with early failure
 */
export async function createNodeWithWait(
  page: Page,
  x: number,
  y: number,
  timeout: number = 3000
): Promise<string> {
  const initialCount = await page.evaluate(() => {
    return document.querySelectorAll('.react-flow__node').length;
  });
  
  // Click add box button
  await page.click('button[aria-label="Add box (R)"]');
  await page.waitForTimeout(100);
  
  // Click canvas
  const pane = page.locator('.react-flow__pane');
  const paneBox = await pane.boundingBox();
  if (!paneBox) throw new Error('ReactFlow pane not found');
  
  await page.mouse.click(paneBox.x + x, paneBox.y + y);
  
  // Wait for node to appear
  await waitForNodes(page, initialCount + 1, timeout);
  
  // Get the new node ID
  const nodeId = await page.evaluate((prevCount) => {
    const nodes = Array.from(document.querySelectorAll('.react-flow__node'));
    if (nodes.length > prevCount) {
      return nodes[nodes.length - 1].getAttribute('data-id') || '';
    }
    return '';
  }, initialCount);
  
  if (!nodeId) {
    throw new Error('Node was created but ID could not be retrieved');
  }
  
  return nodeId;
}

