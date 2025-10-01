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
    // Node count should be similar (allow +/- 1 for layout variations)
    expect(canvasNodeCount).toBeGreaterThanOrEqual(embedNodeCount - 1);
    expect(canvasNodeCount).toBeLessThanOrEqual(embedNodeCount + 1);

    console.log('💬 Checking chat persistence...');
    // Verify chat messages were persisted by checking localStorage
    const chatMessages = await canvasPage.evaluate(() => {
      const stored = localStorage.getItem('atelier_current_conversation');
      return stored ? JSON.parse(stored) : [];
    });
    
    console.log(`📝 Found ${chatMessages.length} chat messages in canvas`);
    expect(chatMessages.length).toBeGreaterThan(0);
    
    // Verify the original prompt is in the chat messages
    const hasOriginalPrompt = chatMessages.some((msg: any) => 
      msg.content && msg.content.toLowerCase().includes('lambda') && msg.content.toLowerCase().includes('dynamodb')
    );
    expect(hasOriginalPrompt).toBe(true);
    console.log('✅ Chat messages persisted correctly with original prompt');

    console.log('🎉 Embed-to-Canvas PASSED!');
    await canvasPage.close();
  });
});
