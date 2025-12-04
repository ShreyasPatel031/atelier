/**
 * FREE Mode: Reset Canvas Handler
 * 
 * Flow: Clear domain → Clear ViewState → Render empty
 * 
 * CRITICAL: This bypasses useElkToReactflowGraphConverter entirely.
 */

import type { EditIntent } from '../../types';
import type { StateRefs } from '../../state/StateRefs';

export async function resetCanvas(intent: EditIntent, refs: StateRefs): Promise<void> {
  const { graphStateRef, viewStateRef, setNodesRef, setEdgesRef } = refs;

  // 1. Clear domain graph
  const emptyGraph = { id: 'root', children: [], edges: [] };
  graphStateRef.current = emptyGraph;

  // 2. Clear ViewState
  viewStateRef.current = { node: {}, group: {}, edge: {} };

  // 3. Clear localStorage persistence
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem('canvas-snapshot');
    } catch (e) {
      console.warn('[resetCanvas] Failed to clear localStorage:', e);
    }
  }

  // 4. Render empty canvas directly (bypasses ELK)
  if (setNodesRef.current && setEdgesRef.current) {
    setNodesRef.current([]);
    setEdgesRef.current([]);
  }

  console.log('[resetCanvas] Canvas cleared');
}

