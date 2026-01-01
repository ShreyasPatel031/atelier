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

import { ElkGraphNode, ElkGraphEdge, NodeID, EdgeID, createNodeID, createEdgeID } from "../../types/graph";
import { RawGraph } from "./types/index";
import { getStyle } from "./styles";

// ──────────────────────────────────────────────
// NEW HELPERS – tiny & fast, no external deps
// ──────────────────────────────────────────────

/** DFS yields *all* nodes inside a subtree (including the root). */
const collectNodeIds = (n: ElkGraphNode, acc: Set<NodeID> = new Set()) => {
  acc.add(n.id);
  (n.children ?? []).forEach(c => collectNodeIds(c, acc));
  return acc;
};

/** True if "maybeDesc" lives somewhere inside "root". */
const isDescendantOf = (root: ElkGraphNode, maybeDesc: ElkGraphNode): boolean =>
  collectNodeIds(root).has(maybeDesc.id);

/** True if any edge id matches. */
export const edgeIdExists = (g: ElkGraphNode, eid: EdgeID): boolean =>
  collectEdges(g).some(({ edgeArr }) => edgeArr.some(e => e.id === eid));

/** Remove every edge whose *any* endpoint is found in `victimIds`. */
const purgeEdgesReferencing = (root: ElkGraphNode, victimIds: Set<NodeID>): void => {
  const sweep = (n: ElkGraphNode) => {
    if (n.edges) {
      n.edges = n.edges.filter(
        e =>
          !e.sources.some(s => victimIds.has(s)) &&
          !e.targets.some(t => victimIds.has(t))
      );
    }
    (n.children ?? []).forEach(sweep);
  };
  sweep(root);
};

const reattachEdgesForSubtree = (subRoot: ElkGraphNode, graph: ElkGraphNode) => {
  const queue: ElkGraphNode[] = [subRoot];
  while (queue.length) {
    const n = queue.shift()!;
    updateEdgesForNode(n.id, graph);
    n.children?.forEach(c => queue.push(c));
  }
};

// ──────────────────────────────────────────────
// HELPER FUNCTIONS
// ──────────────────────────────────────────────

/**
 * Recursively finds a node by its id.
 */
const findNodeById = (node: ElkGraphNode, id: NodeID): ElkGraphNode | null => {
  if (node.id === id) return node;
  if (node.children) {
    for (const child of node.children) {
      const found = findNodeById(child, id);
      if (found) return found;
    }
  }
  return null;
};

/**
 * Recursively finds the parent of a node by its id.
 */
const findParentOfNode = (
  root: ElkGraphNode,
  id: NodeID,
  parent: ElkGraphNode | null = null
): ElkGraphNode | null => {
  if (root.id === id) return parent;
  if (root.children) {
    for (const child of root.children) {
      const result = findParentOfNode(child, id, root);
      if (result) return result;
    }
  }
  return null;
};

/**
 * Get the path from the root to a target node.
 */
const getPathToNode = (
  node: ElkGraphNode,
  nodeId: NodeID,
  path: ElkGraphNode[] = []
): ElkGraphNode[] | null => {
  if (node.id === nodeId) return [...path, node];
  if (node.children) {
    for (const child of node.children) {
      const result = getPathToNode(child, nodeId, [...path, node]);
      if (result) return result;
    }
  }
  return null;
};

/**
 * Find the common ancestor of two nodes.
 */
const findCommonAncestor = (
  layout: ElkGraphNode,
  id1: NodeID,
  id2: NodeID
): ElkGraphNode | null => {
  const path1 = getPathToNode(layout, id1);
  const path2 = getPathToNode(layout, id2);
  if (!path1 || !path2) return null;
  let common: ElkGraphNode | null = null;
  for (let i = 0; i < Math.min(path1.length, path2.length); i++) {
    if (path1[i].id === path2[i].id) {
      common = path1[i];
    } else {
      break;
    }
  }
  return common;
};

/**
 * Find Lowest Common Group (LCG) for N nodes.
 * Generalizes findCommonAncestor to work with any number of nodes.
 * Uses existing traversal approach - unoptimized but works.
 * 
 * Key semantic: LCG is the PARENT container that contains all selected items,
 * never one of the selected items itself (even if it's a group).
 * 
 * @param graph - The root graph node
 * @param ids - Array of node IDs to find LCG for
 * @returns The lowest common group node, or null if not found
 */
export const findLCG = (
  graph: ElkGraphNode,
  ids: NodeID[]
): ElkGraphNode | null => {
  // Edge case: empty array
  if (ids.length === 0) {
    return null;
  }

  // Deduplicate IDs to handle duplicate selections
  const uniqueIds = Array.from(new Set(ids));

  // Edge case: single unique node - return its parent (or root if no parent)
  if (uniqueIds.length === 1) {
    const node = findNodeById(graph, uniqueIds[0]);
    if (!node) return null;
    const parent = findParentOfNode(graph, uniqueIds[0]);
    return parent || graph;
  }

  // For 2+ nodes: get paths for all nodes
  const paths = uniqueIds
    .map(id => getPathToNode(graph, id))
    .filter((path): path is ElkGraphNode[] => path !== null);

  // If any node not found, return null
  if (paths.length !== uniqueIds.length) {
    return null;
  }

  // Find longest common prefix across all paths
  if (paths.length === 0) {
    return null;
  }

  let common: ElkGraphNode | null = null;
  const minLength = Math.min(...paths.map(p => p.length));

  for (let i = 0; i < minLength; i++) {
    const firstId = paths[0][i].id;
    // Check if all paths have the same node at this depth
    if (paths.every(p => p[i].id === firstId)) {
      common = paths[0][i];
    } else {
      // Paths diverge at this depth, stop here
      break;
    }
  }

  // Critical fix: Check if the common ancestor is one of the selected items
  // If so, return its parent instead (LCG should be PARENT of selection, not part of it)
  if (common && uniqueIds.includes(common.id)) {
    const parent = findParentOfNode(graph, common.id);
    return parent || graph;
  }

  return common;
};

/**
 * Used to hold edge arrays during traversal.
 */
interface EdgeCollection {
  edgeArr: ElkGraphEdge[];
  parent: ElkGraphNode;
}

/**
 * Recursively traverses the layout and collects all edge arrays with their parent node.
 */
const collectEdges = (node: ElkGraphNode | null | undefined, collection: EdgeCollection[] = []): EdgeCollection[] => {
  if (!node) return collection;
  if (node.edges) {
    collection.push({ edgeArr: node.edges, parent: node });
  }
  if (node.children) {
    for (const child of node.children) {
      if (child) {
        collectEdges(child, collection);
      }
    }
  }
  return collection;
};

/**
 * Reattaches edges involving a moved node so that each edge is placed
 * under the common ancestor of its endpoints.
 */
const updateEdgesForNode = (nodeId: NodeID, layout: ElkGraphNode): ElkGraphNode => {
  const allEdges = collectEdges(layout);
  for (const { edgeArr, parent } of allEdges) {
    // Loop backwards in case we need to remove any edges.
    for (let i = edgeArr.length - 1; i >= 0; i--) {
      const edge = edgeArr[i];
      if (edge.sources.includes(nodeId) || edge.targets.includes(nodeId)) {
        // For simplicity, assume one source and one target per edge.
        const sourceId = edge.sources[0];
        const targetId = edge.targets[0];
        const commonAncestor = findCommonAncestor(layout, sourceId, targetId);
        if (commonAncestor && (!parent || parent.id !== commonAncestor.id)) {
          // Remove the edge from the current parent's edge list.
          edgeArr.splice(i, 1);
          if (!commonAncestor.edges) commonAncestor.edges = [];
          commonAncestor.edges.push(edge);
        }
      }
    }
  }
  return layout;
};

// Logging helper
const notFound = (type: "node"|"edge"|"shape", id: string) =>
  console.error(`❌ ${type} '${id}' not found – caller / stack:`, new Error().stack);

// ──────────────────────────────────────────────
// PRIMITIVE OPERATIONS
// ──────────────────────────────────────────────

//
// 🟩 NODE OPERATIONS
//

/**
 * Add a new node under a parent
 */
export const addNode = (
  nodeName: string, 
  parentId: NodeID, 
  graph: RawGraph,
  data?: { label?: string; icon?: string; style?: any }
): RawGraph => {
  
  // Clone the graph to ensure React detects the state change
  const clonedGraph = structuredClone(graph);

  // Check for duplicate ID using normalized name
  const normalizedId = createNodeID(nodeName);
  if (findNodeById(clonedGraph, normalizedId)) {
    throw new Error(`duplicate node id '${normalizedId}'`);
  }
  
  // Special case: when parentId is 'root', use the cloned graph itself as the parent
  let parentNode: ElkGraphNode;
  if (parentId === 'root') {
    parentNode = clonedGraph as ElkGraphNode; // The cloned graph IS the root node
  } else {
    const foundParent = findNodeById(clonedGraph, parentId);
    if (!foundParent) {
      notFound("node", parentId);
      throw new Error(`Parent node '${parentId}' not found`);
    }
    parentNode = foundParent;
  }

  
  // Ensure parent has a children array
  if (!parentNode.children) {
    parentNode.children = [];
  }
  
  // Create the new node - using createNodeID to maintain ID creation consistency
  // If label is explicitly provided (even if empty), use it. Otherwise fall back to nodeName
  const nodeLabel = data?.label !== undefined ? data.label : nodeName;
  const newNode: ElkGraphNode = {
    id: normalizedId,
    labels: [{ text: nodeLabel }],
    children: []
  };
  
  // Add optional data properties
  if (data) {
    // Process style if it's a string reference
    if (data.style && typeof data.style === 'string') {
      data = {
        ...data,
        style: getStyle(data.style)
      };
    }
    
    newNode.data = {
      ...newNode.data,
      ...data
    };
  }
  
  // Add to parent
  parentNode.children.push(newNode);
  
  return clonedGraph;
};

/**
 * Delete a node and all its related edges
 */
export const deleteNode = (nodeId: NodeID, graph: RawGraph): RawGraph => {
  
  // First, find and remove the node from its parent
  const parent = findParentOfNode(graph, nodeId);
  if (!parent || !parent.children) {
    notFound("node", nodeId);
    throw new Error(`Node '${nodeId}' not found or trying to remove root`);
  }

  // 1. locate
  const doomed = parent.children.find(c => c.id === nodeId)!;
  
  // 2. remove from parent
  parent.children = parent.children.filter(c => c !== doomed);
  
  // 3. purge every edge that pointed to it or descendants
  purgeEdgesReferencing(graph, collectNodeIds(doomed));
  
  return graph;
};

/**
 * Move a node to a new parent and correctly update all edges.
 */
export const moveNode = (nodeId: NodeID, newParentId: NodeID, graph: RawGraph): RawGraph => {
  
  const node = findNodeById(graph, nodeId);
  const newParent = findNodeById(graph, newParentId);
  
  if (!node) {
    notFound("node", nodeId);
    throw new Error(`Node '${nodeId}' not found`);
  }
  
  if (!newParent) {
    notFound("node", newParentId);
    throw new Error(`New parent node '${newParentId}' not found`);
  }
  
  // 1. forbid moving into own descendant (cycle)
  if (isDescendantOf(node, newParent)) {
    throw new Error(`Cannot move '${nodeId}' into its own descendant '${newParentId}'`);
  }

  // 2. forbid ID collision among siblings (already ensured but cheap to keep)
  if (newParent.children?.some(c => c.id === nodeId)) {
    throw new Error(`'${newParentId}' already contains a child with id '${nodeId}'`);
  }
  
  const oldParent = findParentOfNode(graph, nodeId);
  if (!oldParent || !oldParent.children) {
    throw new Error(`Node '${nodeId}' not found in any parent`);
  }
  
  // Remove the node from its old parent
  oldParent.children = oldParent.children.filter(child => child.id !== nodeId);
  
  // Add the node to the new parent
  if (!newParent.children) newParent.children = [];
  newParent.children.push(node);
  
  // Update edge connections - this is the key improvement
  // const updatedGraph = updateEdgesForNode(nodeId, graph);
  reattachEdgesForSubtree(node, graph);
  
  return graph;
};

//
// 🟧 EDGE OPERATIONS
//

/**
 * Add an edge between nodes at the common ancestor level
 */
export const addEdge = (edgeId: EdgeID, sourceId: NodeID, targetId: NodeID, labelOrGraph?: string | RawGraph, sourceHandle?: string, targetHandle?: string, graph?: RawGraph): RawGraph => {
  // Detect if graph was passed as 4th parameter (backward compatibility)
  // If 4th param is an object with 'id' property, it's a graph, not a label
  if (labelOrGraph && typeof labelOrGraph === 'object' && 'id' in labelOrGraph) {
    // Old signature: (edgeId, sourceId, targetId, graph, label?, sourceHandle?, targetHandle?)
    const actualGraph = labelOrGraph as RawGraph;
    const actualLabel = sourceHandle as string | undefined; // Shifted params
    const actualSourceHandle = targetHandle;
    const actualTargetHandle = graph as unknown as string | undefined;
    return addEdgeInternal(edgeId, sourceId, targetId, actualGraph, actualLabel, actualSourceHandle, actualTargetHandle);
  }
  // New signature: graph is last parameter (from mutate function)
  // (edgeId, sourceId, targetId, label?, sourceHandle?, targetHandle?, graph)
  if (!graph) {
    throw new Error('Graph parameter is required');
  }
  const actualLabel = typeof labelOrGraph === 'string' ? labelOrGraph : undefined;
  return addEdgeInternal(edgeId, sourceId, targetId, graph, actualLabel, sourceHandle, targetHandle);
};

/**
 * Internal implementation of addEdge
 */
const addEdgeInternal = (edgeId: EdgeID, sourceId: NodeID, targetId: NodeID, graph: RawGraph, label?: string, sourceHandle?: string, targetHandle?: string): RawGraph => {
  console.log('🔧 [addEdgeInternal] Called:', { edgeId, sourceId, targetId, label, sourceHandle, targetHandle });
  
  // Clone the graph to ensure React detects the state change
  const clonedGraph = structuredClone(graph);
  console.log('✅ [addEdgeInternal] Cloned graph, original edges:', graph.edges?.length || 0, 'cloned edges:', clonedGraph.edges?.length || 0);
  
  // duplicate-ID check
  if (edgeIdExists(clonedGraph, edgeId)) {
    console.error('❌ [addEdgeInternal] Edge ID already exists:', edgeId);
    throw new Error(`Edge id '${edgeId}' already exists`);
  }
  console.log('✅ [addEdgeInternal] Edge ID does not exist, proceeding');
  
  // self-loop guard
  if (sourceId === targetId) {
    console.error('❌ [addEdgeInternal] Self-loop detected:', sourceId);
    throw new Error(`Self-loop edges are not supported (source === target '${sourceId}')`);
  }
  
  // Find the common ancestor for edge placement
  let commonAncestor = findCommonAncestor(clonedGraph, sourceId, targetId);
  console.log('🔍 [addEdgeInternal] Common ancestor:', commonAncestor ? { id: commonAncestor.id, hasEdges: !!commonAncestor.edges } : 'null');
  
  // If no common ancestor found, or it's null, default to root
  if (!commonAncestor) {
    console.log('⚠️ [addEdgeInternal] No common ancestor found, attaching to root');
    // No common ancestor found, attach to root node instead
    const root = clonedGraph;
    
    // Create the edge
    const newEdge: ElkGraphEdge = {
      id: edgeId,
      sources: [sourceId],
      targets: [targetId]
    };
    
    // Store handle IDs if provided (for connector handles)
    if (sourceHandle || targetHandle) {
      newEdge.data = {
        sourceHandle,
        targetHandle
      };
      console.log('✅ [addEdgeInternal] Added handle IDs to edge:', { sourceHandle, targetHandle });
    }
    
    // Add label if provided
    if (label) {
      newEdge.labels = [{ text: label }];
    }
    
    // Ensure the root has edges array
    if (!root.edges) {
      root.edges = [];
      console.log('📝 [addEdgeInternal] Created edges array on root');
    }
    
    // Add the edge to the root
    root.edges.push(newEdge);
    console.log('✅ [addEdgeInternal] Added edge to root, root now has', root.edges.length, 'edges');
    
    return clonedGraph;
  }
  
  // Create the edge
  const newEdge: ElkGraphEdge = {
    id: edgeId,
    sources: [sourceId],
    targets: [targetId]
  };
  
  // Store handle IDs if provided (for connector handles)
  if (sourceHandle || targetHandle) {
    newEdge.data = {
      sourceHandle,
      targetHandle
    };
    console.log('✅ [addEdgeInternal] Added handle IDs to edge:', { sourceHandle, targetHandle });
  }
  
  // Add label if provided
  if (label) {
    newEdge.labels = [{ text: label }];
  }
  
  // Ensure the common ancestor has edges array
  if (!commonAncestor.edges) {
    commonAncestor.edges = [];
    console.log('📝 [addEdgeInternal] Created edges array on common ancestor');
  }
  
  // Add the edge to the common ancestor
  commonAncestor.edges.push(newEdge);
  console.log('✅ [addEdgeInternal] Added edge to common ancestor, ancestor now has', commonAncestor.edges.length, 'edges');
  
  return clonedGraph;
};

/**
 * Delete an edge from the layout.
 */
export const deleteEdge = (edgeId: EdgeID, graph: RawGraph): RawGraph => {
  
  let edgeFound = false;
  
  function removeEdge(node: ElkGraphNode): void {
    if (node.edges) {
      const initialLength = node.edges.length;
      node.edges = node.edges.filter(edge => edge.id !== edgeId);
      if (node.edges.length < initialLength) {
        edgeFound = true;
      }
    }
    if (node.children) {
      for (const child of node.children) {
        removeEdge(child);
      }
    }
  }
  
  removeEdge(graph);
  
  if (!edgeFound) {
    notFound("edge", edgeId);
    throw new Error(`Edge '${edgeId}' not found`);
  }
  
  console.timeEnd("deleteEdge");
  console.groupEnd();
  return graph;
};

//
// 🟦 GROUP OPERATIONS
//

/**
 * Creates a new group node and moves specified nodes into it,
 * properly handling edge reattachment.
 */
export const groupNodes = (nodeIds: NodeID[], parentId: NodeID, groupId: NodeID, graph: RawGraph, style?: any): RawGraph => {
  console.group(`[mutation] groupNodes '${groupId}' (${nodeIds.length} nodes) → parent '${parentId}'${style ? ' with style' : ''}`);
  console.time("groupNodes");
  
  // Check for duplicate ID using normalized group ID
  const normalizedGroupId = createNodeID(groupId);
  if (findNodeById(graph, normalizedGroupId)) {
    throw new Error(`duplicate group id '${normalizedGroupId}'`);
  }
  
  const parent = findNodeById(graph, parentId);
  if (!parent || !parent.children) {
    notFound("node", parentId);
    throw new Error(`Parent node '${parentId}' not found`);
  }

  // Prevent cycles: check if any node being grouped is a descendant of the parent or is the parent itself
  for (const id of nodeIds) {
    const cand = findNodeById(graph, id)!;
    if (isDescendantOf(cand, parent) || cand.id === parentId) {
      throw new Error("Cannot group a node into one of its descendants (cycle)");
    }
  }
  
  const groupNode: ElkGraphNode = {
    id: normalizedGroupId,
    labels: [{ text: groupId }],
    children: [],
    edges: [],
    // CRITICAL: Set mode to LOCK for AI-created groups
    // Per FIGJAM_REFACTOR.md: AI edits default to LOCK mode, edges use ELK routing
    mode: 'LOCK' as const
  };
  
  // Add style data if provided
  if (style) {
    // Use the getStyle helper to resolve string style names to actual style objects
    const resolvedStyle = getStyle(style);
    groupNode.data = {
      ...groupNode.data,
      label: groupId,
      style: resolvedStyle
    };
  } else {
    // Default data with group icon
    groupNode.data = {
      label: groupId,
      groupIcon: 'gcp_system' // Default group icon
    };
  }
  
  // Track which nodes are actually moved to update their edges later
  const movedNodeIds: NodeID[] = [];
  
  // Find and move the specified nodes into the new group
  for (const nodeId of nodeIds) {
    // Find the node and its actual parent (which may not be the specified parent)
    const node = findNodeById(graph, nodeId);
    if (!node) {
      notFound("node", nodeId);
      continue;
    }
    
    const actualParent = findParentOfNode(graph, nodeId);
    if (!actualParent || !actualParent.children) {
      console.warn(`Parent of node ${nodeId} not found`);
      continue;
    }
    
    // Remove the node from its actual parent
    actualParent.children = actualParent.children.filter(child => child.id !== nodeId);
    
    // Add the node to the group
    if (!groupNode.children) groupNode.children = [];
    groupNode.children.push(node);
    movedNodeIds.push(nodeId);
  }
  
  // Only add the group if it has children
  if (groupNode.children && groupNode.children.length > 0) {
    parent.children.push(groupNode);
    
    // Update edges for all moved nodes and their descendants
    movedNodeIds
      .map(id => findNodeById(graph, id)!)
      .forEach(subRoot => reattachEdgesForSubtree(subRoot, graph));
  } else {
    console.warn(`No nodes were moved to group ${groupId}`);
  }
  
  
  console.timeEnd("groupNodes");
  console.groupEnd();
  return graph;
};

/**
 * Removes a group by hoisting each child with moveNode, then moves
 * the group's own edges to its parent.  No extra helpers needed.
 */
export const removeGroup = (groupId: NodeID, graph: RawGraph): RawGraph => {
  console.group(`[mutation] removeGroup '${groupId}'`);
  console.time("removeGroup");

  /* locate group & parent ------------------------------------------------ */
  const groupNode  = findNodeById(graph, groupId);
  if (!groupNode)          throw new Error(`Group '${groupId}' not found`);
  const parentNode = findParentOfNode(graph, groupId);
  if (!parentNode || !parentNode.children)
    throw new Error(`Group '${groupId}' has no parent (maybe root?)`);

  /* 1. hoist every child with the *existing* moveNode -------------------- */
  const childIds = (groupNode.children ?? []).map(c => c.id);
  for (const cid of childIds) moveNode(cid, parentNode.id, graph);

  /* 2. relocate the group's own edges straight into the parent ----------- */
  if (groupNode.edges?.length) {
    parentNode.edges = parentNode.edges ?? [];
    parentNode.edges.push(...groupNode.edges);
  }

  /* 3. finally remove the empty group container -------------------------- */
  parentNode.children = parentNode.children.filter(c => c.id !== groupId);

  /* 4. scrub edges that pointed *to* the deleted group itself ------------ */
  purgeEdgesReferencing(graph, new Set<NodeID>([groupId]));

  console.timeEnd("removeGroup");
  console.groupEnd();
  return graph;
};

/**
 * Creates a wrapper section for multi-select auto-layout (CP1 Wave 2)
 * 
 * Finds LCG of selection, creates new wrapper under LCG,
 * reparents ONLY selected nodes (no closure expansion)
 * 
 * @param selectionIds - Node IDs to wrap
 * @param graph - Current graph
 * @returns Updated graph and wrapper ID
 */
export const createWrapperSection = (
  selectionIds: NodeID[], 
  graph: RawGraph
): { graph: RawGraph; wrapperId: NodeID } => {
  if (!graph) {
    throw new Error('Cannot create wrapper section: graph is null or undefined');
  }
  
  if (selectionIds.length === 0) {
    throw new Error('Cannot create wrapper section: no nodes selected');
  }
  
  // 1. Find LCG of selection
  const lcg = findLCG(graph, selectionIds);
  if (!lcg) {
    throw new Error('Cannot create wrapper section: no common ancestor found');
  }
  
  // 2. Create wrapper ID
  const wrapperId = createNodeID(`wrapper-${Date.now()}`);
  
  // 3. Create wrapper group node (always FREE mode)
  const wrapperNode: ElkGraphNode = {
    id: wrapperId,
    labels: [{ text: 'Wrapper Section' }],
    children: [],
    edges: [],
    // Phase 3: No longer write mode to Domain - mode will be set in ViewState.layout
    data: {
      label: 'Wrapper Section',
      isGroup: true,
      groupIcon: 'gcp_system'
    }
  };
  
  // 4. Deep clone graph to avoid mutations
  const updatedGraph = JSON.parse(JSON.stringify(graph));
  const updatedLcg = findNodeById(updatedGraph, lcg.id);
  if (!updatedLcg || !updatedLcg.children) {
    throw new Error(`LCG "${lcg.id}" not found in updated graph`);
  }
  
  // 5. Find and move selected nodes into wrapper (reparent only explicit selection)
  const movedNodeIds: NodeID[] = [];
  
  for (const nodeId of selectionIds) {
    const node = findNodeById(updatedGraph, nodeId);
    if (!node) {
      console.warn(`[createWrapperSection] Node "${nodeId}" not found, skipping`);
      continue;
    }
    
    // Find actual parent and remove from parent
    const actualParent = findParentOfNode(updatedGraph, nodeId);
    if (actualParent && actualParent.children) {
      actualParent.children = actualParent.children.filter(child => child.id !== nodeId);
      
      // Add to wrapper
      if (!wrapperNode.children) wrapperNode.children = [];
      wrapperNode.children.push(node);
      movedNodeIds.push(nodeId);
    }
  }
  
  if (movedNodeIds.length === 0) {
    throw new Error('No nodes were successfully moved to wrapper section');
  }
  
  // 6. Add wrapper to LCG
  updatedLcg.children.push(wrapperNode);
  
  // 7. Reattach edges for moved subtrees
  if (movedNodeIds.length > 0) {
    movedNodeIds
      .map(id => findNodeById(updatedGraph, id)!)
      .forEach(subRoot => reattachEdgesForSubtree(subRoot, updatedGraph));
  }
  
  return { graph: updatedGraph, wrapperId };
};

/**
 * Batch update multiple operations at once
 * 
 * IMPORTANT: Operations are reordered to ensure correct LCG (Lowest Common Group) 
 * calculation for edges. Order is:
 * 1. add_node - create all nodes first
 * 2. group_nodes - move nodes into groups 
 * 3. add_edge - LAST, so findCommonAncestor finds correct group
 * 4. Other operations (delete, move, etc.) maintain relative order
 */
export const batchUpdate = (operations: Array<{
  name: string;
  nodename?: string;
  parentId?: NodeID;
  nodeId?: NodeID;
  newParentId?: NodeID;
  edgeId?: EdgeID;
  sourceId?: NodeID;
  targetId?: NodeID;
  nodeIds?: NodeID[];
  groupId?: NodeID;
  data?: { label?: string; icon?: string; style?: any };
  label?: string;
  style?: any;
}>, graph: RawGraph) => {
  // console.group(`[mutation] batchUpdate (${operations.length} operations)`);
  // console.time("batchUpdate");
  
  // Reorder operations to ensure edges are added AFTER nodes are grouped
  // This ensures findCommonAncestor finds the correct LCG for edges
  const addNodeOps = operations.filter(op => op.name === 'add_node');
  const groupNodeOps = operations.filter(op => op.name === 'group_nodes');
  const addEdgeOps = operations.filter(op => op.name === 'add_edge');
  const otherOps = operations.filter(op => 
    !['add_node', 'group_nodes', 'add_edge'].includes(op.name)
  );
  
  // Process in order: add_node → group_nodes → other → add_edge
  const reorderedOperations = [...addNodeOps, ...groupNodeOps, ...otherOps, ...addEdgeOps];
  
  console.log(`📦 [batchUpdate] Reordered ${operations.length} operations: ${addNodeOps.length} add_node, ${groupNodeOps.length} group_nodes, ${otherOps.length} other, ${addEdgeOps.length} add_edge`);
  
  let updatedGraph = { ...graph };
  
  for (const operation of reorderedOperations) {
    const { name, ...args } = operation;
    
    // console.log(`🔍 Processing batch operation '${name}' with args:`, args);
    
    switch (name) {
      case "add_node":
        if (!args.nodename || typeof args.nodename !== 'string') {
          throw new Error(`add_node requires 'nodename' as a string, got: ${JSON.stringify(args.nodename)}`);
        }
        // Default parentId to "root" if not provided
        const parentId = args.parentId || "root";
        if (typeof parentId !== 'string') {
          throw new Error(`add_node requires 'parentId' as a string, got: ${JSON.stringify(args.parentId)}`);
        }
        updatedGraph = addNode(args.nodename, parentId, updatedGraph, args.data);
        break;
        
      case "delete_node":
        if (!args.nodeId || typeof args.nodeId !== 'string') {
          throw new Error(`delete_node requires 'nodeId' as a string, got: ${JSON.stringify(args.nodeId)}`);
        }
        updatedGraph = deleteNode(args.nodeId, updatedGraph);
        break;
        
      case "move_node":
        if (!args.nodeId || typeof args.nodeId !== 'string') {
          throw new Error(`move_node requires 'nodeId' as a string, got: ${JSON.stringify(args.nodeId)}`);
        }
        if (!args.newParentId || typeof args.newParentId !== 'string') {
          throw new Error(`move_node requires 'newParentId' as a string, got: ${JSON.stringify(args.newParentId)}`);
        }
        updatedGraph = moveNode(args.nodeId, args.newParentId, updatedGraph);
        break;
        
      case "add_edge":
        if (!args.edgeId || typeof args.edgeId !== 'string') {
          throw new Error(`add_edge requires 'edgeId' as a string, got: ${JSON.stringify(args.edgeId)}`);
        }
        if (!args.sourceId || typeof args.sourceId !== 'string') {
          throw new Error(`add_edge requires 'sourceId' as a string, got: ${JSON.stringify(args.sourceId)}`);
        }
        if (!args.targetId || typeof args.targetId !== 'string') {
          throw new Error(`add_edge requires 'targetId' as a string, got: ${JSON.stringify(args.targetId)}`);
        }
        updatedGraph = addEdge(args.edgeId, args.sourceId, args.targetId, args.label, undefined, undefined, updatedGraph);
        break;
        
      case "delete_edge":
        if (!args.edgeId || typeof args.edgeId !== 'string') {
          throw new Error(`delete_edge requires 'edgeId' as a string, got: ${JSON.stringify(args.edgeId)}`);
        }
        updatedGraph = deleteEdge(args.edgeId, updatedGraph);
        break;
        
      case "group_nodes":
        if (!args.nodeIds || !Array.isArray(args.nodeIds) || args.nodeIds.length === 0) {
          throw new Error(`group_nodes requires 'nodeIds' as a non-empty array, got: ${JSON.stringify(args.nodeIds)}`);
        }
        // Default parentId to "root" if not provided (same as add_node)
        const groupParentId = args.parentId || "root";
        if (typeof groupParentId !== 'string') {
          throw new Error(`group_nodes requires 'parentId' as a string, got: ${JSON.stringify(args.parentId)}`);
        }
        if (!args.groupId || typeof args.groupId !== 'string') {
          throw new Error(`group_nodes requires 'groupId' as a string, got: ${JSON.stringify(args.groupId)}`);
        }
        updatedGraph = groupNodes(args.nodeIds, groupParentId, args.groupId, updatedGraph, args.style || args.data?.style);
        break;
        
      case "remove_group":
        if (!args.groupId || typeof args.groupId !== 'string') {
          throw new Error(`remove_group requires 'groupId' as a string, got: ${JSON.stringify(args.groupId)}`);
        }
        updatedGraph = removeGroup(args.groupId, updatedGraph);
        break;
        
      default:
        console.warn(`Unknown operation: ${name}`);
    }
  }
  
  // console.timeEnd("batchUpdate");
  // console.groupEnd();
  return updatedGraph;
}; 