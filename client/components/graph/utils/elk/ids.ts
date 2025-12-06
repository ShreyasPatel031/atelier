/**
 *  ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
 *  ┃  **DATA LAYERS – READ ME BEFORE EDITING**                    ┃
 *  ┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫
 *  ┃  1. domain-graph (graph/*)                                   ┃
 *  ┃     - pure ELK JSON                                           ┃
 *  ┃     - NO x/y/sections/width/height/etc                        ┃
 *  ┃                                                               ┃
 *  ┃  2. processed-graph (ensureIds + elkOptions)                  ┃
 *  ┃     - lives only inside hooks/layout funcs                    ┃
 *  ┃     - generated, never mutated manually                       ┃
 *  ┃                                                               ┃
 *  ┃  3. view-graph (ReactFlow nodes/edges)                        ┃
 *  ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
 */

// utils/elk/ids.ts
import { ROOT_DEFAULT_OPTIONS, NON_ROOT_DEFAULT_OPTIONS, NODE_WIDTH_UNITS, NODE_HEIGHT_UNITS, HEIGHT_PER_LINE_UNITS } from "./elkOptions";
import { calculateNodeDimensionsInUnits } from "../../../../utils/textMeasurement";

/**
 * Recursively assigns stable IDs and layoutOptions.
 * All dimensions are in UNITS (will be scaled by GRID_SIZE after ELK layout).
 * Any node that already has an `id` is left untouched.
 */
export function ensureIds(root: any): any {
  let counter = 0;

  function recurse(node: any, parentId: string) {
    if (!node) return;

    // root vs non-root layout options
    if (!parentId) {
      Object.assign(node, {
        ...ROOT_DEFAULT_OPTIONS,
        layoutOptions: {
          ...ROOT_DEFAULT_OPTIONS.layoutOptions,
          ...(node.layoutOptions ?? {}),
        },
      });
    } else {
      // Apply fixed width in UNITS for all non-root nodes
      node.width ??= NODE_WIDTH_UNITS;
      
      // Apply dynamic height in UNITS for leaf nodes, default for containers
      const isLeafNode = !node.children || node.children.length === 0;
      
      if (isLeafNode && node.labels && node.labels[0] && node.labels[0].text) {
        // Leaf node with label - use dynamic height based on text (in UNITS)
        const labelText = node.labels[0].text;
        const dimensions = calculateNodeDimensionsInUnits(labelText);
        node.height ??= dimensions.height;
        
        // Debug specific nodes
        if (node.id === 'cloud_storage' || node.id === 'bigquery') {
          console.log(`[📏 ensureIds] ${node.id} "${labelText}": width=${dimensions.width} units, height=${dimensions.height} units`);
        }
      } else {
        // Container node or leaf without label - use default height in UNITS
        node.height ??= NODE_HEIGHT_UNITS;
      }
      
      node.layoutOptions = {
        ...NON_ROOT_DEFAULT_OPTIONS.layoutOptions,
        ...(node.layoutOptions ?? {}),
      };
    }

    // assign a new ID only if missing
    if (!node.id) {
      node.id = `auto-${counter++}`;  
    }

    // recurse into children
    (node.children || []).forEach((child: any) =>
      recurse(child, node.id)
    );
  }

  recurse(root, "");
  return root;
}
