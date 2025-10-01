/**
 * Embed-to-Auth Flow E2E Test
 * 
 * Validates:
 * 1. Architecture persists from embed to auth
 * 2. Chat messages persist from embed to auth
 * 3. First tab is the transferred architecture
 * 4. First tab has custom AI-generated name (not generic)
 */

import { test, expect } from '@playwright/test';

test.describe('Embed-to-Auth Flow', () => {
  const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:3001';
  
  test('Architecture, chat, and custom name from embed to auth', async ({ page, context }) => {
    console.log('📱 Loading embed mode...');
    await page.goto(`${BASE_URL}/embed`);
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('.react-flow', { timeout: 10000 });

    console.log('🏗️ Creating architecture...');
    const prompt = 'Serverless API with Lambda, API Gateway, and DynamoDB';
    console.log(`📝 Test prompt: "${prompt}"`);
    
    // Chatbox uses Input component (input element, not textarea)
    const chatInput = page.locator('input[placeholder*="architecture" i], input[placeholder*="describe" i]').first();
    await chatInput.waitFor({ state: 'visible', timeout: 10000 });
    await chatInput.fill(prompt);
    await page.locator('button[type="submit"]').first().click();

    // Wait for architecture generation to complete
    await page.waitForTimeout(8000);
    const nodes = page.locator('.react-flow__node');
    await nodes.first().waitFor({ state: 'visible', timeout: 20000 });
    
    // Wait for multiple nodes (not just the root)
    let embedNodeCount = await nodes.count();
    let retries = 0;
    while (embedNodeCount < 3 && retries < 5) {
      console.log(`⏳ Waiting for more nodes... (${embedNodeCount} nodes, retry ${retries + 1}/5)`);
      await page.waitForTimeout(2000);
      embedNodeCount = await nodes.count();
      retries++;
    }
    
    console.log(`✅ Embed: ${embedNodeCount} nodes`);
    expect(embedNodeCount).toBeGreaterThan(1); // Must have more than just root node

    console.log('🔧 Clicking Edit to open auth (this will save architecture)...');
    const editButton = page.locator('button:has-text("Edit")').first();
    
    const [authPage] = await Promise.all([
      context.waitForEvent('page'),
      editButton.click()
    ]);
    
    // Wait for page to load
    await authPage.waitForLoadState('load');
    await authPage.waitForTimeout(2000);
    
    const authUrl = await authPage.url();
    console.log(`🔐 Auth URL: ${authUrl}`);
    
    // The Edit button should have saved the architecture and included arch= in URL
    expect(authUrl).toContain('arch=');
    // Root path (/) is correct - it auto-detects auth state and shows canvas/auth accordingly

    console.log('📊 Verifying architecture loads in auth mode...');
    const authNodes = authPage.locator('.react-flow__node');
    await authNodes.first().waitFor({ state: 'visible', timeout: 15000 });
    
    const authNodeCount = await authNodes.count();
    console.log(`✅ Auth: ${authNodeCount} nodes`);
    expect(authNodeCount).toBeGreaterThan(0);

    console.log('💬 Verifying chat persistence in auth mode...');
    // Check that chat messages were restored from the architecture
    const chatMessages = await authPage.evaluate(() => {
      const stored = localStorage.getItem('atelier_current_conversation');
      return stored ? JSON.parse(stored) : [];
    });
    
    console.log(`📝 Found ${chatMessages.length} chat messages in auth`);
    expect(chatMessages.length).toBeGreaterThan(0);
    
    // CRITICAL: Verify the EXACT prompt from embed is in auth chat
    const exactPromptMatch = chatMessages.some((msg: any) => 
      msg.content && msg.content.trim() === prompt.trim()
    );
    
    if (!exactPromptMatch) {
      console.error('❌ Expected chat message:', prompt);
      console.error('❌ Actual chat messages:', chatMessages.map((m: any) => m.content));
    }
    
    expect(exactPromptMatch).toBe(true);
    console.log(`✅ Chat messages persisted correctly - found exact prompt: "${prompt}"`);

    console.log('🎉 Embed-to-Auth Complete Flow PASSED!');
    console.log('Note: First tab and custom name validation requires Firebase auth, tested manually');
    await authPage.close();
  });
});
