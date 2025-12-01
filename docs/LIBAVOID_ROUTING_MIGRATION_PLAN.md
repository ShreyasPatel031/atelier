# Libavoid Routing Migration Plan

## Goal

Migrate libavoid routing from `edge-routing` branch to `figjam` branch with mode-aware routing:
- **ELK routing**: Used for LOCK mode and AI drawing
- **Libavoid routing**: Used for FREE mode (including drag-created edges)

## Current State

### Edge-Routing Branch (BtybA)
- ✅ Full libavoid StepEdge component with routing
- ✅ Uniform spacing configuration (idealNudgingDistance = portEdgeSpacing = 16px)
- ✅ Immediate routing triggers
- ✅ Batch routing coordinator

### Figjam Branch (eePqA)
- ✅ Simple StepEdge using ELK bendPoints
- ✅ FREE/LOCK mode system in ViewState.layout
- ✅ LCG (Lowest Common Group) algorithm for edge parentage
- ❌ No libavoid routing

## Migration Steps

### Step 1: Copy Libavoid Infrastructure
- [ ] Copy `StepEdge.tsx` from edge-routing branch
- [ ] Copy `BatchRoutingCoordinator.ts` 
- [ ] Copy libavoid configuration from `ViewModeContext.tsx`
- [ ] Ensure libavoid.wasm is available in public folder

### Step 2: Add Mode Detection to StepEdge
- [ ] Add ViewState access to StepEdge (via context or props)
- [ ] Add rawGraph access to compute LCG for edge
- [ ] Create `getEdgeMode()` function:
  ```typescript
  function getEdgeMode(
    edge: Edge,
    rawGraph: RawGraph,
    viewState: ViewState,
    source: 'ai' | 'user'
  ): 'ELK' | 'libavoid' {
    // AI always uses ELK
    if (source === 'ai') return 'ELK';
    
    // Find LCG of edge endpoints
    const lcg = findLCG(rawGraph, [edge.source, edge.target]);
    if (!lcg) return 'libavoid'; // Default to libavoid
    
    // Get mode from ViewState.layout
    const mode = viewState.layout?.[lcg.id]?.mode || 'FREE';
    
    // LOCK uses ELK, FREE uses libavoid
    return mode === 'LOCK' ? 'ELK' : 'libavoid';
  }
  ```

### Step 3: Hybrid StepEdge Implementation
- [ ] Modify StepEdge to check mode before routing
- [ ] If ELK mode: Use existing `data.bendPoints` from ELK
- [ ] If libavoid mode: Use libavoid routing (from edge-routing branch)
- [ ] Fallback: If no mode detected, default to libavoid for FREE mode

### Step 4: Update Edge Creation
- [ ] When edge is created in FREE mode, trigger libavoid routing
- [ ] When edge is created in LOCK mode or by AI, use ELK routing
- [ ] Update `addEdge` mutations to set routing mode in edge data

### Step 5: Update Edge Drag/Update
- [ ] When edge endpoints move in FREE mode, re-route with libavoid
- [ ] When edge endpoints move in LOCK mode, let ELK handle it
- [ ] Ensure immediate routing triggers (from migration guide)

### Step 6: Testing
- [ ] Test FREE mode: Create edge by dragging → should use libavoid
- [ ] Test LOCK mode: Create edge in locked group → should use ELK
- [ ] Test AI: AI creates edge → should use ELK
- [ ] Test uniform spacing in FREE mode (libavoid)
- [ ] Verify no regressions in LOCK mode (ELK)

## Key Files to Modify

1. `client/components/StepEdge.tsx` - Hybrid routing component
2. `client/components/ui/InteractiveCanvas.tsx` - Pass ViewState/rawGraph to edges
3. `client/contexts/ViewModeContext.tsx` - Add libavoid defaults
4. `client/components/graph/mutations.ts` - Update edge creation logic
5. `client/hooks/useElkToReactflowGraphConverter.ts` - Ensure edges get mode info

## Dependencies Needed

- `libavoid-js` package (check if already installed)
- `libavoid.wasm` file in `public/` folder
- `BatchRoutingCoordinator` utility

## Configuration

From edge-routing branch, copy these settings:
```typescript
libavoidDefaults: {
  portEdgeSpacing: 16,
  idealNudgingDistance: 16, // MUST match portEdgeSpacing
  routingType: 'orthogonal',
  hateCrossings: true,
  nudgeSharedPaths: true,
  segmentPenalty: 3,
  bendPenalty: 10,
  crossingPenalty: 100,
  sharedPathPenalty: 100000,
  shapeBufferDistance: 24,
}
```



