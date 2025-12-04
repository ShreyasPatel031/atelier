# Canvas Interaction Test Suite Overview

## Test Organization

The canvas interaction tests are organized into **5 parallel test projects** within `e2e/canvas-comprehensive/`:

1. **Core Interactions** (`canvas-core-interactions`)
2. **Layer Sync** (`canvas-layer-sync`)
3. **Persistence** (`canvas-persistence`)
4. **Architecture** (`canvas-architecture`)
5. **Drag & Drop** (`canvas-drag`)

These run in parallel for faster execution (see `PARALLEL_EXECUTION.md`).

---

## Test Suites

### 1. Core User Interactions (`core-interactions/core-interactions.spec.ts`)
**6 tests** - Basic canvas functionality

1. **resetCanvas Functionality** - should clear canvas and domain, persist after refresh
2. **Node Deletion** - should remove nodes from both canvas and domain
3. **Persistence Flow** - should persist nodes after refresh
4. **Position Stability** - first node should not move when adding second node
5. **Multiselect Delete** - should remove all selected nodes from canvas and domain
6. **URL Architecture** - localStorage should take priority over URL parameters

---

### 2. Layer Sync (`layer-sync/layer-sync.spec.ts`)
**4 tests** - Synchronization between Domain, ViewState, and Canvas

1. **Domain-Canvas Sync** - node should appear in both canvas and domain
2. **Ghost Node Prevention** - no ghost nodes should remain after deletion
3. **ViewState Cleanup** - ViewState should only contain existing nodes
4. **Double Render Prevention** - should not trigger multiple renders for single action

---

### 3. Persistence Priority (`persistence/persistence.spec.ts`)
**3 tests** - Data persistence and priority handling

1. **localStorage Priority** - should use localStorage over URL/remote sources
2. **resetCanvas Persistence** - should stay empty after resetCanvas and refresh
3. **State Distinction** - should distinguish never used vs user cleared

---

### 4. Architecture Violation (`architecture/architecture.spec.ts`)
**4 tests** - Ensures architectural rules are followed

1. **ELK Hook Bypass** - FREE mode should not involve ELK hook
2. **Restoration Path** - should go through Orchestrator not ELK hook
3. **Responsibility Separation** - restoration logic should be centralized
4. **Mode Storage Location** - Domain should have no mode, ViewState should have modes

---

### 5. Drag & Drop Interactions (`drag/drag.spec.ts`)
**8 tests** - Drag behavior and coordinate handling

1. **Drag Node** - ViewState stores absolute position after drag
2. **STRICT Drag Node Into Group** - node lands at EXACT drop position
3. **Drag Node Out of Group** - preserves absolute position, parent becomes root
4. **Coordinate Round-Trip** - drag then refresh preserves position
5. **Drag Stability** - existing nodes should not move when dragging another
6. **STRICT Multi-Node Refresh Stability** - ALL node positions must be EXACT after refresh
7. **STRICT Group Drag** - children positions must be EXACT relative to group after drag ✅
8. **Group Mode on Reparent** - target group set to FREE when node moved in

---

## Other Canvas Test Files

Located outside the comprehensive suite:

- `e2e/canvas-free-mode-behavior.test.ts` - FREE mode specific behaviors
- `e2e/interactive-canvas-rendering.test.ts` - Canvas rendering tests
- `e2e/actual-canvas-test.test.ts` - Real canvas interaction tests
- `e2e/embed-to-canvas-flow.test.ts` - Embed to canvas transitions
- `e2e/canvas-real-browser.test.ts` - Real browser tests
- `e2e/libavoid-actual-canvas.test.ts` - Edge routing with libavoid

---

## Shared Utilities

All comprehensive tests use `shared-utils.ts` which provides:

- `addNodeToCanvas(page, x, y)` - Adds a node at specific coordinates
- `verifyLayerSync(page)` - Verifies Domain/ViewState/Canvas are in sync
- `verifyPersistence(page)` - Checks persistence after reload
- `checkArchitectureCompliance(page)` - Validates architectural rules
- `setupCleanCanvas(page)` - Ensures clean state before each test
- `findParent(graph, nodeId, parentId)` - Helper for parent lookups

---

## Test Status

### Currently Passing ✅
- **Core Interactions**: All 6 tests
- **Layer Sync**: All 4 tests
- **Persistence**: All 3 tests
- **Architecture**: All 4 tests
- **Drag & Drop**: 3/8 tests passing

### Currently Failing ❌
- **Drag & Drop**: 5/8 tests
  - STRICT Drag Node Into Group
  - Coordinate Round-Trip
  - Drag Stability
  - STRICT Multi-Node Refresh Stability
  - Group Mode on Reparent

---

## Key Architectural Decisions Tested

1. **No ReactFlow Parent-Child System** - All nodes use absolute coordinates
2. **ViewState-First Geometry** - ViewState is source of truth for positions
3. **Domain Structure Only** - Domain graph has no position data
4. **Mode Storage** - FREE/LOCK modes stored in ViewState.layout, not Domain
5. **Orchestrator Pattern** - All mutations go through Orchestrator

---

## Running Tests

```bash
# Run all comprehensive tests in parallel
npx playwright test --project=canvas-core-interactions --project=canvas-layer-sync --project=canvas-persistence --project=canvas-architecture --project=canvas-drag

# Run specific suite
npx playwright test --project=canvas-drag

# Run specific test
npx playwright test --project=canvas-drag --grep "STRICT Group Drag"
```

---

## Test File Locations

```
e2e/canvas-comprehensive/
├── core-interactions/
│   └── core-interactions.spec.ts (6 tests)
├── layer-sync/
│   └── layer-sync.spec.ts (4 tests)
├── persistence/
│   └── persistence.spec.ts (3 tests)
├── architecture/
│   └── architecture.spec.ts (4 tests)
├── drag/
│   └── drag.spec.ts (8 tests)
├── edge-routing/ (separate project)
│   ├── create-edge-between-nodes.test.ts
│   ├── edge-reroute-on-node-move.test.ts
│   ├── edge-routing-interaction.test.ts
│   ├── edge-routing-robustness.test.ts
│   └── edge-routing-unit.test.ts
├── shared-utils.ts
└── PARALLEL_EXECUTION.md
```

---

Last updated: Based on current test structure as of latest changes

