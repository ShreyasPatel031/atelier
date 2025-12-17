import { test, expect } from '@playwright/test';

/**
 * Icon Fallback Test
 * 
 * This test verifies that when the agent provides an icon that doesn't exist,
 * the icon fallback service should find the nearest match 100% of the time.
 * 
 * KNOWN EDGE CASES:
 * - mobile_client: From loadComplexDefault(), non-prefixed icon that must find fallback
 *   
 *   ROOT CAUSE ANALYSIS:
 *   When mobile_client fails to find a fallback, the likely causes are:
 *   1. Embedding API failure: The /api/embed endpoint call fails (network error, timeout, or API unavailable)
 *      - Location: iconFallbackService.ts line 104-108
 *      - Impact: If getEmbedding() returns null, findFallbackIcon() immediately returns null
 *      - Solution: Should fallback to using precomputed embeddings or handle API failures more gracefully
 *   
 *   2. Fallback icon doesn't exist: The found fallback icon (e.g., console_mobile_application) doesn't actually exist as a file
 *      - Location: iconFallbackService.ts verifyIconExists() method
 *      - Impact: Even if similarity match is found, if icon file doesn't exist, fallback fails
 *   
 *   3. Timing issue: iconFallbackService.precomputedData not loaded when findFallbackIcon is called
 *      - Location: iconFallbackService.ts line 77-83
 *      - Impact: If precomputed data isn't ready, function returns null
 */
test.describe('Icon Fallback Service', () => {
  test('should display icon for mobile_client node after loadComplexDefault', async ({ page }) => {
    // Navigate to the application
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    
    // Capture console logs and network requests
    const consoleMessages: string[] = [];
    const networkRequests: Array<{url: string, status: number, error?: string}> = [];
    
    page.on('console', msg => {
      const text = msg.text();
      // Capture more logs
      if (text.includes('IconFallback') || text.includes('embed') || text.includes('mobile_client') || 
          text.includes('CustomNode') || text.includes('icon') || text.includes('fallback')) {
        consoleMessages.push(`[${msg.type()}] ${text}`);
      }
    });
    
    page.on('response', response => {
      if (response.url().includes('/api/embed')) {
        networkRequests.push({
          url: response.url(),
          status: response.status()
        });
      }
    });
    
    page.on('requestfailed', request => {
      if (request.url().includes('/api/embed')) {
        networkRequests.push({
          url: request.url(),
          status: 0,
          error: request.failure()?.errorText || 'Request failed'
        });
      }
    });
    
    // Load the complex default architecture
    await page.evaluate(() => {
      if ((window as any).loadComplexDefault) {
        (window as any).loadComplexDefault();
      } else {
        throw new Error('loadComplexDefault not available');
      }
    });
    
    // Wait for the canvas to load and nodes to appear - wait for ReactFlow nodes
    await page.waitForSelector('.react-flow__node', { timeout: 15000 });
    await page.waitForTimeout(3000); // Additional wait for icons to load
    
    // Log captured messages
    console.log('\n📋 Console logs related to icon fallback:');
    consoleMessages.forEach(msg => console.log(`   ${msg}`));
    
    console.log('\n🌐 Network requests to /api/embed:');
    networkRequests.forEach(req => {
      console.log(`   ${req.url} - Status: ${req.status}${req.error ? ` - Error: ${req.error}` : ''}`);
    });
    
    // Wait for the mobile_client node to appear
    const mobileClientNode = page.locator('[data-id="mobile_client"]');
    await expect(mobileClientNode).toBeVisible({ timeout: 15000 });
    
    // Check if the node has an icon (not the missing icon indicator)
    const missingIconIndicator = mobileClientNode.locator('text="❌ MISSING ICON"');
    const missingIconCount = await missingIconIndicator.count();
    
    // Check if there's an actual icon image in the node
    // Icons can be in different places - try multiple selectors
    const iconImage = mobileClientNode.locator('img[src*="icon"], img[src*="canvas"], img[src*=".png"], img[src*=".svg"]');
    const iconImageCount = await iconImage.count();
    
    // Also check for any img tag as fallback
    const anyImg = mobileClientNode.locator('img');
    const anyImgCount = await anyImg.count();
    
    // Get node HTML for debugging
    const nodeHTML = await mobileClientNode.innerHTML();
    const hasIconInHTML = nodeHTML.includes('img') && !nodeHTML.includes('❌ MISSING ICON');
    
    // Check what the actual node state is
    const nodeState = await page.evaluate(() => {
      const node = document.querySelector('[data-id="mobile_client"]');
      if (!node) return { found: false };
      
      // Try to access React component state if possible
      const reactKey = Object.keys(node).find(key => key.startsWith('__react'));
      const reactInstance = reactKey ? (node as any)[reactKey] : null;
      
      // Get all img tags and their src
      const imgs = node.querySelectorAll('img');
      const imgSources = Array.from(imgs).map((img: any) => ({
        src: img.src,
        complete: img.complete,
        naturalWidth: img.naturalWidth,
        naturalHeight: img.naturalHeight
      }));
      
      return {
        found: true,
        innerHTML: node.innerHTML.substring(0, 500),
        imgSources,
        hasFinalIconSrc: node.innerHTML.includes('finalIconSrc') || false
      };
    });
    
    console.log(`\n📊 mobile_client node check:`);
    console.log(`   - Missing icon indicator: ${missingIconCount}`);
    console.log(`   - Icon images (specific): ${iconImageCount}`);
    console.log(`   - Any img tags: ${anyImgCount}`);
    console.log(`   - Has icon in HTML: ${hasIconInHTML}`);
    console.log(`   - Node state:`, JSON.stringify(nodeState, null, 2));
    
    // Test should fail if:
    // 1. Missing icon indicator is present, OR
    // 2. No icon image is found
    if (missingIconCount > 0) {
      throw new Error(`❌ mobile_client node shows "❌ MISSING ICON" - icon fallback failed!`);
    }
    
    if (iconImageCount === 0 && anyImgCount === 0) {
      throw new Error(`❌ mobile_client node has no icon image - icon fallback failed! Icon should be displayed but none found.`);
    }
    
    console.log(`✅ mobile_client node has a valid icon displayed`);
  });
  
  test('should find fallback icons for missing icons 100% of the time', async ({ page }) => {
    // Navigate to the application
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    
    // Test cases: icons that definitely don't exist
    // These should be icons the agent might provide that don't actually exist as files
    const testCases = [
      'gcp_instance_group',        // Missing icon that triggered this feature
      'gcp_kubernetes_cluster',    // Another potentially missing icon
      'aws_invalid_service',       // AWS test case
      'azure_some_service',        // Azure test case
      'gcp_compute_instances',     // Another GCP test case
      'nonexistent_service',       // Definitely missing
      'database_cluster',          // Generic term
      'load_balancer',             // Another generic term
      'gcp_fake_icon_123',         // Definitely fake
      'aws_made_up_service',       // Definitely fake
      'gcp_serverless_function',   // Might not exist
      'aws_lambda_function',       // Might not exist
      'azure_function_app',        // Might not exist
      'mobile_client',             // EDGE CASE: From loadComplexDefault() - non-prefixed icon that should find fallback
                                   // ROOT CAUSE: If /api/embed fails (line 104), getEmbedding() returns null, 
                                   // and findFallbackIcon() immediately returns null (line 105-108) with no fallback mechanism
    ];
    
    console.log('🧪 Testing Icon Fallback Service...');
    console.log(`📋 Test cases: ${testCases.length}`);
    
    // Wait for the page to fully load and modules to be available
    await page.waitForTimeout(3000);
    
    // Run the comprehensive test that also verifies fallbacks actually load
    // Use the exposed testIconFallback function which tests the complete pipeline
    const results = await page.evaluate(async (testCases) => {
      // Wait for testIconFallback to be available
      let testIconFallbackFn: any = null;
      let attempts = 0;
      while (attempts < 10 && !testIconFallbackFn) {
        if ((window as any).testIconFallback) {
          testIconFallbackFn = (window as any).testIconFallback;
          break;
        }
        await new Promise(resolve => setTimeout(resolve, 500));
        attempts++;
      }
      
      if (!testIconFallbackFn) {
        return { 
          passed: 0, 
          failed: testCases.length, 
          details: testCases.map((icon: string) => ({ 
            icon, 
            hasFallback: false, 
            error: 'testIconFallback function not available' 
          })),
          error: 'testIconFallback not available on window'
        };
      }
      
      // Use testSingleIcon which just tests if fallback is found
      // This matches what the user wants to test - whether fallback finds a match
      let passedTests = 0;
      let failedTests = 0;
      const details: Array<{ icon: string; hasFallback: boolean; fallback?: string; error?: string }> = [];
      
      // Use testSingleIcon if available, otherwise try to access iconFallbackService directly
      let testSingleIconFn: any = null;
      if ((window as any).testSingleIcon) {
        testSingleIconFn = (window as any).testSingleIcon;
      }
      
      for (const testIcon of testCases) {
        try {
          let fallback: string | null = null;
          
          if (testSingleIconFn) {
            fallback = await testSingleIconFn(testIcon);
          } else {
            // Try to access iconFallbackService from window (might not be exposed)
            if ((window as any).iconFallbackService) {
              fallback = await (window as any).iconFallbackService.findFallbackIcon(testIcon);
            } else {
              details.push({ icon: testIcon, hasFallback: false, error: 'iconFallbackService not accessible' });
              failedTests++;
              continue;
            }
          }
          
          if (fallback) {
            passedTests++;
            details.push({ icon: testIcon, hasFallback: true, fallback });
          } else {
            failedTests++;
            details.push({ icon: testIcon, hasFallback: false, error: 'No fallback returned (null)' });
          }
        } catch (error: any) {
          failedTests++;
          details.push({ icon: testIcon, hasFallback: false, error: error?.message || String(error) });
        }
      }
      
      return { passed: passedTests, failed: failedTests, details };
    }, testCases);
    
    // Check if there was an error accessing the service
    if (results.error) {
      console.log(`\n⚠️ Error: ${results.error}`);
      console.log('   This might mean test functions are not loaded');
    }
    
    console.log('\n🎯 Icon Fallback Test Results:');
    console.log(`   ✅ Passed: ${results.passed}`);
    console.log(`   ❌ Failed: ${results.failed}`);
    console.log(`   📊 Success Rate: ${Math.round((results.passed / (results.passed + results.failed)) * 100)}%`);
    
    if (results.details) {
      console.log('\n📝 Detailed Results:');
      results.details.forEach((detail: any) => {
        if (detail.hasFallback) {
          console.log(`   ✅ ${detail.icon} → ${detail.fallback}`);
        } else {
          console.log(`   ❌ ${detail.icon} → NO FALLBACK FOUND${detail.error ? ` (${detail.error})` : ''}`);
        }
      });
      
      // Highlight edge case failures - icons from loadComplexDefault that are known to have issues
      const edgeCases = ['mobile_client'];
      const failedEdgeCases = results.details.filter((d: any) => 
        !d.hasFallback && edgeCases.includes(d.icon)
      );
      if (failedEdgeCases.length > 0) {
        console.log('\n⚠️  EDGE CASE FAILURES:');
        failedEdgeCases.forEach((d: any) => {
          console.log(`   ❌ ${d.icon} - This icon from loadComplexDefault() is not finding a fallback!`);
          console.log(`      This is a known edge case where icon fallback should always work but is currently failing.`);
          if (d.error) {
            console.log(`      Error: ${d.error}`);
          }
        });
      }
      
      // Also highlight successful edge cases for reference
      const successfulEdgeCases = results.details.filter((d: any) => 
        d.hasFallback && edgeCases.includes(d.icon)
      );
      if (successfulEdgeCases.length > 0) {
        console.log('\n✅ EDGE CASES (from loadComplexDefault):');
        successfulEdgeCases.forEach((d: any) => {
          console.log(`   ✅ ${d.icon} → ${d.fallback}`);
        });
      }
    }
    
    // The test should fail if not all icons have fallbacks
    // Expecting 100% success rate
    const totalTests = results.passed + results.failed;
    const successRate = totalTests > 0 ? (results.passed / totalTests) * 100 : 0;
    
    console.log(`\n📊 Final Success Rate: ${successRate.toFixed(1)}%`);
    
    // Fail the test if success rate is less than 100%
    if (successRate < 100) {
      console.log(`\n❌ TEST FAILED: Icon fallback is not working 100% of the time`);
      console.log(`   Expected: 100% success rate`);
      console.log(`   Actual: ${successRate.toFixed(1)}% success rate`);
      
      // List failed icons
      if (results.details) {
        const failedIcons = results.details.filter((d: any) => !d.hasFallback);
        if (failedIcons.length > 0) {
          console.log(`\n   Failed icons:`);
          failedIcons.forEach((d: any) => {
            console.log(`     - ${d.icon}`);
          });
        }
      }
    }
    
    expect(successRate).toBe(100);
  });
});

