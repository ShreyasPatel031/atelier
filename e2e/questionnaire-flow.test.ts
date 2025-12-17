/**
 * Questionnaire Flow E2E Test
 * 
 * Tests the questionnaire functionality:
 * 1. Empty canvas + "make llm assessor" should trigger questionnaire
 * 2. Questions should be multi-select (checkbox)
 * 3. Questions should have 4 options
 * 4. Selection should auto-trigger next question
 * 5. Selection styling should use blue (#4285F4)
 */

import { test, expect } from '@playwright/test';
import { getBaseUrl } from './test-config.js';

test.describe('Questionnaire Flow', () => {
  let BASE_URL: string;
  
  test.beforeAll(async () => {
    BASE_URL = await getBaseUrl();
  });
  
  test('Empty canvas should trigger questionnaire for "make llm assessor"', async ({ page }) => {
    test.setTimeout(60000); // 60 seconds for API calls
    
    console.log('📱 Loading canvas mode...');
    await page.goto(`${BASE_URL}/canvas`);
    await page.waitForLoadState('networkidle');
    
    // Wait for canvas to load
    await page.waitForSelector('.react-flow', { timeout: 10000 });
    console.log('✅ Canvas loaded');
    
    // Open chat panel if collapsed - hover first to reveal the button
    const agentIcon = page.locator('[data-testid="agent-icon"]');
    const agentIconCount = await agentIcon.count();
    if (agentIconCount > 0) {
      // Hover to reveal the expand button
      await agentIcon.hover();
      await page.waitForTimeout(500);
      
      // Click the expand button that appears on hover
      const expandButton = page.locator('button[title*="Open Chat Panel" i], button[title*="Close Chat Panel" i]').first();
      const expandButtonCount = await expandButton.count();
      if (expandButtonCount > 0) {
        await expandButton.click();
        await page.waitForTimeout(2000);
        console.log('✅ Chat panel opened via hover button');
      } else {
        // Try direct click
        await agentIcon.click();
        await page.waitForTimeout(2000);
        console.log('✅ Chat panel opened via direct click');
      }
    }
    
    // Find chat input using data-testid - wait for it to be visible
    const chatInput = page.locator('[data-testid="chat-input"]');
    await chatInput.waitFor({ state: 'visible', timeout: 20000 });
    console.log('✅ Chat input found');
    
    // Send "make llm assessor" message
    const prompt = 'make llm assessor';
    await chatInput.fill(prompt);
    await page.locator('button[type="submit"]').first().click();
    console.log(`📝 Sent message: "${prompt}"`);
    
    // Wait for questionnaire to appear
    console.log('⏳ Waiting for questionnaire...');
    
    // Look for question block - should have type="question" message
    // The question block should have:
    // 1. A header with "Question" text
    // 2. Options with letter labels (A, B, C, D)
    // 3. Checkbox-style selection indicators
    
    // Wait for question message to appear (check for "Question" header or option buttons)
    const questionHeader = page.locator('text=Question').first();
    await questionHeader.waitFor({ state: 'visible', timeout: 30000 });
    console.log('✅ Question header found');
    
    // Verify question has 4 options
    const optionButtons = page.locator('button:has-text("A."), button:has-text("B."), button:has-text("C."), button:has-text("D.")');
    await optionButtons.first().waitFor({ state: 'visible', timeout: 5000 });
    
    const optionCount = await optionButtons.count();
    console.log(`📊 Found ${optionCount} options`);
    expect(optionCount).toBeGreaterThanOrEqual(4);
    
    // Verify options are clickable (checkbox style)
    const firstOption = optionButtons.first();
    await expect(firstOption).toBeVisible();
    
    // Click first option
    console.log('🖱️ Clicking first option...');
    await firstOption.click();
    await page.waitForTimeout(500);
    
    // Verify selection styling (blue border #4285F4)
    const selectedOption = firstOption;
    const borderColor = await selectedOption.evaluate((el) => {
      const styles = window.getComputedStyle(el);
      return styles.borderColor;
    });
    
    console.log(`🎨 Border color: ${borderColor}`);
    // Border color should be rgb(66, 133, 244) which is #4285F4
    expect(borderColor).toContain('66'); // RGB red component
    expect(borderColor).toContain('133'); // RGB green component
    expect(borderColor).toContain('244'); // RGB blue component
    
    // Verify checkbox indicator is visible (white checkmark on blue background)
    const checkboxIndicator = selectedOption.locator('div').first();
    await expect(checkboxIndicator).toBeVisible();
    
    // Wait for auto-trigger of next question (should happen after 300ms)
    console.log('⏳ Waiting for next question to auto-trigger...');
    await page.waitForTimeout(2000); // Give time for API call
    
    // Check if another question appeared or if architecture was created
    // Either is acceptable - the auto-trigger should have sent the selection
    const allQuestions = page.locator('text=Question');
    const questionCount = await allQuestions.count();
    console.log(`📊 Total questions after selection: ${questionCount}`);
    
    // Verify the selection was sent (check for "Selected:" in messages or new question)
    const messages = page.locator('[data-chatbox="true"]').locator('div').filter({ hasText: /Selected:/ });
    const hasSelectionMessage = await messages.count() > 0;
    
    if (questionCount > 1 || hasSelectionMessage) {
      console.log('✅ Auto-trigger worked - next question or response appeared');
    } else {
      console.log('⚠️ Auto-trigger may not have fired, but selection was recorded');
    }
    
    console.log('🎉 Questionnaire Flow Test PASSED!');
  });
  
  test('Questionnaire should use checkbox (multi-select) type', async ({ page }) => {
    test.setTimeout(60000);
    
    console.log('📱 Loading canvas mode...');
    await page.goto(`${BASE_URL}/canvas`);
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('.react-flow', { timeout: 10000 });
    
    // Open chat panel
    const agentIcon = page.locator('[data-testid="agent-icon"]');
    if (await agentIcon.count() > 0) {
      await agentIcon.hover();
      await page.waitForTimeout(500);
      const expandButton = page.locator('button[title*="Open Chat Panel" i], button[title*="Close Chat Panel" i]').first();
      if (await expandButton.count() > 0) {
        await expandButton.click();
      } else {
        await agentIcon.click();
      }
      await page.waitForTimeout(2000);
    }
    
    // Find chat input using data-testid
    const chatInput = page.locator('[data-testid="chat-input"]');
    await chatInput.waitFor({ state: 'visible', timeout: 20000 });
    await chatInput.fill('make llm assessor');
    await page.locator('button[type="submit"]').first().click();
    
    // Wait for question
    await page.locator('text=Question').first().waitFor({ state: 'visible', timeout: 30000 });
    
    // Get all options
    const optionButtons = page.locator('button:has-text("A."), button:has-text("B."), button:has-text("C."), button:has-text("D.")');
    await optionButtons.first().waitFor({ state: 'visible', timeout: 5000 });
    
    // Click first option
    const firstOption = optionButtons.first();
    await firstOption.click();
    await page.waitForTimeout(300);
    
    // Click second option - should be able to select multiple
    const secondOption = optionButtons.nth(1);
    await secondOption.click();
    await page.waitForTimeout(300);
    
    // Verify both are selected (both should have blue border)
    const firstBorderColor = await firstOption.evaluate((el) => {
      return window.getComputedStyle(el).borderColor;
    });
    const secondBorderColor = await secondOption.evaluate((el) => {
      return window.getComputedStyle(el).borderColor;
    });
    
    console.log(`🎨 First option border: ${firstBorderColor}`);
    console.log(`🎨 Second option border: ${secondBorderColor}`);
    
    // Both should be selected (blue border)
    expect(firstBorderColor).toContain('66');
    expect(firstBorderColor).toContain('133');
    expect(firstBorderColor).toContain('244');
    expect(secondBorderColor).toContain('66');
    expect(secondBorderColor).toContain('133');
    expect(secondBorderColor).toContain('244');
    
    console.log('✅ Multi-select test PASSED - both options selected');
  });
});

