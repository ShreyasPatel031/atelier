import { test, expect } from '@playwright/test';

test.describe('Actual Port Spacing Coordinates', () => {
  test('should have different coordinates for edges from/to same ports', async ({ page }) => {
    // Set up console listener
    page.on('console', (msg) => {
      const text = msg.text();
      if (text.includes('StepEdge') && text.includes('edge-port-from')) {
        console.log(`BROWSER: ${text}`);
      }
    });
    
    // Navigate to actual canvas with the fifth test case
    await page.goto('http://localhost:3001/canvas');
    await page.waitForLoadState('networkidle');
    
    // Wait for canvas to load
    await page.waitForTimeout(3000);
    
    // Extract ALL edge coordinates from the actual DOM
    const edgeAnalysis = await page.evaluate(() => {
      const edgeElements = document.querySelectorAll('.react-flow__edge');
      console.log(`📊 Found ${edgeElements.length} edges on canvas`);
      
      const allEdges: Array<{
        id: string;
        startX: number;
        startY: number;
        endX: number; 
        endY: number;
      }> = [];
      
      edgeElements.forEach((edgeElement, index) => {
        const edgeId = edgeElement.getAttribute('data-id') || `edge-${index}`;
        const pathElement = edgeElement.querySelector('path');
        
        if (pathElement) {
          const pathData = pathElement.getAttribute('d');
          
          // Extract start coordinates (M command)
          const moveMatch = pathData?.match(/M\s*([\d.-]+)\s*([\d.-]+)/);
          // Extract all line coordinates (L commands)
          const lineMatches = [...(pathData?.matchAll(/L\s*([\d.-]+)\s*([\d.-]+)/g) || [])];
          
          const startX = moveMatch ? parseFloat(moveMatch[1]) : 0;
          const startY = moveMatch ? parseFloat(moveMatch[2]) : 0;
          
          // End point is the last L command, or start if no L commands
          let endX = startX;
          let endY = startY;
          if (lineMatches.length > 0) {
            const lastLine = lineMatches[lineMatches.length - 1];
            endX = parseFloat(lastLine[1]);
            endY = parseFloat(lastLine[2]);
          }
          
          allEdges.push({
            id: edgeId,
            startX,
            startY,
            endX,
            endY
          });
          
          console.log(`Edge ${edgeId}: START(${startX}, ${startY}) → END(${endX}, ${endY})`);
        }
      });
      
      return allEdges;
    });
    
    console.log(`\n📊 Found ${edgeAnalysis.length} edges total`);
    
    // Print all coordinates for debugging
    edgeAnalysis.forEach(edge => {
      console.log(`${edge.id}: START(${edge.startX}, ${edge.startY}) → END(${edge.endX}, ${edge.endY})`);
    });
    
    expect(edgeAnalysis.length).toBeGreaterThanOrEqual(8); // Should have 8 edges from fifth test case
    
    // Based on the actual coordinates I found, these are the port edges:
    // Edge-4: START(199.50, 368.00) → END(298.50, 328.00) - FROM Port-Source 
    // Edge-5: START(199.50, 368.00) → END(298.50, 408.00) - FROM Port-Source
    // Edge-6: START(399.50, 328.00) → END(498.50, 368.00) - TO Port-Target  
    // Edge-7: START(399.50, 408.00) → END(498.50, 368.00) - TO Port-Target
    
    // Find edges 4 and 5 (from same source port)
    const edge4 = edgeAnalysis.find(e => e.id === 'edge-4');
    const edge5 = edgeAnalysis.find(e => e.id === 'edge-5');
    
    expect(edge4).toBeDefined();
    expect(edge5).toBeDefined();
    
    if (edge4 && edge5) {
      console.log(`\n🔍 TESTING SOURCE PORT SPACING:`);
      console.log(`Edge-4 START: (${edge4.startX}, ${edge4.startY})`);
      console.log(`Edge-5 START: (${edge5.startX}, ${edge5.startY})`);
      
      const sourceXDistance = Math.abs(edge4.startX - edge5.startX);
      const sourceYDistance = Math.abs(edge4.startY - edge5.startY);
      const sourceTotalDistance = Math.sqrt(sourceXDistance * sourceXDistance + sourceYDistance * sourceYDistance);
      
      console.log(`Source distance: ${sourceTotalDistance.toFixed(3)} pixels`);
      
      // Assert that edges from the same source port have spacing >= 8px (default portEdgeSpacing)
      // This ensures port-level edge spacing is working correctly
      expect(sourceTotalDistance).toBeGreaterThanOrEqual(8, 
        `SOURCE SPACING FAILED: Edge-4 and Edge-5 start points are only ${sourceTotalDistance.toFixed(2)}px apart. Expected at least 8px spacing (default portEdgeSpacing). Edge-4: (${edge4.startX}, ${edge4.startY}), Edge-5: (${edge5.startX}, ${edge5.startY})`
      );
    }
    
    // Find edges 6 and 7 (to same target port)  
    const edge6 = edgeAnalysis.find(e => e.id === 'edge-6');
    const edge7 = edgeAnalysis.find(e => e.id === 'edge-7');
    
    expect(edge6).toBeDefined();
    expect(edge7).toBeDefined();
    
    if (edge6 && edge7) {
      console.log(`\n🔍 TESTING TARGET PORT SPACING:`);
      console.log(`Edge-6 END: (${edge6.endX}, ${edge6.endY})`);
      console.log(`Edge-7 END: (${edge7.endX}, ${edge7.endY})`);
      
      const targetXDistance = Math.abs(edge6.endX - edge7.endX);
      const targetYDistance = Math.abs(edge6.endY - edge7.endY);
      const targetTotalDistance = Math.sqrt(targetXDistance * targetXDistance + targetYDistance * targetYDistance);
      
      console.log(`Target distance: ${targetTotalDistance.toFixed(3)} pixels`);
      
      // Assert that edges to the same target port have spacing >= 8px (default portEdgeSpacing)
      // This ensures port-level edge spacing is working correctly
      expect(targetTotalDistance).toBeGreaterThanOrEqual(8,
        `TARGET SPACING FAILED: Edge-6 and Edge-7 end points are only ${targetTotalDistance.toFixed(2)}px apart. Expected at least 8px spacing (default portEdgeSpacing). Edge-6: (${edge6.endX}, ${edge6.endY}), Edge-7: (${edge7.endX}, ${edge7.endY})`  
      );
    }
  });
});
