/**
 * Utility for measuring text dimensions in the browser
 * This is needed to calculate dynamic node sizes based on label text
 */

let measurementSvg: SVGSVGElement | null = null;
let measurementText: SVGTextElement | null = null;

/**
 * Initialize the measurement elements (called once)
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
    // Apply the EXACT same font styles that will be used in React Flow nodes
    measurementText.style.fontSize = '12px';
    measurementText.style.fontFamily = 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
    measurementText.style.fontWeight = 'normal'; // Match React Flow default
    
    measurementSvg.appendChild(measurementText);
    document.body.appendChild(measurementSvg);
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
export function splitTextIntoLines(text: string, maxLineWidth: number = 76): string[] {
  // For browser environment, use proper text measurement
  if (typeof window !== 'undefined') {
    initMeasurement();
    if (measurementText) {
      try {
        const words = text.split(' ');
        const lines: string[] = [];
        let currentLine = '';
        
        // Special logging for GKE Gateway Controller
        if (text === "GKE Gateway Controller") {
          console.log(`🔍 [MEASUREMENT] Splitting "${text}" with maxWidth: ${maxLineWidth}px`);
        }
        
        for (const word of words) {
          const testLine = currentLine ? `${currentLine} ${word}` : word;
          measurementText.textContent = testLine;
          const testWidth = measurementText.getBBox().width;
          
          if (text === "GKE Gateway Controller") {
            console.log(`  [MEASUREMENT] Testing: "${testLine}" -> ${testWidth}px (limit: ${maxLineWidth}px)`);
          }
          
          if (testWidth <= maxLineWidth) {
            currentLine = testLine;
          } else {
            if (currentLine) {
              lines.push(currentLine);
              if (text === "GKE Gateway Controller") {
                console.log(`  [MEASUREMENT] ✅ Added line: "${currentLine}"`);
              }
              currentLine = word;
            } else {
              // Single word is too long, but DON'T break it - keep as one line
              lines.push(word);
              if (text === "GKE Gateway Controller") {
                console.log(`  [MEASUREMENT] ⚠️ Long word: "${word}"`);
              }
              currentLine = '';
            }
          }
        }
        
        if (currentLine) {
          lines.push(currentLine);
          if (text === "GKE Gateway Controller") {
            console.log(`  [MEASUREMENT] ✅ Final line: "${currentLine}"`);
          }
        }
        
        if (text === "GKE Gateway Controller") {
          console.log(`🎯 [MEASUREMENT] Result: [${lines.join('", "')}] (${lines.length} lines)`);
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

export function measureNodeLabel(text: string): { width: number; height: number; lines: number } {
  const maxLineWidth = 76; // Reduced width to add horizontal padding (100px - 24px padding)
  const lines = splitTextIntoLines(text, maxLineWidth);
  
  // Measure the final dimensions
  const lineHeight = 14;
  const totalHeight = lines.length * lineHeight;
  
  // Find the widest line for accurate width
  let maxWidth = 0;
  if (typeof window !== 'undefined') {
    initMeasurement();
    if (measurementText) {
      try {
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
  
  return {
    width: Math.ceil(maxWidth),
    height: totalHeight,
    lines: lines.length
  };
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
export function calculateNodeDimensionsInUnits(label: string): { width: number; height: number } {
  const textDims = measureNodeLabel(label);
  
  // Node dimensions in UNITS
  // Width: 6 units (will become 96px after × 16)
  // Height: 6 units base + 1 unit per extra line (always even for clean centers)
  const NODE_WIDTH_UNITS = 6;
  const NODE_HEIGHT_BASE_UNITS = 6;  // Base height for 1 line
  const HEIGHT_PER_EXTRA_LINE_UNITS = 1; // Each additional line adds 1 unit
  
  const width = NODE_WIDTH_UNITS;
  
  // Calculate height: base + extra lines
  // Keep it even by rounding up if needed (ensures center is at integer unit)
  const extraLines = Math.max(0, textDims.lines - 1);
  let height = NODE_HEIGHT_BASE_UNITS + extraLines * HEIGHT_PER_EXTRA_LINE_UNITS;
  
  // Ensure height is even for clean centering
  if (height % 2 !== 0) {
    height += 1;
  }
  
  // Debug specific labels
  if (label === 'Cloud Storage' || label === 'BigQuery') {
    console.log(`[📝 textMeasurement] "${label}": ${textDims.lines} lines → height=${height} units (${height * 16}px after scaling)`);
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
