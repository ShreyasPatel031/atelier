import React, { useState, useEffect, useCallback, useRef, useMemo } from "react"
import { Node, Edge, Position } from 'reactflow';
import { useElkToReactflowGraphConverter } from '../../hooks/useElkToReactflowGraphConverter';
import CustomNodeComponent from '../CustomNode';
import GroupNode from '../GroupNode';
import StepEdge from '../StepEdge';
import ElkDebugViewer from './ElkDebugViewer';
import EdgeDebugViewer from './EdgeDebugViewer';

const InteractiveCanvasSimple: React.FC = () => {
  const {
    nodes,
    edges,
    setNodes,
    setEdges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    reactFlowRef,
  } = useElkToReactflowGraphConverter({
    id: "root",
    children: [],
    edges: []
  }, 'select');

  // Auto-render two test nodes and edge for ELK debugging
  // Let StepEdge.tsx handle all ELK routing logic
  useEffect(() => {
    const testNodes: Node[] = [
      {
        id: 'elk-test-bottom',
        type: 'elkTest',
        position: { x: 256, y: 520 },
        data: { label: 'Bottom', width: 96, height: 96 },
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
        draggable: false,
        selectable: false
      },
      {
        id: 'elk-test-top',
        type: 'elkTest',
        position: { x: 256, y: 320 },
        data: { label: 'Top', width: 96, height: 96 },
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
        draggable: false,
        selectable: false
      }
    ];

    const testEdges: Edge[] = [
      {
        id: 'elk-test-edge',
        source: 'elk-test-bottom',
        target: 'elk-test-top',
        sourceHandle: 'right',
        targetHandle: 'left',
        type: 'step',
        data: {
          obstacleMargin: 200,
          sourceHandle: 'right',
          targetHandle: 'left'
        },
        animated: false,
        selectable: false
      }
    ];

    setNodes(testNodes);
    setEdges(testEdges);
  }, [setNodes, setEdges]);

  // Create node types with handlers - memoized to prevent recreation
  const CustomNodeWrapper = useCallback((props: any) => {
    return <CustomNodeComponent {...props} />;
  }, []);
  
  const GroupNodeWrapper = useCallback((props: any) => {
    return <GroupNode {...props} />;
  }, []);

  const ElkTestNode = useCallback((props: any) => {
    const width = props?.data?.width ?? 96;
    const height = props?.data?.height ?? 96;
    return (
      <div
        style={{
          width,
          height,
          borderRadius: 12,
          border: '1px solid #cbd5f5',
          background: '#f8fbff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 12,
          color: '#1e293b',
          position: 'relative',
          boxShadow: '0 4px 12px rgba(44,82,130,0.12)'
        }}
      >
        <div style={{ position: 'absolute', left: -10, top: '50%', transform: 'translateY(-50%)', width: 10, height: 10, background: '#1e293b', borderRadius: '50%' }} />
        <span>{props?.data?.label ?? props.id}</span>
        <div style={{ position: 'absolute', right: -10, top: '50%', transform: 'translateY(-50%)', width: 10, height: 10, background: '#1e293b', borderRadius: '50%' }} />
      </div>
    );
  }, []);
  
  const memoizedNodeTypes = useMemo(() => {
    return {
      custom: CustomNodeWrapper,
      group: GroupNodeWrapper,
      elkTest: ElkTestNode,
    };
  }, [CustomNodeWrapper, GroupNodeWrapper, ElkTestNode]);
  
  const memoizedEdgeTypes = useMemo(() => ({
    step: StepEdge,
    smoothstep: StepEdge
  }), []);

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      <div style={{ position: 'absolute', top: 20, left: 20, zIndex: 1000 }}>
        <ElkDebugViewer 
          rawGraph={{ id: "root", children: [], edges: [] }}
          nodes={nodes}
          edges={edges}
        />
      </div>
      <div style={{ position: 'absolute', top: 20, right: 20, zIndex: 1000 }}>
        <EdgeDebugViewer edges={edges} />
      </div>
    </div>
  );
};

export default InteractiveCanvasSimple;
