# Libavoid Test Architecture Review

## Architecture Differences Between Branches

### Edge-Routing Branch (BtybA)
- **Fixture Loading**: `loadLibavoidFixtures()` function creates 15 nodes and 8 edges with specific IDs
- **URL Parameter**: Uses `?libavoidFixtures=1` to trigger fixture loading
- **Port**: Dev server runs on port 3003
- **Test Approach**: Tests pre-loaded fixtures with known IDs (`libavoid-port-source`, `edge-port-from-1`, etc.)
- **Edge Detection**: Uses `data-testid` with prefix `rf__edge-` to find edges

### Current Branch (eePqA - Figjam)
- **Architecture**: Uses Orchestrator pattern with FREE/LOCK modes
- **Node Creation**: Via `handleAddNode` → `mutate(addNodeWrapper)` → Orchestrator
- **Edge Creation**: Via `onConnect` → `handlers.handleAddEdge` → `mutate(addEdgeWrapper)` → Orchestrator
- **ViewState-First**: Loads from ViewState if available, skips ELK
- **Port**: Dev server runs on port 3001 (default)
- **No Fixtures**: No `loadLibavoidFixtures()` function exists
- **Edge Detection**: Uses `data-id` attribute on edge elements

## Key Components for Testing

### Node Creation Flow
1. User clicks canvas → `handleAddNode` called
2. `handleAddNode` → `mutate(addNodeWrapper, ...)` 
3. Orchestrator processes mutation
4. For FREE mode: Updates ViewState directly (no ELK)
5. For LOCK mode: Runs ELK, then updates ViewState

### Edge Creation Flow
1. User drags from node handle → `onConnect` called
2. `onConnect` → `handlers.handleAddEdge(id, source, target, ...)`
3. `handleAddEdge` → `mutate(addEdgeWrapper, ...)`
4. Orchestrator processes mutation
5. For FREE mode: Edge should use libavoid routing
6. For LOCK mode: Edge should use ELK routing

### Edge Routing Detection
- **ELK Routing**: Edges have `data.bendPoints` from ELK layout
- **Libavoid Routing**: Edges use libavoid routing (no `bendPoints` from ELK)
- **Path Data**: Can extract from `.react-flow__edge-path` SVG element's `d` attribute

## Test Strategy

### Test 1: Create Nodes and Edge (Libavoid Routing)
1. Navigate to canvas
2. Add two nodes programmatically (via `handleAddNode` or direct graph mutation)
3. Create edge between them (via `onConnect` or direct graph mutation)
4. Verify edge is routed with libavoid (check path has routing, not straight line)
5. Verify edge doesn't overlap with nodes

### Test 2: Actual Canvas Test (Adapted)
1. Navigate to canvas
2. Create test nodes and edges programmatically (similar to fixtures)
3. Wait for routing to complete
4. Extract edge paths and verify no overlaps
5. Verify routing quality (edges route around obstacles)

## Implementation Notes

- **FREE Mode**: Default mode, should use libavoid routing
- **Edge Path Extraction**: Use `document.querySelectorAll('.react-flow__edge-path')` and get `d` attribute
- **Node Positions**: Use ReactFlow's internal state or DOM `getBoundingClientRect()`
- **Routing Verification**: Check that path has more than 2 points (straight line = 2 points, routed = more)



