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

  console.log(`[DELETE] Starting sequential deletion of ${selectedNodes.length} nodes and ${selectedEdges.length} edges`);

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

      // Delete edges sequentially
      for (const edge of selectedEdges) {
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
          console.error(`❌ [DELETE] Error deleting edge ${edge.id}:`, error);
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

