import { test, expect } from '@playwright/test';
import { getBaseUrl } from '../../test-config.js';

/**
 * Test to verify that LOCK mode persists after page refresh.
 * 
 * Steps:
 * 1. Load complex default architecture (which has groups in LOCK mode)
 * 2. Verify groups have mode='LOCK' in domain graph
 * 3. Verify arrange button is selected (blue) in UI
 * 4. Refresh the page
 * 5. Verify groups still have mode='LOCK' after refresh
 * 6. Verify arrange button is still selected (blue) after refresh
 */
test.describe('LOCK Mode Persistence', () => {
  let BASE_URL: string;

  test.beforeAll(async () => {
    BASE_URL = await getBaseUrl();
  });

  test('LOCK mode should persist after page refresh with loadComplexDefault', async ({ page }) => {
    test.setTimeout(60000);
    
    // Step 1: Navigate to canvas and clear state
    await page.goto(`${BASE_URL}/canvas`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.react-flow__renderer', { timeout: 10000 });
    
    // Clear any existing state
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.waitForTimeout(1000);
    
    // Step 2: Wait for loadComplexDefault to be available
    await page.waitForFunction(() => typeof (window as any).loadComplexDefault === 'function', { timeout: 15000 });
    
    // Step 3: Load complex default diagram
    console.log('🧪 Loading complex default architecture...');
    const loadResult = await page.evaluate(() => {
      if (typeof (window as any).loadComplexDefault === 'function') {
        (window as any).loadComplexDefault();
        return true;
      }
      return false;
    });
    
    expect(loadResult).toBe(true);
    
    // Step 4: Wait for diagram to load (groups and nodes to appear)
    await page.waitForTimeout(5000); // Give ELK time to layout
    
    // Wait for domain graph to have nodes
    await page.waitForFunction(() => {
      const domain = (window as any).getDomainGraph?.() || { children: [] };
      return domain.children && domain.children.length > 0;
    }, { timeout: 20000 });
    
    // Wait for ReactFlow to render - check for any node with data-id
    await page.waitForFunction(() => {
      return document.querySelectorAll('[data-id]').length > 0;
    }, { timeout: 15000 });
    
    await page.waitForTimeout(2000);
    
    // Step 5: Verify groups have mode='LOCK' in domain graph BEFORE refresh
    console.log('🔍 Checking LOCK mode in domain graph before refresh...');
    const beforeRefreshCheck = await page.evaluate(() => {
      const domain = (window as any).getDomainGraph?.() || { children: [] };
      
      const findGroupsWithMode = (node: any, groups: Array<{ id: string; label: string; mode: string }>) => {
        if (node.children && node.children.length > 0) {
          // This is a group
          groups.push({
            id: node.id,
            label: node.labels?.[0]?.text || node.data?.label || node.id,
            mode: node.mode || 'FREE'
          });
        }
        if (node.children) {
          node.children.forEach((child: any) => findGroupsWithMode(child, groups));
        }
      };
      
      const groups: Array<{ id: string; label: string; mode: string }> = [];
      if (domain.children) {
        domain.children.forEach((child: any) => findGroupsWithMode(child, groups));
      }
      
      return {
        totalGroups: groups.length,
        lockGroups: groups.filter(g => g.mode === 'LOCK'),
        freeGroups: groups.filter(g => g.mode === 'FREE'),
        groups: groups
      };
    });
    
    console.log('📊 Groups before refresh:', beforeRefreshCheck);
    expect(beforeRefreshCheck.totalGroups).toBeGreaterThan(0);
    expect(beforeRefreshCheck.lockGroups.length).toBeGreaterThan(0);
    console.log(`✅ Found ${beforeRefreshCheck.lockGroups.length} groups in LOCK mode before refresh`);
    
    // Step 6: Verify arrange button is blue/selected in UI BEFORE refresh
    // The button is only visible when the group is selected, so we need to select it first
    console.log('🔍 Selecting group to check arrange button state in UI before refresh...');
    const firstLockGroupId = beforeRefreshCheck.lockGroups[0].id;
    
    // Select the group by clicking on it (using evaluate to avoid edge interception issues)
    await page.evaluate((groupId) => {
      const group = document.querySelector(`[data-id="${groupId}"]`);
      if (group) {
        (group as HTMLElement).click();
      }
    }, firstLockGroupId);
    await page.waitForTimeout(1000); // Wait for selection to register
    
    const uiButtonStateBefore = await page.evaluate((groupId) => {
      const group = document.querySelector(`[data-id="${groupId}"]`);
      if (!group) return { found: false, buttons: [] };
      
      // Find all buttons in the group (should include arrange button when selected)
      const buttons = Array.from(group.querySelectorAll('button'));
      const buttonStates = buttons.map((button, index) => {
        const style = window.getComputedStyle(button);
        const bgColor = style.backgroundColor;
        // Check if button is blue (LOCK mode) - rgb(66, 133, 244) or #4285F4
        const isBlue = bgColor.includes('66') && bgColor.includes('133') && bgColor.includes('244') ||
                      bgColor === 'rgb(66, 133, 244)' || bgColor === '#4285F4';
        
        // Also check if it has the LayoutPanelLeft icon (arrange button)
        const hasLayoutIcon = button.querySelector('svg') !== null;
        
        return {
          index,
          backgroundColor: bgColor,
          isBlue,
          hasLayoutIcon,
          isArrangeButton: isBlue && hasLayoutIcon
        };
      });
      
      return {
        found: true,
        buttons: buttonStates,
        hasBlueArrangeButton: buttonStates.some(b => b.isArrangeButton)
      };
    }, firstLockGroupId);
    
    console.log('🎨 UI button state before refresh:', uiButtonStateBefore);
    
    // CRITICAL TEST: Arrange button should be blue if mode is LOCK
    const nodeDataCheck = await page.evaluate((groupId) => {
      const reactFlowNode = (window as any).__reactFlowInstance?.getNode(groupId);
      const group = document.querySelector(`[data-id="${groupId}"]`);
      const buttons = group ? Array.from(group.querySelectorAll('button')) : [];
      const arrangeButton = buttons.find((btn: any) => {
        const svg = btn.querySelector('svg');
        return svg !== null;
      });
      
      // Check what the button style actually is
      const buttonStyle = arrangeButton ? (arrangeButton as HTMLElement).style : null;
      const computedStyle = arrangeButton ? window.getComputedStyle(arrangeButton) : null;
      
      // Check if isLockFromData would be true
      const dataMode = reactFlowNode?.data?.mode || null;
      const isLockFromData = dataMode === 'LOCK';
      
      return {
        found: true,
        nodeData: reactFlowNode?.data || null,
        hasMode: !!reactFlowNode?.data?.mode,
        mode: reactFlowNode?.data?.mode || null,
        isLockFromData: isLockFromData,
        arrangeButtonFound: !!arrangeButton,
        arrangeButtonStyle: computedStyle?.backgroundColor || null,
        arrangeButtonInlineStyle: buttonStyle?.background || buttonStyle?.backgroundColor || null,
        buttonStyleObject: buttonStyle ? {
          background: buttonStyle.background,
          backgroundColor: buttonStyle.backgroundColor,
          all: Array.from(buttonStyle).reduce((acc: any, prop: string) => {
            acc[prop] = buttonStyle.getPropertyValue(prop);
            return acc;
          }, {})
        } : null
      };
    }, firstLockGroupId);
    
    console.log('📊 Node data check:', nodeDataCheck);
    console.log('📊 Button states:', uiButtonStateBefore);
    
    // CRITICAL: The button should be blue when mode is LOCK
    if (!uiButtonStateBefore.hasBlueArrangeButton) {
      console.error('❌ Arrange button is NOT blue even though group has mode=LOCK in domain graph!');
      console.error('   This indicates the UI is not syncing with the domain graph mode.');
      console.error('   Node data.mode:', nodeDataCheck.mode);
      console.error('   Button computed background:', nodeDataCheck.arrangeButtonStyle);
      console.error('   Button inline style:', nodeDataCheck.arrangeButtonInlineStyle);
    }
    expect(uiButtonStateBefore.hasBlueArrangeButton).toBe(true);
    console.log(`✅ Found blue arrange button in UI before refresh`);
    
    // Step 7: Refresh the page
    console.log('🔄 Refreshing page...');
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.react-flow__renderer', { timeout: 10000 });
    await page.waitForTimeout(5000); // Wait for restoration and ELK layout
    
    // Step 8: Verify groups still have mode='LOCK' in domain graph AFTER refresh
    console.log('🔍 Checking LOCK mode in domain graph after refresh...');
    const afterRefreshCheck = await page.evaluate(() => {
      const domain = (window as any).getDomainGraph?.() || { children: [] };
      
      const findGroupsWithMode = (node: any, groups: Array<{ id: string; label: string; mode: string }>) => {
        if (node.children && node.children.length > 0) {
          // This is a group
          groups.push({
            id: node.id,
            label: node.labels?.[0]?.text || node.data?.label || node.id,
            mode: node.mode || 'FREE'
          });
        }
        if (node.children) {
          node.children.forEach((child: any) => findGroupsWithMode(child, groups));
        }
      };
      
      const groups: Array<{ id: string; label: string; mode: string }> = [];
      if (domain.children) {
        domain.children.forEach((child: any) => findGroupsWithMode(child, groups));
      }
      
      return {
        totalGroups: groups.length,
        lockGroups: groups.filter(g => g.mode === 'LOCK'),
        freeGroups: groups.filter(g => g.mode === 'FREE'),
        groups: groups
      };
    });
    
    console.log('📊 Groups after refresh:', afterRefreshCheck);
    expect(afterRefreshCheck.totalGroups).toBeGreaterThan(0);
    
    // CRITICAL: Verify LOCK mode persisted
    expect(afterRefreshCheck.lockGroups.length).toBeGreaterThan(0);
    console.log(`✅ Found ${afterRefreshCheck.lockGroups.length} groups in LOCK mode after refresh`);
    
    // Verify the same groups that were LOCK before are still LOCK after
    const beforeLockIds = new Set(beforeRefreshCheck.lockGroups.map(g => g.id));
    const afterLockIds = new Set(afterRefreshCheck.lockGroups.map(g => g.id));
    
    const missingLockModes = beforeRefreshCheck.lockGroups.filter(g => !afterLockIds.has(g.id));
    if (missingLockModes.length > 0) {
      console.error('❌ Groups that lost LOCK mode:', missingLockModes);
    }
    
    expect(missingLockModes.length).toBe(0);
    console.log('✅ All groups that were LOCK before refresh are still LOCK after refresh');
    
    // Step 9: Verify the specific group we tracked still has LOCK mode in domain
    const firstGroupAfterRefresh = afterRefreshCheck.lockGroups.find(g => g.id === firstLockGroupId);
    expect(firstGroupAfterRefresh).toBeDefined();
    expect(firstGroupAfterRefresh?.mode).toBe('LOCK');
    console.log(`✅ Verified group ${firstLockGroupId} still has mode='LOCK' in domain after refresh`);
    
    // Step 10: Verify arrange button is STILL blue/selected in UI AFTER refresh
    // Select the group again to make the button visible
    console.log('🔍 Selecting group again to check arrange button state after refresh...');
    await page.waitForSelector(`[data-id="${firstLockGroupId}"]`, { timeout: 10000 });
    await page.waitForTimeout(2000); // Wait for UI to render
    
    // Select the group
    await page.evaluate((groupId) => {
      const group = document.querySelector(`[data-id="${groupId}"]`);
      if (group) {
        (group as HTMLElement).click();
      }
    }, firstLockGroupId);
    await page.waitForTimeout(1000); // Wait for selection to register
    
    const uiButtonStateAfter = await page.evaluate((groupId) => {
      const group = document.querySelector(`[data-id="${groupId}"]`);
      if (!group) return { found: false, buttons: [] };
      
      // Find all buttons in the group
      const buttons = Array.from(group.querySelectorAll('button'));
      const buttonStates = buttons.map((button, index) => {
        const style = window.getComputedStyle(button);
        const bgColor = style.backgroundColor;
        // Check if button is blue (LOCK mode) - rgb(66, 133, 244) or #4285F4
        const isBlue = bgColor.includes('66') && bgColor.includes('133') && bgColor.includes('244') ||
                      bgColor === 'rgb(66, 133, 244)' || bgColor === '#4285F4';
        
        // Also check if it has the LayoutPanelLeft icon (arrange button)
        const hasLayoutIcon = button.querySelector('svg') !== null;
        
        return {
          index,
          backgroundColor: bgColor,
          isBlue,
          hasLayoutIcon,
          isArrangeButton: isBlue && hasLayoutIcon
        };
      });
      
      return {
        found: true,
        buttons: buttonStates,
        hasBlueArrangeButton: buttonStates.some(b => b.isArrangeButton)
      };
    }, firstLockGroupId);
    
    console.log('🎨 UI button state after refresh:', uiButtonStateAfter);
    
    // CRITICAL TEST: Arrange button should STILL be blue after refresh
    if (!uiButtonStateAfter.hasBlueArrangeButton) {
      console.error('❌ Arrange button is NOT blue after refresh even though group has mode=LOCK in domain graph!');
      console.error('   This indicates the UI is not syncing with the persisted domain graph mode.');
    }
    expect(uiButtonStateAfter.hasBlueArrangeButton).toBe(true);
    console.log(`✅ Found blue arrange button in UI after refresh`);
    
    console.log('✅ Test complete - mode persistence verified in both domain graph AND UI');
  });
});

