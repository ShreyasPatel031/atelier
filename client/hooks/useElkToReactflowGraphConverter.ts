/**
 *  ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
 *  ┃  **DATA LAYERS – READ ME BEFORE EDITING**                    ┃
 *  ┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫
 *  ┃  1. domain-graph (graph/*)                                   ┃
 *  ┃     - pure ELK JSON                                           ┃
 *  ┃     - NO x/y/sections/width/height/etc                        ┃
 *  ┃                                                               ┃
 *  ┃  2. processed-graph (ensureIds + elkOptions)                  ┃
 *  ┃     - lives only inside hooks/layout funcs                    ┃
 *  ┃     - generated, never mutated manually                       ┃
 *  ┃                                                               ┃
 *  ┃  3. view-graph (ReactFlow nodes/edges)                        ┃
 *  ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
 */

import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import ELK from "elkjs/lib/elk.bundled.js";
import {
  Node, Edge,
  applyNodeChanges, applyEdgeChanges,
  NodeChange, EdgeChange,
  Connection, OnConnect
} from "reactflow";

import { RawGraph, LayoutGraph } from "../components/graph/types/index";
import { ensureIds } from "../components/graph/utils/elk/ids";
import { structuralHash } from "../components/graph/utils/elk/structuralHash";
import { scaleElkOutput } from "../components/graph/utils/elk/scaleElkOutput";
import { toReactFlowWithViewState } from "../core/renderer/ReactFlowAdapter";
// Rendering is handled by client/core modules, not hooks
import type { ViewState } from "../core/viewstate/ViewState";
// triggerRestorationRender used only for restoration/resetCanvas, not user actions
import { migrateModeDomainToViewState, syncViewStateLayoutWithGraph } from "../core/viewstate/modeHelpers";

import {
  addNode, deleteNode, moveNode,
  addEdge, deleteEdge,
  groupNodes, removeGroup,
  batchUpdate,
  edgeIdExists
} from "../components/graph/mutations";

import { CANVAS_STYLES } from "../components/graph/styles/canvasStyles";

import {
  NON_ROOT_DEFAULT_OPTIONS,  // ← 1️⃣ single source-of-truth sizes
  NODE_WIDTH_UNITS,
  NODE_HEIGHT_UNITS,
  GRID_SIZE
} from "../components/graph/utils/elk/elkOptions";

/* -------------------------------------------------- */
/* 🔹 1.  ELK instance                                */
/* -------------------------------------------------- */
const elk = new ELK();

/* -------------------------------------------------- */
/* 🔹 2.  hook                                         */
/* -------------------------------------------------- */
export function useElkToReactflowGraphConverter(initialRaw: RawGraph, selectedTool: string = 'arrow') {
  /* 1) raw‐graph state */
  const [rawGraph, setRawGraphState] = useState<RawGraph>(initialRaw);
  const rawGraphRef = useRef<RawGraph>(initialRaw);
  
  /* 2) layouted‐graph state */
  const [layoutGraph, setLayoutGraph] = useState<LayoutGraph|null>(null);
  
  /* 3) layout error state */
  const [layoutError, setLayoutError] = useState<string | null>(null);
  
  /* refs that NEVER cause re-render */
  const hashRef = useRef<string>(structuralHash(initialRaw));
  const abortRef = useRef<AbortController | null>(null);
  // Source is runtime-only, never persisted. Per FIGJAM_REFACTOR.md:
  // "source: ephemeral runtime context ('ai' | 'user'); not persisted"
  // 'free-structural' is for FREE mode structural changes (no ELK needed)
  const lastMutationRef = useRef<{ source: 'ai' | 'user' | 'free-structural'; scopeId: string; timestamp: number } | null>(null);
  const previousHashRef = useRef<string>(structuralHash(initialRaw));
  
  const shouldSkipFitViewRef = useRef<boolean>(false);
  
  /* react-flow state */
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [layoutVersion, incLayoutVersion] = useState(0);
  
  /* 4) view-state (authoritative geometry, prep for future phases) */
  const viewStateRef = useRef<ViewState>({
    node: {},
    group: {},
    edge: {},
  });
  const lastElkReasonRef = useRef<string | null>(null);
  const cloneViewState = (value: any) => {
    if (!value) return value;
    try {
      return JSON.parse(JSON.stringify(value));
    } catch (error) {
      console.warn('⚠️ [useElkToReactflow] Failed to clone viewState snapshot:', error);
      return value;
    }
  };
  
  /* -------------------------------------------------- */
  /* 🔹 3. mutate helper                                 */
  /* -------------------------------------------------- */
  type MutFn = (...a: any[]) => any;
  type MutateOptions = { source?: 'ai' | 'user' | 'free-structural'; scopeId?: string };
  
  const mutate = useCallback((...args: any[]) => {
    let fn: MutFn;
    let rest: any[];
    let options: MutateOptions = { source: 'user' };
    
    if (typeof args[0] === 'function') {
      fn = args[0] as MutFn;
      rest = args.slice(1);
    } else {
      options = { ...options, ...args[0] };
      fn = args[1] as MutFn;
      rest = args.slice(2);
    }
    
    // Read from ref, not React state
    const prev = rawGraphRef.current;
      if (!prev) {
        throw new Error(`Cannot mutate graph: graph state is null or undefined`);
      }
    
      const next = fn(...rest, prev) as RawGraph;

    // Update ref immediately
    rawGraphRef.current = next;
    hashRef.current = structuralHash(next);
    
    // Only update React state for AI mutations (triggers ELK)
    if (options.source === 'ai') {
      lastMutationRef.current = {
        source: 'ai',
        scopeId: options.scopeId || 'root',
        timestamp: Date.now()
      };
      setRawGraphState(next);
    }
  }, []);
  
  /* -------------------------------------------------- */
  /* 🔹 4.  mutation wrappers for mutate pattern       */
  /* -------------------------------------------------- */
  // The mutate function appends the current graph as the LAST parameter,
  // but mutations expect graph in different positions. Create wrappers:
  
  // addNode expects: (nodeName, parentId, graph, data?)
  // mutate calls: (nodeName, parentId, data?, graph)
  const addNodeWrapper = (nodeName: string, parentId: string, data: any, graph: RawGraph) => {
    return addNode(nodeName, parentId, graph, data);
  };
  
  // groupNodes expects: (nodeIds, parentId, groupId, graph, style?)
  // mutate calls: (nodeIds, parentId, groupId, style?, graph)
  const groupNodesWrapper = (nodeIds: any[], parentId: string, groupId: string, style: any, graph: RawGraph) => {
    // Filter out null/undefined/invalid node IDs
    const validNodeIds = nodeIds.filter((id): id is string => {
      if (!id || typeof id !== 'string') {
        console.warn('[groupNodesWrapper] Filtering out invalid node ID:', id);
        return false;
      }
      return true;
    });
    
    if (validNodeIds.length === 0) {
      throw new Error('Cannot create group: no valid node IDs provided');
    }
    
    // Ensure groupId is valid
    const validGroupId = groupId || `group-${Date.now()}`;
    
    return groupNodes(validNodeIds, parentId, validGroupId, graph, style);
  };
  
  // deleteNode expects: (nodeId, graph)
  // mutate calls: (nodeId, graph) - already correct
  
  // addEdge expects: (edgeId, sourceId, targetId, labelOrGraph?, sourceHandle?, targetHandle?, graph?)
  // mutate calls: (edgeId, sourceId, targetId, label?, sourceHandle?, targetHandle?, graph)
  // Create a wrapper that checks for duplicate edge IDs before calling addEdge
const addEdgeWrapper = (edgeId: string, sourceId: string, targetId: string, label: any, sourceHandle: any, targetHandle: any, graph: RawGraph) => {
    if (edgeIdExists(graph, edgeId)) {
      return graph;
    }
    return addEdge(edgeId, sourceId, targetId, label, sourceHandle, targetHandle, graph);
  };
  
  /* -------------------------------------------------- */
  /* 🔹 5.  exposed handlers                            */
  /* -------------------------------------------------- */
  const handlers = useMemo(() => ({
    // Backward compatible variants (no options) - using wrappers where needed
    handleAddNode     : (...a: any[]) => mutate(addNodeWrapper, ...a),
    handleDeleteNode  : (...a: any[]) => mutate(deleteNode,    ...a),
    handleMoveNode    : (...a: any[]) => mutate(moveNode,      ...a),
    handleAddEdge     : (...a: any[]) => mutate(addEdgeWrapper, ...a), // Use wrapper to prevent duplicates
    handleDeleteEdge  : (...a: any[]) => mutate(deleteEdge,    ...a),
    handleGroupNodes  : (...a: any[]) => mutate(groupNodesWrapper,    ...a),
    handleRemoveGroup : (...a: any[]) => mutate(removeGroup,   ...a),
    handleBatchUpdate : (...a: any[]) => mutate(batchUpdate,   ...a),
    // New option-aware variants (ignored for now)
    addNodeWith       : (opts: MutateOptions, ...a: any[]) => mutate(opts, addNodeWrapper, ...a),
    deleteNodeWith    : (opts: MutateOptions, ...a: any[]) => mutate(opts, deleteNode,     ...a),
    moveNodeWith      : (opts: MutateOptions, ...a: any[]) => mutate(opts, moveNode,       ...a),
    addEdgeWith       : (opts: MutateOptions, ...a: any[]) => mutate(opts, addEdge,        ...a),
    deleteEdgeWith    : (opts: MutateOptions, ...a: any[]) => mutate(opts, deleteEdge,     ...a),
    groupNodesWith    : (opts: MutateOptions, ...a: any[]) => mutate(opts, groupNodes,     ...a),
    removeGroupWith   : (opts: MutateOptions, ...a: any[]) => mutate(opts, removeGroup,    ...a),
    batchUpdateWith   : (opts: MutateOptions, ...a: any[]) => mutate(opts, batchUpdate,    ...a),
  }), [mutate]);
  
  const handleAddNodeLegacy = useCallback(
    (groupId: string) => {
      const newNodeId = `new-node-${Date.now()}`;
      const newNode: Node = {
        id: newNodeId,
        data: { label: 'New Node', isEditing: true },
        position: { x: 20, y: 20 },
        type: 'custom',
        parentNode: groupId,
        extent: 'parent' as const,
      };
      setNodes((nds) => [...nds, newNode]);
    },
    [setNodes]
  );

  const handleLabelChange = useCallback(
    (id: string, label: string) => {
      setNodes((nds) =>
        nds.map((node) => {
          if (node.id === id) {
            node.data = { ...node.data, label, isEditing: false };
          }
          return node;
        })
      );
    },
    [setNodes]
  );
  
  /* -------------------------------------------------- */
  /* 🔹 2b. raw graph setter (AI mode only)              */
  /* -------------------------------------------------- */
  const setRawGraph = useCallback((
    next: RawGraph | ((prev: RawGraph) => RawGraph),
    source?: 'ai' | 'user' | 'free-structural'
  ) => {
      let resolved = typeof next === 'function'
      ? (next as (p: RawGraph) => RawGraph)(rawGraphRef.current)
        : next;

    // ONLY remove viewState for AI graphs to trigger ELK layout
    // For 'user' and 'free-structural' sources, preserve viewState
    if (source === 'ai' && resolved && typeof resolved === 'object' && 'viewState' in resolved) {
          delete (resolved as any).viewState;
        }

    rawGraphRef.current = resolved;
    hashRef.current = structuralHash(resolved);

      lastMutationRef.current = {
      source: source || 'user',  // Use actual source, default to 'user'
        scopeId: 'external-setRawGraph',
        timestamp: Date.now(),
      };

    setRawGraphState(resolved);
  }, []);

  /* -------------------------------------------------- */
  /* 🔹 4.5 ELK-only trigger (no orchestration)        */
  /* -------------------------------------------------- */
  const triggerRender = useCallback(() => {
    incLayoutVersion(v => v + 1);
  }, []);
  
  // Keep rawGraphRef in sync with React state (for AI mode only)
  // FREE mode updates rawGraphRef directly and never calls setRawGraph
  useEffect(() => {
    rawGraphRef.current = rawGraph;
  }, [rawGraph]);

  /* -------------------------------------------------- */
  /* 🔹 5. layout side-effect                           */
  /* -------------------------------------------------- */
  useEffect(() => {
    const mutation = lastMutationRef.current;
    
    if (!rawGraph) return;
    
    // Per FIGJAM_REFACTOR.md: ELK runs when:
    // 1. Source is 'ai' (AI mutations always trigger ELK for their scope)
    // 2. Or, the graph has LOCK groups (structural changes inside LOCK trigger ELK)
    // This ensures source-agnostic behavior - mode determines long-term behavior
    const hasLockGroups = (() => {
      const findLock = (node: any): boolean => {
        if (node.mode === 'LOCK') return true;
        if (node.children) {
          return node.children.some((c: any) => findLock(c));
        }
        return false;
      };
      return findLock(rawGraph);
    })();
    
    // Skip ELK if neither AI source nor LOCK groups exist
    if (mutation?.source !== 'ai' && !hasLockGroups) return;
    
    const currentHash = hashRef.current;
    previousHashRef.current = currentHash;
    
    /* cancel any in-flight run */
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    
    const hashAtStart = hashRef.current;
    
    (async () => {
      try {
        
        // Clear any previous layout errors
        setLayoutError(null);
        
        // Validate graph structure before processing
        const validateGraph = (node: any, visited = new Set()): boolean => {
          if (!node || typeof node !== 'object') return false;
          if (visited.has(node)) return false; // Prevent cycles
          visited.add(node);
          
          if (!node.id || typeof node.id !== 'string') {
            console.error("[ELK] Invalid node - missing or invalid ID:", node);
            return false;
          }
          
          // Validate children
          if (node.children) {
            if (!Array.isArray(node.children)) {
              console.error("[ELK] Invalid node - children is not an array:", node);
              return false;
            }
            for (const child of node.children) {
              if (!validateGraph(child, visited)) return false;
            }
          }
          
          // Validate edges
          if (node.edges) {
            if (!Array.isArray(node.edges)) {
              console.error("[ELK] Invalid node - edges is not an array:", node);
              return false;
            }
            for (const edge of node.edges) {
              if (!edge.id || !edge.sources || !edge.targets) {
                console.error("[ELK] Invalid edge:", edge);
                return false;
              }
            }
          }
          
          return true;
        };
        
        if (!validateGraph(rawGraph)) {
          throw new Error("Graph validation failed - invalid structure detected");
        }
        
        // 1) Extract mode map from rawGraph BEFORE ELK (preserve mode field)
        // Phase 4: Migrate and sync ViewState.layout with graph structure
        if (!viewStateRef.current.layout || Object.keys(viewStateRef.current.layout).length === 0) {
          viewStateRef.current = migrateModeDomainToViewState(rawGraph, viewStateRef.current);
        } else {
          // Sync to ensure all groups have modes (for newly created groups)
          viewStateRef.current = syncViewStateLayoutWithGraph(rawGraph, viewStateRef.current);
        }
        
        // 2) inject IDs + elkOptions onto a clone of rawGraph
        // Node dimensions and spacing are now in UNITS (small integers)
        const prepared = ensureIds(structuredClone(rawGraph));
        
        // 3) run ELK (mode no longer in ELK input/output - stays in ViewState)
        const layoutRaw = await elk.layout(prepared);
        
        // 4) Scale all coordinates by GRID_SIZE (16) to get pixel values
        // ELK computed in units, now we convert to pixels
        const layout = scaleElkOutput(layoutRaw);
        
        // Critical: Check if ELK returned zero positions - this indicates a layout failure
        const zeroPosChildren = (layout.children || []).filter((c: any) => (c.x === 0 && c.y === 0));
        if (zeroPosChildren.length > 0 && zeroPosChildren.length === (layout.children || []).length) {
          // All nodes at 0,0 - ELK layout failed
          throw new Error(`ELK layout failed: all ${zeroPosChildren.length} nodes positioned at (0,0). Graph structure may be invalid.`);
        }
        
        /* stale result? – ignore */
        if (hashAtStart !== hashRef.current) return;
        
        // 3) store for SVG & RF conversion
        setLayoutGraph(layout as LayoutGraph);
        
        // 4) Ensure ViewState exists - populate geometry for ALL nodes from ELK
        // CRITICAL: Always extract geometry for new nodes/groups created by AI
        // Previously only initialized when empty - now always sync with ELK output
        // CRITICAL: Read ViewState AFTER restore has completed (restore sets viewStateRef.current)
        // This ensures we preserve restored positions, handles, and waypoints
        const currentViewState = viewStateRef.current || { node: {}, group: {}, edge: {} };
        
        // Start with existing ViewState geometry (preserve manually moved positions AND restored positions)
        // CRITICAL: Preserve ALL existing ViewState to prevent overwriting restored data
        // Deep clone to ensure we don't mutate the original
        const nextNodeState: Record<string, { x: number; y: number; w: number; h: number }> = 
          currentViewState.node ? JSON.parse(JSON.stringify(currentViewState.node)) : {};
        const nextGroupState: Record<string, { x: number; y: number; w: number; h: number }> = 
          currentViewState.group ? JSON.parse(JSON.stringify(currentViewState.group)) : {};
        
        {
          // ALWAYS sync with ELK output to ensure new nodes/groups get geometry
          
          // Helper to recursively extract geometry from ELK layout
          const extractGeometry = (elkNode: any, parentX = 0, parentY = 0) => {
            // Detect groups: has NON-EMPTY children OR has isGroup flag
            // Note: Empty children array means leaf node, not a group
            const hasRealChildren = Array.isArray(elkNode.children) && elkNode.children.length > 0;
            const hasRealEdges = Array.isArray(elkNode.edges) && elkNode.edges.length > 0;
            const isGroup = 
              elkNode.data?.isGroup === true || 
              hasRealChildren ||  // Groups have children with content
              hasRealEdges;       // Groups have edges to contain
            
            // PROBLEM 2 FIX: ELK returns RELATIVE positions, must add parent absolute to get world absolute
            const elkRelativeX = elkNode.x ?? 0;
            const elkRelativeY = elkNode.y ?? 0;
            const absoluteX = elkRelativeX + parentX;  // ✅ FIXED: ELK relative + parent absolute = world absolute
            const absoluteY = elkRelativeY + parentY;  // ✅ FIXED: ELK relative + parent absolute = world absolute
            
            const width = elkNode.width ?? (isGroup ? NODE_WIDTH_UNITS * GRID_SIZE * 3 : NODE_WIDTH_UNITS * GRID_SIZE);
            const height = elkNode.height ?? (isGroup ? NODE_HEIGHT_UNITS * GRID_SIZE * 3 : NODE_HEIGHT_UNITS * GRID_SIZE);
            
            const geom = { 
              x: absoluteX, 
              y: absoluteY, 
              w: width, 
              h: height 
            };
            
            // Only add geometry for NEW nodes/groups - preserve existing positions (manually moved)
            if (isGroup) {
              if (!nextGroupState[elkNode.id]) {
                nextGroupState[elkNode.id] = geom;
              }
            } else {
              if (!nextNodeState[elkNode.id]) {
                nextNodeState[elkNode.id] = geom;
              }
            }
            
            // Recursively process children - pass this node's absolute position as parent
            // Now that absoluteX/Y are correctly calculated, children will use correct parent absolute
            if (elkNode.children) {
              elkNode.children.forEach((child: any) => {
                extractGeometry(child, absoluteX, absoluteY);
              });
            }
          };
          
          // Extract geometry from ELK layout
          if (layout.children) {
            layout.children.forEach((child: any) => {
              extractGeometry(child);
            });
          }
          
          // CRITICAL FIX: Ensure ALL groups from rawGraph get geometry, even if ELK didn't position them
          // This handles empty groups that ELK might skip
          const ensureAllGroupsHaveGeometry = (node: any, parentX = 0, parentY = 0) => {
            const nodeId = node.id;
            // A node is a group if it has isGroup flag OR has a children property (even if empty)
            // Empty children array means it's an empty group, not a leaf node
            const isGroup = node.data?.isGroup === true || ('children' in node);
            
            // Only process groups, and only if they don't already have geometry
            if (isGroup && !nextGroupState[nodeId]) {
              // Try to find this group in the ELK layout to get its position
              const findInLayout = (elkNode: any): any => {
                if (elkNode.id === nodeId) return elkNode;
                if (elkNode.children) {
                  for (const child of elkNode.children) {
                    const found = findInLayout(child);
                    if (found) return found;
                  }
                }
                return null;
              };
              
              const elkGroup = findInLayout(layout);
              
              if (elkGroup) {
                // Group was in ELK output - should have been processed above
                // This shouldn't happen, but handle it gracefully
                const absoluteX = (elkGroup.x ?? 0) + parentX;
                const absoluteY = (elkGroup.y ?? 0) + parentY;
                nextGroupState[nodeId] = {
                  x: absoluteX,
                  y: absoluteY,
                  w: elkGroup.width ?? (NODE_WIDTH_UNITS * GRID_SIZE * 3),
                  h: elkGroup.height ?? (NODE_HEIGHT_UNITS * GRID_SIZE * 3)
                };
              } else {
                // Group was NOT in ELK output (likely empty) - create default geometry
                // Use a default position relative to parent or at origin
                const defaultX = parentX;
                const defaultY = parentY;
                nextGroupState[nodeId] = {
                  x: defaultX,
                  y: defaultY,
                  w: NODE_WIDTH_UNITS * GRID_SIZE * 3,
                  h: NODE_HEIGHT_UNITS * GRID_SIZE * 3
                };
              }
            }
            
            // Recursively process children
            if (node.children) {
              const parentPos = nextGroupState[nodeId] 
                ? { x: nextGroupState[nodeId].x, y: nextGroupState[nodeId].y }
                : { x: parentX, y: parentY };
              node.children.forEach((child: any) => ensureAllGroupsHaveGeometry(child, parentPos.x, parentPos.y));
            }
          };
          
          // Ensure all groups from rawGraph have geometry
          if (rawGraph.children) {
            rawGraph.children.forEach((child: any) => {
              ensureAllGroupsHaveGeometry(child);
            });
          }
          
          // Extract edge waypoints from ELK layout output
          // After scaleElkOutput, coordinates are in absolute pixels
          // Top-level edges are already absolute, nested edges need parent offset
          // CRITICAL: Preserve existing edge state (handles, waypoints from persistence)
          // Only add NEW waypoints for edges that don't already have them
          // Deep clone to ensure we don't mutate the original
          const nextEdgeState: Record<string, any> = 
            currentViewState.edge ? JSON.parse(JSON.stringify(currentViewState.edge)) : {};
          
          // Helper to extract waypoints from ELK edge sections
          const extractWaypointsFromElkEdge = (edge: any, offsetX: number = 0, offsetY: number = 0): Array<{ x: number; y: number }> | null => {
            if (!edge.sections || edge.sections.length === 0) return null;
            
            const waypoints: Array<{ x: number; y: number }> = [];
            edge.sections.forEach((section: any) => {
              // After scaleElkOutput, coordinates are in pixels
              // Add offset for nested edges (top-level edges have offset 0,0)
              if (section.startPoint) {
                waypoints.push({ 
                  x: section.startPoint.x + offsetX, 
                  y: section.startPoint.y + offsetY 
                });
              }
              if (section.bendPoints) {
                waypoints.push(...section.bendPoints.map((bp: any) => ({
                  x: bp.x + offsetX,
                  y: bp.y + offsetY
                })));
              }
              if (section.endPoint) {
                waypoints.push({ 
                  x: section.endPoint.x + offsetX, 
                  y: section.endPoint.y + offsetY 
                });
              }
            });
            
            // Validate orthogonal (no diagonal segments)
            if (waypoints.length >= 2) {
              const tolerance = 1;
              for (let i = 1; i < waypoints.length; i++) {
                const prev = waypoints[i - 1];
                const curr = waypoints[i];
                const xDiff = Math.abs(curr.x - prev.x);
                const yDiff = Math.abs(curr.y - prev.y);
                if (xDiff > tolerance && yDiff > tolerance) {
                  // Diagonal segment - don't store
                  return null;
                }
              }
              return waypoints;
            }
            return null;
          };
          
          // Extract waypoints from top-level edges (already absolute after scaleElkOutput)
          // CRITICAL: Always preserve existing edge state (handles, waypoints from persistence)
          // Only add waypoints if they don't exist - never overwrite handles
          if (layout.edges && layout.edges.length > 0) {
            layout.edges.forEach((edge: any) => {
              const existingEdgeState = nextEdgeState[edge.id] || {};
              // Only extract waypoints if edge doesn't already have valid waypoints
              // Always preserve handles and other properties
              if (!existingEdgeState.waypoints || existingEdgeState.waypoints.length < 2) {
                const waypoints = extractWaypointsFromElkEdge(edge, 0, 0);
                if (waypoints && waypoints.length >= 2) {
                  nextEdgeState[edge.id] = {
                    ...existingEdgeState, // Preserve handles, sourceHandle, targetHandle, etc.
                    waypoints
                  };
                } else if (!nextEdgeState[edge.id]) {
                  // Edge doesn't exist yet - create entry to preserve handles if they exist later
                  nextEdgeState[edge.id] = { ...existingEdgeState };
                }
              }
            });
          }
          
          // Extract waypoints from nested edges (recursively)
          // Nested edges need parent position offset since they're relative to parent
          const extractFromNode = (node: any, parentAbsoluteX: number = 0, parentAbsoluteY: number = 0) => {
            // Node's absolute position = parent absolute + node relative
            const nodeAbsoluteX = (node.x || 0) + parentAbsoluteX;
            const nodeAbsoluteY = (node.y || 0) + parentAbsoluteY;
            
            // Extract edges from this node (edges are relative to node, so add node position)
            // CRITICAL: Always preserve existing edge state (handles, waypoints from persistence)
            // Only add waypoints if they don't exist - never overwrite handles
            if (node.edges && node.edges.length > 0) {
              node.edges.forEach((edge: any) => {
                const existingEdgeState = nextEdgeState[edge.id] || {};
                // Only extract waypoints if edge doesn't already have valid waypoints
                // Always preserve handles and other properties
                if (!existingEdgeState.waypoints || existingEdgeState.waypoints.length < 2) {
                  const waypoints = extractWaypointsFromElkEdge(edge, nodeAbsoluteX, nodeAbsoluteY);
                  if (waypoints && waypoints.length >= 2) {
                    nextEdgeState[edge.id] = {
                      ...existingEdgeState, // Preserve handles, sourceHandle, targetHandle, etc.
                      waypoints
                    };
                  } else if (!nextEdgeState[edge.id]) {
                    // Edge doesn't exist yet - create entry to preserve handles if they exist later
                    nextEdgeState[edge.id] = { ...existingEdgeState };
                  }
                }
              });
            }
            
            // Recursively process children
            if (node.children) {
              node.children.forEach((child: any) => {
                extractFromNode(child, nodeAbsoluteX, nodeAbsoluteY);
              });
            }
          };
          
          // Extract from all top-level children
          if (layout.children) {
            layout.children.forEach((child: any) => {
              extractFromNode(child, 0, 0);
            });
          }
          
          // CRITICAL: Merge edge state instead of replacing it
          // This ensures that edges saved by persistence useEffect are preserved
          // even if waypoint extraction doesn't find waypoints yet
          const mergedEdgeState = {
            ...currentViewState.edge, // Preserve existing edges (from persistence)
            ...nextEdgeState // Add/update edges with waypoints
          };
          
          viewStateRef.current = { 
            node: nextNodeState, 
            group: nextGroupState, 
            edge: mergedEdgeState // Merge instead of replace
          };
          
        }
        
        // 5) Convert to ReactFlow using adapter (reads from ViewState, not ELK)
        // Dimensions are in PIXELS (units × GRID_SIZE)
        const nodeWidthPx = NODE_WIDTH_UNITS * GRID_SIZE;  // 6 × 16 = 96px
        const nodeHeightPx = NODE_HEIGHT_UNITS * GRID_SIZE; // 6 × 16 = 96px
        const dimensions = {
          width: nodeWidthPx,
          height: nodeHeightPx,
          groupWidth: nodeWidthPx * 3,
          groupHeight: nodeHeightPx * 3,
          padding: GRID_SIZE  // 16px padding
        };
        
        const { nodes: rfNodes, edges: rfEdges } = toReactFlowWithViewState(
          layout,
          dimensions,
          viewStateRef.current,
          { strictGeometry: true }
        );
        
        // Critical: Check if ReactFlow nodes have zero positions after conversion
        const zeroPosNodes = rfNodes.filter(n => n.position.x === 0 && n.position.y === 0);
        if (zeroPosNodes.length > 0 && zeroPosNodes.length === rfNodes.length) {
          // All nodes at 0,0 - conversion failed
          throw new Error(`Position conversion failed: all ${zeroPosNodes.length} ReactFlow nodes positioned at (0,0). ELK layout may have failed.`);
        }


        setNodes(rfNodes);
        setEdges(rfEdges);
        
        // ViewState is now the source of truth - no backwards population needed
        incLayoutVersion(v => v + 1);
      } catch (e: any) {
        if (e.name !== "AbortError") {
          console.error("[ELK] layout failed", e);
          console.error("[ELK] Raw graph that caused failure:", JSON.stringify(rawGraph, null, 2));
          
          // Set the error state so it can be accessed by components
          setLayoutError(e.message || e.toString());
          
          // NO FALLBACK - Let it fail loudly so we can fix the actual issue
          throw new Error(`ELK layout failed: ${e.message}. Fix the graph structure instead of using fallbacks.`);
        }
      }
    })();
    
    return () => ac.abort();
  }, [rawGraph]); // Only depend on rawGraph, not selectedTool - tool changes shouldn't trigger graph processing
  
  /* -------------------------------------------------- */
  /* 🔹 6. react-flow helpers                           */
  /* -------------------------------------------------- */
  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      const GRID_SIZE = 16;
      const snap = (v: number) => Math.round(v / GRID_SIZE) * GRID_SIZE;
      const snapPos = (p: { x: number; y: number }) => ({ x: snap(p.x), y: snap(p.y) });

      // Snap position changes to grid
      const snappedChanges = changes.map((ch) => {
        if (ch.type === 'position' && (ch as any).position) {
          const pos = (ch as any).position as { x: number; y: number };
          const snapped = snapPos(pos);
          return { ...ch, position: snapped } as NodeChange;
        }
        return ch;
      });

      setNodes((nodesState) => applyNodeChanges(snappedChanges, nodesState));
    },
    []
  );
  
  const onEdgesChange = useCallback(
    (c: EdgeChange[]) => setEdges(e => applyEdgeChanges(c, e)), []);
  
  // Track pending connections to prevent duplicates
  const pendingConnectionsRef = useRef<Set<string>>(new Set());
  // Track pending edge IDs to prevent duplicate edge creation
  const pendingEdgeIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).__elkState = {
        rawGraph,
        layoutGraph,
        nodes,
        edges,
        viewStateRef,
      };
    }
  }, [rawGraph, layoutGraph, nodes, edges]);
  
  const onConnect: OnConnect = useCallback(({ source, target, sourceHandle, targetHandle }: Connection) => {
    if (!source || !target) {
      return;
    }

    const connectionKey = `${source}:${sourceHandle || ''}->${target}:${targetHandle || ''}`;
    if (pendingConnectionsRef.current.has(connectionKey)) {
      return;
    }

    pendingConnectionsRef.current.add(connectionKey);

    const counter = Date.now();
    const random = Math.random().toString(36).slice(2, 11);
    const id = `edge-${counter}-${random}`;

    if (pendingEdgeIdsRef.current.has(id)) {
      pendingConnectionsRef.current.delete(connectionKey);
      return;
    }

    pendingEdgeIdsRef.current.add(id);

    try {
      handlers.handleAddEdge(id, source, target, undefined, sourceHandle || undefined, targetHandle || undefined);
    } catch (error) {
      console.error('❌ [onConnect] Failed to create edge:', error);
      pendingConnectionsRef.current.delete(connectionKey);
      pendingEdgeIdsRef.current.delete(id);
      throw error;
    }

    setTimeout(() => {
      pendingConnectionsRef.current.delete(connectionKey);
      pendingEdgeIdsRef.current.delete(id);
    }, 100);
  }, [handlers]);
  
  /* -------------------------------------------------- */
  /* 🔹 7. public API                                   */
  /* -------------------------------------------------- */
  return {
    rawGraph, layoutGraph, layoutError, nodes, edges, layoutVersion,
    setRawGraph, setNodes, setEdges,
    viewStateRef, rawGraphRef,
    shouldSkipFitViewRef,  // Expose ref so InteractiveCanvas can check if fitView should be skipped
    ...handlers,
    onNodesChange, onEdgesChange, onConnect,
    handleAddNodeLegacy: handleAddNodeLegacy,
    handleLabelChange,
  } as const;
}
