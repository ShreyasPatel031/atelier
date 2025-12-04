# Core Interactions Test Suite

**Project**: `canvas-core-interactions`  
**File**: `core-interactions.spec.ts`  
**Total Tests**: 9  
**Workers**: 3 (parallel execution)

## Test List

### FUNDAMENTAL TESTS (Must run first)

1. **FUNDAMENTAL: Add Node**
   - Updates domain graph with correct structure and dimensions
   - Verifies ELK domain graph is updated (no x/y coordinates in domain)
   - Verifies ViewState has geometry
   - Verifies layer synchronization

2. **FUNDAMENTAL: Add Group**
   - Updates domain graph with correct structure and dimensions  
   - Verifies group appears in domain with children array
   - Verifies ViewState has group geometry
   - Verifies layer synchronization

### DRAG TESTS

3. **TEST #2: Drag Node Into Group**
   - Node coordinates stable after drag
   - Domain updated (reparent happens)
   - Group size and coordinates stable
   - Reparent happens DURING drag (not on drop)

### CANVAS OPERATIONS

4. **resetCanvas Functionality**
   - Should clear canvas and domain
   - Should persist empty state after refresh

5. **Node Deletion**
   - Should remove nodes from both canvas and domain
   - Verifies no ghost nodes remain

### PERSISTENCE

6. **Persistence Flow**
   - Should persist nodes after refresh
   - Verifies localStorage snapshot contains graph and ViewState

7. **Position Stability**
   - First node should not move when adding second node
   - Verifies coordinates remain stable

### MULTISELECT

8. **Multiselect Delete**
   - Should remove all selected nodes from canvas and domain
   - Verifies multiple nodes deleted correctly

### ARCHITECTURE

9. **URL Architecture**
   - localStorage should take priority over URL parameters
   - Verifies persistence priority rules

---

## Running Tests

```bash
# Run all core tests
PORT=3000 npx playwright test --project=canvas-core-interactions

# Run just fundamental tests
PORT=3000 npx playwright test --project=canvas-core-interactions --grep "FUNDAMENTAL"

# Run with 3 workers (parallel)
PORT=3000 npx playwright test --project=canvas-core-interactions --workers=3
```

---

## Current Status

✅ All 9 tests passing (as of last run)

