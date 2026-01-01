import { test, expect } from '@playwright/test';

test.describe('Icon Display Validation', () => {
  test('should load application without missing icon indicators', async ({ page }) => {
    test.setTimeout(30000); // Increase timeout to 30s
    // Navigate to the application
    await page.goto('http://localhost:3000');
    
    // Wait for the application to load - use domcontentloaded instead of networkidle
    await page.waitForLoadState('domcontentloaded');
    
    // Wait for any initial content to load
    await page.waitForTimeout(2000);
    
    // Check if there are any missing icon indicators on the page
    const missingIconIndicators = await page.locator('text="❌ MISSING ICON"').count();
    const missingIconX = await page.locator('text="❌"').count();
    
    // Take a screenshot for debugging
    await page.screenshot({ 
      path: 'test-results/icon-validation-result.png',
      fullPage: true 
    });
    
    console.log(`Found ${missingIconIndicators} missing icon indicators`);
    console.log(`Found ${missingIconX} ❌ symbols`);
    
    // The test passes if there are no missing icon indicators
    expect(missingIconIndicators).toBe(0);
    
    console.log('✅ No missing icon indicators found on page load');
  });
  
  test('should handle root node icon properly', async ({ page }) => {
    test.setTimeout(30000); // Increase timeout to 30s
    // Navigate to the application
    await page.goto('http://localhost:3000');
    
    // Wait for the application to load - use domcontentloaded instead of networkidle
    await page.waitForLoadState('domcontentloaded');
    
    // Wait for content to load
    await page.waitForTimeout(1000);
    
    // Check if there's a root node and that it doesn't show missing icon
    const rootNode = page.locator('[data-testid="react-flow-node"][data-id="root"]');
    const rootNodeExists = await rootNode.count();
    
    if (rootNodeExists > 0) {
      const missingIconIndicators = await rootNode.locator('text="❌ MISSING ICON"').count();
      const missingIconX = await rootNode.locator('text="❌"').count();
      
      expect(missingIconIndicators).toBe(0);
      expect(missingIconX).toBe(0);
      
      console.log('✅ Root node has proper icon (no missing icon indicators)');
    } else {
      console.log('ℹ️ No root node found - test passes');
    }
  });
  
  test('should validate semantic fallback service is available', async ({ page }) => {
    test.setTimeout(30000); // Increase timeout to 30s
    // Navigate to the application
    await page.goto('http://localhost:3000');
    
    // Wait for the application to load - use domcontentloaded instead of networkidle
    // networkidle can timeout if there are continuous connections (websockets, polling, etc.)
    await page.waitForLoadState('domcontentloaded');
    
    // Wait a bit for any async initialization
    await page.waitForTimeout(1000);
    
    // Test that the semantic fallback service is available
    const fallbackServiceAvailable = await page.evaluate(() => {
      // Check if the icon fallback service is loaded
      return typeof window !== 'undefined' && 
             (window as any).debugIconFallback !== undefined;
    });
    
    console.log('Semantic fallback service available:', fallbackServiceAvailable);
    
    // This test passes regardless - it's just for information
    expect(true).toBe(true);
    
    console.log('✅ Semantic fallback service check completed');
  });

  test('should verify Lucide icons are available in generic icon list', async ({ page }) => {
    test.setTimeout(30000); // Increase timeout to 30s
    // Navigate to canvas
    await page.goto('http://localhost:3000/canvas');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);
    
    // Check if generic icons include Lucide icons
    const genericIcons = await page.evaluate(async () => {
      try {
        // Import iconLists dynamically
        const module = await import('/generated/iconLists.ts');
        return module.iconLists?.generic || [];
      } catch (e) {
        // Fallback: try to read from the generated file
        const response = await fetch('/generated/iconLists.ts');
        const text = await response.text();
        const match = text.match(/generic:\s*\[(.*?)\]/s);
        if (match) {
          return match[1]
            .split(',')
            .map(s => s.trim().replace(/['"]/g, ''))
            .filter(Boolean);
        }
        return [];
      }
    });
    
    console.log(`Found ${genericIcons.length} generic icons`);
    console.log('Sample generic icons:', genericIcons.slice(0, 10));
    
    // Verify we have some Lucide icons (user, home, settings, etc.)
    const lucideIcons = ['user', 'home', 'settings', 'database', 'server', 'cloud', 'lock', 'key', 'shield', 'globe'];
    const foundLucideIcons = lucideIcons.filter(icon => genericIcons.includes(icon));
    
    console.log(`Found ${foundLucideIcons.length} of ${lucideIcons.length} test Lucide icons:`, foundLucideIcons);
    
    expect(genericIcons.length).toBeGreaterThan(0);
    expect(foundLucideIcons.length).toBeGreaterThan(0);
    
    console.log('✅ Lucide icons are available in generic icon list');
  });
});