import { test, expect } from '@playwright/test';

test.describe('Icon Display Validation', () => {
  test('should display all icons properly without missing icon indicators', async ({ page }) => {
    // Navigate to the application
    await page.goto('http://localhost:3000');
    
    // Wait for the application to load
    await page.waitForLoadState('networkidle');
    
    // Create a test architecture that will generate various nodes
    const chatInput = page.locator('[data-testid="chat-input"]');
    const sendButton = page.locator('[data-testid="send-button"]');
    
    // Expand the right panel if it's collapsed
    const agentIcon = page.locator('[data-testid="agent-icon"]');
    await agentIcon.click();
    
    // Wait for panel to expand
    await page.waitForTimeout(500);
    
    // Send a message to create an architecture
    await chatInput.fill('Create a microservices architecture with API gateway, database, load balancer, and authentication service');
    await sendButton.click();
    
    // Wait for the architecture to be generated
    await page.waitForSelector('[data-testid="react-flow-node"]', { timeout: 30000 });
    
    // Wait a bit more for all icons to load
    await page.waitForTimeout(3000);
    
    // Get all nodes in the canvas
    const nodes = await page.locator('[data-testid="react-flow-node"]').all();
    
    console.log(`Found ${nodes.length} nodes to validate`);
    
    let failedNodes: string[] = [];
    
    // Check each node for missing icon indicators
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      
      // Get node ID for debugging
      const nodeId = await node.getAttribute('data-id') || `node-${i}`;
      
      // Check for missing icon indicators
      const missingIconIndicators = await node.locator('text="❌ MISSING ICON"').count();
      const missingIconX = await node.locator('text="❌"').count();
      
      if (missingIconIndicators > 0 || missingIconX > 0) {
        failedNodes.push(nodeId);
        console.log(`❌ Node ${nodeId} has missing icon indicator`);
      } else {
        console.log(`✅ Node ${nodeId} has proper icon`);
      }
      
      // Also check if there's an actual icon image loaded
      const iconImages = await node.locator('img').all();
      let hasValidIcon = false;
      
      for (const img of iconImages) {
        const src = await img.getAttribute('src');
        if (src && !src.includes('data:image')) {
          // Check if the image actually loaded (not broken)
          const isVisible = await img.isVisible();
          const naturalWidth = await img.evaluate((img: HTMLImageElement) => img.naturalWidth);
          
          if (isVisible && naturalWidth > 0) {
            hasValidIcon = true;
            break;
          }
        }
      }
      
      if (!hasValidIcon && nodeId !== 'root') {
        // For non-root nodes, we expect either a valid icon or semantic fallback
        console.log(`⚠️  Node ${nodeId} has no valid icon image`);
      }
    }
    
    // Check console for any icon loading errors
    const consoleLogs: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'log' && msg.text().includes('❌')) {
        consoleLogs.push(msg.text());
      }
    });
    
    // Fail the test if any nodes have missing icon indicators
    if (failedNodes.length > 0) {
      console.log('\n❌ FAILED NODES:');
      failedNodes.forEach(nodeId => console.log(`  - ${nodeId}`));
      
      console.log('\n🔍 CONSOLE ERRORS:');
      consoleLogs.forEach(log => console.log(`  ${log}`));
      
      throw new Error(`${failedNodes.length} nodes have missing icon indicators: ${failedNodes.join(', ')}`);
    }
    
    console.log(`✅ All ${nodes.length} nodes have proper icons displayed`);
  });
  
  test('should handle root node icon properly', async ({ page }) => {
    // Navigate to the application
    await page.goto('http://localhost:3000');
    
    // Wait for the application to load
    await page.waitForLoadState('networkidle');
    
    // Create a simple architecture to ensure root node exists
    const chatInput = page.locator('[data-testid="chat-input"]');
    const sendButton = page.locator('[data-testid="send-button"]');
    
    // Expand the right panel if it's collapsed
    const agentIcon = page.locator('[data-testid="agent-icon"]');
    await agentIcon.click();
    
    // Wait for panel to expand
    await page.waitForTimeout(500);
    
    // Send a simple message
    await chatInput.fill('Create a simple web application architecture');
    await sendButton.click();
    
    // Wait for the architecture to be generated
    await page.waitForSelector('[data-testid="react-flow-node"]', { timeout: 30000 });
    
    // Wait for icons to load
    await page.waitForTimeout(3000);
    
    // Find the root node specifically
    const rootNode = page.locator('[data-testid="react-flow-node"][data-id="root"]');
    
    if (await rootNode.count() > 0) {
      // Check that root node doesn't have missing icon indicator
      const missingIconIndicators = await rootNode.locator('text="❌ MISSING ICON"').count();
      const missingIconX = await rootNode.locator('text="❌"').count();
      
      expect(missingIconIndicators).toBe(0);
      expect(missingIconX).toBe(0);
      
      console.log('✅ Root node has proper icon (no missing icon indicators)');
    } else {
      console.log('ℹ️  No root node found in this architecture');
    }
  });
  
  test('should validate semantic fallback service is working', async ({ page }) => {
    // Navigate to the application
    await page.goto('http://localhost:3000');
    
    // Wait for the application to load
    await page.waitForLoadState('networkidle');
    
    // Test the semantic fallback service directly in the browser
    const fallbackResult = await page.evaluate(async () => {
      // @ts-ignore - accessing global test function
      if (window.debugIconFallback) {
        // @ts-ignore
        return await window.debugIconFallback();
      }
      return null;
    });
    
    if (fallbackResult) {
      console.log('🔍 Semantic fallback test result:', fallbackResult);
    }
    
    // Also test by creating an architecture with intentionally difficult node names
    const chatInput = page.locator('[data-testid="chat-input"]');
    const sendButton = page.locator('[data-testid="send-button"]');
    
    // Expand the right panel if it's collapsed
    const agentIcon = page.locator('[data-testid="agent-icon"]');
    await agentIcon.click();
    
    // Wait for panel to expand
    await page.waitForTimeout(500);
    
    // Send a message with uncommon service names to test semantic fallback
    await chatInput.fill('Create an architecture with instance_group, compute_engine, cloud_sql, and message_queue services');
    await sendButton.click();
    
    // Wait for the architecture to be generated
    await page.waitForSelector('[data-testid="react-flow-node"]', { timeout: 30000 });
    
    // Wait for semantic fallback to complete
    await page.waitForTimeout(5000);
    
    // Check that semantic fallback worked for these uncommon names
    const nodes = await page.locator('[data-testid="react-flow-node"]').all();
    let semanticFallbackWorked = true;
    
    for (const node of nodes) {
      const nodeId = await node.getAttribute('data-id') || 'unknown';
      const missingIconIndicators = await node.locator('text="❌ MISSING ICON"').count();
      
      if (missingIconIndicators > 0 && nodeId !== 'root') {
        console.log(`❌ Semantic fallback failed for: ${nodeId}`);
        semanticFallbackWorked = false;
      }
    }
    
    expect(semanticFallbackWorked).toBe(true);
    console.log('✅ Semantic fallback service is working properly');
  });
});
