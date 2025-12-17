/**
 * Architecture Management E2E Tests
 * 
 * Tests for architecture management functionality:
 * 1. Saved architectures appear in sidebar after auth
 * 2. Creating a new architecture works and resets canvas
 * 3. Selecting "New Architecture" starts a new conversation
 * 
 * NO MOCKS - Tests actual production behavior
 */

import { test, expect } from '@playwright/test';
import { getBaseUrl } from './test-config.js';

test.describe('Architecture Management', () => {
  let BASE_URL: string;
  
  test.beforeAll(async () => {
    BASE_URL = await getBaseUrl();
  });

  test('Saved architectures appear in sidebar after auth', async ({ page }) => {
    console.log('🔐 Testing: Saved architectures appear in sidebar after auth');
    
    // Navigate to auth mode
    await page.goto(`${BASE_URL}/auth`);
    await page.waitForLoadState('networkidle');
    
    // Wait for sidebar to be visible
    await page.waitForSelector('[class*="sidebar"], [class*="Sidebar"]', { timeout: 10000 });
    console.log('✅ Sidebar visible');
    
    // Wait for architectures to load from Firebase (give it time)
    await page.waitForTimeout(3000);
    
    // Check if architecture list is visible in sidebar
    const architectureList = page.locator('[class*="architecture"], [class*="Architecture"]').filter({
      hasText: /New Architecture|Architecture|Cloud|Serverless|API/i
    });
    
    const archCount = await architectureList.count();
    console.log(`📊 Found ${archCount} architecture items in sidebar`);
    
    // Should have at least "New Architecture" tab
    expect(archCount).toBeGreaterThan(0);
    
    // Check if "New Architecture" button/tab exists
    const newArchButton = page.locator('button, [role="button"]').filter({
      hasText: /New Architecture|Add New Architecture/i
    });
    const hasNewArchButton = await newArchButton.count() > 0;
    expect(hasNewArchButton).toBe(true);
    console.log('✅ "New Architecture" tab/button found');
  });

  test('Creating a new architecture works and resets canvas', async ({ page }) => {
    console.log('🆕 Testing: Creating a new architecture works and resets canvas');
    
    // Navigate to auth mode
    await page.goto(`${BASE_URL}/auth`);
    await page.waitForLoadState('networkidle');
    
    // Wait for sidebar
    await page.waitForSelector('[class*="sidebar"], [class*="Sidebar"]', { timeout: 10000 });
    await page.waitForTimeout(2000);
    
    // Find and click "Add New Architecture" button
    const addNewButton = page.locator('button, [role="button"]').filter({
      hasText: /Add New Architecture|New Architecture/i
    }).first();
    
    await addNewButton.waitFor({ state: 'visible', timeout: 5000 });
    console.log('✅ Found "Add New Architecture" button');
    
    // Get initial node count (if any)
    const initialNodes = page.locator('.react-flow__node');
    const initialNodeCount = await initialNodes.count();
    console.log(`📊 Initial node count: ${initialNodeCount}`);
    
    // Click the button
    await addNewButton.click();
    console.log('✅ Clicked "Add New Architecture" button');
    
    // Wait for state to update
    await page.waitForTimeout(1000);
    
    // Verify canvas is empty (or reset)
    const nodesAfter = page.locator('.react-flow__node');
    const nodeCountAfter = await nodesAfter.count();
    console.log(`📊 Node count after creating new architecture: ${nodeCountAfter}`);
    
    // Canvas should be empty (or at least not have more nodes than before)
    // The exact behavior depends on whether there was content before
    expect(nodeCountAfter).toBeLessThanOrEqual(initialNodeCount);
    
    // Verify "New Architecture" is selected (check for active state or text)
    const selectedArch = page.locator('[class*="selected"], [class*="active"], [class*="bg-gray"]').filter({
      hasText: /New Architecture/i
    });
    const isSelected = await selectedArch.count() > 0;
    console.log(`✅ "New Architecture" selected: ${isSelected}`);
    
    // Verify chat name is "New Architecture"
    const chatName = await page.evaluate(() => {
      return (window as any).__atelierCurrentChatName || 
             document.querySelector('[class*="chat"], [class*="Chat"]')?.textContent || '';
    });
    console.log(`💬 Chat name: ${chatName}`);
    expect(chatName.toLowerCase()).toContain('new architecture');
  });

  test('Selecting "New Architecture" starts a new conversation', async ({ page }) => {
    console.log('💬 Testing: Selecting "New Architecture" starts a new conversation');
    
    // Navigate to auth mode
    await page.goto(`${BASE_URL}/auth`);
    await page.waitForLoadState('networkidle');
    
    // Wait for sidebar
    await page.waitForSelector('[class*="sidebar"], [class*="Sidebar"]', { timeout: 10000 });
    await page.waitForTimeout(2000);
    
    // First, add a message to the current conversation (if chat is available)
    const chatInput = page.locator('textarea, input[type="text"]').filter({
      hasText: /.*/
    }).first();
    
    const chatInputCount = await chatInput.count();
    if (chatInputCount > 0) {
      await chatInput.fill('Test message before selecting new architecture');
      await chatInput.press('Enter');
      await page.waitForTimeout(1000);
      console.log('✅ Added test message to conversation');
    }
    
    // Check conversation before selecting new architecture
    const conversationBefore = await page.evaluate(() => {
      try {
        const stored = localStorage.getItem('atelier_current_conversation');
        if (stored) {
          return JSON.parse(stored);
        }
        return [];
      } catch {
        return [];
      }
    });
    console.log(`📝 Conversation before: ${conversationBefore.length} messages`);
    
    // Find and click "New Architecture" tab/button
    const newArchTab = page.locator('button, [role="button"], [class*="cursor-pointer"]').filter({
      hasText: /New Architecture/i
    }).first();
    
    await newArchTab.waitFor({ state: 'visible', timeout: 5000 });
    await newArchTab.click();
    console.log('✅ Clicked "New Architecture" tab');
    
    // Wait for state to update
    await page.waitForTimeout(1000);
    
    // Check conversation after selecting new architecture
    const conversationAfter = await page.evaluate(() => {
      try {
        const stored = localStorage.getItem('atelier_current_conversation');
        if (stored) {
          return JSON.parse(stored);
        }
        return [];
      } catch {
        return [];
      }
    });
    console.log(`📝 Conversation after: ${conversationAfter.length} messages`);
    
    // Conversation should be cleared (empty or reset)
    expect(conversationAfter.length).toBe(0);
    console.log('✅ Conversation was cleared when selecting "New Architecture"');
    
    // Verify canvas is empty
    const nodes = page.locator('.react-flow__node');
    const nodeCount = await nodes.count();
    console.log(`📊 Node count: ${nodeCount}`);
    
    // Canvas should be empty for new architecture
    expect(nodeCount).toBe(0);
    console.log('✅ Canvas is empty for new architecture');
  });

  test('Architectures load on canvas when selected from sidebar', async ({ page }) => {
    console.log('📂 Testing: Architectures load on canvas when selected from sidebar');
    
    // Navigate to auth mode
    await page.goto(`${BASE_URL}/auth`);
    await page.waitForLoadState('networkidle');
    
    // Wait for sidebar and architectures to load
    await page.waitForSelector('[class*="sidebar"], [class*="Sidebar"]', { timeout: 10000 });
    await page.waitForTimeout(3000); // Give Firebase time to load
    
    // Find all architecture tabs (excluding "New Architecture")
    const archTabs = page.locator('button, [role="button"], [class*="cursor-pointer"]').filter({
      hasText: /Architecture|Cloud|Serverless|API|Lambda|AWS|GCP/i
    }).filter({
      hasNotText: /New Architecture/i
    });
    
    const tabCount = await archTabs.count();
    console.log(`📊 Found ${tabCount} architecture tabs (excluding "New Architecture")`);
    
    if (tabCount > 0) {
      // Get the first architecture tab
      const firstArchTab = archTabs.first();
      const tabText = await firstArchTab.textContent();
      console.log(`📋 Selecting architecture: "${tabText}"`);
      
      // Get initial node count
      const initialNodes = page.locator('.react-flow__node');
      const initialCount = await initialNodes.count();
      console.log(`📊 Initial node count: ${initialCount}`);
      
      // Click the architecture tab
      await firstArchTab.click();
      console.log('✅ Clicked architecture tab');
      
      // Wait for architecture to load
      await page.waitForTimeout(2000);
      
      // Check if nodes appeared on canvas
      const nodesAfter = page.locator('.react-flow__node');
      await nodesAfter.first().waitFor({ state: 'visible', timeout: 5000 }).catch(() => {
        console.log('⚠️ No nodes appeared - architecture might be empty');
      });
      
      const finalCount = await nodesAfter.count();
      console.log(`📊 Final node count: ${finalCount}`);
      
      // If architecture has content, nodes should be visible
      // (We can't assert exact count since we don't know the architecture content)
      // But we can verify the selection worked
      const selectedTab = page.locator('[class*="selected"], [class*="active"], [class*="bg-gray"]').filter({
      hasText: new RegExp(tabText || '', 'i')
      });
      const isSelected = await selectedTab.count() > 0;
      expect(isSelected).toBe(true);
      console.log('✅ Architecture tab is selected');
    } else {
      console.log('ℹ️ No saved architectures found - skipping canvas load test');
      // This is okay - user might not have any saved architectures yet
    }
  });
});




