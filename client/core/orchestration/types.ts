/**
 * Orchestration types for edit intents and policy decisions
 * Part of Agent B Inter Plan - B4, B5
 */

/**
 * Source of an edit (ephemeral, not persisted)
 */
export type Source = 'ai' | 'user';

/**
 * Kind of edit operation
 */
export type EditKind = 
  | 'geo-only'           // FREE: drag/resize within same parent (no structure change)
  | 'free-structural'    // FREE: reparent/group/edge ops (structure changes, no ELK)
  | 'ai-lock-structural'; // AI or LOCK: structural changes that require ELK

/**
 * Edit intent passed to orchestrator
 */
export interface EditIntent {
  source: Source;
  kind: EditKind;
  scopeId: string;
  /**
   * Optional payload for specific operations
   */
  payload?: {
    action?: 'add-node' | 'move-node' | 'group-nodes' | 'delete-node' | 'delete-edge' | 'select-nodes' | 'deselect-all' | 'unlock-scope-to-free' | 'lock-scope-and-descendants';
    nodeId?: string;
    nodeIds?: string[];  // For selection actions
    edgeId?: string;
    parentId?: string;
    oldParentId?: string;
    newParentId?: string;
    position?: { x: number; y: number };
    size?: { w: number; h: number };
    data?: any;
    scopeGroupId?: string;  // For unlock/lock scope actions
    reason?: 'move-node' | 'move-group'; // For debugging
    preserveSelection?: string[]; // Node IDs to keep selected after operation
    [key: string]: unknown;
  };
}

/**
 * Mode map: group ID -> 'FREE' | 'LOCK'
 */
export type ModeMap = Record<string, 'FREE' | 'LOCK'>;

