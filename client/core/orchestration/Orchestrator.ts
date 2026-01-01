/**
 * Orchestrator facade - coordinates Domain, Layout, ViewState, Renderer
 * Part of Agent B Inter Plan - B5
 * 
 * This is the central coordinator that:
 * - Routes edit intents to the correct sequence of operations
 * - Ensures proper ordering: Domain → Layout → ViewState → Render
 * - Never directly mutates; delegates to Domain/Layout/ViewState modules
 * 
 * Current implementation is a stub with routing placeholders.
 */

import type { EditIntent, Source } from './types';
import { decideLayout, findHighestLockedAncestor, buildModeMap, buildParentOf } from './Policy';
import { runScopeLayout } from '../layout/ScopedLayoutRunner';
import type { RawGraph } from '../../components/graph/types/index';
import type { ViewState } from '../viewstate/ViewState';
import { mergeViewState } from '../../state/viewStateOrchestrator';
import { findNodeById } from '../../components/graph/utils/find';
import { findParentOfNode } from '../../components/graph/mutations';
// TODO: Import when available:
// import { adjustForReparent } from '../viewstate/adjust';
// import * as Domain from '../domain';

// Import domain mutations
import { addNode, moveNode, groupNodes, deleteNode, deleteEdge } from '../../components/graph/mutations';
import { adjustForReparent } from '../viewstate/adjust';
import { initializeStateRefs } from './state/StateRefs';
// No direct rendering - let useElkToReactflowGraphConverter handle ViewState changes

// No helper functions needed - ViewState changes trigger automatic rendering via React hooks

// Global state refs (will be set by the hook)
let graphStateRef: { current: RawGraph | null } = { current: null };
let viewStateRef: { current: ViewState } = { current: { node: {}, group: {}, edge: {} } };
let renderTriggerRef: { current: (() => void) | null } = { current: null };
let setGraphRef: { current: ((graph: RawGraph, source?: 'ai' | 'user' | 'free-structural') => void) | null } = { current: null };
let setNodesRef: { current: ((nodes: any[]) => void) | null } = { current: null };
let setEdgesRef: { current: ((edges: any[]) => void) | null } = { current: null };

/**
 * Initialize orchestrator with state refs from the hook
 */
export function initializeOrchestrator(
  graphRef: { current: RawGraph | null },
  vsRef: { current: ViewState },
  renderTrigger: () => void,
  setGraph?: (graph: RawGraph, source?: 'ai' | 'user' | 'free-structural') => void,
  setNodes?: (nodes: any[]) => void,
  setEdges?: (edges: any[]) => void
) {
  graphStateRef = graphRef;
  viewStateRef = vsRef;
  renderTriggerRef.current = renderTrigger;
  setGraphRef.current = setGraph || null;
  setNodesRef.current = setNodes || null;
  setEdgesRef.current = setEdges || null;
  
  // Also initialize StateRefs for handlers (synchronously)
  initializeStateRefs(graphRef, vsRef, renderTrigger, setGraph, setNodes, setEdges);

  // 🔧 FIX: If initialized with existing data, trigger immediate render
  // This fixes persistence - restored nodes should appear immediately
  if (graphRef.current?.children?.length > 0 && setNodes) {
    // Use the same rendering logic as add-node action
    const domainStructure = graphRef.current;
    const dimensions = { width: 96, height: 96, groupWidth: 200, groupHeight: 150, padding: 16 };

    // Import and render using ViewStateToReactFlow (same as regular flow)
    import('../renderer/ViewStateToReactFlow').then(({ convertViewStateToReactFlow }) => {
      try {
        const { nodes, edges } = convertViewStateToReactFlow(
          domainStructure,
          vsRef.current,
          dimensions
        );

        if (setNodesRef.current) setNodesRef.current(nodes);
        if (setEdgesRef.current) setEdgesRef.current(edges);
      } catch (error) {
        console.error('[🔄 INIT] Initial render failed:', error);
      }
    });
  }
}

/**
 * Trigger restoration rendering when setRawGraph is called with restored FREE mode data
 */
export function triggerRestorationRender(graphRef: { current: RawGraph | null }, vsRef: { current: ViewState }) {
  if (!setNodesRef.current || !setEdgesRef.current) return;
  
  const hasGraphData = graphRef.current?.children?.length > 0;
  const hasViewStateData = Object.keys(vsRef.current?.node || {}).length > 0 || Object.keys(vsRef.current?.group || {}).length > 0;
  
  if (hasGraphData && hasViewStateData) {
    const domainStructure = graphRef.current;
    const dimensions = { width: 96, height: 96, groupWidth: 200, groupHeight: 150, padding: 16 };

    // Clean ViewState before rendering to remove stale entries
    import('../viewstate/ViewStateCleanup').then(({ cleanViewState }) => {
      const cleanedViewState = cleanViewState(domainStructure!, vsRef.current);
      
      // Update the ViewState ref with cleaned version
      vsRef.current = cleanedViewState;
      
      import('../renderer/ViewStateToReactFlow').then(({ convertViewStateToReactFlow }) => {
        try {
          const { nodes, edges } = convertViewStateToReactFlow(domainStructure!, cleanedViewState, dimensions);
          
          if (setNodesRef.current) setNodesRef.current(nodes);
          if (setEdgesRef.current) setEdgesRef.current(edges);
        } catch (error) {
          console.error('[🔄 RESTORATION] setRawGraph restoration render failed:', error);
        }
      });
    });
  }
}

/**
 * Applies an edit intent by routing to the correct sequence of operations.
 * 
 * Routing:
 * - FREE geo-only: ViewState.write → emit render
 * - FREE structural: Domain.mutate → ViewState.adjust → emit render
 * - AI/LOCK structural: Domain.mutate → Layout.run → merge ViewStateDelta → emit render
 * 
 * @param intent - Edit intent to apply
 * @returns Promise that resolves when edit is complete
 */
export async function apply(intent: EditIntent): Promise<void> {
  if (process.env.NODE_ENV !== 'production') {
    console.log('[Orchestrator] apply called', intent);
  }

  if (!graphStateRef.current) {
    throw new Error('[Orchestrator] Graph state not available');
  }

  switch (intent.kind) {
    case 'geo-only': {
      // FREE geo-only: ViewState.write → emit render
      console.warn('[Orchestrator] geo-only path not yet implemented');
      break;
    }

    case 'free-structural': {
      // FREE structural: Domain.mutate → ViewState.adjust → emit render
      const { payload } = intent;
      
      if (payload.action === 'add-node') {
        // 0. Write position to ViewState FIRST (before domain mutation)
        // CRITICAL: ALWAYS write geometry to ViewState BEFORE domain mutation
        // This ensures ViewState-first contract is maintained
        
        // Ensure ViewState structure exists
        if (!viewStateRef.current) {
          viewStateRef.current = { node: {}, group: {}, edge: {} };
        }
        if (!viewStateRef.current.node) {
          viewStateRef.current.node = {};
        }
        if (!viewStateRef.current.group) {
          viewStateRef.current.group = {};
        }
        
        // STRICT: Position MUST be provided for FREE mode - no fallbacks
        const x = payload.position?.x ?? payload.x;
        const y = payload.position?.y ?? payload.y;
        
        if (x === undefined || y === undefined) {
          throw new Error(`[Orchestrator] add-node requires position (x, y). Got: ${JSON.stringify({ x, y, payload })}`);
        }
        
        const newNodeGeometry = {
          x,
          y,
          w: payload.size?.w ?? (payload.data?.isGroup ? 288 : 96),
          h: payload.size?.h ?? (payload.data?.isGroup ? 192 : 96),
        };
          
        // STRICT: Use the SAME ID as domain graph (no normalization)
        // Domain graph uses payload.nodeId directly, so ViewState must match
        const nodeId = payload.nodeId;
        
        // Write to appropriate ViewState collection using same ID as domain
        if (payload.data?.isGroup) {
          // Groups need both group and node entries for ReactFlow conversion
          viewStateRef.current.group[nodeId] = newNodeGeometry;
          viewStateRef.current.node[nodeId] = newNodeGeometry;
        } else {
          viewStateRef.current.node[nodeId] = newNodeGeometry;
        }
        
        // 1. Domain.mutate (add node structure)
        // CRITICAL: Use current graph state from ref
        const currentGraph = graphStateRef.current;
        if (!currentGraph) {
          throw new Error('[Orchestrator] Graph state not available for add-node');
        }
        const updatedGraph = addNode(
          payload.nodeId,
          payload.parentId,
          currentGraph,
          payload.data || {}
        );
        
        // Update graph ref only - do NOT touch React state for FREE mode
        graphStateRef.current = updatedGraph;
        
        // Clean ViewState to remove stale entries
        const { cleanViewState } = await import('../viewstate/ViewStateCleanup');
        const cleanedViewState = cleanViewState(updatedGraph, viewStateRef.current);
        
        if (!cleanedViewState.node[nodeId]) {
          throw new Error(`[Orchestrator] cleanViewState removed geometry for node ${nodeId}`);
        }
        
        viewStateRef.current = cleanedViewState;
        
        // Render directly via setNodesRef/setEdgesRef (bypasses ELK)
        if (setNodesRef.current && setEdgesRef.current) {
          const { convertViewStateToReactFlow } = await import('../renderer/ViewStateToReactFlow');
          const { nodes, edges } = convertViewStateToReactFlow(updatedGraph, cleanedViewState);
          setNodesRef.current(nodes);
          setEdgesRef.current(edges);
        }
      } else if (payload.action === 'delete-node') {
        // CRITICAL: Use the CURRENT graph state from ref
        const currentGraph = graphStateRef.current;
        if (!currentGraph) {
          throw new Error('[Orchestrator] Graph state not available for delete-node');
        }
        const graphToDelete = JSON.parse(JSON.stringify(currentGraph));
        
        console.log('[Orchestrator] DELETE-NODE - using current graph:', {
          nodeId: payload.nodeId,
          currentGraphChildren: currentGraph?.children?.length || 0,
          targetNodeExists: !!findNodeById(currentGraph, payload.nodeId!)
        });
        
        // 1. Domain.mutate (delete node structure)
        updatedGraph = deleteNode(payload.nodeId!, graphToDelete);
        
        // 2. Clean up ViewState using cleanViewState to remove ALL stale entries
        // This handles both the deleted node AND any children (for groups)
        const { cleanViewState } = await import('../viewstate/ViewStateCleanup');
        const cleanedViewState = cleanViewState(updatedGraph, viewStateRef.current);
        viewStateRef.current = cleanedViewState;
        
        // 3. Update graph state ref AND React state
        // CRITICAL: Must update React state to prevent useEffect sync from overwriting our changes
        // Update graph ref only - do NOT touch React state for FREE mode
        const clonedGraph = JSON.parse(JSON.stringify(updatedGraph));
        clonedGraph.viewState = cleanedViewState;
        graphStateRef.current = clonedGraph;
        
        // 4. FREE mode: Direct render (same as add-node)
        if (setNodesRef.current && setEdgesRef.current) {
          import('../renderer/ViewStateToReactFlow').then(({ convertViewStateToReactFlow }) => {
            try {
              const dimensions = { width: 96, height: 96, groupWidth: 200, groupHeight: 150, padding: 16 };
              const { nodes, edges } = convertViewStateToReactFlow(clonedGraph, cleanedViewState, dimensions);
              
              setNodesRef.current!(nodes);
              setEdgesRef.current!(edges);
              
              console.log('[Orchestrator] FREE mode delete-node rendered directly:', {
                nodeCount: nodes.length,
                domainChildren: clonedGraph?.children?.length || 0,
                viewStateNodes: Object.keys(cleanedViewState.node || {}).length,
              });
            } catch (error) {
              console.error('[Orchestrator] FREE mode delete-node render failed:', error);
            }
          });
        } else if (renderTriggerRef.current) {
          // Fallback: trigger render via renderTriggerRef
          renderTriggerRef.current();
        }
        
        // Verify node was actually removed
        const nodeStillInChildren = clonedGraph?.children?.some((c: any) => c.id === payload.nodeId);
        if (nodeStillInChildren) {
          console.error(`❌ [DELETE] Node ${payload.nodeId} still exists in root children after deletion!`);
        }
        
        console.log('[Orchestrator] Completed FREE structural delete-node', {
          nodeId: payload.nodeId,
          graphChildrenCount: clonedGraph?.children?.length || 0,
          beforeDeleteCount: graphToDelete?.children?.length || 0,
          nodeStillInGraph: nodeStillInChildren,
          graphNodeIds: clonedGraph?.children?.map((c: any) => c.id) || []
        });
        
      } else if (payload.action === 'delete-edge') {
        // CRITICAL: Use the CURRENT graph state from ref
        const currentGraph = graphStateRef.current;
        if (!currentGraph) {
          throw new Error('[Orchestrator] Graph state not available for delete-edge');
        }
        // CRITICAL: Clone graph first since deleteEdge might mutate in place
        const graphToDelete = JSON.parse(JSON.stringify(currentGraph));
        
        // Check if edge exists before trying to delete it
        // Edges may have been removed when their connected nodes were deleted
        const edgeExists = (() => {
          // Check root edges
          if (graphToDelete.edges?.some((e: any) => e.id === payload.edgeId)) return true;
          // Check edges in nodes recursively
          const checkNode = (node: any): boolean => {
            if (node.edges?.some((e: any) => e.id === payload.edgeId)) return true;
            if (node.children) {
              return node.children.some((child: any) => checkNode(child));
            }
            return false;
          };
          if (graphToDelete.children) {
            return graphToDelete.children.some((child: any) => checkNode(child));
          }
          return false;
        })();
        
        let clonedGraph: RawGraph;
        if (!edgeExists) {
          console.warn(`[Orchestrator] Edge ${payload.edgeId} not found - may have been removed with node deletion`);
          // Still clean up ViewState in case it exists there
          if (viewStateRef.current.edge?.[payload.edgeId!]) {
            delete viewStateRef.current.edge[payload.edgeId!];
          }
          // Edge already gone - still update graph ref and render to ensure UI is in sync
          clonedGraph = JSON.parse(JSON.stringify(currentGraph));
          graphStateRef.current = clonedGraph;
        } else {
          // 1. Domain.mutate (delete edge structure)
          let updatedGraph: RawGraph;
          try {
            updatedGraph = deleteEdge(payload.edgeId!, graphToDelete);
          } catch (error) {
            // Edge might have been deleted between check and deletion
            if (error instanceof Error && error.message.includes('not found')) {
              console.warn(`[Orchestrator] Edge ${payload.edgeId} not found during deletion - may have been removed concurrently`);
              // Still clean up ViewState
              if (viewStateRef.current.edge?.[payload.edgeId!]) {
                delete viewStateRef.current.edge[payload.edgeId!];
              }
              // Use current graph state (edge already gone)
              updatedGraph = graphStateRef.current || currentGraph;
            } else {
              throw error; // Re-throw if it's a different error
            }
          }
          
          // 2. Clean up ViewState (remove edge waypoints)
          if (viewStateRef.current.edge?.[payload.edgeId!]) {
            delete viewStateRef.current.edge[payload.edgeId!];
          }
          
          // Update graph state ref (NOT React state)
          // CRITICAL: In FREE mode, we only update the ref, NOT call setRawGraph
          clonedGraph = JSON.parse(JSON.stringify(updatedGraph));
          graphStateRef.current = clonedGraph;
        }
        
        // Always render to ensure UI is in sync (whether edge was deleted or already gone)
        
        // DO NOT call setGraphRef.current() - it causes double rendering
        // Render directly via setNodesRef/setEdgesRef
        if (setNodesRef.current && setEdgesRef.current) {
          const { convertViewStateToReactFlow } = await import('../renderer/ViewStateToReactFlow');
          const { nodes, edges } = convertViewStateToReactFlow(clonedGraph, viewStateRef.current);
          setNodesRef.current(nodes);
          setEdgesRef.current(edges);
        }
        
        console.log('[Orchestrator] Completed FREE structural delete-edge', {
          edgeId: payload.edgeId
        });
        
      } else if (payload.action === 'move-node') {
        // CRITICAL: Use the CURRENT graph state from ref
        const currentGraph = graphStateRef.current;
        if (!currentGraph) {
          throw new Error('[Orchestrator] Graph state not available for move-node');
        }
        // 1. Domain.mutate (reparent node)
        const updatedGraph = moveNode(
          payload.nodeId!,
          payload.newParentId!,
          currentGraph
        );
        
        // Update graph state
        graphStateRef.current = updatedGraph;
        
        // 2. ViewState.adjust (preserve world position)
        const getGroupWorldPos = (groupId: string) => {
          const groupGeom = viewStateRef.current.group?.[groupId];
          return groupGeom ? { x: groupGeom.x, y: groupGeom.y } : undefined;
        };
        
        viewStateRef.current = adjustForReparent({
          nodeId: payload.nodeId,
          oldParentId: payload.oldParentId,
          newParentId: payload.newParentId,
          viewState: viewStateRef.current,
          getGroupWorldPos
        });
        
        // 3. Emit render
        if (renderTriggerRef.current) {
          renderTriggerRef.current();
        }
        
        console.log('[Orchestrator] Completed FREE structural move-node', {
          nodeId: payload.nodeId,
          oldParent: payload.oldParentId,
          newParent: payload.newParentId
        });
        
      } else if (payload.action === 'unlock-scope-to-free') {
        const { unlockScopeToFree } = await import('./handlers/mode/unlockScopeToFree');
        const updatedViewState = unlockScopeToFree(
          payload.scopeGroupId!,
          graphStateRef.current!,
          viewStateRef.current
        );
        viewStateRef.current = updatedViewState;
        
        // Update domain graph modes too (for consistency)
        const scopeGroup = findNodeById(graphStateRef.current!, payload.scopeGroupId!);
        if (scopeGroup) {
          // Recursively set mode = 'FREE' in domain graph
          const setModeRecursive = (node: any) => {
            if (node.children && node.children.length > 0) {
              node.mode = 'FREE';
              node.children.forEach(setModeRecursive);
            }
          };
          setModeRecursive(scopeGroup);
          graphStateRef.current = JSON.parse(JSON.stringify(graphStateRef.current));
        }
        
        // During drag, only update edges (not nodes) to avoid resetting positions
        // This allows StepEdge to see routingMode changes and re-register with libavoid
        if (setEdgesRef.current) {
          const { convertViewStateToReactFlow } = await import('../renderer/ViewStateToReactFlow');
          const { edges } = convertViewStateToReactFlow(graphStateRef.current!, updatedViewState);
          
          // Update edges only - this triggers StepEdge to re-register with libavoid
          setEdgesRef.current(edges);
          
          // Only update nodes if NOT during drag (would reset positions)
          if (payload.reason !== 'drag-start' && setNodesRef.current) {
            const { nodes } = convertViewStateToReactFlow(graphStateRef.current!, updatedViewState);
            
            // CRITICAL: Preserve selection if specified
            if (payload.preserveSelection && Array.isArray(payload.preserveSelection)) {
              const preserveSet = new Set(payload.preserveSelection as string[]);
              nodes.forEach(node => {
                if (preserveSet.has(node.id)) {
                  node.selected = true;
                }
              });
            }
            
            setNodesRef.current(nodes);
            reactFlowRef.current?.fitView({ padding: 0.1, duration: 0 });
          }
        }
        
        console.log('[Orchestrator] Completed unlock-scope-to-free', {
          scopeGroupId: payload.scopeGroupId,
          reason: payload.reason,
          preservedSelection: payload.preserveSelection
        });
        
        // CRITICAL: Dispatch routing-update event to trigger StepEdge to re-read from ViewState
        // This ensures edges pick up the routingMode change and re-register with libavoid
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('routing-update', { 
            detail: { scopeGroupId: payload.scopeGroupId, reason: 'unlock-scope-to-free' }
          }));
        }
        
        // Note: Live rerouting is handled by existing FREE mode code
        // handleDragReparent and handleGroupDrag in onNodesChange already
        // call batchUpdateObstaclesAndReroute during drag for live updates
        
      } else if (payload.action === 'lock-scope-and-descendants') {
        const { lockScopeAndDescendants } = await import('./handlers/mode/lockScopeAndDescendants');
        const updatedViewState = lockScopeAndDescendants(
          payload.scopeGroupId!,
          graphStateRef.current!,
          viewStateRef.current
        );
        viewStateRef.current = updatedViewState;
        
        // Update domain graph modes
        const scopeGroup = findNodeById(graphStateRef.current!, payload.scopeGroupId!);
        if (scopeGroup) {
          const setModeRecursive = (node: any) => {
            if (node.children && node.children.length > 0) {
              node.mode = 'LOCK';
              node.children.forEach(setModeRecursive);
            }
          };
          setModeRecursive(scopeGroup);
          graphStateRef.current = JSON.parse(JSON.stringify(graphStateRef.current));
        }
        
        // Trigger render (or let existing ELK path handle it)
        if (setNodesRef.current && setEdgesRef.current) {
          const { convertViewStateToReactFlow } = await import('../renderer/ViewStateToReactFlow');
          const { nodes, edges } = convertViewStateToReactFlow(graphStateRef.current!, updatedViewState);
          setNodesRef.current(nodes);
          setEdgesRef.current(edges);
        }
        
        console.log('[Orchestrator] Completed lock-scope-and-descendants', {
          scopeGroupId: payload.scopeGroupId
        });
        
      } else {
        console.warn(`[Orchestrator] Unknown FREE structural action: ${(payload as any).action}`);
      }
      break;
    }

    case 'ai-lock-structural': {
      // AI/LOCK structural: Domain.mutate → Layout.run → merge ViewStateDelta → emit render
      console.warn('[Orchestrator] ai-lock-structural path not yet implemented');
      break;
    }

    default: {
      const _exhaustive: never = intent as never;
      throw new Error(`[Orchestrator] Unknown edit kind: ${(intent as any).kind}`);
    }
  }
}

/**
 * Classifies an edit and decides if ELK should run.
 * This is the central decision point per architecture diagram.
 * 
 * @param source - Source of edit ('ai' | 'user')
 * @param graph - Domain graph
 * @param viewState - ViewState (for mode map)
 * @param scopeId - Scope of the edit (defaults to 'root')
 * @returns Object with classification and whether ELK should run
 */
export function classifyEdit(
  source: Source,
  graph: RawGraph,
  viewState: ViewState,
  scopeId: string = 'root'
): {
  kind: EditIntent['kind'];
  shouldRunELK: boolean;
  resolvedScope: string | null;
} {
  // Build mode map from ViewState
  const modeMap = buildModeMap(viewState);
  const parentOf = buildParentOf(graph);
  
  // Check if edit requires ELK using Policy
  const shouldRunELK = decideLayout({
    source,
    scopeId,
    modeMap,
    parentOf
  });
  
  // Resolve scope (highest locked ancestor if needed)
  const resolvedScope = shouldRunELK 
    ? findHighestLockedAncestor(scopeId, modeMap, parentOf) || scopeId
    : null;
  
  // Classify edit kind
  let kind: EditIntent['kind'];
  if (shouldRunELK) {
    kind = 'ai-lock-structural';
  } else if (source === 'user') {
    // User edits that don't need ELK are either geo-only or free-structural
    // For now, assume structural (can be refined later)
    kind = 'free-structural';
  } else {
    // Shouldn't happen (AI always needs ELK), but handle gracefully
    kind = 'ai-lock-structural';
  }
  
  return {
    kind,
    shouldRunELK,
    resolvedScope
  };
}

/**
 * Resolves the correct ELK scope for layout based on LOCK policy.
 * Routes layout to highest locked ancestor if needed.
 * 
 * @param scopeId - Initial scope ID (group being arranged)
 * @param graph - Domain graph to analyze
 * @param viewState - ViewState for mode map
 * @returns Resolved scope ID for ELK layout, or null if no layout needed
 */
export function resolveElkScope(scopeId: string, graph: RawGraph, viewState?: ViewState): string | null {
  if (!graph) {
    return null;
  }

  // Build mode map from ViewState
  const modeMap = viewState ? buildModeMap(viewState) : {};
  const parentOf = buildParentOf(graph);
  
  // Find highest locked ancestor using Policy
  const highestLocked = findHighestLockedAncestor(scopeId, modeMap, parentOf);
  
  if (process.env.NODE_ENV !== 'production') {
    console.log('[Orchestrator] resolveElkScope:', {
      originalScope: scopeId,
      resolvedScope: highestLocked || scopeId,
      modeMap,
      isRerouted: !!highestLocked
    });
  }
  
  // Return highest locked ancestor if found, otherwise original scope
  return highestLocked || scopeId;
}

