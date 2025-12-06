import React, { useEffect, useMemo, useState, useRef } from 'react';
import { BaseEdge, EdgeLabelRenderer, EdgeProps, Position, useStore } from 'reactflow';
import { getEdgeStyle, getEdgeZIndex, CANVAS_STYLES } from './graph/styles/canvasStyles';
import { testEdgeCollision } from '../utils/edgeCollisionTest';
import { AvoidLib } from 'libavoid-js';
import { useViewMode } from '../contexts/ViewModeContext';
import { getBatchRoutingCoordinator } from '../lib/BatchRoutingCoordinator';

const DEFAULT_NODE_WIDTH = 96;
const DEFAULT_NODE_HEIGHT = 96;
const DEFAULT_OBSTACLE_MARGIN = 32; // 2 grid spaces (16px * 2 = 32px)

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

// FALLBACK REMOVED: We need to fail loudly to identify the real issue
// Libavoid ALWAYS returns a route - if we see straight lines, it's our implementation bug

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

/**
 * Simple orthogonal fallback - creates a proper right-angle path WITHOUT diagonal segments.
 * Used for initial state and early effects before the main routing useEffect runs.
 * This ensures NO diagonal lines are ever rendered, even briefly.
 */
const computeSimpleOrthogonalFallback = (
  srcX: number, srcY: number, 
  tgtX: number, tgtY: number,
  srcPos: Position | undefined,
  tgtPos: Position | undefined
): Point[] => {
  const margin = 32; // Default margin
  const start = { x: srcX, y: srcY };
  const end = { x: tgtX, y: tgtY };
  
  // Determine effective positions
  const effectiveSrcPos = srcPos ?? deriveDirectionBetween(start, end);
  const effectiveTgtPos = tgtPos ?? deriveDirectionBetween(end, start);
  
  // Calculate "outside" points based on port direction
  let srcOutX = srcX, srcOutY = srcY;
  switch (effectiveSrcPos) {
    case Position.Right: srcOutX = srcX + margin; break;
    case Position.Left: srcOutX = srcX - margin; break;
    case Position.Top: srcOutY = srcY - margin; break;
    case Position.Bottom: srcOutY = srcY + margin; break;
  }
  
  let tgtOutX = tgtX, tgtOutY = tgtY;
  switch (effectiveTgtPos) {
    case Position.Right: tgtOutX = tgtX + margin; break;
    case Position.Left: tgtOutX = tgtX - margin; break;
    case Position.Top: tgtOutY = tgtY - margin; break;
    case Position.Bottom: tgtOutY = tgtY + margin; break;
  }
  
  const srcOut = { x: srcOutX, y: srcOutY };
  const tgtOut = { x: tgtOutX, y: tgtOutY };
  
  // Build route: start → srcOut → intermediate → tgtOut → end
  const route: Point[] = [start, srcOut];
  
  const isHorizontalSrc = effectiveSrcPos === Position.Right || effectiveSrcPos === Position.Left;
  const isHorizontalTgt = effectiveTgtPos === Position.Right || effectiveTgtPos === Position.Left;
  
  if (isHorizontalSrc && isHorizontalTgt) {
    // Both horizontal: use midpoint
    const midX = (srcOutX + tgtOutX) / 2;
    route.push({ x: midX, y: srcOutY });
    route.push({ x: midX, y: tgtOutY });
  } else if (!isHorizontalSrc && !isHorizontalTgt) {
    // Both vertical: use midpoint
    const midY = (srcOutY + tgtOutY) / 2;
    route.push({ x: srcOutX, y: midY });
    route.push({ x: tgtOutX, y: midY });
  } else {
    // Mixed: single bend
    if (isHorizontalSrc) {
      route.push({ x: tgtOutX, y: srcOutY });
    } else {
      route.push({ x: srcOutX, y: tgtOutY });
    }
  }
  
  route.push(tgtOut);
  route.push(end);
  
  return route;
};

const StepEdge: React.FC<EdgeProps> = (props) => {
  const { 
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
  } = props;
  const edgeData = data as any;
  
  // STEP 6: Check if ViewState already has computed waypoints
  // If waypoints exist, use them directly (pure renderer pattern)
  // This is the target state: routing happens outside StepEdge, StepEdge just renders
  // Read from both edgeData (from ViewStateToReactFlow) AND directly from ViewState (from callbacks)
  const viewStateWaypointsFromData: Point[] | undefined = edgeData?.waypoints;
  
  // Read directly from ViewState (updated by callbacks) - this is the Joint.js pattern
  // We'll read this in the useEffect that updates the path, not here, to avoid stale closures
  const hasViewStateWaypointsFromData = viewStateWaypointsFromData && viewStateWaypointsFromData.length >= 2;
  
  const [computedBendPoints, setComputedBendPoints] = useState<Point[]>([]);
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [edgePath, setEdgePath] = useState<string>(() => {
    // LOCK mode: Use ELK coordinates directly
    const routingMode = edgeData?.routingMode || 'FREE';
    const elkStartPoint = edgeData?.elkStartPoint;
    const elkEndPoint = edgeData?.elkEndPoint;
    const elkWaypoints = edgeData?.elkWaypoints;
    
    if (routingMode === 'LOCK' && elkStartPoint && elkEndPoint) {
      // Build path from ELK coordinates
      const fullPath: Point[] = [
        { x: elkStartPoint.x, y: elkStartPoint.y },
        ...(elkWaypoints || []).map((p: any) => ({ x: p.x, y: p.y })),
        { x: elkEndPoint.x, y: elkEndPoint.y }
      ];
      return pointsToPath(fullPath);
    }
    
    // FREE mode: Use ViewState waypoints if available
    if (hasViewStateWaypointsFromData && viewStateWaypointsFromData) {
      return pointsToPath(viewStateWaypointsFromData);
    }
    
    // Temporary path until routing runs
    return `M ${sourceX} ${sourceY} L ${targetX} ${targetY}`;
  });
  const [routingStatus, setRoutingStatus] = useState<RoutingStatus>('ok');
  const [routingMessage, setRoutingMessage] = useState<string>('');
  
  // State for batch routing - stores pathPoints from coordinator
  const [coordinatorPathPoints, setCoordinatorPathPoints] = useState<Point[] | null>(null);
  const coordinatorCallbackRef = useRef<((route: Point[]) => void) | null>(null);

  // Get libavoid options from context (for FREE mode parameter tuning)
  const { config, libavoidOptions: contextLibavoidOptions } = useViewMode();
  const libavoidOptions = contextLibavoidOptions || config.libavoidDefaults || {};
  
  // Extract portEdgeSpacing to track it separately for reactivity
  const portEdgeSpacing = libavoidOptions?.portEdgeSpacing ?? config.libavoidDefaults?.portEdgeSpacing ?? 8;
  
  // Track options changes to force rerouting
  const [optionsVersion, setOptionsVersion] = useState(0);
  const prevOptionsRef = React.useRef<string>('');
  const prevPortEdgeSpacingRef = React.useRef<number>(portEdgeSpacing);
  // Track obstacle signature changes to trigger rerouting (but only once per change)
  const prevObstacleSignatureRef = React.useRef<string>('');
  
  // Force re-render when routing updates occur externally (from batchUpdateObstaclesAndReroute)
  // This allows edges to reroute on each position change during drag
  const [routingUpdateVersion, setRoutingUpdateVersion] = React.useState(0);
  
  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const handleRoutingUpdate = (event: CustomEvent) => {
      // Force re-render by updating state
      // This will cause the main useEffect to re-run and extract fresh routes
      const version = (event.detail as any)?.version || 0;
      setRoutingUpdateVersion(v => {
        const newVersion = v + 1;
        // Debug: Log when we receive routing update events
        // Debug logging removed to prevent infinite rendering
        return newVersion;
      });
    };
    
    const handleWaypointsUpdated = (event: CustomEvent) => {
      // When callback writes waypoints to ViewState, re-read them immediately
      const { edgeId, waypoints } = (event.detail as any) || {};
      if (edgeId === id && waypoints && waypoints.length >= 2) {
        // Force re-render to read from ViewState
        setRoutingUpdateVersion(v => v + 1);
        // Debug logging removed to prevent infinite rendering
      }
    };
    
    window.addEventListener('routing-update', handleRoutingUpdate as EventListener);
    window.addEventListener('edge-waypoints-updated', handleWaypointsUpdated as EventListener);
    return () => {
      window.removeEventListener('routing-update', handleRoutingUpdate as EventListener);
      window.removeEventListener('edge-waypoints-updated', handleWaypointsUpdated as EventListener);
    };
  }, [id]);
  
  // OPTIMIZATION 2: Track previous route to only update when route actually changes
  // This prevents unnecessary re-renders when callbacks fire but route is unchanged
  const prevRouteRef = React.useRef<Point[] | null>(null);
  
  // OPTIMIZATION 1: Preserve current path when waypoints temporarily unavailable
  // This prevents edges from disappearing during selection updates
  const currentPathRef = React.useRef<string>(edgePath);
  
  // Helper function to check if waypoints contain any diagonal segments
  // IMPORTANT: Libavoid waypoints are COMPLETE paths that already include source and target boundary points.
  // DO NOT add sourceX/sourceY from ReactFlow - they are in a different coordinate system!
  const waypointsContainDiagonal = React.useCallback((waypoints: Point[]): boolean => {
    if (!waypoints || waypoints.length < 2) return false;
    
    // Check the waypoints directly - they are already a complete path from libavoid
    const tolerance = 5;
    for (let i = 1; i < waypoints.length; i++) {
      const prev = waypoints[i - 1];
      const curr = waypoints[i];
      const xDiff = Math.abs((curr.x ?? 0) - (prev.x ?? 0));
      const yDiff = Math.abs((curr.y ?? 0) - (prev.y ?? 0));
      if (xDiff > tolerance && yDiff > tolerance) {
        // Debug logging removed to prevent infinite rendering
        return true;
      }
    }
    return false;
  }, [id]);

  // STEP 6: FREE MODE ONLY - If ViewState waypoints change, use them immediately
  // LOCK mode edges use ELK coordinates in the main routing useEffect, skip this entirely
  const routingModeForViewState = edgeData?.routingMode || 'FREE';
  
  React.useEffect(() => {
    // LOCK mode: Skip this effect - ELK coordinates are handled by the main routing useEffect
    if (routingModeForViewState === 'LOCK') {
      return;
    }
    
    // FREE mode: Use ViewState waypoints for libavoid routing
    if (hasViewStateWaypointsFromData && viewStateWaypointsFromData) {
      // Only update if route actually changed
      if (!arePointArraysEqual(prevRouteRef.current || [], viewStateWaypointsFromData)) {
        const newPath = pointsToPath(viewStateWaypointsFromData);
        setEdgePath(newPath);
        currentPathRef.current = newPath;
        setRoutingStatus('ok');
        prevRouteRef.current = [...viewStateWaypointsFromData];
      }
      return;
    }
    
    // Check ViewState directly (updated by callbacks during drag)
    if (typeof window !== 'undefined') {
      const elkState = (window as any).__elkState;
      const waypointsFromViewState = elkState?.viewStateRef?.current?.edge?.[id]?.waypoints;
      if (waypointsFromViewState && waypointsFromViewState.length >= 2) {
        if (!arePointArraysEqual(prevRouteRef.current || [], waypointsFromViewState)) {
          const newPath = pointsToPath(waypointsFromViewState);
          setEdgePath(newPath);
          currentPathRef.current = newPath;
          setRoutingStatus('ok');
          prevRouteRef.current = [...waypointsFromViewState];
        }
        return;
      }
    }
    
    // FREE mode: Preserve current path if waypoints temporarily unavailable
    // (handled by libavoid routing effect)
  }, [routingModeForViewState, hasViewStateWaypointsFromData, viewStateWaypointsFromData, id, routingUpdateVersion, edgePath]);
  
  React.useEffect(() => {
    const currentOptionsStr = JSON.stringify(libavoidOptions);
    const optionsChanged = prevOptionsRef.current !== currentOptionsStr;
    const spacingChanged = prevPortEdgeSpacingRef.current !== portEdgeSpacing;
    
    if (optionsChanged || spacingChanged) {
      prevOptionsRef.current = currentOptionsStr;
      prevPortEdgeSpacingRef.current = portEdgeSpacing;
      // FIX: Don't clear edge path during routing - persist current path until new route is ready
      // This prevents flickering by keeping the current edge visible
      // The new route will update the path when ready
      setOptionsVersion(v => v + 1);
    }
  }, [libavoidOptions, portEdgeSpacing, id, sourceX, sourceY, targetX, targetY, hasViewStateWaypointsFromData]);

  const allNodes = useStore((state) => state?.nodes ?? []);
  const allEdges = useStore((state) => state?.edges ?? []);
  const nodeCount = allNodes.length;
  const edgeCount = allEdges.length;
  
  // Step 3: Update expected edge count when allEdges changes
  useEffect(() => {
    const coordinator = getBatchRoutingCoordinator();
    coordinator.setExpectedEdgeCount(allEdges.length);
  }, [allEdges.length]);

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

    let result: NodeRect[];
    
    if (staticObstacleIds.length > 0) {
      result = staticObstacleIds.map((obstacleId, index) => {
        const liveNode = condensedNodes.find((node) => node.id === obstacleId);
        const initialRect = staticObstacles.find((rect: any) => rect?.id === obstacleId);
        
        // Use live position if it exists AND is not at origin (0,0)
        // Live position at origin likely means ReactFlow hasn't positioned the node yet
        // In that case, fall back to the initial static position from fixtures
        const liveHasValidPosition = liveNode && 
          typeof liveNode.x === 'number' && 
          typeof liveNode.y === 'number' &&
          (liveNode.x !== 0 || liveNode.y !== 0);
        
        const x = liveHasValidPosition
          ? liveNode.x
          : safeNumber(initialRect?.x, 0);
        const y = liveHasValidPosition
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
    } else if (staticObstacles.length === 0) {
      result = condensedNodes;
    } else {
      result = staticObstacles.map((rect, index) => {
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
    }
    
    return result;
  }, [edgeData?.staticObstacleIds, edgeData?.staticObstacles, condensedNodes, id]);

  // Snap position to 16px grid for stable obstacle signature
  // This prevents rerouting on every intermediate position during drag
  const GRID_SIZE = 16;
  const snapToGrid = (v: number) => Math.round(v / GRID_SIZE) * GRID_SIZE;
  
  const obstacleSignature = useMemo(() => {
    if (!resolvedObstacleRects || resolvedObstacleRects.length === 0) {
      return 'empty';
    }
    return resolvedObstacleRects
      .map((node) => {
        // Snap to grid to only reroute on grid snap positions
        const x = snapToGrid(node.x);
        const y = snapToGrid(node.y);
        const w = snapToGrid(node.width);
        const h = snapToGrid(node.height);
        return `${node.id}:${x}:${y}:${w}:${h}`;
      })
      .sort()
      .join('|');
  }, [resolvedObstacleRects]);

  useEffect(() => {
    if (!isClient) {
      return;
    }
    
    // LOCK MODE: Use ELK-computed bendPoints/elkWaypoints, skip libavoid
    // Per FIGJAM_REFACTOR.md: LOCK mode edges use ELK routing (bendPoints from toReactFlow)
    // FREE mode edges use libavoid for dynamic obstacle avoidance
    const routingMode = edgeData?.routingMode || 'FREE';
    const elkWaypoints = edgeData?.elkWaypoints || edgeData?.bendPoints;
    
    // CRITICAL: Use ELK's actual start/end points when available (in ABSOLUTE coordinates)
    // These are computed by ELK and passed through from toReactFlow.ts
    // They may differ from ReactFlow's sourceX/sourceY/targetX/targetY
    const elkStartPoint = edgeData?.elkStartPoint;
    const elkEndPoint = edgeData?.elkEndPoint;
    
    if (routingMode === 'LOCK') {
      // LOCK MODE: Use ELK coordinates ONLY - NO FALLBACKS
      // ELK always provides sections with startPoint, bendPoints, and endPoint
      // If these are missing, it's a data pipeline bug that must be fixed, not worked around
      
      if (!elkStartPoint || !elkEndPoint) {
        console.error(`[❌ LOCK MODE] Edge ${id}: MISSING ELK COORDINATES - fix the data pipeline!`, {
          hasElkStart: !!elkStartPoint,
          hasElkEnd: !!elkEndPoint,
          elkWaypointsCount: elkWaypoints?.length ?? 0,
          routingMode,
          edgeData: { ...edgeData }
        });
        // Don't use any fallback - let the error be visible
        setRoutingStatus('error');
        setRoutingMessage('LOCK mode: ELK coordinates missing!');
        return;
      }
      
      // Build path from ELK: startPoint → bendPoints → endPoint (all ABSOLUTE coordinates)
      const fullPath: Point[] = [
        { x: elkStartPoint.x, y: elkStartPoint.y },
        ...(elkWaypoints || []).map((p: any) => ({ x: p.x, y: p.y })),
        { x: elkEndPoint.x, y: elkEndPoint.y }
      ];
      
      const elkPath = pointsToPath(fullPath);
      
      console.log(`[🔧 LOCK MODE] Edge ${id}: Using ELK coordinates`, {
        elkStart: `${elkStartPoint.x},${elkStartPoint.y}`,
        elkEnd: `${elkEndPoint.x},${elkEndPoint.y}`,
        bendPointsCount: elkWaypoints?.length ?? 0,
        bendPoints: (elkWaypoints || []).map((p: any) => `${p.x},${p.y}`),
        fullPathPoints: fullPath.length
      });
      
      // Only update if different from current path
      if (edgePath !== elkPath) {
        setEdgePath(elkPath);
        currentPathRef.current = elkPath;
        prevRouteRef.current = [...fullPath];
      }
      setRoutingStatus('ok');
      setRoutingMessage('LOCK mode: using ELK coordinates');
      return;
    }
    // FREE mode: Continue with libavoid routing below

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
        // Debug logging disabled for normal operation
        avoidModule = await ensureAvoidInstance();
        if (cancelled) return;

        // Use a shared router for all edges to enable proper pin sharing
        // CRITICAL (Joint.js pattern): Router should only reset when OPTIONS change, NOT obstacle positions
        // Obstacle position changes are handled via moveShape() to avoid router reset/abort errors
        const routerVersion = `${optionsVersion}`;
        
        // Router configuration helper - sets all parameters ONCE per router version
        // This matches Joint.js pattern: configure router once, then batch route all connections
        const configureRouter = (router: any, avoidModule: any, libavoidOptions: any, spacing: number) => {
          // DISABLE all nudging options to prevent ballooning
          // When processTransaction() is called, nudging causes ALL edges to shift positions
          // even if only one obstacle moved. This causes the "ballooning" bug.
        if (typeof avoidModule.nudgeOrthogonalSegmentsConnectedToShapes === 'number') {
            router.setRoutingOption?.(avoidModule.nudgeOrthogonalSegmentsConnectedToShapes, false);
        }
        if (typeof avoidModule.nudgeSharedPathsWithCommonEndPoint === 'number') {
          router.setRoutingOption?.(avoidModule.nudgeSharedPathsWithCommonEndPoint, false);
        }
        if (typeof avoidModule.nudgeOrthogonalTouchingColinearSegments === 'number') {
          router.setRoutingOption?.(avoidModule.nudgeOrthogonalTouchingColinearSegments, false);
        }
          
          // DISABLE: Unifying nudging preprocessing causes ballooning
          // "unifies segments and centers them in free space" - this shifts ALL edges
          if (typeof avoidModule.performUnifyingNudgingPreprocessingStep === 'number') {
            router.setRoutingOption?.(avoidModule.performUnifyingNudgingPreprocessingStep, false);
          }
          
          // DISABLE: Additional nudging causes ballooning
          if (typeof (avoidModule as any).improvingConnectorNudging === 'number') {
            router.setRoutingOption?.((avoidModule as any).improvingConnectorNudging, false);
          }
          
          // Enable sideDirections to enforce side-constrained pins (critical for preventing overlap)
          if (typeof (avoidModule as any).sideDirections === 'number') {
            router.setRoutingOption?.((avoidModule as any).sideDirections, true);
            // Debug logging removed to prevent infinite rendering
          } else {
            // Debug logging removed to prevent infinite rendering
          }
          
          // Set routing parameters
        if (typeof avoidModule.shapeBufferDistance === 'number') {
          router.setRoutingParameter?.(avoidModule.shapeBufferDistance, spacing);
        }
          // idealNudgingDistance: The PRIMARY parameter for uniform spacing between parallel edges
          // This controls the spacing when libavoid nudges overlapping parallel segments apart
          // Set to match the spacing between ports on nodes for visual consistency
          if (typeof avoidModule.idealNudgingDistance === 'number') {
            const nudgingDistance = safeNumber(libavoidOptions?.idealNudgingDistance, 56);
            router.setRoutingParameter?.(avoidModule.idealNudgingDistance, nudgingDistance);
            // Debug logging removed to prevent infinite rendering
        }
        if (typeof avoidModule.portDirectionPenalty === 'number') {
          router.setRoutingParameter?.(avoidModule.portDirectionPenalty, 50);
        }
        if (typeof avoidModule.segmentPenalty === 'number') {
            router.setRoutingParameter?.(avoidModule.segmentPenalty, safeNumber(libavoidOptions?.segmentPenalty, 1));
        }
        if (typeof avoidModule.bendPenalty === 'number') {
          router.setRoutingParameter?.(avoidModule.bendPenalty, safeNumber(libavoidOptions?.bendPenalty, 20));
        }
        if (typeof avoidModule.crossingPenalty === 'number') {
          router.setRoutingParameter?.(avoidModule.crossingPenalty, safeNumber(libavoidOptions?.crossingPenalty, 100));
        }
        if (typeof avoidModule.sharedPathPenalty === 'number') {
            router.setRoutingParameter?.(avoidModule.sharedPathPenalty, safeNumber(libavoidOptions?.sharedPathPenalty, 10000));
          }
        };
        
        // Use libavoidOptions.shapeBufferDistance from context as priority, fallback to edgeData.obstacleMargin
        const spacing = safeNumber(libavoidOptions?.shapeBufferDistance, safeNumber(edgeData?.obstacleMargin, DEFAULT_OBSTACLE_MARGIN));
        
        // Create or get shared router - configure ONCE per router version
        if (!(window as any).__libavoidSharedRouter || (window as any).__libavoidSharedRouterVersion !== routerVersion) {
          const newRouter = new avoidModule.Router(avoidModule.OrthogonalRouting);
          (window as any).__libavoidSharedRouter = newRouter;
          (window as any).__libavoidSharedRouterVersion = routerVersion;
          
          // Initialize pinIdMap and pinObjectMap on the new router
          (newRouter as any).__pinIdMap = new Map<string, number>();
          (newRouter as any).__pinObjectMap = new Map<number, any>();
          (newRouter as any).__nextPinId = 1000;
          // Initialize shapeRefs map for Joint.js-style moveShape() pattern
          (newRouter as any).__shapeRefs = new Map<string, any>();
          // Initialize connRefs map for Joint.js-style persistent connector pattern
          (newRouter as any).__connRefs = new Map<string, any>();
          // Initialize routes map for storing computed routes per edge
          (newRouter as any).__routes = new Map<string, Point[]>();
          
          // Configure router ONCE when created - this is critical for Joint.js-style batch routing
          configureRouter(newRouter, avoidModule, libavoidOptions, spacing);
          
          // Step 2 & 3: Initialize batch routing coordinator for new router
          const coordinator = getBatchRoutingCoordinator();
          coordinator.reset();
          coordinator.initialize(newRouter, avoidModule, routerVersion);
          coordinator.setExpectedEdgeCount(allEdges.length);
        }
        
        const router = register((window as any).__libavoidSharedRouter);
        
        // Track obstacle signature changes
        // NOTE: We do NOT call processTransaction() here because it causes global re-nudging
        // which shifts positions of ALL edges even if they don't need to reroute.
        // Using Joint.js pattern: persistent connRefs + moveShape() for obstacles.
        prevObstacleSignatureRef.current = obstacleSignature;

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

        // CRITICAL FIX: Skip routing if all obstacles are at origin (0,0)
        // This prevents routing with invalid positions before nodes are positioned
        const allAtOrigin = obstacleRects.length > 0 && obstacleRects.every(n => n.x === 0 && n.y === 0);
        if (allAtOrigin) {
          return; // Skip routing with invalid positions
        }

        // CRITICAL: Register obstacles BEFORE creating connections
        // Joint.js pattern: Use moveShape() to update existing obstacles instead of recreating
        // This prevents router resets and "router aborted" errors during node drag
        const shapeRefs = (router as any).__shapeRefs as Map<string, any>;
        
        obstacleRects.forEach((node) => {
          const width = safeNumber(node.width, DEFAULT_NODE_WIDTH);
          const height = safeNumber(node.height, DEFAULT_NODE_HEIGHT);
          
          // Check if shape already exists for this node
          const existingShape = shapeRefs.get(node.id);
          
          if (existingShape) {
            // Joint.js pattern: Update existing shape position using moveShape()
            // This avoids router reset and maintains all connections
            try {
              const topLeft = register(new avoidModule.Point(node.x, node.y));
              const bottomRight = register(new avoidModule.Point(node.x + width, node.y + height));
              const newRectangle = register(new avoidModule.Rectangle(topLeft, bottomRight));
              router.moveShape(existingShape, newRectangle);
            } catch (e) {
              // If moveShape fails, ignore and use existing shape
            }
            
            shapeMap.set(node.id, {
              shape: existingShape,
              origin: { x: node.x, y: node.y },
              width,
              height,
            });
          } else {
            // Create new shape only if it doesn't exist
            // JOINT.JS PATTERN: Obstacles are just shapes - NO PINS here
            // Pins are created ONLY for source/target nodes with ports
            const topLeft = register(new avoidModule.Point(node.x, node.y));
            const bottomRight = register(new avoidModule.Point(node.x + width, node.y + height));
            const rectangle = register(new avoidModule.Rectangle(topLeft, bottomRight));
            const shape = register(new avoidModule.ShapeRef(router, rectangle));
            
            // Store shape reference for future moveShape() calls
            shapeRefs.set(node.id, shape);
            
            shapeMap.set(node.id, {
              shape,
              origin: { x: node.x, y: node.y },
              width,
              height,
            });
          }
        });
        
        // JOINT.JS PATTERN: Global pin registry - all pins created UPFRONT before processTransaction
        // This is critical: Joint.js creates all pins when shape is created, not when edge renders
        if (!(router as any).__shapePinRegistry) {
          (router as any).__shapePinRegistry = new Map<string, {
            right: number;
            left: number;
            top: number;
            bottom: number;
          }>();
        }
        const shapePinRegistry = (router as any).__shapePinRegistry as Map<string, { right: number; left: number; top: number; bottom: number }>;
        
        // JOINT.JS PATTERN: Create ALL boundary pins UPFRONT for source/target shapes
        // This must happen BEFORE processTransaction() for libavoid to recognize the pins
        [source, target].forEach((nodeId) => {
          const shapeInfo = shapeMap.get(nodeId);
          
          if (!shapeInfo) {
            console.warn(`[SRC-TGT-REG:${id}] Shape not found for ${nodeId} - obstacle registration may have failed`);
            return;
          }
          
          const { shape, origin, width, height } = shapeInfo;
          const { x, y } = origin;
          
          // Skip if node is at origin (not positioned yet)
          if (x === 0 && y === 0) {
            return;
          }
          
          // Update position if shape moved (for drag operations)
          try {
            const topLeft = register(new avoidModule.Point(x, y));
            const bottomRight = register(new avoidModule.Point(x + width, y + height));
            const newRectangle = register(new avoidModule.Rectangle(topLeft, bottomRight));
            router.moveShape(shape, newRectangle);
          } catch (e) {
            // Ignore move errors
          }
          
          // JOINT.JS PATTERN: Create ALL 4 boundary pins UPFRONT if not already created
          // Pins must exist BEFORE processTransaction() for libavoid to use them
          if (!shapePinRegistry.has(nodeId)) {
            // Generate unique pin IDs (like Joint.js getConnectionPinId)
            const baseId = ((router as any).__pinIdCounter || 100000);
            (router as any).__pinIdCounter = baseId + 4;
            
            const pins = {
              right: baseId,
              left: baseId + 1,
              top: baseId + 2,
              bottom: baseId + 3,
            };
            
            // Create all 4 boundary pins with direction constraints
            // RIGHT pin (1.0, 0.5)
            const rightPin = register(new avoidModule.ShapeConnectionPin(
              shape, pins.right, 1.0, 0.5, true, 0, avoidModule.ConnDirRight ?? 2
            ));
            rightPin.setExclusive?.(false);
            
            // LEFT pin (0.0, 0.5)
            const leftPin = register(new avoidModule.ShapeConnectionPin(
              shape, pins.left, 0.0, 0.5, true, 0, avoidModule.ConnDirLeft ?? 8
            ));
            leftPin.setExclusive?.(false);
            
            // TOP pin (0.5, 0.0)
            const topPin = register(new avoidModule.ShapeConnectionPin(
              shape, pins.top, 0.5, 0.0, true, 0, avoidModule.ConnDirUp ?? 1
            ));
            topPin.setExclusive?.(false);
            
            // BOTTOM pin (0.5, 1.0)
            const bottomPin = register(new avoidModule.ShapeConnectionPin(
              shape, pins.bottom, 0.5, 1.0, true, 0, avoidModule.ConnDirDown ?? 4
            ));
            bottomPin.setExclusive?.(false);
            
            shapePinRegistry.set(nodeId, pins);
            
            // Debug logging removed to prevent infinite rendering
          }
        });
        
        // Track if obstacles changed - we'll call processTransaction AFTER pins/ConnRef are created
        // This is critical: calling processTransaction before pins are created causes libavoid
        // to use node centers instead of ShapeConnectionPins
        const lastProcessedSignature = (router as any).__lastProcessedObstacleSignature || '';
        const obstaclesChanged = lastProcessedSignature !== obstacleSignature;
        
        // Update signature but DON'T call processTransaction yet - wait until after ConnRef setup
        if (obstaclesChanged) {
          (router as any).__lastProcessedObstacleSignature = obstacleSignature;
        }
        
        // CRITICAL: Ensure obstacles are registered in router before proceeding
        // This is synchronous, so obstacles are guaranteed to be in router before connections

        // Port edge tracking using global registry
        // Initialize shared port registry on window if not exists
        if (!(window as any).__portEdgeRegistry) {
          (window as any).__portEdgeRegistry = new Map<string, string[]>();
          (window as any).__portEdgeRegistryVersion = '';
          (window as any).__portEdgeObstacleVersion = '';
          (window as any).__portEdgeRegistrationBarrier = {
            version: '',
            registeredEdges: new Set<string>(),
            registrationComplete: false,
          };
        }
        
        // CRITICAL FIX: Only clear registry when routerVersion (libavoid options) changes
        // DO NOT clear when obstacleSignature changes - port-to-edge grouping doesn't depend on obstacle positions!
        // Port grouping only depends on: which edges exist and which handles they use
        // Clearing on obstacle change causes the "ballooning" bug where unrelated edges change paths
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

        function getConnDirDown(): number {
          // Debug: Log what ConnDir values are available
          if ((window as any).__connDirLogged !== true) {
            (window as any).__connDirLogged = true;
            console.log(`[LIBAVOID-DIR] Available direction flags:`, {
              ConnDirUp: avoidModule.ConnDirUp,
              ConnDirDown: avoidModule.ConnDirDown,
              ConnDirLeft: avoidModule.ConnDirLeft,
              ConnDirRight: avoidModule.ConnDirRight,
              ConnDirBottom: (avoidModule as any).ConnDirBottom,
              ConnDirAll: avoidModule.ConnDirAll,
            });
          }
          
          if (typeof avoidModule.ConnDirDown === 'number') {
            return avoidModule.ConnDirDown;
          }
          if (typeof (avoidModule as any).ConnDirBottom === 'number') {
            return (avoidModule as any).ConnDirBottom;
          }
          // CRITICAL: If ConnDirDown doesn't exist, calculate it from the bit pattern
          // In libavoid, directions are bit flags: Up=1, Down=2, Left=4, Right=8 (typical pattern)
          // Or: Up=1, Right=2, Down=4, Left=8 (alternate pattern)
          // We need to figure out what Down is by looking at the other values
          const up = avoidModule.ConnDirUp ?? 0;
          const left = avoidModule.ConnDirLeft ?? 0;
          const right = avoidModule.ConnDirRight ?? 0;
          
          // If we have Up=1, the pattern is likely: Up=1, Down=2, Left=4, Right=8
          // Try to derive Down from the bit pattern
          if (up === 1 && right === 2) {
            // Pattern: Up=1, Right=2, Down=4, Left=8
            console.log(`[LIBAVOID-DIR] Derived ConnDirDown=4 from pattern Up=1,Right=2`);
            return 4;
          } else if (up === 1 && left === 4) {
            // Pattern: Up=1, Down=2, Left=4, Right=8
            console.log(`[LIBAVOID-DIR] Derived ConnDirDown=2 from pattern Up=1,Left=4`);
            return 2;
          }
          
          console.warn(`[LIBAVOID-DIR] Could not derive ConnDirDown! Falling back to ConnDirRight=${right}`);
          return avoidModule.ConnDirRight ?? 0;
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
          // CRITICAL FIX: Never return ConnDirAll - use getConnDirDown() or ConnDirRight as fallback
          // This prevents edges from "sliding" along node faces and passing through nodes
          const downFlag = getConnDirDown();
          return downFlag || (avoidModule.ConnDirRight ?? 0);
        };

        // JOINT.JS PATTERN: Use pre-created boundary pins from shapePinRegistry
        // Pins were created UPFRONT when shapes were registered (before processTransaction)
        const createConnEndForNode = (nodeId: string, point: Point, preferredDirection?: Position, edgeOffset: number = 0) => {
          const info = shapeMap.get(nodeId);
          if (!info) {
            console.log(`[SHAPE-DEBUG:${id}] ⚠️ Shape NOT FOUND for ${nodeId}! Falling back to raw point`);
            const pt = register(new avoidModule.Point(point.x, point.y));
            return register(new avoidModule.ConnEnd(pt));
          }

          const { shape, origin, width, height } = info;
          
          // Get pre-created pins for this shape
          const pins = shapePinRegistry.get(nodeId);
          if (!pins) {
            // Debug logging removed to prevent infinite rendering
            const cx = origin.x + width / 2;
            const cy = origin.y + height / 2;
            const pt = register(new avoidModule.Point(cx, cy));
            return register(new avoidModule.ConnEnd(pt));
          }
          
          // JOINT.JS PATTERN: Use pre-created boundary pins
          // Determine which pin to use based on direction
          let pinId: number;
          let portName: string;
          
          if (preferredDirection) {
            switch (preferredDirection) {
              case Position.Right:
                pinId = pins.right;
                portName = 'right';
                break;
              case Position.Left:
                pinId = pins.left;
                portName = 'left';
                break;
              case Position.Top:
                pinId = pins.top;
                portName = 'top';
                break;
              case Position.Bottom:
                pinId = pins.bottom;
                portName = 'bottom';
                break;
              default:
                // Default to right if no direction
                pinId = pins.right;
                portName = 'right';
            }
          } else {
            // Calculate direction from point position (like Joint.js sideNearestToPoint)
            const cx = origin.x + width / 2;
            const cy = origin.y + height / 2;
            const dx = point.x - cx;
            const dy = point.y - cy;
            
            if (Math.abs(dx) > Math.abs(dy)) {
              if (dx >= 0) {
                pinId = pins.right;
                portName = 'right';
              } else {
                pinId = pins.left;
                portName = 'left';
              }
            } else {
              if (dy >= 0) {
                pinId = pins.bottom;
                portName = 'bottom';
              } else {
                pinId = pins.top;
                portName = 'top';
              }
            }
          }
          
          // For offset ports (multiple edges on same port), we need additional pins
          // These are created lazily since we don't know which offsets will be needed upfront
          if (edgeOffset !== 0 && portEdgeSpacing > 0 && preferredDirection) {
            const offsetKey = `${nodeId}:${portName}_${edgeOffset}`;
            
            // Check if we already created an offset pin
            if (!(router as any).__offsetPins) {
              (router as any).__offsetPins = new Map<string, number>();
            }
            const offsetPins = (router as any).__offsetPins as Map<string, number>;
            
            if (!offsetPins.has(offsetKey)) {
              // Calculate offset position
              let normX: number;
              let normY: number;
              let dirFlag: number;
              
              switch (preferredDirection) {
                case Position.Right:
                  normX = 1.0;
                  normY = 0.5 + (edgeOffset * portEdgeSpacing) / height;
                  dirFlag = avoidModule.ConnDirRight ?? 2;
                  break;
                case Position.Left:
                  normX = 0.0;
                  normY = 0.5 + (edgeOffset * portEdgeSpacing) / height;
                  dirFlag = avoidModule.ConnDirLeft ?? 8;
                  break;
                case Position.Top:
                  normX = 0.5 + (edgeOffset * portEdgeSpacing) / width;
                  normY = 0.0;
                  dirFlag = avoidModule.ConnDirUp ?? 1;
                  break;
                case Position.Bottom:
                  normX = 0.5 + (edgeOffset * portEdgeSpacing) / width;
                  normY = 1.0;
                  dirFlag = avoidModule.ConnDirDown ?? 4;
                  break;
                default:
                  normX = 0.5;
                  normY = 0.5;
                  dirFlag = avoidModule.ConnDirAll ?? 15;
              }
              
              // Clamp to valid range
              normX = Math.max(0, Math.min(1, normX));
              normY = Math.max(0, Math.min(1, normY));
              
              // Create offset pin
              const currentCounter = (router as any).__pinIdCounter || 200000;
              const offsetPinId = currentCounter;
              (router as any).__pinIdCounter = currentCounter + 1;
              
              const pin = register(new avoidModule.ShapeConnectionPin(
                shape, offsetPinId, normX, normY, true, 0, dirFlag
              ));
              pin.setExclusive?.(false);
              
              offsetPins.set(offsetKey, offsetPinId);
              pinId = offsetPinId;
              
              // Debug logging removed to prevent infinite rendering
            } else {
              pinId = offsetPins.get(offsetKey)!;
            }
            portName = `${portName}_${edgeOffset}`;
          }
          
          // JOINT.JS PATTERN: Use ConnEnd(shape, pinId) with pre-created pin
          const connEnd = register(new avoidModule.ConnEnd(shape, pinId));
          
          const pinType = nodeId === source ? 'SRC' : nodeId === target ? 'TGT' : 'OTHER';
          // Debug logging removed to prevent infinite rendering
          
          return connEnd;
        };

        // Use pre-computed offsets (no async delay needed since we computed synchronously above)
        const srcEdgeOffset = preComputedSrcOffset;
        const tgtEdgeOffset = preComputedTgtOffset;

        const sourcePoint: Point = { x: sourceX, y: sourceY };
        const targetPoint: Point = { x: targetX, y: targetY };

        // Use the effective positions from port key calculation for consistency
        const srcEnd = createConnEndForNode(source, sourcePoint, effectiveSourcePosition, srcEdgeOffset);
        const dstEnd = createConnEndForNode(target, targetPoint, effectiveTargetPosition, tgtEdgeOffset);
        
        // Joint.js pattern: Reuse existing ConnRef if it exists, otherwise create new
        const connRefs = (router as any).__connRefs as Map<string, any>;
        
        // Initialize routes cache on router if not exists
        // This stores routes updated by callbacks - prevents polling displayRoute() for unchanged edges
        if (!(router as any).__routesCache) {
          (router as any).__routesCache = new Map<string, Point[]>();
        }
        const routesCache = (router as any).__routesCache as Map<string, Point[]>;
        
        let connection = connRefs.get(id);
        const isNewConnection = !connection;
        
        if (!connection) {
          // Create new ConnRef only if doesn't exist
          // NOTE: Do NOT register for cleanup - connRefs must persist across renders
          // to avoid re-creating connections which triggers processTransaction
          connection = new avoidModule.ConnRef(router);
          connRefs.set(id, connection);
          
          // STEP 1: Enable ConnRef callback (Joint.js pattern)
          // Callback fires when libavoid routes this connector after processTransaction()
          // This is THE mechanism for batch rerouting - callbacks fire for ALL affected edges
          connection.setCallback((connRefPtr: any) => {
            let callbackCount = 0;
            try {
              // Track callback invocations (for testing/debugging)
              if (typeof window !== 'undefined') {
                if (!(window as any).__connRefCallbackCount) {
                  (window as any).__connRefCallbackCount = new Map<string, number>();
                }
                callbackCount = ((window as any).__connRefCallbackCount.get(id) || 0) + 1;
                (window as any).__connRefCallbackCount.set(id, callbackCount);
                
                // Track ALL routes returned by callbacks for debugging
                if (!(window as any).__callbackRouteHistory) {
                  (window as any).__callbackRouteHistory = new Map<string, string[]>();
                }
              }
              
              // Extract route from the ConnRef
              const route = connection.displayRoute?.();
              if (route && typeof route.size === 'function' && route.size() > 0) {
                const points: Point[] = [];
                for (let i = 0; i < route.size(); i++) {
                  const pt = route.get_ps?.(i);
                  if (pt && typeof pt.x === 'number' && typeof pt.y === 'number') {
                    points.push({ x: pt.x, y: pt.y });
                  }
                }
                
                if (points.length >= 2) {
                  // Track route history for debugging
                  if (typeof window !== 'undefined' && (window as any).__callbackRouteHistory) {
                    const routeStr = points.map(p => `(${p.x.toFixed(0)},${p.y.toFixed(0)})`).join('→');
                    const history = (window as any).__callbackRouteHistory.get(id) || [];
                    history.push(routeStr);
                    (window as any).__callbackRouteHistory.set(id, history);
                  }
                  
                  // Update routes cache (for StepEdge to read)
                  routesCache.set(id, [...points]);
                  
                  // Write to ViewState for persistence (Joint.js pattern)
                  // ViewState is the source of truth - StepEdge reads from it
                  try {
                    const elkState = (window as any).__elkState;
                    if (elkState?.viewStateRef?.current) {
                      if (!elkState.viewStateRef.current.edge) {
                        elkState.viewStateRef.current.edge = {};
                      }
                      elkState.viewStateRef.current.edge[id] = {
                        ...elkState.viewStateRef.current.edge[id],
                        waypoints: points
                      };
                      
                      // Dispatch event to trigger StepEdge re-render (read from ViewState)
                      // This ensures StepEdge picks up the new waypoints immediately
                      if (typeof window !== 'undefined') {
                        window.dispatchEvent(new CustomEvent('edge-waypoints-updated', {
                          detail: { edgeId: id, waypoints: points }
                        }));
                      }
                      
                      // Debug: Log callback firing for ALL edges (to verify callbacks work)
                      // Debug logging removed to prevent infinite rendering
                    }
                  } catch (viewStateError) {
                    // ViewState write failed - log but don't break routing
                    // Debug logging removed to prevent infinite rendering
                  }
                }
              }
            } catch (e) {
              // Callback error - ignore (don't break routing)
              console.error(`[StepEdge:${id}] Callback error:`, e);
            }
          }, connection);
          
          // Debug: Log callback setup for all edges - removed to prevent infinite rendering
        }
        
        // Always update endpoints (Joint.js pattern: update existing connRef)
        connection.setSourceEndpoint?.(srcEnd);
        connection.setDestEndpoint?.(dstEnd);
        
        // Only set routing options on new connections
        if (isNewConnection) {
          // Always force orthogonal routing (never polyline) to ensure pins are respected
          const hasOrth = typeof avoidModule.ConnType_Orthogonal === 'number';
          const routingType = hasOrth
            ? avoidModule.ConnType_Orthogonal
            : (avoidModule.ConnType_Orthogonal as number);
          connection.setRoutingType?.(routingType);
          
          if (typeof connection.setHateCrossings === 'function') {
            connection.setHateCrossings?.(!!libavoidOptions?.hateCrossings);
          }
        }

        // Process transaction for new connections OR when obstacles changed
        // CRITICAL: We must call processTransaction AFTER pins and ConnRef are created
        // Calling it before pins exist causes libavoid to use node centers instead of pins
        // Note: obstaclesChanged is tracked from earlier (line ~665)
        if (isNewConnection || obstaclesChanged) {
          try {
            router.processTransaction?.();
          } catch (e) {
            // Ignore errors
          }
        }
        
        // Smart route extraction: only get fresh route if this edge is affected by obstacle changes
        // This prevents ballooning where unrelated edges change when far-away obstacles move
        let pathPoints: Point[] = [];
        const cachedRoute = routesCache.get(id);
        
        // Track which nodes actually moved by comparing current position to cached position
        // Initialize position cache on router
        if (!(router as any).__nodePositionCache) {
          (router as any).__nodePositionCache = new Map<string, { x: number; y: number }>();
        }
        const positionCache = (router as any).__nodePositionCache as Map<string, { x: number; y: number }>;
        
        // Find which obstacles moved
        const movedObstacles: NodeRect[] = [];
        obstacleRects.forEach(obstacle => {
          const cachedPos = positionCache.get(obstacle.id);
          if (!cachedPos || cachedPos.x !== obstacle.x || cachedPos.y !== obstacle.y) {
            movedObstacles.push(obstacle);
            positionCache.set(obstacle.id, { x: obstacle.x, y: obstacle.y });
          }
        });
        
        // Check if source or target node moved
        const sourceNodeMoved = movedObstacles.some(o => o.id === source);
        const targetNodeMoved = movedObstacles.some(o => o.id === target);
        
        // Check if any moved obstacle intersects with this edge's bounding box
        let pathIntersectsMovedObstacle = false;
        if (cachedRoute && cachedRoute.length >= 2 && movedObstacles.length > 0) {
          // Calculate edge bounding box from cached route
          const minX = Math.min(...cachedRoute.map(p => p.x));
          const maxX = Math.max(...cachedRoute.map(p => p.x));
          const minY = Math.min(...cachedRoute.map(p => p.y));
          const maxY = Math.max(...cachedRoute.map(p => p.y));
          
          // Check if any moved obstacle intersects this bounding box (with margin)
          // Use margin to catch edges near obstacles, not just through them
          const margin = 32; // Same as shapeBufferDistance
          for (const obstacle of movedObstacles) {
            if (obstacle.id === source || obstacle.id === target) continue;
            const oLeft = obstacle.x - margin;
            const oRight = obstacle.x + obstacle.width + margin;
            const oTop = obstacle.y - margin;
            const oBottom = obstacle.y + obstacle.height + margin;
            if (oLeft <= maxX && oRight >= minX && oTop <= maxY && oBottom >= minY) {
              pathIntersectsMovedObstacle = true;
              break;
            }
          }
        }
        
        // Joint.js pattern: ALWAYS extract fresh route when ANY obstacle moves
        // Don't try to be smart - libavoid callbacks handle this internally
        // Any moved obstacle could affect routing through global optimization
        const anyObstacleMoved = movedObstacles.length > 0;
        
        // CRITICAL: If routingUpdateVersion changed, it means processTransaction() was called externally
        // (e.g., during drag). We MUST extract fresh routes even if obstacleSignature didn't change
        // because ReactFlow's store might not have updated yet, but the router has.
        const prevRoutingUpdateVersion = (router as any).__lastRoutingUpdateVersion || 0;
        const routingWasUpdatedExternally = routingUpdateVersion > prevRoutingUpdateVersion;
        if (routingWasUpdatedExternally) {
          (router as any).__lastRoutingUpdateVersion = routingUpdateVersion;
          // Debug: Log when we detect external routing update
          // Debug logging removed to prevent infinite rendering
        }
        
        const needsFreshRoute = isNewConnection || !cachedRoute || anyObstacleMoved || routingWasUpdatedExternally;
        
        // JOINT.JS PATTERN: Route validation
        // Validates that libavoid produced a usable route
        const isRouteValid = (route: Point[], srcInfo: { origin: Point; width: number; height: number } | undefined, tgtInfo: { origin: Point; width: number; height: number } | undefined): boolean => {
          if (route.length < 2) return false;
          
          // If route has more than 2 points, libavoid found a multi-segment path - valid
          if (route.length > 2) return true;
          
          // For 2-point routes, check if it's a valid orthogonal line
          const start = route[0];
          const end = route[route.length - 1];
          
          // Check if diagonal (not orthogonal) - INVALID
          const tolerance = 2; // Allow small floating point differences
          const isHorizontal = Math.abs(start.y - end.y) <= tolerance;
          const isVertical = Math.abs(start.x - end.x) <= tolerance;
          if (!isHorizontal && !isVertical) {
            console.log(`[ROUTE-VALID:${id}] ❌ INVALID: Diagonal route from (${start.x.toFixed(1)},${start.y.toFixed(1)}) to (${end.x.toFixed(1)},${end.y.toFixed(1)})`);
            return false;
          }
          
          // Check if start point is at node CENTER instead of boundary
          if (srcInfo) {
            const srcCenterX = srcInfo.origin.x + srcInfo.width / 2;
            const srcCenterY = srcInfo.origin.y + srcInfo.height / 2;
            const isAtSrcCenter = Math.abs(start.x - srcCenterX) <= tolerance && Math.abs(start.y - srcCenterY) <= tolerance;
            if (isAtSrcCenter) {
              console.log(`[ROUTE-VALID:${id}] ❌ INVALID: Start at source CENTER (${start.x.toFixed(1)},${start.y.toFixed(1)}) instead of boundary`);
              return false;
            }
          }
          
          // Check if end point is at node CENTER instead of boundary
          if (tgtInfo) {
            const tgtCenterX = tgtInfo.origin.x + tgtInfo.width / 2;
            const tgtCenterY = tgtInfo.origin.y + tgtInfo.height / 2;
            const isAtTgtCenter = Math.abs(end.x - tgtCenterX) <= tolerance && Math.abs(end.y - tgtCenterY) <= tolerance;
            if (isAtTgtCenter) {
              console.log(`[ROUTE-VALID:${id}] ❌ INVALID: End at target CENTER (${end.x.toFixed(1)},${end.y.toFixed(1)}) instead of boundary`);
              return false;
            }
          }
          
          // Check if source point is inside target element (with margin)
          if (srcInfo && tgtInfo) {
            const margin = safeNumber(libavoidOptions?.shapeBufferDistance, 32);
            const tgtLeft = tgtInfo.origin.x - margin;
            const tgtRight = tgtInfo.origin.x + tgtInfo.width + margin;
            const tgtTop = tgtInfo.origin.y - margin;
            const tgtBottom = tgtInfo.origin.y + tgtInfo.height + margin;
            
            if (start.x >= tgtLeft && start.x <= tgtRight && start.y >= tgtTop && start.y <= tgtBottom) {
              console.log(`[ROUTE-VALID:${id}] ❌ INVALID: Start point inside target element`);
              return false;
            }
            
            // Check if target point is inside source element (with margin)
            const srcLeft = srcInfo.origin.x - margin;
            const srcRight = srcInfo.origin.x + srcInfo.width + margin;
            const srcTop = srcInfo.origin.y - margin;
            const srcBottom = srcInfo.origin.y + srcInfo.height + margin;
            
            if (end.x >= srcLeft && end.x <= srcRight && end.y >= srcTop && end.y <= srcBottom) {
              console.log(`[ROUTE-VALID:${id}] ❌ INVALID: End point inside source element`);
              return false;
            }
          }
          
          return true;
        };
        
        // JOINT.JS PATTERN: Fallback orthogonal route
        // Computes a right-angle route that ALWAYS goes OUTSIDE nodes (never inverted)
        // Key principle: First segment goes in the direction of the source port,
        // last segment comes from the direction of the target port
        const computeFallbackRoute = (srcInfo: { origin: Point; width: number; height: number }, tgtInfo: { origin: Point; width: number; height: number }, srcPos: Position, tgtPos: Position): Point[] => {
          const margin = safeNumber(libavoidOptions?.shapeBufferDistance, 32);
          
          // Calculate boundary points based on positions (on the node edge)
          let srcX: number, srcY: number;
          switch (srcPos) {
            case Position.Right:
              srcX = srcInfo.origin.x + srcInfo.width;
              srcY = srcInfo.origin.y + srcInfo.height / 2;
              break;
            case Position.Left:
              srcX = srcInfo.origin.x;
              srcY = srcInfo.origin.y + srcInfo.height / 2;
              break;
            case Position.Top:
              srcX = srcInfo.origin.x + srcInfo.width / 2;
              srcY = srcInfo.origin.y;
              break;
            case Position.Bottom:
              srcX = srcInfo.origin.x + srcInfo.width / 2;
              srcY = srcInfo.origin.y + srcInfo.height;
              break;
            default:
              srcX = srcInfo.origin.x + srcInfo.width / 2;
              srcY = srcInfo.origin.y + srcInfo.height / 2;
          }
          
          let tgtX: number, tgtY: number;
          switch (tgtPos) {
            case Position.Right:
              tgtX = tgtInfo.origin.x + tgtInfo.width;
              tgtY = tgtInfo.origin.y + tgtInfo.height / 2;
              break;
            case Position.Left:
              tgtX = tgtInfo.origin.x;
              tgtY = tgtInfo.origin.y + tgtInfo.height / 2;
              break;
            case Position.Top:
              tgtX = tgtInfo.origin.x + tgtInfo.width / 2;
              tgtY = tgtInfo.origin.y;
              break;
            case Position.Bottom:
              tgtX = tgtInfo.origin.x + tgtInfo.width / 2;
              tgtY = tgtInfo.origin.y + tgtInfo.height;
              break;
            default:
              tgtX = tgtInfo.origin.x + tgtInfo.width / 2;
              tgtY = tgtInfo.origin.y + tgtInfo.height / 2;
          }
          
          const start = { x: srcX, y: srcY };
          const end = { x: tgtX, y: tgtY };
          
          // JOINT.JS PATTERN: Always route OUTSIDE the nodes
          // First point after start goes in the DIRECTION of the port (OUTSIDE the node)
          // Last point before end comes from the DIRECTION of the target port (OUTSIDE the node)
          
          // Calculate the "outside" points - these ensure the edge goes OUTSIDE
          let srcOutX = srcX, srcOutY = srcY;
          switch (srcPos) {
            case Position.Right:
              srcOutX = srcX + margin; // Go RIGHT from right port
              break;
            case Position.Left:
              srcOutX = srcX - margin; // Go LEFT from left port
              break;
            case Position.Top:
              srcOutY = srcY - margin; // Go UP from top port
              break;
            case Position.Bottom:
              srcOutY = srcY + margin; // Go DOWN from bottom port
              break;
          }
          
          let tgtOutX = tgtX, tgtOutY = tgtY;
          switch (tgtPos) {
            case Position.Right:
              tgtOutX = tgtX + margin; // Come from RIGHT to right port
              break;
            case Position.Left:
              tgtOutX = tgtX - margin; // Come from LEFT to left port
              break;
            case Position.Top:
              tgtOutY = tgtY - margin; // Come from ABOVE to top port
              break;
            case Position.Bottom:
              tgtOutY = tgtY + margin; // Come from BELOW to bottom port
              break;
          }
          
          const srcOut = { x: srcOutX, y: srcOutY };
          const tgtOut = { x: tgtOutX, y: tgtOutY };
          
          // Build the route: start → srcOut → intermediate → tgtOut → end
          const route: Point[] = [start, srcOut];
          
          // Determine how to connect srcOut to tgtOut with right angles
          // We need 0, 1, or 2 intermediate points depending on alignment
          const isHorizontalSrc = srcPos === Position.Right || srcPos === Position.Left;
          const isHorizontalTgt = tgtPos === Position.Right || tgtPos === Position.Left;
          
          if (isHorizontalSrc && isHorizontalTgt) {
            // Both horizontal: need vertical connector
            // If they're on opposite sides, connect directly with 2 bends
            if ((srcPos === Position.Right && tgtPos === Position.Left) ||
                (srcPos === Position.Left && tgtPos === Position.Right)) {
              // Direct horizontal connection - use midpoint
              const midX = (srcOutX + tgtOutX) / 2;
              route.push({ x: midX, y: srcOutY });
              route.push({ x: midX, y: tgtOutY });
            } else {
              // Same side - need to go around
              const extendX = srcPos === Position.Right
                ? Math.max(srcOutX, tgtOutX) + margin
                : Math.min(srcOutX, tgtOutX) - margin;
              route.push({ x: extendX, y: srcOutY });
              route.push({ x: extendX, y: tgtOutY });
            }
          } else if (!isHorizontalSrc && !isHorizontalTgt) {
            // Both vertical: need horizontal connector
            if ((srcPos === Position.Bottom && tgtPos === Position.Top) ||
                (srcPos === Position.Top && tgtPos === Position.Bottom)) {
              // Direct vertical connection - use midpoint
              const midY = (srcOutY + tgtOutY) / 2;
              route.push({ x: srcOutX, y: midY });
              route.push({ x: tgtOutX, y: midY });
            } else {
              // Same side - need to go around
              const extendY = srcPos === Position.Bottom
                ? Math.max(srcOutY, tgtOutY) + margin
                : Math.min(srcOutY, tgtOutY) - margin;
              route.push({ x: srcOutX, y: extendY });
              route.push({ x: tgtOutX, y: extendY });
            }
          } else {
            // Mixed: one horizontal, one vertical - single bend point
            if (isHorizontalSrc) {
              // Horizontal source, vertical target
              // Connect at (tgtOutX, srcOutY) or (srcOutX, tgtOutY)
              route.push({ x: tgtOutX, y: srcOutY });
            } else {
              // Vertical source, horizontal target
              // Connect at (srcOutX, tgtOutY)
              route.push({ x: srcOutX, y: tgtOutY });
            }
          }
          
          route.push(tgtOut);
          route.push(end);
          
          // Debug logging removed to prevent infinite rendering
          return route;
        };
        
        if (needsFreshRoute) {
          try {
            const route = connection.displayRoute?.();
            if (route && typeof route.size === 'function' && route.size() > 0) {
              for (let i = 0; i < route.size(); i++) {
                const pt = route.get_ps?.(i);
                if (pt && typeof pt.x === 'number' && typeof pt.y === 'number') {
                  pathPoints.push({ x: pt.x, y: pt.y });
                }
              }
              // FALLBACK IS LAST RESORT: Only use if libavoid returns NO route
              // If libavoid returns a route (even if at center), use it - libavoid knows best
              if (pathPoints.length >= 2) {
                // Libavoid returned a route - use it (even if at center, libavoid will fix it on next update)
                routesCache.set(id, [...pathPoints]);
                // Debug logging removed to prevent infinite rendering
                
                // Write libavoid route to ViewState
                try {
                  const elkState = (window as any).__elkState;
                  if (elkState?.viewStateRef?.current) {
                    if (!elkState.viewStateRef.current.edge) {
                      elkState.viewStateRef.current.edge = {};
                    }
                    elkState.viewStateRef.current.edge[id] = {
                      ...elkState.viewStateRef.current.edge[id],
                      waypoints: [...pathPoints]
                    };
                  }
                } catch (e) { /* ignore */ }
              } else {
                // FALLBACK: Libavoid returned < 2 points - only use fallback when libavoid truly fails
                // Debug logging removed to prevent infinite rendering
                const srcInfo = shapeMap.get(source);
                const tgtInfo = shapeMap.get(target);
                if (srcInfo && tgtInfo) {
                  pathPoints = computeFallbackRoute(srcInfo, tgtInfo, effectiveSourcePosition, effectiveTargetPosition);
                  routesCache.set(id, [...pathPoints]);
                  // Debug logging removed to prevent infinite rendering
                  
                  // Write fallback to ViewState
                  try {
                    const elkState = (window as any).__elkState;
                    if (elkState?.viewStateRef?.current) {
                      if (!elkState.viewStateRef.current.edge) {
                        elkState.viewStateRef.current.edge = {};
                      }
                      elkState.viewStateRef.current.edge[id] = {
                        ...elkState.viewStateRef.current.edge[id],
                        waypoints: [...pathPoints]
                      };
                    }
                  } catch (e) { /* ignore */ }
                }
              }
            } else {
              // FALLBACK: Libavoid returned null/undefined/empty - use fallback as last resort
              // Debug logging removed to prevent infinite rendering
              const srcInfo = shapeMap.get(source);
              const tgtInfo = shapeMap.get(target);
              if (srcInfo && tgtInfo) {
                pathPoints = computeFallbackRoute(srcInfo, tgtInfo, effectiveSourcePosition, effectiveTargetPosition);
                routesCache.set(id, [...pathPoints]);
                console.log(`[StepEdge:${id}] 🔄 FALLBACK route cached with ${pathPoints.length} points`);
                
                // Write fallback to ViewState
                try {
                  const elkState = (window as any).__elkState;
                  if (elkState?.viewStateRef?.current) {
                    if (!elkState.viewStateRef.current.edge) {
                      elkState.viewStateRef.current.edge = {};
                    }
                    elkState.viewStateRef.current.edge[id] = {
                      ...elkState.viewStateRef.current.edge[id],
                      waypoints: [...pathPoints]
                    };
                  }
                } catch (e) { /* ignore */ }
              }
            }
          } catch (e) {
            // FALLBACK: Route extraction failed - use fallback as last resort
            // Debug logging removed to prevent infinite rendering
            const srcInfo = shapeMap.get(source);
            const tgtInfo = shapeMap.get(target);
            if (srcInfo && tgtInfo) {
              pathPoints = computeFallbackRoute(srcInfo, tgtInfo, effectiveSourcePosition, effectiveTargetPosition);
              routesCache.set(id, [...pathPoints]);
              console.log(`[StepEdge:${id}] 🔄 FALLBACK route cached with ${pathPoints.length} points`);
              
              // Write fallback to ViewState
              try {
                const elkState = (window as any).__elkState;
                if (elkState?.viewStateRef?.current) {
                  if (!elkState.viewStateRef.current.edge) {
                    elkState.viewStateRef.current.edge = {};
                  }
                  elkState.viewStateRef.current.edge[id] = {
                    ...elkState.viewStateRef.current.edge[id],
                    waypoints: [...pathPoints]
                  };
                }
              } catch (e2) { /* ignore */ }
            }
          }
        } else if (cachedRoute && cachedRoute.length >= 2) {
          // Use cached route - libavoid routes are always preferred, even if at center
          // Fallback is only used when libavoid returns NO route
          pathPoints = cachedRoute;
          
          // Ensure cached route is in ViewState
          try {
            const elkState = (window as any).__elkState;
            if (elkState?.viewStateRef?.current) {
              if (!elkState.viewStateRef.current.edge) {
                elkState.viewStateRef.current.edge = {};
              }
              const existingWaypoints = elkState.viewStateRef.current.edge[id]?.waypoints;
              // Only write if not already in ViewState or if it changed
              if (!existingWaypoints || !arePointArraysEqual(existingWaypoints, cachedRoute)) {
                elkState.viewStateRef.current.edge[id] = {
                  ...elkState.viewStateRef.current.edge[id],
                  waypoints: [...cachedRoute]
                };
              }
            }
          } catch (e) { /* ignore */ }
        }
        
        // FIX: If pathPoints.length < 2, persist current path instead of clearing
        // This prevents flickering - keep the current edge visible until libavoid/fallback provides a new route
        if (pathPoints.length < 2) {
          // Debug logging removed to prevent infinite rendering
          
          // Try fallback as last resort
          const srcInfo = shapeMap.get(source);
          const tgtInfo = shapeMap.get(target);
          if (srcInfo && tgtInfo) {
            pathPoints = computeFallbackRoute(srcInfo, tgtInfo, effectiveSourcePosition, effectiveTargetPosition);
            routesCache.set(id, [...pathPoints]);
            // Debug logging removed to prevent infinite rendering
            
            // Write fallback to ViewState
            try {
              const elkState = (window as any).__elkState;
              if (elkState?.viewStateRef?.current) {
                if (!elkState.viewStateRef.current.edge) {
                  elkState.viewStateRef.current.edge = {};
                }
                elkState.viewStateRef.current.edge[id] = {
                  ...elkState.viewStateRef.current.edge[id],
                  waypoints: [...pathPoints]
                };
              }
            } catch (e) { /* ignore */ }
          } else {
            // No shape info - use source/target points as absolute last resort
            pathPoints = [sourcePoint, targetPoint];
          }
        }
        
        // Route is now ready - pathPoints contains the valid route from libavoid
        
        // Disable verbose diagnostics by default
        const enableDiagnostics = (window as any).__enableEdgeDiagnostics === true;
        
        // Initialize diagnostics map if needed
        if (enableDiagnostics && !(window as any).__edgeDiagnostics) {
          (window as any).__edgeDiagnostics = new Map();
        }
        
        if (enableDiagnostics) {
          // Initialize diagnostics map if needed (redundant check but safe)
          if (!(window as any).__edgeDiagnostics) {
            (window as any).__edgeDiagnostics = new Map();
          }
          
          // Debug logging removed to prevent infinite rendering
          
          if (pathPoints.length >= 2) {
            const srcInfo = shapeMap.get(source);
            const tgtInfo = shapeMap.get(target);
            
            // Always store diagnostic data, even if shapeMap entries are missing
            // Initialize diagnostics map if needed
            if (!(window as any).__edgeDiagnostics) {
              (window as any).__edgeDiagnostics = new Map();
            }
            
            if (srcInfo && tgtInfo) {
            // Calculate actual pin positions in pixels
            const srcPinX = srcInfo.origin.x + (effectiveSourcePosition === Position.Right ? srcInfo.width : 
                              effectiveSourcePosition === Position.Left ? 0 : 
                              effectiveSourcePosition === Position.Top || effectiveSourcePosition === Position.Bottom ? srcInfo.width / 2 : srcInfo.width / 2);
            const srcPinY = srcInfo.origin.y + (effectiveSourcePosition === Position.Bottom ? srcInfo.height :
                              effectiveSourcePosition === Position.Top ? 0 :
                              effectiveSourcePosition === Position.Left || effectiveSourcePosition === Position.Right ? srcInfo.height / 2 : srcInfo.height / 2);
            const tgtPinX = tgtInfo.origin.x + (effectiveTargetPosition === Position.Right ? tgtInfo.width :
                              effectiveTargetPosition === Position.Left ? 0 :
                              effectiveTargetPosition === Position.Top || effectiveTargetPosition === Position.Bottom ? tgtInfo.width / 2 : tgtInfo.width / 2);
            const tgtPinY = tgtInfo.origin.y + (effectiveTargetPosition === Position.Bottom ? tgtInfo.height :
                              effectiveTargetPosition === Position.Top ? 0 :
                              effectiveTargetPosition === Position.Left || effectiveTargetPosition === Position.Right ? tgtInfo.height / 2 : tgtInfo.height / 2);
            
            // Check if first point matches source pin (within tolerance)
            const firstPoint = pathPoints[0];
            const pinMatchTolerance = 2.0;
            const srcPinMatches = Math.abs(firstPoint.x - srcPinX) < pinMatchTolerance && 
                                 Math.abs(firstPoint.y - srcPinY) < pinMatchTolerance;
            
            // Check if pin is on the correct boundary
            const srcNodeRect = {
              x: srcInfo.origin.x,
              y: srcInfo.origin.y,
              width: srcInfo.width,
              height: srcInfo.height
            };
            const tgtNodeRect = {
              x: tgtInfo.origin.x,
              y: tgtInfo.origin.y,
              width: tgtInfo.width,
              height: tgtInfo.height
            };
            
            const boundaryTolerance = 1.0;
            let srcPinOnBoundary = false;
            let srcPinBoundaryIssue = '';
            if (effectiveSourcePosition === Position.Left) {
              srcPinOnBoundary = Math.abs(srcPinX - srcNodeRect.x) < boundaryTolerance;
              if (!srcPinOnBoundary) srcPinBoundaryIssue = `Expected X=${srcNodeRect.x}, got ${srcPinX.toFixed(1)}`;
            } else if (effectiveSourcePosition === Position.Right) {
              srcPinOnBoundary = Math.abs(srcPinX - (srcNodeRect.x + srcNodeRect.width)) < boundaryTolerance;
              if (!srcPinOnBoundary) srcPinBoundaryIssue = `Expected X=${(srcNodeRect.x + srcNodeRect.width).toFixed(1)}, got ${srcPinX.toFixed(1)}`;
            } else if (effectiveSourcePosition === Position.Top) {
              srcPinOnBoundary = Math.abs(srcPinY - srcNodeRect.y) < boundaryTolerance;
              if (!srcPinOnBoundary) srcPinBoundaryIssue = `Expected Y=${srcNodeRect.y}, got ${srcPinY.toFixed(1)}`;
            } else if (effectiveSourcePosition === Position.Bottom) {
              srcPinOnBoundary = Math.abs(srcPinY - (srcNodeRect.y + srcNodeRect.height)) < boundaryTolerance;
              if (!srcPinOnBoundary) srcPinBoundaryIssue = `Expected Y=${(srcNodeRect.y + srcNodeRect.height).toFixed(1)}, got ${srcPinY.toFixed(1)}`;
            } else {
              srcPinOnBoundary = false;
              srcPinBoundaryIssue = `Unknown position: ${effectiveSourcePosition}`;
            }
            
            // Check if first segment exits source node
            const secondPoint = pathPoints[1];
            const firstSegmentExits = !(
              secondPoint.x >= srcNodeRect.x && 
              secondPoint.x <= srcNodeRect.x + srcNodeRect.width &&
              secondPoint.y >= srcNodeRect.y && 
              secondPoint.y <= srcNodeRect.y + srcNodeRect.height
            );
            
            // Debug logging removed to prevent infinite rendering
            
            // Store diagnostic data for window.__edgeSanity()
            if (!(window as any).__edgeDiagnostics) {
              (window as any).__edgeDiagnostics = new Map();
            }
            (window as any).__edgeDiagnostics.set(id, {
              source, target,
              srcNodeRect, tgtNodeRect,
              effectiveSourcePosition, effectiveTargetPosition,
              srcPin: { x: srcPinX, y: srcPinY },
              tgtPin: { x: tgtPinX, y: tgtPinY },
              routePoints: pathPoints,
              srcPinOnBoundary,
              srcPinMatches,
              firstSegmentExits,
              issues: [
                !srcPinOnBoundary && `Source pin not on boundary: ${srcPinBoundaryIssue}`,
                !srcPinMatches && `First route point doesn't match source pin`,
                !firstSegmentExits && `First segment stays inside source node`
              ].filter(Boolean)
            });
          } else {
            // Store basic diagnostic data even when shapeMap entries are missing
            (window as any).__edgeDiagnostics.set(id, {
              source, target,
              srcNodeRect: srcInfo ? { x: srcInfo.origin.x, y: srcInfo.origin.y, width: srcInfo.width, height: srcInfo.height } : null,
              tgtNodeRect: tgtInfo ? { x: tgtInfo.origin.x, y: tgtInfo.origin.y, width: tgtInfo.width, height: tgtInfo.height } : null,
              effectiveSourcePosition, effectiveTargetPosition,
              srcPin: null,
              tgtPin: null,
              routePoints: pathPoints,
              srcPinOnBoundary: false,
              srcPinMatches: false,
              firstSegmentExits: false,
              issues: [
                !srcInfo && `Source node info missing from shapeMap`,
                !tgtInfo && `Target node info missing from shapeMap`
              ].filter(Boolean)
            });
          }
          } else {
            // Store basic diagnostic data for edges with insufficient route points
            const srcInfo = shapeMap.get(source);
            const tgtInfo = shapeMap.get(target);
            if (!(window as any).__edgeDiagnostics) {
              (window as any).__edgeDiagnostics = new Map();
            }
            (window as any).__edgeDiagnostics.set(id, {
              source, target,
              srcNodeRect: srcInfo ? { x: srcInfo.origin.x, y: srcInfo.origin.y, width: srcInfo.width, height: srcInfo.height } : null,
              tgtNodeRect: tgtInfo ? { x: tgtInfo.origin.x, y: tgtInfo.origin.y, width: tgtInfo.width, height: tgtInfo.height } : null,
              effectiveSourcePosition, effectiveTargetPosition,
              srcPin: null,
              tgtPin: null,
              routePoints: pathPoints,
              srcPinOnBoundary: false,
              srcPinMatches: false,
              firstSegmentExits: false,
              issues: [
                `Insufficient route points: ${pathPoints.length} (need at least 2)`
              ]
            });
          }
        }
        
        // Debug logs for horizontal edges and port edges
        const isMovingEdge = id === 'edge-straight' || id.startsWith('edge-port-') || id === 'edge-horizontal' || id.includes('horizontal');
        // Debug logging removed to prevent infinite rendering
        if (isMovingEdge) {
          const libavoidSegs = pathPoints.length - 1;
          
          // Log pin positions in actual pixels
          const srcInfo = shapeMap.get(source);
          const tgtInfo = shapeMap.get(target);
          if (srcInfo && tgtInfo) {
            const srcPinX = srcInfo.origin.x + (effectiveSourcePosition === Position.Right ? srcInfo.width : 
                              effectiveSourcePosition === Position.Left ? 0 : srcInfo.width / 2);
            const srcPinY = srcInfo.origin.y + (effectiveSourcePosition === Position.Bottom ? srcInfo.height :
                              effectiveSourcePosition === Position.Top ? 0 : srcInfo.height / 2);
            const tgtPinX = tgtInfo.origin.x + (effectiveTargetPosition === Position.Right ? tgtInfo.width :
                              effectiveTargetPosition === Position.Left ? 0 : tgtInfo.width / 2);
            const tgtPinY = tgtInfo.origin.y + (effectiveTargetPosition === Position.Bottom ? tgtInfo.height :
                              effectiveTargetPosition === Position.Top ? 0 : tgtInfo.height / 2);
            
            // Debug logging removed to prevent infinite rendering
          }
          
          // Log obstacles
          const otherObstacles = obstacleRects.filter(n => n.id !== source && n.id !== target);
          // Debug logging removed to prevent infinite rendering
          
          // Check if straight line would intersect obstacles
          if (pathPoints.length === 2 && otherObstacles.length > 0) {
            const start = pathPoints[0];
            const end = pathPoints[pathPoints.length - 1];
            const intersections = otherObstacles.filter(obs => {
              // Simple line-rectangle intersection
              const minX = Math.min(start.x, end.x);
              const maxX = Math.max(start.x, end.x);
              const minY = Math.min(start.y, end.y);
              const maxY = Math.max(start.y, end.y);
              const obsMaxX = obs.x + obs.width;
              const obsMaxY = obs.y + obs.height;
              return !(maxX < obs.x || minX > obsMaxX || maxY < obs.y || minY > obsMaxY);
            });
            // Debug logging removed to prevent infinite rendering
          }
          
          // Log routing options - removed verbose logging
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
        
        // Debug comparison for moving edges
        if (isMovingEdge) {
          const renderedSegs = finalPoints.length - 1;
          const libavoidSegs = pathPoints.length - 1;
          // Debug logging removed to prevent infinite rendering
        }
        
        // Store libavoid path in window for console comparison (for ALL edges)
        if (typeof window !== 'undefined') {
          if (!(window as any).__edgeLibavoidPaths) {
            (window as any).__edgeLibavoidPaths = new Map();
          }
          (window as any).__edgeLibavoidPaths.set(id, {
            libavoid: pathPoints,
            rendered: finalPoints,
            source,
            target,
            timestamp: Date.now()
          });
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
            rawPath: pathPoints, // Original libavoid path before any processing
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
          
          // FIX: Only update edge path if we have valid points (>= 2)
          // This prevents clearing the edge when routing is in progress
          if (finalPoints.length >= 2) {
            // FINAL CHECK BEFORE RENDERING: Detect bad routes and use fallback
            // Bad routes include: center connections, diagonal lines (ANY segment), inverted edges
            const srcInfo = shapeMap.get(source);
            const tgtInfo = shapeMap.get(target);
            let useFallback = false;
            let fallbackReason = '';
            
            if (srcInfo && tgtInfo) {
              const firstPt = finalPoints[0];
              const secondPt = finalPoints.length > 1 ? finalPoints[1] : firstPt;
              const lastPt = finalPoints[finalPoints.length - 1];
              const secondLastPt = finalPoints.length > 1 ? finalPoints[finalPoints.length - 2] : lastPt;
              const tolerance = 5; // Slightly higher tolerance for detection
              
              // Check if start point is at source CENTER
              const srcCenterX = srcInfo.origin.x + srcInfo.width / 2;
              const srcCenterY = srcInfo.origin.y + srcInfo.height / 2;
              const startAtCenter = Math.abs(firstPt.x - srcCenterX) <= tolerance && 
                                     Math.abs(firstPt.y - srcCenterY) <= tolerance;
              
              // Check if end point is at target CENTER
              const tgtCenterX = tgtInfo.origin.x + tgtInfo.width / 2;
              const tgtCenterY = tgtInfo.origin.y + tgtInfo.height / 2;
              const endAtCenter = Math.abs(lastPt.x - tgtCenterX) <= tolerance && 
                                   Math.abs(lastPt.y - tgtCenterY) <= tolerance;
              
              // Check ALL segments for diagonal lines (not just first and last)
              // A diagonal segment is one where BOTH X and Y change significantly
              let anyDiagonalSegment = false;
              let diagonalSegmentIndex = -1;
              for (let i = 1; i < finalPoints.length; i++) {
                const prevPt = finalPoints[i - 1];
                const currPt = finalPoints[i];
                const xDiff = Math.abs(currPt.x - prevPt.x);
                const yDiff = Math.abs(currPt.y - prevPt.y);
                // A segment is diagonal if both X and Y change by more than tolerance
                if (xDiff > tolerance && yDiff > tolerance) {
                  anyDiagonalSegment = true;
                  diagonalSegmentIndex = i;
                  // Debug logging removed to prevent infinite rendering
                  break; // Found one diagonal segment, no need to check more
                }
              }
              
              // Keep legacy checks for logging
              const firstSegmentDiagonal = Math.abs(firstPt.x - secondPt.x) > tolerance && 
                                            Math.abs(firstPt.y - secondPt.y) > tolerance;
              const lastSegmentDiagonal = Math.abs(lastPt.x - secondLastPt.x) > tolerance && 
                                           Math.abs(lastPt.y - secondLastPt.y) > tolerance;
              
              // Check if edge goes INWARD (inverted) instead of OUTWARD
              // For right port, first segment should go right (x increases)
              // For left port, first segment should go left (x decreases)
              // For bottom port, first segment should go down (y increases)
              // For top port, first segment should go up (y decreases)
              let firstSegmentInverted = false;
              if (finalPoints.length > 1) {
                const dx = secondPt.x - firstPt.x;
                const dy = secondPt.y - firstPt.y;
                switch (effectiveSourcePosition) {
                  case Position.Right:
                    firstSegmentInverted = dx < -tolerance; // Should go right, but goes left
                    break;
                  case Position.Left:
                    firstSegmentInverted = dx > tolerance; // Should go left, but goes right
                    break;
                  case Position.Bottom:
                    firstSegmentInverted = dy < -tolerance; // Should go down, but goes up
                    break;
                  case Position.Top:
                    firstSegmentInverted = dy > tolerance; // Should go up, but goes down
                    break;
                }
              }
              
              // Check if last segment is inverted (arrow pointing wrong way)
              // For the arrow to point INTO the node, the last segment direction should be:
              // - RIGHT port: moving LEFT (into node from right), dx < 0
              // - LEFT port: moving RIGHT (into node from left), dx > 0
              // - TOP port: moving DOWN (into node from top), dy > 0
              // - BOTTOM port: moving UP (into node from bottom), dy < 0
              let lastSegmentInverted = false;
              if (finalPoints.length > 1) {
                const dx = lastPt.x - secondLastPt.x;
                const dy = lastPt.y - secondLastPt.y;
                switch (effectiveTargetPosition) {
                  case Position.Right:
                    lastSegmentInverted = dx > tolerance; // Should go LEFT (dx<0), inverted if going RIGHT
                    break;
                  case Position.Left:
                    lastSegmentInverted = dx < -tolerance; // Should go RIGHT (dx>0), inverted if going LEFT
                    break;
                  case Position.Bottom:
                    lastSegmentInverted = dy > tolerance; // Should go UP (dy<0), inverted if going DOWN
                    break;
                  case Position.Top:
                    lastSegmentInverted = dy < -tolerance; // Should go DOWN (dy>0), inverted if going UP
                    break;
                }
              }
              
              if (startAtCenter || endAtCenter) {
                useFallback = true;
                fallbackReason = `center connection (start=${startAtCenter}, end=${endAtCenter})`;
              } else if (anyDiagonalSegment) {
                // Check ALL segments for diagonal (not just first/last)
                useFallback = true;
                fallbackReason = `diagonal segment at index ${diagonalSegmentIndex} (total ${finalPoints.length} points)`;
              } else if (firstSegmentInverted || lastSegmentInverted) {
                useFallback = true;
                fallbackReason = `inverted segment (first=${firstSegmentInverted}, last=${lastSegmentInverted})`;
              }
              
              if (useFallback) {
                // Debug logging removed to prevent infinite rendering
                
                // Compute fallback route
                const fallbackRoute = computeFallbackRoute(srcInfo, tgtInfo, effectiveSourcePosition, effectiveTargetPosition);
                
                // Replace finalPoints with fallback
                finalPoints.length = 0;
                fallbackRoute.forEach(p => finalPoints.push(p));
                
                // Update routesCache and ViewState
                routesCache.set(id, [...fallbackRoute]);
                try {
                  const elkState = (window as any).__elkState;
                  if (elkState?.viewStateRef?.current) {
                    if (!elkState.viewStateRef.current.edge) {
                      elkState.viewStateRef.current.edge = {};
                    }
                    elkState.viewStateRef.current.edge[id] = {
                      ...elkState.viewStateRef.current.edge[id],
                      waypoints: [...fallbackRoute]
                    };
                  }
                } catch (e) { /* ignore */ }
                
                // Debug logging removed to prevent infinite rendering
              }
            }
            
            const nextPath = pointsToPath(finalPoints);
            // OPTIMIZATION 2: Track route to prevent unnecessary updates
            // Only update if route actually changed
            if (!arePointArraysEqual(prevRouteRef.current || [], finalPoints)) {
              setEdgePath((prevPath) => (prevPath === nextPath ? prevPath : nextPath));
              currentPathRef.current = nextPath; // Update ref
              prevRouteRef.current = [...finalPoints]; // Track route
            }
          } else {
            // Invalid finalPoints - persist current path to prevent flickering
            // Debug logging removed to prevent infinite rendering
          }
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
        // FAIL LOUDLY: Log complete error details
        console.error(`[StepEdge:${id}] ❌❌❌ ROUTING EXCEPTION ❌❌❌`);
        console.error(`[StepEdge:${id}] Error:`, error);
        console.error(`[StepEdge:${id}] This is a BUG - libavoid should not throw exceptions`);
        
        if (!cancelled) {
          const message = error instanceof Error ? error.message : String(error);
          setRoutingStatus('error');
          setRoutingMessage(message);
          setComputedBendPoints([]);
          setDebugInfo({
            router: 'libavoid-js',
            error: message,
            fallbackApplied: false, // NOT a fallback - this is an error
            status: 'error',
            message,
          });
          
          // FIX: Try fallback as last resort, otherwise persist current path
          // Don't draw error line - keep current edge visible to prevent flickering
          const srcInfo = shapeMap.get(source);
          const tgtInfo = shapeMap.get(target);
          if (srcInfo && tgtInfo) {
            try {
              const fallbackRoute = computeFallbackRoute(srcInfo, tgtInfo, effectiveSourcePosition, effectiveTargetPosition);
              const fallbackPath = pointsToPath(fallbackRoute);
              setEdgePath((prevPath) => (prevPath === fallbackPath ? prevPath : fallbackPath));
              currentPathRef.current = fallbackPath;
              prevRouteRef.current = [...fallbackRoute];
              // Debug logging removed to prevent infinite rendering
            } catch (fallbackError) {
              // Fallback also failed - persist current path
              // Debug logging removed to prevent infinite rendering
            }
          } else {
            // No shape info - persist current path
            // Debug logging removed to prevent infinite rendering
          }
          
          if (typeof window !== 'undefined') {
            window.__edgeDebug = window.__edgeDebug ?? {};
            window.__edgeDebug[id] = {
              rawPolyline: [],
              snappedPoints: prevRouteRef.current || [],
              fallbackApplied: false,
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
      // Clean up coordinator callback
      if (coordinatorCallbackRef.current) {
        coordinatorCallbackRef.current = null;
      }
    };
  }, [
    id,
    source,
    target,
    sourceX,
    sourceY,
    targetX,
    targetY,
    coordinatorPathPoints, // Re-run when route from coordinator is ready
    edgeData?.obstacleMargin,
    edgeData?.rerouteKey,
    edgeData?.routingMode, // Re-run when mode changes between LOCK/FREE
    edgeData?.elkWaypoints, // Re-run when ELK waypoints change (LOCK mode)
    edgeData?.bendPoints, // Re-run when bendPoints change (ELK output)
    edgeData?.staticObstacleIds, // Re-route when obstacles are first configured
    edgeData?.staticObstacles, // Re-route when obstacle positions change
    obstacleSignature,
    sourcePosition,
    targetPosition,
    optionsVersion,
    libavoidOptions,
    portEdgeSpacing, // Explicitly include to ensure re-routing when spacing changes
    nodeCount, // Re-route when nodes are added/removed (for port spacing)
    edgeCount, // Re-route when edges are added/removed (for port spacing)
    routingUpdateVersion, // Re-run when external routing updates occur (during drag)
  ]);

  // Step 4: Check for routes when batch completes (deferred route application)
  // This is a separate useEffect at component level (not nested)
  useEffect(() => {
    const coordinator = getBatchRoutingCoordinator();
    if (coordinator.isBatchComplete()) {
      const route = coordinator.getRoute(id);
      if (route && route.length > 0 && !coordinatorPathPoints) {
        setCoordinatorPathPoints(route);
      }
    }
  }, [id, coordinatorPathPoints]);

  useEffect(() => {
    if (edgeData && debugInfo) {
      edgeData._elkDebug = debugInfo;
      edgeData.debugInfo = debugInfo; // Also store as debugInfo for browser console access
    }
  }, [edgeData, debugInfo]);

  // Set up console function for comparing edges when they line up
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).compareEdges = function(edgeId1: string, edgeId2: string) {
        console.log(`\n🔍 COMPARING EDGES: ${edgeId1} vs ${edgeId2}`);
        console.log('═'.repeat(80));
        
        const paths = (window as any).__edgeLibavoidPaths;
        if (!paths) {
          console.log('❌ No edge paths stored. Edges may not have routed yet.');
          return;
        }
        
        const edge1 = paths.get(edgeId1);
        const edge2 = paths.get(edgeId2);
        
        if (!edge1 || !edge2) {
          console.log(`❌ One or both edges not found. Available:`, Array.from(paths.keys()));
          return;
        }
        
        console.log(`\n📊 EDGE 1 (${edgeId1}):`);
        console.log(`  Source: ${edge1.source} → Target: ${edge1.target}`);
        console.log(`  Libavoid points: ${edge1.libavoid.length}`);
        console.log(`  Libavoid path:`, edge1.libavoid.map((p: Point) => `(${p.x.toFixed(1)},${p.y.toFixed(1)})`).join(' → '));
        console.log(`  Rendered points: ${edge1.rendered.length}`);
        console.log(`  Rendered path:`, edge1.rendered.map((p: Point) => `(${p.x.toFixed(1)},${p.y.toFixed(1)})`).join(' → '));
        
        console.log(`\n📊 EDGE 2 (${edgeId2}):`);
        console.log(`  Source: ${edge2.source} → Target: ${edge2.target}`);
        console.log(`  Libavoid points: ${edge2.libavoid.length}`);
        console.log(`  Libavoid path:`, edge2.libavoid.map((p: Point) => `(${p.x.toFixed(1)},${p.y.toFixed(1)})`).join(' → '));
        console.log(`  Rendered points: ${edge2.rendered.length}`);
        console.log(`  Rendered path:`, edge2.rendered.map((p: Point) => `(${p.x.toFixed(1)},${p.y.toFixed(1)})`).join(' → '));
        
        // Check if paths are identical or overlapping
        console.log(`\n⚖️  COMPARISON:`);
        
        // Compare libavoid paths
        const libavoidSame = edge1.libavoid.length === edge2.libavoid.length &&
          edge1.libavoid.every((p: Point, i: number) => {
            const p2 = edge2.libavoid[i];
            return p2 && Math.abs(p.x - p2.x) < 0.1 && Math.abs(p.y - p2.y) < 0.1;
          });
        
        // Compare rendered paths
        const renderedSame = edge1.rendered.length === edge2.rendered.length &&
          edge1.rendered.every((p: Point, i: number) => {
            const p2 = edge2.rendered[i];
            return p2 && Math.abs(p.x - p2.x) < 0.1 && Math.abs(p.y - p2.y) < 0.1;
          });
        
        // Check for parallel segments (same Y for horizontal, same X for vertical)
        const parallelSegments: Array<{edge: string, seg: number, type: string, coord: number}> = [];
        edge1.rendered.forEach((p: Point, i: number) => {
          if (i < edge1.rendered.length - 1) {
            const next = edge1.rendered[i + 1];
            const isHorizontal = Math.abs(p.y - next.y) < 0.1;
            const isVertical = Math.abs(p.x - next.x) < 0.1;
            if (isHorizontal) parallelSegments.push({edge: edgeId1, seg: i, type: 'H', coord: p.y});
            if (isVertical) parallelSegments.push({edge: edgeId1, seg: i, type: 'V', coord: p.x});
          }
        });
        edge2.rendered.forEach((p: Point, i: number) => {
          if (i < edge2.rendered.length - 1) {
            const next = edge2.rendered[i + 1];
            const isHorizontal = Math.abs(p.y - next.y) < 0.1;
            const isVertical = Math.abs(p.x - next.x) < 0.1;
            if (isHorizontal) parallelSegments.push({edge: edgeId2, seg: i, type: 'H', coord: p.y});
            if (isVertical) parallelSegments.push({edge: edgeId2, seg: i, type: 'V', coord: p.x});
          }
        });
        
        // Find overlapping parallel segments
        const overlapping: Array<{type: string, coord: number, edges: string[]}> = [];
        parallelSegments.forEach(seg1 => {
          parallelSegments.forEach(seg2 => {
            if (seg1.edge !== seg2.edge && seg1.type === seg2.type && Math.abs(seg1.coord - seg2.coord) < 0.1) {
              const existing = overlapping.find(o => o.type === seg1.type && Math.abs(o.coord - seg1.coord) < 0.1);
              if (existing) {
                if (!existing.edges.includes(seg1.edge)) existing.edges.push(seg1.edge);
                if (!existing.edges.includes(seg2.edge)) existing.edges.push(seg2.edge);
              } else {
                overlapping.push({type: seg1.type, coord: seg1.coord, edges: [seg1.edge, seg2.edge]});
              }
            }
          });
        });
        
        if (libavoidSame) {
          console.log(`  🔥 ROUTING PROBLEM: Libavoid returned IDENTICAL paths for both edges!`);
        } else {
          console.log(`  ✅ Libavoid paths are different`);
        }
        
        if (renderedSame) {
          console.log(`  🔥 RENDERING PROBLEM: Rendered paths are IDENTICAL (but libavoid was different)`);
        } else {
          console.log(`  ✅ Rendered paths are different`);
        }
        
        if (overlapping.length > 0) {
          console.log(`  ⚠️  PARALLEL OVERLAP DETECTED: ${overlapping.length} segment(s) at same coordinates:`);
          overlapping.forEach(overlap => {
            console.log(`    ${overlap.type} segment at ${overlap.coord.toFixed(1)}: edges ${overlap.edges.join(', ')}`);
          });
          console.log(`  💡 This is a ROUTING problem - libavoid should space these apart`);
        } else if (!libavoidSame && !renderedSame) {
          console.log(`  ✅ No overlapping segments detected`);
        }
        
        console.log('\n' + '═'.repeat(80));
        
        return {
          libavoidSame,
          renderedSame,
          overlapping,
          edge1,
          edge2
        };
      };
      
      (window as any).listAllEdgePaths = function() {
        const paths = (window as any).__edgeLibavoidPaths;
        if (!paths) {
          console.log('No edge paths stored');
          return;
        }
        console.log(`\n📋 ALL STORED EDGE PATHS (${paths.size} edges):`);
        paths.forEach((data: any, id: string) => {
          console.log(`  ${id}: ${data.source} → ${data.target} (${data.libavoid.length} libavoid points, ${data.rendered.length} rendered points)`);
        });
      };
      
      (window as any).__edgeSanity = function(edgeId: string) {
        const diagnostics = (window as any).__edgeDiagnostics;
        if (!diagnostics) {
          console.log('❌ No edge diagnostics available. Edges may not have routed yet.');
          return null;
        }
        
        const diag = diagnostics.get(edgeId);
        if (!diag) {
          console.log(`❌ Edge ${edgeId} not found in diagnostics. Available:`, Array.from(diagnostics.keys()));
          return null;
        }
        
        console.log(`\n🔍 EDGE SANITY CHECK: ${edgeId}`);
        console.log('═'.repeat(80));
        console.log(`Source: ${diag.source} @ (${diag.srcNodeRect.x},${diag.srcNodeRect.y}) ${diag.srcNodeRect.width}x${diag.srcNodeRect.height}`);
        console.log(`Target: ${diag.target} @ (${diag.tgtNodeRect.x},${diag.tgtNodeRect.y}) ${diag.tgtNodeRect.width}x${diag.tgtNodeRect.height}`);
        console.log(`Effective positions: src=${diag.effectiveSourcePosition}, tgt=${diag.effectiveTargetPosition}`);
        console.log(`\n📍 PINS:`);
        console.log(`  Source pin: (${diag.srcPin.x.toFixed(1)},${diag.srcPin.y.toFixed(1)}) [${diag.srcPinOnBoundary ? '✅ ON BOUNDARY' : '❌ NOT ON BOUNDARY'}]`);
        console.log(`  Target pin: (${diag.tgtPin.x.toFixed(1)},${diag.tgtPin.y.toFixed(1)})`);
        console.log(`\n🛤️  ROUTE (${diag.routePoints.length} points):`);
        diag.routePoints.forEach((p: Point, i: number) => {
          console.log(`  [${i}] (${p.x.toFixed(1)},${p.y.toFixed(1)})`);
        });
        console.log(`\n✅ CHECKS:`);
        console.log(`  Source pin on boundary: ${diag.srcPinOnBoundary ? '✅ YES' : '❌ NO'}`);
        console.log(`  First point matches pin: ${diag.srcPinMatches ? '✅ YES' : '❌ NO'}`);
        console.log(`  First segment exits source: ${diag.firstSegmentExits ? '✅ YES' : '❌ NO'}`);
        if (diag.issues.length > 0) {
          console.log(`\n⚠️  ISSUES DETECTED:`);
          diag.issues.forEach((issue: string) => console.log(`  - ${issue}`));
    } else {
          console.log(`\n✅ All checks passed!`);
        }
        console.log('═'.repeat(80));
        
        return diag;
      };
      
      // Enable diagnostics for all edges (can be toggled)
      (window as any).__enableEdgeDiagnostics = true;
    }
  }, []);

  const edgeLabel = edgeData?.label;
  const baseEdgeStyle = {
    ...getEdgeStyle(selected, false),
    ...style,
    // z-index is handled by CSS in base.css, not inline styles
    // ReactFlow applies z-index to the container element, not the path
  };
  const midX = (sourceX + targetX) / 2;
  const midY = (sourceY + targetY) / 2;
  
  // Render path: Use edgePath directly - no modifications
  // LOCK mode uses ELK coordinates, FREE mode uses libavoid
  // Both should produce valid orthogonal paths - if not, fix the source, don't apply fallbacks
  const renderPath = edgePath;
  
  // Force z-index on edge container element after ReactFlow renders
  // Use requestAnimationFrame to ensure this runs after ReactFlow's render cycle
  React.useEffect(() => {
    const setZIndex = () => {
      const edgeElement = document.querySelector(`.react-flow__edge[data-id="${id}"]`) as HTMLElement;
      if (edgeElement) {
        const zIndexValue = String(getEdgeZIndex(selected));
        edgeElement.style.setProperty('z-index', zIndexValue, 'important');
        // Also set on path and svg children
        const path = edgeElement.querySelector('path') as HTMLElement;
        const svg = edgeElement.querySelector('svg') as HTMLElement;
        if (path) path.style.setProperty('z-index', zIndexValue, 'important');
        if (svg) svg.style.setProperty('z-index', zIndexValue, 'important');
      }
    };
    
    // Run immediately
    setZIndex();
    
    // Also run after ReactFlow's render cycle completes
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setZIndex();
      });
    });
    
    // Set up observer to watch for ReactFlow updates
    const observer = new MutationObserver(() => {
      setZIndex();
    });
    
    const edgeElement = document.querySelector(`.react-flow__edge[data-id="${id}"]`);
    if (edgeElement) {
      observer.observe(edgeElement, { attributes: true, attributeFilter: ['style'] });
    }
    
    return () => {
      observer.disconnect();
    };
  }, [id, selected]);
  
  return (
    <>
      <BaseEdge
        id={id}
        path={renderPath}
        style={baseEdgeStyle}
        markerEnd={markerEnd}
      />
      
      {edgeLabel && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${midX}px, ${midY}px)`,
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