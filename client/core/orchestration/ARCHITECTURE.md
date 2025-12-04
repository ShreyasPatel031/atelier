# Orchestrator Architecture

> Blueprint for proper separation of concerns. DO NOT put business logic in Orchestrator.ts

## Folder Structure

```
client/core/orchestration/
├── Orchestrator.ts              # PURE FACADE - routing only, no implementation
├── Policy.ts                    # Layout decisions (FREE vs LOCK, ELK triggers)
├── types.ts                     # EditIntent, Source, EditKind
├── ARCHITECTURE.md              # This file
│
├── state/
│   └── StateRefs.ts            # Centralized state refs (graphStateRef, viewStateRef, etc.)
│
├── handlers/                    # Action implementations (can change independently)
│   ├── index.ts                # Re-exports all handlers
│   │
│   ├── node/
│   │   ├── index.ts
│   │   ├── addNode.ts          # FREE: add-node action
│   │   ├── deleteNode.ts       # FREE: delete-node action
│   │   └── moveNode.ts         # FREE: move-node (reparent)
│   │
│   ├── group/
│   │   ├── index.ts
│   │   ├── createGroup.ts      # FREE: create-wrapper-section
│   │   ├── setGroupMode.ts     # FREE: set-group-mode (FREE/LOCK toggle)
│   │   └── arrangeGroup.ts     # LOCK: arrange-group (triggers ELK)
│   │
│   ├── edge/
│   │   ├── index.ts
│   │   └── deleteEdge.ts       # FREE: delete-edge action
│   │
│   └── canvas/
│       ├── index.ts
│       └── resetCanvas.ts      # FREE: reset-canvas action
│
└── render/
    └── Renderer.ts             # Coordinates setNodesRef/setEdgesRef calls
```

## Principles

### 1. Orchestrator.ts = Pure Router
- NO implementation details
- Only routes EditIntent to appropriate handler
- Only imports handlers, not mutations/ViewState directly

### 2. Handlers = Business Logic
- Each handler is self-contained
- Can be tested in isolation
- Can change without affecting other handlers
- Directly use StateRefs, not React state

### 3. FREE Mode = Never Touch useElkToReactflowGraphConverter
- All FREE mode operations go through handlers
- Handlers update `graphStateRef.current` directly (NOT setRawGraph)
- Handlers render via `setNodesRef/setEdgesRef` (bypasses ELK hook)
- ViewState is source of truth for positions

### 4. AI/LOCK Mode = May Touch ELK
- Only `ai-lock-structural` kind triggers ELK
- Uses `setRawGraph('ai')` to trigger layout
- Still goes through handlers for consistency

## Data Flow

### FREE Mode (no ELK)
```
User Action
    ↓
Orchestrator.apply({ kind: 'free-structural', ... })
    ↓
Handler (e.g., handlers/node/addNode.ts)
    ↓
1. ViewState.write (geometry)
2. Domain.mutate (structure)
3. ViewState.clean (remove stale)
4. Render (setNodesRef/setEdgesRef)
    ↓
ReactFlow updated directly
```

### AI/LOCK Mode (with ELK)
```
AI Action
    ↓
Orchestrator.apply({ kind: 'ai-lock-structural', ... })
    ↓
Handler
    ↓
1. Domain.mutate
2. Layout.run (ELK)
3. ViewState.merge (ELK output)
4. setRawGraph('ai') → useElkToReactflowGraphConverter
    ↓
ReactFlow updated via ELK hook
```

## Migration Checklist

### Phase 1: Create Handler Files ✅
- [x] Create state/StateRefs.ts
- [x] Create handlers/node/addNode.ts (extracted logic)
- [x] Create handlers/node/deleteNode.ts (extracted logic)
- [x] Create handlers/node/moveNode.ts (extracted logic)
- [x] Create handlers/edge/deleteEdge.ts (extracted logic)
- [x] Create handlers/canvas/resetCanvas.ts (extracted logic)
- [ ] Create handlers/group/createGroup.ts (from InteractiveCanvas) - uses ELK
- [ ] Create handlers/group/setGroupMode.ts (from InteractiveCanvas) - uses ELK for LOCK
- [ ] Create handlers/group/arrangeGroup.ts (from InteractiveCanvas) - uses ELK

### Phase 2: Bypass ELK Hook for FREE Mode ✅
- [x] resetCanvas - bypasses ELK hook (uses refs directly)
- [x] handleArrangeGroup (FREE mode) - bypasses ELK hook
- [x] createWrapperSection - bypasses ELK hook (runs ELK separately, renders directly)
- [x] new-architecture switch - bypasses ELK hook

### Phase 3: Remaining setRawGraph Calls (Appropriate Use)
The following still use setRawGraph appropriately:
- Debug commands (loadSimpleDefault, loadComplexDefault) - intentional
- Restoration with 'free-structural' source - proper
- Orchestrator bridge (setGraph wrapper) - intentional bridge
- URL/AI loading - external data that triggers ELK appropriately

### Phase 4: Wire Orchestrator to Handlers (Future)
- [ ] Update Orchestrator.ts to route to handler files
- [ ] Remove inline handler code from Orchestrator.ts

