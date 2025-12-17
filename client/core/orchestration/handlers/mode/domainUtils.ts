/**
 * Domain graph traversal utilities for mode management
 * Centralized helper functions to avoid duplication
 */

import type { RawGraph } from '../../../../components/graph/types/index';
import { findLCG } from '../../../../components/graph/mutations';

/**
 * Find a node by ID in the domain graph (recursive)
 */
function findNodeById(graph: RawGraph, nodeId: string): any | null {
  const find = (n: any, targetId: string): any => {
    if (n.id === targetId) return n;
    if (n.children) {
      for (const child of n.children) {
        const result = find(child, targetId);
        if (result) return result;
      }
    }
    return null;
  };
  return find(graph, nodeId);
}

/**
 * Find the direct parent group of a node
 * @returns parent group ID, or null if node is at root
 */
export function findParentGroupId(graph: RawGraph, nodeId: string): string | null {
  const findParent = (n: any, targetId: string, parentId: string | null = null): string | null => {
    if (n.id === targetId) {
      // Found the node - return its parent
      // If parent is 'root', return null
      return parentId === 'root' ? null : parentId;
    }
    if (n.children) {
      for (const child of n.children) {
        const result = findParent(child, targetId, n.id);
        if (result !== null) return result;
      }
    }
    return null;
  };
  return findParent(graph, nodeId);
}

/**
 * Find the highest containing group (root's direct child) for a node
 * This is used for the LOCK→FREE transition to unlock the entire top-level group
 * @returns highest group ID (root's child), or null if node is at root
 */
export function findHighestContainingGroup(graph: RawGraph, nodeId: string): string | null {
  // Helper to find a node in the graph
  const findNodeInGraph = (n: any, targetId: string): any => {
    if (n.id === targetId) return n;
    if (n.children) {
      for (const child of n.children) {
        const result = findNodeInGraph(child, targetId);
        if (result) return result;
      }
    }
    return null;
  };
  
  // Find the target node
  const targetNode = findNodeInGraph(graph, nodeId);
  if (!targetNode) {
    console.warn(`[findHighestContainingGroup] Node ${nodeId} not found in graph`);
    return null;
  }
  
  // Build path from root to node
  const buildPath = (n: any, targetId: string, path: string[] = []): string[] | null => {
    const currentPath = [...path, n.id];
    if (n.id === targetId) {
      return currentPath;
    }
    if (n.children) {
      for (const child of n.children) {
        const result = buildPath(child, targetId, currentPath);
        if (result) return result;
      }
    }
    return null;
  };
  
  const path = buildPath(graph, nodeId);
  if (!path || path.length <= 1) {
    // Node is at root or path is invalid
    return null;
  }
  
  // Path format: ['root', 'group_1', 'middleGroup', ..., 'targetNode']
  // We want the first group after root (root's direct child)
  // Always return the first child of root if path exists and has at least 2 elements
  if (path[0] === 'root' && path.length >= 2) {
    const candidateId = path[1];
    const candidateNode = findNodeInGraph(graph, candidateId);
    // Return it if it's a group (has children) or if it's the only candidate
    if (candidateNode && candidateNode.children && candidateNode.children.length > 0) {
      return candidateId;
    }
    // If no children, but it's the first child of root, still return it (might be a leaf group)
    return candidateId;
  }
  
  return null;
}

/**
 * Collect all descendant group IDs (recursive)
 * @param graph - Domain graph
 * @param groupId - Group ID to start from
 * @returns array of group IDs including the root group itself
 */
export function collectDescendantGroupIds(graph: RawGraph, groupId: string): string[] {
  const groupIds: string[] = [];
  
  const collect = (node: any): void => {
    // Only add nodes that are groups (have children)
    if (node.children && node.children.length > 0) {
      groupIds.push(node.id);
      // Recursively collect from children
      node.children.forEach(collect);
    }
  };
  
  const groupNode = findNodeById(graph, groupId);
  if (groupNode) {
    collect(groupNode);
  }
  
  return groupIds;
}

/**
 * Collect all descendant node IDs (nodes and groups, recursive)
 * @param graph - Domain graph
 * @param groupId - Group ID to start from
 * @returns array of all node IDs in the subtree (including the group itself)
 */
export function collectDescendantNodeIds(graph: RawGraph, groupId: string): string[] {
  const nodeIds: string[] = [];
  
  const collect = (node: any): void => {
    nodeIds.push(node.id);
    if (node.children) {
      node.children.forEach(collect);
    }
  };
  
  const groupNode = findNodeById(graph, groupId);
  if (groupNode) {
    collect(groupNode);
  }
  
  return nodeIds;
}

/**
 * Collect all edges that touch any node in a set (source or target)
 * @param graph - Domain graph
 * @param nodeIds - Set of node IDs to check
 * @returns array of edges with id, source, target
 */
export function collectTouchingEdges(
  graph: RawGraph, 
  nodeIds: Set<string>
): Array<{id: string, source: string, target: string, data?: any}> {
  const edges: Array<{id: string, source: string, target: string, data?: any}> = [];
  const seenEdgeIds = new Set<string>();
  
  const collectFromNode = (node: any): void => {
    if (node.edges && Array.isArray(node.edges)) {
      for (const edge of node.edges) {
        const sourceId = edge.sources?.[0] || edge.source;
        const targetId = edge.targets?.[0] || edge.target;
        const edgeId = edge.id || `edge-${sourceId}-${targetId}`;
        
        // Deduplicate edges (same edge might be checked multiple times)
        if (seenEdgeIds.has(edgeId)) {
          continue;
        }
        seenEdgeIds.add(edgeId);
        
        // Check if edge touches any node in our set
        if (nodeIds.has(sourceId) || nodeIds.has(targetId)) {
          // Return full edge object INCLUDING data (which contains sourceHandle/targetHandle)
          edges.push({ id: edgeId, source: sourceId, target: targetId, data: edge.data });
        }
      }
    }
    
    // Recursively check children
    if (node.children) {
      node.children.forEach(collectFromNode);
    }
  };
  
  collectFromNode(graph);
  return edges;
}

/**
 * Find LCG (Lowest Common Group) for two node IDs
 * @param graph - Domain graph
 * @param sourceId - Source node ID
 * @param targetId - Target node ID
 * @returns LCG group ID, or null if not found
 */
export function findLCGForEdge(graph: RawGraph, sourceId: string, targetId: string): string | null {
  const lcg = findLCG(graph, [sourceId, targetId]);
  return lcg?.id || null;
}

