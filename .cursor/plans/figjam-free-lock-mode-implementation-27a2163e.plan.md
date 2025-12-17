---
name: FigJam FREE/LOCK Mode Implementation Plan
overview: ""
todos:
  - id: b9183816-0a0f-4fe3-aa45-e3ec3a0ba039
    content: "Phase 0.1: Add mode field to group creation in mutations.ts, default to FREE"
    status: pending
  - id: a1ea34e5-b724-43a3-bf5e-fa6806c1d2f4
    content: "Phase 0.2: Build parent/ancestor indices (parentMap, pathToRoot, LCG helper)"
    status: pending
  - id: a117172b-49ff-41b5-930a-24e95d03e767
    content: "Phase 0.3: Enforce ViewState-only rendering (✅ ReactFlowAdapter integrated, ViewState migrated to core/viewstate/)"
    status: completed
  - id: a09cbc7a-edf2-49bf-9b5e-22a8703b5a18
    content: "Phase 1.1: Implement runScopeLayout() with anchoring (extract subtree, preserve top-left, write ViewState)"
    status: pending
  - id: ceaf86c5-db8f-4905-b04a-df8ecc4d0831
    content: "Phase 1.2: Update ELK trigger policy (AI always ELK, user FREE skips, user LOCK triggers on highest locked ancestor)"
    status: pending
  - id: 6aba2fa4-8bc2-4055-8c35-44a418709f2a
    content: "Phase 1.3: Root cannot be locked"
    status: pending
  - id: c34c4878-4c0a-4f91-8912-c449dfd63096
    content: "Phase 2.1: Wrapper Section creation for multi-select auto-layout"
    status: pending
  - id: 010a180c-f810-475e-a730-1a1c4ae43768
    content: "Phase 2.2: Adoption/ejection rules on move/resize (fully contained sections/nodes)"
    status: pending
  - id: f5812208-4749-4137-83d0-2bddc87611ed
    content: "Phase 2.3: Rubber-band edges during drag (update visual positions in real-time)"
    status: pending
  - id: dde16c5d-2755-40a0-82b1-eeb2dbeeaa3e
    content: "Phase 3.1: Gesture routing to highest locked ancestor"
    status: pending
  - id: e2215f73-bee8-4c4e-bfa9-5cde33eb86ca
    content: "Phase 3.2: Block resize in LOCK mode"
    status: pending
  - id: 42f9535b-1d6a-4186-b58b-478276037fab
    content: "Phase 3.3: Explicit drop target highlighting for LOCK reparent"
    status: pending
  - id: 6b13e7ba-3f8a-4fc5-ad01-fef800691ce2
    content: "Phase 3.4: Arrange button behavior (already implemented - button toggles FREE/LOCK, turns blue when LOCK)"
    status: completed
  - id: 3cb0b075-3ec8-41f6-a2aa-457f7836afd1
    content: "Phase 4.1: Spatial index for obstacle detection (grid or R-tree)"
    status: pending
  - id: bb1088d4-d21d-4a70-bcca-5475fb759b22
    content: "Phase 4.2: Bump algorithm (right/down monotone, deterministic, rigid blocks)"
    status: pending
  - id: 574e07f9-ddd5-4766-ab28-be1cbfae0929
    content: "Phase 5.1: Group mode toggle UI (FREE/LOCK button, disabled for root)"
    status: pending
  - id: 005c2df7-ac43-4d85-ad9c-652ab01138ec
    content: "Phase 5.2: Persist mode in save/load (ensure mode field saved with groups)"
    status: pending
  - id: 07541b60-8af5-450f-8bf4-d93262b6ec72
    content: "Phase 5.3: Remove source metadata (ensure source never persists, strip before save)"
    status: pending
  - id: 6adb3285-1e23-4814-94bb-8566226c044d
    content: "Phase 6: Acceptance tests for all spec scenarios (FREE/LOCK behaviors, bump, indistinguishable origin)"
    status: pending
---

# FigJam FREE/LOCK Mode Implementation Plan

## Authoritative Architecture (Target)

```
┌─────────────────────────────────────────┐
│ INPUT: User / AI actions                │
└─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────┐
│ ORCHESTRATION (policy + sequencing)     │
│ - Classify: geo-only | FREE-structural | AI/LOCK │
│ - Pick scope: LCG(id…) / highest locked ancestor  │
│ - Execute ordered steps (below)                   │
│ - Emit render only after ViewState is valid       │
└─────────────────────────────────────────┘
     │                    │                          │
     │ (G) Geo-only FREE  │ (F) FREE structural      │ (S) AI/LOCK structural
     │                    │                          │
     ▼                    ▼                          ▼
(G)  ViewState.write  (F1) Domain.mutate         (S1) Domain.mutate
     (pos/size/pts)   (add/move/group/edges)         (add/move/group/edges)
     │                    │                          │
     │              (F2) ViewState.write         (S2) Layout.run(scope, anchored)
     │                   (set position/size)          - reads Domain
     │                    │                           - writes ViewState only
     │              (F3) ViewState.adjust*            │
     │                   - only if reparented         │
     │                   - convert world→relative      │
     │                    │                          │
     │                    ▼                          ▼
     └──────────────► VIEWSTATE (geometry SoT) ◄─────┘
   - positions/sizes/waypoints
   - writers: (G) orchestration; (F2) orchestration; (S2) layout
   * F3 is conditional: only runs if Domain.mutate caused reparenting
   - readers: renderer only
                              │
                              ▼
┌──────────────────────────────┐
│ RENDERER (ReactFlow adapter) │
│ - reads VIEWSTATE only       │
│ - builds RF nodes/edges      │
│ - never reads ELK/DOMAIN     │
└──────────────────────────────┘

┌───────────────────────────┐           ┌───────────────────────────┐
│ DOMAIN (pure structure)   │  ─────►   │ LAYOUT (ELK, scoped)      │
│ - nodes/groups/edges      │  used by  │ - reads Domain            │
│ - no geometry, no mode    │           │ - writes ViewState only   │
└───────────────────────────┘           └───────────────────────────┘
```

## Current State Assessment

**What works:**

- Domain graph is ELK-shaped with groups/nodes/edges
- ViewState structure exists (node/group/edge geometry)
- FREE mode basics: user can add nodes/edges manually, positions stored in ViewState
- AI edits trigger ELK automatically
- `findCommonAncestor` exists for LCG calculation
- Edge parentage uses LCG (edges stored at common ancestor)

**What's missing:**

- Group `mode` field not set/used (exists in types but not in mutations)
- No scoped ELK (always runs on whole graph)
- No anchoring (positions jump on ELK)
- No indices (parentOf, pathToRoot) for performance
- No FREE/LOCK UI toggle
- No adoption/ejection rules for move/resize
- No bump collision resolution

## Phase 0: Foundations (No Breaking Changes)

### 0.1 Add mode to group creation

- **File**: `client/components/graph/mutations.ts`
- **Change**: In `groupNodes()`, set `mode: 'FREE'` on new group nodes (line ~518)
- **File**: `client/components/graph/mutations.ts` 
- **Change**: Ensure `mode` persists when loading/saving graphs
- **Test**: Verify new groups default to FREE mode

### 0.2 Build parent/ancestor indices

- **File**: `client/components/graph/utils/graphIndices.ts` (new)
- **Create**: 
- `buildParentMap(graph): Map<id, parentId>`
- `buildPathToRoot(graph, id): id[]`
- `findLCG(graph, ids: id[]): id | null` (uses pathToRoot)
- **File**: `client/hooks/useElkToReactflowGraphConverter.ts`
- **Change**: Maintain indices ref, rebuild on graph changes
- **Test**: Verify LCG calculation matches existing `findCommonAncestor`

### 0.3 Enforce ViewState-only rendering ✅ COMPLETE

- **File**: `client/core/renderer/ReactFlowAdapter.ts` ✅
- **Status**: ViewState-first adapter implemented and integrated
- **File**: `client/hooks/useElkToReactflowGraphConverter.ts` ✅
- **Status**: Uses `toReactFlowWithViewState()` adapter, reads from ViewState only
- **File**: `client/core/viewstate/ViewState.ts` ✅
- **Status**: ViewState types and helpers migrated to `core/viewstate/`
- **Test**: ✅ Positions persist after ELK runs, ViewState is source of truth

## Phase 1: Scoped & Anchored ELK

### 1.1 Implement scoped ELK runner

- **File**: `client/core/layout/ScopedLayoutRunner.ts` (stub exists, needs implementation)
- **Function**: `runScopeLayout(scopeId: string, graph: RawGraph, viewState: ViewState, opts?: LayoutOptions): Promise<ViewStateDelta>`
- **Implementation Steps**:

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                1. Extract subtree for scopeId from graph
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                2. Lock ancestor chain up to (but not including) root, choose top-most locked ancestor as ELK scope
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                3. Compute pre-layout anchor (from opts.anchorId or scope bbox top-left in ViewState)
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                4. Run ELK on subtree only (use `ensureIds()` and `NON_ROOT_DEFAULT_OPTIONS`)
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                5. Translate ELK output to preserve anchor top-left (prevent jumping)
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                6. Convert ELK positions to ViewStateDelta format
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                7. Auto-fit group frames to children bbox

- **Dependencies**: 
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                - Import: `ELK from "elkjs/lib/elk.bundled.js"`, `ensureIds` from `client/components/graph/utils/elk/ids.ts`
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                - Use: `NON_ROOT_DEFAULT_OPTIONS` from `client/components/graph/utils/elk/elkOptions.ts`
- **Test**: Verify ELK runs only on specified scope, anchor position preserved (top-left doesn't jump)

### 1.2 Update ELK trigger policy

- **File**: `client/core/orchestration/Policy.ts` (Agent D implements)
- **Status**: Policy logic implemented in `decideLayout()` and `findHighestLockedAncestor()`
- **Integration**: Policy will be used by Orchestrator or directly in `useElkToReactflowGraphConverter.ts` useEffect
- **Change**: In useEffect (line ~282) or Orchestrator:
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                - Call `decideLayout({ source, scopeId, modeMap })` to get boolean
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                - If `true`: call `runScopeLayout(scopeId, graph, viewState, opts)` (Agent C's work)
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                - If `false`: skip ELK (FREE mode)
- **Test**: AI edits trigger ELK; user FREE edits skip; user LOCK edits trigger

Additional policy clarifications (Agent D's responsibility):

- When ELK is required (AI or LOCK), first lock the entire ancestor chain of the edited scope up to (but not including) root.
- Choose the top‑most locked ancestor (under root) within that chain as the ELK scope and run anchored ELK there.
- If AI targets a FREE scope, set that scope to LOCK first (persist mode change) to preserve ELK‑first behavior, then apply the policy above.
- **Note**: Agent D implements the decision logic. The actual locking and ELK execution happens in Orchestrator or integration layer.

### 1.3 Root cannot be locked (Agent E)

- **File**: `client/components/ui/InteractiveCanvas.tsx` or group UI component
- **Change**: Disallow setting `mode: 'LOCK'` on root (disable in UI)
- **Test**: Root stays FREE

## Phase 2: FREE Mode Parity

### 2.1 Wrapper Section creation

- **File**: `client/components/graph/mutations.ts`
- **Create**: `createWrapperSection(selectionIds: id[], graph): RawGraph`
- Compute LCG of selection
- Create new section under LCG
- Reparent only selected children (no closure expansion)
- Label as "Wrapper Section" in UI
- **File**: `client/components/ui/InteractiveCanvas.tsx`
- **Change**: Multi-select "Arrange" button creates wrapper, runs ELK once
- **Test**: Multi-select arrange creates wrapper, runs ELK, anchors

### 2.2 Adoption/ejection on move/resize

- **File**: `client/components/graph/mutations.ts`
- **Change**: `moveNode()` - after reparent, check if new parent fully contains other sections/nodes, adopt them
- **Change**: `moveNode()` - check if moved section fully contains others, adopt them
- **File**: `client/components/ui/InteractiveCanvas.tsx` (resize handler)
- **Change**: On group resize:
- Reparent OUT nodes/sections fully outside
- Reparent IN nodes/sections fully inside
- Recompute edge parentage (LCG)
- **Test**: Move/resize adopts/ejects correctly, edges reparent

### 2.3 Rubber-band edges during drag

- **File**: `client/components/ui/InteractiveCanvas.tsx`
- **Change**: During node drag, update edge visual positions in real-time
- **File**: `client/components/graph/utils/toReactFlow.ts`
- **Change**: Use ViewState edge waypoints if available for FREE mode
- **Test**: Edges follow nodes during drag

## Phase 3: LOCK Mode Semantics

### 3.1 Gesture routing to highest locked ancestor

- **File**: `client/hooks/useElkToReactflowGraphConverter.ts`
- **Create**: `findHighestLockedAncestor(scopeId: string, graph): string | null`
- Walk up from scopeId to root
- Return first ancestor with `mode === 'LOCK'`
- **Change**: Use in ELK trigger policy (Phase 1.2)
- **Test**: LOCK parent triggers ELK for child edits

### 3.2 Block resize in LOCK

- **File**: `client/components/node/DraftGroupNode.tsx` or group resize handler
- **Change**: Check group mode, disable resize if LOCK
- **Test**: LOCK groups cannot be resized

### 3.3 Explicit drop target for reparent

- **File**: `client/components/ui/InteractiveCanvas.tsx`
- **Change**: When dragging section in LOCK context, highlight valid drop targets
- **Change**: On drop, reparent only if dropped on highlighted target (no full-containment check)
- **Test**: LOCK reparent uses explicit targets

### 3.4 Arrange button behavior (already implemented)

- **Status**: ✅ Already working
- **Behavior**: 
  - Arrange button on each group toggles FREE ↔ LOCK
  - When LOCK: button turns blue, ELK runs on group contents
  - When FREE: button is gray, manual positioning allowed
  - Moving items inside group automatically changes LOCK → FREE
- **Note**: Button should always be visible (not hidden) - it's the toggle mechanism

## Phase 4: Bump Collision Resolution

### 4.1 Spatial index for obstacles

- **File**: `client/components/graph/utils/spatialIndex.ts` (new)
- **Create**: Simple grid-based or R-tree index for hit-testing
- **Test**: Can query overlapping items efficiently

### 4.2 Bump algorithm

- **File**: `client/hooks/useElkToReactflowGraphConverter.ts`
- **Create**: `resolveBumps(selectionIds: id[], lcgId: string, margin: number)`
- Phase 1: Lock ancestor chain, run anchored ELK on highest locked ancestor
- Phase 2: Build spatial index, find obstacles
- Phase 3: For each obstacle (sorted by distance):
- Compute minimal right/down delta to clear
- Prefer right, tie → right
- Translate obstacle (or its highest non-root parent) as rigid block
- Update index, continue
- **Change**: Call after AI mutations or LOCK edits that change footprint
- **Test**: Overlaps cleared right/down only, selection stays anchored

## Phase 5: UI & Polish

### 5.1 Group mode toggle UI

- **File**: `client/components/ui/GroupModeToggle.tsx` (new) or sidebar
- **Create**: Toggle button for selected group's mode
- **Change**: Disable for root
- **Test**: Toggle works, persists, root cannot be locked

### 5.2 Persist mode in save/load

- **Files**: `client/services/architectureService.ts`, local snapshot layer
- **Change**: Persist group mode in `ViewState.layout[groupId].mode` (localStorage snapshot), NOT in Domain
- **Change**: On load, prefer local snapshot (ViewState geometry + modes); skip initial ELK when hydrated
- **Test**: Mode persists across save/reload via local snapshot; remote share recomputes without modes unless user has a local snapshot

### 5.3 Remove source metadata

- **File**: All mutation call sites
- **Change**: Ensure `source: 'ai' | 'user'` never persists (ephemeral only)
- **File**: Save/load code
- **Change**: Strip any `source` or `createdBy` fields before saving
- **Test**: Saved diagrams have no origin metadata

## Phase 6: Testing

### 6.1 Acceptance tests

- **File**: `e2e/free-lock-mode.test.ts` (new)
- **Create**: Tests for all scenarios in spec §10:
- FREE: Create section from selection
- FREE: Move node keeps edges attached
- FREE: Move section adopts contained sections
- FREE: Resize section adopts/ejects
- FREE: Multi-select auto-layout
- LOCK: Add node triggers ELK
- LOCK: Move section with explicit drop target
- LOCK: Resize disallowed
- Root never LOCK
- AI edit always ELK
- Bump collision resolution
- Indistinguishable by origin

### 6.2 Integration tests

- **File**: Existing E2E tests
- **Change**: Update to verify mode behavior
- **Test**: AI + user edits work together on same canvas

## Implementation Order

1. **Phase 0** (Foundations) - No breaking changes, enables everything else
2. **Phase 1** (Scoped ELK) - Core layout behavior
3. **Phase 2** (FREE parity) - Complete manual editing
4. **Phase 3** (LOCK mode) - Auto-layout behavior
5. **Phase 4** (Bump) - Collision handling
6. **Phase 5** (UI/Polish) - User-facing features
7. **Phase 6** (Testing) - Validation

## Multi‑agent execution (max 5 concurrent at any time)

Constraints:

- Implement orchestration in new modules and minimal integration points.
- Enforce dependency gates between waves; promote to next wave only when gates pass.

### Wave 1 (5 slots)

- Agent A — Foundations & Indices
- Tasks: phase0-mode, phase0-indices
- Files: `client/components/graph/mutations.ts`, new `client/components/graph/utils/graphIndices.ts`
- Gate: unit tests for indices + group creation default mode FREE
- Agent B — ViewState Enforcement ✅ COMPLETE ⚠️ NEEDS CLEANUP
- Tasks: phase0-viewstate
- Status: ✅ ViewState-first renderer integrated, ViewState migrated to `core/viewstate/`
- Files: `client/core/renderer/ReactFlowAdapter.ts` ✅, `client/core/viewstate/ViewState.ts` ✅, `client/hooks/useElkToReactflowGraphConverter.ts` ✅
- Gate: ✅ RF renders exclusively from ViewState; positions persist
- **FIXED**: ✅ ELK skips on load when ViewState exists (ViewState-first principle)
- **FIXED**: ✅ Mode field preserved through ELK processing (extracted before, restored after)
- **⚠️ CLEANUP NEEDED**: Mode extraction hack (lines 692-698) will be removed in Mode Migration Phase 4
- Agent C — Scoped Layout Runner ✅ COMPLETE
- Tasks: phase1-scoped
- Status: ✅ `runScopeLayout(scopeId, graph, viewState, opts?)` implemented
- Files: `client/core/layout/ScopedLayoutRunner.ts` ✅
- Gate: ✅ Unit test on anchored layout (top-left preserved), ELK runs only on scope
- Agent D — Policy Gate ✅ COMPLETE ⚠️ NEEDS REFACTOR
- Tasks: phase1-policy
- Status: ✅ `decideLayout()` and `findHighestLockedAncestor()` implemented
- Files: `client/core/orchestration/Policy.ts` ✅
- Gate: ✅ AI → returns true; user FREE → returns false; user LOCK → returns true; findHighestLockedAncestor finds correct ancestor
- **⚠️ REFACTOR NEEDED**: `buildModeMap(graph)` must change to read from ViewState in Mode Migration Phase 1
- Agent E — Root Rules 🚫 BLOCKED
- Tasks: phase1-root
- **🚫 BLOCKED BY**: Mode Domain→ViewState Migration (Phase 2)
- **📋 See**: `.cursor/plans/mode-domain-to-viewstate-migration.plan.md`
- Files: 
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                - `client/components/ui/InteractiveCanvas.tsx` (ensure root cannot be LOCK)
- Context:
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                - ✅ B1 & B2 complete: ViewState-first renderer integrated, ViewState migrated to `core/viewstate/`
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                - ✅ Agent C complete: `runScopeLayout(scopeId, graph, viewState, opts?)` available in `client/core/layout/ScopedLayoutRunner.ts`
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                - ✅ Agent D complete: `decideLayout()` and `findHighestLockedAncestor()` available in `client/core/orchestration/Policy.ts`
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                - ⚠️ Must write mode to ViewState.layout, not Domain (requires Migration Phase 2)
- Implementation Steps:

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                1. **Ensure root cannot be LOCK:**

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                - File: `client/components/ui/InteractiveCanvas.tsx` or wherever group mode is set
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                - When setting group mode, write to `viewState.layout['root'].mode`, check if `groupId === 'root'` and prevent LOCK
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                - Add validation in group mode toggle UI (if exists)

- Dependencies:
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                - ✅ Agent C's `runScopeLayout()` available
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                - ✅ ViewState helpers available
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                - 🚫 Mode Migration Phase 2 (dual-write) must complete first
- Gate: 
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                - ✅ Root cannot be LOCK (disabled in UI or prevented in ViewState)

### Wave 2 (5 slots)

- Agent A — FREE Wrapper Section
- Tasks: phase2-wrapper
- Files: `client/components/graph/mutations.ts`, UI hook in `InteractiveCanvas.tsx`
- Gate: wrapper creation + single ELK run works
- Agent B — Adopt/Eject on Move/Resize
- Tasks: phase2-adopt
- Files: `mutations.ts` (reparent rules), resize handlers in `InteractiveCanvas.tsx`
- Gate: fully‑contained rules + LCG edge reparent pass
- Agent C — Rubber‑band Connectors
- Tasks: phase2-rubber
- Files: RF drag hooks, `toReactFlow.ts` to honor ViewState edge waypoints
- Gate: edges follow nodes during drag
- Agent D — LOCK Gesture Routing
- Tasks: phase3-routing
- Files: `viewStateOrchestrator.ts` (findHighestLockedAncestor), integration in policy
- Gate: highest locked ancestor runs exactly once per edit
- Agent E — LOCK Restrictions & UI ⚠️ NEEDS REFACTOR
- Tasks: phase3-resize, phase3-drop, phase3-ui
- Files: group node component/resize handlers, drop‑target highlighting, toolbar
- **⚠️ REFACTOR NEEDED**: `DraftGroupNode.tsx` must read mode from ViewState.layout (Mode Migration Phase 1)
- Gate: resize blocked in LOCK, reparent via explicit target

### Wave 3 (5 slots)

- Agent A — Spatial Index
- Tasks: phase4-spatial
- Files: new `client/components/graph/utils/spatialIndex.ts`
- Gate: can query overlaps efficiently
- Agent B — Bump Algorithm
- Tasks: phase4-bump
- Files: `viewStateOrchestrator.ts` (resolveBumps), uses ScopedLayoutRunner + spatial index
- Gate: right/down monotone bump clears overlaps, selection anchored
- Agent C — Group Mode Toggle UI ⚠️ NEEDS REFACTOR
- Tasks: phase5-toggle
- Files: new `client/components/ui/GroupModeToggle.tsx` + sidebar wiring
- **⚠️ REFACTOR NEEDED**: Must write mode to ViewState.layout using migration helpers (Mode Migration Phase 2)
- Gate: toggle persists, disabled for root
- Agent D — Persistence 🚫 BLOCKED
- Tasks: phase5-persist, phase5-cleanup
- **🚫 BLOCKED BY**: Mode Domain→ViewState Migration (Phase 3)
- **📋 See**: `.cursor/plans/mode-domain-to-viewstate-migration.plan.md`
- Files: architecture service/save‑load; ensure no origin metadata
- **Change**: Must persist `viewState.layout[].mode` instead of `domain.mode`
- Gate: reload restores modes from ViewState.layout + ViewState geometry; no source/createdBy in stored data
- Agent E — Acceptance Tests
- Tasks: phase6-tests (incremental as features land)
- Files: new `e2e/free-lock-mode.test.ts`
- Gate: spec §10 scenarios green

### Coordination & Tracking

- One PR per agent per wave; feature branches `feat/figjam/<wave>-<agent>`.
- Merge gates per agent as listed; CI runs acceptance subset gated by dependencies.
- Daily standup: unblock dependencies; reassign idle slots to remaining wave tasks.
- Max WIP: 5 concurrent tasks total; next wave pulled only after all gates green.

## Key Files to Modify

- `client/components/graph/mutations.ts` - Add mode, adoption/ejection
- `client/core/layout/ScopedLayoutRunner.ts` - Scoped ELK implementation (Agent C)
- `client/core/orchestration/Policy.ts` - Policy decisions (Agent D)
- `client/core/orchestration/Orchestrator.ts` - Intent routing (Agent E)
- `client/core/viewstate/ViewState.ts` - ViewState types (✅ migrated)
- `client/core/renderer/ReactFlowAdapter.ts` - ViewState-first renderer (✅ integrated)
- `client/components/graph/utils/graphIndices.ts` (new) - Indices
- `client/components/graph/utils/spatialIndex.ts` (new) - Spatial queries
- `client/components/ui/InteractiveCanvas.tsx` - UI integration
- `client/components/ui/GroupModeToggle.tsx` (new) - Mode toggle
- `e2e/free-lock-mode.test.ts` (new) - Acceptance tests

## New Folder Structure (Agent B Inter Plan)

```
client/core/
├── domain/              # Re-exports existing mutations/types
├── viewstate/           # ViewState types and helpers (✅ migrated)
│   ├── ViewState.ts
│   ├── adjust.ts        # adjustForReparent for FREE structural
│   └── __tests__/
├── layout/              # ELK orchestration (stub ready for Agent C)
│   ├── ScopedLayoutRunner.ts  # ⚠️ Needs implementation
│   ├── types.ts
│   └── __tests__/
├── renderer/            # ReactFlow adapter (✅ integrated)
│   ├── ReactFlowAdapter.ts    # ViewState-first rendering
│   ├── types.ts
│   └── __tests__/
└── orchestration/       # Policy & coordination (stubs ready)
    ├── Orchestrator.ts  # Intent routing (Agent E)
    ├── Policy.ts        # Layout decisions (Agent D)
    ├── types.ts
    └── __tests__/
```