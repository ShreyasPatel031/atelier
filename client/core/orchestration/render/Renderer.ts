/**
 * Renderer - Coordinates ReactFlow updates
 * 
 * This module provides utilities for rendering to ReactFlow
 * while bypassing useElkToReactflowGraphConverter for FREE mode.
 * 
 * Use these functions instead of setRawGraph for FREE mode operations.
 */

import type { Node, Edge } from 'reactflow';
import type { RawGraph } from '../../../components/graph/types/index';
import type { ViewState } from '../../viewstate/ViewState';
import { getStateRefs } from '../state/StateRefs';

export interface RenderDimensions {
  width: number;
  height: number;
  groupWidth: number;
  groupHeight: number;
  padding: number;
}

const DEFAULT_DIMENSIONS: RenderDimensions = {
  width: 96,
  height: 96,
  groupWidth: 200,
  groupHeight: 150,
  padding: 16,
};

/**
 * Render domain graph + ViewState to ReactFlow
 * 
 * This BYPASSES useElkToReactflowGraphConverter entirely.
 * Use for all FREE mode operations.
 */
export async function renderToReactFlow(
  graph: RawGraph,
  viewState: ViewState,
  dimensions: RenderDimensions = DEFAULT_DIMENSIONS
): Promise<{ nodes: Node[]; edges: Edge[] }> {
  const { convertViewStateToReactFlow } = await import('../../renderer/ViewStateToReactFlow');
  return convertViewStateToReactFlow(graph, viewState, dimensions);
}

/**
 * Render and update ReactFlow nodes/edges directly
 * 
 * This is the primary rendering function for FREE mode.
 * It bypasses the ELK hook entirely.
 */
export async function renderDirect(
  graph: RawGraph,
  viewState: ViewState,
  dimensions: RenderDimensions = DEFAULT_DIMENSIONS
): Promise<void> {
  const { setNodesRef, setEdgesRef } = getStateRefs();
  
  if (!setNodesRef.current || !setEdgesRef.current) {
    console.warn('[Renderer] setNodesRef or setEdgesRef not initialized');
    return;
  }
  
  const { nodes, edges } = await renderToReactFlow(graph, viewState, dimensions);
  
  setNodesRef.current(nodes);
  setEdgesRef.current(edges);
}

/**
 * Trigger ELK-based rendering (AI/LOCK mode only)
 * 
 * WARNING: This goes through useElkToReactflowGraphConverter.
 * Use ONLY for AI-generated content or LOCK mode.
 */
export function renderViaELK(graph: RawGraph): void {
  const { setGraphRef } = getStateRefs();
  
  if (!setGraphRef.current) {
    console.warn('[Renderer] setGraphRef not initialized');
    return;
  }
  
  // Use 'ai' source to trigger ELK layout
  setGraphRef.current(graph, 'ai');
}

