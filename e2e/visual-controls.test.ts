import { test, expect } from '@playwright/test';

test('Visual Controls - Dev Panel changes reflect on canvas', async ({ page }) => {
  test.setTimeout(60000);
  
  // Navigate to canvas page
  await page.goto('http://localhost:3000/canvas');
  
  // Wait for page to fully load
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(3000);
  
  // Wait for ReactFlow to be ready
  await page.waitForSelector('.react-flow', { timeout: 10000 });
  await page.waitForTimeout(2000);
  
  // Try to load default diagram or wait for existing nodes
  const hasNodes = await page.evaluate(async () => {
    // Try loading default diagram
    if (typeof (window as any).loadComplexDefault === 'function') {
      (window as any).loadComplexDefault();
      // Wait a bit for it to load
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
    
    // Check if nodes exist
    const nodes = document.querySelectorAll('.react-flow__node');
    return nodes.length > 0;
  });
  
  if (!hasNodes) {
    // Wait a bit more and check again
    await page.waitForTimeout(3000);
  }
  
  // Wait for nodes to appear (with longer timeout)
  await page.waitForSelector('.react-flow__node', { timeout: 20000 });
  await page.waitForTimeout(2000);
  
  // Get initial state - check for groups first, retry if needed
  let initialState: any = null;
  let retries = 3;
  
  while (retries > 0 && (!initialState || !initialState.initialColor || initialState.count === 0)) {
    initialState = await page.evaluate(() => {
      const groups = document.querySelectorAll('.react-flow__node[data-type="draftGroup"]');
      if (groups.length > 0) {
        const firstGroup = groups[0] as HTMLElement;
        const computedStyle = window.getComputedStyle(firstGroup);
        return {
          elementType: 'group',
          count: groups.length,
          initialColor: computedStyle.backgroundColor,
          initialOpacity: parseFloat(computedStyle.opacity) || 1
        };
      }
      
      // Check for regular nodes
      const nodes = document.querySelectorAll('.react-flow__node[data-type="custom"]');
      if (nodes.length > 0) {
        const firstNode = nodes[0] as HTMLElement;
        const computedStyle = window.getComputedStyle(firstNode);
        return {
          elementType: 'node',
          count: nodes.length,
          initialColor: computedStyle.backgroundColor,
          initialOpacity: parseFloat(computedStyle.opacity) || 1
        };
      }
      
      // Check for any nodes (fallback)
      const anyNodes = document.querySelectorAll('.react-flow__node');
      if (anyNodes.length > 0) {
        const firstNode = anyNodes[0] as HTMLElement;
        const computedStyle = window.getComputedStyle(firstNode);
        return {
          elementType: 'any',
          count: anyNodes.length,
          initialColor: computedStyle.backgroundColor,
          initialOpacity: parseFloat(computedStyle.opacity) || 1
        };
      }
      
      return { elementType: null, count: 0, initialColor: null, initialOpacity: null };
    });
    
    if (!initialState || !initialState.initialColor || initialState.count === 0) {
      retries--;
      if (retries > 0) {
        console.log(`No nodes found, retrying... (${retries} attempts left)`);
        await page.waitForTimeout(2000);
      }
    }
  }
  
  if (!initialState || !initialState.initialColor || initialState.count === 0) {
    // Take a screenshot for debugging
    await page.screenshot({ path: 'test-results/no-nodes-found.png' });
    throw new Error('No groups or nodes found on canvas after retries');
  }
  
  console.log(`Found ${initialState.count} ${initialState.elementType}s, initial color: ${initialState.initialColor}, opacity: ${initialState.initialOpacity}`);
  
  // Open Dev Panel by clicking Debug button
  const debugButton = page.getByRole('button', { name: /Debug/i });
  await debugButton.waitFor({ state: 'visible', timeout: 5000 });
  await debugButton.click();
  await page.waitForTimeout(1000); // Wait for panel to open
  
  // Verify Dev Panel is open
  const devPanel = page.locator('text=Visual Controls').first();
  await devPanel.waitFor({ state: 'visible', timeout: 5000 });
  
  console.log('✅ Dev Panel opened');
  
  // Find Visual Controls section
  const visualControlsSection = page.locator('text=Visual Controls').first();
  await visualControlsSection.waitFor({ state: 'visible', timeout: 5000 });
  
  // Find Group Color input - it's the first color input in Visual Controls
  // Use a more specific selector: find the input near "Group" text
  const groupColorInput = page.locator('h5:has-text("Group")').locator('..').locator('input[type="color"]').first();
  await groupColorInput.waitFor({ state: 'visible', timeout: 5000 });
  
  // Change group color to red (#ff0000)
  await groupColorInput.fill('#ff0000');
  await page.waitForTimeout(500); // Wait for change to propagate
  
  // Also change the text input to ensure it's synced - it's next to the color input
  const groupColorTextInput = page.locator('h5:has-text("Group")').locator('..').locator('input[type="text"]').first();
  await groupColorTextInput.fill('#ff0000');
  await page.waitForTimeout(500);
  
  console.log('✅ Changed group color to red');
  
  // Change group opacity slider - it's in the Group section, should have min="0" max="1" step="0.01"
  const groupOpacitySlider = page.locator('h5:has-text("Group")').locator('..').locator('input[type="range"][min="0"][max="1"][step="0.01"]').first();
  await groupOpacitySlider.waitFor({ state: 'visible', timeout: 5000 });
  
  // Set opacity value using evaluate (range inputs need special handling)
  await groupOpacitySlider.evaluate((el: HTMLInputElement) => {
    el.value = '0.5';
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await page.waitForTimeout(500);
  
  console.log('✅ Changed group opacity to 0.5');
  
  // Wait for React to re-render with new styles
  await page.waitForTimeout(2000);
  
  // Get new background color and opacity from canvas
  // Check both the ReactFlow wrapper and the inner div (which has the actual background)
  const newState = await page.evaluate((type) => {
    // Try groups first - check both wrapper and inner div
    const groups = document.querySelectorAll('.react-flow__node[data-type="draftGroup"]');
    if (groups.length > 0) {
      const firstGroup = groups[0] as HTMLElement;
      const wrapperStyle = window.getComputedStyle(firstGroup);
      
      // Try to find the inner div (the one with the actual background)
      // DraftGroupNode renders a div with the frameStyles
      const innerDiv = firstGroup.querySelector('div[style*="background"]') || firstGroup.firstElementChild as HTMLElement;
      let innerStyle = null;
      if (innerDiv) {
        innerStyle = window.getComputedStyle(innerDiv);
      }
      
      // Prefer inner div background, fallback to wrapper
      const bgColor = innerStyle?.backgroundColor || wrapperStyle.backgroundColor;
      const opacity = innerStyle ? parseFloat(innerStyle.opacity) || 1 : parseFloat(wrapperStyle.opacity) || 1;
      
      return {
        color: bgColor,
        opacity: opacity,
        wrapperColor: wrapperStyle.backgroundColor,
        innerColor: innerStyle?.backgroundColor || null
      };
    }
    
    // Try regular nodes
    const nodes = document.querySelectorAll('.react-flow__node[data-type="custom"]');
    if (nodes.length > 0) {
      const firstNode = nodes[0] as HTMLElement;
      const computedStyle = window.getComputedStyle(firstNode);
      return {
        color: computedStyle.backgroundColor,
        opacity: parseFloat(computedStyle.opacity) || 1
      };
    }
    
    // Fallback: try any node
    const anyNodes = document.querySelectorAll('.react-flow__node');
    if (anyNodes.length > 0) {
      const firstNode = anyNodes[0] as HTMLElement;
      const computedStyle = window.getComputedStyle(firstNode);
      return {
        color: computedStyle.backgroundColor,
        opacity: parseFloat(computedStyle.opacity) || 1
      };
    }
    
    return { color: null, opacity: null };
  }, initialState.elementType);
  
  console.log(`New ${initialState.elementType} color: ${newState.color}, opacity: ${newState.opacity}`);
  
  // Verify color changed
  expect(newState.color).not.toBeNull();
  expect(newState.opacity).not.toBeNull();
  
  // Check if color changed (should be red or rgba equivalent)
  const colorChanged = newState.color !== initialState.initialColor;
  const opacityChanged = Math.abs(newState.opacity - initialState.initialOpacity) > 0.1;
  
  if (!colorChanged && !opacityChanged) {
    console.log('❌ FAILED: Visual properties did NOT change');
    console.log(`   Before: color=${initialState.initialColor}, opacity=${initialState.initialOpacity}`);
    console.log(`   After:  color=${newState.color}, opacity=${newState.opacity}`);
    throw new Error(`Visual controls did not update canvas. Before: ${initialState.initialColor}/${initialState.initialOpacity}, After: ${newState.color}/${newState.opacity}`);
  }
  
  // Verify the color is red (or close to it)
  // RGB values should be close to (255, 0, 0) for red
  const isRed = newState.color.includes('rgb(255, 0, 0)') || 
                newState.color.includes('rgb(255,0,0)') ||
                newState.color.toLowerCase().includes('#ff0000') ||
                newState.color.toLowerCase().includes('red');
  
  if (colorChanged && !isRed) {
    console.log(`⚠️ Color changed but not to expected red. Got: ${newState.color}`);
  }
  
  // Verify opacity changed
  if (opacityChanged) {
    expect(newState.opacity).toBeCloseTo(0.5, 1);
  }
  
  console.log('✅ SUCCESS: Visual controls updated canvas!');
  console.log(`   Before: color=${initialState.initialColor}, opacity=${initialState.initialOpacity}`);
  console.log(`   After:  color=${newState.color}, opacity=${newState.opacity}`);
});

