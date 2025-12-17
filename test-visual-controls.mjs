import { chromium } from 'playwright';

async function testVisualControls() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  try {
    console.log('Navigating to canvas page...');
    await page.goto('http://localhost:3000/canvas');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    
    console.log('Waiting for loadComplexDefault to be available...');
    await page.waitForFunction(() => typeof window.loadComplexDefault === 'function', { timeout: 10000 });
    
    console.log('Loading diagram...');
    await page.evaluate(() => {
      window.loadComplexDefault();
    });
    
    console.log('Waiting for groups to appear...');
    await page.waitForSelector('.react-flow__node[data-type="draftGroup"]', { timeout: 15000 }).catch(() => {
      console.log('Groups not found, checking console for errors...');
    });
    
    await page.waitForTimeout(3000);
    
    console.log('Checking for groups...');
    const result = await page.evaluate(() => {
      const groups = document.querySelectorAll('.react-flow__node[data-type="draftGroup"]');
      if (groups.length === 0) return { count: 0, color: null };
      const firstGroup = groups[0];
      return {
        count: groups.length,
        color: window.getComputedStyle(firstGroup).backgroundColor
      };
    });
    
    console.log(`Found ${result.count} groups, initial color: ${result.color}`);
    
    if (result.count === 0) {
      console.log('❌ No groups found');
      return false;
    }
    
    console.log('Setting visual options to red...');
    await page.evaluate(() => {
      if (typeof window.__setVisualOptionsDirect === 'function') {
        window.__setVisualOptionsDirect({
          groupColor: '#ff0000',
          groupOpacity: 0.5,
          nodeColor: '#ffffff',
          nodeOpacity: 1.0,
          edgeColor: '#bbbbbb',
          edgeOpacity: 1.0
        });
      }
      window.dispatchEvent(new CustomEvent('visualOptionsChanged'));
    });
    
    await page.waitForTimeout(2000);
    
    console.log('Checking new color...');
    const newResult = await page.evaluate(() => {
      const groups = document.querySelectorAll('.react-flow__node[data-type="draftGroup"]');
      if (groups.length === 0) return null;
      return window.getComputedStyle(groups[0]).backgroundColor;
    });
    
    console.log(`New color: ${newResult}`);
    
    if (newResult !== result.color) {
      console.log('✅ SUCCESS: Color changed!');
      console.log(`   Before: ${result.color}`);
      console.log(`   After:  ${newResult}`);
      return true;
    } else {
      console.log('❌ FAILED: Color did NOT change');
      console.log(`   Before: ${result.color}`);
      console.log(`   After:  ${newResult}`);
      return false;
    }
  } catch (error) {
    console.error('Test error:', error);
    return false;
  } finally {
    await browser.close();
  }
}

testVisualControls().then(success => {
  process.exit(success ? 0 : 1);
});

