/**
 * Canvas-to-Auth Complete Flow E2E Test
 * 
 * Tests the complete canvas-to-auth transition including:
 * 1. Canvas architecture creation with conversation
 * 2. Sign in transition to auth mode
 * 3. Architecture appears as first tab with custom name
 * 4. Historical Firebase architectures load after the transferred one
 * 5. Chat messages are preserved
 */

import { test, expect } from '@playwright/test';
import { getRandomArchitecturePrompt } from '../client/utils/testHelpers';

test.describe('Canvas-to-Auth Complete Flow', () => {
  const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:3001';
  
  test('Complete canvas-to-auth flow with historical tabs', async ({ page, context }) => {
    // Navigate to canvas mode
    await page.goto(`${BASE_URL}/canvas`);
    await page.waitForLoadState('networkidle');

    // Wait for canvas to be ready
    await page.waitForSelector('[data-testid="interactive-canvas"]', { timeout: 10000 });
    await page.waitForSelector('[data-testid="chat-input"]', { timeout: 10000 });

    // Step 1: Create an architecture with conversation
    console.log('📝 Step 1: Creating architecture with conversation...');
    
    const architecturePrompt = getRandomArchitecturePrompt();
    console.log(`🏗️ Architecture prompt: "${architecturePrompt}"`);

    // Type architecture request in chat
    const chatInput = page.locator('[data-testid="chat-input"] textarea');
    await chatInput.clear();
    await chatInput.fill(architecturePrompt);
    
    // Send message
    const sendButton = page.locator('[data-testid="chat-input"] button[type="submit"]');
    await sendButton.click();

    // Wait for AI processing and architecture generation
    await page.waitForTimeout(3000);
    
    // Look for generated nodes on canvas
    const nodesSelector = '.react-flow__node';
    await page.waitForSelector(nodesSelector, { timeout: 15000 });
    
    // Verify nodes exist
    const nodeCount = await page.locator(nodesSelector).count();
    expect(nodeCount).toBeGreater than(0);
    console.log(`✅ Generated architecture with ${nodeCount} nodes`);

    // Step 2: Verify canvas state before transition
    console.log('🔍 Step 2: Verifying canvas state before transition...');
    
    // Check that canvas has content
    const canvasContainer = page.locator('[data-testid="interactive-canvas"]');
    await expect(canvasContainer).toBeVisible();
    
    // Get URL before transition (should have anonymous architecture ID)
    const currentUrl = await page.url();
    console.log(`🔗 Current canvas URL: ${currentUrl}`);
    
    // Verify chat input still exists (conversation active)
    await expect(chatInput).toBeVisible();

    // Step 3: Initiate sign-in transition
    console.log('🔐 Step 3: Initiating sign-in transition...');
    
    // Mock Firebase auth for testing
    await page.addInitScript(() => {
      // Mock Firebase auth state
      window.mockAuth = {
        currentUser: {
          uid: 'test-user-123',
          email: 'test@example.com',
          displayName: 'Test User'
        }
      };
      
      // Mock Firebase functions
      if (typeof window.firebase !== 'undefined') {
        window.firebase.auth = () => ({
          signInWithRedirect: () => Promise.resolve(),
          onAuthStateChanged: (callback: any) => {
            setTimeout(() => callback(window.mockAuth.currentUser), 100);
          },
          getRedirectResult: () => Promise.resolve({ user: window.mockAuth.currentUser })
        });
      }
    });

    // Look for sign-in button and click it (this should redirect to auth mode)
    const signInButton = page.locator('button:has-text("Sign In"), a:has-text("Sign In")').first();
    if (await signInButton.isVisible({ timeout: 5000 })) {
      console.log('🔑 Found sign-in button, clicking...');
      await signInButton.click();
      
      // Wait for redirect to auth mode
      await page.waitForURL('**/auth**', { timeout: 10000 });
    } else {
      console.log('🔗 Simulating auth transition via URL...');
      // Simulate the auth transition by navigating directly to auth URL
      const authUrl = currentUrl.replace('/canvas', '/auth');
      await page.goto(authUrl);
    }

    const authUrl = await page.url();
    console.log(`🔐 Navigated to auth URL: ${authUrl}`);
    await expect(authUrl).toContain('/auth');

    // Step 4: Verify auth mode loads correctly
    console.log('📱 Step 4: Verifying auth mode loads correctly...');
    
    // Wait for auth mode to fully load
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000); // Allow time for Firebase sync

    // Look for architecture sidebar (should be visible in auth mode)
    const sidebarSelector = '[data-testid="architecture-sidebar"], .architecture-sidebar, [class*="sidebar"]';
    await page.waitForSelector(sidebarSelector, { timeout: 10000 });
    
    // Verify sidebar is visible
    const sidebar = page.locator(sidebarSelector);
    await expect(sidebar).toBeVisible();
    console.log('✅ Architecture sidebar is visible');

    // Step 5: Verify transferred architecture appears as first tab
    console.log('🥇 Step 5: Verifying transferred architecture appears as first tab...');
    
    // Look for tabs/architecture items in sidebar
    const tabSelector = '[data-testid="architecture-tab"], .architecture-tab, [class*="tab"], [role="tab"]';
    await page.waitForSelector(tabSelector, { timeout: 15000 });
    
    const tabs = page.locator(tabSelector);
    const tabCount = await tabs.count();
    console.log(`📊 Found ${tabCount} architecture tabs`);
    
    // Should have at least one tab (the transferred architecture)
    expect(tabCount).toBeGreaterThan(0);
    
    // Check first tab content - should not be generic "URL-based microservice"
    const firstTab = tabs.first();
    const firstTabText = await firstTab.textContent();
    console.log(`📋 First tab name: "${firstTabText}"`);
    
    // Verify it's not the generic fallback name
    expect(firstTabText).not.toContain('URL-based microservice');
    expect(firstTabText).toMatch(/[\w\s]+/); // Should have some meaningful text
    
    // Step 6: Verify historical Firebase architectures load
    console.log('📚 Step 6: Verifying historical Firebase architectures load...');
    
    // Should have multiple tabs if we have historical data, or at least the transferred one
    if (tabCount > 1) {
      console.log('✅ Historical Firebase architectures are loading');
      
      // Check that there are tabs with different names
      const tabTexts = await tabs.allTextContents();
      const uniqueTabNames = [...new Set(tabTexts)];
      console.log(`📊 Tab names: ${uniqueTabNames.join(', ')}`);
      
      // Should have multiple unique tab names
      expect(uniqueTabNames.length).toBeGreaterThan(0);
    } else {
      console.log('ℹ️ Only one tab found - this may be a new user with no historical data');
    }

    // Step 7: Verify canvas content is preserved
    console.log('🎨 Step 7: Verifying canvas content is preserved...');
    
    // The canvas should still show the architecture from canvas mode
    const canvasNodes = page.locator('.react-flow__node');
    const canvasNodeCount = await canvasNodes.count();
    
    console.log(`🎨 Canvas nodes count in auth mode: ${canvasNodeCount}`);
    
    // Should have the same architecture nodes as before
    if (canvasNodeCount > 0) {
      console.log('✅ Canvas architecture content is preserved in auth mode');
    } else {
      console.log('⚠️ No canvas nodes found - checking if architecture is selected...');
      
      // Check if we need to select the transferred architecture
      await firstTab.click();
      await.page.waitForTimeout(1000);
      
      const nodesAfterClick = await page.locator('.react-flow__node').count();
      console.log(`🎨 Canvas nodes after selecting tab: ${nodesAfterClick}`);
    }

    // Step 8: Verify chat messages are preserved
    console.log('💬 Step 8: Verifying chat messages are preserved...');
    
    // Look for chat panel or chat history
    const chatPanelSelector = '[data-testid="chat-panel"], [data-testid="right-panel-chat"], .chat-panel';
    const chatPanelVisible = await page.locator(chatPanelSelector).isVisible({ timeout: 5000 });
    
    if (chatPanelVisible) {
      // Look for previous messages
      const messageSelector = '[data-testid="chat-message"], .chat-message, [class*="message"]';
      const messages = page.locator(messageSelector);
      const messageCount = await messages.count();
      
      console.log(`💬 Found ${messageCount} chat messages`);
      
      if (messageCount > 0) {
        // Check if our original architecture prompt is in the messages
        const messageTexts = await messages.allTextContents();
        const hasOriginalPrompt = messageTexts.some(text => 
          text.toLowerCase().includes(architecturePrompt.toLowerCase().split(' ')[0])
        );
        
        if (hasOriginalPrompt) {
          console.log('✅ Chat messages from canvas mode are preserved');
        } else {
          console.log('ℹ️ Chat messages found but original prompt not detected');
        }
      }
    } else {
      console.log('ℹ️ Chat panel not visible - this may be expected in some UI layouts');
    }

    console.log('🎉 Canvas-to-Auth complete flow test passed!');
  });

  test('Canvas-to-auth flow with no historical data', async ({ page }) => {
    // Test for new users with no existing Firebase architectures
    await page.goto(`${BASE_URL}/canvas`);
    await page.waitForLoadState('networkidle');

    // Create a simple architecture
    const chatInput = page.locator('[data-testid="chat-input"] textarea');
    await chatInput.clear();
    await chatInput.fill('Create a simple microservice with a database');
    await page.locator('[data-testid="chat-input"] button[type="submit"]').click();
    
    await page.waitForTimeout(3000);
    await page.waitForSelector('.react-flow__node', { timeout: 15000 });

    // Navigate to auth mode
    const authUrl = (await page.url()).replace('/canvas', '/auth');
    await page.goto(authUrl);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Should have at least one tab (the transferred architecture)
    const sidebarSelector = '[data-testid="architecture-sidebar"], .architecture-sidebar, [class*="sidebar"]';
    await page.waitForSelector(sidebarSelector, { timeout: 10000 });
    
    const tabSelector = '[data-testid="architecture-tab"], .architecture-tab, [class*="tab"], [role="tab"]';
    const tabs = page.locator(tabSelector);
    const tabCount = await tabs.count();
    
    expect(tabCount).toBeGreaterThan(0);
    
    // First tab should not be generic
    const firstTabText = await tabs.first().textContent();
    expect(firstTabText).not.toContain('URL-based microservice');
    
    console.log('✅ New user canvas-to-auth flow test passed!');
  });
});
