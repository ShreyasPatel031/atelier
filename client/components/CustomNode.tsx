import React, { useEffect, useState } from 'react';
import { Handle, Position } from 'reactflow';
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
      } else {
        console.log(`❌ Provider icon category not found: ${iconName} (${provider})`);
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
            console.log(`✅ General icon loaded: ${iconName} (${iconPath})`);
            return fullIconUrl;
          }
        } catch (error) {
          // Try next path
        }
      }
      console.log(`❌ General icon not found: ${iconName}`);
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
                  console.log(`🔍 Semantic fallback found: ${data.icon} → ${fallbackIcon}`);
                  try {
                    const fallbackPath = await tryLoadIcon(fallbackIcon);
                    setFinalIconSrc(fallbackPath);
                    setIconLoaded(true);
                    setIconError(false);
                    console.log(`✅ Fallback SUCCESS: ${data.icon} → ${fallbackIcon} (loaded: ${fallbackPath})`);
                  } catch (error) {
                    console.log(`❌ Fallback FAILED to load: ${fallbackIcon}`, error);
                  }
                } else {
                  console.log(`❌ No semantic fallback found for: ${data.icon}`);
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
              console.log(`🔍 Node ID semantic fallback found: ${id} → ${fallbackIcon}`);
              try {
                const fallbackPath = await tryLoadIcon(fallbackIcon);
                setFinalIconSrc(fallbackPath);
                setIconLoaded(true);
                setIconError(false);
                console.log(`✅ Node ID fallback SUCCESS: ${id} → ${fallbackIcon} (loaded: ${fallbackPath})`);
              } catch (error) {
                console.log(`❌ Node ID fallback FAILED to load: ${fallbackIcon}`, error);
              }
            } else {
              console.log(`❌ No semantic fallback found for node ID: ${id}`);
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
    background: selected ? '#f8f9fa' : 'white',
    border: selected ? '2px solid #6c757d' : '1px solid #ccc',
    borderRadius: '4px',
    padding: '0px', // Remove padding to center content properly
    width: data.width || 80,
    height: data.height || 40,
    display: 'flex',
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
    fontSize: '12px',
    boxShadow: selected ? '0 0 5px rgba(0, 0, 0, 0.3)' : '0 1px 4px rgba(0, 0, 0, 0.1)',
    position: 'relative' as const,
    zIndex: selected ? 100 : 50,
    pointerEvents: 'all' as const
  };

  return (
    <div style={nodeStyle} data-testid="react-flow-node">
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
      
      {/* Node icon and label */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-start',
        width: '100%',
        height: '100%',
        position: 'relative'
      }}>
        {/* Icon container - FIXED: 48x48 square for all icons */}
        <div style={{
          width: '48px',
          height: '48px',
          borderRadius: data.icon ? '8px' : '8px', // Square for all icons
          backgroundColor: finalIconSrc && !iconError ? 'transparent' : '#f0f0f0',
          border: finalIconSrc && !iconError ? 'none' : '2px solid #ddd',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#333',
          fontWeight: 'bold',
          fontSize: '16px',
          marginTop: '12px', // Adjust for removed container padding
          overflow: 'hidden'
        }}>
          {finalIconSrc && !iconError && (
            <img
              key={`${id}-${finalIconSrc}`}
              src={finalIconSrc}
              alt={data.label}
              style={{ 
                width: '100%', 
                height: '100%', 
                objectFit: 'contain'
              }}
              onError={() => setIconError(true)}
            />
          )}
          {(!finalIconSrc || iconError) && id !== 'root' && (
            <div style={{ 
              color: '#ff0000', 
              fontSize: '12px', 
              fontWeight: 'bold',
              textAlign: 'center',
              lineHeight: '1.2'
            }}>
              ❌<br/>MISSING<br/>ICON
            </div>
          )}
        </div>
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
        ) : (
          <div
            onDoubleClick={handleDoubleClick}
            style={{
              textAlign: 'center',
              cursor: 'pointer',
              fontSize: '12px',
              lineHeight: '14px',
              fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
              fontWeight: 'normal',
              width: '100px', // Match the full node width for better centering
              paddingLeft: '12px', // Add horizontal padding for breathing room
              paddingRight: '12px',
              margin: '0 auto',
              marginTop: '12px', // Direct 12px gap between icon and text
              wordBreak: 'normal',
              overflowWrap: 'normal',
              boxSizing: 'border-box' // Include padding in width calculation
            }}
          >
            {/* Render each line manually to match ELK calculation */}
            {(() => {
              const lines = splitTextIntoLines(label, 76);
              return lines.map((line, index) => (
                <div key={index} style={{ 
                  lineHeight: '14px',
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
        )}
      </div>
    </div>
  );
};

export default CustomNode; 