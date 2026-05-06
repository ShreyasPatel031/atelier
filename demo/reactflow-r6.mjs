/**
 * R6: ELK → React Flow with ELK-accurate handles (ports), matching openai-realtime-elkjs-tool.
 */
import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'https://esm.sh/react@18.3.1';
import { createRoot } from 'https://esm.sh/react-dom@18.3.1/client';
import { createPortal } from 'https://esm.sh/react-dom@18.3.1?deps=react@18.3.1';
import {
    ReactFlow,
    Background,
    Controls,
    ReactFlowProvider,
    useNodesState,
    useEdgesState,
    applyNodeChanges,
    Handle,
    Position,
    BaseEdge,
    MarkerType,
    useStore,
    useReactFlow,
} from 'https://esm.sh/@xyflow/react@12.4.2?deps=react@18.3.1,react-dom@18.3.1';
import { timer } from 'https://esm.sh/d3-timer@3';

const baseHandleStyle = {
    background: '#475569',
    opacity: 0.9,
    width: 6,
    height: 6,
    pointerEvents: 'auto',
    /** Above node chrome so translate(-50%,-50%) ports are not clipped by overflow:hidden on the shell. */
    zIndex: 2,
};

/** Gap between node edge and hover panel (visual); bridge handlers avoid hover flicker across the gap. */
const NODE_HOVER_SIDE_GAP_PX = 10;

const LEAF_NODE_BORDER_RADIUS = 6;
/** Matches pipeline-elk-reactflow group node style.borderRadius */
const GROUP_NODE_BORDER_RADIUS = 8;
/** Must match `backgroundColor` / stroke on group nodes in pipeline-elk-reactflow.js (rgb + alpha on fill). */
const GROUP_NODE_TINT = '241, 245, 249';
/** Pill: same hue as group fill (see pipeline `rgba(241,245,249,0.4)`), fully opaque for legibility. */
const GROUP_LABEL_PILL_BG = 'rgba(' + GROUP_NODE_TINT + ', 1)';
const GROUP_LABEL_PILL_BORDER = '1px solid rgba(100, 116, 139, 0.42)';
/** Group title pill; side hover panel uses HOVER_PANEL_Z_INDEX (above this). */
const GROUP_LABEL_Z_INDEX = 20000;
/** Above group title pill and local stacking context inside the node wrapper. */
const HOVER_PANEL_Z_INDEX = 2147481000;

/**
 * Fixed width = 3× node width; height grows with content, caps at 2× node height then scrolls.
 */
function ElkSideHoverPanel({
    visible,
    nodeWidth,
    nodeHeight,
    borderRadius,
    text,
    panelRef,
    onPanelMouseLeave,
}) {
    if (!visible) return null;
    const panelW = nodeWidth * 3;
    const maxH = nodeHeight * 2;
    return React.createElement(
        'div',
        {
            ref: panelRef,
            'data-testid': 'atelier-rf-hover-panel',
            onMouseLeave: onPanelMouseLeave,
            style: {
                position: 'absolute',
                left: 'calc(100% + ' + NODE_HOVER_SIDE_GAP_PX + 'px)',
                top: 0,
                width: panelW,
                maxHeight: maxH,
                overflowY: 'auto',
                boxSizing: 'border-box',
                padding: '8px',
                fontSize: 11,
                lineHeight: 1.35,
                color: '#0f172a',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                overflowWrap: 'break-word',
                background: '#fff',
                border: '1px solid #475569',
                borderRadius: borderRadius,
                boxShadow: '0 4px 14px rgba(15,23,42,0.14)',
                zIndex: HOVER_PANEL_Z_INDEX,
                pointerEvents: 'auto',
                textAlign: 'left',
            },
        },
        text || ''
    );
}

function containsNode(ancestor, node) {
    if (!ancestor || !node) return false;
    return ancestor === node || ancestor.contains(node);
}

/**
 * Leaf node: handles centered on the node bbox edge (matches xyflow .react-flow__handle-* and ELK port coords).
 * Do not use negative left/right/top/bottom offsets — those move the connection point outside the ELK rectangle
 * so edges no longer meet the visible border.
 */
/** RF v12 passes width/height from node.{width,height}; prefer those over data so boxes stay ELK-sized. */
function ElkCustomNode({ data, width: rw, height: rh }) {
    const [hovered, setHovered] = useState(false);
    const rootRef = useRef(null);
    const panelRef = useRef(null);

    const label = data.label || '';
    const detail = data.hoverDetail != null ? String(data.hoverDetail).trim() : '';
    const expandable = !!(data && data.expandable);
    const collapseBtn = !!(data && data.rfIsCollapse);
    const leafInteractive = expandable || collapseBtn;
    const showHoverPanel = hovered && detail.length > 0;
    const w = rw ?? data.width ?? 80;
    const h = rh ?? data.height ?? 40;
    const leftHandles = data.leftHandles || [];
    const rightHandles = data.rightHandles || [];
    const topHandles = data.topHandles || [];
    const bottomHandles = data.bottomHandles || [];

    const handleEls = [];

    /** Exact ELK connection point → handle center (translate -50/-50 centers on top/left). */
    function handleStyle(cp) {
        return {
            ...baseHandleStyle,
            position: 'absolute',
            left: cp.x,
            top: cp.y,
            transform: 'translate(-50%, -50%)',
        };
    }

    leftHandles.forEach((cp, index) => {
        handleEls.push(
            React.createElement(Handle, {
                key: 'lt-' + index,
                type: 'target',
                position: Position.Left,
                id: 'left-' + index + '-target',
                style: handleStyle(cp),
            }),
            React.createElement(Handle, {
                key: 'ls-' + index,
                type: 'source',
                position: Position.Left,
                id: 'left-' + index + '-source',
                style: { ...handleStyle(cp), opacity: 0 },
            })
        );
    });

    rightHandles.forEach((cp, index) => {
        handleEls.push(
            React.createElement(Handle, {
                key: 'rs-' + index,
                type: 'source',
                position: Position.Right,
                id: 'right-' + index + '-source',
                style: handleStyle(cp),
            }),
            React.createElement(Handle, {
                key: 'rt-' + index,
                type: 'target',
                position: Position.Right,
                id: 'right-' + index + '-target',
                style: { ...handleStyle(cp), opacity: 0 },
            })
        );
    });

    topHandles.forEach((cp, index) => {
        handleEls.push(
            React.createElement(Handle, {
                key: 'ts-' + index,
                type: 'source',
                position: Position.Top,
                id: 'top-' + index + '-source',
                style: handleStyle(cp),
            }),
            React.createElement(Handle, {
                key: 'tt-' + index,
                type: 'target',
                position: Position.Top,
                id: 'top-' + index + '-target',
                style: { ...handleStyle(cp), opacity: 0 },
            })
        );
    });

    bottomHandles.forEach((cp, index) => {
        handleEls.push(
            React.createElement(Handle, {
                key: 'bt-' + index,
                type: 'target',
                position: Position.Bottom,
                id: 'bottom-' + index + '-target',
                style: handleStyle(cp),
            }),
            React.createElement(Handle, {
                key: 'bs-' + index,
                type: 'source',
                position: Position.Bottom,
                id: 'bottom-' + index + '-source',
                style: { ...handleStyle(cp), opacity: 0 },
            })
        );
    });

    const labelEl = React.createElement(
        'div',
        {
            key: 'txt',
            style: {
                boxSizing: 'border-box',
                width: '100%',
                height: '100%',
                padding: '8px',
                fontSize: 11,
                color: '#0f172a',
                lineHeight: 1.25,
                wordBreak: 'break-word',
                overflowWrap: 'break-word',
                whiteSpace: 'pre-wrap',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                overflow: 'hidden',
            },
        },
        label
    );

    const onRootLeave = function (e) {
        var rel = e.relatedTarget;
        if (containsNode(panelRef.current, rel)) return;
        setHovered(false);
    };
    const onPanelLeave = function (e) {
        var rel = e.relatedTarget;
        if (containsNode(rootRef.current, rel)) return;
        setHovered(false);
    };

    return React.createElement(
        'div',
        {
            ref: rootRef,
            'data-atelier-rf-node-kind': 'leaf',
            'data-atelier-rf-has-hover-detail': detail.length > 0 ? 'true' : 'false',
            'data-atelier-rf-expandable': expandable ? 'true' : 'false',
            onMouseEnter: function () {
                setHovered(true);
            },
            onMouseLeave: onRootLeave,
            style: {
                position: 'relative',
                width: w,
                height: h,
                minWidth: w,
                maxWidth: w,
                minHeight: h,
                maxHeight: h,
                boxSizing: 'border-box',
                overflow: 'visible',
                cursor: leafInteractive ? 'pointer' : undefined,
            },
        },
        React.createElement(
            'div',
            {
                key: 'chrome',
                className: 'atelier-rf-leaf-chrome',
                style: {
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    width: '100%',
                    height: '100%',
                    boxSizing: 'border-box',
                    background: '#fff',
                    border:
                        hovered && leafInteractive
                            ? '2px solid #3b82f6'
                            : '1px solid #475569',
                    borderRadius: LEAF_NODE_BORDER_RADIUS,
                    boxShadow: '0 1px 3px rgba(15,23,42,0.12)',
                    overflow: 'hidden',
                    zIndex: 0,
                },
            },
            labelEl
        ),
        ...handleEls,
        React.createElement(ElkSideHoverPanel, {
            visible: showHoverPanel,
            nodeWidth: w,
            nodeHeight: h,
            borderRadius: LEAF_NODE_BORDER_RADIUS,
            text: detail,
            panelRef: panelRef,
            onPanelMouseLeave: onPanelLeave,
        })
    );
}

function readGroupLabelViewTune() {
    const vt = typeof window !== 'undefined' && window.viewTune ? window.viewTune : {};
    let fontPx = Number(vt.groupLabelFontPx);
    if (!Number.isFinite(fontPx)) fontPx = 12;
    fontPx = Math.max(8, Math.min(20, Math.round(fontPx)));
    let thresh = Number(vt.groupLabelOutsideZoomAt);
    if (!Number.isFinite(thresh)) thresh = 0.8;
    thresh = Math.max(0.08, Math.min(2, Math.round(thresh * 100) / 100));
    return { fontPx, thresh };
}

/**
 * Subscribes to the viewport-level pill layer created by AtelierViewportApiBootstrap.
 * Returns the layer DOM node, or null until it appears (race on first render).
 */
function usePillLayer() {
    const [layer, setLayer] = useState(() =>
        typeof window !== 'undefined' ? window.__atelierR6PillLayer || null : null
    );
    useEffect(function () {
        if (!layer && typeof window !== 'undefined' && window.__atelierR6PillLayer) {
            setLayer(window.__atelierR6PillLayer);
            return;
        }
        function onReady() {
            setLayer(window.__atelierR6PillLayer || null);
        }
        window.addEventListener('atelier-rf-pill-layer-ready', onReady);
        return function () {
            window.removeEventListener('atelier-rf-pill-layer-ready', onReady);
        };
    }, [layer]);
    return layer;
}

/** Compound: handles on frame (GroupNode-style). RF sizes the wrapper via node.width / node.height. */
function ElkGroupNode({ id, data, width: rw, height: rh, positionAbsoluteX, positionAbsoluteY }) {
    const [hovered, setHovered] = useState(false);
    const rootRef = useRef(null);
    const panelRef = useRef(null);

    const gw = rw ?? data.width ?? 160;
    const gh = rh ?? data.height ?? 120;
    const nodeX = typeof positionAbsoluteX === 'number' ? positionAbsoluteX : 0;
    const nodeY = typeof positionAbsoluteY === 'number' ? positionAbsoluteY : 0;

    const zoom = useStore((s) => {
        const t = s.transform;
        const z = t && typeof t[2] === 'number' && t[2] > 0 ? t[2] : 1;
        return z;
    });
    const [, setTuneRev] = useState(0);
    useEffect(() => {
        const fn = () => setTuneRev((x) => x + 1);
        window.addEventListener('atelier-view-tune', fn);
        return () => window.removeEventListener('atelier-view-tune', fn);
    }, []);

    const pillLayer = usePillLayer();

    const label = data.label || '';
    const detail = data.hoverDetail != null ? String(data.hoverDetail).trim() : '';
    const showHoverPanel = hovered && detail.length > 0;
    const { fontPx, thresh } = readGroupLabelViewTune();
    const z = zoom > 0 ? zoom : 1;
    const inside = z <= thresh;
    /** 6 screen px → flow units (viewport scales by zoom; pill rides that scale via its container). */
    const padFlow = 6 / z;

    const pillMaxFlow = inside ? Math.max(0, gw - 2 * padFlow) : gw;

    /**
     * Pill is portaled into a viewport-level layer (.atelier-rf-pill-layer) inside
     * .react-flow__viewport, so it shares the RF pan/zoom transform but escapes any
     * group-node stacking context. Coordinates are in flow units.
     */
    const hdrStyle = {
        position: 'absolute',
        fontWeight: 600,
        color: '#334155',
        background: GROUP_LABEL_PILL_BG,
        border: GROUP_LABEL_PILL_BORDER,
        boxSizing: 'border-box',
        padding: '2px 8px',
        borderRadius: 4,
        maxWidth: pillMaxFlow + 'px',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        pointerEvents: 'none',
        fontSize: fontPx / z,
        ...(inside
            ? {
                  /** Inset from group top-left by 6 screen px (constant across zoom). */
                  left: nodeX + padFlow,
                  top: nodeY + padFlow,
                  transform: 'none',
              }
            : {
                  /** Anchor to group top-left, then shift up by own height + 6 screen px. */
                  left: nodeX,
                  top: nodeY,
                  transform: 'translateY(calc(-100% - ' + padFlow + 'px))',
              }),
    };

    const leftHandles = data.leftHandles || [];
    const rightHandles = data.rightHandles || [];
    const topHandles = data.topHandles || [];
    const bottomHandles = data.bottomHandles || [];

    const parts = [];

    /** Exact ELK connection point → handle center (translate -50/-50 centers on top/left). */
    function gHandleStyle(cp) {
        return {
            ...baseHandleStyle,
            position: 'absolute',
            left: cp.x,
            top: cp.y,
            transform: 'translate(-50%, -50%)',
        };
    }

    leftHandles.forEach((cp, index) => {
        parts.push(
            React.createElement(Handle, {
                key: 'g-lt-' + index,
                type: 'target',
                position: Position.Left,
                id: 'left-' + index + '-target',
                style: gHandleStyle(cp),
            }),
            React.createElement(Handle, {
                key: 'g-ls-' + index,
                type: 'source',
                position: Position.Left,
                id: 'left-' + index + '-source',
                style: { ...gHandleStyle(cp), opacity: 0 },
            })
        );
    });

    rightHandles.forEach((cp, index) => {
        parts.push(
            React.createElement(Handle, {
                key: 'g-rs-' + index,
                type: 'source',
                position: Position.Right,
                id: 'right-' + index + '-source',
                style: gHandleStyle(cp),
            }),
            React.createElement(Handle, {
                key: 'g-rt-' + index,
                type: 'target',
                position: Position.Right,
                id: 'right-' + index + '-target',
                style: gHandleStyle(cp),
            })
        );
    });

    topHandles.forEach((cp, index) => {
        parts.push(
            React.createElement(Handle, {
                key: 'g-ts-' + index,
                type: 'source',
                position: Position.Top,
                id: 'top-' + index + '-source',
                style: gHandleStyle(cp),
            }),
            React.createElement(Handle, {
                key: 'g-tt-' + index,
                type: 'target',
                position: Position.Top,
                id: 'top-' + index + '-target',
                style: gHandleStyle(cp),
            })
        );
    });

    bottomHandles.forEach((cp, index) => {
        parts.push(
            React.createElement(Handle, {
                key: 'g-bt-' + index,
                type: 'target',
                position: Position.Bottom,
                id: 'bottom-' + index + '-target',
                style: gHandleStyle(cp),
            }),
            React.createElement(Handle, {
                key: 'g-bs-' + index,
                type: 'source',
                position: Position.Bottom,
                id: 'bottom-' + index + '-source',
                style: gHandleStyle(cp),
            })
        );
    });

    const labelPill = pillLayer
        ? createPortal(
              React.createElement(
                  'div',
                  {
                      key: 'hdr-' + id,
                      'data-testid': 'atelier-rf-group-label',
                      'data-group-id': id,
                      style: hdrStyle,
                  },
                  label
              ),
              pillLayer
          )
        : null;

    const onRootLeave = function (e) {
        var rel = e.relatedTarget;
        if (containsNode(panelRef.current, rel)) return;
        setHovered(false);
    };
    const onPanelLeave = function (e) {
        var rel = e.relatedTarget;
        if (containsNode(rootRef.current, rel)) return;
        setHovered(false);
    };

    return React.createElement(
        'div',
        {
            ref: rootRef,
            onMouseEnter: function () {
                setHovered(true);
            },
            onMouseLeave: onRootLeave,
            style: {
                width: '100%',
                height: '100%',
                position: 'relative',
                boxSizing: 'border-box',
                overflow: 'visible',
                pointerEvents: 'none',
            },
        },
        /**
         * Dashed frame drawn as an inner div so the xyflow wrapper has no border —
         * keeps handle positions (left:0 / top:0) exactly on the wrapper outer edge
         * (= ELK boundary). Border-box + inset:0 draws the 1px border INSIDE the outer edge.
         */
        React.createElement('div', {
            key: 'group-frame',
            style: {
                position: 'absolute',
                inset: 0,
                boxSizing: 'border-box',
                border: '1px dashed #64748b',
                borderRadius: GROUP_NODE_BORDER_RADIUS,
                pointerEvents: 'none',
            },
        }),
        labelPill,
        React.createElement(
            'div',
            {
                style: {
                    width: '100%',
                    height: '100%',
                    position: 'relative',
                    boxSizing: 'border-box',
                    overflow: 'visible',
                    pointerEvents: 'none',
                },
            },
            parts
        ),
        React.createElement(ElkSideHoverPanel, {
            visible: showHoverPanel,
            nodeWidth: gw,
            nodeHeight: gh,
            borderRadius: GROUP_NODE_BORDER_RADIUS,
            text: detail,
            panelRef: panelRef,
            onPanelMouseLeave: onPanelLeave,
        })
    );
}

/**
 * ELK orthogonal route: draw the exact polyline from layout (all sections:
 * startPoint → bendPoints → endPoint), same coordinate space as nodes.
 * Falls back to a straight segment between handles if ELK gave no section geometry.
 */
function ElkOrthogonalEdge(props) {
    const { id, sourceX, sourceY, targetX, targetY, markerEnd, style, data } = props;
    const routePoints = (data && data.routePoints) || [];
    let edgePath = '';

    if (routePoints.length >= 2) {
        /**
         * Use the ELK polyline as-is — it is geometrically exact (straight orthogonal
         * segments aligned with node boundaries). Do NOT substitute sourceX/sourceY or
         * targetX/targetY from xyflow handles: those come from DOM measurements that can
         * differ by sub-pixels due to border widths, CSS transforms, and parent offsets.
         */
        const pts = routePoints.map((p) => ({ x: Number(p.x), y: Number(p.y) }));
        const deduped = [];
        for (let i = 0; i < pts.length; i++) {
            const p = pts[i];
            const prev = deduped[deduped.length - 1];
            if (
                !prev ||
                Math.abs(prev.x - p.x) > 0.01 ||
                Math.abs(prev.y - p.y) > 0.01
            ) {
                deduped.push(p);
            }
        }
        if (deduped.length >= 2) {
            edgePath = 'M ' + deduped[0].x + ' ' + deduped[0].y;
            for (let i = 1; i < deduped.length; i++) {
                edgePath += ' L ' + deduped[i].x + ' ' + deduped[i].y;
            }
        } else {
            edgePath =
                'M ' + sourceX + ' ' + sourceY + ' L ' + targetX + ' ' + targetY;
        }
    } else {
        edgePath =
            'M ' + sourceX + ' ' + sourceY + ' L ' + targetX + ' ' + targetY;
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

/**
 * Inside ReactFlow:
 *   - Exposes viewport controls (zoomTo, etc.) via window for tests.
 *   - Creates the pill overlay layer inside .react-flow__viewport so group label pills
 *     paint above all node wrappers without being trapped in any group's stacking context.
 *
 * The pill layer is a sibling of .react-flow__nodes inside the transformed viewport, so
 * its children use flow coordinates and inherit the RF pan/zoom transform automatically.
 */
function AtelierViewportApiBootstrap() {
    const rf = useReactFlow();
    useLayoutEffect(
        function () {
            window.__atelierR6ViewportApi = rf;
            const root = document.getElementById('reactflowRoot');
            const viewport = root ? root.querySelector('.react-flow__viewport') : null;
            if (viewport) {
                let layer = viewport.querySelector(':scope > .atelier-rf-pill-layer');
                if (!layer) {
                    layer = document.createElement('div');
                    layer.className = 'atelier-rf-pill-layer';
                    /**
                     * Zero-size positioned wrapper; children use absolute flow coords.
                     * z-index beats .react-flow__nodes (which we set to 1 in index.html).
                     */
                    layer.style.cssText =
                        'position:absolute;left:0;top:0;width:0;height:0;' +
                        'pointer-events:none;z-index:50000;';
                    viewport.appendChild(layer);
                }
                window.__atelierR6PillLayer = layer;
                window.dispatchEvent(new CustomEvent('atelier-rf-pill-layer-ready'));
            }
            return function () {
                try {
                    delete window.__atelierR6ViewportApi;
                } catch (_) {}
            };
        },
        [rf]
    );
    return null;
}

/** RF measures DOM and can shrink nodes with short labels; ELK boxes must stay fixed. */
function clampElkCustomNodeDimensions(nodeList) {
    return nodeList.map(function (n) {
        if (n.type !== 'custom' || !n.data) return n;
        var dw = n.data.width;
        var dh = n.data.height;
        if (dw == null || dh == null) return n;
        if (n.width === dw && n.height === dh) return n;
        return Object.assign({}, n, { width: dw, height: dh });
    });
}

/** Cubic ease-in-out for layout tween (same idea as xyflow node-position-animation Pro example). */
function rfCubicInOut(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

var RF_LAYOUT_ANIM_MS = 350;
var RF_LAYOUT_EXIT_MS = 200;

/** Hover / expandable metadata merged onto ELK→RF nodes (shared mount + in-place refresh). */
function enrichRfNodesFromDiagram(diagram, nodes) {
    var hoverFn = window.atelierRfHoverDetailByNodeId;
    var hoverMap = typeof hoverFn === 'function' ? hoverFn(diagram) : Object.create(null);
    var expandFn = window.atelierRfExpandableByNodeId;
    var expandMap = typeof expandFn === 'function' ? expandFn(diagram) : Object.create(null);
    return nodes.map(function (n) {
        var hid = hoverMap[n.id];
        var idStr = String(n.id);
        var isCollapse = idStr.endsWith('_collapse');
        var targetMod = expandMap[idStr];
        var dataExtra = {
            hoverDetail: hid != null ? hid : n.data.hoverDetail,
            rfIsCollapse: isCollapse,
        };
        if (n.type === 'custom' && targetMod && !isCollapse) {
            dataExtra.expandable = true;
            dataExtra.targetModuleId = targetMod;
        }
        if (n.type === 'group' && idStr.endsWith('_sub')) {
            dataExtra.rfExpandedSubgraph = true;
        }
        var out = Object.assign({}, n, {
            data: Object.assign({}, n.data || {}, dataExtra),
        });
        if (n.type === 'group' && idStr.endsWith('_sub')) {
            out.className = n.className
                ? n.className + ' atelier-rf-expanded-subgraph'
                : 'atelier-rf-expanded-subgraph';
        }
        if (isCollapse && n.type === 'custom') {
            out.zIndex = 6500;
        }
        return out;
    });
}

function rfComputeParentDbg(nodes) {
    var parentDbg = Object.create(null);
    for (var pi = 0; pi < nodes.length; pi++) {
        var pn = nodes[pi];
        var ppid = pn.parentId != null ? String(pn.parentId) : '';
        parentDbg[String(pn.id)] = ppid ? ppid : null;
    }
    return parentDbg;
}

function rfAssignRfSnapshot(epoch, nodes, edges) {
    window.atelierRfLastRfSnapshot = {
        epoch: epoch != null ? epoch : null,
        at: Date.now(),
        nodes: nodes.map(function (n) {
            return {
                id: String(n.id),
                type: n.type,
                parentId: n.parentId != null ? String(n.parentId) : null,
                zIndex: n.zIndex,
                width: n.width,
                height: n.height,
                position: n.position,
                extent: n.extent,
            };
        }),
        edges: edges.map(function (e) {
            return {
                id: String(e.id),
                source: String(e.source),
                target: String(e.target),
                sourceHandle: e.sourceHandle,
                targetHandle: e.targetHandle,
                type: e.type,
            };
        }),
    };
}

let rfLayoutAnimTimer = null;

window.atelierRfStopLayoutAnimation = function () {
    if (rfLayoutAnimTimer) {
        try {
            rfLayoutAnimTimer.stop();
        } catch (_) {}
        rfLayoutAnimTimer = null;
    }
};

/**
 * ELK + convert + enrich for the current working diagram. Used by mount and animated refresh.
 * @returns {Promise<{ ok: boolean, nodes?: any[], edges?: any[], parentDbg?: object, error?: string }>}
 */
window.atelierRfBuildLayoutElementsForEpoch = async function (epoch) {
    function stale() {
        return epoch != null && epoch !== window.__atelierRfLayoutEpoch;
    }

    const getIr = window.atelierResolveStructuredIrForPipeline;
    const layout = window.runElkLayoutPipeline;
    const convert = window.elkLaidOutToReactFlowElements;
    if (typeof getIr !== 'function' || typeof layout !== 'function' || typeof convert !== 'function') {
        return {
            ok: false,
            error: 'R6 prerequisites missing (atelierResolveStructuredIrForPipeline / runElkLayoutPipeline / elkLaidOutToReactFlowElements).',
        };
    }
    if (typeof window.atelierRfEnsureExpansionContext === 'function') {
        window.atelierRfEnsureExpansionContext();
    }
    var diagram =
        typeof window.atelierRfRebuildWorkingDiagram === 'function'
            ? window.atelierRfRebuildWorkingDiagram()
            : null;
    if (!diagram && typeof getIr === 'function') {
        diagram = getIr().diagram || null;
    }
    if (!diagram) {
        return { ok: false, error: 'no_diagram' };
    }
    const res = await layout(diagram);
    if (stale()) return { ok: false, error: 'stale' };
    if (!res.ok || !res.laidOut) {
        return { ok: false, error: res.error || 'ELK layout failed' };
    }
    const dim =
        window.atelierElkNodeDimensions &&
        typeof window.atelierElkNodeDimensions.getReactFlowDimensionProfile === 'function'
            ? window.atelierElkNodeDimensions.getReactFlowDimensionProfile()
            : undefined;
    var converted = convert(res.laidOut, dim);
    var nodes = enrichRfNodesFromDiagram(diagram, converted.nodes);
    var edges = converted.edges;
    var parentDbg = rfComputeParentDbg(nodes);
    if (stale()) return { ok: false, error: 'stale' };
    return { ok: true, nodes: nodes, edges: edges, parentDbg: parentDbg };
};

/**
 * Tween node positions (d3-timer), fade entering/exiting nodes, fade edges in.
 */
window.atelierRfAnimateLayoutTransition = function (opts) {
    var oldNodes = opts.oldNodes || [];
    var targetNodes = opts.targetNodes || [];
    var targetEdges = opts.targetEdges || [];
    var parentDbg = opts.parentDbg;
    var epoch = opts.epoch;
    var onComplete = typeof opts.onComplete === 'function' ? opts.onComplete : function () {};
    var setNodes = window.__atelierR6SetNodes;
    var setEdges = window.__atelierR6SetEdges;
    if (typeof setNodes !== 'function' || typeof setEdges !== 'function') {
        setNodes(targetNodes);
        setEdges(targetEdges);
        if (parentDbg) window.atelierRfLastNodeParentById = parentDbg;
        rfAssignRfSnapshot(epoch, targetNodes, targetEdges);
        onComplete();
        return;
    }

    window.atelierRfStopLayoutAnimation();

    var oldById = new Map();
    for (var oi = 0; oi < oldNodes.length; oi++) {
        var on = oldNodes[oi];
        oldById.set(String(on.id), on);
    }
    var newIdSet = new Set(targetNodes.map(function (n) {
        return String(n.id);
    }));
    var exitingIds = [];
    oldById.forEach(function (_node, id) {
        if (!newIdSet.has(id)) exitingIds.push(id);
    });

    /**
     * Compute absolute positions in the old layout for exiting ghost nodes.
     * Ghosts must be detached from their parent (parentId removed) during the
     * fade-out so they don't ride along with a parent that's being repositioned.
     */
    function computeOldAbsolutePos(nodeId) {
        var pos = { x: 0, y: 0 };
        var cur = nodeId;
        while (cur) {
            var nd = oldById.get(cur);
            if (!nd) break;
            pos.x += nd.position.x;
            pos.y += nd.position.y;
            cur = nd.parentId ? String(nd.parentId) : null;
        }
        return pos;
    }

    var exitingAbsPos = new Map();
    for (var ei = 0; ei < exitingIds.length; ei++) {
        exitingAbsPos.set(exitingIds[ei], computeOldAbsolutePos(exitingIds[ei]));
    }

    /**
     * Build a "spatial anchor" map for entering nodes based on expand/collapse
     * naming conventions (`X` <-> `X_sub`). On collapse: `root_leaf` enters while
     * `root_leaf_sub` exits — the leaf should start at the group's position.
     * On expand: `root_leaf_sub` enters while `root_leaf` exits — the group
     * should start at the leaf's position.
     *
     * Position must be in the SAME coordinate space as the target node (relative
     * to its parent). If both share the same parent, use anchor's relative pos.
     * Otherwise fall back to absolute conversion.
     */
    var targetById = new Map();
    for (var tbi = 0; tbi < targetNodes.length; tbi++) {
        targetById.set(String(targetNodes[tbi].id), targetNodes[tbi]);
    }

    function computeNewAbsolutePos(nodeId) {
        var pos = { x: 0, y: 0 };
        var cur = nodeId;
        while (cur) {
            var nd = targetById.get(cur);
            if (!nd) break;
            pos.x += nd.position.x;
            pos.y += nd.position.y;
            cur = nd.parentId ? String(nd.parentId) : null;
        }
        return pos;
    }

    /**
     * enteringAnchor: for expand/collapse pairs, stores:
     *   { absX, absY, width, height, parentId } — absolute screen pos of the
     *   OLD counterpart, plus its size. The entering node's relative position
     *   is computed each frame so its SCREEN pos stays locked at (absX, absY)
     *   even while its parent is being animated.
     */
    var enteringAnchor = new Map();
    var anchoredExitIds = new Set();
    for (var si = 0; si < targetNodes.length; si++) {
        var sn = targetNodes[si];
        var sid = String(sn.id);
        if (oldById.has(sid)) continue;
        var anchorId = sid.endsWith('_sub') ? sid.slice(0, -4) : sid + '_sub';
        var anchor = oldById.get(anchorId);
        if (anchor) {
            var anchorAbsPos = computeOldAbsolutePos(anchorId);
            enteringAnchor.set(sid, {
                absX: anchorAbsPos.x,
                absY: anchorAbsPos.y,
                width: anchor.width || (anchor.data && anchor.data.width) || 0,
                height: anchor.height || (anchor.data && anchor.data.height) || 0,
                parentId: String(sn.parentId || ''),
            });
            anchoredExitIds.add(anchorId);
        }
    }

    var duration = RF_LAYOUT_ANIM_MS;
    var exitMs = RF_LAYOUT_EXIT_MS;

    rfLayoutAnimTimer = timer(function (elapsed) {
        function staleAnim() {
            return epoch != null && epoch !== window.__atelierRfLayoutEpoch;
        }
        if (staleAnim()) {
            window.atelierRfStopLayoutAnimation();
            return;
        }

        var tPos = Math.min(1, elapsed / duration);
        var easedPos = rfCubicInOut(tPos);
        var exitAlpha = elapsed >= exitMs ? 0 : 1 - elapsed / exitMs;

        /** Target nodes first — preserves ELK parent-before-child order for xyflow. */
        var frameNodes = [];

        for (var ti = 0; ti < targetNodes.length; ti++) {
            var tn = targetNodes[ti];
            var tid = String(tn.id);
            var oid = oldById.get(tid);
            var px = tn.position.x;
            var py = tn.position.y;
            var op = 1;
            var tweenW = null;
            var tweenH = null;
            if (!oid) {
                var anch = enteringAnchor.get(tid);
                if (anch) {
                    /**
                     * Two-phase easing: size shrinks/grows during 0..1 (cubic),
                     * but the screen position holds at the anchor for the first
                     * ~45% then slides to the ELK target. TL appears "stable"
                     * during the morph; final frame matches setNodes(targetNodes)
                     * so no snap.
                     */
                    var posStart = 0.45;
                    var posT = tPos <= posStart ? 0 : (tPos - posStart) / (1 - posStart);
                    var easedPosForMove = rfCubicInOut(posT);

                    var leafNewAbs = computeNewAbsolutePos(tid);
                    var leafScreenX = anch.absX + (leafNewAbs.x - anch.absX) * easedPosForMove;
                    var leafScreenY = anch.absY + (leafNewAbs.y - anch.absY) * easedPosForMove;

                    var parentScreenX = 0;
                    var parentScreenY = 0;
                    if (anch.parentId) {
                        var pOldAbs = computeOldAbsolutePos(anch.parentId);
                        var pNewAbs = computeNewAbsolutePos(anch.parentId);
                        parentScreenX = pOldAbs.x + (pNewAbs.x - pOldAbs.x) * easedPos;
                        parentScreenY = pOldAbs.y + (pNewAbs.y - pOldAbs.y) * easedPos;
                    }
                    px = leafScreenX - parentScreenX;
                    py = leafScreenY - parentScreenY;
                    var finalW = tn.width || (tn.data && tn.data.width) || 0;
                    var finalH = tn.height || (tn.data && tn.data.height) || 0;
                    if (anch.width && finalW) {
                        tweenW = anch.width + (finalW - anch.width) * easedPos;
                    }
                    if (anch.height && finalH) {
                        tweenH = anch.height + (finalH - anch.height) * easedPos;
                    }
                    op = 1;
                } else {
                    op = easedPos;
                }
            } else {
                var pOld = String(oid.parentId || '');
                var pNew = String(tn.parentId || '');
                if (pOld === pNew) {
                    px = oid.position.x + (tn.position.x - oid.position.x) * easedPos;
                    py = oid.position.y + (tn.position.y - oid.position.y) * easedPos;
                }
            }
            var ns = Object.assign({}, tn.style || {}, { opacity: op });
            if (tweenW != null) ns.width = tweenW;
            if (tweenH != null) ns.height = tweenH;
            var frameNode = Object.assign({}, tn, {
                position: { x: px, y: py },
                style: ns,
            });
            if (tweenW != null || tweenH != null) {
                frameNode.width = tweenW != null ? tweenW : tn.width;
                frameNode.height = tweenH != null ? tweenH : tn.height;
                frameNode.data = Object.assign({}, tn.data || {}, {
                    width: tweenW != null ? tweenW : (tn.data && tn.data.width),
                    height: tweenH != null ? tweenH : (tn.data && tn.data.height),
                });
            }
            /**
             * extent: 'parent' clamps a child's position to its parent's bounds.
             * During the anchor morph the entering node is temporarily larger than
             * its re-laid-out parent (e.g. on collapse, the leaf starts at the
             * old group's size), and without relaxing the extent here xyflow
             * silently repositions the node away from the locked TL. The final
             * frame uses targetNodes so the original extent is restored.
             */
            if (!oid && enteringAnchor.has(tid) && tPos < 1) {
                frameNode.extent = undefined;
            }
            frameNodes.push(frameNode);
        }

        for (var ex = 0; ex < exitingIds.length; ex++) {
            var eid = exitingIds[ex];
            if (exitAlpha <= 0) continue;
            if (anchoredExitIds.has(eid)) continue;
            var ghost = oldById.get(eid);
            if (!ghost) continue;
            if (ghost.parentId && !exitingAbsPos.has(String(ghost.parentId))) {
                continue;
            }
            var absP = exitingAbsPos.get(eid) || ghost.position;
            var gs = Object.assign({}, ghost.style || {}, { opacity: exitAlpha });
            frameNodes.push(Object.assign({}, ghost, {
                position: absP,
                parentId: undefined,
                extent: undefined,
                style: gs,
                draggable: false,
            }));
        }

        setNodes(clampElkCustomNodeDimensions(frameNodes));

        var edgeOp = rfCubicInOut(Math.min(1, elapsed / duration));
        var edgeFrame = targetEdges.map(function (e) {
            var es = Object.assign({}, e.style || {}, { opacity: edgeOp });
            return Object.assign({}, e, { style: es });
        });
        setEdges(edgeFrame);

        if (tPos >= 1) {
            window.atelierRfStopLayoutAnimation();
            setNodes(clampElkCustomNodeDimensions(targetNodes));
            setEdges(targetEdges);
            if (parentDbg) window.atelierRfLastNodeParentById = parentDbg;
            rfAssignRfSnapshot(epoch, targetNodes, targetEdges);
            queueMicrotask(function () {
                if (typeof window.atelierRfSyncSelectionHighlight === 'function') {
                    window.atelierRfSyncSelectionHighlight();
                }
                onComplete();
            });
        }
    });

    return rfLayoutAnimTimer;
};

function Inner(props) {
    const initialNodes = props.initialNodes || [];
    const initialEdges = props.initialEdges || [];
    const [nodes, setNodes] = useNodesState(initialNodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
    const nodesRef = useRef(nodes);
    nodesRef.current = nodes;

    useEffect(
        function () {
            window.__atelierR6SetNodes = setNodes;
            window.__atelierR6SetEdges = setEdges;
            window.__atelierR6GetNodes = function () {
                return nodesRef.current;
            };
            return function () {
                try {
                    delete window.__atelierR6SetNodes;
                    delete window.__atelierR6SetEdges;
                    delete window.__atelierR6GetNodes;
                } catch (_) {}
            };
        },
        [setNodes, setEdges]
    );

    const onNodesChange = useCallback(
        function (changes) {
            setNodes(function (nds) {
                return clampElkCustomNodeDimensions(applyNodeChanges(changes, nds));
            });
        },
        [setNodes]
    );

    const onNodeClick = useCallback(function (ev, node) {
        if (typeof window.atelierRfHandleNodeClick === 'function') {
            window.atelierRfHandleNodeClick({
                nodeId: node.id,
                nodeType: node.type,
                event: ev && ev.nativeEvent ? ev.nativeEvent : ev,
                expandable: !!(node.data && node.data.expandable),
                targetModuleId: node.data && node.data.targetModuleId,
                isCollapse: !!(node.data && node.data.rfIsCollapse),
            });
        }
    }, []);

    const onPaneClick = useCallback(function () {
        if (typeof window.atelierRfOnPaneClick === 'function') {
            window.atelierRfOnPaneClick();
        }
    }, []);

    useEffect(
        function () {
            setNodes(clampElkCustomNodeDimensions(initialNodes));
            setEdges(initialEdges);
            queueMicrotask(function () {
                if (typeof window.atelierRfSyncSelectionHighlight === 'function') {
                    window.atelierRfSyncSelectionHighlight();
                }
            });
        },
        [initialNodes, initialEdges, setNodes, setEdges]
    );

    return React.createElement(
        ReactFlow,
        {
            nodes,
            edges,
            onNodesChange,
            onEdgesChange,
            onNodeClick,
            onPaneClick,
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
            panOnScroll: true,
            panOnScrollMode: 'free',
            zoomOnScroll: false,
            zoomOnPinch: true,
            defaultEdgeOptions: {
                markerEnd: {
                    type: MarkerType.ArrowClosed,
                    width: 14,
                    height: 14,
                    color: '#64748b',
                },
            },
        },
        React.createElement(AtelierViewportApiBootstrap, null),
        React.createElement(Background, { gap: 16, color: '#cbd5e1' }),
        React.createElement(Controls, { showInteractive: false })
    );
}

function App(props) {
    return React.createElement(ReactFlowProvider, null, React.createElement(Inner, props));
}

let rfRoot = null;
let rfContainer = null;

/** Call before setting reactflowRoot.innerHTML so React is not torn down mid-commit (flash / blank graph). */
window.atelierUnmountReactFlowR6 = function () {
    if (typeof window.atelierRfStopLayoutAnimation === 'function') {
        window.atelierRfStopLayoutAnimation();
    }
    if (rfRoot) {
        try {
            rfRoot.unmount();
        } catch (_) {}
        rfRoot = null;
        rfContainer = null;
    }
    try {
        window.atelierRfLastNodeParentById = null;
    } catch (_) {}
};

window.atelierMountReactFlowR6 = async function (container, epoch) {
    if (!container) return;

    function stale() {
        return epoch != null && epoch !== window.__atelierRfLayoutEpoch;
    }

    if (rfRoot && rfContainer === container) {
        try {
            rfRoot.unmount();
        } catch (_) {}
        rfRoot = null;
        rfContainer = null;
    }

    const built = await window.atelierRfBuildLayoutElementsForEpoch(epoch);
    if (stale()) return;

    if (!built.ok) {
        if (stale()) return;
        if (built.error === 'stale') return;
        container.innerHTML = '';
        const d = document.createElement('div');
        if (built.error === 'no_diagram') {
            d.className = 'loading';
            d.textContent =
                'No structured diagram for React Flow (overview: Mermaid or DIAGRAM_JSON; module: diagram on module_tree).';
        } else if (
            built.error &&
            built.error.indexOf('prerequisites missing') !== -1
        ) {
            d.className = 'error';
            d.textContent = built.error;
        } else {
            d.className = 'error';
            d.textContent = 'ELK layout (R6): ' + (built.error || 'failed');
        }
        container.appendChild(d);
        return;
    }

    var nodes = built.nodes;
    var edges = built.edges;
    var parentDbg = built.parentDbg;
    if (stale()) return;
    const key = 'rf-' + (epoch != null ? epoch : Date.now());

    /**
     * Always tear down and create a new root before render. Reusing a root across
     * async ELK while refreshReactFlowView can unmount + replace innerHTML causes
     * React commit / removeChild crashes (seen on large graphs e.g. pydantic-ai).
     */
    window.atelierUnmountReactFlowR6();
    if (stale()) return;
    window.atelierRfLastNodeParentById = parentDbg;
    window.atelierRfLastRfSnapshot = {
        epoch: epoch != null ? epoch : null,
        at: Date.now(),
        nodes: nodes.map(function (n) {
            return {
                id: String(n.id),
                type: n.type,
                parentId: n.parentId != null ? String(n.parentId) : null,
                zIndex: n.zIndex,
                width: n.width,
                height: n.height,
                position: n.position,
                extent: n.extent,
            };
        }),
        edges: edges.map(function (e) {
            return {
                id: String(e.id),
                source: String(e.source),
                target: String(e.target),
                sourceHandle: e.sourceHandle,
                targetHandle: e.targetHandle,
                type: e.type,
            };
        }),
    };
    rfRoot = createRoot(container);
    rfContainer = container;
    rfRoot.render(
        React.createElement(App, {
            key,
            initialNodes: nodes,
            initialEdges: edges,
        })
    );
    queueMicrotask(function () {
        if (typeof window.atelierRfSyncSelectionHighlight === 'function') {
            window.atelierRfSyncSelectionHighlight();
        }
        if (window.atelierRfDebugLayout && typeof window.atelierRfLogLayoutDebug === 'function') {
            window.atelierRfLogLayoutDebug('rf-mount epoch=' + String(epoch));
        }
    });
};

window.atelierR6ReactFlowReady = true;
