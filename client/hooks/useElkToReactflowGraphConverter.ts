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
  NON_ROOT_DEFAULT_OPTIONS   // ← 1️⃣ single source-of-truth sizes
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
  const lastMutationRef = useRef<{ source: 'ai' | 'user'; scopeId: string; timestamp: number } | null>(null);
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
  type MutateOptions = { source?: 'ai' | 'user'; scopeId?: string };
  
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
    if (mutation?.source !== 'ai') return;
    
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
        const prepared = ensureIds(structuredClone(rawGraph));
        
        // 3) run ELK (mode no longer in ELK input/output - stays in ViewState)
        const layout = await elk.layout(prepared);
        
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
        
        // 4) Ensure ViewState exists - initialize from ELK output ONCE if empty
        const currentViewState = viewStateRef.current;
        const hasViewStateGeometry = 
          (Object.keys(currentViewState?.node || {}).length > 0) ||
          (Object.keys(currentViewState?.group || {}).length > 0);
        
        if (!hasViewStateGeometry) {
          // Initialize ViewState from ELK output ONCE
          // This is the only time we populate ViewState from ELK
          const nextNodeState: Record<string, { x: number; y: number; w: number; h: number }> = {};
          const nextGroupState: Record<string, { x: number; y: number; w: number; h: number }> = {};
          
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
            
            const width = elkNode.width ?? (isGroup ? NON_ROOT_DEFAULT_OPTIONS.width * 3 : NON_ROOT_DEFAULT_OPTIONS.width);
            const height = elkNode.height ?? (isGroup ? 96 * 3 : 96);
            
            const geom = { 
              x: absoluteX, 
              y: absoluteY, 
              w: width, 
              h: height 
            };
            
            // PROBLEM 2 DEBUGGING: Log ALL groups being written (including scope root children)
            const isNested = parentX !== 0 || parentY !== 0;
            if (isGroup) {
              console.log('[🎯COORD] ELK-CONVERTER - WRITING group to ViewState:', {
                nodeId: elkNode.id,
                isScopeRootChild: !isNested,
                isNested,
                elkRelative: `${elkRelativeX},${elkRelativeY}`,
                parentAbsolute: `${parentX},${parentY}`,
                calculatedAbsolute: `${absoluteX},${absoluteY}`,
                shouldBeAbsolute: isNested ? `${elkRelativeX + parentX},${elkRelativeY + parentY}` : `${elkRelativeX},${elkRelativeY}`,
                problem2_detected: isNested && (Math.abs(absoluteX - (elkRelativeX + parentX)) > 1 || Math.abs(absoluteY - (elkRelativeY + parentY)) > 1)
                  ? '⚠️ PROBLEM 2: ELK relative not added to parent absolute!'
                  : 'OK',
                writingToViewState: `${absoluteX},${absoluteY}`,
              });
            }
            
            if (isGroup) {
              nextGroupState[elkNode.id] = geom;
            } else {
              nextNodeState[elkNode.id] = geom;
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
          
          viewStateRef.current = { 
            node: nextNodeState, 
            group: nextGroupState, 
            edge: {} 
          };
          
        }
        
        // 5) Convert to ReactFlow using adapter (reads from ViewState, not ELK)
        const dimensions = {
          width: NON_ROOT_DEFAULT_OPTIONS.width,
          height: 96,
          groupWidth: NON_ROOT_DEFAULT_OPTIONS.width * 3,
          groupHeight: 96 * 3,
          padding: 10
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
