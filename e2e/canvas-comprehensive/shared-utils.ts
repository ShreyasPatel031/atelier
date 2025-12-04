import { Page, expect } from '@playwright/test';

export const baseURL = process.env.E2E_BASE_URL || 'http://localhost:3000';

/**
 * Early failure check - verify page is ready with helpers available
 */
async function ensurePageReady(page: Page): Promise<void> {
  // Check if window helpers are available - fail fast if not
  const helpersAvailable = await page.evaluate(() => {
    return typeof (window as any).getDomainGraph === 'function' && 
           typeof (window as any).getViewState === 'function';
  });
  
  if (!helpersAvailable) {
    throw new Error('❌ EARLY FAILURE: Window helpers (getDomainGraph/getViewState) not available. Page may not be fully loaded.');
  }
  
  // Check if ReactFlow is ready
  const reactFlowReady = await page.evaluate(() => {
    return document.querySelector('.react-flow') !== null;
  });
  
  if (!reactFlowReady) {
    throw new Error('❌ EARLY FAILURE: ReactFlow canvas not found. Page may not be fully loaded.');
  }
}

/**
 * Early failure check - verify box tool button exists
 */
async function ensureBoxToolAvailable(page: Page): Promise<void> {
  const boxToolExists = await page.evaluate(() => {
    return document.querySelector('[title*="box" i]') !== null;
  });
  
  if (!boxToolExists) {
    throw new Error('❌ EARLY FAILURE: Box tool button not found. Toolbar may not be loaded.');
  }
}

export async function addNodeToCanvas(page: Page, x: number, y: number): Promise<void> {
  console.log(`🧪 Adding node at (${x}, ${y})`);
  
  // EARLY FAILURE: Check page is ready
  await ensurePageReady(page);
  
  // Get initial counts
  const initialSync = await verifyLayerSync(page);
  console.log(`📊 Initial sync: canvas=${initialSync.canvasNodes}, domain=${initialSync.domainNodes}, viewState=${initialSync.viewStateNodes}`);
  
  // EARLY FAILURE: Check box tool is available
  await ensureBoxToolAvailable(page);
  
  // CRITICAL: Always re-select box tool for each node (tool gets reset to 'arrow' after each use)
  console.log('🔧 Selecting box tool...');
  
  // Wait for window helper to be available
  await page.waitForFunction(() => {
    return typeof (window as any).handleToolSelect === 'function';
  }, { timeout: 10000 });
  
  // Use window helper to select box tool (more reliable than clicking)
  await page.evaluate(() => {
    (window as any).handleToolSelect('box');
  });
  
  // Wait for React state to update
  await page.waitForTimeout(300);
  
  // Verify tool is selected
  const currentTool = await page.evaluate(() => {
    return (window as any).__selectedTool || 'unknown';
  });
  console.log(`🔧 Current tool after selection: ${currentTool}`);
  
  if (currentTool !== 'box') {
    throw new Error(`❌ EARLY FAILURE: Box tool not selected. Current tool: ${currentTool}`);
  }
  
  // Click on the ReactFlow pane (not the container) - this triggers onPaneClick
  const paneLocator = page.locator('.react-flow__pane');
  await paneLocator.waitFor({ state: 'visible', timeout: 5000 });
  
  // Get console messages before click
  const consoleLogs: string[] = [];
  page.on('console', msg => {
    const text = msg.text();
    consoleLogs.push(`[${msg.type()}] ${text}`);
    // Log placeNodeOnCanvas messages immediately
    if (text.includes('placeNodeOnCanvas')) {
      console.log(`📋 [placeNodeOnCanvas] ${text}`);
    }
  });
  
  await paneLocator.click({ position: { x, y }, timeout: 5000 });
  console.log(`🖱️ Clicked canvas pane at (${x}, ${y})`);
  
  // Wait and print console logs
  await page.waitForTimeout(500);
  const relevantLogs = consoleLogs.filter(l => l.includes('place') || l.includes('node') || l.includes('onPaneClick') || l.includes('Canvas'));
  if (relevantLogs.length > 0) {
    console.log('📋 Browser console:', relevantLogs.slice(-15).join('\n'));
  }
  
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
  
  // Wait for domain to be updated - with EARLY FAILURE timeout
  try {
    await page.waitForFunction((expectedDomainCount) => {
      const domain = (window as any).getDomainGraph?.() || { children: [] };
      const currentCount = domain.children?.length || 0;
      console.log(`🔍 Domain check: current=${currentCount}, expected>=${expectedDomainCount}`);
      return currentCount >= expectedDomainCount;
    }, initialSync.domainNodes + 1, { timeout: 8000 }); // Reduced from 10000 to 8000 for faster failure
    console.log('✅ Domain updated successfully');
  } catch (e: any) {
    console.error('❌ Domain update timeout:', e.message);
    // Get final state for debugging
    const finalSync = await verifyLayerSync(page);
    console.log(`📊 Final sync after timeout: canvas=${finalSync.canvasNodes}, domain=${finalSync.domainNodes}`);
    throw new Error(`❌ EARLY FAILURE: Domain not updated. Expected >=${initialSync.domainNodes + 1}, got ${finalSync.domainNodes}. Canvas=${finalSync.canvasNodes}`);
  }
  
  // Wait for canvas to sync with domain (nodes to render)
  try {
    await page.waitForFunction((expectedCanvasCount) => {
      const canvasNodes = document.querySelectorAll('.react-flow__node').length;
      return canvasNodes >= expectedCanvasCount;
    }, initialSync.domainNodes + 1, { timeout: 5000 });
    console.log('✅ Canvas synced with domain');
  } catch (e) {
    console.log('⚠️ Canvas sync timeout, continuing...');
  }
  
  // Additional wait for stability
  await page.waitForTimeout(300);
}

export async function verifyLayerSync(page: Page): Promise<{ canvasNodes: number, domainNodes: number, viewStateNodes: number, inSync: boolean }> {
  const canvasNodes = await page.locator('.react-flow__node').count();
  
  // EARLY FAILURE: Check helpers are available
  const helpersAvailable = await page.evaluate(() => {
    return typeof (window as any).getDomainGraph === 'function' && 
           typeof (window as any).getViewState === 'function';
  });
  
  if (!helpersAvailable) {
    throw new Error('❌ EARLY FAILURE: Window helpers not available in verifyLayerSync');
  }
  
  const result = await page.evaluate(() => {
    const domain = (window as any).getDomainGraph?.() || { children: [] };
    const viewState = (window as any).getViewState?.() || { node: {}, group: {}, edge: {} };
    const domainCount = domain.children?.length || 0;
    const viewStateCount = Object.keys(viewState.node || {}).length;
    
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

export async function verifyPersistence(page: Page): Promise<void> {
  await page.reload();
  
  // EARLY FAILURE: Fast timeout for ReactFlow to appear
  await page.waitForSelector('.react-flow', { timeout: 10000 });
  
  // EARLY FAILURE: Check helpers are available after reload
  const helpersAvailable = await page.waitForFunction(() => {
    return typeof (window as any).getDomainGraph === 'function' && 
           typeof (window as any).getViewState === 'function';
  }, { timeout: 5000 }).catch(() => null);
  
  if (!helpersAvailable) {
    throw new Error('❌ EARLY FAILURE: Window helpers not available after page reload');
  }
  
  await page.waitForTimeout(1000); // Brief wait for restoration
}

export async function checkArchitectureCompliance(page: Page): Promise<string[]> {
  const violations: string[] = [];
  
  // Check if Domain has mode fields (violation)
  const domainHasMode = await page.evaluate(() => {
    const domain = (window as any).getDomainGraph?.() || { children: [] };
    const hasModeFields = (node: any): boolean => {
      if (node.mode === 'FREE' || node.mode === 'LOCK') return true;
      if (node.children) return node.children.some((child: any) => hasModeFields(child));
      return false;
    };
    return hasModeFields(domain);
  });
  
  if (domainHasMode) {
    violations.push('Domain contains mode fields (should be in ViewState.layout)');
  }
  
  return violations;
}

export async function setupCleanCanvas(page: Page): Promise<void> {
  await page.goto(baseURL);
  
  // EARLY FAILURE: Fast timeout checks
  await page.waitForSelector('.react-flow', { timeout: 10000 });
  await page.waitForSelector('.react-flow__pane', { timeout: 10000 });
  
  // Clear any existing state
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
    if ((window as any).resetCanvas) {
      (window as any).resetCanvas();
    }
  });
  
  // Wait for any re-renders after clearing storage
  await page.waitForTimeout(500);
  
  // Reload to ensure clean state after reset
  await page.reload();
  await page.waitForSelector('.react-flow', { timeout: 10000 });
  await page.waitForTimeout(500);
  
  // EARLY FAILURE: Verify helpers available after clear
  await ensurePageReady(page);
  
  // Wait for toolbar to be stable before proceeding
  await page.waitForSelector('[title*="box" i]', { timeout: 10000 });
  await page.waitForTimeout(300); // Brief wait for any animations
  
  // EARLY FAILURE: Verify canvas is actually empty
  const sync = await verifyLayerSync(page);
  if (sync.canvasNodes !== 0 || sync.domainNodes !== 0) {
    throw new Error(`❌ EARLY FAILURE: Canvas not clean after setup. Canvas nodes: ${sync.canvasNodes}, Domain nodes: ${sync.domainNodes}`);
  }
}

export function findParent(graph: any, nodeId: string, parentId = 'root'): string | null {
  if (!graph.children) return null;
  for (const child of graph.children) {
    if (child.id === nodeId) return parentId;
    const found = findParent(child, nodeId, child.id);
    if (found) return found;
  }
  return null;
}
