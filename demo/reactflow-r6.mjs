/**
 * R6: mount ELK-laid-out diagram in React Flow (ESM + CDN). Loads after classic scripts define window.runElkLayoutPipeline etc.
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
} from 'https://esm.sh/@xyflow/react@12.4.2?deps=react@18.3.1,react-dom@18.3.1';

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
            fitView: true,
            fitViewOptions: { padding: 0.15 },
            nodesDraggable: false,
            nodesConnectable: false,
            elementsSelectable: true,
            proOptions: { hideAttribution: true },
            minZoom: 0.08,
            maxZoom: 2,
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
        d.textContent = 'R6 prerequisites missing (atelierResolveStructuredIrForPipeline / runElkLayoutPipeline / elkLaidOutToReactFlowElements).';
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
