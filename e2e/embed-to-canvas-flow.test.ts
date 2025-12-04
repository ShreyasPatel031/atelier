/**
 * Embed-to-Canvas Flow E2E Test
 * 
 * Validates:
 * 1. Architecture persists from embed to canvas
 * 2. Chat messages persist from embed to canvas
 */

import { test, expect } from '@playwright/test';
import { getBaseUrl } from './test-config.js';

test.describe('Embed-to-Canvas Flow', () => {
  let BASE_URL: string;
  
  test.beforeAll(async () => {
    BASE_URL = await getBaseUrl();
  });
  
  test.skip('Architecture and chat persist from embed to canvas', async ({ page, context }) => {
    // Skipped: Flaky test dependent on API architecture generation which can timeout
    // TODO: Fix or mock API responses for reliable testing
    test.setTimeout(120000); // 2 minutes for API-based architecture generation
    console.log('📱 Loading embed mode...');
    await page.goto(`${BASE_URL}/embed`);
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('.react-flow', { timeout: 10000 });

    console.log('🏗️ Creating architecture...');
    const prompt = 'Build API with Lambda and DynamoDB';
    console.log(`📝 Test prompt: "${prompt}"`);
    
    // Chatbox uses Input component (input element, not textarea)
    const chatInput = page.locator('input[placeholder*="architecture" i], input[placeholder*="describe" i]').first();
    await chatInput.waitFor({ state: 'visible', timeout: 10000 });
    await chatInput.fill(prompt);
    // Use force: true to bypass overlay interception (ELK debugger overlay)
    await page.locator('button[type="submit"]').first().click({ force: true });

    // Wait for architecture generation - nodes can take 30+ seconds to appear
    const nodes = page.locator('.react-flow__node');
    // Increased timeout to 60s for API-based architecture generation
    await nodes.first().waitFor({ state: 'visible', timeout: 60000 });
    
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
    // Root path (/) is correct - it auto-detects auth state

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
    
    // CRITICAL: Verify the EXACT prompt from embed is in canvas chat
    const exactPromptMatch = chatMessages.some((msg: any) => 
      msg.content && msg.content.trim() === prompt.trim()
    );
    
    if (!exactPromptMatch) {
      console.error('❌ Expected chat message:', prompt);
      console.error('❌ Actual chat messages:', chatMessages.map((m: any) => m.content));
    }
    
    expect(exactPromptMatch).toBe(true);
    console.log(`✅ Chat messages persisted correctly - found exact prompt: "${prompt}"`);

    console.log('🎉 Embed-to-Canvas PASSED!');
    await canvasPage.close();
  });
});
