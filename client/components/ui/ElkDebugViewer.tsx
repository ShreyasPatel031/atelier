import React, { useState, useMemo } from 'react';
import { LayoutGraph, RawGraph } from '../components/graph/types/index';
import { Node, Edge } from 'reactflow';
import ELK from "elkjs/lib/elk.bundled.js";
import { ensureIds } from '../../components/graph/utils/elk/ids';

interface ElkDebugViewerProps {
  layoutGraph: LayoutGraph | null;
  rawGraph?: RawGraph | null; // For generating layout on demand
  nodes?: Node[]; // Current ReactFlow nodes
  edges?: Edge[]; // Current ReactFlow edges
}

const elk = new ELK();

export const ElkDebugViewer: React.FC<ElkDebugViewerProps> = ({ 
  layoutGraph: propLayoutGraph, 
  rawGraph,
  nodes: reactFlowNodes = [],
  edges: reactFlowEdges = []
}) => {
  const [isOpen, setIsOpen] = useState(true); // Open by default
  const [computedLayoutGraph, setComputedLayoutGraph] = useState<LayoutGraph | null>(null);
  const [isComputing, setIsComputing] = useState(false);
  const [viewMode, setViewMode] = useState<'elk' | 'reactflow'>('reactflow'); // Default to ReactFlow view

  // Use computed layout if available, otherwise use prop
  const layoutGraph = computedLayoutGraph || propLayoutGraph;

  // Generate ELK layout on demand
  const handleGenerateLayout = async () => {
    if (!rawGraph) {
      alert('No graph data available to generate layout');
      return;
    }

    setIsComputing(true);
    try {
      const prepared = ensureIds(JSON.parse(JSON.stringify(rawGraph)));
      const layout = await elk.layout(prepared);
      setComputedLayoutGraph(layout as LayoutGraph);
    } catch (error) {
      console.error('Error generating ELK layout:', error);
      alert(`Failed to generate layout: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsComputing(false);
    }
  };

  // Export visualization state as JSON with ALL debugging info
  const handleExportState = () => {
    // Capture console logs for this edge
    const consoleLogs: any[] = [];
    const originalLog = console.log;
    const originalError = console.error;
    const originalWarn = console.warn;
    
    // Temporarily capture logs
    console.log = (...args: any[]) => {
      const logStr = args.map(a => typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)).join(' ');
      if (logStr.includes('[StepEdge]') || logStr.includes('[ELK]')) {
        consoleLogs.push({ type: 'log', message: logStr, args });
      }
      return originalLog.apply(console, args);
    };
    
    console.error = (...args: any[]) => {
      const logStr = args.map(a => typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)).join(' ');
      if (logStr.includes('[StepEdge]') || logStr.includes('[ELK]')) {
        consoleLogs.push({ type: 'error', message: logStr, args });
      }
      return originalError.apply(console, args);
    };

    const exportData = {
      viewMode,
      timestamp: new Date().toISOString(),
      nodes: flattenedData.nodes.map(n => ({
        id: n.id,
        label: n.label,
        position: { x: n.x, y: n.y },
        size: { width: n.width, height: n.height },
        isContainer: n.isContainer,
      })),
      edges: flattenedData.edges.map(e => {
        const reactFlowEdge = reactFlowEdges.find(rfe => rfe.id === e.id);
        return {
          id: e.id,
          source: e.source,
          target: e.target,
          sections: e.sections.map(s => ({
            startPoint: s.startPoint,
            endPoint: s.endPoint,
            bendPoints: s.bendPoints,
            waypointCount: s.bendPoints.length,
            waypointDetails: s.bendPoints.map((bp, i) => `${i + 1}: (${bp.x.toFixed(1)}, ${bp.y.toFixed(1)})`),
          })),
          // Include actual edge data object that StepEdge receives
          actualData: reactFlowEdge?.data || null,
          // Include ReactFlow handle positions
          reactFlowHandles: reactFlowEdge ? {
            sourceX: reactFlowEdge.sourceX,
            sourceY: reactFlowEdge.sourceY,
            targetX: reactFlowEdge.targetX,
            targetY: reactFlowEdge.targetY,
          } : null,
          // Include ELK debug info from StepEdge
          elkDebug: reactFlowEdge?.data?._elkDebug || null,
          // Include collision test results
          collisionTest: reactFlowEdge?.data?._collisionTest || null,
        };
      }),
      elkLayoutOutput: viewMode === 'elk' && layoutGraph ? {
        edges: layoutGraph.edges?.map((edge: any) => ({
          id: edge.id,
          sources: edge.sources,
          targets: edge.targets,
          sections: edge.sections?.map((section: any) => ({
            id: section.id,
            startPoint: section.startPoint,
            endPoint: section.endPoint,
            bendPoints: section.bendPoints || [],
            incomingShape: section.incomingShape,
            outgoingShape: section.outgoingShape,
          })),
        })),
        nodes: layoutGraph.children?.map((node: any) => ({
          id: node.id,
          x: node.x,
          y: node.y,
          width: node.width,
          height: node.height,
        })),
      } : null,
      consoleLogs,
    };

    // Restore console
    console.log = originalLog;
    console.error = originalError;
    console.warn = originalWarn;

    const json = JSON.stringify(exportData, null, 2);
    
    // Copy to clipboard
    navigator.clipboard.writeText(json).then(() => {
      alert('Visualization state with ALL debugging info copied to clipboard! Paste it here to share.');
    }).catch(() => {
      // Fallback: show in prompt
      prompt('Copy this JSON:', json);
    });

    // Also log to console for easy access
    console.log('📋 Full Debug Export:', exportData);
    console.log('📋 JSON:', json);
  };

  // Convert ReactFlow nodes/edges to visualization format
  const reactFlowData = useMemo(() => {
    if (reactFlowNodes.length === 0) return { nodes: [], edges: [] };

    const nodes = reactFlowNodes.map(node => ({
      id: node.id,
      x: node.position.x,
      y: node.position.y,
      width: node.data?.width || node.width || 96,
      height: node.data?.height || node.height || 96,
      label: node.data?.label || node.id,
      isContainer: node.type === 'group' || node.type === 'draftGroup',
    }));

    const edges = reactFlowEdges.map(edge => {
      const sourceNode = reactFlowNodes.find(n => n.id === edge.source);
      const targetNode = reactFlowNodes.find(n => n.id === edge.target);
      
      if (!sourceNode || !targetNode) return null;

      // CRITICAL: Use ELK's actual start/end points when available (in ABSOLUTE coordinates)
      // These are computed by ELK and passed through from toReactFlow.ts
      const elkStartPoint = edge.data?.elkStartPoint;
      const elkEndPoint = edge.data?.elkEndPoint;
      
      // Get waypoints/bendPoints from edge data
      const waypoints = edge.data?.bendPoints || edge.data?.elkWaypoints || edge.data?.waypoints || [];
      
      // Use ELK start/end if available, otherwise estimate from node positions
      let sourceX: number, sourceY: number, targetX: number, targetY: number;
      
      if (elkStartPoint && elkEndPoint) {
        // Use ELK's computed points directly
        sourceX = elkStartPoint.x;
        sourceY = elkStartPoint.y;
        targetX = elkEndPoint.x;
        targetY = elkEndPoint.y;
      } else {
        // Fallback: estimate from node positions and handle info
        const sourceHandle = edge.sourceHandle || 'right-0-source';
        const targetHandle = edge.targetHandle || 'left-0-target';
        
        sourceX = sourceNode.position.x + (sourceNode.data?.width || 96);
        sourceY = sourceNode.position.y + (sourceNode.data?.height || 96) / 2;
        targetX = targetNode.position.x;
        targetY = targetNode.position.y + (targetNode.data?.height || 96) / 2;

        if (sourceHandle.includes('left')) sourceX = sourceNode.position.x;
        if (sourceHandle.includes('right')) sourceX = sourceNode.position.x + (sourceNode.data?.width || 96);
        if (sourceHandle.includes('top')) sourceY = sourceNode.position.y;
        if (sourceHandle.includes('bottom')) sourceY = sourceNode.position.y + (sourceNode.data?.height || 96);

        if (targetHandle.includes('left')) targetX = targetNode.position.x;
        if (targetHandle.includes('right')) targetX = targetNode.position.x + (targetNode.data?.width || 96);
        if (targetHandle.includes('top')) targetY = targetNode.position.y;
        if (targetHandle.includes('bottom')) targetY = targetNode.position.y + (targetNode.data?.height || 96);
      }
      
      return {
        id: edge.id,
        source: edge.source,
        target: edge.target,
        sections: [{
          startPoint: { x: sourceX, y: sourceY },
          endPoint: { x: targetX, y: targetY },
          bendPoints: waypoints,
        }],
      };
    }).filter(Boolean) as Array<{
      id: string;
      source: string;
      target: string;
      sections: Array<{
        startPoint: { x: number; y: number };
        endPoint: { x: number; y: number };
        bendPoints: Array<{ x: number; y: number }>;
      }>;
    }>;

    return { nodes, edges };
  }, [reactFlowNodes, reactFlowEdges]);

  // Flatten graph to get all nodes and edges with absolute coordinates
  const elkFlattenedData = useMemo(() => {
    if (!layoutGraph) return { nodes: [], edges: [] };

    const nodes: Array<{
      id: string;
      x: number;
      y: number;
      width: number;
      height: number;
      label: string;
      isContainer: boolean;
    }> = [];
    const edges: Array<{
      id: string;
      source: string;
      target: string;
      sections: Array<{
        startPoint: { x: number; y: number };
        endPoint: { x: number; y: number };
        bendPoints: Array<{ x: number; y: number }>;
      }>;
    }> = [];

    const flattenGraph = (
      node: any,
      parentX: number = 0,
      parentY: number = 0
    ) => {
      const absX = (node.x ?? 0) + parentX;
      const absY = (node.y ?? 0) + parentY;

      // Add node (skip root)
      if (node.id !== 'root' && node.x !== undefined && node.y !== undefined) {
        nodes.push({
          id: node.id,
          x: absX,
          y: absY,
          width: node.width ?? 100,
          height: node.height ?? 60,
          label: node.labels?.[0]?.text || node.id,
          isContainer: !!(node.children && node.children.length > 0),
        });
      }

      // Process edges
      if (Array.isArray(node.edges)) {
        node.edges.forEach((edge: any) => {
          const sourceId = edge.sources?.[0];
          const targetId = edge.targets?.[0];

          if (sourceId && targetId) {
            const sections =
              edge.sections?.map((section: any) => ({
                startPoint: {
                  x: section.startPoint.x + absX,
                  y: section.startPoint.y + absY,
                },
                endPoint: {
                  x: section.endPoint.x + absX,
                  y: section.endPoint.y + absY,
                },
                bendPoints:
                  section.bendPoints?.map((bp: any) => ({
                    x: bp.x + absX,
                    y: bp.y + absY,
                  })) || [],
              })) || [];

            edges.push({
              id: edge.id,
              source: sourceId,
              target: targetId,
              sections,
            });
          }
        });
      }

      // Recurse through children
      if (Array.isArray(node.children)) {
        node.children.forEach((child: any) => {
          flattenGraph(child, absX, absY);
        });
      }
    };

    flattenGraph(layoutGraph);

    return { nodes, edges };
  }, [layoutGraph]);

  // Use ReactFlow data if in ReactFlow mode, otherwise use ELK data
  const flattenedData = viewMode === 'reactflow' ? reactFlowData : elkFlattenedData;

  // Calculate viewBox for SVG
  const viewBox = useMemo(() => {
    if (flattenedData.nodes.length === 0) {
      return '0 0 400 300';
    }

    const minX = Math.min(...flattenedData.nodes.map(n => n.x));
    const minY = Math.min(...flattenedData.nodes.map(n => n.y));
    const maxX = Math.max(...flattenedData.nodes.map(n => n.x + n.width));
    const maxY = Math.max(...flattenedData.nodes.map(n => n.y + n.height));

    const padding = 50;
    return `${minX - padding} ${minY - padding} ${maxX - minX + padding * 2} ${maxY - minY + padding * 2}`;
  }, [flattenedData.nodes]);

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 bg-purple-600 text-white px-4 py-2 rounded shadow-lg z-50"
      >
        ELK Debug
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 bg-white border-2 border-purple-300 rounded-lg shadow-xl z-50 w-[500px] max-h-[600px] flex flex-col">
      <div className="flex justify-between items-center p-4 border-b">
        <h3 className="font-bold text-lg">Debug Viewer</h3>
        <button
          onClick={() => setIsOpen(false)}
          className="text-gray-500 hover:text-gray-700 text-xl"
        >
          ×
        </button>
      </div>

      {/* View Mode Toggle */}
      <div className="px-4 py-2 border-b flex gap-2 items-center justify-between">
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode('reactflow')}
            className={`px-3 py-1 text-sm rounded ${
              viewMode === 'reactflow' 
                ? 'bg-purple-600 text-white' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            ReactFlow (Live)
          </button>
          <button
            onClick={() => setViewMode('elk')}
            className={`px-3 py-1 text-sm rounded ${
              viewMode === 'elk' 
                ? 'bg-purple-600 text-white' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            ELK Layout
          </button>
        </div>
        {flattenedData.nodes.length > 0 && (
          <button
            onClick={handleExportState}
            className="px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
            title="Export visualization state to clipboard"
          >
            📋 Export State
          </button>
        )}
      </div>

      <div className="flex-1 overflow-auto p-4">
        {viewMode === 'elk' && !layoutGraph ? (
          <div className="space-y-4">
            <p className="text-gray-500">
              No ELK layout data available. ELK layout is only generated when AI creates content.
            </p>
            {rawGraph && (
              <button
                onClick={handleGenerateLayout}
                disabled={isComputing}
                className="w-full px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isComputing ? 'Generating Layout...' : 'Generate ELK Layout (Debug Only)'}
              </button>
            )}
            {rawGraph && (
              <p className="text-xs text-gray-500">
                This will show what ELK would output for your current graph. It won't affect your canvas.
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {/* SVG Visualization */}
            <div className="border border-gray-300 rounded p-2 bg-gray-50">
              <h4 className="font-semibold text-sm mb-2">Visualization:</h4>
              <svg
                viewBox={viewBox}
                className="w-full border border-gray-200 bg-white"
                style={{ minHeight: '400px' }}
                preserveAspectRatio="xMidYMid meet"
              >
                {/* Arrow marker */}
                <defs>
                  <marker
                    id="arrowhead"
                    markerWidth="10"
                    markerHeight="10"
                    refX="9"
                    refY="3"
                    orient="auto"
                  >
                    <polygon points="0 0, 10 3, 0 6" fill="#2d6bc4" />
                  </marker>
                </defs>

                {/* 
                  SVG render order: later elements are on top.
                  Order: groups (bottom) → nodes → edges (top)
                  This matches user expectation: edges should be visible above nodes
                */}
                
                {/* 1. Render groups first (bottom layer) */}
                {flattenedData.nodes.filter(n => n.isContainer).map((node) => (
                  <g key={node.id}>
                    <rect
                      x={node.x}
                      y={node.y}
                      width={node.width}
                      height={node.height}
                      fill="#f0f4f8"
                      stroke="#2d6bc4"
                      strokeWidth="2"
                      rx="5"
                      ry="5"
                      opacity="0.7"
                    />
                    <text
                      x={node.x + node.width / 2}
                      y={node.y + 15}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fontSize="10"
                      fill="#1e40af"
                      fontWeight="bold"
                    >
                      {node.label.length > 15 ? node.label.substring(0, 12) + '...' : node.label}
                    </text>
                  </g>
                ))}

                {/* 2. Render nodes (middle layer) */}
                {flattenedData.nodes.filter(n => !n.isContainer).map((node) => (
                  <g key={node.id}>
                    <rect
                      x={node.x}
                      y={node.y}
                      width={node.width}
                      height={node.height}
                      fill="#d0e3ff"
                      stroke="#2d6bc4"
                      strokeWidth="2"
                      rx="5"
                      ry="5"
                    />
                    <text
                      x={node.x + node.width / 2}
                      y={node.y + node.height / 2}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fontSize="11"
                      fill="#1e40af"
                      fontWeight="bold"
                    >
                      {node.label.length > 15 ? node.label.substring(0, 12) + '...' : node.label}
                    </text>
                    <text
                      x={node.x + node.width / 2}
                      y={node.y + node.height - 5}
                      textAnchor="middle"
                      dominantBaseline="baseline"
                      fontSize="8"
                      fill="#666"
                    >
                      ({node.id.substring(0, 8)})
                    </text>
                  </g>
                ))}

                {/* 3. Render edges last (top layer - visible above nodes) */}
                {flattenedData.edges.map((edge) => {
                  return edge.sections.map((section, sectionIdx) => {
                    // Use ELK data directly - startPoint → bendPoints → endPoint
                    const allPoints = [
                      section.startPoint,
                      ...section.bendPoints,
                      section.endPoint
                    ];
                    
                    const points = allPoints.map(p => `${p.x},${p.y}`).join(' ');

                    return (
                      <g key={`${edge.id}-${sectionIdx}`}>
                        <polyline
                          points={points}
                          fill="none"
                          stroke="#2d6bc4"
                          strokeWidth="2"
                          markerEnd="url(#arrowhead)"
                        />
                        {/* Render waypoints as circles */}
                        {section.bendPoints.map((bp, bpIdx) => (
                          <g key={`waypoint-${bpIdx}`}>
                            <circle
                              cx={bp.x}
                              cy={bp.y}
                              r="4"
                              fill="#ef4444"
                              stroke="white"
                              strokeWidth="1"
                            />
                            <text
                              x={bp.x}
                              y={bp.y - 8}
                              textAnchor="middle"
                              fontSize="8"
                              fill="#ef4444"
                              fontWeight="bold"
                            >
                              {bpIdx + 1}
                            </text>
                          </g>
                        ))}
                        {/* Render start/end points */}
                        <circle
                          cx={section.startPoint.x}
                          cy={section.startPoint.y}
                          r="5"
                          fill="#10b981"
                          stroke="white"
                          strokeWidth="1"
                        />
                        <circle
                          cx={section.endPoint.x}
                          cy={section.endPoint.y}
                          r="5"
                          fill="#f59e0b"
                          stroke="white"
                          strokeWidth="1"
                        />
                      </g>
                    );
                  });
                })}
              </svg>
            </div>

            {/* Summary */}
            <div className="text-xs text-gray-600 space-y-1">
              <div><strong>Nodes:</strong> {flattenedData.nodes.length}</div>
              <div><strong>Edges:</strong> {flattenedData.edges.length}</div>
              <div className="text-purple-600 mt-2">
                {viewMode === 'reactflow' ? '🔄 Live - Updates as you drag nodes' : '📍 ELK Layout - Static'}
              </div>
            </div>
          </div>
        )}
        
        {viewMode === 'reactflow' && flattenedData.nodes.length === 0 && (
          <p className="text-gray-500">No nodes on canvas</p>
        )}
      </div>
    </div>
  );
};

