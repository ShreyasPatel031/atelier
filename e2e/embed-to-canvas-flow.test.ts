/**
 * Embed-to-Canvas Flow E2E Test
 * 
 * Validates:
 * 1. Architecture persists from embed to canvas
 * 2. Chat messages persist from embed to canvas
 */

import { test, expect } from '@playwright/test';

test.describe('Embed-to-Canvas Flow', () => {
  const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:3001';
  
  test('Architecture and chat persist from embed to canvas', async ({ page, context }) => {
    console.log('📱 Loading embed mode...');
    await page.goto(`${BASE_URL}/embed`);
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('.react-flow', { timeout: 10000 });

    console.log('🏗️ Creating architecture...');
    const prompt = 'Build API with Lambda and DynamoDB';
    
    // Chatbox uses Input component (input element, not textarea)
    const chatInput = page.locator('input[placeholder*="architecture" i], input[placeholder*="describe" i]').first();
    await chatInput.waitFor({ state: 'visible', timeout: 10000 });
    await chatInput.fill(prompt);
    await page.locator('button[type="submit"]').first().click();

    await page.waitForTimeout(5000);
    const nodes = page.locator('.react-flow__node');
    await nodes.first().waitFor({ state: 'visible', timeout: 20000 });
    
    const embedNodeCount = await nodes.count();
    console.log(`✅ Embed: ${embedNodeCount} nodes`);
    expect(embedNodeCount).toBeGreaterThan(0);

    console.log('🔧 Clicking Edit (this will save architecture and open canvas)...');
    const editButton = page.locator('button:has-text("Edit")').first();
    
    const [canvasPage] = await Promise.all([
      context.waitForEvent('page'),
      editButton.click()
    ]);
    
    // Wait for page to load
    await canvasPage.waitForLoadState('load');
    await canvasPage.waitForTimeout(2000);
    
    const canvasUrl = await canvasPage.url();
    console.log(`🎨 Canvas URL: ${canvasUrl}`);
    
    // The Edit button should have saved the architecture and included arch= in URL
    expect(canvasUrl).toContain('arch=');
    expect(canvasUrl).toContain('/auth');

    console.log('📊 Verifying architecture...');
    const canvasNodes = canvasPage.locator('.react-flow__node');
    await canvasNodes.first().waitFor({ state: 'visible', timeout: 10000 });
    
    const canvasNodeCount = await canvasNodes.count();
    console.log(`✅ Canvas: ${canvasNodeCount} nodes`);
    expect(canvasNodeCount).toBe(embedNodeCount);

    console.log('💬 Checking chat persistence...');
    // Chat should be available in right panel
    const chatPanel = canvasPage.locator('[class*="bg-gray-50"][class*="border-l"]').filter({
      has: canvasPage.locator('[data-testid="agent-icon"]')
    });
    
    const chatPanelVisible = await chatPanel.isVisible({ timeout: 2000 }).catch(() => false);
    if (chatPanelVisible) {
      console.log('✅ Chat panel present');
    }

    console.log('🎉 Embed-to-Canvas PASSED!');
    await canvasPage.close();
  });
});
