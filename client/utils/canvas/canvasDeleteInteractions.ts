/**
 * Canvas delete interactions
 * Handles delete/backspace key for deleting selected nodes and edges
 */

import type { Node, Edge } from 'reactflow';
import type { RawGraph } from '../../components/graph/types/index';
import { apply } from '../../core/orchestration/Orchestrator';
import type { EditIntent } from '../../core/orchestration/types';

export interface DeleteInteractionsParams {
  selectedNodes: Node[];
  selectedEdges: Edge[];
  rawGraph: RawGraph;
  selectedArchitectureId?: string;
  logDeletionAndSave?: (
    deletedNodeIds: string[],
    graphBeforeDelete: RawGraph,
    graphAfterDelete: RawGraph,
    architectureId?: string
  ) => void;
}

/**
 * Handles delete/backspace key press to delete selected nodes and edges
 */
export function handleDeleteKey(
  params: DeleteInteractionsParams
): void {
  const { selectedNodes, selectedEdges, rawGraph, selectedArchitectureId, logDeletionAndSave } = params;

  if (selectedNodes.length === 0 && selectedEdges.length === 0) {
    return;
  }

  // Delete selected nodes using Orchestrator - SEQUENTIALLY to avoid race conditions
  const deletedNodeIds = selectedNodes.map(n => n.id);
  const graphBeforeDelete = JSON.parse(JSON.stringify(rawGraph));

  // CRITICAL: Filter out edges that are connected to nodes being deleted
  // When a node is deleted, its connected edges are automatically removed
  // Trying to delete them explicitly causes "edge not found" errors
  const nodesBeingDeleted = new Set(deletedNodeIds);
  const edgesToDelete = selectedEdges.filter(edge => {
    const isConnectedToDeletedNode = nodesBeingDeleted.has(edge.source) || nodesBeingDeleted.has(edge.target);
    if (isConnectedToDeletedNode) {
      console.log(`[DELETE] Skipping edge ${edge.id} - connected to node being deleted`);
      return false;
    }
    return true;
  });

  console.log(`[DELETE] Starting sequential deletion of ${selectedNodes.length} nodes and ${edgesToDelete.length} edges (${selectedEdges.length - edgesToDelete.length} edges skipped - connected to deleted nodes)`);

  // Process deletions sequentially to avoid rendering race conditions
  (async () => {
    try {
      // Delete nodes sequentially
      for (const node of selectedNodes) {
        const intent: EditIntent = {
          source: 'user',
          kind: 'free-structural',
          scopeId: 'root',
          payload: {
            action: 'delete-node',
            nodeId: node.id,
          }
        };
        
        try {
          await apply(intent);
          console.log(`[DELETE] ✅ Successfully deleted node: ${node.id}`);
        } catch (error) {
          console.error(`❌ [DELETE] Error deleting node ${node.id}:`, error);
        }
      }

      // Delete edges sequentially (only edges not connected to deleted nodes)
      for (const edge of edgesToDelete) {
        const intent: EditIntent = {
          source: 'user',
          kind: 'free-structural',
          scopeId: 'root',
          payload: {
            action: 'delete-edge',
            edgeId: edge.id,
          }
        };
        
        try {
          await apply(intent);
          console.log(`[DELETE] ✅ Successfully deleted edge: ${edge.id}`);
        } catch (error) {
          // If edge not found, it might have been deleted as part of node deletion
          // Log as warning instead of error to reduce noise
          if (error instanceof Error && error.message.includes('not found')) {
            console.warn(`⚠️ [DELETE] Edge ${edge.id} not found (may have been removed with node)`);
          } else {
            console.error(`❌ [DELETE] Error deleting edge ${edge.id}:`, error);
          }
        }
      }

      console.log(`[DELETE] ✅ Completed sequential deletion of all selected items`);
      
      // Log deletion after all operations complete
      if (logDeletionAndSave) {
        logDeletionAndSave(deletedNodeIds, graphBeforeDelete, rawGraph, selectedArchitectureId);
      }
    } catch (error) {
      console.error(`❌ [DELETE] Fatal error during sequential deletion:`, error);
    }
  })();
}

