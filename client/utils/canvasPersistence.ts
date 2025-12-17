import { Node } from 'reactflow';

export const LOCAL_CANVAS_SNAPSHOT_KEY = "atelier_canvas_last_snapshot_v1";

let lastSnapshotDigest: string | null = null;

export interface ViewStateGeometry {
  x: number;
  y: number;
  w: number;
  h: number;
  // Port positions - stored as deltas from node top-left corner
  ports?: {
    leftHandles?: number[];   // Y offsets from top
    rightHandles?: number[];  // Y offsets from top
    topHandles?: number[];    // X offsets from left
    bottomHandles?: number[]; // X offsets from left
  };
}

export interface ViewState {
  node: Record<string, ViewStateGeometry>;
  group: Record<string, ViewStateGeometry>;
  edge: Record<string, any>;
  layout?: Record<string, { mode: 'FREE' | 'LOCK' }>;
}

export interface CanvasSnapshot {
  rawGraph: any;
  viewState: ViewState;
  selectedArchitectureId: string;
  timestamp: number;
}

/**
 * Creates a snapshot of the current view state based on ReactFlow nodes and edges
 */
export function createViewStateSnapshot(
  nodes: Node[],
  viewStateRef: React.MutableRefObject<ViewState | undefined>,
  isHydratingRef: React.MutableRefObject<boolean>,
  edges?: any[] // ReactFlow edges
): ViewState {
  if (isHydratingRef.current && viewStateRef?.current) {
    try {
      return JSON.parse(JSON.stringify(viewStateRef.current));
    } catch (error) {
      return viewStateRef.current;
    }
  }

  const base = viewStateRef?.current
    ? (() => {
        try {
          return JSON.parse(JSON.stringify(viewStateRef.current));
        } catch (error) {
          return viewStateRef.current;
        }
      })()
    : { node: {}, group: {}, edge: {} };

  const snapshot = base || { node: {}, group: {}, edge: {} };

  // Helper to calculate absolute position from node and all nodes
  const getAbsolutePosition = (node: Node, allNodes: Node[]): { x: number; y: number } => {
    let x = node.position?.x ?? 0;
    let y = node.position?.y ?? 0;
    
    // If node has a parent, add parent's absolute position
    if ((node as any).parentId) {
      const parent = allNodes.find(n => n.id === (node as any).parentId);
      if (parent) {
        const parentAbs = getAbsolutePosition(parent, allNodes);
        x += parentAbs.x;
        y += parentAbs.y;
      }
    }
    
    return { x, y };
  };


  nodes.forEach((node) => {
    const existingNodeView = viewStateRef?.current?.node?.[node.id];
    const existingGroupView = viewStateRef?.current?.group?.[node.id];

    const rawWidth =
      (typeof node.data?.width === 'number' && node.data.width) ||
      (typeof node.style?.width === 'number' && node.style.width) ||
      (typeof node.style?.width === 'string' ? parseFloat(node.style.width) : undefined);
    const rawHeight =
      (typeof node.data?.height === 'number' && node.data.height) ||
      (typeof node.style?.height === 'number' && node.style.height) ||
      (typeof node.style?.height === 'string' ? parseFloat(node.style.height) : undefined);

    // CRITICAL FIX: ALWAYS preserve existing ViewState positions if they exist
    // ViewState is the source of truth, not ReactFlow positions
    // Only calculate from ReactFlow if no existing ViewState geometry exists
    const existingGeom = existingNodeView || existingGroupView;
    
    let finalX: number;
    let finalY: number;
    
    if (existingGeom && existingGeom.x !== undefined && existingGeom.y !== undefined) {
      // PRESERVE existing ViewState position - it's authoritative
      finalX = existingGeom.x;
      finalY = existingGeom.y;
    } else {
      // No existing ViewState - calculate from ReactFlow (only for new nodes)
      const absolutePos = getAbsolutePosition(node, nodes);
      finalX = absolutePos.x;
      finalY = absolutePos.y;
    }
    
    const width = rawWidth ?? existingNodeView?.w ?? existingGroupView?.w ?? 96;
    const height = rawHeight ?? existingNodeView?.h ?? existingGroupView?.h ?? 96;

    // Extract port positions from node.data if they exist
    const ports = node.data?.leftHandles || node.data?.rightHandles || node.data?.topHandles || node.data?.bottomHandles
      ? {
          leftHandles: node.data?.leftHandles ? [...node.data.leftHandles] : undefined,
          rightHandles: node.data?.rightHandles ? [...node.data.rightHandles] : undefined,
          topHandles: node.data?.topHandles ? [...node.data.topHandles] : undefined,
          bottomHandles: node.data?.bottomHandles ? [...node.data.bottomHandles] : undefined,
        }
      : undefined;

    snapshot.node = snapshot.node || {};
    snapshot.node[node.id] = {
      x: finalX,
      y: finalY,
      w: width,
      h: height,
      ...(ports && { ports }),
    };

    if (node.type === 'group' || node.type === 'draftGroup') {
      snapshot.group = snapshot.group || {};
      snapshot.group[node.id] = {
        x: finalX,
        y: finalY,
        w: rawWidth ?? existingGroupView?.w ?? width,
        h: rawHeight ?? existingGroupView?.h ?? height,
        ...(ports && { ports }),
      };
    }
  });

  // Process edges - save edge handles and waypoints to ViewState (same place as nodes/groups)
  if (edges && edges.length > 0) {
    edges.forEach((edge) => {
      const edgeId = edge.id;
      if (!edgeId) return;

      // Get existing edge ViewState if any
      const existingEdgeView = viewStateRef?.current?.edge?.[edgeId];

      // Extract edge handles from ReactFlow edge (sourceHandle/targetHandle)
      // These are CRITICAL for port persistence - edges must reconnect to correct ports on refresh
      const sourceHandle = edge.sourceHandle;
      const targetHandle = edge.targetHandle;

      // CRITICAL: Extract ELK waypoints from edge.data for LOCK mode persistence
      // Without this, edges lose ELK data on refresh and fall back to libavoid routing!
      const edgeData = edge.data;
      const routingMode = edgeData?.routingMode;
      const elkStartPoint = edgeData?.elkStartPoint;
      const elkEndPoint = edgeData?.elkEndPoint;
      const elkWaypoints = edgeData?.elkWaypoints || edgeData?.bendPoints;
      
      
      // Build waypoints array for LOCK mode edges (ELK routing)
      // Format: [startPoint, ...bendPoints, endPoint]
      let waypointsToSave = existingEdgeView?.waypoints;
      if (routingMode === 'LOCK' && elkStartPoint && elkEndPoint) {
        // Build complete waypoints array from ELK data
        waypointsToSave = [
          { x: elkStartPoint.x, y: elkStartPoint.y },
          ...(elkWaypoints || []).map((p: any) => ({ x: p.x, y: p.y })),
          { x: elkEndPoint.x, y: elkEndPoint.y }
        ];
      }

      // CRITICAL: Always save edge state for ALL edges
      // Previously, we only saved edges with handles, but ELK edges may not have handles set
      // and we MUST save waypoints and routing mode to preserve ELK routing on refresh
      snapshot.edge = snapshot.edge || {};
      snapshot.edge[edgeId] = {
        ...existingEdgeView,
        // CRITICAL: Save handles so edges connect to correct ports on refresh
        // Without these, edges default to top of nodes and routing breaks
        ...(sourceHandle && { sourceHandle }),
        ...(targetHandle && { targetHandle }),
        // CRITICAL: Save routing mode so edges stay in LOCK mode after refresh
        ...(routingMode && { routingMode }),
        // CRITICAL: Save waypoints so ELK routing is preserved after refresh
        // Without this, edges fall back to libavoid and look broken
        ...(waypointsToSave && { waypoints: waypointsToSave }),
      };
    });
  }

  return snapshot;
}

/**
 * Helper to extract all group IDs from the graph
 */
function extractGroupIdsFromGraph(graph: any): string[] {
  const groupIds: string[] = [];
  if (!graph) return groupIds;
  
  const traverse = (node: any) => {
    if (node.type === 'group' || node.data?.isGroup || node.mode) {
      groupIds.push(node.id);
    }
    if (node.children) {
      node.children.forEach((child: any) => traverse(child));
    }
  };
  
  if (graph.children) {
    graph.children.forEach((child: any) => traverse(child));
  }
  
  return groupIds;
}

/**
 * Saves a canvas snapshot to local storage
 */
export function saveCanvasSnapshot(
  rawGraph: any,
  viewState: ViewState,
  selectedArchitectureId: string
): void {
  try {
    const payload: CanvasSnapshot = {
      rawGraph,
      viewState,
      selectedArchitectureId,
      timestamp: Date.now(),
    };
    const serialized = JSON.stringify(payload);
    localStorage.setItem(LOCAL_CANVAS_SNAPSHOT_KEY, serialized);
    sessionStorage.setItem(LOCAL_CANVAS_SNAPSHOT_KEY, serialized);
  } catch (error) {
    console.error("❌ [saveCanvasSnapshot] Failed to persist local canvas snapshot:", error);
  }
}

/**
 * Restores a canvas snapshot from local storage
 */
export function restoreCanvasSnapshot(): CanvasSnapshot | null {
  try {
    const stored = localStorage.getItem(LOCAL_CANVAS_SNAPSHOT_KEY) || sessionStorage.getItem(LOCAL_CANVAS_SNAPSHOT_KEY);
    if (!stored) return null;

    const parsed = JSON.parse(stored);
    if (!parsed || !parsed.rawGraph || !parsed.rawGraph.children || parsed.rawGraph.children.length === 0) {
      return null;
    }

    // Check if snapshot is recent (within 24 hours)
    const ageInHours = (Date.now() - (parsed.timestamp || 0)) / (1000 * 60 * 60);
    if (ageInHours > 24) {
      console.log("🗑️ Local canvas snapshot expired, ignoring");
      clearCanvasSnapshot();
      return null;
    }

    return parsed as CanvasSnapshot;
  } catch (error) {
    console.warn("⚠️ Failed to restore local canvas snapshot:", error);
    return null;
  }
}

/**
 * Clears the canvas snapshot from local storage
 */
export function clearCanvasSnapshot(): void {
  try {
    localStorage.removeItem(LOCAL_CANVAS_SNAPSHOT_KEY);
    sessionStorage.removeItem(LOCAL_CANVAS_SNAPSHOT_KEY);
  } catch (error) {
    console.warn("⚠️ Failed to clear canvas snapshot:", error);
  }
}

/**
 * Checks if a canvas snapshot exists and is valid
 */
export function hasValidCanvasSnapshot(): boolean {
  const snapshot = restoreCanvasSnapshot();
  return snapshot !== null;
}
