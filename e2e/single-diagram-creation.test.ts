/**
 * Single Diagram Creation Test
 * 
 * Tests that only ONE "Creating architecture diagram" message appears
 * when the agent decides to create a diagram.
 * 
 * This test directly verifies the fix for multiple diagram creation messages.
 */

import { test, expect } from '@playwright/test';
import { getBaseUrl } from './test-config.js';

test.describe('Single Diagram Creation', () => {
  let BASE_URL: string;
  
  test.beforeAll(async () => {
    BASE_URL = await getBaseUrl();
  });
  
  test('Should create only ONE diagram creation message', async ({ page }) => {
    test.setTimeout(120000);
    
    console.log('📱 Loading canvas mode...');
    await page.goto(`${BASE_URL}/canvas`);
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('.react-flow', { timeout: 10000 });
    console.log('✅ Canvas loaded');
    
    // Open chat panel
    const agentIcon = page.locator('[data-testid="agent-icon"]');
    const agentIconCount = await agentIcon.count();
    
    if (agentIconCount > 0) {
      await agentIcon.hover();
      await page.waitForTimeout(1000);
      const toggleButton = page.locator('button[title*="Open Chat Panel" i], button[title*="Close Chat Panel" i]');
      const toggleButtonCount = await toggleButton.count();
      
      if (toggleButtonCount > 0) {
        const buttonTitle = await toggleButton.first().getAttribute('title');
        if (buttonTitle && buttonTitle.toLowerCase().includes('open')) {
          await toggleButton.first().click();
          await page.waitForTimeout(2000);
        }
      }
    }
    
    const chatInput = page.locator('[data-testid="chat-input"]');
    await chatInput.waitFor({ state: 'visible', timeout: 15000 });
    console.log('✅ Chat input found');
    
    // Send prompt that should trigger diagram creation after question
    const prompt = 'make llm assessor';
    await chatInput.fill(prompt);
    
    // Monitor for diagram creation messages
    let diagramMessageCount = 0;
    const diagramMessageLocator = page.locator('text=/Creating.*architecture.*diagram/i');
    
    // Set up a listener to count messages as they appear
    page.on('response', async (response) => {
      if (response.url().includes('/api/chat') && response.status() === 200) {
        const body = await response.text().catch(() => '');
        // Count "Creating architecture diagram" in response
        const matches = body.match(/Creating.*architecture.*diagram/gi);
        if (matches) {
          console.log(`📊 Found ${matches.length} "Creating architecture diagram" messages in API response`);
          diagramMessageCount = Math.max(diagramMessageCount, matches.length);
        }
      }
    });
    
    // Send the message
    const sendButton = page.locator('[data-testid="send-button"], button[type="submit"]').first();
    await sendButton.waitFor({ state: 'visible', timeout: 5000 });
    await sendButton.click({ force: true });
    console.log(`📝 Sent message: "${prompt}"`);
    
    // Wait for response to appear (either question or diagram)
    console.log('⏳ Waiting for response...');
    await page.waitForTimeout(10000); // Give API time to respond
    
    // Check for question first
    const questionHeader = page.locator('h3', { hasText: /Question/i }).or(page.locator('text=/Question/i'));
    const hasQuestion = await questionHeader.count() > 0;
    
    if (hasQuestion) {
      console.log('✅ Question appeared, selecting first option...');
      
      // Select first option
      const optionButtons = page.locator('button').filter({ hasText: /^[A-D]\./ });
      const optionCount = await optionButtons.count();
      
      if (optionCount > 0) {
        await optionButtons.first().click();
        console.log('✅ Selected first option');
        
        // Wait for diagram creation to trigger
        await page.waitForTimeout(15000);
      }
    }
    
    // Count diagram creation messages in UI
    await page.waitForTimeout(5000); // Give time for messages to render
    
    const uiDiagramMessages = await diagramMessageLocator.count();
    console.log(`📊 UI: Found ${uiDiagramMessages} "Creating architecture diagram" message(s) in the UI`);
    
    // Verify only ONE message appears
    expect(uiDiagramMessages).toBe(1);
    console.log('✅ PASSED: Only ONE diagram creation message appears');
    
    // Also log if API response had multiple
    if (diagramMessageCount > 1) {
      console.log(`⚠️ WARNING: API response contained ${diagramMessageCount} diagram creation messages, but UI correctly shows only 1`);
    }
    
    console.log('🎉 Single Diagram Creation Test PASSED!');
  });
});




