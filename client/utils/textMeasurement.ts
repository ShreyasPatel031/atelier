/**
 * Utility for measuring text dimensions in the browser
 * This is needed to calculate dynamic node sizes based on label text
 */

import { NODE_WIDTH_UNITS, GRID_SIZE } from '../components/graph/utils/elk/elkOptions';
import {
  NODE_PADDING_HORIZONTAL_PX as DEFAULT_NODE_PADDING_HORIZONTAL,
  NODE_FONT_SIZE_PX as DEFAULT_FONT_SIZE,
  NODE_LINE_HEIGHT_PX as DEFAULT_LINE_HEIGHT,
  NODE_HEIGHT_BASE_UNITS,
} from './nodeConstants';

// Re-export for backwards compatibility
export { DEFAULT_NODE_PADDING_HORIZONTAL, DEFAULT_FONT_SIZE, DEFAULT_LINE_HEIGHT };

let measurementSvg: SVGSVGElement | null = null;
let measurementText: SVGTextElement | null = null;

/**
 * Initialize the measurement elements (called once)
 * Font size can be updated dynamically via updateMeasurementFontSize
 */
function initMeasurement() {
  if (typeof window === 'undefined') return; // SSR safety
  
  if (!measurementSvg) {
    // Create an off-screen SVG for text measurement
    measurementSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    measurementSvg.style.position = 'absolute';
    measurementSvg.style.left = '-9999px';
    measurementSvg.style.top = '-9999px';
    measurementSvg.style.width = '1px';
    measurementSvg.style.height = '1px';
    measurementSvg.style.visibility = 'hidden';
    
    measurementText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    // Font styles will be updated dynamically to match actual rendering
    measurementText.style.fontFamily = 'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
    measurementText.style.fontWeight = '400';
    
    measurementSvg.appendChild(measurementText);
    document.body.appendChild(measurementSvg);
  }
}

/**
 * Update measurement font size to match actual rendering
 */
function updateMeasurementFontSize(fontSize: number) {
  initMeasurement();
  if (measurementText) {
    measurementText.style.fontSize = `${fontSize}px`;
  }
}

/**
 * Measure the dimensions of a text label as it would appear in a node
 * Handles word wrapping within a fixed node width
 */
/**
 * Split text into lines using word boundaries (no word breaking)
 * This is the SINGLE SOURCE OF TRUTH for text wrapping logic
 */
export function splitTextIntoLines(text: string, maxLineWidth: number = 76, fontSize: number = DEFAULT_FONT_SIZE): string[] {
  // For browser environment, use proper text measurement
  if (typeof window !== 'undefined') {
    initMeasurement();
    updateMeasurementFontSize(fontSize);
    if (measurementText) {
      try {
        const words = text.split(' ');
        const lines: string[] = [];
        let currentLine = '';
        
        for (const word of words) {
          const testLine = currentLine ? `${currentLine} ${word}` : word;
          measurementText.textContent = testLine;
          const testWidth = measurementText.getBBox().width;
          
          if (testWidth <= maxLineWidth) {
            currentLine = testLine;
          } else {
            if (currentLine) {
              lines.push(currentLine);
              currentLine = word;
            } else {
              // Single word is too long, but DON'T break it - keep as one line
              lines.push(word);
              currentLine = '';
            }
          }
        }
        
        if (currentLine) {
          lines.push(currentLine);
        }
        return lines;
      } catch (error) {
        console.warn('❌ Failed to measure text, using fallback:', error);
      }
    }
  }
  
  // Fallback: Simple character-based estimation (no word breaking)
  const avgCharWidth = 7; // Approximate character width
  const maxCharsPerLine = Math.floor(maxLineWidth / avgCharWidth);
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';
  
  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    if (testLine.length <= maxCharsPerLine) {
      currentLine = testLine;
    } else {
      if (currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        // Single word is too long, but DON'T break it
        lines.push(word);
      }
    }
  }
  
  if (currentLine) {
    lines.push(currentLine);
  }
  return lines;
}

export function measureNodeLabel(
  text: string,
  nodeWidthPx: number = NODE_WIDTH_UNITS * GRID_SIZE,
  paddingHorizontal: number = DEFAULT_NODE_PADDING_HORIZONTAL,
  fontSize: number = DEFAULT_FONT_SIZE,
  lineHeight: number = DEFAULT_LINE_HEIGHT
): { width: number; height: number; lines: number } {
  // Calculate available width dynamically: node width - padding on both sides
  const maxLineWidth = nodeWidthPx - (paddingHorizontal * 2);
  const lines = splitTextIntoLines(text, maxLineWidth, fontSize);
  
  // Measure the final dimensions
  const totalHeight = lines.length * lineHeight;
  
  // Find the widest line for accurate width
  let maxWidth = 0;
  if (typeof window !== 'undefined') {
    initMeasurement();
    if (measurementText) {
      try {
        updateMeasurementFontSize(fontSize);
        for (const line of lines) {
          measurementText.textContent = line;
          const lineWidth = measurementText.getBBox().width;
          maxWidth = Math.max(maxWidth, lineWidth);
        }
      } catch (error) {
        maxWidth = text.length * 7; // Fallback
      }
    }
  } else {
    maxWidth = text.length * 7; // SSR fallback
  }
  
  const result = {
    width: Math.ceil(maxWidth),
    height: totalHeight,
    lines: lines.length
  };
  
  return result;
}

/**
 * Calculate the required dimensions for a node based on its label
 * FIXED: Variable HEIGHT based on text, consistent WIDTH
 * Returns dimensions in PIXELS (for backwards compatibility)
 */
export function calculateNodeDimensions(label: string): { width: number; height: number } {
  const textDims = measureNodeLabel(label);
  
  // Constants for icon and padding
  const ICON_SIZE = 48; // Square icons - full width/height
  const NODE_WIDTH = 100; // Keep original width - DO NOT CHANGE
  const HORIZONTAL_PADDING = 16;
  const VERTICAL_PADDING = 12;
  const ICON_TEXT_GAP = 12; // Increased gap between icon and text
  
  // Calculate required dimensions:
  // - WIDTH: Fixed for all nodes to maintain alignment
  // - HEIGHT: Square for 1 line, variable for multi-line
  const width = NODE_WIDTH;
  
  // For single line: make node square (100x100)
  // For multi-line: add extra height for additional lines
  if (textDims.lines === 1) {
    // Single line: make it square
    const height = NODE_WIDTH; // 100px - perfectly square
    return { width, height };
  } else {
    // Multi-line: base square size + extra height for additional lines
    const baseHeight = NODE_WIDTH; // Start with square
    const extraLines = textDims.lines - 1; // Additional lines beyond first
    const extraHeight = extraLines * 14; // 14px per extra line
    const height = baseHeight + extraHeight;
    return { width, height };
  }
}

/**
 * Calculate node dimensions in UNITS for ELK layout.
 * All values are integers that will be multiplied by GRID_SIZE (16) after ELK.
 * 
 * Uses EVEN heights so node centers are at integer unit positions,
 * which scale cleanly to integer pixel positions.
 * 
 * @returns dimensions in UNITS (not pixels)
 */
export function calculateNodeDimensionsInUnits(
  label: string,
  nodeWidthUnits: number = NODE_WIDTH_UNITS,
  paddingHorizontal: number = DEFAULT_NODE_PADDING_HORIZONTAL,
  fontSize: number = DEFAULT_FONT_SIZE,
  lineHeight: number = DEFAULT_LINE_HEIGHT
): { width: number; height: number } {
  // Calculate node width in pixels for measurement
  const nodeWidthPx = nodeWidthUnits * GRID_SIZE;
  
  // Measure label with dynamic settings
  const textDims = measureNodeLabel(label, nodeWidthPx, paddingHorizontal, fontSize, lineHeight);
  
  // Node dimensions in UNITS
  // Width: uses provided units (defaults to NODE_WIDTH_UNITS)
  // Height: Calculate exact height needed based on content, then round to grid
  const width = nodeWidthUnits;
  
  // Calculate exact content height needed:
  // Icon: 48px, Gap: 8px, Text: lineHeight × lines
  // Single line: 48 + 8 + 10 = 66px content
  // Two lines: 48 + 8 + 20 = 76px content
  const ICON_SIZE_PX = 48;
  const GAP_SIZE_PX = 8;
  const contentHeightPx = ICON_SIZE_PX + (textDims.lines > 0 ? GAP_SIZE_PX : 0) + textDims.height;
  
  // For single-line nodes: use base height (96px = 6 units)
  // This gives us: 96px total - 66px content = 30px padding (15px top + 15px bottom when centered)
  // For two-line nodes: add exactly one line height (10px) to maintain same padding
  // This gives us: 106px total - 76px content = 30px padding (15px top + 15px bottom when centered)
  const baseHeightPx = NODE_HEIGHT_BASE_UNITS * GRID_SIZE; // 96px
  const extraLines = Math.max(0, textDims.lines - 1);
  const extraHeightPx = extraLines * lineHeight; // Add exactly 10px per extra line
  const totalHeightPx = baseHeightPx + extraHeightPx; // 96px for 1 line, 106px for 2 lines
  
  // Convert to units: round to nearest (not ceil) to minimize extra space
  // 106px / 16 = 6.625, rounds to 7 units = 112px (6px extra, which gets split 3px top + 3px bottom)
  let height = Math.round(totalHeightPx / GRID_SIZE);
  
  // For padding consistency, allow odd heights if it means less extra space
  // Single line: 96px = 6 units (even) ✓
  // Two lines: 106px rounds to 7 units = 112px (odd, but only 6px extra = 3px per side)
  // Making it even would be 8 units = 128px (22px extra = 11px per side) - too much!
  // So we keep odd heights to maintain consistent padding
  const finalHeightPx = height * GRID_SIZE;
  const extraPx = finalHeightPx - totalHeightPx;
  
  // Only make even if it wouldn't add too much extra space (keep padding consistent)
  // If making it even would add more than 8px extra, keep it odd
  if (height % 2 !== 0) {
    const evenHeightPx = (height + 1) * GRID_SIZE;
    const extraIfEven = evenHeightPx - totalHeightPx;
    // If making even adds more than 8px extra padding per side, keep it odd
    if (extraIfEven - extraPx > GRID_SIZE / 2) {
      // Keep odd - padding consistency is more important than grid alignment
    } else {
      height += 1; // Make even for grid alignment
    }
  }
  
  return { width, height };
}

/**
 * Cleanup function to remove measurement elements
 */
export function cleanupMeasurement() {
  if (measurementSvg && measurementSvg.parentNode) {
    measurementSvg.parentNode.removeChild(measurementSvg);
    measurementSvg = null;
    measurementText = null;
  }
}
