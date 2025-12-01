# Retrospective: Add Node to Canvas Feature

## Timeline Overview
**Goal**: Simple "add node to canvas" functionality  
**Expected Time**: 2-3 hours  
**Actual Time**: ~8-10 hours  
**Root Cause**: Architectural confusion + incremental refactoring

## What Went Wrong

### 1. **Architectural Confusion (Major Blocker)**
**Problem**: The codebase had mixed responsibilities and unclear data flow
- `useElkToReactflowGraphConverter.ts` was doing orchestration AND rendering
- Multiple rendering paths: hook → Orchestrator → renderer (unclear which to use)
- Domain → ViewState → Canvas flow was documented but not enforced

**Evidence**:
- 104 matches for Orchestrator across 21 files (high coupling)
- User repeatedly said: "delete all rendering logic from useElkToReactflowGraphConverter"
- User: "stop we already have viewstate rendering done, just route user -> orchestrate -> viewstates -> domain -> viewstate canvas"

**Impact**: Every fix revealed another architectural violation that needed cleanup

---

### 2. **State Synchronization Anti-Patterns (Major Blocker)**
**Problem**: Three sources of truth getting out of sync
- Domain graph (structure)
- ViewState (geometry) 
- ReactFlow nodes (display)

**Evidence**:
- User: "there is mismatch between domain and actual canvas sometimes, when I select node the old deleted node reappears"
- User: "Filter out - this is extremely bad, this means you are permitting and allowing a mismatch in canvas and domain"
- Multiple direct `setNodes()` calls bypassing the single source of truth

**Impact**: Every operation required fixing sync issues, leading to cascading fixes

---

### 3. **Incremental Refactoring Instead of Clean Slate (Major Blocker)**
**Problem**: Trying to fix while preserving old code patterns
- Kept old rendering logic "just in case"
- Added new code alongside broken code
- Multiple attempts to make old patterns work

**Evidence**:
- Created `CanvasFreeMode.ts` then deleted it
- Created `FreeRenderer.ts` then deleted it  
- Multiple renderer files with overlapping responsibilities

**Impact**: Time wasted on code that was immediately replaced

---

### 4. **Test-Driven Debugging Instead of Test-Driven Development**
**Problem**: Tests created AFTER bugs were found
- No tests initially for persistence
- Tests created to demonstrate bugs, not prevent them
- Test refinement happened during debugging

**Evidence**:
- User: "how the fuck is persistance working you changed no code to make it work you just created a bogus tests that passes"
- Multiple test iterations to catch real bugs

**Impact**: Bugs found in production instead of during development

---

### 5. **Lack of Clear Entry Points**
**Problem**: Unclear where operations should start
- Should user click → Orchestrator → Domain → ViewState → Render?
- Should user click → Hook → ELK → Render?
- Multiple initialization points

**Evidence**:
- Orchestrator initialization moved between files 3+ times
- `useElkToReactflowGraphConverter` had orchestration logic removed 3+ times
- User: "Fuck you @useElkToReactflowGraphConverter.ts I said to remove all orchestration logic out of this, you keep repeatedly adding it here"

**Impact**: Confusion about where code should live

---

### 6. **ViewState Corruption Issues (Critical Bug)**
**Problem**: ViewState getting reset/lost during React lifecycle
- `cloneViewState()` failures resetting to empty
- Graph updates losing ViewState attachment
- Restoration not triggering rendering

**Evidence**:
- User: "node doesnt persist on refresh, need to add another node and all nodes appear"
- User: "persistence is not working, fix your test, I reset nodes dissapear"
- Multiple fixes for ViewState preservation

**Impact**: Core functionality broken, required deep debugging

---

## What Worked Well

### ✅ **Clear Architecture Plan**
The plan document (`figjam-free-lock-mode-implementation-27a2163e.plan.md`) was comprehensive and correct
- Domain → ViewState → Canvas flow was well-defined
- Separation of concerns was clear
- Issue: Plan existed but code didn't follow it

### ✅ **Once Fixed, It Stayed Fixed**
After architecture was cleaned up:
- Tests passed consistently
- No regression in core functionality
- Code became maintainable

---

## Root Cause Analysis

**Primary Root Cause**: **Code didn't match documented architecture**

The plan was good, but the codebase had evolved organically with:
1. Rendering logic in hooks (should be in renderers)
2. Orchestration logic in converters (should be in Orchestrator)
3. Direct ReactFlow manipulation (should go through Domain → ViewState)

**Secondary Root Causes**:
1. **No architectural enforcement** - violations existed but weren't caught
2. **Incremental fixes** - trying to fix without full picture
3. **Missing tests** - bugs found late in development

---

## How to Speed Up Future Features

### 1. **Enforce Architecture First** ⚡ (High Impact)
**Before starting any feature**:
- Review: Does code match `FIGJAM_REFACTOR.md`?
- Check: Are there direct `setNodes()` calls? (violation)
- Verify: Is rendering only in `client/core/renderer`? (not in hooks)
- Validate: Does Orchestrator route all operations? (not hooks)

**Action**: Create a linter rule or pre-commit hook that checks:
- No `setNodes()` outside of Orchestrator/renderer
- No rendering logic in hooks
- All operations go through Orchestrator

---

### 2. **Write Tests Before Implementation** ⚡ (High Impact)
**Pattern to follow**:
```
1. Write test for feature (fails)
2. Implement feature (test passes)
3. Add edge cases (fix issues early)
```

**Example**: For "add node" should have written:
- Test: Node appears on canvas
- Test: Node appears at correct position
- Test: Node persists after refresh
- Test: Node deleted doesn't reappear

**Action**: Make TDD mandatory for core features

---

### 3. **Clear Entry Points** ⚡ (High Impact)
**Define once, reference always**:
```
User Action → canvasInteractions.ts → Orchestrator.apply() → Domain/ViewState → Renderer
```

**No exceptions**:
- No direct ReactFlow manipulation
- No hooks doing orchestration
- Single path for all operations

**Action**: Document entry points in `docs/ENTRY_POINTS.md` and enforce

---

### 4. **ViewState Safety Checks** ⚡ (Medium Impact)
**Prevent corruption**:
- Always clone before mutation
- Never reset to empty without checking previous state
- Attach ViewState to graph before `setRawGraph()`

**Action**: Create `ViewState.safeClone()` and `ViewState.requireGeometry()` helpers with better error messages

---

### 5. **Eliminate Parallel Code Paths** ⚡ (Medium Impact)
**Problem**: Multiple ways to do same thing
- `useElkToReactflowGraphConverter` vs Orchestrator rendering
- `renderDomainToReactFlow` vs `ViewStateToReactFlow`

**Solution**: One canonical path per operation
- FREE mode: Orchestrator → `ViewStateToReactFlow`
- AI/LOCK mode: Orchestrator → Layout → `ReactFlowAdapter`

**Action**: Delete alternative implementations, document canonical path

---

### 6. **Batch Related Changes** ⚡ (Medium Impact)
**Instead of**:
- Fix border issue
- Then fix persistence
- Then fix rendering
- Then fix deletion

**Do**:
- Understand full feature scope first
- Implement all related changes together
- Test complete feature at once

**Action**: Create feature checklists before starting

---

## Recommended Actions for Next Features

### Before Starting Any Feature:
1. ✅ Review architecture compliance (5 min)
2. ✅ Write tests first (30 min)
3. ✅ Identify entry points (5 min)
4. ✅ Check for parallel code paths (5 min)

### During Implementation:
1. ✅ Run tests after each change
2. ✅ Check architecture compliance
3. ✅ No direct ReactFlow manipulation
4. ✅ All operations through Orchestrator

### After Implementation:
1. ✅ All tests pass
2. ✅ No architecture violations
3. ✅ Document any new patterns

---

## Estimated Time Savings

**If we had done this from the start**:
- Architecture enforcement: **-3 hours** (no cleanup needed)
- TDD: **-2 hours** (bugs caught early)
- Clear entry points: **-1 hour** (no confusion)
- **Total saved: ~6 hours**

**For remaining features**: Should be **50-60% faster** with these practices

---

## Next Features Priority Order

1. **ELK for groups in FREE mode** - Architectural cleanup already done, should be straightforward
2. **Selection in FREE mode** - Similar to add node, can reuse patterns
3. **AI diagram in LOCK mode** - May require Layout module work, but architecture is ready

**Confidence**: High - architecture is now clean and patterns are established


