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
 * Collects all edge IDs from the domain graph
 * Edges can be stored in:
 * 1. domainGraph.edges (root level)
 * 2. node.edges arrays (nested within nodes)
 */
function collectAllEdgeIds(graph: RawGraph): Set<string> {
  const edgeIds = new Set<string>();

  // Check root level edges
  if (graph.edges && Array.isArray(graph.edges)) {
    graph.edges.forEach((edge: any) => {
      if (edge && edge.id) {
        edgeIds.add(edge.id);
      }
    });
  }

  // Traverse all nodes to find nested edges
  function traverse(node: any) {
    if (node.edges && Array.isArray(node.edges)) {
      node.edges.forEach((edge: any) => {
        if (edge && edge.id) {
          edgeIds.add(edge.id);
        }
      });
    }
    
    if (node.children) {
      node.children.forEach((child: any) => traverse(child));
    }
  }

  traverse(graph);
  return edgeIds;
}

/**
 * Cleans ViewState by removing entries that don't exist in the domain graph
 * This prevents "Missing ViewState geometry" warnings for stale nodes and edges
 */
export function cleanViewState(domainGraph: RawGraph, viewState: ViewState): ViewState {
  const { nodeIds, groupIds } = collectAllIds(domainGraph);
  const edgeIds = collectAllEdgeIds(domainGraph);
  
  console.log('[🧹 CLEANUP] collectAllIds result:', {
    nodeIds: Array.from(nodeIds),
    groupIds: Array.from(groupIds),
    edgeIds: Array.from(edgeIds),
    domainChildren: domainGraph.children?.length || 0,
    domainChildIds: domainGraph.children?.map(c => c.id) || []
  });
  
  const cleanedViewState: ViewState = {
    node: {},
    group: {},
    edge: {}
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

  // Only keep ViewState entries for edges that exist in domain
  // CRITICAL: This ensures edges deleted by purgeEdgesReferencing are also removed from ViewState
  Object.entries(viewState.edge || {}).forEach(([edgeId, geometry]) => {
    if (edgeIds.has(edgeId)) {
      cleanedViewState.edge[edgeId] = geometry;
    } else {
      console.log(`[🧹 CLEANUP] Removing stale edge ViewState: ${edgeId}`);
    }
  });

  const removedNodes = Object.keys(viewState.node || {}).length - Object.keys(cleanedViewState.node).length;
  const removedGroups = Object.keys(viewState.group || {}).length - Object.keys(cleanedViewState.group).length;
  const removedEdges = Object.keys(viewState.edge || {}).length - Object.keys(cleanedViewState.edge).length;
  
  if (removedNodes > 0 || removedGroups > 0 || removedEdges > 0) {
    console.log(`[🧹 CLEANUP] Cleaned ViewState: removed ${removedNodes} stale nodes, ${removedGroups} stale groups, ${removedEdges} stale edges`);
  }

  return cleanedViewState;
}
