/**
 * Layout policy decisions
 * Part of Agent D - Policy Gate Implementation
 * 
 * Pure decision logic that determines:
 * - When ELK should run (decideLayout)
 * - Which ancestors need locking (getAncestorChainToLock)
 * - Top-most locked ancestor for ELK scope (findTopMostLockedAncestor)
 * - Whether AI should auto-lock FREE scopes (shouldAutoLockForAI)
 * 
 * All functions are pure - they return decisions/IDs, never modify state.
 * The Orchestrator uses these decisions to perform actual mutations.
 */

import type { Source, ModeMap } from './types';
import type { ElkGraphNode } from '../../types/graph';

export interface DecideLayoutInput {
  source: Source;
  scopeId: string;
  modeMap: ModeMap;
  parentOf: (id: string) => string | null;
}

/**
 * Decides whether ELK layout should run for a given edit.
 * 
 * Policy:
 * - AI edits: always run ELK
 * - User edits in LOCK scope: run ELK
 * - User edits in FREE scope: no ELK (unless explicit arrange)
 * 
 * @param input - Edit context (source, scope, mode map, parentOf function)
 * @returns true if ELK should run, false otherwise
 */
export function decideLayout(input: DecideLayoutInput): boolean {
  const { source, scopeId, modeMap, parentOf } = input;

  // AI edits always trigger ELK
  if (source === 'ai') {
    return true;
  }

  // User edits: check if scope or any ancestor is LOCK
  const highestLocked = findHighestLockedAncestor(scopeId, modeMap, parentOf);
  return highestLocked !== null;
}

/**
 * Finds the highest (closest to root) locked ancestor of a given node/group.
 */
export function findHighestLockedAncestor(
  id: string,
  modeMap: ModeMap,
  parentOf: (id: string) => string | null
): string | null {
  let current: string | null = id;

  // Walk up the parent chain
  while (current !== null) {
    // Check if current node/group is locked
    if (modeMap[current] === 'LOCK') {
      return current;
    }

    // Move to parent
    current = parentOf(current);
  }

  // Reached root without finding LOCK
  return null;
}

/**
 * Builds a ModeMap from ViewState only.
 */
export function buildModeMap(viewState: any): ModeMap {
  const modeMap: ModeMap = {};
  
  if (viewState?.layout) {
    for (const [groupId, { mode }] of Object.entries(viewState.layout)) {
      modeMap[groupId] = mode as 'FREE' | 'LOCK';
    }
  }
  
  return modeMap;
}

/**
 * Builds a parentOf function from a graph.
 */
export function buildParentOf(graph: ElkGraphNode): (id: string) => string | null {
  // Build a parent map for efficient lookup
  const parentMap = new Map<string, string>();
  
  const traverse = (node: ElkGraphNode, parentId: string | null = null) => {
    if (parentId !== null) {
      parentMap.set(node.id, parentId);
    }
    
    if (node.children) {
      for (const child of node.children) {
        traverse(child, node.id);
      }
    }
  };
  
  traverse(graph);
  
  // Return lookup function
  return (id: string): string | null => {
    // Root has no parent
    if (id === graph.id || id === 'root') {
      return null;
    }
    return parentMap.get(id) || null;
  };
}



