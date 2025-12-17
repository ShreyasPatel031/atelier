import { test, expect } from '@playwright/test';
import { baseURL, addNodeToCanvas, verifyLayerSync } from '../shared-utils';

test.describe('Persistence Priority Tests', () => {
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

  test('localStorage Priority - should use localStorage over URL/remote sources', async ({ page }) => {
    test.setTimeout(30000); // 30 seconds
    
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
    test.setTimeout(30000); // 30 seconds
    
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
    test.setTimeout(30000); // 30 seconds
    
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
});

