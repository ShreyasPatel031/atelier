# LOCK ↔ FREE Mode Transitions Architecture

## Overview

This document defines the complete architectural flow for transitioning groups and edges between LOCK mode (ELK-controlled) and FREE mode (user-controlled with libavoid routing).

## Core Principles

1. **LOCK Mode**: Groups and edges use ELK-computed coordinates. No user interaction allowed.
2. **FREE Mode**: User can drag nodes/groups. Edges reroute dynamically using libavoid.
3. **Mode Transition**: Dragging a LOCK mode group immediately unlocks it and all descendants to FREE mode.
4. **Edge Routing**: When a group goes FREE, all touching edges switch to libavoid routing.

## Component Responsibilities

### 1. InteractiveCanvas.tsx (Thin Coordinator)
**Role**: Detect user interactions and delegate to handlers

```typescript
onNodesChange={(changes) => {
  // 1. Detect position changes for LOCK mode groups
  const draggedLockGroups = detectDraggedLockGroups(changes, nodes);
  
  if (draggedLockGroups.length > 0) {
    // 2. Trigger unlock via Orchestrator
    for (const group of draggedLockGroups) {
      apply({
        kind: 'free-structural',
        source: 'user',
        payload: {
          action: 'unlock-scope-to-free',
          scopeGroupId: group.id,
          reason: 'drag-start'
        }
      });
    }
  }
  
  // 3. Handle group drag - updates ViewState for group and children
  const groupResults = handleGroupDrag(changes, nodes, viewStateRef, rawGraphRef);
  
  // 4. Update ReactFlow nodes with new child positions
  if (groupResults.length > 0) {
    const nodesToUpdate = groupResults.flatMap(r => r.childPositions);
    setNodes(nds => updateNodePositions(nds, nodesToUpdate));
  }
}}
```

**Issues to Fix**:
- [ ] `onNodesChange` isn't receiving position changes during drag
- [ ] Need to ensure ReactFlow's drag handlers are properly attached
- [ ] Child node positions must be updated via `setNodes` to actually move visually

### 2. Orchestrator (Pure Router)
**Role**: Route `unlock-scope-to-free` action to handler

```typescript
case 'unlock-scope-to-free':
  // 1. Call unlockScopeToFree handler
  const updatedViewState = unlockScopeToFree(
    payload.scopeGroupId,
    graphStateRef.current,
    viewStateRef.current
  );
  
  // 2. Update ViewState
  viewStateRef.current = updatedViewState;
  
  // 3. Update ReactFlow edges to trigger StepEdge re-render
  const { convertViewStateToReactFlow } = await import('../renderer/ViewStateToReactFlow');
  const { edges } = convertViewStateToReactFlow(graphStateRef.current, updatedViewState);
  setEdgesRef.current(edges);
  
  // 4. Dispatch routing-update event
  window.dispatchEvent(new CustomEvent('routing-update', { 
    detail: { scopeGroupId: payload.scopeGroupId }
  }));
```

**Issues to Fix**:
- [x] Handler is called but edges don't re-render
- [ ] Need to force edge component re-render after ViewState update
- [ ] `setEdges` must be called to propagate new `routingMode` to edge components

### 3. unlockScopeToFree.ts (Domain Handler)
**Role**: Update ViewState to set modes to FREE

```typescript
export function unlockScopeToFree(
  scopeGroupId: string,
  graph: RawGraph,
  viewState: ViewState
): ViewState {
  // 1. Set group + descendants to FREE in ViewState.layout
  const descendantGroupIds = collectDescendantGroupIds(graph, scopeGroupId);
  for (const groupId of descendantGroupIds) {
    viewState.layout[groupId] = { mode: 'FREE' };
  }
  
  // 2. Find all edges touching the subtree
  const touchingEdges = collectTouchingEdges(graph, descendantNodeIds);
  
  // 3. Set touching edges to FREE routing in ViewState.edge
  for (const edge of touchingEdges) {
    viewState.edge[edge.id] = {
      ...viewState.edge[edge.id],
      routingMode: 'FREE',  // CRITICAL: This tells StepEdge to use libavoid
      sourceHandle: edge.sourceHandle,  // Preserve port connections
      targetHandle: edge.targetHandle
    };
  }
  
  return viewState;
}
```

**Issues to Fix**:
- [x] Handler correctly sets `routingMode: 'FREE'` in ViewState
- [ ] ViewState updates aren't propagating to StepEdge components
- [ ] Need to ensure edge data includes updated routingMode

### 4. GroupDragHandler.ts (Drag Logic)
**Role**: Update positions of group and children during drag

```typescript
export function handleGroupDrag(
  changes: NodeChange[],
  currentNodes: Node[],
  viewStateRef: { current: ViewState | null },
  rawGraphRef: { current: RawGraph | null }
): GroupDragResult[] {
  const results: GroupDragResult[] = [];
  
  for (const change of positionChanges) {
    if (change.type !== 'position' || !isGroup(change.id)) continue;
    
    // 1. Calculate delta from previous position
    const delta = calculateDelta(change, previousPositions, viewStateRef);
    
    // 2. Update group position in ViewState
    viewStateRef.current.group[change.id] = {
      x: newX,
      y: newY,
      w, h
    };
    
    // 3. Update children positions in ViewState
    const children = getChildren(rawGraphRef, change.id);
    const childPositions = [];
    for (const child of children) {
      const newChildX = viewStateRef.current.node[child.id].x + delta.x;
      const newChildY = viewStateRef.current.node[child.id].y + delta.y;
      
      viewStateRef.current.node[child.id] = { x: newChildX, y: newChildY, w, h };
      childPositions.push({ id: child.id, x: newChildX, y: newChildY });
    }
    
    // 4. Return child positions for ReactFlow update
    results.push({
      groupId: change.id,
      newPosition: { x: newX, y: newY },
      childPositions  // CRITICAL: InteractiveCanvas must use these to update nodes
    });
  }
  
  // 5. Trigger edge rerouting
  batchUpdateObstaclesAndReroute(allUpdatedNodes);
  
  return results;
}
```

**Issues to Fix**:
- [x] Handler correctly calculates deltas and updates ViewState
- [ ] `childPositions` returned but NOT used by InteractiveCanvas to update ReactFlow nodes
- [ ] Children don't move visually because `setNodes` is never called with new positions

### 5. StepEdge.tsx (Edge Renderer)
**Role**: Read routing mode from ViewState and route accordingly

```typescript
// CRITICAL: Read routingMode from ViewState, not props
const routingModeFromViewState = (window as any).__elkState?.viewStateRef?.current?.edge?.[id]?.routingMode;
const hasElkData = !!(elkStartPoint && elkEndPoint);

// Priority: ViewState > ELK data > props
const routingMode = routingModeFromViewState === 'FREE'
  ? 'FREE'
  : (routingModeFromViewState || (hasElkData ? 'LOCK' : 'FREE'));

if (routingMode === 'LOCK') {
  // Use ELK coordinates
  const path = buildPathFromELK(elkStartPoint, elkWaypoints, elkEndPoint);
  setEdgePath(path);
  return;
}

// FREE mode: Use libavoid
const obstacleRects = resolvedObstacleRects; // Must use ABSOLUTE coordinates
const route = await routeWithLibavoid(source, target, obstacleRects);
setEdgePath(pointsToPath(route));
```

**Issues to Fix**:
- [x] Correctly reads `routingModeFromViewState`
- [x] Prioritizes ViewState over ELK data
- [ ] Edge component doesn't re-render when ViewState.edge[id].routingMode changes
- [ ] Need `setEdges` call in Orchestrator to force re-render with new props

### 6. condensedNodes (Obstacle Registration)
**Role**: Provide ABSOLUTE coordinates to libavoid

```typescript
const condensedNodes: NodeRect[] = allNodes.map(node => {
  // MANDATORY: Use positionAbsolute (ReactFlow's computed absolute position)
  const posAbs = node.positionAbsolute;
  
  if (posAbs) {
    return { id: node.id, x: posAbs.x, y: posAbs.y, width, height };
  }
  
  // Fallback: Compute absolute from relative + parent
  if (node.parentNode) {
    const parent = allNodes.find(n => n.id === node.parentNode);
    const parentAbs = parent?.positionAbsolute;
    if (parentAbs) {
      return {
        id: node.id,
        x: parentAbs.x + node.position.x,  // Compute absolute
        y: parentAbs.y + node.position.y,
        width, height
      };
    }
  }
  
  // Root node: position IS absolute
  return { id: node.id, x: node.position.x, y: node.position.y, width, height };
});
```

**Issues to Fix**:
- [x] Correctly computes absolute coordinates
- [x] Never returns relative coordinates
- [ ] Libavoid needs to be called with these updated positions after drag

## Complete Flow

### User Drags LOCK Mode Group

1. **User Input**: Mouse drag on `data_services` group (LOCK mode)

2. **InteractiveCanvas.onNodesChange**:
   - Detects position change for `data_services`
   - Identifies it as LOCK mode group
   - Calls `apply({ action: 'unlock-scope-to-free' })`

3. **Orchestrator**:
   - Routes to `unlockScopeToFree` handler
   - Handler updates ViewState:
     - `layout[data_services] = { mode: 'FREE' }`
     - `edge[edge_gke_sql].routingMode = 'FREE'`
     - `edge[edge_functions_storage].routingMode = 'FREE'`
   - **CRITICAL**: Calls `setEdges` with new edge data including `routingMode: 'FREE'`
   - Dispatches `routing-update` event

4. **InteractiveCanvas.onNodesChange** (continued):
   - Calls `handleGroupDrag(changes, nodes, viewStateRef, rawGraphRef)`
   - Handler updates ViewState positions:
     - `group[data_services] = { x: 1020, y: 186 }`
     - `node[cloud_sql] = { x: 1516, y: 554 }`
     - `node[cloud_storage] = { x: 1660, y: 570 }`
     - `node[bigquery] = { x: 1788, y: 570 }`
   - Handler returns `childPositions` array
   - **CRITICAL**: InteractiveCanvas calls `setNodes` to update child positions visually

5. **StepEdge Re-render**:
   - Receives new props from `setEdges` (includes updated `data.routingMode`)
   - Reads `routingModeFromViewState` = `'FREE'`
   - Switches from LOCK to FREE mode
   - Calls `routeWithLibavoid`:
     - Gets obstacles from `condensedNodes` (ABSOLUTE coordinates)
     - Registers obstacles with libavoid
     - Creates pins at node ports
     - Calls `connection.displayRoute()` to get route
     - Renders path with orthogonal routing

6. **Visual Result**:
   - Group moves to new position
   - Children move with group (same delta)
   - Edges reroute using libavoid (orthogonal paths avoiding obstacles)

## Critical Bugs to Fix

### Bug 1: onNodesChange Doesn't Receive Position Changes
**Symptom**: Dragging group doesn't trigger `onNodesChange` with position changes  
**Cause**: Unknown - need to investigate ReactFlow drag handlers  
**Fix**: Ensure ReactFlow's native drag is properly enabled and not blocked

### Bug 2: setNodes Not Called with Child Positions
**Symptom**: Children don't move visually when group is dragged  
**Cause**: `InteractiveCanvas` receives `childPositions` from `handleGroupDrag` but doesn't call `setNodes`  
**Fix**: Add `setNodes` call in `onNodesChange` after `handleGroupDrag`

```typescript
const groupResults = handleGroupDrag(changes, nodes, viewStateRef, rawGraphRef);
if (groupResults.length > 0) {
  const nodesToUpdate = groupResults.flatMap(r => r.childPositions);
  setNodes(nds => nds.map(n => {
    const update = nodesToUpdate.find(u => u.id === n.id);
    return update ? { ...n, position: { x: update.x, y: update.y } } : n;
  }));
}
```

### Bug 3: setEdges Not Called After ViewState Update
**Symptom**: Edges stay in LOCK mode even after `unlockScopeToFree` sets `routingMode: 'FREE'`  
**Cause**: `Orchestrator` updates ViewState but doesn't call `setEdges` to propagate to components  
**Fix**: Call `setEdges` in Orchestrator after `unlockScopeToFree`

```typescript
const updatedViewState = unlockScopeToFree(...);
viewStateRef.current = updatedViewState;

// Force edge re-render
const { edges } = convertViewStateToReactFlow(graphStateRef.current, updatedViewState);
setEdgesRef.current(edges);
```

### Bug 4: Edge Component Doesn't Re-render
**Symptom**: Even with `setEdges`, StepEdge doesn't pick up new `routingMode`  
**Cause**: Edge `data` prop may not include `routingMode` from ViewState  
**Fix**: Ensure `convertViewStateToReactFlow` includes `routingMode` in edge data

```typescript
// In convertViewStateToReactFlow:
const edgeData = {
  ...baseEdgeData,
  routingMode: viewState.edge[edgeId]?.routingMode  // Include from ViewState
};
```

## Test Requirements

The test must verify:

1. **Part 1: Mode Transition**
   - Group mode changes from LOCK to FREE after drag
   - Verified by: `viewState.layout[groupId].mode === 'FREE'`

2. **Part 2: Edge Routing**
   - Edges switch from ELK to libavoid routing
   - Verified by: SVG path changes and connects to correct ports
   - Verified by: More than 2 waypoints if initial routing had > 2 waypoints

3. **Part 3: Children Movement**
   - All children move with same delta as group
   - Verified by: ReactFlow `positionAbsolute` matches group delta

## Implementation Checklist

- [ ] Fix onNodesChange to receive position changes during drag
- [ ] Add setNodes call in InteractiveCanvas after handleGroupDrag
- [ ] Add setEdges call in Orchestrator after unlockScopeToFree
- [ ] Ensure convertViewStateToReactFlow includes routingMode in edge data
- [ ] Verify condensedNodes always returns absolute coordinates
- [ ] Test complete flow: drag group → mode changes → edges reroute → children move


