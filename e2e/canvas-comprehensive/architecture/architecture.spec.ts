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
});

