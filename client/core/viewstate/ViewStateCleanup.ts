/**
 * ViewState cleanup utilities
 * Removes stale ViewState entries that don't correspond to actual domain nodes/groups
 */

import type { RawGraph } from '../../components/graph/types/index';
import type { ViewState } from './ViewState';

/**
 * Collects all node and group IDs from the domain graph
 */
function collectAllIds(graph: RawGraph): { nodeIds: Set<string>, groupIds: Set<string> } {
  const nodeIds = new Set<string>();
  const groupIds = new Set<string>();

  function traverse(node: any) {
    if (node.id) {
      // Check if this is a group - must have children WITH at least one element, not just an empty array
      const hasChildren = Array.isArray(node.children) && node.children.length > 0;
      const isGroup = node.type === 'group' || node.data?.isGroup || node.mode || hasChildren;
      if (isGroup) {
        groupIds.add(node.id);
      } else {
        nodeIds.add(node.id);
      }
    }
    
    if (node.children) {
      node.children.forEach((child: any) => traverse(child));
    }
  }

  // Include root
  if (graph.id) {
    groupIds.add(graph.id);
  }
  
  if (graph.children) {
    console.log(`[🧹 CLEANUP] Processing ${graph.children.length} children of root`);
    graph.children.forEach(child => traverse(child));
  }

  return { nodeIds, groupIds };
}

/**
 * Cleans ViewState by removing entries that don't exist in the domain graph
 * This prevents "Missing ViewState geometry" warnings for stale nodes
 */
export function cleanViewState(domainGraph: RawGraph, viewState: ViewState): ViewState {
  const { nodeIds, groupIds } = collectAllIds(domainGraph);
  
  console.log('[🧹 CLEANUP] collectAllIds result:', {
    nodeIds: Array.from(nodeIds),
    groupIds: Array.from(groupIds),
    domainChildren: domainGraph.children?.length || 0,
    domainChildIds: domainGraph.children?.map(c => c.id) || []
  });
  
  const cleanedViewState: ViewState = {
    node: {},
    group: {},
    edge: { ...viewState.edge } // Keep edges as-is for now
  };

  // Only keep ViewState entries for nodes that exist in domain
  Object.entries(viewState.node || {}).forEach(([nodeId, geometry]) => {
    if (nodeIds.has(nodeId)) {
      cleanedViewState.node[nodeId] = geometry;
    } else {
      console.log(`[🧹 CLEANUP] Removing stale node ViewState: ${nodeId}`);
    }
  });

  // Only keep ViewState entries for groups that exist in domain
  Object.entries(viewState.group || {}).forEach(([groupId, geometry]) => {
    if (groupIds.has(groupId)) {
      cleanedViewState.group[groupId] = geometry;
    } else {
      console.log(`[🧹 CLEANUP] Removing stale group ViewState: ${groupId}`);
    }
  });

  const removedNodes = Object.keys(viewState.node || {}).length - Object.keys(cleanedViewState.node).length;
  const removedGroups = Object.keys(viewState.group || {}).length - Object.keys(cleanedViewState.group).length;
  
  if (removedNodes > 0 || removedGroups > 0) {
    console.log(`[🧹 CLEANUP] Cleaned ViewState: removed ${removedNodes} stale nodes, ${removedGroups} stale groups`);
  }

  return cleanedViewState;
}
