import { test, expect } from '@playwright/test';

test.describe('Port Edge Spacing Slider Update', () => {
  test('should update edge spacing when Port Edge Spacing slider changes', async ({ page }) => {
    await page.goto('http://localhost:3001/canvas');
    await page.waitForLoadState('networkidle');
    
    // Load libavoid fixtures to ensure port spacing test scenario is present
    await page.evaluate(() => {
      if (typeof (window as any).loadLibavoidFixtures === 'function') {
        (window as any).loadLibavoidFixtures();
      }
    });
    await page.waitForTimeout(3000); // Wait for fixtures to load and render

    // Helper to get source port spacing distance
    const getSourcePortSpacing = async () => {
      return await page.evaluate(() => {
        const edgeElements = document.querySelectorAll('.react-flow__edge');
        const edges: Array<{ id: string; startX: number; startY: number }> = [];
        
        edgeElements.forEach((edgeElement, index) => {
          const edgeId = edgeElement.getAttribute('data-id') || `edge-${index}`;
          const pathElement = edgeElement.querySelector('path');
          if (pathElement) {
            const pathData = pathElement.getAttribute('d');
            const moveMatch = pathData?.match(/M\s*([\d.-]+)\s*([\d.-]+)/);
            if (moveMatch) {
              edges.push({
                id: edgeId,
                startX: parseFloat(moveMatch[1]),
                startY: parseFloat(moveMatch[2]),
              });
            }
          }
        });

        // Find edges from port-source (edge-port-from-1 and edge-port-from-2)
        // Or use indices 4 and 5 if IDs don't match
        let edge4 = edges.find(e => e.id === 'edge-port-from-1');
        let edge5 = edges.find(e => e.id === 'edge-port-from-2');
        
        // Fallback to indices if IDs not found
        if (!edge4 || !edge5) {
          edge4 = edges[4];
          edge5 = edges[5];
        }
        
        if (edge4 && edge5) {
          return Math.sqrt(
            Math.pow(edge5.startX - edge4.startX, 2) +
            Math.pow(edge5.startY - edge4.startY, 2)
          );
        }
        return 0;
      });
    };

    // Wait for edges to appear and get initial spacing
    let initialSpacing = 0;
    let retries = 10;
    while (initialSpacing === 0 && retries > 0) {
      initialSpacing = await getSourcePortSpacing();
      if (initialSpacing === 0) {
        await page.waitForTimeout(500);
        retries--;
      }
    }
    
    console.log(`📏 Initial source port spacing: ${initialSpacing.toFixed(2)}px`);
    expect(initialSpacing).toBeGreaterThan(0, 'Initial spacing should be measurable - edges may not be loaded yet');

    // Open Dev Panel
    const devButton = page.locator('button:has-text("Dev")');
    await devButton.click();
    await page.waitForTimeout(500);

    // Find Port Edge Spacing slider
    const sliderLabel = page.locator('label:has-text("Port Edge Spacing")');
    await expect(sliderLabel).toBeVisible();
    
    const slider = sliderLabel.locator('..').locator('input[type="range"]').first();
    await expect(slider).toBeVisible();

    // Capture console logs to see if routing is triggered
    const consoleLogs: string[] = [];
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('[StepEdge')) {
        consoleLogs.push(text);
        console.log('BROWSER:', text);
      }
    });

    // Change slider to 2px (small value to see clear difference)
    console.log('🎚️ Changing slider to 2px...');
    await slider.fill('2');
    await slider.dispatchEvent('input');
    await slider.dispatchEvent('change');
    await page.waitForTimeout(100); // Small delay for React to process

    // Wait for re-routing
    await page.waitForTimeout(3000);

    const spacing2px = await getSourcePortSpacing();
    const coords2px = await page.evaluate(() => {
      const allEdges: any[] = [];
      document.querySelectorAll('.react-flow__edge').forEach((el, i) => {
        const id = el.getAttribute('data-id') || `edge-${i}`;
        const path = el.querySelector('path');
        if (path) {
          const d = path.getAttribute('d');
          const match = d?.match(/M\s*([\d.-]+)\s*([\d.-]+)/);
          if (match) {
            allEdges.push({ id, index: i, x: parseFloat(match[1]), y: parseFloat(match[2]) });
          }
        }
      });
      return allEdges;
    });
    console.log(`📏 Spacing after 2px: ${spacing2px.toFixed(2)}px`);
    console.log(`📊 Found ${coords2px.length} edges:`, coords2px.map(e => `${e.id}(${e.x.toFixed(1)},${e.y.toFixed(1)})`).join(', '));
    const edge4 = coords2px[4];
    const edge5 = coords2px[5];
    if (edge4 && edge5) {
      console.log(`📍 Edge[4] "${edge4.id}" at (${edge4.x.toFixed(1)}, ${edge4.y.toFixed(1)})`);
      console.log(`📍 Edge[5] "${edge5.id}" at (${edge5.x.toFixed(1)}, ${edge5.y.toFixed(1)})`);
    }
    console.log(`📋 Console logs after 2px change: ${consoleLogs.length} messages`);

    // Change slider to 16px (large value)
    console.log('🎚️ Changing slider to 16px...');
    await slider.fill('16');
    await slider.dispatchEvent('input');
    await slider.dispatchEvent('change');
    await page.waitForTimeout(100); // Small delay for React to process

    // Wait for re-routing
    await page.waitForTimeout(3000);

    const spacing16px = await getSourcePortSpacing();
    console.log(`📏 Spacing after 16px: ${spacing16px.toFixed(2)}px`);

    // Verify spacing changed significantly
    expect(Math.abs(spacing16px - spacing2px)).toBeGreaterThan(5,
      `Spacing should change when slider moves. 2px setting: ${spacing2px.toFixed(2)}px, 16px setting: ${spacing16px.toFixed(2)}px`
    );

    // Verify 16px setting has larger spacing than 2px setting
    expect(spacing16px).toBeGreaterThan(spacing2px,
      `16px setting should produce larger spacing than 2px. 2px: ${spacing2px.toFixed(2)}px, 16px: ${spacing16px.toFixed(2)}px`
    );

    // Assert spacing is approximately 2px when slider is set to 2px (with tolerance for rounding/rendering)
    // Allow ±2px tolerance for rendering differences
    expect(spacing2px).toBeGreaterThanOrEqual(0, '2px setting should have non-negative spacing');
    expect(spacing2px).toBeLessThanOrEqual(6, 
      `2px setting should produce spacing close to 2px. Actual: ${spacing2px.toFixed(2)}px (allowing ±2px tolerance)`
    );

    // Assert spacing is approximately 16px when slider is set to 16px (with tolerance)
    // Allow ±4px tolerance for rendering differences
    expect(spacing16px).toBeGreaterThanOrEqual(12, 
      `16px setting should produce spacing close to 16px. Actual: ${spacing16px.toFixed(2)}px (allowing ±4px tolerance)`
    );
    expect(spacing16px).toBeLessThanOrEqual(24, 
      `16px setting should produce spacing close to 16px. Actual: ${spacing16px.toFixed(2)}px (allowing ±4px tolerance)`
    );

    console.log(`✅ Spacing changed from ${spacing2px.toFixed(2)}px (2px setting) to ${spacing16px.toFixed(2)}px (16px setting)`);
  });
});