/**
 * R6: ELK → React Flow with ELK-accurate handles (ports), matching openai-realtime-elkjs-tool.
 */
import React, { useEffect } from 'https://esm.sh/react@18.3.1';
import { createRoot } from 'https://esm.sh/react-dom@18.3.1/client';
import {
    ReactFlow,
    Background,
    Controls,
    ReactFlowProvider,
    useNodesState,
    useEdgesState,
    Handle,
    Position,
    BaseEdge,
    MarkerType,
} from 'https://esm.sh/@xyflow/react@12.4.2?deps=react@18.3.1,react-dom@18.3.1';

const baseHandleStyle = {
    background: '#475569',
    opacity: 0.9,
    width: 6,
    height: 6,
};

/** Leaf node: handles offset slightly outside (CustomNode-style). */
function ElkCustomNode({ data }) {
    const label = data.label || '';
    const w = data.width || 80;
    const h = data.height || 40;
    const leftHandles = data.leftHandles || [];
    const rightHandles = data.rightHandles || [];
    const topHandles = data.topHandles || [];
    const bottomHandles = data.bottomHandles || [];

    const parts = [];

    leftHandles.forEach((yPos, index) => {
        parts.push(
            React.createElement(Handle, {
                key: 'lt-' + index,
                type: 'target',
                position: Position.Left,
                id: 'left-' + index + '-target',
                style: {
                    ...baseHandleStyle,
                    position: 'absolute',
                    top: yPos,
                    left: -14,
                    transform: 'translate(-50%, -50%)',
                },
            }),
            React.createElement(Handle, {
                key: 'ls-' + index,
                type: 'source',
                position: Position.Left,
                id: 'left-' + index + '-source',
                style: {
                    ...baseHandleStyle,
                    position: 'absolute',
                    top: yPos,
                    left: -14,
                    transform: 'translate(-50%, -50%)',
                    opacity: 0,
                },
            })
        );
    });

    rightHandles.forEach((yPos, index) => {
        parts.push(
            React.createElement(Handle, {
                key: 'rs-' + index,
                type: 'source',
                position: Position.Right,
                id: 'right-' + index + '-source',
                style: {
                    ...baseHandleStyle,
                    position: 'absolute',
                    top: yPos,
                    right: -14,
                    transform: 'translate(50%, -50%)',
                },
            }),
            React.createElement(Handle, {
                key: 'rt-' + index,
                type: 'target',
                position: Position.Right,
                id: 'right-' + index + '-target',
                style: {
                    ...baseHandleStyle,
                    position: 'absolute',
                    top: yPos,
                    right: -14,
                    transform: 'translate(50%, -50%)',
                    opacity: 0,
                },
            })
        );
    });

    topHandles.forEach((xPos, index) => {
        parts.push(
            React.createElement(Handle, {
                key: 'ts-' + index,
                type: 'source',
                position: Position.Top,
                id: 'top-' + index + '-source',
                style: {
                    ...baseHandleStyle,
                    position: 'absolute',
                    left: xPos,
                    top: -14,
                    transform: 'translate(-50%, -50%)',
                },
            }),
            React.createElement(Handle, {
                key: 'tt-' + index,
                type: 'target',
                position: Position.Top,
                id: 'top-' + index + '-target',
                style: {
                    ...baseHandleStyle,
                    position: 'absolute',
                    left: xPos,
                    top: -14,
                    transform: 'translate(-50%, -50%)',
                    opacity: 0,
                },
            })
        );
    });

    bottomHandles.forEach((xPos, index) => {
        parts.push(
            React.createElement(Handle, {
                key: 'bt-' + index,
                type: 'target',
                position: Position.Bottom,
                id: 'bottom-' + index + '-target',
                style: {
                    ...baseHandleStyle,
                    position: 'absolute',
                    left: xPos,
                    bottom: -14,
                    transform: 'translate(-50%, 50%)',
                },
            }),
            React.createElement(Handle, {
                key: 'bs-' + index,
                type: 'source',
                position: Position.Bottom,
                id: 'bottom-' + index + '-source',
                style: {
                    ...baseHandleStyle,
                    position: 'absolute',
                    left: xPos,
                    bottom: -14,
                    transform: 'translate(-50%, 50%)',
                    opacity: 0,
                },
            })
        );
    });

    parts.push(
        React.createElement(
            'div',
            {
                key: 'txt',
                style: {
                    padding: '8px',
                    fontSize: 11,
                    color: '#0f172a',
                    lineHeight: 1.25,
                    maxWidth: w,
                    wordBreak: 'break-word',
                },
            },
            label
        )
    );

    return React.createElement(
        'div',
        {
            style: {
                position: 'relative',
                width: w,
                height: h,
                boxSizing: 'border-box',
                background: '#fff',
                border: '1px solid #475569',
                borderRadius: 6,
                boxShadow: '0 1px 3px rgba(15,23,42,0.12)',
                overflow: 'visible',
            },
        },
        parts
    );
}

/** Compound: handles on frame (GroupNode-style). */
function ElkGroupNode({ data }) {
    const label = data.label || '';
    const leftHandles = data.leftHandles || [];
    const rightHandles = data.rightHandles || [];
    const topHandles = data.topHandles || [];
    const bottomHandles = data.bottomHandles || [];

    const parts = [];

    leftHandles.forEach((yPos, index) => {
        parts.push(
            React.createElement(Handle, {
                key: 'g-lt-' + index,
                type: 'target',
                position: Position.Left,
                id: 'left-' + index + '-target',
                style: { ...baseHandleStyle, top: yPos },
            }),
            React.createElement(Handle, {
                key: 'g-ls-' + index,
                type: 'source',
                position: Position.Left,
                id: 'left-' + index + '-source',
                style: { ...baseHandleStyle, top: yPos, opacity: 0 },
            })
        );
    });

    rightHandles.forEach((yPos, index) => {
        parts.push(
            React.createElement(Handle, {
                key: 'g-rs-' + index,
                type: 'source',
                position: Position.Right,
                id: 'right-' + index + '-source',
                style: { ...baseHandleStyle, top: yPos },
            }),
            React.createElement(Handle, {
                key: 'g-rt-' + index,
                type: 'target',
                position: Position.Right,
                id: 'right-' + index + '-target',
                style: { ...baseHandleStyle, top: yPos },
            })
        );
    });

    topHandles.forEach((xPos, index) => {
        parts.push(
            React.createElement(Handle, {
                key: 'g-ts-' + index,
                type: 'source',
                position: Position.Top,
                id: 'top-' + index + '-source',
                style: { ...baseHandleStyle, left: xPos },
            }),
            React.createElement(Handle, {
                key: 'g-tt-' + index,
                type: 'target',
                position: Position.Top,
                id: 'top-' + index + '-target',
                style: { ...baseHandleStyle, left: xPos },
            })
        );
    });

    bottomHandles.forEach((xPos, index) => {
        parts.push(
            React.createElement(Handle, {
                key: 'g-bt-' + index,
                type: 'target',
                position: Position.Bottom,
                id: 'bottom-' + index + '-target',
                style: { ...baseHandleStyle, left: xPos },
            }),
            React.createElement(Handle, {
                key: 'g-bs-' + index,
                type: 'source',
                position: Position.Bottom,
                id: 'bottom-' + index + '-source',
                style: { ...baseHandleStyle, left: xPos },
            })
        );
    });

    parts.push(
        React.createElement(
            'div',
            {
                key: 'hdr',
                style: {
                    position: 'absolute',
                    top: 6,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    fontSize: 11,
                    fontWeight: 600,
                    color: '#334155',
                    background: '#f1f5f9',
                    padding: '2px 8px',
                    borderRadius: 4,
                    maxWidth: '92%',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    zIndex: 2,
                    pointerEvents: 'none',
                },
            },
            label
        )
    );

    return React.createElement(
        'div',
        {
            style: {
                width: '100%',
                height: '100%',
                position: 'relative',
                boxSizing: 'border-box',
                overflow: 'visible',
            },
        },
        parts
    );
}

/** Orthogonal path from ELK bend points (StepEdge-style). */
function ElkOrthogonalEdge(props) {
    const {
        id,
        sourceX,
        sourceY,
        targetX,
        targetY,
        markerEnd,
        style,
        data,
    } = props;
    const bendPoints = (data && data.bendPoints) || [];
    let edgePath = '';
    const midX = sourceX + (targetX - sourceX) / 2;

    if (bendPoints.length >= 2) {
        const fixedX = bendPoints[0].x;
        edgePath =
            'M ' +
            sourceX +
            ' ' +
            sourceY +
            ' L ' +
            fixedX +
            ' ' +
            sourceY +
            ' L ' +
            fixedX +
            ' ' +
            targetY +
            ' L ' +
            targetX +
            ' ' +
            targetY;
    } else {
        edgePath =
            'M ' +
            sourceX +
            ' ' +
            sourceY +
            ' L ' +
            midX +
            ' ' +
            sourceY +
            ' L ' +
            midX +
            ' ' +
            targetY +
            ' L ' +
            targetX +
            ' ' +
            targetY;
    }

    return React.createElement(BaseEdge, {
        id,
        path: edgePath,
        style: style,
        markerEnd: markerEnd,
    });
}

const nodeTypes = {
    custom: ElkCustomNode,
    group: ElkGroupNode,
};

const edgeTypes = {
    elkOrthogonal: ElkOrthogonalEdge,
};

function Inner(props) {
    const initialNodes = props.initialNodes || [];
    const initialEdges = props.initialEdges || [];
    const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

    useEffect(() => {
        setNodes(initialNodes);
        setEdges(initialEdges);
    }, [initialNodes, initialEdges, setNodes, setEdges]);

    return React.createElement(
        ReactFlow,
        {
            nodes,
            edges,
            onNodesChange,
            onEdgesChange,
            nodeTypes,
            edgeTypes,
            fitView: true,
            fitViewOptions: { padding: 0.15 },
            nodesDraggable: false,
            nodesConnectable: false,
            elementsSelectable: true,
            proOptions: { hideAttribution: true },
            minZoom: 0.08,
            maxZoom: 2,
            defaultEdgeOptions: {
                markerEnd: {
                    type: MarkerType.ArrowClosed,
                    width: 14,
                    height: 14,
                    color: '#64748b',
                },
            },
        },
        React.createElement(Background, { gap: 16, color: '#cbd5e1' }),
        React.createElement(Controls, { showInteractive: false })
    );
}

function App(props) {
    return React.createElement(ReactFlowProvider, null, React.createElement(Inner, props));
}

let rfRoot = null;
let rfContainer = null;

window.atelierMountReactFlowR6 = async function (container, epoch) {
    if (!container) return;
    container.innerHTML = '';
    const getIr = window.atelierResolveStructuredIrForPipeline;
    const layout = window.runElkLayoutPipeline;
    const convert = window.elkLaidOutToReactFlowElements;
    if (typeof getIr !== 'function' || typeof layout !== 'function' || typeof convert !== 'function') {
        container.innerHTML = '';
        const d = document.createElement('div');
        d.className = 'error';
        d.textContent =
            'R6 prerequisites missing (atelierResolveStructuredIrForPipeline / runElkLayoutPipeline / elkLaidOutToReactFlowElements).';
        container.appendChild(d);
        return;
    }
    const { diagram } = getIr();
    if (!diagram) {
        container.innerHTML = '';
        const d = document.createElement('div');
        d.className = 'loading';
        d.textContent =
            'No structured diagram for React Flow (overview: Mermaid or DIAGRAM_JSON; module: diagram on module_tree).';
        container.appendChild(d);
        return;
    }
    const res = await layout(diagram);
    if (!res.ok || !res.laidOut) {
        container.innerHTML = '';
        const d = document.createElement('div');
        d.className = 'error';
        d.textContent = 'ELK layout (R6): ' + (res.error || 'failed');
        container.appendChild(d);
        return;
    }
    const { nodes, edges } = convert(res.laidOut);
    const key = 'rf-' + (epoch != null ? epoch : Date.now());

    if (rfRoot && rfContainer !== container) {
        try {
            rfRoot.unmount();
        } catch (_) {}
        rfRoot = null;
    }
    if (!rfRoot) {
        rfRoot = createRoot(container);
        rfContainer = container;
    }

    rfRoot.render(
        React.createElement(App, {
            key,
            initialNodes: nodes,
            initialEdges: edges,
        })
    );
};

window.atelierR6ReactFlowReady = true;
