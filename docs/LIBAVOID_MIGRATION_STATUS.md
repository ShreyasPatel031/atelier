# Libavoid Routing Migration Status

## Completed ✅

1. **BatchRoutingCoordinator** - Copied from edge-routing branch
   - Location: `client/lib/BatchRoutingCoordinator.ts`
   - Manages batch routing for libavoid

2. **EdgeRoutingContext** - Created new context
   - Location: `client/contexts/EdgeRoutingContext.tsx`
   - Provides rawGraph and viewState to StepEdge for mode detection

3. **edgeRoutingMode utility** - Created mode detection
   - Location: `client/utils/edgeRoutingMode.ts`
   - Function: `getEdgeRoutingMode()` - determines ELK vs libavoid routing

4. **ViewModeContext** - Added libavoid configuration
   - Added `LibavoidOptions` interface
   - Added `libavoidDefaults` to all view modes
   - Configuration: `idealNudgingDistance: 16` (matches `portEdgeSpacing: 16`)

## In Progress 🚧

5. **StepEdge Component** - Needs mode-aware routing
   - Current: Simple ELK bendPoints implementation
   - Needed: Hybrid routing (ELK for LOCK/AI, libavoid for FREE)

6. **InteractiveCanvas** - Needs EdgeRoutingProvider wrapper
   - Pass rawGraph and viewState to context

## Pending ⏳

7. **Install libavoid-js package**
   - Add to `package.json` dependencies
   - Run `npm install`

8. **Copy libavoid.wasm**
   - Copy from edge-routing branch to `public/` folder

9. **Update edge creation logic**
   - Ensure edges created in FREE mode use libavoid
   - Ensure edges created in LOCK mode or by AI use ELK

10. **Testing**
    - Test FREE mode: Create edge by dragging → should use libavoid
    - Test LOCK mode: Create edge in locked group → should use ELK
    - Test AI: AI creates edge → should use ELK

## Next Steps

1. Install libavoid-js: `npm install libavoid-js@^0.4.5`
2. Copy libavoid.wasm to public folder
3. Modify StepEdge to:
   - Use EdgeRoutingContext to get rawGraph/viewState
   - Detect routing mode using `getEdgeRoutingMode()`
   - If ELK mode: Use existing ELK bendPoints logic
   - If libavoid mode: Use libavoid routing (copy from edge-routing branch)
4. Wrap InteractiveCanvas with EdgeRoutingProvider
5. Test both modes



