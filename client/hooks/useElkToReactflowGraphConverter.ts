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
import { processLayoutedGraph } from "../components/graph/utils/toReactFlow";

import {
  addNode, deleteNode, moveNode,
  addEdge, deleteEdge,
  groupNodes, removeGroup,
  batchUpdate
} from "../components/graph/mutations";

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
export function useElkToReactflowGraphConverter(initialRaw: RawGraph) {
  /* 1) raw‐graph state */
  const [rawGraph, setRawGraph] = useState<RawGraph>(initialRaw);
  
  /* 2) layouted‐graph state */
  const [layoutGraph, setLayoutGraph] = useState<LayoutGraph|null>(null);
  
  /* 3) layout error state */
  const [layoutError, setLayoutError] = useState<string | null>(null);
  
  /* refs that NEVER cause re-render */
  const hashRef = useRef<string>(structuralHash(initialRaw));
  const abortRef = useRef<AbortController | null>(null);
  
  /* react-flow state */
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [layoutVersion, incLayoutVersion] = useState(0);
  
  /* 4) view-state (authoritative geometry, prep for future phases) */
  const viewStateRef = useRef<{ node: Record<string, { x: number; y: number; w: number; h: number }>; group: Record<string, { x: number; y: number; w: number; h: number }>; edge: Record<string, { waypoints?: Array<{ x: number; y: number }> }> }>({
    node: {},
    group: {},
    edge: {},
  });
  
  /* -------------------------------------------------- */
  /* 🔹 3. mutate helper (sync hash update)              */
  /* -------------------------------------------------- */
  type MutFn = (...a: any[]) => any;
  type MutateOptions = { source?: 'ai' | 'user'; scopeId?: string };
  
  // Pass-through mutate wrapper that accepts optional options as the first arg.
  // For Phase 0.3 this is ignored (no behavior change).
  const mutate = useCallback((...args: any[]) => {
    let fn: MutFn;
    let rest: any[];
    if (typeof args[0] === 'function') {
      fn = args[0] as MutFn;
      rest = args.slice(1);
    } else {
      // args[0] could be options; ignore for now
      fn = args[1] as MutFn;
      rest = args.slice(2);
    }
    setRawGraph(prev => {
      const next = fn(...rest, prev) as RawGraph;
      hashRef.current = structuralHash(next);
      return next;
    });
  }, []);
  
  /* -------------------------------------------------- */
  /* 🔹 4.  exposed handlers                            */
  /* -------------------------------------------------- */
  const handlers = useMemo(() => ({
    // Backward compatible variants (no options)
    handleAddNode     : (...a: any[]) => mutate(addNode,      ...a),
    handleDeleteNode  : (...a: any[]) => mutate(deleteNode,   ...a),
    handleMoveNode    : (...a: any[]) => mutate(moveNode,     ...a),
    handleAddEdge     : (...a: any[]) => mutate(addEdge,      ...a),
    handleDeleteEdge  : (...a: any[]) => mutate(deleteEdge,   ...a),
    handleGroupNodes  : (...a: any[]) => mutate(groupNodes,   ...a),
    handleRemoveGroup : (...a: any[]) => mutate(removeGroup,  ...a),
    handleBatchUpdate : (...a: any[]) => mutate(batchUpdate,  ...a),
    // New option-aware variants (ignored for now)
    addNodeWith       : (opts: MutateOptions, ...a: any[]) => mutate(opts, addNode,     ...a),
    deleteNodeWith    : (opts: MutateOptions, ...a: any[]) => mutate(opts, deleteNode,  ...a),
    moveNodeWith      : (opts: MutateOptions, ...a: any[]) => mutate(opts, moveNode,    ...a),
    addEdgeWith       : (opts: MutateOptions, ...a: any[]) => mutate(opts, addEdge,     ...a),
    deleteEdgeWith    : (opts: MutateOptions, ...a: any[]) => mutate(opts, deleteEdge,  ...a),
    groupNodesWith    : (opts: MutateOptions, ...a: any[]) => mutate(opts, groupNodes,  ...a),
    removeGroupWith   : (opts: MutateOptions, ...a: any[]) => mutate(opts, removeGroup, ...a),
    batchUpdateWith   : (opts: MutateOptions, ...a: any[]) => mutate(opts, batchUpdate, ...a),
  }), [mutate]);
  
  const handleAddNode = useCallback(
    (groupId: string) => {
      const newNodeId = `new-node-${Date.now()}`;
      const newNode = {
        id: newNodeId,
        data: { label: 'New Node', isEditing: true },
        position: { x: 20, y: 20 },
        type: 'custom',
        parentNode: groupId,
        extent: 'parent',
      };
      setNodes((nds) => nds.concat(newNode));
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
  /* 🔹 5. layout side-effect                           */
  /* -------------------------------------------------- */
  useEffect(() => {
    if (!rawGraph) return;
    
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
        
        // 1) inject IDs + elkOptions onto a clone of rawGraph
        const prepared = ensureIds(structuredClone(rawGraph));
        
        // 2) run ELK
        const layout = await elk.layout(prepared);
        
        /* stale result? – ignore */
        if (hashAtStart !== hashRef.current) return;
        
        // 3) store for SVG & RF conversion
        setLayoutGraph(layout as LayoutGraph);
        
        // 4) convert to ReactFlow nodes/edges
        const { nodes: rfNodes, edges: rfEdges } =
          processLayoutedGraph(layout, {
            width      : NON_ROOT_DEFAULT_OPTIONS.width,
            height     : NON_ROOT_DEFAULT_OPTIONS.height,
            groupWidth : NON_ROOT_DEFAULT_OPTIONS.width  * 3,
            groupHeight: NON_ROOT_DEFAULT_OPTIONS.height * 3,
            padding    : 10
          });
        
        setNodes(rfNodes);
        setEdges(rfEdges);

        // Populate viewStateRef from ELK output (no behavior change)
        const nextNodeState: Record<string, { x: number; y: number; w: number; h: number }> = {};
        const nextGroupState: Record<string, { x: number; y: number; w: number; h: number }> = {};
        for (const n of rfNodes) {
          const geom = { x: n.position.x, y: n.position.y, w: (n as any).width ?? 0, h: (n as any).height ?? 0 };
          // Heuristic: treat nodes with type 'group' as groups; others as nodes
          if ((n as any).type === 'group') {
            nextGroupState[n.id] = geom;
          } else {
            nextNodeState[n.id] = geom;
          }
        }
        viewStateRef.current = { node: nextNodeState, group: nextGroupState, edge: {} };
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
  }, [rawGraph]);
  
  /* -------------------------------------------------- */
  /* 🔹 6. react-flow helpers                           */
  /* -------------------------------------------------- */
  // Snap-to-grid for interactive moves (dragging etc.)
  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      const GRID_SIZE = 16;
      const snap = (v: number) => Math.round(v / GRID_SIZE) * GRID_SIZE;
      const snapPos = (p: { x: number; y: number }) => ({ x: snap(p.x), y: snap(p.y) });

      const snappedChanges = changes.map((ch) => {
        if (ch.type === 'position' && (ch as any).position) {
          const pos = (ch as any).position as { x: number; y: number };
          return { ...ch, position: snapPos(pos) } as NodeChange;
        }
        return ch;
      });

      setNodes((nodesState) => applyNodeChanges(snappedChanges, nodesState));
    },
    []
  );
  
  const onEdgesChange = useCallback(
    (c: EdgeChange[]) => setEdges(e => applyEdgeChanges(c, e)), []);
  
  const onConnect: OnConnect = useCallback(({ source, target }: Connection) => {
    if (!source || !target) return;
    const id = `edge-${Math.random().toString(36).slice(2, 9)}`;
    handlers.handleAddEdge(id, source, target);
  }, [handlers]);
  
  /* -------------------------------------------------- */
  /* 🔹 7. public API                                   */
  /* -------------------------------------------------- */
  return {
    rawGraph, layoutGraph, layoutError, nodes, edges, layoutVersion,
    setRawGraph, setNodes, setEdges,
    viewStateRef,
    ...handlers,
    onNodesChange, onEdgesChange, onConnect,
    handleAddNode,
    handleLabelChange,
  } as const;
}
