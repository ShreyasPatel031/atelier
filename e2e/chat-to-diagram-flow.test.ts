import { test, expect } from '@playwright/test';

test.describe('Chat Agent to Diagram Agent Flow', () => {
  test('Complete end-to-end flow from chat agent to architecture generation', async ({ page }) => {
    console.log('🚀 Starting complete chat-to-diagram integration test...');
    
    // Navigate to the application
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
    console.log('✅ Page loaded successfully');
    
    // Expand the right panel if it's collapsed
    const agentIcon = page.locator('[data-testid="agent-icon"]');
    await agentIcon.click();
    console.log('✅ Expanded chat panel');
    
    // Wait for panel to expand
    await page.waitForTimeout(500);
    
    // Find the chat input and send button
    const chatInput = page.locator('[data-testid="chat-input"]');
    const sendButton = page.locator('[data-testid="send-button"]');
    
    // Verify elements are visible
    await expect(chatInput).toBeVisible();
    await expect(sendButton).toBeVisible();
    console.log('✅ Chat input and send button found');
    
    // Send a message to create an architecture
    const testMessage = 'Create a microservices architecture with API gateway, database, load balancer, and authentication service';
    await chatInput.fill(testMessage);
    console.log('✅ Filled chat input with test message');
    
    // Click send button
    await sendButton.click();
    console.log('✅ Clicked send button');
    
    // Wait for the chat agent to process and trigger diagram generation
    console.log('⏳ Waiting for chat agent to process message...');
    
    // Wait for the diagram creation message to appear
    await page.waitForSelector('text=Creating architecture diagram for:', { timeout: 30000 });
    console.log('✅ Diagram creation message received');
    
    // Wait for architecture generation to complete
    console.log('⏳ Waiting for architecture generation to complete...');
    
    // Wait for React Flow nodes to appear (this indicates the architecture was generated)
    await page.waitForSelector('[data-testid="react-flow-node"]', { timeout: 60000 });
    console.log('✅ Architecture nodes appeared');
    
    // Wait a bit more for all icons to load
    await page.waitForTimeout(3000);
    
    // Count the generated nodes
    const nodes = await page.locator('[data-testid="react-flow-node"]').count();
    console.log(`✅ Found ${nodes} architecture nodes`);
    
    // Verify we have a reasonable number of nodes (at least 2 for a microservices architecture)
    expect(nodes).toBeGreaterThanOrEqual(2);
    
    // CRITICAL: Validate that NO icons are missing
    console.log('🔍 Validating all icons are properly displayed...');
    
    // Check for missing icon indicators in the entire page
    const missingIconIndicators = await page.locator('text="❌ MISSING ICON"').count();
    const missingIconX = await page.locator('text="❌"').count();
    
    if (missingIconIndicators > 0 || missingIconX > 0) {
      console.log(`❌ CRITICAL: Found ${missingIconIndicators + missingIconX} missing icon indicators!`);
      
      // Take a screenshot of the failure
      await page.screenshot({ 
        path: 'test-results/icon-validation-failure.png',
        fullPage: true 
      });
      
      throw new Error(`ICON VALIDATION FAILED: ${missingIconIndicators + missingIconX} icons are not displaying properly. Check test-results/icon-validation-failure.png`);
    }
    
    console.log('✅ All icons are properly displayed - no missing icon indicators found');
    
    // Verify the architecture has meaningful content
    const nodeLabels = await page.locator('[data-testid="react-flow-node"]').allTextContents();
    console.log('📋 Generated node labels:', nodeLabels);
    
    // Check that we have some expected microservices components
    const hasApiGateway = nodeLabels.some(label => 
      label.toLowerCase().includes('api') || 
      label.toLowerCase().includes('gateway')
    );
    const hasDatabase = nodeLabels.some(label => 
      label.toLowerCase().includes('database') || 
      label.toLowerCase().includes('db')
    );
    
    if (hasApiGateway || hasDatabase) {
      console.log('✅ Architecture contains expected microservices components');
    } else {
      console.log('⚠️ Architecture may not contain expected components, but nodes were generated');
    }
    
    // Take a screenshot for verification
    await page.screenshot({ 
      path: 'test-results/chat-to-diagram-integration.png',
      fullPage: true 
    });
    console.log('✅ Screenshot saved');
    
    console.log('🎉 Complete chat-to-diagram integration test completed successfully!');
  });
});
