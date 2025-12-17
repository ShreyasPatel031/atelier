/**
 * SINGLE SOURCE OF TRUTH for all node dimensions, padding, and styling constants
 * 
 * All node-related sizing constants are defined here to prevent conflicts.
 * Import from this file instead of defining constants in multiple places.
 */

// ============================================================================
// NODE DIMENSIONS (in pixels)
// ============================================================================

/** Default width for regular nodes in pixels */
export const NODE_WIDTH_PX = 96;

/** Default height for regular nodes in pixels (single-line, square) */
export const NODE_HEIGHT_BASE_PX = 96;

/** Default width for group nodes in pixels */
export const GROUP_NODE_WIDTH_PX = 480;

/** Default height for group nodes in pixels */
export const GROUP_NODE_HEIGHT_PX = 320;

// ============================================================================
// ICON DIMENSIONS
// ============================================================================

/** Icon size in pixels (square) */
export const ICON_SIZE_PX = 48;

/** Group icon size in pixels (smaller than regular icons) */
export const GROUP_ICON_SIZE_PX = 20;

// ============================================================================
// PADDING VALUES
// ============================================================================

/** Vertical padding (top + bottom) for node content in pixels */
export const NODE_PADDING_VERTICAL_PX = 16;

/** Horizontal padding (left + right) for node content in pixels */
export const NODE_PADDING_HORIZONTAL_PX = 8;

/** Gap between icon and text in pixels */
export const NODE_TEXT_PADDING_PX = 8;

/** Frame padding for group nodes in pixels */
export const GROUP_FRAME_PADDING_PX = 32;

// ============================================================================
// TEXT DIMENSIONS
// ============================================================================

/** Font size for node labels in pixels */
export const NODE_FONT_SIZE_PX = 8;

/** Line height for node labels in pixels */
export const NODE_LINE_HEIGHT_PX = 10;

/** Font family for node labels */
export const NODE_FONT_FAMILY = 'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

/** Font weight for node labels */
export const NODE_FONT_WEIGHT = 400;

// ============================================================================
// BORDER & STYLING
// ============================================================================

/** Node border width in pixels */
export const NODE_BORDER_WIDTH_PX = 1;

/** Node border color */
export const NODE_BORDER_COLOR = '#e4e4e4';

/** Node border radius in pixels */
export const NODE_BORDER_RADIUS_PX = 8;

// ============================================================================
// ELK LAYOUT UNITS (for grid-aligned layout system)
// ============================================================================

/** Grid size in pixels - all ELK output is multiplied by this */
export const GRID_SIZE_PX = 16;

/** Node width in ELK units (will be multiplied by GRID_SIZE) */
export const NODE_WIDTH_UNITS = 6;  // 6 × 16 = 96px

/** Node height in ELK units (base height for single-line) */
export const NODE_HEIGHT_BASE_UNITS = 6; // 6 × 16 = 96px

/** Additional height per extra line in ELK units */
export const HEIGHT_PER_LINE_UNITS = 1; // 1 × 16 = 16px

/** Group frame padding in ELK units */
export const GROUP_FRAME_PADDING_UNITS = 2; // 2 × 16 = 32px

// ============================================================================
// CALCULATED VALUES
// ============================================================================

/** Available width for text content (node width - horizontal padding) */
export const NODE_TEXT_AVAILABLE_WIDTH_PX = NODE_WIDTH_PX - (NODE_PADDING_HORIZONTAL_PX * 2);

/** Node border affects total dimensions (border is outside in border-box) */
export const NODE_INNER_WIDTH_PX = NODE_WIDTH_PX - (NODE_BORDER_WIDTH_PX * 2);
export const NODE_INNER_HEIGHT_PX = NODE_HEIGHT_BASE_PX - (NODE_BORDER_WIDTH_PX * 2);

// ============================================================================
// DEFAULT SETTINGS OBJECT (for NodeStyleContext compatibility)
// ============================================================================

export const DEFAULT_NODE_STYLE_SETTINGS = {
  iconSize: ICON_SIZE_PX,
  nodePaddingVertical: NODE_PADDING_VERTICAL_PX,
  nodePaddingHorizontal: NODE_PADDING_HORIZONTAL_PX,
  textPadding: NODE_TEXT_PADDING_PX,
} as const;

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface NodeStyleSettings {
  iconSize: number;
  nodePaddingVertical: number;
  nodePaddingHorizontal: number;
  textPadding: number;
}







