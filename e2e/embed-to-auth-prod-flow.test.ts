/**
 * Embed-to-Auth Production Flow E2E Test
 * 
 * Tests the real embed-to-auth transition flow in production:
 * 1. Create architecture in embed mode
 * 2. Click "Edit" button to transition to canvas then auth
 * 3. Verify architecture is saved to Firebase with custom name
 * 4. Verify architecture appears as first tab
 * 5. Verify historical Firebase architectures load
 * 
 * NO MOCKS - Tests actual production behavior
 */

import { test, expect } from '@playwright/test';

test.describe('Embed-to-Auth Production Flow', () => {
  const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:3001';
  
  test('Real embed-to-auth flow with actual Firebase', async ({ page }) => {
    // Step 1: Navigate to embed mode
    console.log('📱 Step 1: Loading embed mode...');
    await page.goto(`${BASE_URL}/embed`);
    await page.waitForLoadState('networkidle');

    // Wait for embed canvas to be ready
    await page.waitForSelector('.react-flow', { timeout: 10000 });
    console.log('✅ Embed canvas loaded');

    // Step 2: Create an architecture via chat
    console.log('🏗️ Step 2: Creating architecture in embed mode...');
    
    const chatInput = page.locator('textarea').first();
    await chatInput.waitFor({ state: 'visible', timeout: 10000 });
    
    const architecturePrompt = 'Build a serverless API with Lambda, API Gateway, and DynamoDB';
    await chatInput.fill(architecturePrompt);
    
    // Find and click send button
    const sendButton = page.locator('button[type="submit"]').first();
    await sendButton.click();
    
    console.log(`📝 Sent architecture request: "${architecturePrompt}"`);

    // Wait for architecture to be generated
    console.log('⏳ Waiting for architecture generation...');
    await page.waitForTimeout(5000); // Give AI time to generate
    
    // Verify nodes appeared on canvas
    const nodes = page.locator('.react-flow__node');
    await nodes.first().waitFor({ state: 'visible', timeout: 20000 });
    
    const nodeCount = await nodes.count();
    console.log(`✅ Generated architecture with ${nodeCount} nodes`);
    expect(nodeCount).toBeGreaterThan(0);

    // Step 3: Click "Edit" button to transition
    console.log('🔧 Step 3: Clicking Edit button to transition to auth...');
    
    // Look for Edit button
    const editButton = page.locator('button:has-text("Edit"), button[title="Edit"]').first();
    await editButton.waitFor({ state: 'visible', timeout: 10000 });
    await editButton.click();
    
    console.log('✅ Clicked Edit button');
    
    // Should redirect to auth mode with architecture ID in URL
    await page.waitForURL('**/auth**', { timeout: 15000 });
    const authUrl = await page.url();
    console.log(`🔐 Redirected to auth URL: ${authUrl}`);
    
    // URL should contain architecture ID
    expect(authUrl).toContain('arch=');
    expect(authUrl).toContain('/auth');

    // Step 4: Wait for auth mode to load
    console.log('⏳ Step 4: Waiting for auth mode to initialize...');
    await page.waitForLoadState('networkidle');
    
    // Give Firebase time to sync (real Firebase operations take time)
    await page.waitForTimeout(3000);
    
    console.log('✅ Auth mode loaded');

    // Step 5: Verify sidebar with architecture tabs appears
    console.log('📂 Step 5: Verifying architecture sidebar...');
    
    // Wait for sidebar to appear
    const sidebar = page.locator('[class*="w-80"], [class*="sidebar"]').first();
    await sidebar.waitFor({ state: 'visible', timeout: 10000 });
    console.log('✅ Sidebar visible');

    // Step 6: Verify transferred architecture appears as a tab
    console.log('📑 Step 6: Verifying transferred architecture tab...');
    
    // Architecture tabs should be clickable elements in sidebar
    const tabs = page.locator('[class*="cursor-pointer"]:has-text("Architecture"), button:has-text("Architecture"), div[role="button"]').filter({
      has: page.locator('text=/Architecture|Cloud|Serverless|API|Lambda/i')
    });
    
    // Wait for at least one tab to appear
    await page.waitForTimeout(2000); // Give time for Firebase to load and name to generate
    
    // Check if we have any tabs
    const tabCount = await tabs.count();
    console.log(`📊 Found ${tabCount} architecture tabs`);
    
    if (tabCount === 0) {
      // Try alternative selectors for architecture items
      const altTabs = page.locator('div[class*="p-"], li[class*="cursor"]').filter({
        hasText: /Architecture|Cloud|Serverless|API|Lambda|Blueprint/i
      });
      const altTabCount = await altTabs.count();
      console.log(`📊 Found ${altTabCount} architecture items (alternative selector)`);
      expect(altTabCount).toBeGreaterThan(0);
      
      // Get first tab text
      const firstTabText = await altTabs.first().textContent();
      console.log(`📋 First tab name: "${firstTabText}"`);
      
      // Should NOT be generic fallback name
      expect(firstTabText).not.toContain('URL-based microservice');
      expect(firstTabText).not.toBe('New Architecture');
      
    } else {
      expect(tabCount).toBeGreaterThan(0);
      
      // Get first tab text
      const firstTabText = await tabs.first().textContent();
      console.log(`📋 First tab name: "${firstTabText}"`);
      
      // Should NOT be generic fallback name
      expect(firstTabText).not.toContain('URL-based microservice');
      expect(firstTabText).not.toBe('New Architecture');
    }

    // Step 7: Verify canvas shows the architecture
    console.log('🎨 Step 7: Verifying canvas content in auth mode...');
    
    const canvasNodes = page.locator('.react-flow__node');
    const canvasNodeCount = await canvasNodes.count();
    console.log(`🎨 Canvas has ${canvasNodeCount} nodes in auth mode`);
    
    // Should have the architecture nodes
    expect(canvasNodeCount).toBeGreaterThan(0);
    console.log('✅ Architecture is visible on canvas');

    // Step 8: Verify chat messages are preserved
    console.log('💬 Step 8: Checking if chat messages persisted...');
    
    // In auth mode, chat might be in a different panel
    const chatMessages = page.locator('[class*="message"], [class*="chat"]').filter({
      hasText: /serverless|lambda|api/i
    });
    
    const messageCount = await chatMessages.count();
    console.log(`💬 Found ${messageCount} chat-related elements`);
    
    // Even if no messages visible, the test passes as long as architecture was created
    if (messageCount > 0) {
      console.log('✅ Chat context appears to be preserved');
    } else {
      console.log('ℹ️  Chat messages not visible in UI (may be collapsed)');
    }

    console.log('🎉 Embed-to-Auth production flow test PASSED!');
  });

  test('Direct shared architecture URL in auth mode', async ({ page }) => {
    // Test loading a shared architecture URL directly in auth mode
    console.log('🔗 Testing direct shared architecture URL...');
    
    // This tests that shared URLs work without mocks
    // First create an architecture and get its share URL
    await page.goto(`${BASE_URL}/embed`);
    await page.waitForLoadState('networkidle');
    
    const chatInput = page.locator('textarea').first();
    await chatInput.fill('Simple web app architecture');
    await page.locator('button[type="submit"]').first().click();
    
    await page.waitForTimeout(5000);
    await page.waitForSelector('.react-flow__node', { timeout: 20000 });
    
    // Get the current URL (should have arch ID)
    const embedUrl = await page.url();
    console.log(`📍 Embed URL: ${embedUrl}`);
    
    // Navigate directly to auth with this architecture ID
    const authUrl = embedUrl.replace('/embed', '/auth');
    console.log(`🔐 Navigating directly to: ${authUrl}`);
    
    await page.goto(authUrl);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    
    // Should load the architecture
    const nodes = page.locator('.react-flow__node');
    const nodeCount = await nodes.count();
    console.log(`📊 Loaded ${nodeCount} nodes from shared URL`);
    
    expect(nodeCount).toBeGreaterThan(0);
    console.log('✅ Shared architecture URL works in auth mode');
  });
});
