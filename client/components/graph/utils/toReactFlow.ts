import { Edge, MarkerType } from "reactflow";
import { CustomNode } from "../../../types/graph";
import { computeAbsolutePositions } from "./elk/absPositions";
import { buildNodeEdgePoints } from "./edgePoints";
import { CANVAS_STYLES } from "../styles/canvasStyles";

interface NodeDimensions {
  width: number;
  height: number;
  groupWidth: number;
  groupHeight: number;
  padding: number;
}

export function processLayoutedGraph(elkGraph: any, dimensions: NodeDimensions) {
  // NO SNAPPING NEEDED - ELK output is already scaled to 16px grid
  // All coordinates come from scaleElkOutput() which multiplies by GRID_SIZE
  // This ensures perfect alignment between ELK Domain Graph and canvas

  // Calculate absolute positions for all nodes in the graph
  const absolutePositions = computeAbsolutePositions(elkGraph);
  
  // Build a map of edge connection points for each node
  const edgeConnectionPoints = buildNodeEdgePoints(elkGraph, absolutePositions);

  const nodes: CustomNode[] = [];
  const edges: Edge[] = [];
  const processedEdgeIds = new Set<string>();

  /* ---------- helper to create RF nodes -------------------------------- */
  const createNode = (node: any, parentAbsolutePosition = { x: 0, y: 0 }, parentId?: string) => {
    // No snapping needed - ELK output is already grid-aligned
    const absPos = absolutePositions[node.id];
    const isGroupNode = (node.children?.length ?? 0) > 0;

    // Use dimensions directly from ELK (already scaled to pixels)
    const nodeWidth  = node.width  || dimensions.width;
    const nodeHeight = node.height || dimensions.height;
    const groupWidth  = node.width  || dimensions.groupWidth;
    const groupHeight = node.height || dimensions.groupHeight;

    // Only set parentId if it's not root (root is skipped from rendering)
    // Nodes that would have root as parent become top-level (no parentId)
    const validParentId = parentId && parentId !== 'root' ? parentId : undefined;


    // Use 'draftGroup' instead of 'group' to avoid ReactFlow's built-in group behavior
    // which blocks dragging. See docs/FIGJAM_REFACTOR.md section 0.1
    nodes.push({
      id: node.id,
      type: isGroupNode ? "draftGroup" : "custom",
      // Use ELK coordinates directly - already grid-aligned from scaleElkOutput
      position: validParentId ? { x: node.x ?? 0, y: node.y ?? 0 } : { x: absPos.x, y: absPos.y },
      ...(validParentId && { parentId: validParentId }),
      zIndex: isGroupNode ? CANVAS_STYLES.zIndex.groups : CANVAS_STYLES.zIndex.nodes,
      selectable: true,
      selected: false,
      draggable: true,
      data: {
        label: node.labels?.[0]?.text || (node.id === 'root' ? '' : node.id),
        width: nodeWidth,
        height: nodeHeight,
        isParent: isGroupNode,
        // Pass through icon if it exists in the node data
        ...(node.data?.icon && { icon: node.data.icon }),
        // Pass through style if it exists in the node data
        ...(node.data?.style && { style: node.data.style }),
        // Pass through groupIcon if it exists in the node data
        ...(node.data?.groupIcon && { groupIcon: node.data.groupIcon }),
        // Handle deltas - no snapping needed, ELK already grid-aligned
        leftHandles: (edgeConnectionPoints[node.id]?.left ?? []).map(connectionPoint => {
          const delta = connectionPoint.y - absPos.y;
          return delta;
        }),
        rightHandles: (edgeConnectionPoints[node.id]?.right ?? []).map(connectionPoint => {
          const delta = connectionPoint.y - absPos.y;
          return delta;
        }),
        topHandles: (edgeConnectionPoints[node.id]?.top ?? []).map(connectionPoint => {
          const delta = connectionPoint.x - absPos.x;
          return delta;
        }),
        bottomHandles: (edgeConnectionPoints[node.id]?.bottom ?? []).map(connectionPoint => {
          const delta = connectionPoint.x - absPos.x;
          return delta;
        }),
        position: { x: absPos.x, y: absPos.y }
      },
      style: isGroupNode ? {
        width: groupWidth,
        height: groupHeight,
        backgroundColor: 'transparent',
        border: 'none',
        display: 'flex',
        justifyContent: 'flex-start',
        alignItems: 'flex-start',
        padding: '0px',
        pointerEvents: 'all'
      } : {
        pointerEvents: 'all'
      }
    } as CustomNode);

    // Process child nodes recursively
    // Only pass parentId if this node will be in the ReactFlow nodes array (i.e., not root)
    const nodeIdInReactFlow = node.id !== 'root' ? node.id : undefined;
    (node.children || []).forEach((childNode: any) => createNode(childNode, absPos, nodeIdInReactFlow));
  };

  // Start node creation from root's children (skip root itself)
  // Root represents the entire canvas and should not be rendered as a node
  
  (elkGraph.children || []).forEach((childNode: any) => {
    createNode(childNode);
  });
  
  // Final pass: Remove any invalid parentId references
  // This ensures no node references a parent that doesn't exist in the nodes array
  const nodeIdsSet = new Set(nodes.map(n => n.id));
  nodes.forEach(node => {
    if ((node as any).parentId && !nodeIdsSet.has((node as any).parentId)) {
      console.warn(`[toReactFlow] FIXING: Removing invalid parentId '${(node as any).parentId}' from node '${node.id}' - parent does not exist`);
      delete (node as any).parentId;
      // Update position to absolute if it was relative
      if ((node.data as any).position) {
        node.position = (node.data as any).position;
      }
    }
  });

  /* ---------- helper to create RF edges -------------------------------- */
  // Create a map of node types for quick lookups
  const nodeTypeMap = new Map(nodes.map(node => [node.id, node.type]));

  const createEdge = (edge: any, containerAbs: { x: number; y: number }, parentNode?: any) => {
    edge.sources?.forEach((sourceNodeId: string) =>
      edge.targets?.forEach((targetNodeId: string) => {
        const edgeId = edge.id || `${sourceNodeId}-${targetNodeId}-${Math.random().toString(36).substr(2, 9)}`;
        if (processedEdgeIds.has(edgeId)) return;
        processedEdgeIds.add(edgeId);

        // Check if this edge uses connector handles (format: connector-${side}-source/target)
        // Connector handles are stored in the edge metadata if available
        let sourceHandle: string | undefined;
        let targetHandle: string | undefined;
        
        // Try to extract connector handles from edge metadata if available
        // For edges created via connector tool, the handle IDs are in the edge data
        if (edge.data?.sourceHandle) {
          sourceHandle = edge.data.sourceHandle;
        }
        if (edge.data?.targetHandle) {
          targetHandle = edge.data.targetHandle;
        }

        if (!sourceHandle || !targetHandle) {
          let sourceHandleIndex = -1;
          let sourceHandleSide = "right";
          let targetHandleIndex = -1;
          let targetHandleSide = "left";

          // Check all sides for the source node
          for (const side of ["right", "left", "top", "bottom"]) {
            const connectionPoints = edgeConnectionPoints[sourceNodeId]?.[side] ?? [];
            const index = connectionPoints.findIndex(
              connectionPoint => connectionPoint.edgeId === edge.id
            );
            if (index >= 0) {
              sourceHandleIndex = index;
              sourceHandleSide = side;
              break;
            }
          }

          // Check all sides for the target node
          for (const side of ["left", "right", "top", "bottom"]) {
            const connectionPoints = edgeConnectionPoints[targetNodeId]?.[side] ?? [];
            const index = connectionPoints.findIndex(
              connectionPoint => connectionPoint.edgeId === edge.id
            );
            if (index >= 0) {
              targetHandleIndex = index;
              targetHandleSide = side;
              break;
            }
          }

          const isSourceGroupNode = nodeTypeMap.get(sourceNodeId) === 'group';
          const isTargetGroupNode = nodeTypeMap.get(targetNodeId) === 'group';
          
          // Determine if the handle is a source or target based on the edge's direction
          // For source handle, prefer "source" type, for target handle, prefer "target" type
          const sourceHandleType = "source";
          const targetHandleType = "target";
          
          sourceHandle = sourceHandleIndex >= 0 ? `${sourceHandleSide}-${sourceHandleIndex}-${sourceHandleType}` : undefined;
          targetHandle = targetHandleIndex >= 0 ? `${targetHandleSide}-${targetHandleIndex}-${targetHandleType}` : undefined;
        }

        if (sourceHandle && targetHandle) {
          /* ─────── turn label position into ABSOLUTE coordinates ─────── */
          const elkLbl      = edge.labels?.[0];
          const labelTxt    = elkLbl?.text ?? "";
          const labelPosAbs = elkLbl
            ? { x: elkLbl.x + containerAbs.x, y: elkLbl.y + containerAbs.y }
            : undefined;
          


          // Get parent group mode (LOCK = ELK routing, FREE = libavoid routing)
          // Per FIGJAM_REFACTOR.md: AI edits default to LOCK mode
          // If no parent mode is set, default to LOCK (for AI-generated graphs)
          const parentGroupMode = parentNode?.mode === 'FREE' ? 'FREE' : 'LOCK';
          
          // CRITICAL: Also pass ELK's startPoint and endPoint in ABSOLUTE coordinates
          // These are the actual edge attachment points computed by ELK, NOT ReactFlow handle positions
          const elkSection = edge.sections?.[0];
          
          // CRITICAL FIX: Read bendPoints DIRECTLY from ELK section, not from absoluteBendPoints
          // absoluteBendPoints is only set if the array has length, but we need to compute
          // absolute coordinates for ALL bendPoints, including from edges we haven't processed yet
          // The svgExport.ts works because it reads directly from section.bendPoints
          const rawBendPoints = elkSection?.bendPoints || [];
          const elkBendPoints = rawBendPoints.map((bp: any) => ({
            x: containerAbs.x + bp.x,
            y: containerAbs.y + bp.y
          }));
          
          const elkStartPoint = elkSection?.startPoint 
            ? { x: containerAbs.x + elkSection.startPoint.x, y: containerAbs.y + elkSection.startPoint.y }
            : undefined;
          const elkEndPoint = elkSection?.endPoint
            ? { x: containerAbs.x + elkSection.endPoint.x, y: containerAbs.y + elkSection.endPoint.y }
            : undefined;
          
          console.log(`[🔧 toReactFlow] Edge ${edgeId}: mode=${parentGroupMode}, rawBendPoints=${rawBendPoints.length}, elkBendPoints=${elkBendPoints.length}`, {
            parentNodeId: parentNode?.id,
            parentMode: parentNode?.mode,
            rawBendPoints: rawBendPoints.map((p: any) => `${p.x?.toFixed(0)},${p.y?.toFixed(0)}`),
            elkBendPoints: elkBendPoints.map((p: any) => `${p.x?.toFixed(0)},${p.y?.toFixed(0)}`),
            elkStartPoint: elkStartPoint ? `${elkStartPoint.x?.toFixed(0)},${elkStartPoint.y?.toFixed(0)}` : 'none',
            elkEndPoint: elkEndPoint ? `${elkEndPoint.x?.toFixed(0)},${elkEndPoint.y?.toFixed(0)}` : 'none'
          });
          
          edges.push({
            id: edgeId, 
            source: sourceNodeId, 
            target: targetNodeId,
            type: edge.sections?.[0]?.bendPoints?.length >= 2 ? "step" : "smoothstep",
            zIndex: CANVAS_STYLES.zIndex.edges,
            sourceHandle: sourceHandle,
            targetHandle: targetHandle,
            selectable: true,
            focusable: true,
            style: CANVAS_STYLES.edges.default,
            markerEnd: {
              type: MarkerType.ArrowClosed,
              width: CANVAS_STYLES.edges.marker.width,
              height: CANVAS_STYLES.edges.marker.height,
              color: CANVAS_STYLES.edges.marker.color
            },
            /* put it in BOTH places so every consumer is happy */
            label: labelTxt,
            data: {
              labelText: labelTxt,
              bendPoints: elkBendPoints,
              labelPos: labelPosAbs,          // ← now absolute
              // Routing mode: LOCK uses ELK bendPoints, FREE uses libavoid
              routingMode: parentGroupMode,
              // ALWAYS pass ELK waypoints - StepEdge LOCK mode needs them
              // CRITICAL: Always pass the array even if empty - StepEdge needs elkStartPoint/elkEndPoint
              elkWaypoints: elkBendPoints,
              // CRITICAL: Pass ELK's computed start/end points in ABSOLUTE coordinates
              // These are the actual edge attachment points, not ReactFlow handle estimates
              elkStartPoint,
              elkEndPoint,
            },
            selected: false,
            hidden: false,
          });
        } else {
          // Keep essential edge skip warning for debugging
          console.warn(`⚠️ [EDGE-SKIP] Edge ${edge.id} skipped - handle not found`, {
            edgeId,
            sourceNodeId,
            targetNodeId,
            sourceHandle,
            targetHandle,
            wasConnectorEdge: !!(edge.data?.sourceHandle || edge.data?.targetHandle),
            edgeData: edge.data,
            containerAbs: containerAbs
          });
        }
      })
    );
  };

  const processEdges = (node: any) => {
    const absRaw = absolutePositions[node.id];      // abs pos of this container
    // CRITICAL: Use RAW absolute position for edge coordinates, NOT snapped
    // Snapping causes misalignment between ELK's computed edge positions and canvas rendering
    // svgExport.ts uses raw coordinates and edges align perfectly - we must do the same
    (node.edges || []).forEach((e: any) => createEdge(e, absRaw, node));
    (node.children || []).forEach(processEdges);
  };
  
  // Process all edges in the graph
  processEdges(elkGraph);

  // Final edge creation complete

  return { nodes, edges };
} 