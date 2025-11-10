import React, { useEffect, useState } from 'react';
import { BaseEdge, EdgeLabelRenderer, EdgeProps, Position, useStore } from 'reactflow';
import { getEdgeStyle, CANVAS_STYLES } from './graph/styles/canvasStyles';
import ELK from 'elkjs/lib/elk.bundled.js';
import { testEdgeCollision } from '../utils/edgeCollisionTest';

type HandleSide = 'left' | 'right' | 'top' | 'bottom';

const DEFAULT_NODE_WIDTH = 96;
const DEFAULT_NODE_HEIGHT = 96;
const PORT_OFFSET = 0; // Let ELK start exactly at the node boundary
const DEFAULT_OBSTACLE_MARGIN = 0;

const safeNumber = (value: unknown): number | undefined =>
  typeof value === 'number' && Number.isFinite(value) ? value : undefined;

const getHandleSide = (handleId?: string, position?: Position): HandleSide => {
  const id = handleId?.toLowerCase() ?? '';

  if (id.includes('right')) return 'right';
  if (id.includes('left')) return 'left';
  if (id.includes('top')) return 'top';
  if (id.includes('bottom')) return 'bottom';

  // Fallback based on position
  switch (position) {
    case Position.Right: return 'right';
    case Position.Left: return 'left';
    case Position.Top: return 'top';
    case Position.Bottom: return 'bottom';
    default: return 'right';
  }
};

const sideToElkPortSide = (side: HandleSide): string => {
  switch (side) {
    case 'right': return 'EAST';
    case 'left': return 'WEST';
    case 'top': return 'NORTH';
    case 'bottom': return 'SOUTH';
    default: return 'EAST';
  }
};

const StepEdge: React.FC<EdgeProps> = ({ 
  id, 
  source,
  target,
  sourceX, 
  sourceY, 
  targetX, 
  targetY, 
  sourcePosition,
  targetPosition,
  style = {},
  data,
  markerEnd,
  selected,
  sourceHandleId,
  targetHandleId,
}) => {
  const [calculatedBendPoints, setCalculatedBendPoints] = useState<Array<{ x: number; y: number }>>([]);
  const [elkDebugInfo, setElkDebugInfo] = useState<any>(null);

  // Get all nodes from React Flow store for obstacle detection
  const allNodes = useStore((state) => state?.nodes ?? []);

  const edgeData = data as any;
  const sourceHandle = edgeData?.sourceHandle || sourceHandleId;
  const targetHandle = edgeData?.targetHandle || targetHandleId;

  // Get node dimensions from React Flow store
  const sourceNode = allNodes.find(n => n.id === source);
  const targetNode = allNodes.find(n => n.id === target);

  const sourceNodeWidth = safeNumber(sourceNode?.data?.width) ?? DEFAULT_NODE_WIDTH;
  const sourceNodeHeight = safeNumber(sourceNode?.data?.height) ?? DEFAULT_NODE_HEIGHT;
  const targetNodeWidth = safeNumber(targetNode?.data?.width) ?? DEFAULT_NODE_WIDTH;
  const targetNodeHeight = safeNumber(targetNode?.data?.height) ?? DEFAULT_NODE_HEIGHT;

  const edgeLabel = edgeData?.label;

  let edgePath = '';
  
  // Run ELK locally for edges without bend points
  useEffect(() => {
    if (data?.bendPoints && data.bendPoints.length > 0) {
      // Already have bend points, no need to recalculate
      return;
    }

    const elk = new ELK();

    // Determine edge direction for ELK
    const deltaY = targetY - sourceY;
    const deltaX = targetX - sourceX;
    const direction = Math.abs(deltaY) >= Math.abs(deltaX)
      ? (deltaY < 0 ? 'UP' : 'DOWN')
      : (deltaX < 0 ? 'UP' : 'RIGHT');

    // Get obstacle margin from edge data - use working configuration
    const obstacleMargin =
      safeNumber(edgeData?.obstacleMargin) ?? DEFAULT_OBSTACLE_MARGIN;

    // Create obstacle children from all React Flow nodes
    const obstacleChildren = allNodes
      .filter(node => node.id !== source && node.id !== target)
      .map(node => {
        const nodeWidth = safeNumber(node.data?.width) ?? DEFAULT_NODE_WIDTH;
        const nodeHeight = safeNumber(node.data?.height) ?? DEFAULT_NODE_HEIGHT;
        
        return {
          id: `obstacle-${node.id}`,
          width: nodeWidth + obstacleMargin,
          height: nodeHeight + obstacleMargin,
          x: node.position.x - obstacleMargin / 2,
          y: node.position.y - obstacleMargin / 2,
          layoutOptions: {
            'elk.nodePosition.fixed': 'true'
          }
        };
      });

    // Get handle sides
    const sourceSide = getHandleSide(sourceHandle, sourcePosition);
    const targetSide = getHandleSide(targetHandle, targetPosition);

    // Calculate port positions relative to node top-left
    // CRITICAL: Offset ports OUTSIDE node bounds to prevent collision
    const getPortOffset = (side: HandleSide, nodeWidth: number, nodeHeight: number) => {
      switch (side) {
        case 'right': return { x: nodeWidth + PORT_OFFSET, y: nodeHeight / 2 };
        case 'left': return { x: -PORT_OFFSET, y: nodeHeight / 2 };
        case 'top': return { x: nodeWidth / 2, y: -PORT_OFFSET };
        case 'bottom': return { x: nodeWidth / 2, y: nodeHeight + PORT_OFFSET };
        default: return { x: nodeWidth + PORT_OFFSET, y: nodeHeight / 2 };
      }
    };

    const sourcePortOffset = getPortOffset(sourceSide, sourceNodeWidth, sourceNodeHeight);
    const targetPortOffset = getPortOffset(targetSide, targetNodeWidth, targetNodeHeight);

    // Calculate node positions (top-left corners)
    const sourceNodeX = sourceX - sourcePortOffset.x;
    const sourceNodeY = sourceY - sourcePortOffset.y;
    const targetNodeX = targetX - targetPortOffset.x;
    const targetNodeY = targetY - targetPortOffset.y;

    const sourcePortId = `${source}_${sourceSide}`;
    const targetPortId = `${target}_${targetSide}`;

    const graph = {
      id: 'temp',
      layoutOptions: {
        'elk.algorithm': 'layered',
        'elk.direction': direction,
        'elk.edgeRouting': 'ORTHOGONAL',
        'elk.routing.runTrueEdgeRouting': 'true',
        'elk.spacing.edgeNode': '8',
        'elk.spacing.nodeNode': '8',
        'elk.layered.nodePlacement.strategy': 'SIMPLE',
        'elk.nodePosition.fixed': 'true',
        'org.eclipse.elk.nodePosition.fixed': 'true',
        'elk.layered.considerModelOrder': 'true',
        'org.eclipse.elk.alg.libavoid.shapeBufferDistance': '2',
      },
      children: [
        ...obstacleChildren,
        {
          id: source,
          width: sourceNodeWidth,
          height: sourceNodeHeight,
          x: sourceNodeX,
          y: sourceNodeY,
          layoutOptions: {
            'elk.portConstraints': 'FIXED_POS',
            'elk.portAlignment.default': 'CENTER',
            'elk.nodePosition.fixed': 'true',
            'org.eclipse.elk.nodePosition.fixed': 'true',
          },
          ports: [
            {
              id: sourcePortId,
              x: sourcePortOffset.x,
              y: sourcePortOffset.y,
              layoutOptions: {
                'elk.port.side': sideToElkPortSide(sourceSide),
              },
              width: 0,
              height: 0,
            },
          ],
        },
        {
          id: target,
          width: targetNodeWidth,
          height: targetNodeHeight,
          x: targetNodeX,
          y: targetNodeY,
          layoutOptions: {
            'elk.portConstraints': 'FIXED_POS',
            'elk.portAlignment.default': 'CENTER',
            'elk.nodePosition.fixed': 'true',
            'org.eclipse.elk.nodePosition.fixed': 'true',
          },
          ports: [
            {
              id: targetPortId,
              x: targetPortOffset.x,
              y: targetPortOffset.y,
              layoutOptions: {
                'elk.port.side': sideToElkPortSide(targetSide),
              },
              width: 0,
              height: 0,
            },
          ],
        },
      ],
      edges: [
        {
          id: id,
          sources: [sourcePortId],
          targets: [targetPortId],
          layoutOptions: {
            'elk.edgeRouting': 'ORTHOGONAL',
            'elk.routing.runTrueEdgeRouting': 'true',
            'elk.orthogonalRouting.startDirection': sideToElkPortSide(sourceSide),
            'elk.orthogonalRouting.endDirection': sideToElkPortSide(targetSide),
            'org.eclipse.elk.alg.libavoid.shapeBufferDistance': '2',
          },
          sections: [
            {
              id: `${id}_s0`,
              startPoint: { x: sourceX, y: sourceY },
              endPoint: { x: targetX, y: targetY },
            },
          ],
        },
      ],
    };
    
    // Store input for debugging
    setElkDebugInfo({ input: JSON.parse(JSON.stringify(graph)) });
    setCalculatedBendPoints([]);
    
    elk.layout(graph).then((layouted: any) => {
      const edge = layouted.edges?.[0];
      const section = edge?.sections?.[0];

      const layoutStartPoint = section?.startPoint;
      const layoutEndPoint = section?.endPoint;

      const computeAxisTransformFromSection = (
        layoutValueA: number | undefined,
        layoutValueB: number | undefined,
        actualValueA: number,
        actualValueB: number,
        fallbackScale?: number
      ) => {
        if (
          typeof layoutValueA !== 'number' ||
          typeof layoutValueB !== 'number'
        ) {
          return {
            scale: 1,
            offset: actualValueA - (layoutValueA ?? actualValueA),
          };
        }

        const deltaLayout = layoutValueA - layoutValueB;
        if (Math.abs(deltaLayout) < 1e-6) {
          return {
            scale: 1,
            offset: actualValueA - layoutValueA,
          };
        }

        const deltaActual = actualValueA - actualValueB;
        if (Math.abs(deltaActual) < 1e-6) {
          const scale =
            typeof fallbackScale === 'number' && Math.abs(fallbackScale) > 1e-6
              ? fallbackScale
              : 1;
          const offset = actualValueA - scale * layoutValueA;
          return { scale, offset };
        }

        const scale = deltaActual / deltaLayout;
        const offset = actualValueA - scale * layoutValueA;
        return { scale, offset };
      };

      const xTransform = computeAxisTransformFromSection(
        layoutStartPoint?.x,
        layoutEndPoint?.x,
        sourceX,
        targetX
      );
      const yTransform = computeAxisTransformFromSection(
        layoutStartPoint?.y,
        layoutEndPoint?.y,
        sourceY,
        targetY,
        1
      );

      const transformDetails = {
        edgeId: id,
        layoutStartPoint,
        layoutEndPoint,
        actualStartPoint: { x: sourceX, y: sourceY },
        actualEndPoint: { x: targetX, y: targetY },
        xTransform,
        yTransform,
        sourcePortOffset,
        targetPortOffset,
        sourceNode: {
          id: source,
          x: sourceNodeX,
          y: sourceNodeY,
          width: sourceNodeWidth,
          height: sourceNodeHeight,
        },
        targetNode: {
          id: target,
          x: targetNodeX,
          y: targetNodeY,
          width: targetNodeWidth,
          height: targetNodeHeight,
        },
        obstacleMargin,
        obstacleCount: obstacleChildren.length,
      };

      if (typeof window !== 'undefined' && process.env.NODE_ENV !== 'production') {
        console.debug('[StepEdge][ELK Transform]', {
          edgeId: id,
          transformDetails,
          layoutBendPoints: section?.bendPoints ?? [],
        });
      }

      const applyTransform = (point: { x: number; y: number } | undefined) => {
        if (!point) return undefined;
        return {
          x: xTransform.scale * point.x + xTransform.offset,
          y: yTransform.scale * point.y + yTransform.offset,
        };
      };

      const layoutPoints = section
        ? [
            section.startPoint,
            ...(section.bendPoints || []),
            section.endPoint,
          ]
        : [];

      const transformedPoints = layoutPoints.length
        ? layoutPoints.map(point => applyTransform(point)!)
        : [];

      const adjustedPoints = transformedPoints.length
        ? (() => {
            const adjusted = transformedPoints.map((point, index) => {
              if (index === 0) {
                return { x: sourceX, y: sourceY };
              }
              if (index === transformedPoints.length - 1) {
                return { x: targetX, y: targetY };
              }
              return { ...point };
            });

            // Forward pass: align with previous segment orientation
            for (let i = 1; i < adjusted.length - 1; i += 1) {
              const prevLayout = layoutPoints[i - 1];
              const currLayout = layoutPoints[i];
              const prevActual = adjusted[i - 1];
              const isHorizontal =
                Math.abs(currLayout.x - prevLayout.x) >=
                Math.abs(currLayout.y - prevLayout.y);

              if (isHorizontal) {
                adjusted[i].y = prevActual.y;
              } else {
                adjusted[i].x = prevActual.x;
              }
            }

            // Backward pass: align with next segment orientation
            for (let i = adjusted.length - 2; i >= 1; i -= 1) {
              const nextLayout = layoutPoints[i + 1];
              const currLayout = layoutPoints[i];
              const nextActual = adjusted[i + 1];
              const isHorizontal =
                Math.abs(nextLayout.x - currLayout.x) >=
                Math.abs(nextLayout.y - currLayout.y);

              if (isHorizontal) {
                adjusted[i].y = nextActual.y;
              } else {
                adjusted[i].x = nextActual.x;
              }
            }

            return adjusted;
          })()
        : [];

      const adjustedBendPoints =
        adjustedPoints.length > 2
          ? adjustedPoints.slice(1, adjustedPoints.length - 1)
          : [];

      const transformedSection = section
        ? {
            ...section,
            startPoint: { x: sourceX, y: sourceY },
            endPoint: { x: targetX, y: targetY },
            bendPoints: adjustedBendPoints,
          }
        : undefined;

      const transformedEdge = edge
        ? {
            ...edge,
            sections: transformedSection
              ? [transformedSection]
              : edge.sections,
          }
        : undefined;

      // Store output for debugging (both raw + transformed coordinates)
      setElkDebugInfo(prev => ({
        ...prev,
        output: {
          edge: JSON.parse(JSON.stringify(edge)),
          section: JSON.parse(JSON.stringify(section)),
          fullLayout: JSON.parse(JSON.stringify(layouted)),
          transformed: {
            edge: JSON.parse(JSON.stringify(transformedEdge)),
            section: JSON.parse(JSON.stringify(transformedSection)),
            transform: {
              x: xTransform,
              y: yTransform,
            },
          },
          transformDetails,
        }
      }));

      if (transformedSection) {
        const bendPoints = transformedSection.bendPoints || [];

        setCalculatedBendPoints(bendPoints.length > 0 ? bendPoints : []);

        if (data) {
          (data as any).bendPoints = bendPoints;
        }

        // COLLISION TEST: Check if rendered edge intersects with nodes
        // Use the TRANSFORMED bend points (in React Flow coordinate space)
        const nodeRects = allNodes.map(node => ({
          x: node.position.x,
          y: node.position.y,
          width: safeNumber(node.data?.width) ?? DEFAULT_NODE_WIDTH,
          height: safeNumber(node.data?.height) ?? DEFAULT_NODE_HEIGHT
        }));

        const collisionResult = testEdgeCollision(
          { x: sourceX, y: sourceY },
          { x: targetX, y: targetY },
          bendPoints, // These are already transformed to React Flow coordinates
          nodeRects
        );

        console.log(`🔍 COLLISION TEST [${id}]:`, collisionResult.details.join('\n'));
        
        // Store collision test result in edge data for export
        if (data) {
          (data as any)._collisionTest = {
            collides: collisionResult.collides,
            details: collisionResult.details,
            nodeCount: nodeRects.length,
            bendPointCount: bendPoints.length,
            nodeRects,
          };
        }
      }
    }).catch((err: any) => {
      setElkDebugInfo(prev => ({ ...prev, error: err.message }));
      console.error('❌ [StepEdge] ELK layout failed:', err);
    });
  }, [
    id,
    source,
    target,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourceHandle,
    targetHandle,
    sourcePosition,
    targetPosition,
    sourceNodeWidth,
    sourceNodeHeight,
    targetNodeWidth,
    targetNodeHeight,
    edgeData?.obstacleMargin,
    data?.bendPoints,
    JSON.stringify(allNodes.map(n => ({ id: n.id, x: n.position.x, y: n.position.y, width: n.data?.width, height: n.data?.height })))
  ]);
  
  // Store debug info in edge data for export
  useEffect(() => {
    if (elkDebugInfo && data) {
      (data as any)._elkDebug = elkDebugInfo;
    }
  }, [elkDebugInfo, data]);
  
  // Use ELK bend points (either from data or calculated)
  const bendPoints = data?.bendPoints || calculatedBendPoints;
  
  if (!bendPoints || bendPoints.length === 0) {
    // Still loading or ELK failed - render straight line
    edgePath = `M ${sourceX} ${sourceY} L ${targetX} ${targetY}`;
    } else {
    // Use ELK bend points - NO HARDCODED LOGIC, ONLY ELK OUTPUT
    const points = [
      { x: sourceX, y: sourceY },
      ...bendPoints,
      { x: targetX, y: targetY }
    ];

    let pathCommands = [`M ${sourceX} ${sourceY}`];
    for (let i = 1; i < points.length; i++) {
      pathCommands.push(`L ${points[i].x} ${points[i].y}`);
    }
    edgePath = pathCommands.join(' ');
  }
  
  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          ...style,
          ...getEdgeStyle(selected, false),
        }}
        markerEnd={markerEnd}
      />
      
      {edgeLabel && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${(sourceX + targetX) / 2}px, ${(sourceY + targetY) / 2}px)`,
              fontSize: 12,
              pointerEvents: 'all',
              ...CANVAS_STYLES.edgeLabel,
            }}
            className="nodrag nopan"
          >
            {edgeLabel}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
};

export default StepEdge; 