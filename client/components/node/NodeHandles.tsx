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
  // Compensate for 1px border because handles are positioned relative to padding box
  // With translate(-50%, -50%), we target the exact outer boundary (0 or 100% + offset)
  const BORDER_OFFSET = 1;

  return (
    <>
      {/* Left handles */}
      {leftHandles.map((yPos: any, index: number) => (
        <React.Fragment key={`left-${index}`}>
          <Handle
            type="target"
            position={Position.Left}
            id={`left-${index}-target`}
            style={{ 
              ...baseHandleStyle,
              position: 'absolute',
              top: typeof yPos === 'number' ? yPos - BORDER_OFFSET : `calc(${yPos} - ${BORDER_OFFSET}px)`,
              left: -BORDER_OFFSET
            }}
          />
          <Handle
            type="source"
            position={Position.Left}
            id={`left-${index}-source`}
            style={{ 
              ...baseHandleStyle,
              position: 'absolute',
              top: typeof yPos === 'number' ? yPos - BORDER_OFFSET : `calc(${yPos} - ${BORDER_OFFSET}px)`,
              left: -BORDER_OFFSET,
              opacity: 0 // Make it invisible but functional
            }}
          />
        </React.Fragment>
      ))}
      
      {/* Right handles */}
      {rightHandles.map((yPos: any, index: number) => (
        <React.Fragment key={`right-${index}`}>
          <Handle
            type="source"
            position={Position.Right}
            id={`right-${index}-source`}
            style={{ 
              ...baseHandleStyle,
              top: typeof yPos === 'number' ? yPos - BORDER_OFFSET : `calc(${yPos} - ${BORDER_OFFSET}px)`,
              left: `calc(100% + ${BORDER_OFFSET}px)`
            }}
          />
          <Handle
            type="target"
            position={Position.Right}
            id={`right-${index}-target`}
            style={{ 
              ...baseHandleStyle,
              top: typeof yPos === 'number' ? yPos - BORDER_OFFSET : `calc(${yPos} - ${BORDER_OFFSET}px)`,
              left: `calc(100% + ${BORDER_OFFSET}px)`,
              opacity: 0 // Make it invisible but functional
            }}
          />
        </React.Fragment>
      ))}
      
      {/* Top handles */}
      {topHandles.map((xPos: any, index: number) => (
        <React.Fragment key={`top-${index}`}>
          <Handle
            type="source"
            position={Position.Top}
            id={`top-${index}-source`}
            style={{ 
              ...baseHandleStyle,
              left: typeof xPos === 'number' ? xPos - BORDER_OFFSET : `calc(${xPos} - ${BORDER_OFFSET}px)`,
              top: -BORDER_OFFSET
            }}
          />
          <Handle
            type="target"
            position={Position.Top}
            id={`top-${index}-target`}
            style={{ 
              ...baseHandleStyle,
              left: typeof xPos === 'number' ? xPos - BORDER_OFFSET : `calc(${xPos} - ${BORDER_OFFSET}px)`,
              top: -BORDER_OFFSET,
              opacity: 0 // Make it invisible but functional
            }}
          />
        </React.Fragment>
      ))}
      
      {/* Bottom handles */}
      {bottomHandles.map((xPos: any, index: number) => (
        <React.Fragment key={`bottom-${index}`}>
          <Handle
            type="target"
            position={Position.Bottom}
            id={`bottom-${index}-target`}
            style={{ 
              ...baseHandleStyle,
              left: typeof xPos === 'number' ? xPos - BORDER_OFFSET : `calc(${xPos} - ${BORDER_OFFSET}px)`,
              top: `calc(100% + ${BORDER_OFFSET}px)`
            }}
          />
          <Handle
            type="source"
            position={Position.Bottom}
            id={`bottom-${index}-source`}
            style={{ 
              ...baseHandleStyle,
              left: typeof xPos === 'number' ? xPos - BORDER_OFFSET : `calc(${xPos} - ${BORDER_OFFSET}px)`,
              top: `calc(100% + ${BORDER_OFFSET}px)`,
              opacity: 0 // Make it invisible but functional
            }}
          />
        </React.Fragment>
      ))}
    </>
  );
};

export default NodeHandles;

