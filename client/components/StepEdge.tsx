import React, { useEffect, useMemo, useState } from 'react';
import { BaseEdge, EdgeLabelRenderer, EdgeProps, Position, useStore } from 'reactflow';
import { getEdgeStyle, CANVAS_STYLES } from './graph/styles/canvasStyles';
import { testEdgeCollision } from '../utils/edgeCollisionTest';
import { AvoidLib } from 'libavoid-js';
import { useViewMode } from '../contexts/ViewModeContext';

const DEFAULT_NODE_WIDTH = 96;
const DEFAULT_NODE_HEIGHT = 96;
const DEFAULT_OBSTACLE_MARGIN = 12;

const safeNumber = (value: unknown, fallback: number): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback;

type Point = { x: number; y: number };
type NodeRect = { id: string; x: number; y: number; width: number; height: number };
type RoutingStatus = 'ok' | 'degraded' | 'error';

declare global {
  interface Window {
    libavoid?: any;
    Avoid?: any;
    __edgeDebug?: {
      [key: string]: {
        snappedPoints: Point[];
        rawPolyline?: Point[];
        fallbackApplied: boolean;
        status?: RoutingStatus;
        message?: string;
        sourcePosition: Position | undefined;
        targetPosition: Position | undefined;
      };
    };
  }
}

const isClient = typeof window !== 'undefined';
let avoidInstancePromise: Promise<any> | null = null;

const ensureAvoidInstance = async () => {
  if (!isClient) {
    throw new Error('libavoid is only available in the browser environment');
  }

  if (!avoidInstancePromise) {
    avoidInstancePromise = (async () => {
      const globalInstance = window.libavoid ?? window.Avoid;
      if (globalInstance) {
        return globalInstance;
      }

      await AvoidLib.load('/libavoid.wasm');

      return AvoidLib.getInstance();
    })()
      .catch((error) => {
        avoidInstancePromise = null;
        throw error;
      });
  }

  return avoidInstancePromise;
};

const pointsToPath = (points: Point[]): string =>
  points.map((pt, idx) => `${idx === 0 ? 'M' : 'L'} ${pt.x} ${pt.y}`).join(' ');

const arePointArraysEqual = (a: Point[], b: Point[]): boolean => {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (Math.abs(a[i].x - b[i].x) > 0.01 || Math.abs(a[i].y - b[i].y) > 0.01) {
      return false;
    }
  }
  return true;
};

const resolvePositionValue = (position: Position | undefined, fallback: Position): Position =>
  position ?? fallback;

const deriveDirectionBetween = (from: Point, to: Point): Position => {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  if (Math.abs(dx) > Math.abs(dy)) {
    return dx >= 0 ? Position.Right : Position.Left;
  }
  return dy >= 0 ? Position.Bottom : Position.Top;
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
  data,
  markerEnd,
  selected,
  style = {},
}) => {
  const edgeData = data as any;
  const [computedBendPoints, setComputedBendPoints] = useState<Point[]>([]);
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [edgePath, setEdgePath] = useState<string>(() =>
    pointsToPath([{ x: sourceX, y: sourceY }, { x: targetX, y: targetY }])
  );
  const [routingStatus, setRoutingStatus] = useState<RoutingStatus>('ok');
  const [routingMessage, setRoutingMessage] = useState<string>('');

  // Get libavoid options from context (for FREE mode parameter tuning)
  const { config, libavoidOptions: contextLibavoidOptions } = useViewMode();
  const libavoidOptions = contextLibavoidOptions || config.libavoidDefaults || {};
  
  // Extract portEdgeSpacing to track it separately for reactivity
  const portEdgeSpacing = libavoidOptions?.portEdgeSpacing ?? config.libavoidDefaults?.portEdgeSpacing ?? 8;
  
  // Track options changes to force rerouting
  const [optionsVersion, setOptionsVersion] = useState(0);
  const prevOptionsRef = React.useRef<string>('');
  const prevPortEdgeSpacingRef = React.useRef<number>(portEdgeSpacing);
  
  React.useEffect(() => {
    const currentOptionsStr = JSON.stringify(libavoidOptions);
    const optionsChanged = prevOptionsRef.current !== currentOptionsStr;
    const spacingChanged = prevPortEdgeSpacingRef.current !== portEdgeSpacing;
    
    if (optionsChanged || spacingChanged) {
      prevOptionsRef.current = currentOptionsStr;
      prevPortEdgeSpacingRef.current = portEdgeSpacing;
      // Clear edge path to force re-render while routing
      setEdgePath(pointsToPath([{ x: sourceX, y: sourceY }, { x: targetX, y: targetY }]));
      setOptionsVersion(v => {
        const newVersion = v + 1;
        console.log(`[StepEdge:${id}] 🔄 Options changed (options=${optionsChanged}, spacing=${spacingChanged}), incrementing optionsVersion to ${newVersion}, portEdgeSpacing=${portEdgeSpacing}`);
        return newVersion;
      });
    }
  }, [libavoidOptions, portEdgeSpacing, id, sourceX, sourceY, targetX, targetY]);

  const allNodes = useStore((state) => state?.nodes ?? []);
  const allEdges = useStore((state) => state?.edges ?? []);
  const nodeCount = allNodes.length;
  const edgeCount = allEdges.length;

  const condensedNodes = useMemo<NodeRect[]>(
    () =>
      allNodes.map((node) => {
        const width = safeNumber((node as any).width ?? node.data?.width, DEFAULT_NODE_WIDTH);
        const height = safeNumber((node as any).height ?? node.data?.height, DEFAULT_NODE_HEIGHT);
        const position = (node as any).positionAbsolute ?? node.position;
        return {
          id: node.id,
          x: safeNumber(position?.x, 0),
          y: safeNumber(position?.y, 0),
          width,
          height,
        };
      }),
    [allNodes]
  );

  const resolvedObstacleRects = useMemo<NodeRect[]>(() => {
    const staticObstacleIds: string[] = Array.isArray(edgeData?.staticObstacleIds)
      ? edgeData.staticObstacleIds
      : [];
    const staticObstacles = Array.isArray(edgeData?.staticObstacles)
      ? edgeData.staticObstacles
      : [];

    if (staticObstacleIds.length > 0) {
      return staticObstacleIds.map((obstacleId, index) => {
        const liveNode = condensedNodes.find((node) => node.id === obstacleId);
        const initialRect = staticObstacles.find((rect: any) => rect?.id === obstacleId);
        
        // Use live position if available, otherwise fall back to initial position from staticObstacles
        const x = liveNode && liveNode.x !== undefined
          ? liveNode.x
          : safeNumber(initialRect?.x, 0);
        const y = liveNode && liveNode.y !== undefined
          ? liveNode.y
          : safeNumber(initialRect?.y, 0);
        const width = safeNumber(liveNode?.width ?? initialRect?.width, DEFAULT_NODE_WIDTH);
        const height = safeNumber(liveNode?.height ?? initialRect?.height, DEFAULT_NODE_HEIGHT);

        return {
          id: obstacleId ?? `${id}-static-${index}`,
          x,
          y,
          width,
          height,
        };
      });
    }

    if (staticObstacles.length === 0) {
      return condensedNodes;
    }

    return staticObstacles.map((rect, index) => {
      const liveNode = rect?.id ? condensedNodes.find((node) => node.id === rect.id) : undefined;
      const width = safeNumber(liveNode?.width ?? rect?.width, DEFAULT_NODE_WIDTH);
      const height = safeNumber(liveNode?.height ?? rect?.height, DEFAULT_NODE_HEIGHT);
      // Use live position if available, otherwise use initial position
      const x = liveNode && liveNode.x !== undefined
        ? liveNode.x
        : safeNumber(rect?.x, 0);
      const y = liveNode && liveNode.y !== undefined
        ? liveNode.y
        : safeNumber(rect?.y, 0);

      return {
        id: rect?.id ?? liveNode?.id ?? `${id}-static-${index}`,
        x,
        y,
        width,
        height,
      };
    });
  }, [edgeData?.staticObstacleIds, edgeData?.staticObstacles, condensedNodes, id]);

  const obstacleSignature = useMemo(() => {
    if (!resolvedObstacleRects || resolvedObstacleRects.length === 0) {
      return 'empty';
    }
    return resolvedObstacleRects
      .map((node) => {
        const x = Math.round(node.x);
        const y = Math.round(node.y);
        const w = Math.round(node.width);
        const h = Math.round(node.height);
        return `${node.id}:${x}:${y}:${w}:${h}`;
      })
      .sort()
      .join('|');
  }, [resolvedObstacleRects]);

  useEffect(() => {
    if (!isClient) {
      return;
    }


    setRoutingStatus('ok');
    setRoutingMessage('');

    let cancelled = false;
    let avoidModule: any;
    const resources: any[] = [];

    const register = (resource: any) => {
      if (resource) {
        resources.push(resource);
      }
      return resource;
    };

    const routeWithLibavoid = async () => {
      try {
        avoidModule = await ensureAvoidInstance();
        if (cancelled) return;

        // Use a shared router for all edges to enable proper pin sharing
        // Reset router when optionsVersion or obstacle positions change
        // Combine optionsVersion and obstacleSignature to create a unique router version
        const routerVersion = `${optionsVersion}:${obstacleSignature}`;
        if (!(window as any).__libavoidSharedRouter || (window as any).__libavoidSharedRouterVersion !== routerVersion) {
          console.log(`[StepEdge:${id}] 🆕 Creating NEW shared router for version ${routerVersion}`);
          const newRouter = new avoidModule.Router(avoidModule.OrthogonalRouting);
          (window as any).__libavoidSharedRouter = newRouter;
          (window as any).__libavoidSharedRouterVersion = routerVersion;
          // Initialize pinIdMap and pinObjectMap on the new router
          (newRouter as any).__pinIdMap = new Map<string, number>();
          (newRouter as any).__pinObjectMap = new Map<number, any>();
          (newRouter as any).__nextPinId = 1000;
        }
        
        const router = register((window as any).__libavoidSharedRouter);
        
        console.log(`[StepEdge:${id}] ♻️ Using shared router (pinIdMap has ${((router as any).__pinIdMap as Map<string, number>).size} pins, nextPinId=${(router as any).__nextPinId})`);

        
        // Use libavoidOptions.shapeBufferDistance from context as priority, fallback to edgeData.obstacleMargin
        const spacing = safeNumber(libavoidOptions?.shapeBufferDistance, safeNumber(edgeData?.obstacleMargin, DEFAULT_OBSTACLE_MARGIN));
        
        if (typeof avoidModule.nudgeOrthogonalSegmentsConnectedToShapes === 'number') {
          router.setRoutingOption?.(avoidModule.nudgeOrthogonalSegmentsConnectedToShapes, !!libavoidOptions?.nudgeOrthSegments);
        }
        if (typeof avoidModule.nudgeSharedPathsWithCommonEndPoint === 'number') {
          router.setRoutingOption?.(avoidModule.nudgeSharedPathsWithCommonEndPoint, !!libavoidOptions?.nudgeSharedPaths);
        }
        if (typeof avoidModule.nudgeOrthogonalTouchingColinearSegments === 'number') {
          router.setRoutingOption?.(avoidModule.nudgeOrthogonalTouchingColinearSegments, !!libavoidOptions?.nudgeTouchingColinear);
        }
        if (typeof avoidModule.shapeBufferDistance === 'number') {
          router.setRoutingParameter?.(avoidModule.shapeBufferDistance, spacing);
        }
        if (typeof avoidModule.portDirectionPenalty === 'number') {
          router.setRoutingParameter?.(avoidModule.portDirectionPenalty, 50);
        }
        if (typeof avoidModule.segmentPenalty === 'number') {
          router.setRoutingParameter?.(avoidModule.segmentPenalty, safeNumber(libavoidOptions?.segmentPenalty, 5));
        }
        if (typeof avoidModule.bendPenalty === 'number') {
          router.setRoutingParameter?.(avoidModule.bendPenalty, safeNumber(libavoidOptions?.bendPenalty, 20));
        }
        if (typeof avoidModule.crossingPenalty === 'number') {
          router.setRoutingParameter?.(avoidModule.crossingPenalty, safeNumber(libavoidOptions?.crossingPenalty, 100));
        }
        if (typeof avoidModule.sharedPathPenalty === 'number') {
          router.setRoutingParameter?.(avoidModule.sharedPathPenalty, safeNumber(libavoidOptions?.sharedPathPenalty, 50));
        }

        type ShapeInfo = {
          shape: any;
          origin: Point;
          width: number;
          height: number;
        };

        const shapeMap = new Map<string, ShapeInfo>();
        const pinIdMap = (router as any).__pinIdMap;
        let nextPinId = (router as any).__nextPinId;

        const allDirFlag =
          typeof avoidModule.ConnDirAll === 'number'
            ? avoidModule.ConnDirAll
            : (avoidModule.ConnDirLeft ?? 0) |
              (avoidModule.ConnDirRight ?? 0) |
              (avoidModule.ConnDirUp ?? 0) |
              getConnDirDown();

        const obstacleRects: NodeRect[] = resolvedObstacleRects;

        obstacleRects.forEach((node) => {
          const width = safeNumber(node.width, DEFAULT_NODE_WIDTH);
          const height = safeNumber(node.height, DEFAULT_NODE_HEIGHT);
          const topLeft = register(new avoidModule.Point(node.x, node.y));
          const bottomRight = register(new avoidModule.Point(node.x + width, node.y + height));
          const rectangle = register(new avoidModule.Rectangle(topLeft, bottomRight));
          const shape = register(new avoidModule.ShapeRef(router, rectangle));
          
          // Create a default center pin for edges that don't need port spacing
          // This ensures all edges can connect even if they don't create custom pins
          const centerPin = register(
            new avoidModule.ShapeConnectionPin(shape, 1, 0.5, 0.5, true, 0, allDirFlag)
          );
          centerPin.setExclusive?.(false);
          
          shapeMap.set(node.id, {
            shape,
            origin: { x: node.x, y: node.y },
            width,
            height,
          });
        });

        // Port edge tracking using global registry
        // Initialize shared port registry on window if not exists
        if (!(window as any).__portEdgeRegistry) {
          (window as any).__portEdgeRegistry = new Map<string, string[]>();
          (window as any).__portEdgeRegistryVersion = '';
          (window as any).__portEdgeRegistrationBarrier = {
            version: '',
            registeredEdges: new Set<string>(),
            registrationComplete: false,
          };
        }
        
        // Clear registry when routerVersion changes (includes optionsVersion and obstacleSignature)
        // This ensures port grouping is recalculated when nodes move or options change
        if ((window as any).__portEdgeRegistryVersion !== routerVersion) {
          (window as any).__portEdgeRegistry.clear();
          (window as any).__portEdgeRegistryVersion = routerVersion;
          // Reset registration barrier for new version
          (window as any).__portEdgeRegistrationBarrier = {
            version: routerVersion,
            registeredEdges: new Set<string>(),
            registrationComplete: false,
          };
        }
        
        // Get registry and barrier for current routing session
        const portEdgeMap: Map<string, string[]> = (window as any).__portEdgeRegistry;
        const registrationBarrier = (window as any).__portEdgeRegistrationBarrier;
        
        // Determine this edge's port keys based on its own coordinates
        // This needs to match the logic used later for derivedSourcePosition/derivedTargetPosition
        const dx = targetX - sourceX;
        const dy = targetY - sourceY;
        
        // Calculate base positions (before resolvePositionValue is applied)
        const baseSourcePosition = Math.abs(dx) > Math.abs(dy) 
          ? (dx >= 0 ? Position.Right : Position.Left)
          : (dy >= 0 ? Position.Bottom : Position.Top);
        const baseTargetPosition = Math.abs(dx) > Math.abs(dy)
          ? (dx >= 0 ? Position.Left : Position.Right)
          : (dy >= 0 ? Position.Top : Position.Bottom);
        
        // Apply sourcePosition/targetPosition overrides if specified
        const effectiveSourcePosition = resolvePositionValue(sourcePosition, baseSourcePosition);
        const effectiveTargetPosition = resolvePositionValue(targetPosition, baseTargetPosition);
        
        
        // Phase 1: Register this edge in the port map
        const srcPortKey = `${source}:${effectiveSourcePosition}`;
        if (!portEdgeMap.has(srcPortKey)) {
          portEdgeMap.set(srcPortKey, []);
        }
        if (!portEdgeMap.get(srcPortKey)!.includes(id)) {
          portEdgeMap.get(srcPortKey)!.push(id);
        }
        
        const tgtPortKey = `${target}:${effectiveTargetPosition}`;
        if (!portEdgeMap.has(tgtPortKey)) {
          portEdgeMap.set(tgtPortKey, []);
        }
        if (!portEdgeMap.get(tgtPortKey)!.includes(id)) {
          portEdgeMap.get(tgtPortKey)!.push(id);
        }
        
        // Mark this edge as registered in the barrier
        registrationBarrier.registeredEdges.add(id);
        
        // Sort edges in each port group by edge ID for consistent ordering
        portEdgeMap.forEach((edgeIds, portKey) => {
          edgeIds.sort();
        });
        
        // Phase 2: Wait for registration phase to complete
        // Use a two-tick approach: wait, check if new edges registered, wait again if needed
        // This ensures all edges in the current batch have registered before calculating offsets
        const initialRegistrySize = registrationBarrier.registeredEdges.size;
        await new Promise(resolve => setTimeout(resolve, 10));
        
        // Check if more edges registered during the delay
        const currentRegistrySize = registrationBarrier.registeredEdges.size;
        if (currentRegistrySize > initialRegistrySize) {
          // More edges registered during first tick, wait another tick for stability
          await new Promise(resolve => setTimeout(resolve, 10));
        }
        
        // Mark registration as complete for this version (all edges have had a chance to register)
        if (!registrationBarrier.registrationComplete) {
          registrationBarrier.registrationComplete = true;
        }
        
        const srcEdgeList = portEdgeMap.get(srcPortKey) || [];
        const tgtEdgeList = portEdgeMap.get(tgtPortKey) || [];
        
        // Calculate this edge's offsets after all edges have registered
        const srcEdgeIndex = srcEdgeList.indexOf(id);
        const tgtEdgeIndex = tgtEdgeList.indexOf(id);
        const preComputedSrcOffset = srcEdgeIndex >= 0 ? srcEdgeIndex - (srcEdgeList.length - 1) / 2 : 0;
        const preComputedTgtOffset = tgtEdgeIndex >= 0 ? tgtEdgeIndex - (tgtEdgeList.length - 1) / 2 : 0;
        
        console.log(`[StepEdge:${id}] 🗂️ Port map: src=${srcPortKey} has ${srcEdgeList.length} edges [${srcEdgeList.join(',')}], tgt=${tgtPortKey} has ${tgtEdgeList.length} edges [${tgtEdgeList.join(',')}], portEdgeSpacing=${portEdgeSpacing}px, preComputed offsets: src=${preComputedSrcOffset.toFixed(2)}, tgt=${preComputedTgtOffset.toFixed(2)}`);

        function getConnDirDown(): number {
          if (typeof avoidModule.ConnDirDown === 'number') {
            return avoidModule.ConnDirDown;
          }
          if (typeof avoidModule.ConnDirBottom === 'number') {
            return avoidModule.ConnDirBottom;
          }
          if (typeof avoidModule.ConnDirAll === 'number') {
            return avoidModule.ConnDirAll;
          }
          return 0;
        }

        const getConnDirFlag = (dx: number, dy: number) => {
          const absX = Math.abs(dx);
          const absY = Math.abs(dy);
          if (absX > absY) {
            return dx >= 0 ? avoidModule.ConnDirRight : avoidModule.ConnDirLeft;
          }
          if (absY > absX) {
            const downFlag = getConnDirDown();
            return dy >= 0 ? downFlag : avoidModule.ConnDirUp;
          }
          const downFlag = getConnDirDown();
          return avoidModule.ConnDirLeft | avoidModule.ConnDirRight | avoidModule.ConnDirUp | downFlag;
        };

        const positionToFlag = (pos: Position): number => {
          if (pos === Position.Left) return avoidModule.ConnDirLeft;
          if (pos === Position.Right) return avoidModule.ConnDirRight;
          if (pos === Position.Top) return avoidModule.ConnDirUp;
          const downFlag = getConnDirDown();
          return downFlag || avoidModule.ConnDirAll;
        };

        const createConnEndForNode = (nodeId: string, point: Point, preferredDirection?: Position, edgeOffset: number = 0) => {
          const info = shapeMap.get(nodeId);
          if (!info) {
            const pt = register(new avoidModule.Point(point.x, point.y));
            return register(new avoidModule.ConnEnd(pt));
          }

          const { shape, origin, width, height } = info;
          
          // Calculate base offset from node geometry based on preferred direction
          // This ensures pins are always on the correct side of the node, regardless of ReactFlow point coordinates
          let baseOffsetX: number;
          let baseOffsetY: number;
          
          if (preferredDirection) {
            // Use geometry-based positioning: pin is on the edge of the node in the preferred direction
            switch (preferredDirection) {
              case Position.Right:
                baseOffsetX = 1.0; // Right edge
                baseOffsetY = 0.5; // Vertical center
                break;
              case Position.Left:
                baseOffsetX = 0.0; // Left edge
                baseOffsetY = 0.5; // Vertical center
                break;
              case Position.Top:
                baseOffsetX = 0.5; // Horizontal center
                baseOffsetY = 0.0; // Top edge
                break;
              case Position.Bottom:
                baseOffsetX = 0.5; // Horizontal center
                baseOffsetY = 1.0; // Bottom edge
                break;
              default:
                // Fallback to center if unknown direction
                baseOffsetX = 0.5;
                baseOffsetY = 0.5;
            }
          } else {
            // Fallback: calculate from ReactFlow point if no preferred direction
            // Clamp to valid range to avoid invalid coordinates
            baseOffsetX = width === 0 ? 0.5 : Math.max(0, Math.min(1, (point.x - origin.x) / width));
            baseOffsetY = height === 0 ? 0.5 : Math.max(0, Math.min(1, (point.y - origin.y) / height));
            
            // If calculation produces invalid coordinates, default to center
            if (!Number.isFinite(baseOffsetX) || !Number.isFinite(baseOffsetY)) {
              baseOffsetX = 0.5;
              baseOffsetY = 0.5;
            }
          }
          
          // Apply port edge spacing offset perpendicular to connection direction
          let offsetX = baseOffsetX;
          let offsetY = baseOffsetY;
          
          if (edgeOffset !== 0 && portEdgeSpacing > 0 && preferredDirection) {
            // Calculate offset perpendicular to connection direction
            const offsetPixels = edgeOffset * portEdgeSpacing;
            
            if (preferredDirection === Position.Left || preferredDirection === Position.Right) {
              // Horizontal connection - offset vertically
              offsetY += offsetPixels / height;
            } else {
              // Vertical connection - offset horizontally
              offsetX += offsetPixels / width;
            }
          }
          
          const clampedOffsetX = Number.isFinite(offsetX)
            ? Math.min(1, Math.max(0, offsetX))
            : 0.5;
          const clampedOffsetY = Number.isFinite(offsetY)
            ? Math.min(1, Math.max(0, offsetY))
            : 0.5;
          const direction = preferredDirection
            ? positionToFlag(preferredDirection)
            : typeof avoidModule.ConnDirAll === 'number'
            ? avoidModule.ConnDirAll
            : getConnDirFlag(
                point.x - (origin.x + width / 2),
                point.y - (origin.y + height / 2)
              );
          
          // Include edge offset and portEdgeSpacing in pin key to ensure pins are recreated when spacing changes
          const pinKey = `${nodeId}:${clampedOffsetX.toFixed(4)}:${clampedOffsetY.toFixed(4)}:${edgeOffset}:${portEdgeSpacing}`;
          const pinIdMap = (router as any).__pinIdMap as Map<string, number>;
          let pinId = pinIdMap.get(pinKey);
          
          // If edgeOffset is 0 and position is center (0.5, 0.5), reuse the default center pin (pinId = 1)
          const isCenterPin = edgeOffset === 0 && 
            Math.abs(clampedOffsetX - 0.5) < 0.01 && 
            Math.abs(clampedOffsetY - 0.5) < 0.01;
          
          if (isCenterPin && !pinId) {
            pinId = 1; // Reuse the center pin created for the shape
            pinIdMap.set(pinKey, pinId);
          }
          
          let pinObj;
          if (!pinId) {
            // Atomically reserve a pin ID by incrementing the shared counter
            // Use direct increment on the router property for true atomicity
            pinId = ++(router as any).__nextPinId;
            pinIdMap.set(pinKey, pinId);
            pinObj = register(
              new avoidModule.ShapeConnectionPin(
                shape,
                pinId,
                clampedOffsetX,
                clampedOffsetY,
                true,
                0,
                direction
              )
            );
            pinObj.setExclusive?.(false);
            
            // Store the pin object for reuse
            const pinObjectMap = (router as any).__pinObjectMap as Map<number, any>;
            pinObjectMap.set(pinId, pinObj);
            
            console.log(`[StepEdge:${id}] 🔌 Created pin ${pinId} for ${nodeId} at (${clampedOffsetX.toFixed(3)}, ${clampedOffsetY.toFixed(3)}) with edgeOffset ${edgeOffset}`);
          } else {
            // Retrieve existing pin object
            const pinObjectMap = (router as any).__pinObjectMap as Map<number, any>;
            pinObj = pinObjectMap.get(pinId);
          }

          // Create ConnEnd using the pin object (not just pinId)
          return register(new avoidModule.ConnEnd(shape, pinId));
        };

        // Use pre-computed offsets (no async delay needed since we computed synchronously above)
        const srcEdgeOffset = preComputedSrcOffset;
        const tgtEdgeOffset = preComputedTgtOffset;

        const sourcePoint: Point = { x: sourceX, y: sourceY };
        const targetPoint: Point = { x: targetX, y: targetY };

        // Use the effective positions from port key calculation for consistency
        const srcEnd = createConnEndForNode(source, sourcePoint, effectiveSourcePosition, srcEdgeOffset);
        const dstEnd = createConnEndForNode(target, targetPoint, effectiveTargetPosition, tgtEdgeOffset);
        const connection = register(new avoidModule.ConnRef(router));
        connection.setSourceEndpoint?.(srcEnd);
        connection.setDestEndpoint?.(dstEnd);
        const wantOrthogonal = libavoidOptions?.routingType === 'orthogonal';
        const hasPoly = typeof avoidModule.ConnType_PolyLine === 'number';
        const hasOrth = typeof avoidModule.ConnType_Orthogonal === 'number';
        const routingType = wantOrthogonal && hasOrth
          ? avoidModule.ConnType_Orthogonal
          : hasPoly
          ? avoidModule.ConnType_PolyLine
          : (avoidModule.ConnType_Orthogonal as number);
        connection.setRoutingType?.(routingType);
        if (typeof connection.setHateCrossings === 'function') {
          connection.setHateCrossings?.(!!libavoidOptions?.hateCrossings);
        }

        router.processTransaction?.();

        const polyline = register(connection.displayRoute());
        const pathPoints: Point[] = [];
        for (let i = 0; i < polyline.size(); i += 1) {
          const pt = register(polyline.get_ps(i));
          pathPoints.push({ x: pt.x, y: pt.y });
        }

        const rawPathForLog = pathPoints.map((point) => ({
          x: Math.round(point.x * 100) / 100,
          y: Math.round(point.y * 100) / 100,
        }));

        let roundedPoints = pathPoints.map((point) => ({
          x: Math.round(point.x * 100) / 100,
          y: Math.round(point.y * 100) / 100,
        }));

        if (roundedPoints.length === 0) {
          roundedPoints = [sourcePoint, targetPoint];
        }
        // DO NOT overwrite first/last points - libavoid's routing includes the pin offsets!
        // Overwriting would discard the port spacing offsets we just applied

        const finalPoints: Point[] = [];
        roundedPoints.forEach((point) => {
          const last = finalPoints[finalPoints.length - 1];
          if (!last || Math.abs(last.x - point.x) > 0.01 || Math.abs(last.y - point.y) > 0.01) {
            finalPoints.push(point);
          }
        });

        if (finalPoints.length === 1) {
          finalPoints.push(targetPoint);
        }

        const obstacles = obstacleRects
          .filter((node) => node.id !== source && node.id !== target)
          .map(({ x, y, width, height }) => ({
            x,
            y,
            width: safeNumber(width, DEFAULT_NODE_WIDTH),
            height: safeNumber(height, DEFAULT_NODE_HEIGHT),
          }));

        const collision =
          finalPoints.length >= 2
            ? testEdgeCollision(
                finalPoints[0],
                finalPoints[finalPoints.length - 1],
                finalPoints.slice(1, -1),
                obstacles
              )
            : { collides: false, details: ['⚠️ libavoid returned an empty path'] };

        const missingAvoidPath = rawPathForLog.length === 0;
        let nextStatus: RoutingStatus = 'ok';
        let nextMessage = '';
        let fallbackApplied = false;

        if (collision.collides) {
          nextStatus = 'error';
          nextMessage = collision.details?.[0] ?? 'Path intersects an obstacle';
          fallbackApplied = true;
        } else if (missingAvoidPath) {
          nextStatus = 'degraded';
          nextMessage = 'Libavoid returned an empty route';
          fallbackApplied = true;
        }

        if (!cancelled) {
          const bendPoints = finalPoints.slice(1, -1);
          const debugPayload = {
            router: 'libavoid-js',
            rawPolyline: rawPathForLog,
            pathPoints: finalPoints,
            obstacles,
            collision,
            fallbackApplied,
            status: nextStatus,
            message: nextMessage,
          };

          setRoutingStatus(nextStatus);
          setRoutingMessage(nextMessage);

          if (typeof window !== 'undefined') {
            window.__edgeDebug = window.__edgeDebug ?? {};
            window.__edgeDebug[id] = {
              rawPolyline: rawPathForLog,
              snappedPoints: finalPoints,
              collision,
              fallbackApplied,
              status: nextStatus,
              message: nextMessage,
              sourcePosition,
              targetPosition,
            };
          }
          setDebugInfo(debugPayload);
          const nextPath = pointsToPath(finalPoints);
          setEdgePath((prevPath) => (prevPath === nextPath ? prevPath : nextPath));
          setComputedBendPoints((prevPoints) =>
            arePointArraysEqual(prevPoints, bendPoints) ? prevPoints : bendPoints
          );

          if (edgeData) {
            edgeData.bendPoints = bendPoints;
            edgeData._elkDebug = debugPayload;
            edgeData.routingStatus = nextStatus;
            edgeData.routingMessage = nextMessage;
          }

          if (edgeData && debugInfo) {
            edgeData._elkDebug = debugInfo;
          }
        }
      } catch (error) {
        console.error(`[StepEdge:${id}] routing error`, error);
        if (!cancelled) {
          const message = error instanceof Error ? error.message : String(error);
          setRoutingStatus('error');
          setRoutingMessage(message);
          setComputedBendPoints([]);
          setDebugInfo({
            router: 'libavoid-js',
            error: message,
            fallbackApplied: true,
            status: 'error',
            message,
          });
          const fallbackLine = pointsToPath([
            { x: sourceX, y: sourceY },
            { x: targetX, y: targetY },
          ]);
          setEdgePath((prevPath) => (prevPath === fallbackLine ? prevPath : fallbackLine));
          if (typeof window !== 'undefined') {
            window.__edgeDebug = window.__edgeDebug ?? {};
            window.__edgeDebug[id] = {
              rawPolyline: [],
              snappedPoints: [
                { x: sourceX, y: sourceY },
                { x: targetX, y: targetY },
              ],
              collision: {
                collides: true,
                details: [message || 'Libavoid routing failed'],
              },
              fallbackApplied: true,
              status: 'error',
              message,
              sourcePosition,
              targetPosition,
            };
          }
          if (edgeData) {
            edgeData.routingStatus = 'error';
            edgeData.routingMessage = message;
            edgeData.bendPoints = [];
          }
        }
      } finally {
        resources.reverse().forEach((resource) => {
          try {
            if (resource && typeof resource.delete === 'function') {
              resource.delete();
            } else if (resource && typeof resource.destroy === 'function') {
              resource.destroy();
            }
          } catch (destroyError) {
            // ignore cleanup failures
          }
        });
      }
    };

    routeWithLibavoid();

    return () => {
      cancelled = true;
    };
  }, [
    id,
    source,
    target,
    sourceX,
    sourceY,
    targetX,
    targetY,
    edgeData?.obstacleMargin,
    edgeData?.rerouteKey,
    obstacleSignature,
    sourcePosition,
    targetPosition,
    optionsVersion,
    libavoidOptions,
    portEdgeSpacing, // Explicitly include to ensure re-routing when spacing changes
    nodeCount, // Re-route when nodes are added/removed (for port spacing)
    edgeCount, // Re-route when edges are added/removed (for port spacing)
  ]);

  useEffect(() => {
    if (edgeData && debugInfo) {
      edgeData._elkDebug = debugInfo;
    }
  }, [edgeData, debugInfo]);

  const edgeLabel = edgeData?.label;
  const hasRoutingIssue = routingStatus !== 'ok';
  const indicatorColor = routingStatus === 'error' ? '#ff4d4f' : '#faad14';
  const indicatorText =
    routingMessage ||
    (routingStatus === 'error' ? 'Routing error' : routingStatus === 'degraded' ? 'Routing degraded' : '');
  const baseEdgeStyle = {
    ...getEdgeStyle(selected, false),
    ...style,
  };
  const baseStrokeWidth = Number(baseEdgeStyle.strokeWidth ?? 2);
  const warningStrokeWidth = Number.isFinite(baseStrokeWidth) ? baseStrokeWidth + 1 : 3;
  const warningStyle = hasRoutingIssue
    ? {
        stroke: indicatorColor,
        strokeDasharray: routingStatus === 'error' ? '4 4' : '8 4',
        strokeWidth: warningStrokeWidth,
      }
    : {};
  const edgeStyleWithStatus = {
    ...baseEdgeStyle,
    ...warningStyle,
  };
  const midX = (sourceX + targetX) / 2;
  const midY = (sourceY + targetY) / 2;
  
  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        style={edgeStyleWithStatus}
        markerEnd={markerEnd}
      />

      {hasRoutingIssue && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${midX}px, ${midY - 24}px)`,
              backgroundColor: indicatorColor,
              color: '#ffffff',
              padding: '2px 8px',
              borderRadius: 6,
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: 0.4,
              boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
              pointerEvents: 'none',
              textTransform: 'uppercase',
              whiteSpace: 'nowrap',
            }}
            className="nodrag nopan"
          >
            {indicatorText}
          </div>
        </EdgeLabelRenderer>
      )}
      
      {edgeLabel && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${midX}px, ${midY + (hasRoutingIssue ? 18 : 0)}px)`,
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