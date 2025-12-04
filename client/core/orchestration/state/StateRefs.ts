/**
 * Centralized State References for Orchestrator
 * 
 * These refs are the bridge between React state and the Orchestrator.
 * FREE mode handlers use these directly, bypassing useElkToReactflowGraphConverter.
 * 
 * IMPORTANT: 
 * - These are initialized by InteractiveCanvas on mount
 * - FREE mode: Update refs directly, render via setNodesRef/setEdgesRef
 * - AI/LOCK mode: May use setGraphRef to trigger ELK
 */

import type { RawGraph } from '../../../components/graph/types/index';
import type { ViewState } from '../../viewstate/ViewState';
import type { Node, Edge } from 'reactflow';

export interface StateRefs {
  /** Domain graph ref - source of truth for structure */
  graphStateRef: { current: RawGraph | null };
  
  /** ViewState ref - source of truth for geometry */
  viewStateRef: { current: ViewState };
  
  /** Trigger re-render (legacy, prefer setNodesRef/setEdgesRef) */
  renderTriggerRef: { current: (() => void) | null };
  
  /** Set graph state (goes through ELK hook - use ONLY for AI mode) */
  setGraphRef: { current: ((graph: RawGraph, source?: 'ai' | 'user' | 'free-structural') => void) | null };
  
  /** Set ReactFlow nodes directly (bypasses ELK - use for FREE mode) */
  setNodesRef: { current: ((nodes: Node[]) => void) | null };
  
  /** Set ReactFlow edges directly (bypasses ELK - use for FREE mode) */
  setEdgesRef: { current: ((edges: Edge[]) => void) | null };
}

// Global state refs (initialized by InteractiveCanvas)
let _stateRefs: StateRefs = {
  graphStateRef: { current: null },
  viewStateRef: { current: { node: {}, group: {}, edge: {} } },
  renderTriggerRef: { current: null },
  setGraphRef: { current: null },
  setNodesRef: { current: null },
  setEdgesRef: { current: null },
};

/**
 * Initialize state refs from InteractiveCanvas
 */
export function initializeStateRefs(
  graphRef: { current: RawGraph | null },
  vsRef: { current: ViewState },
  renderTrigger: () => void,
  setGraph?: (graph: RawGraph, source?: 'ai' | 'user' | 'free-structural') => void,
  setNodes?: (nodes: Node[]) => void,
  setEdges?: (edges: Edge[]) => void
): void {
  _stateRefs = {
    graphStateRef: graphRef,
    viewStateRef: vsRef,
    renderTriggerRef: { current: renderTrigger },
    setGraphRef: { current: setGraph || null },
    setNodesRef: { current: setNodes || null },
    setEdgesRef: { current: setEdges || null },
  };
}

/**
 * Get current state refs for handlers
 */
export function getStateRefs(): StateRefs {
  return _stateRefs;
}

/**
 * Check if state refs are initialized
 */
export function isInitialized(): boolean {
  return _stateRefs.graphStateRef.current !== null;
}

