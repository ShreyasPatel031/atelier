/**
 * Scoped layout runner (ELK orchestration)
 * Part of Agent C - Wave 1
 * 
 * Implements:
 * - Extract subtree for scopeId from Domain
 * - Run ELK on subtree only (not whole graph)
 * - Anchor scope top-left to prevent jumping
 * - Write computed geometry to ViewStateDelta
 */

import ELK from "elkjs/lib/elk.bundled.js";
import type { ViewStateDelta } from './types';
import type { LayoutOptions } from './types';
import type { ViewState } from '../viewstate/ViewState';
import type { RawGraph } from '../../components/graph/types/index';
import type { ElkGraphNode } from '../../types/graph';
import { ensureIds } from '../../components/graph/utils/elk/ids';
import { NON_ROOT_DEFAULT_OPTIONS, GROUP_FRAME_PADDING, GRID_SIZE } from '../../components/graph/utils/elk/elkOptions';
import { scaleElkOutput } from '../../components/graph/utils/elk/scaleElkOutput';
import { findNodeById } from '../../components/graph/utils/find';
import { CoordinateService } from '../viewstate/CoordinateService';

const elk = new ELK();

/**
 * Extracts a subtree from the domain graph starting at scopeId.
 * Returns a deep copy of the subtree suitable for ELK layout.
 */
function extractSubtree(graph: RawGraph, scopeId: string): ElkGraphNode | null {
  // Find the scope node in the graph
  const scopeNode = findNodeById(graph, scopeId);
  if (!scopeNode) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(`[ScopedLayoutRunner] Scope node "${scopeId}" not found in graph`);
    }
    return null;
  }

  // Deep clone the subtree
  return JSON.parse(JSON.stringify(scopeNode));
}

/**
 * Computes the bounding box top-left for a scope from ViewState.
 * Returns the minimum x and y coordinates of all nodes/groups in the scope.
 */
function computeScopeBboxTopLeft(
  scopeId: string,
  subtree: ElkGraphNode,
  viewState: ViewState
): { x: number; y: number } | null {
  // Collect all IDs in the subtree (including scope itself)
  const ids = new Set<string>([scopeId]);
  
  function collectIds(node: ElkGraphNode): void {
    if (node.children) {
      node.children.forEach(child => {
        ids.add(child.id);
        collectIds(child);
      });
    }
  }
  
  collectIds(subtree);

  // Find minimum x and y from ViewState
  let minX = Infinity;
  let minY = Infinity;
  let foundAny = false;

  for (const id of ids) {
    const nodeGeom = viewState.node?.[id];
    const groupGeom = viewState.group?.[id];
    const geom = nodeGeom || groupGeom;

    if (geom && Number.isFinite(geom.x) && Number.isFinite(geom.y)) {
      minX = Math.min(minX, geom.x);
      minY = Math.min(minY, geom.y);
      foundAny = true;
    }
  }

  if (!foundAny) {
    // No existing geometry - return null (will use ELK's natural position)
    return null;
  }

  return { x: minX, y: minY };
}

/**
 * Translates all positions in the ELK layout output to preserve the anchor point.
 */
function translateLayout(
  layout: ElkGraphNode,
  anchorTopLeft: { x: number; y: number },
  elkTopLeft: { x: number; y: number }
): void {
  const dx = anchorTopLeft.x - elkTopLeft.x;
  const dy = anchorTopLeft.y - elkTopLeft.y;

  function translateNode(node: ElkGraphNode): void {
    if (Number.isFinite(node.x) && Number.isFinite(node.y)) {
      node.x = (node.x || 0) + dx;
      node.y = (node.y || 0) + dy;
    }

    if (node.children) {
      node.children.forEach(translateNode);
    }
  }

  translateNode(layout);
}

/**
 * Auto-fits a group frame to its children by computing bounding box.
 * Uses ViewState dimensions for nested groups instead of defaults.
 */
function autoFitGroupFrame(
  groupNode: ElkGraphNode,
  layout: ElkGraphNode,
  viewState: ViewState
): { w: number; h: number } {
  if (!groupNode.children || groupNode.children.length === 0) {
    // No children - try to use existing ViewState size, otherwise default
    const existingGeom = viewState.group?.[groupNode.id];
    if (existingGeom?.w && existingGeom?.h) {
      return { w: existingGeom.w, h: existingGeom.h };
    }
    return {
      w: NON_ROOT_DEFAULT_OPTIONS.width * 3,
      h: 96 * 3
    };
  }

  // Find the group in the layout
  const layoutGroup = findNodeById(layout, groupNode.id);
  if (!layoutGroup) {
    // Try to use existing ViewState size
    const existingGeom = viewState.group?.[groupNode.id];
    if (existingGeom?.w && existingGeom?.h) {
      return { w: existingGeom.w, h: existingGeom.h };
    }
    return {
      w: NON_ROOT_DEFAULT_OPTIONS.width * 3,
      h: 96 * 3
    };
  }

  // Compute bounding box of children
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  function computeBbox(node: ElkGraphNode): void {
    if (node.id === groupNode.id) {
      // Skip the group itself, process children
      if (node.children) {
        node.children.forEach(computeBbox);
      }
      return;
    }

    const x = node.x || 0;
    const y = node.y || 0;
    
    // Check if this is a nested group and use ViewState dimensions if available
    const isNestedGroup = !!(node.children && node.children.length > 0);
    let w: number;
    let h: number;
    
    if (isNestedGroup) {
      // For nested groups, use ViewState dimensions if available
      const groupGeom = viewState.group?.[node.id];
      if (groupGeom?.w && groupGeom?.h) {
        w = groupGeom.w;
        h = groupGeom.h;
      } else {
        // Fallback to ELK output or default
        w = node.width || NON_ROOT_DEFAULT_OPTIONS.width * 3;
        h = node.height || 96 * 3;
      }
    } else {
      // Regular nodes: use ViewState or ELK output or default
      const nodeGeom = viewState.node?.[node.id];
      if (nodeGeom?.w && nodeGeom?.h) {
        w = nodeGeom.w;
        h = nodeGeom.h;
      } else {
        w = node.width || NON_ROOT_DEFAULT_OPTIONS.width;
        h = node.height || 96;
      }
    }

    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x + w);
    maxY = Math.max(maxY, y + h);
  }

  computeBbox(layoutGroup);

  if (!Number.isFinite(minX)) {
    // No valid children - try to use existing ViewState size
    const existingGeom = viewState.group?.[groupNode.id];
    if (existingGeom?.w && existingGeom?.h) {
      return { w: existingGeom.w, h: existingGeom.h };
    }
    return {
      w: NON_ROOT_DEFAULT_OPTIONS.width * 3,
      h: 96 * 3
    };
  }

  // Add padding using centralized constant
  return {
    w: Math.max(maxX - minX + GROUP_FRAME_PADDING * 2, NON_ROOT_DEFAULT_OPTIONS.width * 3),
    h: Math.max(maxY - minY + GROUP_FRAME_PADDING * 2, 96 * 3)
  };
}

/**
 * Extracts geometry from ELK layout output and converts to ViewStateDelta format.
 * Uses ViewState dimensions when available for nested groups.
 */
function extractGeometryFromLayout(
  layout: ElkGraphNode,
  scopeId: string,
  viewState: ViewState,
  originalChildPositions?: Map<string, { x: number; y: number }>,
  paddingOffset?: { top: number; left: number },
  elkCalculatedWidth?: number,
  elkCalculatedHeight?: number
): ViewStateDelta {
  const delta: ViewStateDelta = {
    node: {},
    group: {},
    edge: {}
  };

  // CRITICAL: Get scope group's absolute position from ViewState
  // ELK returns relative positions, we need to convert to absolute
  const scopeGroupGeom = viewState.group?.[scopeId];
  const scopeAbsolutePos = scopeGroupGeom 
    ? { x: scopeGroupGeom.x, y: scopeGroupGeom.y }
    : { x: 0, y: 0 }; // Fallback to origin if scope not found

  // CRITICAL: ELK positions children relative to the CONTENT AREA (after padding), not top-left
  // Padding offset: [top=4.0,left=2.0] = (64px top, 32px left) in pixels
  // We must add this offset to convert from content-relative to top-left-relative
  const padding = paddingOffset || { top: 0, left: 0 };

  // ELK returned layout dimensions (from before we overwrote them)
  // We'll calculate scale to fit children in original group
  const originalGroupWidth = viewState.group?.[scopeId]?.w || 300;
  const originalGroupHeight = viewState.group?.[scopeId]?.h || 250;
  const elkWidth = elkCalculatedWidth || layout.width || 300;
  const elkHeight = elkCalculatedHeight || layout.height || 250;
  
  // Find minimum x/y across all ELK positions to understand the layout offset
  let minElkX = Infinity, minElkY = Infinity;
  if (originalChildPositions) {
    originalChildPositions.forEach((pos) => {
      minElkX = Math.min(minElkX, pos.x);
      minElkY = Math.min(minElkY, pos.y);
    });
  }
  if (minElkX === Infinity) minElkX = 0;
  if (minElkY === Infinity) minElkY = 0;
  
  // Calculate the ELK layout's content bounding box (subtract min offset)
  // This tells us how much space the actual layout uses
  let maxElkX = 0, maxElkY = 0;
  if (originalChildPositions) {
    originalChildPositions.forEach((pos, id) => {
      // Get node size (assume 96 if not available)
      const nodeGeom = viewState.node?.[id];
      const nodeWidth = nodeGeom?.w || 96;
      const nodeHeight = nodeGeom?.h || 96;
      maxElkX = Math.max(maxElkX, pos.x + nodeWidth);
      maxElkY = Math.max(maxElkY, pos.y + nodeHeight);
    });
  }
  const elkContentWidth = maxElkX - minElkX;
  const elkContentHeight = maxElkY - minElkY;
  
  // NO SCALING - use actual ELK coordinates directly
  // Just normalize by subtracting minElk offset and add padding
  const PADDING = 32; // 32px padding (2 units) inside group
  
  console.log(`[🔍 ELK-DEBUG] ELK layout size: ${elkWidth}x${elkHeight}, Content bbox: ${elkContentWidth}x${elkContentHeight}`);
  console.log(`[🔍 ELK-DEBUG] ELK min offset (will subtract): (${minElkX}, ${minElkY}), Padding (will add): ${PADDING}px`);
  
  function extractFromNode(node: ElkGraphNode, isGroup: boolean, parentElkPos: { x: number; y: number } = { x: 0, y: 0 }, isDirectChildOfScope: boolean = false): void {
    const id = node.id;
    // CRITICAL: Use ORIGINAL ELK relative positions (before translation)
    const originalPos = originalChildPositions?.get(id);
    const elkRelativePos = originalPos || { x: node.x || 0, y: node.y || 0 };
    
    // For scope's direct children, we need the scope's absolute position
    const parentAbsolute = parentElkPos.x === 0 && parentElkPos.y === 0 
      ? scopeAbsolutePos 
      : parentElkPos;
    
    // SIMPLE COORDINATE TRANSFORM (no scaling):
    // 1. Subtract ELK's min offset to normalize positions to start at (0,0)
    // 2. Add padding to position within group content area  
    // 3. Add group absolute position
    const normalizedPos = {
      x: elkRelativePos.x - minElkX,
      y: elkRelativePos.y - minElkY
    };
    const absolutePos = {
      x: parentAbsolute.x + PADDING + normalizedPos.x,
      y: parentAbsolute.y + PADDING + normalizedPos.y
    };
    
    // Debug logging for node positions
    if (!isGroup) {
      console.log(`[🔍 ELK-DEBUG] Converting node ${id}:`);
      console.log(`[🔍 ELK-DEBUG]   ELK relative = (${elkRelativePos.x}, ${elkRelativePos.y})`);
      console.log(`[🔍 ELK-DEBUG]   - minOffset (${minElkX}, ${minElkY}) = (${normalizedPos.x}, ${normalizedPos.y})`);
      console.log(`[🔍 ELK-DEBUG]   + padding ${PADDING} + group (${parentAbsolute.x}, ${parentAbsolute.y}) = (${absolutePos.x}, ${absolutePos.y})`);
    }
    
    // Nested group conversion (removed excessive logging)
    
    // Use ViewState dimensions if available, especially for nested groups
    let w: number;
    let h: number;
    
    if (isGroup) {
      const groupGeom = viewState.group?.[id];
      if (groupGeom?.w && groupGeom?.h) {
        w = groupGeom.w;
        h = groupGeom.h;
      } else {
        w = node.width || NON_ROOT_DEFAULT_OPTIONS.width * 3;
        h = node.height || 96 * 3;
      }
    } else {
      const nodeGeom = viewState.node?.[id];
      if (nodeGeom?.w && nodeGeom?.h) {
        w = nodeGeom.w;
        h = nodeGeom.h;
      } else {
        w = node.width || NON_ROOT_DEFAULT_OPTIONS.width;
        h = node.height || 96;
      }
    }

    if (isGroup) {
      if (!delta.group) delta.group = {};
      // CRITICAL: For the scope group itself, preserve original size AND position from ViewState
      if (id === scopeId && viewState.group?.[id]) {
        // Scope group: preserve COMPLETE original geometry from ViewState (no changes!)
        // The scope group should NOT move or resize when toggling lock mode
        const originalGeom = viewState.group[id];
        delta.group[id] = { 
          x: originalGeom.x,  // Preserve original position
          y: originalGeom.y,  // Preserve original position
          w: originalGeom.w,  // Preserve original width
          h: originalGeom.h   // Preserve original height
        };
        console.log(`[🔍 ELK-DEBUG] Scope group ${id}: PRESERVING original geometry from ViewState:`, originalGeom);
      } else {
        // Nested groups: use calculated size and position
        delta.group[id] = { x: absolutePos.x, y: absolutePos.y, w, h };
      }
    } else {
      if (!delta.node) delta.node = {};
      delta.node[id] = { x: absolutePos.x, y: absolutePos.y, w, h };
    }

    // Process children recursively - pass this node's absolute position as parent
    // Nested children are NOT direct children of scope, so no padding adjustment
    if (node.children) {
      node.children.forEach(child => {
        const childIsGroup = !!(child.children && child.children.length > 0);
        extractFromNode(child, childIsGroup, absolutePos, false); // Nested: not direct child of scope
      });
    }

    // Extract edge waypoints if available
    // CRITICAL: ELK edge sections are in RELATIVE coordinates (relative to the container/parent)
    // We must convert them to ABSOLUTE coordinates by adding the parent's absolute position
    // This matches how edgePoints.ts does it: `const endPointX = ox + sec.endPoint.x`
    if (node.edges) {
      if (!delta.edge) delta.edge = {};
      // Get the absolute position of this container for coordinate conversion
      // For scope root children, use scopeAbsolutePos; for nested children, use parentElkPos (which is already absolute)
      const containerAbsolute = parentElkPos.x === 0 && parentElkPos.y === 0 
        ? scopeAbsolutePos 
        : parentElkPos;
      
      node.edges.forEach(edge => {
        if (edge.sections && edge.sections.length > 0) {
          const waypoints: Array<{ x: number; y: number }> = [];
          edge.sections.forEach(section => {
            // Include startPoint (connection to source node) - convert to absolute
            if (section.startPoint) {
              waypoints.push({ 
                x: section.startPoint.x + containerAbsolute.x, 
                y: section.startPoint.y + containerAbsolute.y 
              });
            }
            // Include bendPoints (intermediate routing points) - convert to absolute
            if (section.bendPoints) {
              waypoints.push(...section.bendPoints.map((bp: { x: number; y: number }) => ({
                x: bp.x + containerAbsolute.x,
                y: bp.y + containerAbsolute.y
              })));
            }
            // Include endPoint (connection to target node) - convert to absolute
            if (section.endPoint) {
              waypoints.push({ 
                x: section.endPoint.x + containerAbsolute.x, 
                y: section.endPoint.y + containerAbsolute.y 
              });
            }
          });
          
          // Validate that waypoints are orthogonal (no diagonal segments)
          // If ELK produces diagonal waypoints, we should NOT store them
          // This forces StepEdge to use its orthogonal fallback
          const isOrthogonal = (points: Array<{ x: number; y: number }>): boolean => {
            if (points.length < 2) return true;
            const tolerance = 1; // Allow for floating point errors
            for (let i = 1; i < points.length; i++) {
              const prev = points[i - 1];
              const curr = points[i];
              const xDiff = Math.abs(curr.x - prev.x);
              const yDiff = Math.abs(curr.y - prev.y);
              // Diagonal if both X and Y change significantly
              if (xDiff > tolerance && yDiff > tolerance) {
                console.log(`[ELK-LAYOUT] ⚠️ Edge ${edge.id} has diagonal segment at index ${i}: (${prev.x.toFixed(1)},${prev.y.toFixed(1)}) → (${curr.x.toFixed(1)},${curr.y.toFixed(1)}) - NOT storing, StepEdge will use fallback`);
                return false;
              }
            }
            return true;
          };
          
          // Only store if we have at least 2 points (start and end) AND they're orthogonal
          if (waypoints.length >= 2 && isOrthogonal(waypoints)) {
            console.log(`[🔍 ELK-DEBUG] Storing waypoints for edge ${edge.id}: ${waypoints.length} points (converted to absolute)`);
            delta.edge[edge.id] = { waypoints };
          } else if (waypoints.length >= 2) {
            // Waypoints exist but are diagonal - log and skip
            console.log(`[ELK-LAYOUT] ⚠️ Edge ${edge.id} has diagonal waypoints, not storing in ViewState`);
          }
        }
      });
    }
  }

  // Start extraction from the scope node
  // Scope node itself uses its absolute position from ViewState (already stored)
  const scopeIsGroup = !!(layout.children && layout.children.length > 0);
  
  // For scope node, use its absolute position directly (don't convert)
  const scopeX = layout.x || 0;
  const scopeY = layout.y || 0;
  // After anchoring, scope position might be different - use anchored position
  const scopeAbsoluteAfterAnchor = scopeGroupGeom
    ? { x: scopeGroupGeom.x, y: scopeGroupGeom.y } // Keep existing absolute position
    : { x: scopeX, y: scopeY }; // Use ELK position if no ViewState
  
  // CRITICAL: Extract edges from the scope node itself (layout.edges)
  // Edges are stored at the container level in ELK, not in children
  // Use SAME coordinate transformation as nodes: -minOffset + padding + groupAbsolute
  if (layout.edges && layout.edges.length > 0) {
    if (!delta.edge) delta.edge = {};
    console.log(`[🔍 ELK-DEBUG] Extracting ${layout.edges.length} edges from scope node`);
    layout.edges.forEach((edge: any) => {
      if (edge.sections && edge.sections.length > 0) {
        const waypoints: Array<{ x: number; y: number }> = [];
        edge.sections.forEach((section: any) => {
          // Convert ELK relative coordinates using SAME transform as nodes:
          // absolute = (elkPoint - minOffset) + padding + groupAbsolute
          const transformPoint = (p: { x: number; y: number }) => ({
            x: (p.x - minElkX) + PADDING + scopeAbsoluteAfterAnchor.x,
            y: (p.y - minElkY) + PADDING + scopeAbsoluteAfterAnchor.y
          });
          
          if (section.startPoint) {
            waypoints.push(transformPoint(section.startPoint));
          }
          if (section.bendPoints) {
            waypoints.push(...section.bendPoints.map(transformPoint));
          }
          if (section.endPoint) {
            waypoints.push(transformPoint(section.endPoint));
          }
        });
        
        // Validate orthogonal
        const isOrthogonal = (points: Array<{ x: number; y: number }>): boolean => {
          if (points.length < 2) return true;
          const tolerance = 1;
          for (let i = 1; i < points.length; i++) {
            const prev = points[i - 1];
            const curr = points[i];
            const xDiff = Math.abs(curr.x - prev.x);
            const yDiff = Math.abs(curr.y - prev.y);
            if (xDiff > tolerance && yDiff > tolerance) {
              return false;
            }
          }
          return true;
        };
        
        if (waypoints.length >= 2 && isOrthogonal(waypoints)) {
          console.log(`[🔍 ELK-DEBUG] Storing waypoints for edge ${edge.id}: ${waypoints.length} points (converted to absolute from scope)`);
          delta.edge[edge.id] = { waypoints };
        } else {
          console.log(`[🔍 ELK-DEBUG] Edge ${edge.id} has diagonal waypoints or insufficient points, not storing`);
        }
      }
    });
  }
  
  // Extract children (they will be converted relative to scope)
  // CRITICAL: Use layout.x and layout.y as the parent position (after translation)
  // After translation, layout.x/y represents the group's absolute position
  // Direct children of scope need padding adjustment (ELK positions relative to content area)
  if (layout.children) {
    const layoutAbsolutePos = { x: layout.x || 0, y: layout.y || 0 };
    console.log(`[🔍 ELK-DEBUG] Extracting ${layout.children.length} children from layout`);
    console.log(`[🔍 ELK-DEBUG]   Layout absolute position (parent): (${layoutAbsolutePos.x}, ${layoutAbsolutePos.y})`);
    console.log(`[🔍 ELK-DEBUG]   Padding offset: (${padding.left}px, ${padding.top}px)`);
    layout.children.forEach(child => {
      const childIsGroup = !!(child.children && child.children.length > 0);
      extractFromNode(child, childIsGroup, layoutAbsolutePos, true); // Direct children: apply padding adjustment
    });
  } else {
    console.log(`[🔍 ELK-DEBUG] No children to extract from layout`);
  }

  console.log(`[🔍 ELK-DEBUG] Final delta nodes:`, Object.keys(delta.node || {}).map(id => {
    const geom = delta.node![id];
    return `${id}: (${geom.x}, ${geom.y})`;
  }).join(', '));

  return delta;
}

/**
 * Runs scoped ELK layout on a specific group scope.
 * 
 * @param scopeId - Group ID to run layout on (never 'root' by default)
 * @param domainGraph - The full domain graph (RawGraph)
 * @param currentViewState - Current ViewState for computing anchor
 * @param opts - Layout options (anchoring, etc.)
 * @returns ViewStateDelta with computed geometry for nodes/groups/edges in scope
 * 
 * @example
 * ```ts
 * const delta = await runScopeLayout('group-123', domainGraph, viewState, { anchorId: 'node-456' });
 * // delta contains { node: { 'node-456': { x, y, w, h }, ... }, ... }
 * ```
 */
export async function runScopeLayout(
  scopeId: string,
  domainGraph: RawGraph,
  currentViewState: ViewState,
  opts?: LayoutOptions
): Promise<ViewStateDelta> {
  // 1. Extract subtree for scopeId from Domain graph
  const subtree = extractSubtree(domainGraph, scopeId);
  if (!subtree) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(`[ScopedLayoutRunner] Failed to extract subtree for scope "${scopeId}"`);
    }
    return {};
  }

  console.log(`[🔍 ELK-DEBUG] ========== ELK LAYOUT FLOW START ==========`);
  console.log(`[🔍 ELK-DEBUG] Scope ID: ${scopeId}`);
  
  // Log what we extracted from domain graph
  console.log(`[🔍 ELK-DEBUG] Extracted subtree structure:`, {
    id: subtree.id,
    childrenCount: subtree.children?.length || 0,
    childrenIds: subtree.children?.map((c: any) => c.id) || [],
    edgesCount: subtree.edges?.length || 0
  });

  // 2. Compute pre-layout bbox top-left for anchoring
  const anchorTopLeft = computeScopeBboxTopLeft(scopeId, subtree, currentViewState);
  console.log(`[🔍 ELK-DEBUG] Anchor top-left (for preserving position):`, anchorTopLeft);

  // 3. Prepare subtree for ELK - use structuredClone (same as AI flow)
  // CRITICAL: Use structuredClone instead of JSON.parse/stringify to preserve object references
  const subtreeClone = structuredClone(subtree);
  
  // 3a. Apply ensureIds FIRST (adds IDs and ELK options, calculates default dimensions in UNITS)
  // This matches the AI flow exactly: ensureIds(structuredClone(rawGraph))
  const prepared = ensureIds(subtreeClone);
  
  // Parse padding for adjusting child positions
  // Padding is [top=4.0,left=2.0] in units → (64px, 32px) after scaling
  const paddingStr = NON_ROOT_DEFAULT_OPTIONS.layoutOptions?.['elk.padding'];
  function parsePadding(str: string | undefined): { top: number; left: number } {
    if (!str || !str.startsWith('[')) return { top: 0, left: 0 };
    const topMatch = str.match(/top=([\d.]+)/);
    const leftMatch = str.match(/left=([\d.]+)/);
    const topUnits = topMatch ? parseFloat(topMatch[1]) : 0;
    const leftUnits = leftMatch ? parseFloat(leftMatch[1]) : 0;
    return { top: topUnits * GRID_SIZE, left: leftUnits * GRID_SIZE };
  }
  const paddingOffset = parsePadding(paddingStr);
  console.log(`[🔍 ELK-DEBUG] Parsed padding: ${paddingStr} → (${paddingOffset.left}px, ${paddingOffset.top}px)`);

  // Log current ViewState positions BEFORE injection
  console.log(`[🔍 ELK-DEBUG] Current ViewState positions (BEFORE ELK):`);
  if (prepared.children) {
    prepared.children.forEach((child: any) => {
      const nodeGeom = currentViewState.node?.[child.id];
      const groupGeom = currentViewState.group?.[child.id];
      const geom = nodeGeom || groupGeom;
      console.log(`[🔍 ELK-DEBUG]   ${child.id}: ViewState absolute position = (${geom?.x || 'N/A'}, ${geom?.y || 'N/A'}), size = (${geom?.w || 'N/A'}, ${geom?.h || 'N/A'})`);
    });
  }
  
  // Get scope group position
  const scopeGroupGeom = currentViewState.group?.[scopeId];
  console.log(`[🔍 ELK-DEBUG] Scope group "${scopeId}" absolute position: (${scopeGroupGeom?.x || 'N/A'}, ${scopeGroupGeom?.y || 'N/A'}), size: (${scopeGroupGeom?.w || 'N/A'}, ${scopeGroupGeom?.h || 'N/A'})`);

  // 3b. OVERRIDE with ViewState dimensions AFTER ensureIds
  // CRITICAL: Convert pixel dimensions to UNITS (ELK works in units, scales to pixels later)
  // ViewState dimensions are in pixels, ELK expects units (divide by GRID_SIZE)
  // This preserves existing sizes while still getting ELK options from ensureIds
  function injectViewStateDimensions(node: ElkGraphNode): void {
    const id = node.id;
    const isGroup = !!(node.children && node.children.length > 0);
    
    // Get dimensions from ViewState (in pixels) and convert to units
    if (isGroup) {
      const groupGeom = currentViewState.group?.[id];
      if (groupGeom?.w && groupGeom?.h) {
        // Convert pixels to units: divide by GRID_SIZE (16px)
        node.width = Math.round(groupGeom.w / GRID_SIZE);
        node.height = Math.round(groupGeom.h / GRID_SIZE);
        console.log(`[🔍 ELK-DEBUG] Injected ViewState dimensions for group ${id}: ${groupGeom.w}px x ${groupGeom.h}px → ${node.width}units x ${node.height}units`);
      }
    } else {
      const nodeGeom = currentViewState.node?.[id];
      if (nodeGeom?.w && nodeGeom?.h) {
        // Convert pixels to units: divide by GRID_SIZE (16px)
        node.width = Math.round(nodeGeom.w / GRID_SIZE);
        node.height = Math.round(nodeGeom.h / GRID_SIZE);
        console.log(`[🔍 ELK-DEBUG] Injected ViewState dimensions for node ${id}: ${nodeGeom.w}px x ${nodeGeom.h}px → ${node.width}units x ${node.height}units`);
      }
    }
    
    // Recursively process children
    if (node.children) {
      node.children.forEach(child => injectViewStateDimensions(child));
    }
  }
  
  injectViewStateDimensions(prepared);

  // Log what we're sending to ELK
  console.log(`[🔍 ELK-DEBUG] Input to ELK (prepared subtree):`, {
    id: prepared.id,
    width: prepared.width,
    height: prepared.height,
    edges: prepared.edges?.length || 0,
    children: prepared.children?.map((c: any) => ({
      id: c.id,
      width: c.width,
      height: c.height,
      x: c.x, // Might be undefined (ELK will calculate)
      y: c.y  // Might be undefined (ELK will calculate)
    })) || []
  });
  
  // Log edges being sent to ELK
  if (prepared.edges && prepared.edges.length > 0) {
    console.log(`[🔍 ELK-DEBUG] Edges being sent to ELK:`, prepared.edges.map((e: any) => ({
      id: e.id,
      sources: e.sources || e.source,
      targets: e.targets || e.target
    })));
  } else {
    console.warn(`[🔍 ELK-DEBUG] ⚠️ NO EDGES found in prepared subtree! ELK won't space nodes properly.`);
  }

  // 4. Run ELK on scope subtree
  let layout: ElkGraphNode;
  try {
    console.log(`[🔍 ELK-DEBUG] Calling ELK.layout()...`);
    const elkResult = await elk.layout(prepared);
    // CRITICAL: Scale ELK output from units to pixels
    // ELK computes in units (small integers), we need to multiply by GRID_SIZE (16px)
    layout = scaleElkOutput(elkResult) as ElkGraphNode;
    
    // Log what ELK returned (after scaling to pixels)
    console.log(`[🔍 ELK-DEBUG] ELK returned layout (SCALED to pixels):`, {
      id: layout.id,
      x: layout.x,
      y: layout.y,
      width: layout.width,
      height: layout.height,
      edges: layout.edges?.length || 0,
      // Check if layout has padding info
      padding: layout.layoutOptions?.['elk.padding'] || 'none',
      children: layout.children?.map((c: any) => ({
        id: c.id,
        x: c.x,
        y: c.y,
        width: c.width,
        height: c.height
      })) || []
    });
    
    // Log ELK positions (these are RELATIVE to the parent/scope, now in pixels)
    // CRITICAL: Check if ELK positions are relative to group's content area (with padding) or top-left
    if (layout.children) {
      console.log(`[🔍 ELK-DEBUG] ELK returned RELATIVE positions (within scope, in pixels):`);
      console.log(`[🔍 ELK-DEBUG] Scope group layout.x = ${layout.x}, layout.y = ${layout.y} (typically 0,0 for scoped layout)`);
      layout.children.forEach((child: any) => {
        console.log(`[🔍 ELK-DEBUG]   ${child.id}: ELK relative = (${child.x}, ${child.y}), size = (${child.width}, ${child.height})`);
        // Calculate what absolute would be with current logic
        const scopeGeom = currentViewState.group?.[scopeId];
        if (scopeGeom) {
          const calculatedAbsolute = {
            x: scopeGeom.x + child.x,
            y: scopeGeom.y + child.y
          };
          console.log(`[🔍 ELK-DEBUG]     → Would become absolute: (${calculatedAbsolute.x}, ${calculatedAbsolute.y}) with current logic`);
          console.log(`[🔍 ELK-DEBUG]     → Group bounds: (${scopeGeom.x}, ${scopeGeom.y}) to (${scopeGeom.x + scopeGeom.w}, ${scopeGeom.y + scopeGeom.h})`);
        }
      });
    }
    
    // Log edge sections if present
    if (layout.edges && layout.edges.length > 0) {
      console.log(`[🔍 ELK-DEBUG] ELK processed ${layout.edges.length} edges with routing`);
      layout.edges.forEach((edge: any) => {
        console.log(`[🔍 ELK-DEBUG]   Edge ${edge.id}: ${edge.sections?.length || 0} sections`);
      });
    } else {
      console.warn(`[🔍 ELK-DEBUG] ⚠️ ELK returned NO EDGES - spacing will be incorrect!`);
    }
    
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error(`[ScopedLayoutRunner] ELK layout failed for scope "${scopeId}":`, error);
    }
    throw new Error(`ELK layout failed for scope "${scopeId}": ${error}`);
  }

  // 5. CRITICAL: Save original ELK relative positions BEFORE translation
  // Translation modifies positions in-place, but we need original relative positions
  const originalChildPositions = new Map<string, { x: number; y: number }>();
  if (layout.children) {
    layout.children.forEach((child: any) => {
      originalChildPositions.set(child.id, { x: child.x || 0, y: child.y || 0 });
    });
  }
  console.log(`[🔍 ELK-DEBUG] Saved original ELK relative positions BEFORE translation:`, 
    Array.from(originalChildPositions.entries()).map(([id, pos]) => `${id}: (${pos.x}, ${pos.y})`).join(', ')
  );

  // 5b. Translate ONLY the group's position, NOT children (children stay relative to group)
  if (anchorTopLeft && layout.x !== undefined && layout.y !== undefined) {
    const elkTopLeft = { x: layout.x, y: layout.y };
    const dx = anchorTopLeft.x - elkTopLeft.x;
    const dy = anchorTopLeft.y - elkTopLeft.y;
    console.log(`[🔍 ELK-DEBUG] Translating ONLY group position: ELK top-left = (${elkTopLeft.x}, ${elkTopLeft.y}), anchor = (${anchorTopLeft.x}, ${anchorTopLeft.y}), delta = (${dx}, ${dy})`);
    // Only translate the group's position, NOT children (they should stay relative)
    layout.x = (layout.x || 0) + dx;
    layout.y = (layout.y || 0) + dy;
    console.log(`[🔍 ELK-DEBUG] After translation: group position = (${layout.x}, ${layout.y}), children positions UNCHANGED`);
  }

  // 6. Save ELK's calculated layout size BEFORE overwriting with preserved size
  // This is needed to scale child positions to fit in original group
  const elkCalculatedWidth = layout.width || 300;
  const elkCalculatedHeight = layout.height || 250;
  
  // Preserve group frame size (CRITICAL: Don't auto-fit - user wants size to stay same)
  const existingGroupGeom = currentViewState.group?.[scopeId];
  let finalGroupSize: { w: number; h: number };
  
  if (existingGroupGeom?.w && existingGroupGeom?.h) {
    // Preserve original group size
    finalGroupSize = { w: existingGroupGeom.w, h: existingGroupGeom.h };
    if (layout.width !== undefined) layout.width = finalGroupSize.w;
    if (layout.height !== undefined) layout.height = finalGroupSize.h;
  } else {
    // No existing size - fall back to auto-fit (shouldn't happen normally)
    finalGroupSize = autoFitGroupFrame(subtree, layout, currentViewState);
    if (layout.width !== undefined) layout.width = finalGroupSize.w;
    if (layout.height !== undefined) layout.height = finalGroupSize.h;
  }
  
  console.log(`[🔍 ELK-DEBUG] ELK calculated size: ${elkCalculatedWidth}x${elkCalculatedHeight}, Final group size: ${finalGroupSize.w}x${finalGroupSize.h}`);

  // 7. Convert ELK positions to ViewStateDelta format (use ViewState dimensions for nested groups)
  console.log(`[🔍 ELK-DEBUG] Converting ELK layout to ViewStateDelta...`);
  const delta = extractGeometryFromLayout(layout, scopeId, currentViewState, originalChildPositions, paddingOffset, elkCalculatedWidth, elkCalculatedHeight);

  // Log what we extracted
  console.log(`[🔍 ELK-DEBUG] Extracted delta (before adding scope group):`, {
    nodeCount: Object.keys(delta.node || {}).length,
    groupCount: Object.keys(delta.group || {}).length,
    nodePositions: Object.entries(delta.node || {}).map(([id, geom]: [string, any]) => ({
      id,
      x: geom.x,
      y: geom.y,
      w: geom.w,
      h: geom.h
    })),
    groupPositions: Object.entries(delta.group || {}).map(([id, geom]: [string, any]) => ({
      id,
      x: geom.x,
      y: geom.y,
      w: geom.w,
      h: geom.h
    }))
  });

  // CRITICAL: Ensure the scope group itself is included in the delta with preserved size
  // ALWAYS use ViewState geometry - never use ELK-calculated values for scope group
  if (!delta.group) delta.group = {};
  
  // ALWAYS use existing ViewState geometry for scope group (position AND size)
  // If ViewState doesn't have it, this is an error condition - group should exist
  if (!existingGroupGeom) {
    console.error(`[🔍 ELK-DEBUG] ⚠️ CRITICAL: Scope group "${scopeId}" not found in ViewState! This should not happen.`);
    // Fallback: use ELK position but with reasonable default size
    delta.group[scopeId] = {
      x: layout.x || 0,
      y: layout.y || 0,
      w: 300,  // Reasonable default
      h: 250   // Reasonable default
    };
  } else {
    // CRITICAL: Use COMPLETE original geometry from ViewState - no changes at all
    delta.group[scopeId] = {
      x: existingGroupGeom.x,  // Original position
      y: existingGroupGeom.y,  // Original position
      w: existingGroupGeom.w,  // Original width
      h: existingGroupGeom.h   // Original height
    };
    
    console.log(`[🔍 ELK-DEBUG] ✅ Setting scope group "${scopeId}" in delta with PRESERVED ViewState geometry:`, {
      position: { x: existingGroupGeom.x, y: existingGroupGeom.y },
      size: { w: existingGroupGeom.w, h: existingGroupGeom.h },
      elkCalculated: { width: elkCalculatedWidth, height: elkCalculatedHeight }
    });
  }

  // Log final delta
  console.log(`[🔍 ELK-DEBUG] Final delta (absolute positions to write to ViewState):`, {
    nodeCount: Object.keys(delta.node || {}).length,
    groupCount: Object.keys(delta.group || {}).length,
    nodePositions: Object.entries(delta.node || {}).map(([id, geom]: [string, any]) => ({
      id,
      absolute: `(${geom.x}, ${geom.y})`,
      size: `(${geom.w}, ${geom.h})`
    })),
    groupPositions: Object.entries(delta.group || {}).map(([id, geom]: [string, any]) => ({
      id,
      absolute: `(${geom.x}, ${geom.y})`,
      size: `(${geom.w}, ${geom.h})`
    }))
  });
  
  console.log(`[🔍 ELK-DEBUG] ========== ELK LAYOUT FLOW END ==========`);

  if (process.env.NODE_ENV !== 'production') {
    console.log(`[ScopedLayoutRunner] Layout complete for scope "${scopeId}":`, {
      nodeCount: Object.keys(delta.node || {}).length,
      groupCount: Object.keys(delta.group || {}).length,
      edgeCount: Object.keys(delta.edge || {}).length,
      anchored: !!anchorTopLeft
    });
  }

  return delta;
}

