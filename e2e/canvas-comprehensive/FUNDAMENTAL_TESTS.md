# Fundamental Tests

## Overview

Fundamental tests verify the most basic operations that all other functionality depends on:
1. **Add Node** - Creates a node and updates the domain graph
2. **Add Group** - Creates a group and updates the domain graph

These tests run **first** and **fail early** to catch core issues before running other tests.

## Test Order

The fundamental tests are placed at the **top** of `core-interactions.spec.ts` (lines 13-164) and will run before all other tests, as Playwright executes tests in file order.

To stop after first failure (fail fast), run:
```bash
npx playwright test --max-failures=1 --project=canvas-core-interactions --grep "FUNDAMENTAL"
```

## What They Test

### 1. FUNDAMENTAL: Add Node

**What it verifies:**
- ✅ Canvas is empty before adding
- ✅ Domain graph is updated with the new node (CRITICAL - fails early if not)
- ✅ ViewState has correct geometry (x, y, w, h)
- ✅ Dimensions are correct (96x96)
- ✅ All layers are in sync (Domain, ViewState, Canvas)

**Early Failure:**
If the domain graph is not updated, the test immediately throws:
```
❌ EARLY FAILURE: Domain graph not updated!
```

### 2. FUNDAMENTAL: Add Group

**What it verifies:**
- ✅ Canvas is empty before adding
- ✅ Domain graph is updated with the new group (CRITICAL - fails early if not)
- ✅ ViewState has correct geometry (x, y, w, h)
- ✅ Dimensions are correct (480x320)
- ✅ All layers are in sync

**Early Failure:**
If the domain graph doesn't contain the group, the test immediately throws:
```
❌ EARLY FAILURE: Domain graph not updated with group!
```

## Why These Are Critical

1. **Domain Graph Updates** - If nodes/groups don't update the domain graph, nothing else works
2. **Early Detection** - Catch core issues immediately, not after running 20 other tests
3. **Foundation** - All other tests depend on these operations working correctly

## Test Structure

```typescript
test('FUNDAMENTAL: Add Node - updates domain graph...', async ({ page }) => {
  // 1. Verify empty canvas
  // 2. Add node
  // 3. CRITICAL: Verify domain graph updated (fail early)
  // 4. Verify ViewState geometry
  // 5. Verify dimensions
  // 6. Verify layer sync
});
```

## Running

Run just the fundamental tests:
```bash
npx playwright test --project=canvas-core-interactions --grep "FUNDAMENTAL"
```

Run all core interaction tests (fundamentals run first):
```bash
npx playwright test --project=canvas-core-interactions
```

## Status

✅ **Both tests are passing** - Domain graph updates are working correctly.

