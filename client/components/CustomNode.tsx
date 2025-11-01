import React, { useEffect, useState, useRef } from 'react';
import { Handle, Position } from 'reactflow';
import { motion } from 'framer-motion';
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { baseHandleStyle } from './graph/handles';
import { iconLists } from '../generated/iconLists';
import { iconFallbackService } from '../utils/iconFallbackService';
import { iconCacheService } from '../utils/iconCacheService';
import { useApiEndpoint, buildAssetUrl } from '../contexts/ApiEndpointContext';
import { splitTextIntoLines } from '../utils/textMeasurement';

// NO HEURISTIC FALLBACKS - let semantic fallback service handle everything

interface CustomNodeProps {
  data: {
    label: string;
    icon?: string;
    width?: number;
    height?: number;
    leftHandles?: string[];
    rightHandles?: string[];
    topHandles?: string[];
    bottomHandles?: string[];
    isEditing?: boolean; // Added isEditing prop
  };
  id: string;
  selected?: boolean;
  onLabelChange: (id: string, label: string) => void;
}

const CustomNode: React.FC<CustomNodeProps> = ({ data, id, selected, onLabelChange }) => {
  const { leftHandles = [], rightHandles = [], topHandles = [], bottomHandles = [] } = data;
  
  // CONFIGURABLE: Handle proximity distance (change this to adjust sensitivity)
  const HANDLE_PROXIMITY_DISTANCE = 24; // pixels from dot center to trigger expansion (increased from 12)
  const [isEditing, setIsEditing] = useState(data.isEditing || (!data.label || data.label === 'Add text'));
  const [label, setLabel] = useState(!data.label || data.label === 'Add text' ? '' : data.label);
  const [iconLoaded, setIconLoaded] = useState(false);
  const [iconError, setIconError] = useState(false);
  const [finalIconSrc, setFinalIconSrc] = useState<string | undefined>(undefined);
  const [fallbackAttempted, setFallbackAttempted] = useState(false);
  const apiEndpoint = useApiEndpoint();
  const lastBlurTimeRef = useRef<number>(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // helpers hoisted for reuse
  const findIconCategory = (provider: string, iconName: string): string | null => {
    const providerIcons = iconLists[provider as keyof typeof iconLists];
    if (!providerIcons) return null;
    for (const [category, icons] of Object.entries(providerIcons)) {
      if (icons.includes(iconName)) return category;
    }
    return null;
  };

  const tryLoadIcon = async (iconName: string) => {
    // Check cache first
    const cachedUrl = iconCacheService.getCachedIcon(iconName);
    if (cachedUrl) {
      return cachedUrl;
    }

    // Loading icon silently
    
    const prefixMatch = iconName.match(/^(aws|gcp|azure)_(.+)$/);
    if (prefixMatch) {
      // Provider icon (aws_, gcp_, azure_)
      const [, provider, actualIconName] = prefixMatch;
      const category = findIconCategory(provider, actualIconName);
      if (category) {
        const iconPath = `/icons/${provider}/${category}/${actualIconName}.png`;
        const fullIconUrl = buildAssetUrl(iconPath, apiEndpoint);
        
        try {
          // First check if the URL returns actual image content
          const response = await fetch(fullIconUrl);
          const contentType = response.headers.get('content-type') || '';
          
          // If we get HTML instead of an image, it means the icon doesn't exist
          if (contentType.includes('text/html')) {
            throw new Error(`Icon returned HTML instead of image: ${iconName}`);
          }
          
          // If content type looks like an image, try to load it
          if (contentType.includes('image/') || response.ok) {
            const img = new Image();
            await new Promise((resolve, reject) => {
              img.onload = resolve;
              img.onerror = reject;
              img.src = fullIconUrl;
            });
            
            // Cache the successfully loaded icon
            iconCacheService.cacheIcon(iconName, fullIconUrl);
            // Icon cached silently
            return fullIconUrl;
          }
        } catch (error) {
          console.log(`❌ Provider icon not found: ${iconName} (${error instanceof Error ? error.message : 'Unknown error'})`);
        }
      }
    } else {
      // General icon (no provider prefix) - try canvas assets
      const generalIconPaths = [
        `/assets/canvas/${iconName}.png`,
        `/assets/canvas/${iconName}.svg`
      ];
      
      // General icon (no provider prefix) - try canvas assets
      for (const iconPath of generalIconPaths) {
        try {
          const fullIconUrl = buildAssetUrl(iconPath, apiEndpoint);
          const response = await fetch(fullIconUrl);
          
          if (response.ok && !response.headers.get('content-type')?.includes('text/html')) {
            const img = new Image();
            await new Promise((resolve, reject) => {
              img.onload = resolve;
              img.onerror = reject;
              img.src = fullIconUrl;
            });
            
            // Cache the successfully loaded icon
            iconCacheService.cacheIcon(iconName, fullIconUrl);
            // General icon loaded successfully
            return fullIconUrl;
          }
        } catch (error) {
          // Try next path
        }
      }
      // General icon not found
    }
    
    // Icon not found anywhere
    throw new Error(`Icon not found: ${iconName}`);
  };

  useEffect(() => {
    // Reset states
    setIconLoaded(false);
    setIconError(false);
    setFallbackAttempted(false);

    if (data.icon) {
      // Try to load the specified icon
      tryLoadIcon(data.icon)
        .then((path) => {
          setFinalIconSrc(path);
          setIconLoaded(true);
          setIconError(false);
        })
        .catch(() => {
          // Icon failed to load - use semantic fallback service
          setIconError(true);
          if (!fallbackAttempted) {
            setFallbackAttempted(true);
            iconFallbackService.findFallbackIcon(data.icon)
              .then(async (fallbackIcon) => {
                if (fallbackIcon) {
                  try {
                    const fallbackPath = await tryLoadIcon(fallbackIcon);
                    setFinalIconSrc(fallbackPath);
                    setIconLoaded(true);
                    setIconError(false);
                  } catch (error) {
                    // Silent fallback failure
                  }
                }
              })
              .catch((error) => {
                console.error(`💥 Semantic fallback error for ${data.icon}:`, error);
              });
          }
        });
    } else {
      // No icon specified - try semantic fallback based on node ID
      setIconError(true);
      
      if (!fallbackAttempted) {
        setFallbackAttempted(true);
        iconFallbackService.findFallbackIcon(id)
          .then(async (fallbackIcon) => {
            if (fallbackIcon) {
              // Node ID semantic fallback found
              try {
                const fallbackPath = await tryLoadIcon(fallbackIcon);
                setFinalIconSrc(fallbackPath);
                setIconLoaded(true);
                setIconError(false);
                // Node ID fallback success
              } catch (error) {
                // Node ID fallback failed to load
              }
            } else {
              // No semantic fallback found for node ID
            }
          })
          .catch((error) => {
            console.error(`💥 Semantic fallback error for node ID ${id}:`, error);
          });
      }
    }
  }, [data.icon, id]);

  // keep local label in sync
  useEffect(() => {
    setLabel(data.label);
  }, [data.label]);

  // Auto-enter edit mode when node is selected (but not immediately after blur)
  useEffect(() => {
    if (selected && !isEditing) {
      const timeSinceBlur = Date.now() - lastBlurTimeRef.current;
      // If we just blurred (< 100ms ago), wait a bit before re-entering edit mode
      if (timeSinceBlur < 100) {
        const timer = setTimeout(() => {
          if (selected && !isEditing) {
            setIsEditing(true);
          }
        }, 100 - timeSinceBlur);
        return () => clearTimeout(timer);
      } else {
        setIsEditing(true);
      }
    }
  }, [selected]);

  // Focus input when entering edit mode
  useEffect(() => {
    if (isEditing && inputRef.current) {
      // Small delay to ensure DOM is updated
      const timer = setTimeout(() => {
        inputRef.current?.focus();
        // Move cursor to end if there's text
        if (inputRef.current && label) {
          inputRef.current.setSelectionRange(label.length, label.length);
        }
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [isEditing, label]);

  const handleLabelChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLabel(e.target.value);
  };

  // On Enter: commit label - no manual icon fetching
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      lastBlurTimeRef.current = Date.now();
      setIsEditing(false);
      onLabelChange(id, label || ''); // Save empty string if no text
      // Let the useEffect handle icon loading based on the new label
    }
    if (e.key === 'Escape') {
      lastBlurTimeRef.current = Date.now();
      setIsEditing(false);
      if (!label.trim()) {
        onLabelChange(id, ''); // Save empty if no text on escape
      }
    }
  };

  // No debounced icon updates while editing - let semantic fallback handle it

  const handleClick = () => {
    if (!isEditing) {
    setIsEditing(true);
    }
  };

  const nodeStyle = {
    background: 'white', // Always white from Figma
    border: '1px solid #e4e4e4', // Figma exact border color
    borderRadius: '8px', // Figma 8px radius
    padding: '0px',
    // Default square footprint aligned to 16px grid; data.width/height can override
    width: data.width || 96,
    height: data.height || 96,
    boxSizing: 'border-box' as const,
    display: 'flex',
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
    fontSize: '12px',
    boxShadow: 'none', // No shadow from Figma
    position: 'relative' as const,
    zIndex: selected ? 100 : 50,
    pointerEvents: 'all' as const
  };

  const [nodeEl, setNodeEl] = useState<HTMLDivElement | null>(null);

  const [hoveredHandle, setHoveredHandle] = useState<string | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);
  const [nodeScale, setNodeScale] = useState<number>(1);
  const [expandedHandles, setExpandedHandles] = useState<Set<string>>(new Set());
  
  // FIXED: Recalculate nodeScale on zoom changes using ResizeObserver
  useEffect(() => {
    if (!nodeEl) return;
    
    const cssWidth = data.width || 96; // Use data.width from props
    
    const updateScale = () => {
      const rect = nodeEl.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        const actualScale = rect.width / cssWidth;
        // Sanity check: scale should be between 0.1 and 10
        if (actualScale >= 0.1 && actualScale <= 10) {
          setNodeScale(actualScale);
        }
      }
    };
    
    // FIXED: Wait for next frame to ensure ReactFlow has rendered/scaled the node
    // Use double RAF to ensure layout has settled
    let rafId1: number;
    let rafId2: number;
    
    rafId1 = requestAnimationFrame(() => {
      rafId2 = requestAnimationFrame(() => {
        updateScale();
      });
    });
    
    // FIXED: Also update after a short delay to catch any late ReactFlow transforms
    // This is especially important when nodes are created while zoomed out
    const timeoutId = setTimeout(() => {
      updateScale();
    }, 100);
    
    // Watch for size changes (which happen on zoom)
    const resizeObserver = new ResizeObserver(() => {
      // Use RAF to batch updates and avoid excessive calculations
      requestAnimationFrame(() => {
        updateScale();
      });
    });
    
    resizeObserver.observe(nodeEl);
    
    return () => {
      if (rafId1) cancelAnimationFrame(rafId1);
      if (rafId2) cancelAnimationFrame(rafId2);
      clearTimeout(timeoutId);
      resizeObserver.disconnect();
    };
  }, [nodeEl, data.width]);
  
  // FIXED: Track expansion time to prevent rapid flickering
  const expansionTimeRef = useRef<Map<string, number>>(new Map());
  const MIN_EXPANSION_TIME = 50; // Minimum 50ms between expand/collapse to prevent flicker
  
  // FIXED: Cancel previous timeouts to prevent race conditions
  const timeoutRefs = useRef<Map<string, NodeJS.Timeout>>(new Map());
  
  // DEBUG: Track all state changes to localize flicker
  const renderCountRef = useRef(0);
  const lastStateRef = useRef<{isExpanded: boolean, isWhite: boolean, hoveredHandle: string | null}>({
    isExpanded: false, isWhite: false, hoveredHandle: null
  });

  // Track mouse position on node for proximity detection
  useEffect(() => {
    if (!nodeEl) return;
    let logCount = 0;
    const onMouseMove = (e: MouseEvent) => {
      const rect = nodeEl.getBoundingClientRect();
      const newPos = { x: e.clientX - rect.left, y: e.clientY - rect.top };
      setMousePos(newPos);
      
      // COMPREHENSIVE DEBUG: Mouse position calculation
      if (logCount < 5) {
        // eslint-disable-next-line no-console
        console.log(`[MOUSE TRACKING FIXED ${logCount + 1}/5]`, {
          rawEvent: { clientX: e.clientX, clientY: e.clientY },
          nodeRect: { 
            left: rect.left, 
            top: rect.top, 
            width: rect.width, 
            height: rect.height,
            right: rect.right,
            bottom: rect.bottom
          },
          calculatedRelativePos: newPos,
          sanityCheck: {
            mouseInBounds: newPos.x >= 0 && newPos.x <= rect.width && newPos.y >= 0 && newPos.y <= rect.height,
            expectedNodeSize: '96x96',
            actualNodeSize: `${rect.width}x${rect.height}`
          },
          nodeId: id
        });
        logCount++;
      }
    };
    const onMouseLeave = () => {
      setMousePos(null);
      setHoveredHandle(null);
      setExpandedHandles(new Set()); // Collapse all when mouse leaves node
      logCount = 0;
      // eslint-disable-next-line no-console
      console.log('[CustomNode] mouseLeave - resetting debug count');
    };
    nodeEl.addEventListener('mousemove', onMouseMove);
    nodeEl.addEventListener('mouseleave', onMouseLeave);
    return () => {
      nodeEl.removeEventListener('mousemove', onMouseMove);
      nodeEl.removeEventListener('mouseleave', onMouseLeave);
    };
  }, [nodeEl, id]);

  return (
    <>
      <style>
        {`
          .node-text-input::placeholder {
            color: #e4e4e4;
            opacity: 1;
          }
        `}
      </style>
      <div 
        style={nodeStyle} 
        data-testid="react-flow-node" 
        ref={(el) => {
          setNodeEl(el);
          // Scale calculation now handled by ResizeObserver in useEffect
        }}
      >
      {/* Four directional handles (Figma exact design) - always show when selected */}
      {selected && (
        <>
          {[
            // FIXED: Dots positioned 8px from border edge uniformly
            // Node is 96x96. Border is at 0,0 to 96,96. Want dots 8px outside border.
            // Top: dot center at (48, -11) for small, (48, -16) for large to keep 8px gap
            // Right: dot center at (107, 48) for small, (112, 48) for large to keep 8px gap  
            // Bottom: dot center at (48, 107) for small, (48, 112) for large to keep 8px gap
            // Left: dot center at (-11, 48) for small, (-16, 48) for large to keep 8px gap
            { key: 'top', rotation: 0 },
            { key: 'right', rotation: 90 },
            { key: 'bottom', rotation: 180 },
            { key: 'left', rotation: 270 },
          ].map(({ key, rotation }) => {
            // CORRECTED: Calculate positions in CSS coordinate system (before ReactFlow scaling)
            // ReactFlow will scale these, so we work in the base 96px coordinate system
            
            // STANDARDIZED: Simple uniform calculation for all directions
            // Node center is at (48, 48), borders are 48px away in each direction
            // All dots are exactly 8px outside the border + half their size
            const GAP = 8; // pixels from border
            const NODE_CENTER = 48; // center of 96px node
            const BORDER_DISTANCE = 48; // distance from center to border
            
            // Small dot: 4x6, so half-sizes are 2x3
            // Large dot: 16x16, so half-sizes are 8x8
            const smallHalfW = 2, smallHalfH = 3;
            const largeHalfW = 8, largeHalfH = 8;
            
            // CORRECTED: Proper 8px spacing calculations
            // Node is 96x96, center at 48. Borders at x=0,96 and y=0,96
            // Small dot (4x6): edge should be 8px from border
            // Large dot (16x16): edge should be 8px from border
            
            // FIXED: Proper positioning for each direction
            // Top dot: X stays at center (48), Y moves up from border
            // Bottom dot: X stays at center (48), Y moves down from border  
            // Left dot: Y stays at center (48), X moves left from border
            // Right dot: Y stays at center (48), X moves right from border
            
            let baseSmallCx, baseSmallCy, baseLargeCx, baseLargeCy;
            
            // SIMPLIFIED: Use transform translate(-50%, -50%) and position dots at their visual centers
            // This way both small and large dots will be perfectly centered at the same coordinates
            
            if (key === 'top') {
              // Both dots centered at (48, Y) where Y changes for animation
              baseSmallCx = NODE_CENTER;     // X: always centered at 48
              baseSmallCy = 0 - 8 - 3;      // Y: top border - 8px gap - 3px to center = -11
              baseLargeCx = NODE_CENTER;     // X: always centered at 48 (same as small)
              baseLargeCy = 0 - 8 - 8;      // Y: top border - 8px gap - 8px to center = -16
            } else if (key === 'bottom') {
              // Both dots centered at (48, Y) where Y stays same
              baseSmallCx = NODE_CENTER;     // X: always centered at 48
              baseSmallCy = 96 + 8 + 3;     // Y: bottom border + 8px gap + 3px to center = 107
              baseLargeCx = NODE_CENTER;     // X: always centered at 48 (same as small)
              baseLargeCy = 96 + 8 + 8;     // Y: bottom border + 8px gap + 8px to center = 112
            } else if (key === 'left') {
              // Both dots centered at (X, 48) where X changes for animation
              baseSmallCx = 0 - 8 - 2;      // X: left border - 8px gap - 2px to center = -10
              baseSmallCy = NODE_CENTER;     // Y: always centered at 48
              baseLargeCx = 0 - 8 - 8;      // X: left border - 8px gap - 8px to center = -16
              baseLargeCy = NODE_CENTER;     // Y: always centered at 48 (same as small)
            } else { // right
              // Both dots centered at (X, 48) where X stays same
              baseSmallCx = 96 + 8 + 2;     // X: right border + 8px gap + 2px to center = 106
              baseSmallCy = NODE_CENTER;     // Y: always centered at 48
              baseLargeCx = 96 + 8 + 8;     // X: right border + 8px gap + 8px to center = 112
              baseLargeCy = NODE_CENTER;     // Y: always centered at 48 (same as small)
            }
            
            // Actual centers after ReactFlow scaling (for proximity detection)
            const smallCx = baseSmallCx * nodeScale;
            const smallCy = baseSmallCy * nodeScale;
            const largeCx = baseLargeCx * nodeScale;
            const largeCy = baseLargeCy * nodeScale;
            
            // CORRECTED CSS positions: Use the calculated base positions directly
            // translate(-50%, -50%) will center the dot at these coordinates
            const smallCssCx = baseSmallCx;
            const smallCssCy = baseSmallCy;
            const largeCssCx = baseLargeCx;
            const largeCssCy = baseLargeCy;
            const isHovered = hoveredHandle === key;
            
            // Removed debug log
            
            // Expansion is controlled by green area hover, not proximity
            const isExpanded = expandedHandles.has(key);
            const isWhite = isExpanded && hoveredHandle === key;
            
            // DEBUG: Track every render and state change for top dot
            if (key === 'top') {
              renderCountRef.current++;
              const currentState = { isExpanded, isWhite, hoveredHandle };
              const lastState = lastStateRef.current;
              
              // Only log when state actually changes or during suspected flicker
              if (
                currentState.isExpanded !== lastState.isExpanded ||
                currentState.isWhite !== lastState.isWhite ||
                currentState.hoveredHandle !== lastState.hoveredHandle
              ) {
                // eslint-disable-next-line no-console
                console.log(`[RENDER ${renderCountRef.current}] TOP DOT STATE CHANGE`, {
                  timestamp: Date.now(),
                  from: lastState,
                  to: currentState,
                  stateTransition: `${lastState.isExpanded ? 'EXP' : 'SMALL'}-${lastState.isWhite ? 'WHITE' : 'BLUE'} → ${currentState.isExpanded ? 'EXP' : 'SMALL'}-${currentState.isWhite ? 'WHITE' : 'BLUE'}`,
                  expandedSet: Array.from(expandedHandles),
                  FLICKER_SUSPECT: !currentState.isExpanded && lastState.isExpanded ? '🚨 COLLAPSED UNEXPECTEDLY' : 
                                   currentState.isExpanded && !currentState.isWhite && lastState.isWhite ? '🚨 WHITE→BLUE BUT MIGHT FLASH SMALL' :
                                   'Normal transition'
                });
                lastStateRef.current = currentState;
              }
            }
            
            // Removed debug logs
            
            // Current center for this state (for visual dot)
            const currentCx = isExpanded ? largeCx : smallCx;
            const currentCy = isExpanded ? largeCy : smallCy;
            const size = isExpanded ? 16 : 4;
            const height = isExpanded ? 16 : 6;
            
            // FIXED: Hover area always uses small dot position (doesn't move)
            const hoverAreaCssCx = smallCssCx;
            const hoverAreaCssCy = smallCssCy;
            
            // CSS position for hover area (fixed at small dot position)
            const hoverAreaPos = {
              left: (key === 'left' || key === 'right') ? hoverAreaCssCx : '50%',
              top: (key === 'top' || key === 'bottom') ? hoverAreaCssCy : '50%'
            };
            
            // CSS position for visual dot (moves when expanding)
            const dotCssCx = isExpanded ? largeCssCx : smallCssCx;
            const dotCssCy = isExpanded ? largeCssCy : smallCssCy;
            
            const dotPos = {
              left: (key === 'left' || key === 'right') ? dotCssCx : '50%',
              top: (key === 'top' || key === 'bottom') ? dotCssCy : '50%'
            };
            
            // Calculate offset of dot from hover area center
            // When both are '50%', offset is 0. Otherwise calculate the difference
            const dotOffsetX = (typeof dotPos.left === 'number' && typeof hoverAreaPos.left === 'number')
              ? dotPos.left - hoverAreaPos.left
              : 0;
            const dotOffsetY = (typeof dotPos.top === 'number' && typeof hoverAreaPos.top === 'number')
              ? dotPos.top - hoverAreaPos.top
              : 0;
            
            // Removed debug log
            
            
            return (
              <>
                {/* Fixed proximity detection area (green) - actual hover area for expansion */}
                <div
                  style={{
                    position: 'absolute',
                    left: hoverAreaPos.left,
                    top: hoverAreaPos.top,
                    transform: 'translate(-50%, -50%)',
                    width: 64, // Large enough to slightly overlap with each other and be accessible from center
                    height: 64,
                    background: isExpanded ? 'rgba(0, 255, 0, 0.1)' : 'rgba(0, 255, 0, 0.3)', // Green proximity area for debugging
                    pointerEvents: 'auto', // Always interactive - big dot will be above with higher z-index
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    zIndex: 1000 // High z-index to ensure hover areas are above node content
                  }}
                  onMouseEnter={() => {
                    // FIXED: Cancel any pending collapse when entering green area
                    const existingTimeout = timeoutRefs.current.get(`collapse-${key}`);
                    if (existingTimeout) {
                      clearTimeout(existingTimeout);
                      timeoutRefs.current.delete(`collapse-${key}`);
                      // eslint-disable-next-line no-console
                      console.log(`[${key.toUpperCase()}] Green area mouseEnter - cancelled pending collapse`);
                    }
                    
                    // FIXED: Prevent rapid re-expansion if just collapsed
                    const now = Date.now();
                    const lastCollapse = expansionTimeRef.current.get(`${key}-collapse`);
                    if (lastCollapse && (now - lastCollapse) < MIN_EXPANSION_TIME) {
                      // eslint-disable-next-line no-console
                      console.log(`[${key.toUpperCase()}] Green area mouseEnter - too soon after collapse (${now - lastCollapse}ms < ${MIN_EXPANSION_TIME}ms)`);
                      return;
                    }
                    
                    // Expand when entering proximity area
                    expansionTimeRef.current.set(key, now);
                    setExpandedHandles(prev => new Set(prev).add(key));
                  }}
                          onMouseLeave={(e) => {
                            // FIXED: Cancel any previous collapse timeout for this handle
                            const existingTimeout = timeoutRefs.current.get(`collapse-${key}`);
                            if (existingTimeout) {
                              clearTimeout(existingTimeout);
                              timeoutRefs.current.delete(`collapse-${key}`);
                            }
                            
                            // FIXED: Prevent rapid collapse that causes flicker
                            const collapseTimeout = setTimeout(() => {
                              // CRITICAL: Use current state, not closure state
                              const currentHoveredHandle = hoveredHandle;
                              const currentExpandedHandles = expandedHandles;
                              
                              // Don't collapse if mouse is on the big dot (white state)
                              if (currentHoveredHandle === key) {
                                // eslint-disable-next-line no-console
                                console.log(`[${key.toUpperCase()}] Green area mouseLeave - but mouse on big dot, keeping expanded`);
                                return;
                              }
                              
                              // Check minimum expansion time to prevent rapid flickering
                              const expansionTime = expansionTimeRef.current.get(key);
                              const now = Date.now();
                              if (expansionTime && (now - expansionTime) < MIN_EXPANSION_TIME) {
                                // eslint-disable-next-line no-console
                                console.log(`[${key.toUpperCase()} DOT] Collapse prevented - too soon (${now - expansionTime}ms < ${MIN_EXPANSION_TIME}ms)`);
                                return;
                              }
                              
                              // FIXED: More generous check - don't collapse if mouse is anywhere near the dots
                              if (mousePos && nodeEl) {
                                const greenAreaSize = 64; // Fixed size in screen pixels (large hover target with slight overlap)
                                const bigDotSize = 16 * nodeScale; // Big dot scales with zoom
                                // Convert hoverAreaPos from CSS pixels to screen pixels for distance comparison
                                const greenCenterX = (typeof hoverAreaPos.left === 'number' ? hoverAreaPos.left : 48) * nodeScale;
                                const greenCenterY = (typeof hoverAreaPos.top === 'number' ? hoverAreaPos.top : 48) * nodeScale;
                                
                                const distFromGreenCenter = Math.sqrt(
                                  Math.pow(mousePos.x - greenCenterX, 2) + 
                                  Math.pow(mousePos.y - greenCenterY, 2)
                                );
                                
                                // Don't collapse if mouse is within green area OR big dot area
                                const maxDistance = Math.max(greenAreaSize / 2, bigDotSize / 2) + 5; // 5px buffer
                                if (distFromGreenCenter <= maxDistance) {
                                  // eslint-disable-next-line no-console
                                  console.log(`[${key.toUpperCase()}] Mouse still near dots (${distFromGreenCenter.toFixed(1)}px <= ${maxDistance}px), keeping expanded`);
                                  return;
                                }
                              }
                              
                              // Mouse truly left the area, safe to collapse
                              // eslint-disable-next-line no-console
                              console.log(`[${key.toUpperCase()}] Safe to collapse - mouse left area`);
                              
                              // FIXED: Record collapse timestamp to prevent rapid re-expansion
                              const collapseTime = Date.now();
                              expansionTimeRef.current.set(`${key}-collapse`, collapseTime);
                              expansionTimeRef.current.delete(key);
                              
                              setExpandedHandles(prev => {
                                const next = new Set(prev);
                                next.delete(key);
                                return next;
                              });
                              
                              // Clean up timeout ref
                              timeoutRefs.current.delete(`collapse-${key}`);
                            }, 50);
                            
                            // Store timeout ref so we can cancel it
                            timeoutRefs.current.set(`collapse-${key}`, collapseTimeout);
                          }}
                />
                
                {/* Wrapper div for positioning - Framer Motion can't override this */}
                <div
                  style={{
                    position: 'absolute',
                    left: '50%',
                    top: '50%',
                    transform: 'translate(-50%, -50%)',
                    pointerEvents: isExpanded ? 'auto' : 'none', // Allow events when expanded so big dot can receive them
                    zIndex: isExpanded ? 2000 : 1 // Higher z-index when expanded
                  }}
                >
                  {/* Visual dot - only handles size, color, and offset transforms */}
                  <motion.div
                    key={key}
                    data-handle={key}
                    style={{
                      position: 'relative', // Relative to wrapper
                      borderRadius: 999,
                      display: isWhite ? 'flex' : 'block',
                      alignItems: isWhite ? 'center' : 'auto',
                      justifyContent: isWhite ? 'center' : 'auto',
                      cursor: 'pointer',
                      pointerEvents: isExpanded ? 'auto' : 'none'
                    }}
                   initial={(() => {
                     const initialValues = {
                       x: (isExpanded || isWhite ? largeCssCx : smallCssCx) - NODE_CENTER,
                       y: (isExpanded || isWhite ? largeCssCy : smallCssCy) - NODE_CENTER,
                       width: isWhite ? 16 : (isExpanded ? 16 : 4),
                       height: isWhite ? 16 : (isExpanded ? 16 : 6),
                       rotate: isWhite ? 0 : (isExpanded ? 0 : rotation),
                       backgroundColor: isWhite ? '#ffffff' : (isExpanded ? 'rgba(66,133,244,0.15)' : 'rgba(66,133,244,0.5)')
                     };
                     
                     // DEBUG: Only log when there's a suspected flicker (width mismatch)
                     if (key === 'top' && mousePos && initialValues.width === 4 && isExpanded) {
                       // eslint-disable-next-line no-console
                       console.log(`🚨 [FLICKER DETECTED] INITIAL showing SMALL when EXPANDED`, {
                         state: { isExpanded, isWhite, hoveredHandle },
                         initialValues,
                         stateString: `${isExpanded ? 'EXP' : 'SMALL'}-${isWhite ? 'WHITE' : 'BLUE'}`
                       });
                     }
                     
                     return initialValues;
                   })()}
                  animate={(() => {
                    const animateValues = {
                      x: (isExpanded || isWhite ? largeCssCx : smallCssCx) - NODE_CENTER,
                      y: (isExpanded || isWhite ? largeCssCy : smallCssCy) - NODE_CENTER,
                      width: isWhite ? 16 : (isExpanded ? 16 : 4),
                      height: isWhite ? 16 : (isExpanded ? 16 : 6),
                      rotate: isWhite ? 0 : (isExpanded ? 0 : rotation),
                      backgroundColor: isWhite ? '#ffffff' : (isExpanded ? 'rgba(66,133,244,0.15)' : 'rgba(66,133,244,0.5)')
                    };
                    
                    // DEBUG: Only log when there's a suspected flicker (width mismatch)
                    if (key === 'top' && mousePos && animateValues.width === 4 && isExpanded) {
                      // eslint-disable-next-line no-console
                      console.log(`🚨 [FLICKER DETECTED] ANIMATE showing SMALL when EXPANDED`, {
                        state: { isExpanded, isWhite, hoveredHandle },
                        animateValues,
                        stateString: `${isExpanded ? 'EXP' : 'SMALL'}-${isWhite ? 'WHITE' : 'BLUE'}`
                      });
                    }
                    
                    return animateValues;
                  })()}
                  transition={{
                    // Only animate the properties that should change for each direction
                    x: (key === 'left' || key === 'right') && !isWhite ? 
                      (isExpanded ? { type: 'spring', stiffness: 7250, damping: 60, mass: 1 } : { duration: 0 }) :
                      { duration: 0 }, // No animation for top/bottom dots
                    y: (key === 'top' || key === 'bottom') && !isWhite ? 
                      (isExpanded ? { type: 'spring', stiffness: 7250, damping: 60, mass: 1 } : { duration: 0 }) :
                      { duration: 0 }, // No animation for left/right dots
                    width: isWhite ? { duration: 0 } : (isExpanded ? { type: 'spring', stiffness: 7250, damping: 60, mass: 1 } : { duration: 0 }),
                    height: isWhite ? { duration: 0 } : (isExpanded ? { type: 'spring', stiffness: 7250, damping: 60, mass: 1 } : { duration: 0 }),
                    rotate: isWhite ? { duration: 0 } : (isExpanded ? { type: 'spring', stiffness: 7250, damping: 60, mass: 1 } : { duration: 0 }),
                    backgroundColor: isWhite ? { duration: 0 } : (isExpanded ? { duration: 0.2 } : { duration: 0 })
                  }}
                             onMouseEnter={() => {
                               if (isExpanded) {
                                 // FIXED: Cancel any pending collapse timeout when entering big dot
                                 const existingTimeout = timeoutRefs.current.get(`collapse-${key}`);
                                 if (existingTimeout) {
                                   clearTimeout(existingTimeout);
                                   timeoutRefs.current.delete(`collapse-${key}`);
                                   // eslint-disable-next-line no-console
                                   console.log(`[${key.toUpperCase()}] Big dot mouseEnter - cancelled pending collapse`);
                                 }
                                 
                                 // DEBUG: Track blue to white dot transition with timing
                                 const timestamp = Date.now();
                                 // eslint-disable-next-line no-console
                                 console.log(`[${key.toUpperCase()} DOT] mouseEnter at ${timestamp} - turning WHITE`, {
                                   isExpanded,
                                   wasHovered: hoveredHandle === key,
                                   currentState: { isExpanded, isWhite: isExpanded && hoveredHandle === key },
                                   aboutToSet: key
                                 });
                                 setHoveredHandle(key);
                                 
                                 // Check if flicker happens during state change
                                 setTimeout(() => {
                                   const newIsWhite = expandedHandles.has(key) && hoveredHandle === key;
                                   // eslint-disable-next-line no-console
                                   console.log(`[${key.toUpperCase()} DOT] State after 10ms:`, {
                                     isExpanded: expandedHandles.has(key),
                                     isWhite: newIsWhite,
                                     hoveredHandle,
                                     expectedWhite: true
                                   });
                                 }, 10);
                               }
                             }}
                  onMouseLeave={(e) => {
                    if (isExpanded) {
                      // DEBUG: Track white to blue dot transition
                      // eslint-disable-next-line no-console
                      console.log(`[${key.toUpperCase()} DOT] mouseLeave on BIG DOT - should turn BLUE`, {
                        isExpanded,
                        wasHovered: hoveredHandle === key,
                        nowClearing: true
                      });
                      
                      // FIXED: Immediately clear hover to turn white -> blue
                      // Green area will handle collapse when mouse leaves entirely
                      setHoveredHandle(null);
                    }
                  }}
                >
                  {/* Border with smooth transition - only visible when white */}
                  {isWhite && (
                    <motion.div
                      style={{
                        position: 'absolute',
                        inset: 0,
                        borderRadius: 'inherit',
                        border: '1px solid #e4e4e4',
                        pointerEvents: 'none'
                      }}
                      initial={{ borderColor: 'rgba(228, 228, 228, 0)' }}
                      animate={{ borderColor: '#e4e4e4' }}
                      transition={{ duration: 0 }}
                    />
                  )}
                  
                  {/* Chevron icon for white state */}
                  {isWhite && (
                    <>
                      {key === 'top' && <ChevronUp size={10} color="#e4e4e4" />}
                      {key === 'right' && <ChevronRight size={10} color="#e4e4e4" />}
                      {key === 'bottom' && <ChevronDown size={10} color="#e4e4e4" />}
                      {key === 'left' && <ChevronLeft size={10} color="#e4e4e4" />}
                    </>
                  )}
                </motion.div>
                </div>
              </>
            );
          })}
        </>
      )}
      {/* Left handles */}
      {leftHandles.map((yPos: string, index: number) => (
        <React.Fragment key={`left-${index}`}>
          <Handle
            type="target"
            position={Position.Left}
            id={`left-${index}-target`}
            style={{ 
              ...baseHandleStyle,
              position: 'absolute',
              top: yPos
            }}
          />
          <Handle
            type="source"
            position={Position.Left}
            id={`left-${index}-source`}
            style={{ 
              ...baseHandleStyle,
              position: 'absolute',
              top: yPos,
              opacity: 0 // Make it invisible but functional
            }}
          />
        </React.Fragment>
      ))}
      
      {/* Right handles */}
      {rightHandles.map((yPos: string, index: number) => (
        <React.Fragment key={`right-${index}`}>
          <Handle
            type="source"
            position={Position.Right}
            id={`right-${index}-source`}
            style={{ 
              ...baseHandleStyle,
              top: yPos
            }}
          />
          <Handle
            type="target"
            position={Position.Right}
            id={`right-${index}-target`}
            style={{ 
              ...baseHandleStyle,
              top: yPos,
              opacity: 0 // Make it invisible but functional
            }}
          />
        </React.Fragment>
      ))}
      
      {/* Top handles */}
      {topHandles.map((xPos: string, index: number) => (
        <React.Fragment key={`top-${index}`}>
          <Handle
            type="source"
            position={Position.Top}
            id={`top-${index}-source`}
            style={{ 
              ...baseHandleStyle,
              left: xPos
            }}
          />
          <Handle
            type="target"
            position={Position.Top}
            id={`top-${index}-target`}
            style={{ 
              ...baseHandleStyle,
              left: xPos,
              opacity: 0 // Make it invisible but functional
            }}
          />
        </React.Fragment>
      ))}
      
      {/* Bottom handles */}
      {bottomHandles.map((xPos: string, index: number) => (
        <React.Fragment key={`bottom-${index}`}>
          <Handle
            type="target"
            position={Position.Bottom}
            id={`bottom-${index}-target`}
            style={{ 
              ...baseHandleStyle,
              left: xPos
            }}
          />
          <Handle
            type="source"
            position={Position.Bottom}
            id={`bottom-${index}-source`}
            style={{ 
              ...baseHandleStyle,
              left: xPos,
              opacity: 0 // Make it invisible but functional
            }}
          />
        </React.Fragment>
      ))}
      
      {/* Node text - always present for editing */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        height: '100%',
        position: 'absolute',
        top: 0,
        left: 0,
        zIndex: 1, // Lower z-index than green hover areas (zIndex: 1000)
        pointerEvents: isEditing ? 'auto' : 'none' // Only interactive when editing
      }}>
        {isEditing ? (
          <input
            ref={inputRef}
            type="text"
            value={label}
            onChange={handleLabelChange}
            onKeyDown={handleKeyDown}
            onBlur={() => {
              lastBlurTimeRef.current = Date.now();
              setIsEditing(false);
              onLabelChange(id, label || ''); // Save empty string if no text
            }}
            placeholder={selected || !label ? "Add text" : ""}
            style={{
              width: '100%',
              height: '100%',
              padding: '0',
              border: 'none',
              borderRadius: '8px',
              textAlign: 'center',
              fontSize: '8px',
              lineHeight: '10px',
              fontFamily: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
              fontWeight: 400,
              color: '#333',
              background: 'transparent',
              outline: 'none',
              resize: 'none',
              cursor: 'text'
            }}
            className="node-text-input"
          />
        ) : label && label.trim() ? (
          <div
            onClick={handleClick}
            style={{
              textAlign: 'center',
              cursor: 'pointer',
              fontSize: '8px',
              lineHeight: '10px',
              fontFamily: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
              fontWeight: 400,
              color: '#000000',
              width: '100%',
              paddingLeft: '10px',
              paddingRight: '10px',
              margin: '0 auto',
              marginTop: '2px',
              wordBreak: 'normal',
              overflowWrap: 'normal',
              boxSizing: 'border-box',
              pointerEvents: 'auto' // Allow double-click to edit
            }}
          >
            {/* Render each line manually to match ELK calculation */}
            {(() => {
              const lines = splitTextIntoLines(label, 76);
              return lines.map((line, index) => (
                <div key={index} style={{ 
                  lineHeight: '10px',
                  width: '100%',
                  textAlign: 'center',
                  overflow: 'hidden',
                  whiteSpace: 'nowrap',
                  textOverflow: 'ellipsis'
                }}>
                  {line}
                </div>
              ));
            })()}
          </div>
        ) : null}
      </div>
    </div>
    </>
  );
};

export default CustomNode; 