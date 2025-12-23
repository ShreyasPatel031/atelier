import React, { useEffect, useState, useRef } from 'react';
import { iconLists } from '../generated/iconLists';
import { iconFallbackService } from '../utils/iconFallbackService';
import { iconCacheService } from '../utils/iconCacheService';
import { useApiEndpoint, buildAssetUrl } from '../contexts/ApiEndpointContext';
import { splitTextIntoLines } from '../utils/textMeasurement';
import SelectedNodeDots from './node/SelectedNodeDots';
import ConnectorDots from './node/ConnectorDots';
import NodeHandles from './node/NodeHandles';
import { useNodeStyle } from '../contexts/NodeStyleContext';
import { useNodeInteractions } from '../contexts/NodeInteractionContext';
import { NODE_WIDTH_PX, NODE_HEIGHT_BASE_PX, NODE_BORDER_RADIUS_PX, NODE_BORDER_COLOR } from '../utils/nodeConstants';
import { CANVAS_STYLES } from './graph/styles/canvasStyles';

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
}

const CustomNode: React.FC<CustomNodeProps> = ({ data, id, selected }) => {
  // Force re-render when visual options change
  const [visualOptionsVersion, setVisualOptionsVersion] = useState(0);
  
  useEffect(() => {
    const handleVisualOptionsChange = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      console.log(`[CustomNode ${id}] visualOptionsChanged event received:`, detail);
      setVisualOptionsVersion(prev => prev + 1);
    };
    
    if (typeof window !== 'undefined') {
      window.addEventListener('visualOptionsChanged', handleVisualOptionsChange);
      return () => {
        window.removeEventListener('visualOptionsChanged', handleVisualOptionsChange);
      };
    }
  }, [id]);
  
  // Get interaction state from context (selectedTool, connectingFrom, etc.)
  const nodeInteractions = useNodeInteractions();
  
  const selectedTool = nodeInteractions?.selectedTool || 'select';
  const connectingFrom = nodeInteractions?.connectingFrom ?? null;
  const connectingFromHandle = nodeInteractions?.connectingFromHandle ?? null;
  const onConnectorDotClick = nodeInteractions?.handleConnectorDotClick;
  const onLabelChange = nodeInteractions?.handleLabelChange || (() => {});
  const { leftHandles = [], rightHandles = [], topHandles = [], bottomHandles = [] } = data;
  const { settings } = useNodeStyle();
  
  const [isEditing, setIsEditing] = useState(data.isEditing || (!data.label || data.label === 'Add text'));
  const [label, setLabel] = useState(!data.label || data.label === 'Add text' ? '' : data.label);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const lastBlurTimeRef = useRef<number>(0);
  const [iconLoaded, setIconLoaded] = useState(false);
  const [iconError, setIconError] = useState(false);
  const [finalIconSrc, setFinalIconSrc] = useState<string | undefined>(undefined);
  const [fallbackAttempted, setFallbackAttempted] = useState(false);
  const apiEndpoint = useApiEndpoint();

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
      // Check if icon exists in iconLists first - GENERIC icons checked FIRST
      const prefixMatch = data.icon.match(/^(aws|gcp|azure)_(.+)$/);
      let iconExistsInLists = false;
      
      // ALWAYS check generic icons FIRST (even if there's a prefix)
      // This ensures generic/Lucide icons are prioritized over provider icons
      const iconNameToCheck = prefixMatch ? prefixMatch[2] : data.icon;
      if (iconLists.generic.includes(iconNameToCheck)) {
        iconExistsInLists = true;
      } else if (prefixMatch) {
        // If not in generic and has prefix, check provider icons
        const [, provider, actualIconName] = prefixMatch;
        const category = findIconCategory(provider, actualIconName);
        iconExistsInLists = category !== null;
      }
      
      // If icon is not in iconLists, immediately try fallback (always find closest match)
      if (!iconExistsInLists && !fallbackAttempted) {
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
                // Fallback icon failed - try original as last resort
                tryLoadIcon(data.icon)
                  .then((path) => {
                    setFinalIconSrc(path);
                    setIconLoaded(true);
                    setIconError(false);
                  })
                  .catch(() => {
                    setIconError(true);
                  });
              }
            } else {
              // No fallback found - try original
              tryLoadIcon(data.icon)
                .then((path) => {
                  setFinalIconSrc(path);
                  setIconLoaded(true);
                  setIconError(false);
                })
                .catch(() => {
                  setIconError(true);
                });
            }
          })
          .catch((error) => {
            console.error(`💥 Semantic fallback error for ${data.icon}:`, error);
            // Try original as fallback
            tryLoadIcon(data.icon)
              .then((path) => {
                setFinalIconSrc(path);
                setIconLoaded(true);
                setIconError(false);
              })
              .catch(() => {
                setIconError(true);
              });
          });
      } else {
        // Icon exists in lists - try to load it
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
      }
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
    setLabel(!data.label || data.label === 'Add text' ? '' : data.label);
  }, [data.label]);

  // CRITICAL: DO NOT auto-enter edit mode on selection - this causes icon/text to move
  // Only change cursor on selection, user must click to edit
  // This prevents layout shifts that cause icon/text to jump around
  useEffect(() => {
    // Only clear editing state when node is deselected
    if (!selected && isEditing) {
      // Clear editing state when node is deselected
      setIsEditing(false);
    }
    // DO NOT auto-enter edit mode on selection - user must click to edit
  }, [selected, isEditing]);

  // Focus input when entering edit mode
  useEffect(() => {
    if (isEditing && inputRef.current) {
      const timer = setTimeout(() => {
        if (inputRef.current) {
          const textarea = inputRef.current;
          textarea.focus();
          // Move cursor to end of text instead of start
          const textLength = textarea.value.length;
          // Use requestAnimationFrame to ensure focus is applied before setting selection
          requestAnimationFrame(() => {
            if (textarea) {
              textarea.setSelectionRange(textLength, textLength);
            }
          });
          // Auto-resize textarea to fit content
          textarea.style.height = 'auto';
          textarea.style.height = `${textarea.scrollHeight}px`;
        }
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [isEditing, label]);

  const handleLabelChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newLabel = e.target.value;
    setLabel(newLabel);
    
    // Auto-resize textarea to fit content - ResizeObserver will handle node height
    const textarea = e.target;
    textarea.style.height = 'auto';
    textarea.style.height = `${textarea.scrollHeight}px`;
  };

  // On Escape: exit edit mode, Enter allows new lines
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Escape') {
      lastBlurTimeRef.current = Date.now();
      setIsEditing(false);
      onLabelChange(id, label || '');
      if (!label.trim()) {
        onLabelChange(id, '');
      }
    }
    // Enter key now creates new lines (default textarea behavior)
  };

  const handleClick = () => {
    if (!isEditing) {
      setIsEditing(true);
    }
  };

  // State declarations must come BEFORE useEffects that use them
  const [nodeEl, setNodeEl] = useState<HTMLDivElement | null>(null);
  const [nodeScale, setNodeScale] = useState<number>(1);
  const [actualNodeWidth, setActualNodeWidth] = useState<number>(data.width || NODE_WIDTH_PX);
  const [actualNodeHeight, setActualNodeHeight] = useState<number>(NODE_HEIGHT_BASE_PX);

  // Get visual debug options if available
  // Re-read CANVAS_STYLES when visualOptionsVersion changes to get updated values
  // The visualOptionsVersion dependency ensures React re-renders when it changes
  // Force dependency on visualOptionsVersion to ensure React detects changes
  const _ = visualOptionsVersion; // Force dependency on visual options version
  const currentNodeStyle = CANVAS_STYLES.nodes.default;
  const nodeBgColor = currentNodeStyle.background || 'white';
  
  const nodeStrokeColor = currentNodeStyle.border || NODE_BORDER_COLOR;
  
  const nodeStyle = {
    background: nodeBgColor, // Use visual debug option or default white
    border: `1px solid ${nodeStrokeColor}`, // Use visual options stroke color
    borderRadius: `${NODE_BORDER_RADIUS_PX}px`,
    padding: '0px',
    // Width fixed, height auto-sizes to content unless explicit height provided
    width: data.width || NODE_WIDTH_PX,
    height: data.height, // Respect explicit height from ELK if provided
    minHeight: NODE_HEIGHT_BASE_PX,
    boxSizing: 'border-box' as const,
    display: 'flex',
    flexDirection: 'column' as const,
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
    fontSize: '12px',
    boxShadow: 'none', // No shadow from Figma
    position: 'relative' as const,
    zIndex: selected ? 100 : 50,
    pointerEvents: 'all' as const
  };

  
  // Update actual node dimensions when data changes or node resizes
  useEffect(() => {
    if (!nodeEl) return;
    
    const updateDimensions = () => {
      // Get the computed style to get the actual CSS dimensions (accounting for inline styles)
      const computedStyle = window.getComputedStyle(nodeEl);
      const width = parseFloat(computedStyle.width) || data.width || NODE_WIDTH_PX;
      const height = parseFloat(computedStyle.height) || NODE_HEIGHT_BASE_PX;
      setActualNodeWidth(width);
      setActualNodeHeight(height);
    };
    
    // Initial update
    updateDimensions();
    
    // Watch for size changes
    const resizeObserver = new ResizeObserver(() => {
      requestAnimationFrame(updateDimensions);
    });
    
    resizeObserver.observe(nodeEl);
    
    return () => {
      resizeObserver.disconnect();
    };
  }, [nodeEl, data.width]);

  // FIXED: Recalculate nodeScale on zoom changes using ResizeObserver
  useEffect(() => {
    if (!nodeEl) return;
    
    const cssWidth = actualNodeWidth; // Use actual rendered width
    
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
  }, [nodeEl, actualNodeWidth]);
  


  return (
    <>
      <style>
        {`
          .node-text-input::placeholder {
            color: #e4e4e4;
            opacity: 1;
          }
          @keyframes blink {
            0%, 49% { opacity: 1; }
            50%, 100% { opacity: 0; }
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
        onClick={undefined}
        onMouseDown={undefined}
        onMouseUp={undefined}
        onPointerDown={undefined}
        onPointerUp={undefined}
      >
      {/* Selected node dots - shown when node is selected */}
      {selected && (
        <SelectedNodeDots 
          nodeId={id} 
          nodeEl={nodeEl}
          nodeScale={nodeScale}
          nodeWidth={actualNodeWidth}
          nodeHeight={actualNodeHeight}
          onConnectorDotClick={onConnectorDotClick}
        />
      )}
      
      {/* Connector mode dots - always render handles for ReactFlow, but only show visual dots when connector tool is active */}
      <ConnectorDots 
        nodeId={id} 
        nodeWidth={data.width || NODE_WIDTH_PX}
        nodeHeight={data.height || NODE_HEIGHT_BASE_PX}
        connectingFrom={connectingFrom}
        connectingFromHandle={connectingFromHandle}
        onHandleClick={onConnectorDotClick}
        showVisualDots={selectedTool === 'connector'}
      />
      
      {/* Edge connection handles */}
      <NodeHandles
        leftHandles={leftHandles}
        rightHandles={rightHandles}
        topHandles={topHandles}
        bottomHandles={bottomHandles}
      />
      
      {/* Node text - always present for editing */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        flex: 1,
        zIndex: 1, // Lower z-index than green hover areas (zIndex: 1000)
        pointerEvents: isEditing ? 'auto' : 'none', // Only interactive when editing
        boxSizing: 'border-box',
        paddingLeft: `${settings.nodePaddingHorizontal}px`,
        paddingRight: `${settings.nodePaddingHorizontal}px`,
      }}>
        {isEditing ? (
          <div 
            style={{
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center', // FIXED: Keep same as non-editing to prevent icon/text movement
              boxSizing: 'border-box',
              gap: iconLoaded && finalIconSrc && (label && label.trim()) ? `${settings.textPadding}px` : '0',
            }}>
            {iconLoaded && finalIconSrc && (
              <img 
                src={finalIconSrc}
                alt="" 
                style={{ 
                  width: `${settings.iconSize}px`,
                  height: `${settings.iconSize}px`,
                  objectFit: 'contain',
                  flexShrink: 0
                }}
              />
            )}
            <textarea
              ref={inputRef}
              value={label}
              onChange={handleLabelChange}
              onKeyDown={handleKeyDown}
              onBlur={() => {
                lastBlurTimeRef.current = Date.now();
                setIsEditing(false);
                onLabelChange(id, label || '');
              }}
              placeholder={!label || !label.trim() ? "Add text" : ""}
              style={{
                width: '100%',
                maxWidth: '100%',
                minHeight: label ? 'auto' : '10px',
                padding: '0',
                boxSizing: 'border-box',
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
                cursor: 'text',
                overflow: 'hidden',
                whiteSpace: 'pre-wrap',
                wordWrap: 'break-word',
                flexShrink: 0
              }}
              className="node-text-input"
            />
          </div>
        ) : (
          <div
            onClick={handleClick}
            style={{
              textAlign: 'center',
              cursor: selected ? 'text' : 'pointer',
              fontSize: '8px',
              lineHeight: '10px',
              fontFamily: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
              fontWeight: 400,
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              boxSizing: 'border-box',
              pointerEvents: 'auto',
              wordBreak: 'break-word',
              overflowWrap: 'break-word',
              whiteSpace: 'pre-wrap',
              gap: (label && label.trim()) && iconLoaded ? `${settings.textPadding}px` : '0',
            }}
          >
            {iconLoaded && finalIconSrc && (
              <img 
                src={finalIconSrc} 
                alt="" 
                style={{
                  width: `${settings.iconSize}px`,
                  height: `${settings.iconSize}px`,
                  objectFit: 'contain',
                  flexShrink: 0
                }}
              />
            )}
            {label && label.trim() ? (
              <div style={{ width: '100%', color: '#000000', position: 'relative', display: 'inline-block' }}>
                {label}
                {/* Show blinking cursor when selected */}
                {selected && (
                  <span 
                    style={{
                      display: 'inline-block',
                      width: '1px',
                      height: '10px',
                      backgroundColor: '#333',
                      marginLeft: '1px',
                      animation: 'blink 1s infinite',
                      verticalAlign: 'baseline',
                    }}
                  />
                )}
              </div>
            ) : (
              <div style={{ width: '100%', color: '#e4e4e4', position: 'relative', display: 'inline-block' }}>
                Add text
                {/* Show blinking cursor when selected and no text */}
                {selected && (
                  <span 
                    style={{
                      display: 'inline-block',
                      width: '1px',
                      height: '10px',
                      backgroundColor: '#e4e4e4',
                      marginLeft: '1px',
                      animation: 'blink 1s infinite',
                      verticalAlign: 'baseline',
                    }}
                  />
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
    </>
  );
};

export default CustomNode; 