import type { ViewState } from './ViewState';
import type { ElkGraphNode } from '../../types/graph';

export function extractModeFromDomain(graph: ElkGraphNode): Record<string, 'FREE' | 'LOCK'> {
  const modeMap: Record<string, 'FREE' | 'LOCK'> = {};
  
  const traverse = (node: ElkGraphNode) => {
    if (node.children && node.children.length > 0) {
      modeMap[node.id] = (node as any).mode || 'FREE';
    }
    if (node.children) {
      for (const child of node.children) {
        traverse(child);
      }
    }
  };
  
  traverse(graph);
  return modeMap;
}

export function getModeFromViewState(viewState: ViewState, groupId: string): 'FREE' | 'LOCK' {
  return viewState.layout?.[groupId]?.mode || 'FREE';
}

export function setModeInViewState(viewState: ViewState, groupId: string, mode: 'FREE' | 'LOCK'): ViewState {
  return {
    ...viewState,
    layout: {
      ...viewState.layout,
      [groupId]: {
        ...viewState.layout?.[groupId],
        mode,
      },
    },
  };
}

/**
 * One-time migration: Domain Graph → ViewState.layout
 * @param graph - Domain Graph to extract modes from
 * @param viewState - ViewState to migrate modes to
 * @returns ViewState with migrated modes
 */
export function migrateModeDomainToViewState(
  graph: ElkGraphNode, 
  viewState: ViewState
): ViewState {
  const domainModes = extractModeFromDomain(graph);
  
  // Get all group IDs from graph
  const allGroupIds = new Set<string>();
  const collectGroupIds = (node: ElkGraphNode) => {
    if (node.children && node.children.length > 0) {
      allGroupIds.add(node.id);
    }
    if (node.children) {
      node.children.forEach(collectGroupIds);
    }
  };
  collectGroupIds(graph);
  
  // Start with existing ViewState.layout or empty
  const layoutSection: Record<string, { mode: 'FREE' | 'LOCK' }> = { ...viewState.layout || {} };
  
  // Migrate modes from Domain (if any)
  for (const [groupId, mode] of Object.entries(domainModes)) {
    if (!layoutSection[groupId]) {
      layoutSection[groupId] = { mode };
    }
  }
  
  // Ensure all groups have a mode (default to FREE if missing)
  for (const groupId of allGroupIds) {
    if (!layoutSection[groupId]) {
      layoutSection[groupId] = { mode: 'FREE' };
    }
  }
  
  return {
    ...viewState,
    layout: layoutSection
  };
}

/**
 * Sync ViewState.layout with current graph structure
 * Ensures all groups in graph have modes in ViewState.layout
 */
export function syncViewStateLayoutWithGraph(
  graph: ElkGraphNode,
  viewState: ViewState
): ViewState {
  const allGroupIds = new Set<string>();
  const collectGroupIds = (node: ElkGraphNode) => {
    if (node.children && node.children.length > 0) {
      allGroupIds.add(node.id);
    }
    if (node.children) {
      node.children.forEach(collectGroupIds);
    }
  };
  collectGroupIds(graph);
  
  const layoutSection: Record<string, { mode: 'FREE' | 'LOCK' }> = { ...viewState.layout || {} };
  
  // Ensure all groups have a mode (default to FREE if missing)
  for (const groupId of allGroupIds) {
    if (!layoutSection[groupId]) {
      layoutSection[groupId] = { mode: 'FREE' };
    }
  }
  
  return {
    ...viewState,
    layout: layoutSection
  };
}
