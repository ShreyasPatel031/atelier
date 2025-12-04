# Drag Reparenting Architecture

## CRITICAL: We Bypass ReactFlow's Parent-Child System

**We explicitly DO NOT use ReactFlow's built-in parent-child coordinate conversion.**

### What We DON'T Do
- ❌ Rely on ReactFlow's `parentId` for coordinate conversion
- ❌ Let ReactFlow automatically update child positions
- ❌ Use ReactFlow's relative positioning system

### What We DO Instead
- ✅ Track parent-child relationships in **Domain Graph** (pure structure)
- ✅ Store **ABSOLUTE coordinates** in ViewState for ALL nodes (even children)
- ✅ Manually detect containment during drag using absolute coordinates
- ✅ Manually update Domain graph structure when reparenting happens
- ✅ Manually calculate and set ReactFlow relative positions for visual grouping
- ✅ Set `parentId` on ReactFlow nodes ONLY for visual grouping, NOT for coordinate conversion

### Reparenting Flow

1. **Drag Stop** (`onNodeDragStop`)
   - Get final ReactFlow position (after drag completes)
   - Calculate absolute position from ReactFlow position
   - Check containment: Is node now inside a group's bounds? (using absolute coordinates)
   - If YES: Reparent in Domain graph + update ReactFlow `parentId` + recalculate relative position
   - If NO: Ensure node is at root + remove `parentId` if exists
   - Update ViewState with absolute coordinates (always absolute, never relative)

2. **Containment Detection** (`findContainingGroup`)
   - Uses absolute coordinates from ViewState (for groups) and ReactFlow (for dragged node)
   - Checks if ALL of node's bounds are inside group's bounds
   - Returns the containing group if found

3. **Domain Update** (`moveNode`)
   - Updates Domain graph structure (pure ELK format, no coordinates)
   - Moves node to new parent in Domain graph
   - This is the source of truth for parent-child relationships

4. **ViewState Update**
   - Always stores ABSOLUTE coordinates
   - Never converts to relative
   - Preserved when reparenting happens

5. **ReactFlow Update**
   - Sets `parentId` for visual grouping
   - Calculates relative position manually: `relative = absolute - parentAbsolute`
   - We control the math, not ReactFlow

## Why This Architecture?

ReactFlow's parent-child system causes:
- Coordinate jumps during drag
- Inconsistent reparenting behavior
- Loss of control over exact positioning
- Bugs when moving nodes between groups

By doing it ourselves:
- Full control over coordinate conversion
- No unexpected jumps
- Predictable behavior
- Absolute coordinates always preserved

## Files

- `DragReparentHandler.ts` - Handles reparenting logic (isolated)
- `containmentDetection.ts` - Detects when nodes enter/exit groups
- `InteractiveCanvas.tsx` - Calls handler on drag stop
- `docs/FIGJAM_REFACTOR.md` - Full architectural spec

