import React, { useState, useEffect, useMemo } from 'react';
import { Node, Edge } from 'reactflow';

interface EdgeDebugInfo {
  edgeId: string;
  sourceNodeId: string;
  targetNodeId: string;
  sourceNodeInfo: {
    id: string;
    x: number;
    y: number;
    width: number;
    height: number;
  };
  targetNodeInfo: {
    id: string;
    x: number;
    y: number;
    width: number;
    height: number;
  };
  handlePositions: {
    sourceX: number;
    sourceY: number;
    targetX: number;
    targetY: number;
  };
  waypoints: Array<{ x: number; y: number }>;
  path: string;
}

interface EdgeDebugViewerProps {
  nodes: Node[];
  edges: Edge[];
  selectedNodeIds: string[];
}

export const EdgeDebugViewer: React.FC<EdgeDebugViewerProps> = ({ nodes, edges, selectedNodeIds }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [debugInfo, setDebugInfo] = useState<EdgeDebugInfo[]>([]);

  // Find edges connected to selected nodes
  useEffect(() => {
    if (selectedNodeIds.length === 0) {
      setDebugInfo([]);
      return;
    }

    const connectedEdges = edges.filter(edge => 
      selectedNodeIds.includes(edge.source) || selectedNodeIds.includes(edge.target)
    );

    const info: EdgeDebugInfo[] = connectedEdges.map(edge => {
      const sourceNode = nodes.find(n => n.id === edge.source);
      const targetNode = nodes.find(n => n.id === edge.target);

      if (!sourceNode || !targetNode) return null;

      const sourceNodeInfo = {
        id: sourceNode.id,
        x: sourceNode.position.x,
        y: sourceNode.position.y,
        width: sourceNode.data?.width || sourceNode.width || 96,
        height: sourceNode.data?.height || sourceNode.height || 96,
      };

      const targetNodeInfo = {
        id: targetNode.id,
        x: targetNode.position.x,
        y: targetNode.position.y,
        width: targetNode.data?.width || targetNode.width || 96,
        height: targetNode.data?.height || targetNode.height || 96,
      };

      // Estimate handle positions (would need ReactFlow ref for exact positions)
      const sourceHandle = edge.sourceHandle || 'right-0-source';
      const targetHandle = edge.targetHandle || 'left-0-target';
      
      // Estimate handle positions based on handle type
      let sourceX = sourceNodeInfo.x + sourceNodeInfo.width;
      let sourceY = sourceNodeInfo.y + sourceNodeInfo.height / 2;
      let targetX = targetNodeInfo.x;
      let targetY = targetNodeInfo.y + targetNodeInfo.height / 2;

      if (sourceHandle.includes('left')) {
        sourceX = sourceNodeInfo.x;
      } else if (sourceHandle.includes('right')) {
        sourceX = sourceNodeInfo.x + sourceNodeInfo.width;
      }
      if (sourceHandle.includes('top')) {
        sourceY = sourceNodeInfo.y;
      } else if (sourceHandle.includes('bottom')) {
        sourceY = sourceNodeInfo.y + sourceNodeInfo.height;
      }

      if (targetHandle.includes('left')) {
        targetX = targetNodeInfo.x;
      } else if (targetHandle.includes('right')) {
        targetX = targetNodeInfo.x + targetNodeInfo.width;
      }
      if (targetHandle.includes('top')) {
        targetY = targetNodeInfo.y;
      } else if (targetHandle.includes('bottom')) {
        targetY = targetNodeInfo.y + targetNodeInfo.height;
      }

      const waypoints = edge.data?.bendPoints || edge.data?.waypoints || [];
      
      return {
        edgeId: edge.id,
        sourceNodeId: edge.source,
        targetNodeId: edge.target,
        sourceNodeInfo,
        targetNodeInfo,
        handlePositions: {
          sourceX,
          sourceY,
          targetX,
          targetY,
        },
        waypoints,
        path: edge.data?.path || 'N/A',
      };
    }).filter(Boolean) as EdgeDebugInfo[];

    setDebugInfo(info);
  }, [nodes, edges, selectedNodeIds]);

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 bg-blue-600 text-white px-4 py-2 rounded shadow-lg z-50"
      >
        Debug Edges
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 bg-white border-2 border-gray-300 rounded-lg shadow-xl z-50 w-96 max-h-96 overflow-auto p-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-bold text-lg">Edge Debug Viewer</h3>
        <button
          onClick={() => setIsOpen(false)}
          className="text-gray-500 hover:text-gray-700"
        >
          ×
        </button>
      </div>

      {selectedNodeIds.length === 0 ? (
        <p className="text-gray-500">Select nodes to see edge debug info</p>
      ) : debugInfo.length === 0 ? (
        <p className="text-gray-500">No edges connected to selected nodes</p>
      ) : (
        <div className="space-y-4">
          {debugInfo.map((info) => (
            <div key={info.edgeId} className="border-b pb-4">
              <h4 className="font-semibold text-sm mb-2">Edge: {info.edgeId}</h4>
              
              <div className="text-xs space-y-1">
                <div>
                  <strong>Source Node:</strong> {info.sourceNodeId}
                  <br />
                  Position: ({info.sourceNodeInfo.x.toFixed(1)}, {info.sourceNodeInfo.y.toFixed(1)})
                  <br />
                  Size: {info.sourceNodeInfo.width} × {info.sourceNodeInfo.height}
                  <br />
                  Handle: ({info.handlePositions.sourceX.toFixed(1)}, {info.handlePositions.sourceY.toFixed(1)})
                </div>
                
                <div className="mt-2">
                  <strong>Target Node:</strong> {info.targetNodeId}
                  <br />
                  Position: ({info.targetNodeInfo.x.toFixed(1)}, {info.targetNodeInfo.y.toFixed(1)})
                  <br />
                  Size: {info.targetNodeInfo.width} × {info.targetNodeInfo.height}
                  <br />
                  Handle: ({info.handlePositions.targetX.toFixed(1)}, {info.handlePositions.targetY.toFixed(1)})
                </div>

                <div className="mt-2">
                  <strong>Waypoints ({info.waypoints.length}):</strong>
                  {info.waypoints.length > 0 ? (
                    <ul className="ml-4 mt-1">
                      {info.waypoints.map((wp, i) => (
                        <li key={i}>
                          {i + 1}: ({wp.x.toFixed(1)}, {wp.y.toFixed(1)})
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <span className="text-gray-500 ml-2">None</span>
                  )}
                </div>

                <div className="mt-2">
                  <strong>Path:</strong>
                  <pre className="text-xs bg-gray-100 p-2 rounded mt-1 overflow-x-auto">
                    {info.path}
                  </pre>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};


