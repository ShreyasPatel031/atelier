import React, { useState } from "react";

interface NodeIconProps {
  state?: 'default' | 'hover' | 'selected';
  size?: number;
  className?: string;
}

const NodeIcon: React.FC<NodeIconProps> = ({ 
  state = 'default', 
  size = 16,
  className = ""
}) => {
  const [isHovered, setIsHovered] = useState(false);
  
  // Determine the current state
  const currentState = state === 'selected' ? 'selected' : 
                      (isHovered || state === 'hover') ? 'hover' : 'default';

  const baseClasses = "relative inline-flex items-center justify-center";
  const sizeClasses = `w-${size} h-${size}`;

  // Resize handle component - matches Figma design exactly
  const ResizeHandle: React.FC<{ position: string }> = ({ position }) => (
    <div 
      className={`absolute bg-white border border-blue-500 rounded-sm ${position}`}
      style={{ 
        borderColor: '#4285f4',
        borderWidth: '0.5px',
        width: '8px',
        height: '8px'
      }}
    />
  );

  // Edge resize handle - matches the blue pill design from Figma
  const EdgeHandle: React.FC<{ position: string; rotation: number }> = ({ position, rotation }) => (
    <div 
      className={`absolute ${position}`}
      style={{ transform: `rotate(${rotation}deg)` }}
    >
      <div 
        className="bg-blue-500 bg-opacity-25 border border-white rounded-full"
        style={{
          width: '5px',
          height: '7px'
        }}
      />
    </div>
  );

  return (
    <div 
      className={`${baseClasses} ${sizeClasses} ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Main box container - matches Figma Default frame */}
      <div 
        className={`
          relative bg-white border border-gray-300 rounded-lg flex items-center justify-center
          ${currentState === 'selected' ? 'border-blue-500' : ''}
          ${currentState === 'hover' ? 'bg-gray-100 bg-opacity-50' : ''}
        `}
        style={{
          width: size,
          height: size,
          borderColor: currentState === 'selected' ? '#4285f4' : '#e4e4e4',
          borderWidth: currentState === 'selected' ? '2px' : '1px',
          borderRadius: '8px',
          backgroundColor: currentState === 'hover' ? 'rgba(228, 228, 228, 0.5)' : 'white'
        }}
      >
        {/* Icon placeholder - represents the image from Figma */}
        <div 
          className="bg-gray-400 rounded-sm"
          style={{
            width: size * 0.5,
            height: size * 0.5
          }}
        />
      </div>

      {/* Resize handles - only show when selected, matches Figma Select frame */}
      {currentState === 'selected' && (
        <>
          {/* Corner handles - small blue squares */}
          <ResizeHandle position="-top-1 -left-1" />
          <ResizeHandle position="-top-1 -right-1" />
          <ResizeHandle position="-bottom-1 -left-1" />
          <ResizeHandle position="-bottom-1 -right-1" />
          
          {/* Edge handles - blue pills */}
          <EdgeHandle position="-top-1 left-1/2 transform -translate-x-1/2" rotation={0} />
          <EdgeHandle position="-bottom-1 left-1/2 transform -translate-x-1/2" rotation={180} />
          <EdgeHandle position="-left-1 top-1/2 transform -translate-y-1/2" rotation={270} />
          <EdgeHandle position="-right-1 top-1/2 transform -translate-y-1/2" rotation={90} />
        </>
      )}
    </div>
  );
};

export default NodeIcon;
