/**
 * LibavoidRoutingService
 * 
 * Centralized service for managing libavoid edge routing using the Joint.js pattern.
 * 
 * Key principles (from Joint.js analysis):
 * - Single router instance shared across all edges (NEVER reset)
 * - Obstacles updated via moveShape() (not recreated)
 * - ConnRefs created with CALLBACKS (this is how "reroute ALL edges" works!)
 * - Callbacks write waypoints to ViewState for rendering
 * - processTransaction() triggers callbacks for ALL affected edges
 * 
 * Flow:
 * 1. Node moves → service.updateObstacle(nodeId, rect)
 * 2. service.processTransaction() called
 * 3. Libavoid routes ALL affected connectors internally
 * 4. Callbacks fire for EACH affected connector
 * 5. Each callback writes waypoints to ViewState
 * 6. StepEdge reads waypoints from ViewState and renders
 */

import { AvoidLib } from 'libavoid-js';
import type { LibavoidOptions } from '../../contexts/ViewModeContext';
import type { ViewState } from '../viewstate/ViewState';
import { Position } from 'reactflow';
import {
  Point,
  NodeRect,
  DEFAULT_NODE_WIDTH,
  DEFAULT_NODE_HEIGHT,
  DEFAULT_OBSTACLE_MARGIN,
  safeNumber,
  positionToFlag,
  calculatePinOffset,
  extractWaypointsFromRoute,
  createFallbackRoute,
  configureRouter
} from './libavoidHelpers';

interface ConnectionInfo {
  edgeId: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  sourcePosition: Position;
  targetPosition: Position;
  sourcePoint: Point;
  targetPoint: Point;
  srcEdgeOffset: number;
  tgtEdgeOffset: number;
  connRef: any;
}

interface ShapeInfo {
  shape: any;
  origin: { x: number; y: number };
  width: number;
  height: number;
}

const isClient = typeof window !== 'undefined';
let avoidInstancePromise: Promise<any> | null = null;

const ensureAvoidInstance = async () => {
  if (!isClient) {
    throw new Error('libavoid is only available in the browser environment');
  }

  if (!avoidInstancePromise) {
    avoidInstancePromise = (async () => {
      const globalInstance = (window as any).libavoid ?? (window as any).Avoid;
      if (globalInstance) {
        return globalInstance;
      }

      await AvoidLib.load('/libavoid.wasm');
      return AvoidLib.getInstance();
    })().catch((error) => {
      avoidInstancePromise = null;
      throw error;
    });
  }

  return avoidInstancePromise;
};

export class LibavoidRoutingService {
  private router: any = null;
  private avoidModule: any = null;
  private shapeRefs: Map<string, any> = new Map();
  private shapeInfoMap: Map<string, ShapeInfo> = new Map();
  private connections: Map<string, ConnectionInfo> = new Map();
  private routesCache: Map<string, Point[]> = new Map();
  private nodePositionCache: Map<string, { x: number; y: number }> = new Map();
  private pinIdMap: Map<string, number> = new Map();
  private pinObjectMap: Map<number, any> = new Map();
  private nextPinId: number = 1;
  private viewStateRef: React.MutableRefObject<ViewState> | null = null;
  private libavoidOptions: LibavoidOptions | null = null;
  private spacing: number = DEFAULT_OBSTACLE_MARGIN;
  private onRouteChangeCallback: ((edgeId: string, waypoints: Point[]) => void) | null = null;

  /**
   * Initialize the service with router options
   */
  async initialize(
    options: LibavoidOptions,
    viewStateRef: React.MutableRefObject<ViewState>
  ): Promise<void> {
    this.libavoidOptions = options;
    this.viewStateRef = viewStateRef;
    this.spacing = safeNumber(options.shapeBufferDistance, DEFAULT_OBSTACLE_MARGIN);

    // Load libavoid module
    this.avoidModule = await ensureAvoidInstance();

    // Create router (ONCE - never recreate)
    this.router = new this.avoidModule.Router(this.avoidModule.OrthogonalRouting);

    // Configure router with optimal settings
    configureRouter(this.router, this.avoidModule, {
      shapeBufferDistance: this.spacing,
      idealNudgingDistance: options.idealNudgingDistance,
      segmentPenalty: options.segmentPenalty,
      crossingPenalty: options.crossingPenalty,
      sharedPathPenalty: options.sharedPathPenalty
    });

    // Expose on window for backward compatibility
    if (typeof window !== 'undefined') {
      (window as any).__libavoidSharedRouter = this.router;
      (window as any).__libavoidModule = this.avoidModule;
    }
  }

  /**
   * Initialize synchronously with existing router (for migration)
   */
  initializeWithRouter(
    router: any,
    avoidModule: any,
    options: LibavoidOptions | undefined,
    viewStateRef: React.MutableRefObject<ViewState> | undefined,
    spacing: number
  ): void {
    if (this.router && this.router === router) {
      return; // Same router
    }
    
    this.router = router;
    this.avoidModule = avoidModule;
    this.libavoidOptions = options ?? null;
    this.viewStateRef = viewStateRef ?? null;
    this.spacing = spacing;
    
    // Share shapeRefs with router for backward compatibility
    if ((router as any).__shapeRefs) {
      this.shapeRefs = (router as any).__shapeRefs;
    } else {
      (router as any).__shapeRefs = this.shapeRefs;
    }
    
    if (typeof window !== 'undefined') {
      (window as any).__libavoidSharedRouter = this.router;
      (window as any).__libavoidModule = this.avoidModule;
    }
  }

  isInitialized(): boolean {
    return this.router !== null && this.avoidModule !== null;
  }

  /**
   * Set callback for route changes (called by StepEdge or canvas)
   */
  setOnRouteChange(callback: (edgeId: string, waypoints: Point[]) => void): void {
    this.onRouteChangeCallback = callback;
  }

  /**
   * Register or update an obstacle (node)
   * Uses moveShape() for existing obstacles (Joint.js pattern)
   */
  updateObstacle(node: NodeRect): boolean {
    if (!this.router || !this.avoidModule) {
      return false;
    }

    const width = safeNumber(node.width, DEFAULT_NODE_WIDTH);
    const height = safeNumber(node.height, DEFAULT_NODE_HEIGHT);

    const cachedPos = this.nodePositionCache.get(node.id);
    const positionChanged = !cachedPos || cachedPos.x !== node.x || cachedPos.y !== node.y;
    this.nodePositionCache.set(node.id, { x: node.x, y: node.y });

    const existingShape = this.shapeRefs.get(node.id);

    if (existingShape) {
      // Joint.js pattern: Use moveShape() for existing obstacles
      if (positionChanged) {
        try {
          const topLeft = new this.avoidModule.Point(node.x, node.y);
          const bottomRight = new this.avoidModule.Point(node.x + width, node.y + height);
          const newRectangle = new this.avoidModule.Rectangle(topLeft, bottomRight);
          this.router.moveShape(existingShape, newRectangle);
          
          this.shapeInfoMap.set(node.id, {
            shape: existingShape,
            origin: { x: node.x, y: node.y },
            width,
            height
          });
        } catch (e) {
          // Ignore errors
        }
      }
    } else {
      // Create new shape
      const topLeft = new this.avoidModule.Point(node.x, node.y);
      const bottomRight = new this.avoidModule.Point(node.x + width, node.y + height);
      const rectangle = new this.avoidModule.Rectangle(topLeft, bottomRight);
      const shape = new this.avoidModule.ShapeRef(this.router, rectangle);
      this.shapeRefs.set(node.id, shape);
      
      this.shapeInfoMap.set(node.id, {
        shape,
        origin: { x: node.x, y: node.y },
        width,
        height
      });
      
      // NOTE: NO center pin created here - boundary pins are created in StepEdge.tsx
      // with direction constraints for perpendicular edge routing
    }
    
    return positionChanged;
  }

  /**
   * Batch update multiple obstacles
   */
  batchUpdateObstacles(nodes: NodeRect[]): Map<string, { oldX: number; oldY: number; width: number; height: number }> {
    const movedObstacles = new Map<string, { oldX: number; oldY: number; width: number; height: number }>();
    
    for (const node of nodes) {
      const cachedPos = this.nodePositionCache.get(node.id);
      if (cachedPos && (cachedPos.x !== node.x || cachedPos.y !== node.y)) {
        movedObstacles.set(node.id, {
          oldX: cachedPos.x,
          oldY: cachedPos.y,
          width: node.width ?? DEFAULT_NODE_WIDTH,
          height: node.height ?? DEFAULT_NODE_HEIGHT
        });
      }
      this.updateObstacle(node);
    }
    
    return movedObstacles;
  }

  /**
   * Add edge with callback (Joint.js pattern)
   * The callback is THE mechanism for "reroute ALL edges"!
   */
  addEdge(
    edgeId: string,
    source: string,
    target: string,
    sourcePosition: Position,
    targetPosition: Position,
    sourcePoint: Point,
    targetPoint: Point,
    srcEdgeOffset: number = 0,
    tgtEdgeOffset: number = 0,
    sourceHandle?: string,
    targetHandle?: string
  ): void {
    if (!this.router || !this.avoidModule) {
      return;
    }

    // Check if edge already exists
    const existingConn = this.connections.get(edgeId);
    let connRef: any;
    
    if (existingConn) {
      // Reuse existing ConnRef (Joint.js pattern)
      connRef = existingConn.connRef;
    } else {
      // Create NEW ConnRef with CALLBACK
      connRef = new this.avoidModule.ConnRef(this.router);
      
      // Set routing type
      if (typeof this.avoidModule.ConnType_Orthogonal === 'number') {
        connRef.setRoutingType?.(this.avoidModule.ConnType_Orthogonal);
      }
      
      // THE KEY: Set callback for route changes
      // This is how Joint.js achieves "reroute ALL edges"!
      connRef.setCallback(() => {
        this.onConnRefRouteChange(edgeId);
      }, connRef);
    }
    
    // Create ConnEnds
    const srcEnd = this.createConnEnd(source, sourcePoint, sourcePosition, srcEdgeOffset);
    const dstEnd = this.createConnEnd(target, targetPoint, targetPosition, tgtEdgeOffset);
    
    // Update endpoints
    connRef.setSourceEndpoint?.(srcEnd);
    connRef.setDestEndpoint?.(dstEnd);
    
    // Store connection info
    this.connections.set(edgeId, {
      edgeId,
      source,
      target,
      sourceHandle,
      targetHandle,
      sourcePosition,
      targetPosition,
      sourcePoint,
      targetPoint,
      srcEdgeOffset,
      tgtEdgeOffset,
      connRef
    });
  }

  /**
   * Remove edge
   */
  removeEdge(edgeId: string): void {
    const conn = this.connections.get(edgeId);
    if (conn && this.router) {
      try {
        this.router.deleteConnector?.(conn.connRef);
      } catch (e) {
        // Ignore
      }
    }
    this.connections.delete(edgeId);
    this.routesCache.delete(edgeId);
  }

  /**
   * Process transaction - triggers callbacks for ALL affected edges
   * This is THE method that makes "reroute ALL edges" work!
   */
  processTransaction(): void {
    if (!this.router) {
      return;
    }
    
    try {
      this.router.processTransaction?.();
      // Callbacks fire automatically for affected edges!
    } catch (e) {
      // Router may be aborted, ignore
    }
  }

  /**
   * Callback when a ConnRef's route changes
   * Writes waypoints to ViewState
   */
  private onConnRefRouteChange(edgeId: string): void {
    const conn = this.connections.get(edgeId);
    if (!conn) return;
    
    try {
      const route = conn.connRef.displayRoute?.();
      let waypoints = extractWaypointsFromRoute(route);
      
      // Use fallback if route is invalid
      if (waypoints.length < 2) {
        waypoints = createFallbackRoute(
          conn.sourcePoint,
          conn.targetPoint,
          conn.sourcePosition
        );
      }
      
      // Cache the route
      this.routesCache.set(edgeId, waypoints);
      
      // Write to ViewState
      if (this.viewStateRef?.current) {
        if (!this.viewStateRef.current.edge) {
          this.viewStateRef.current.edge = {};
        }
        this.viewStateRef.current.edge[edgeId] = {
          ...this.viewStateRef.current.edge[edgeId],
          waypoints
        };
      }
      
      // Notify external callback
      if (this.onRouteChangeCallback) {
        this.onRouteChangeCallback(edgeId, waypoints);
      }
    } catch (e) {
      // Ignore errors
    }
  }

  /**
   * Create ConnEnd for a node
   */
  private createConnEnd(
    nodeId: string,
    point: Point,
    position: Position,
    edgeOffset: number
  ): any {
    const shapeInfo = this.shapeInfoMap.get(nodeId);
    
    if (!shapeInfo) {
      // No shape - use point-based connection
      return new this.avoidModule.ConnEnd(
        new this.avoidModule.Point(point.x, point.y)
      );
    }

    const { shape, width, height } = shapeInfo;
    const portEdgeSpacing = this.libavoidOptions?.portEdgeSpacing ?? 8;
    
    // Calculate pin offset
    const { offsetX, offsetY } = calculatePinOffset(
      position,
      edgeOffset,
      portEdgeSpacing,
      width,
      height
    );
    
    // Get direction flag
    const direction = positionToFlag(this.avoidModule, position);
    
    // Create or get pin
    const pinKey = `${nodeId}:${offsetX.toFixed(4)}:${offsetY.toFixed(4)}:${edgeOffset}:${portEdgeSpacing}`;
    let pinId = this.pinIdMap.get(pinKey);
    
    if (!pinId) {
      pinId = this.nextPinId++;
      this.pinIdMap.set(pinKey, pinId);
      
      const pinObj = new this.avoidModule.ShapeConnectionPin(
        shape,
        pinId,
        offsetX,
        offsetY,
        true,
        0,
        direction
      );
      pinObj.setExclusive?.(false);
      this.pinObjectMap.set(pinId, pinObj);
    }
    
    return new this.avoidModule.ConnEnd(shape, pinId);
  }

  /**
   * Get cached route for an edge
   */
  getRoute(edgeId: string): Point[] | undefined {
    return this.routesCache.get(edgeId);
  }

  /**
   * Get router instance
   */
  getRouter(): any {
    if (!this.router) {
      throw new Error('Service not initialized');
    }
    return this.router;
  }

  /**
   * Get avoid module
   */
  getAvoidModule(): any {
    if (!this.avoidModule) {
      throw new Error('Service not initialized');
    }
    return this.avoidModule;
  }

  /**
   * Get all connection IDs
   */
  getConnectionIds(): string[] {
    return Array.from(this.connections.keys());
  }

  /**
   * Check if edge is registered
   */
  hasEdge(edgeId: string): boolean {
    return this.connections.has(edgeId);
  }
}

// Singleton instance
let serviceInstance: LibavoidRoutingService | null = null;

export function getLibavoidRoutingService(): LibavoidRoutingService {
  if (!serviceInstance) {
    serviceInstance = new LibavoidRoutingService();
  }
  return serviceInstance;
}

// For testing - reset the singleton
export function resetLibavoidRoutingService(): void {
  serviceInstance = null;
}
