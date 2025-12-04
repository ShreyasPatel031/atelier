# Missing Fundamental Tests

## Current State

The test suite uses `addNodeToCanvas()` and `addGroupToCanvas()` (if it exists) as **setup helpers**, but there are **NO dedicated tests** for the fundamental operations:

### ❌ Missing Tests:

1. **Add Node Test**
   - Click canvas at (x, y)
   - Verify node appears at **EXACT** snapped coordinates
   - Verify node dimensions are **96x96**
   - Verify node appears in Domain, ViewState, and Canvas
   - Verify coordinates are snapped to 16px grid

2. **Add Group Test**
   - Click canvas at (x, y) with group tool
   - Verify group appears at **EXACT** snapped coordinates
   - Verify group dimensions are **480x320**
   - Verify group appears in Domain, ViewState, and Canvas
   - Verify coordinates are snapped to 16px grid

## What Existing Tests Do

The current tests use `addNodeToCanvas()` for setup but **don't verify**:
- Placement accuracy
- Coordinate snapping
- Dimensions

They only verify:
- Node count increased
- Layer sync (Domain/ViewState/Canvas counts match)
- Basic persistence

## What Should Be Tested

### Test 1: Add Node - Verify Exact Coordinates and Dimensions

```typescript
test('Add Node - node lands at EXACT click position with correct dimensions', async ({ page }) => {
  // Click at specific coordinates
  const clickX = 200;
  const clickY = 300;
  
  await addNodeToCanvas(page, clickX, clickY);
  
  // Get the actual position from ViewState (authoritative)
  const nodeData = await page.evaluate(() => {
    const viewState = (window as any).getViewState?.() || { node: {} };
    const nodeIds = Object.keys(viewState.node || {});
    if (nodeIds.length === 0) return null;
    const firstNodeId = nodeIds[0];
    return {
      id: firstNodeId,
      x: viewState.node[firstNodeId]?.x,
      y: viewState.node[firstNodeId]?.y,
      w: viewState.node[firstNodeId]?.w,
      h: viewState.node[firstNodeId]?.h,
    };
  });
  
  // Convert click position to flow coordinates and snap to grid
  const expectedPos = await page.evaluate((cx, cy) => {
    const rf = (window as any).__reactFlowInstance;
    if (!rf) return { x: 0, y: 0 };
    const flowPos = rf.screenToFlowPosition({ x: cx, y: cy });
    const snap = (v: number) => Math.round(v / 16) * 16;
    const NODE_SIZE = 96;
    const half = NODE_SIZE / 2;
    // Node is centered on click, so subtract half
    return { x: snap(flowPos.x - half), y: snap(flowPos.y - half) };
  }, clickX, clickY);
  
  // Verify exact position (within snap tolerance)
  expect(Math.abs(nodeData.x - expectedPos.x)).toBeLessThan(16);
  expect(Math.abs(nodeData.y - expectedPos.y)).toBeLessThan(16);
  
  // Verify dimensions
  expect(nodeData.w).toBe(96);
  expect(nodeData.h).toBe(96);
  
  // Verify in all layers
  const sync = await verifyLayerSync(page);
  expect(sync.canvasNodes).toBe(1);
  expect(sync.domainNodes).toBe(1);
  expect(sync.viewStateNodes).toBe(1);
});
```

### Test 2: Add Group - Verify Exact Coordinates and Dimensions

```typescript
test('Add Group - group lands at EXACT click position with correct dimensions', async ({ page }) => {
  const clickX = 300;
  const clickY = 400;
  
  // Select group tool
  await page.evaluate(() => {
    (window as any).handleToolSelect('group');
  });
  await page.waitForTimeout(300);
  
  // Click canvas
  const paneLocator = page.locator('.react-flow__pane');
  await paneLocator.click({ position: { x: clickX, y: clickY } });
  await page.waitForTimeout(2000);
  
  // Get group position from ViewState
  const groupData = await page.evaluate(() => {
    const viewState = (window as any).getViewState?.() || { group: {} };
    const groupIds = Object.keys(viewState.group || {});
    if (groupIds.length === 0) return null;
    const firstGroupId = groupIds[0];
    return {
      id: firstGroupId,
      x: viewState.group[firstGroupId]?.x,
      y: viewState.group[firstGroupId]?.y,
      w: viewState.group[firstGroupId]?.w,
      h: viewState.group[firstGroupId]?.h,
    };
  });
  
  // Convert and verify position
  const expectedPos = await page.evaluate((cx, cy) => {
    const rf = (window as any).__reactFlowInstance;
    if (!rf) return { x: 0, y: 0 };
    const flowPos = rf.screenToFlowPosition({ x: cx, y: cy });
    const snap = (v: number) => Math.round(v / 16) * 16;
    const GROUP_WIDTH = 480;
    const GROUP_HEIGHT = 320;
    // Group is centered on click
    return { 
      x: snap(flowPos.x - GROUP_WIDTH / 2), 
      y: snap(flowPos.y - GROUP_HEIGHT / 2) 
    };
  }, clickX, clickY);
  
  // Verify exact position
  expect(Math.abs(groupData.x - expectedPos.x)).toBeLessThan(16);
  expect(Math.abs(groupData.y - expectedPos.y)).toBeLessThan(16);
  
  // Verify dimensions
  expect(groupData.w).toBe(480);
  expect(groupData.h).toBe(320);
});
```

## Why These Are Important

1. **Placement Accuracy** - Users need nodes/groups to land where they click
2. **Coordinate System** - Tests verify screen → flow → ViewState conversion works
3. **Snap-to-Grid** - Ensures coordinates are properly snapped
4. **Dimensions** - Verifies default sizes are correct
5. **Layer Sync** - Ensures Domain/ViewState/Canvas all have the data

## Current Test Gaps

Looking at `core-interactions.spec.ts`:
- ✅ Tests layer sync (counts match)
- ✅ Tests persistence (survives refresh)
- ✅ Tests position stability (doesn't move when adding second)
- ❌ **MISSING**: Tests exact placement coordinates
- ❌ **MISSING**: Tests dimensions
- ❌ **MISSING**: Tests snap-to-grid accuracy

These fundamental tests should be the **first tests** in the suite, as they validate the core interaction that everything else builds on.

