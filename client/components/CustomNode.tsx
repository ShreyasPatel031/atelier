import React, { useEffect, useState, useRef } from 'react';
import { iconLists } from '../generated/iconLists';
import { iconFallbackService } from '../utils/iconFallbackService';
import { iconCacheService } from '../utils/iconCacheService';
import { useApiEndpoint, buildAssetUrl } from '../contexts/ApiEndpointContext';
import { splitTextIntoLines } from '../utils/textMeasurement';
import SelectedNodeDots from './node/SelectedNodeDots';
import ConnectorDots from './node/ConnectorDots';
import NodeHandles from './node/NodeHandles';

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
  selectedTool?: 'select' | 'box' | 'connector' | 'group';
  connectingFrom?: string | null;
  connectingFromHandle?: string | null;
  onConnectorDotClick?: (nodeId: string, handleId: string) => void;
}

const CustomNode: React.FC<CustomNodeProps> = ({ data, id, selected, onLabelChange, selectedTool = 'select', connectingFrom, connectingFromHandle, onConnectorDotClick }) => {
  const { leftHandles = [], rightHandles = [], topHandles = [], bottomHandles = [] } = data;
  
  const [isEditing, setIsEditing] = useState(data.isEditing);
  const [label, setLabel] = useState(data.label);
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

  const handleLabelChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLabel(e.target.value);
  };

  // On Enter: commit label - no manual icon fetching
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      setIsEditing(false);
      onLabelChange(id, label);
      // Let the useEffect handle icon loading based on the new label
    }
  };

  // No debounced icon updates while editing - let semantic fallback handle it

  const handleDoubleClick = () => {
    setIsEditing(true);
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
  const [nodeScale, setNodeScale] = useState<number>(1);
  
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
  


  return (
    <div 
      style={nodeStyle} 
      data-testid="react-flow-node" 
      ref={(el) => {
        setNodeEl(el);
        // Scale calculation now handled by ResizeObserver in useEffect
      }}
    >
      {/* Connector mode dots - shown when connector tool is selected (NOT when just selected) */}
      {selectedTool === 'connector' && (
        <ConnectorDots 
          nodeId={id} 
          nodeWidth={data.width || 96}
          connectingFrom={connectingFrom}
          connectingFromHandle={connectingFromHandle}
          onHandleClick={onConnectorDotClick}
        />
      )}
      
      {/* Edge connection handles */}
      <NodeHandles
        leftHandles={leftHandles}
        rightHandles={rightHandles}
        topHandles={topHandles}
        bottomHandles={bottomHandles}
      />
      
      {/* Node text - only show if data provided, center aligned */}
      {data.label && (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        height: '100%',
        position: 'relative',
        zIndex: 1, // Lower z-index than green hover areas (zIndex: 1000)
        pointerEvents: 'auto' // Allow text interaction
      }}>
        {isEditing ? (
          <input
            type="text"
            value={label}
            onChange={handleLabelChange}
            onKeyDown={handleKeyDown}
            autoFocus
            style={{
              width: '100%',
              padding: '4px',
              border: '1px solid #ccc',
              borderRadius: '4px',
              textAlign: 'center',
            }}
          />
        ) : data.label ? (
          <div
            onDoubleClick={handleDoubleClick}
            style={{
              textAlign: 'center',
              cursor: 'pointer',
              fontSize: '8px',
              lineHeight: '10px',
              fontFamily: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
              fontWeight: 400,
              color: '#e4e4e4',
              width: '100%',
              paddingLeft: '10px',
              paddingRight: '10px',
              margin: '0 auto',
              marginTop: '2px',
              wordBreak: 'normal',
              overflowWrap: 'normal',
              boxSizing: 'border-box'
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
      )}
    </div>
  );
};

export default CustomNode; 