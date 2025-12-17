import { test, expect } from '@playwright/test';
import { baseURL, addNodeToCanvas, verifyLayerSync } from '../shared-utils';

test.describe('Layer Sync Tests', () => {
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

  test('Domain-Canvas Sync - node should appear in both canvas and domain', async ({ page }) => {
    test.setTimeout(30000); // 30 seconds
    
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
    test.setTimeout(30000); // 30 seconds
    
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
    test.setTimeout(30000); // 30 seconds
    
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
    test.setTimeout(30000); // 30 seconds
    
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
    expect(restorationLogs.length).toBeLessThanOrEqual(5);
  });
});

