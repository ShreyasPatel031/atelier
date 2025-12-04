/**
 * Orchestrator Handlers - Action Implementations
 * 
 * Each handler implements a specific action for the Orchestrator.
 * Handlers are grouped by domain: node, group, edge, canvas.
 * 
 * FREE mode handlers:
 * - Update graphStateRef directly (NOT setRawGraph)
 * - Update viewStateRef directly
 * - Render via setNodesRef/setEdgesRef (bypasses ELK)
 * 
 * AI/LOCK mode handlers:
 * - May use setGraphRef('ai') to trigger ELK layout
 */

// Node handlers
export * from './node';

// Edge handlers  
export * from './edge';

// Canvas handlers
export * from './canvas';

// Group handlers (placeholders - to be extracted from InteractiveCanvas)
export * from './group';
