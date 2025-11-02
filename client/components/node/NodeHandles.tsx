import React from 'react';
import { Handle, Position } from 'reactflow';
import { baseHandleStyle } from '../graph/handles';

interface NodeHandlesProps {
  leftHandles?: string[];
  rightHandles?: string[];
  topHandles?: string[];
  bottomHandles?: string[];
}

const NodeHandles: React.FC<NodeHandlesProps> = ({
  leftHandles = [],
  rightHandles = [],
  topHandles = [],
  bottomHandles = []
}) => {
  return (
    <>
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
    </>
  );
};

export default NodeHandles;

