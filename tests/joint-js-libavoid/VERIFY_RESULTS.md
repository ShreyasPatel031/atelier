# Joint.js Libavoid Test Verification

## Test Setup

1. **Server**: Running at http://localhost:8080
2. **Modified**: `src/ui-thread/app.js` to expose `graph` and `router` for testing
3. **Test**: Verify edge path remains valid when node is dragged

## How to Run Test

### Option 1: Browser Console

1. Open http://localhost:8080
2. Open browser console (F12)
3. Paste and run the test script from `run-test.js`

### Option 2: Playwright

```bash
npx playwright test tests/joint-js-libavoid/playwright-test.js
```

## Expected Results

✅ **PASS**: Edge path remains valid after drag
- Link has vertices OR router set
- Router instance doesn't change
- No "router aborted" errors

❌ **FAIL**: Edge path becomes empty after drag
- Link has no vertices AND no router
- This would match our bug

## Key Observations

1. **Router instance**: Should stay the same (not recreated)
2. **Route validity**: Should always be valid (never empty)
3. **moveShape()**: Should be used instead of router reset
4. **Fallback**: Should use `rightAngle` router if libavoid fails

## Test Results

_To be filled after running test_

