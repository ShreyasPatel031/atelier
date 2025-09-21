import { iconFallbackService } from './iconFallbackService';

/**
 * Test if an icon actually loads in the frontend
 */
async function testIconLoads(iconName: string): Promise<boolean> {
  // Check if it's a general icon (no provider prefix)
  const isGeneral = !iconName.match(/^(aws|gcp|azure)_/);
  
  if (isGeneral) {
    // Try general icon paths
    const paths = [
      `/assets/canvas/${iconName}.png`,
      `/assets/canvas/${iconName}.svg`
    ];
    
    for (const path of paths) {
      const exists = await new Promise<boolean>((resolve) => {
        const img = new Image();
        img.onload = () => resolve(true);
        img.onerror = () => resolve(false);
        img.src = path;
        setTimeout(() => resolve(false), 2000);
      });
      if (exists) return true;
    }
    return false;
  } else {
    // Provider icon - use simple path for testing
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(true);
      img.onerror = () => resolve(false);
      
      // This is simplified - real CustomNode logic is more complex
      const iconPath = `/icons/${iconName.replace('_', '/')}.png`;
      img.src = iconPath;
      
      setTimeout(() => resolve(false), 2000);
    });
  }
}

/**
 * Comprehensive test function that verifies fallbacks actually work in the frontend
 * Call this from console: testIconFallback()
 */
export async function testIconFallback() {
  console.log('🧪 Testing Icon Fallback Service with Frontend Verification...');
  
  const testCases = [
    'gcp_instance_group',        // Missing icon that triggered this feature
    'gcp_kubernetes_cluster',    // Another potentially missing icon
    'aws_invalid_service',       // AWS test case
    'azure_some_service',        // Azure test case
    'gcp_compute_instances',     // Another GCP test case
    'nonexistent_service',       // Definitely missing
    'database_cluster',          // Generic term
    'load_balancer'             // Another generic term
  ];

  let passedTests = 0;
  let failedTests = 0;

  for (const testIcon of testCases) {
    console.log(`\n🔍 Testing: ${testIcon}`);
    
    // First check if original icon exists
    const originalExists = await testIconLoads(testIcon);
    console.log(`   Original icon exists: ${originalExists ? '✅' : '❌'}`);
    
    if (!originalExists) {
      // Test fallback service
      try {
        const fallback = await iconFallbackService.findFallbackIcon(testIcon);
        if (fallback) {
          console.log(`   🔄 Found fallback: ${testIcon} → ${fallback}`);
          
          // Test if fallback actually loads
          const fallbackExists = await testIconLoads(fallback);
          console.log(`   Fallback loads: ${fallbackExists ? '✅' : '❌'}`);
          
          if (fallbackExists) {
            console.log(`   ✅ SUCCESS: ${testIcon} has working fallback`);
            passedTests++;
          } else {
            console.log(`   ❌ FAILED: ${testIcon} fallback doesn't load in frontend`);
            failedTests++;
          }
        } else {
          console.log(`   ❌ FAILED: No fallback found for ${testIcon}`);
          failedTests++;
        }
      } catch (error) {
        console.error(`   💥 ERROR: ${testIcon}:`, error);
        failedTests++;
      }
    } else {
      console.log(`   ✅ SKIP: ${testIcon} original icon works`);
    }
  }
  
  console.log(`\n🎯 Icon Fallback Test Results:`);
  console.log(`   ✅ Passed: ${passedTests}`);
  console.log(`   ❌ Failed: ${failedTests}`);
  console.log(`   📊 Success Rate: ${Math.round((passedTests / (passedTests + failedTests)) * 100)}%`);
  
  return { passed: passedTests, failed: failedTests };
}

/**
 * Quick test for a single icon
 */
export async function testSingleIcon(iconName: string) {
  console.log(`🧪 Testing single icon: ${iconName}`);
  try {
    const fallback = await iconFallbackService.findFallbackIcon(iconName);
    if (fallback) {
      console.log(`✅ Fallback found: ${iconName} → ${fallback}`);
      return fallback;
    } else {
      console.log(`❌ No fallback found for: ${iconName}`);
      return null;
    }
  } catch (error) {
    console.error(`💥 Error:`, error);
    return null;
  }
}

/**
 * Test the complete icon loading pipeline
 */
async function testCompleteIconPipeline(iconName: string) {
  console.log(`\n🔧 COMPLETE PIPELINE TEST: ${iconName}`);
  
  // Step 1: Test semantic fallback
  try {
    const fallback = await iconFallbackService.findFallbackIcon(iconName);
    console.log(`1️⃣ Semantic fallback: ${iconName} → ${fallback || 'NONE'}`);
    
    if (!fallback) {
      console.log(`❌ FAILED: No semantic fallback found`);
      return;
    }
    
    // Step 2: Test icon path construction
    const isGeneral = !fallback.match(/^(aws|gcp|azure)_/);
    let iconPath;
    
    if (isGeneral) {
      // General icon path
      iconPath = `/assets/canvas/${fallback}.png`;
    } else {
      // Provider icon path - need to find category
      const [provider, iconBaseName] = fallback.split('_', 2);
      // This is simplified - real logic is more complex
      iconPath = `/icons/${provider}/compute/${iconBaseName}.png`;
    }
    
    console.log(`2️⃣ Icon path: ${iconPath}`);
    
    // Step 3: Test if icon actually loads
    const iconExists = await testIconLoads(fallback);
    console.log(`3️⃣ Icon loads: ${iconExists ? '✅' : '❌'}`);
    
    if (!iconExists) {
      console.log(`❌ FAILED: Icon path doesn't work`);
      // Try alternative paths
      if (isGeneral) {
        const altPath = `/assets/canvas/${fallback}.svg`;
        console.log(`🔄 Trying SVG: ${altPath}`);
        const svgExists = await new Promise(resolve => {
          const img = new Image();
          img.onload = () => resolve(true);
          img.onerror = () => resolve(false);
          img.src = altPath;
          setTimeout(() => resolve(false), 2000);
        });
        console.log(`   SVG loads: ${svgExists ? '✅' : '❌'}`);
      }
    }
    
  } catch (error) {
    console.error(`💥 Pipeline error:`, error);
  }
}

/**
 * Quick debug test for immediate feedback
 */
export async function debugIconFallback() {
  console.log('🔧 DEBUG: Testing icon fallback service...');
  
  const testCases = ['instance_group', 'database', 'server', 'api'];
  
  for (const testIcon of testCases) {
    await testCompleteIconPipeline(testIcon);
  }
}

// Export to global window for console testing
if (typeof window !== 'undefined') {
  (window as any).testIconFallback = testIconFallback;
  (window as any).testSingleIcon = testSingleIcon;
  (window as any).debugIconFallback = debugIconFallback;
  console.log('🛠️ Icon fallback test functions available:');
  console.log('   testIconFallback() - Full test suite');
  console.log('   testSingleIcon("icon_name") - Test single icon');
  console.log('   debugIconFallback() - Quick debug test');
} 