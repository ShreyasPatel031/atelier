/**
 * R6: ELK → React Flow with ELK-accurate handles (ports), matching openai-realtime-elkjs-tool.
 */
import React, { Fragment, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'https://esm.sh/react@18.3.1';
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
/** Side snippet: fixed width in diagram (flow) px; height follows content up to maxHeight. */
const RF_HOVER_DETAIL_PANEL_WIDTH = 280;
const RF_HOVER_DETAIL_PANEL_MAX_HEIGHT = 440;

const LEAF_NODE_BORDER_RADIUS = 6;
/** Matches pipeline-elk-reactflow group node style.borderRadius */
const GROUP_NODE_BORDER_RADIUS = 8;
/** Must match `backgroundColor` / stroke on group nodes in pipeline-elk-reactflow.js (rgb + alpha on fill). */
const GROUP_NODE_TINT = '241, 245, 249';
/** Pill: same hue as group fill (see pipeline `rgba(241,245,249,0.4)`), fully opaque for legibility. */
const GROUP_LABEL_PILL_BG = 'rgba(' + GROUP_NODE_TINT + ', 1)';
const GROUP_LABEL_PILL_BORDER = '1px solid rgba(100, 116, 139, 0.42)';
/** Group title pill (portaled to .atelier-rf-pill-layer at RF_PILL_LAYER_Z_INDEX). */
const GROUP_LABEL_Z_INDEX = 20000;
/** Viewport overlay layer — group labels, help pills, hover snippets (see AtelierViewportApiBootstrap). */
const RF_PILL_LAYER_Z_INDEX = 50000;
/** Hover snippet z-index inside the pill layer (above GROUP_LABEL_Z_INDEX + help pills). */
const RF_HOVER_ABOVE_PILL_Z_INDEX = 60000;

const RF_SEMANTIC_NODE_STYLES = {
    stakeholder_surface: {
        label: 'Stakeholder work surfaces',
        background: '#eff6ff',
        border: '#2563eb',
        text: '#1e3a8a',
    },
    external_data_source: {
        label: 'External data sources',
        background: '#fff7ed',
        border: '#ea580c',
        text: '#7c2d12',
    },
    control_spine: {
        label: 'Control spine / governance',
        background: '#f5f3ff',
        border: '#7c3aed',
        text: '#4c1d95',
    },
    neutral: {
        label: 'Functional domains / neutral modules',
        background: '#f8fafc',
        border: '#64748b',
        text: '#334155',
    },
    user: {
        label: 'Users / personas',
        background: '#eff6ff',
        border: '#2563eb',
        text: '#1e3a8a',
    },
    entry: {
        label: 'Entrypoints / data',
        background: '#fff7ed',
        border: '#f97316',
        text: '#7c2d12',
    },
    module: {
        label: 'Drill-down modules',
        background: '#f5f3ff',
        border: '#7c3aed',
        text: '#3b0764',
    },
    external: {
        label: 'External systems',
        background: '#fef2f2',
        border: '#dc2626',
        text: '#7f1d1d',
    },
    agent: {
        label: 'Agents / services',
        background: '#ecfdf5',
        border: '#059669',
        text: '#064e3b',
    },
    component: {
        label: 'Other components',
        background: '#f8fafc',
        border: '#64748b',
        text: '#0f172a',
    },
};

const RF_SEMANTIC_LEGEND_ORDER = [
    'stakeholder_surface',
    'external_data_source',
    'control_spine',
    'neutral',
    'user',
    'entry',
    'module',
    'external',
    'agent',
    'component',
];

const RF_GROUP_VARIATION_LABELS = {
    'group-only': 'Group color only',
    'node-border': 'Node borders only',
    'group-node-border': 'Group + node borders',
    'group-node-border-outline': 'No group fill + node borders',
    'group-node-border-soft': 'Soft group tint + node borders',
    'group-node-border-medium': 'Medium group tint + node borders',
    'group-node-border-strong': 'Strong group tint + node borders',
    all: 'Group + filled nodes',
};

const RF_GROUP_VARIATION_STYLES = {
    'group-only': { groupFill: 0.14, groupBorder: true, node: 'none', borderStyle: 'solid', borderWidth: 2 },
    'node-border': { groupFill: 0, groupBorder: false, node: 'border', borderStyle: 'dashed', borderWidth: 1 },
    'group-node-border': { groupFill: 0.12, groupBorder: true, node: 'border', borderStyle: 'solid', borderWidth: 2 },
    'group-node-border-outline': { groupFill: 0, groupBorder: true, node: 'border', borderStyle: 'solid', borderWidth: 2 },
    'group-node-border-soft': { groupFill: 0.07, groupBorder: true, node: 'border', borderStyle: 'solid', borderWidth: 2 },
    'group-node-border-medium': { groupFill: 0.14, groupBorder: true, node: 'border', borderStyle: 'solid', borderWidth: 2 },
    'group-node-border-strong': { groupFill: 0.22, groupBorder: true, node: 'border', borderStyle: 'solid', borderWidth: 2 },
    all: { groupFill: 0.14, groupBorder: true, node: 'fill', borderStyle: 'solid', borderWidth: 2 },
};

const NODE_HOVER_EDGE_STYLE = {
    stroke: '#3b82f6',
    strokeDasharray: '7 5',
    animation: 'diagram-edge-dash-flow 0.8s linear infinite',
};

function rfColorWithAlpha(color, alpha) {
    if (alpha <= 0) return 'transparent';
    if (!color || typeof color !== 'string') return 'transparent';
    var hex = color.trim();
    if (!/^#[0-9a-fA-F]{6}$/.test(hex)) return color;
    var r = parseInt(hex.slice(1, 3), 16);
    var g = parseInt(hex.slice(3, 5), 16);
    var b = parseInt(hex.slice(5, 7), 16);
    return 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')';
}

function rfClampAlpha(value, fallback) {
    var n = Number(value);
    if (!Number.isFinite(n)) n = Number(fallback);
    if (!Number.isFinite(n)) n = 0.14;
    return Math.max(0, Math.min(0.45, Math.round(n * 1000) / 1000));
}

function rfHelpPillStopPropagation(e) {
    if (e && typeof e.stopPropagation === 'function') e.stopPropagation();
}

/** Architectural Agent / Cursor paste — wired in demo/index.html */
function rfChatEnabled() {
    return !(typeof window !== 'undefined' && window.__atelierChatEnabled === false);
}

function rfTriggerBriefExplanation(nodeId, label, kind) {
    if (!rfChatEnabled()) return;
    const fn = typeof window !== 'undefined' ? window.atelierRfAskBriefExplanation : null;
    if (typeof fn !== 'function') return;
    fn({ nodeId: String(nodeId || ''), label: label || '', kind });
}

/** Max panel height in flow units (constant on-screen size via zoom). */
function rfHoverPanelMaxHeightFlow(zoom) {
    const z = zoom > 0 ? zoom : 1;
    let maxScreen = RF_HOVER_DETAIL_PANEL_MAX_HEIGHT;
    if (typeof window !== 'undefined' && window.innerHeight > 0) {
        maxScreen = Math.min(maxScreen, Math.max(200, window.innerHeight - 96));
    }
    return maxScreen / z;
}

/**
 * Fixed screen width; height fits content up to viewport cap, then scrolls.
 * Dimensions scale with 1/zoom so the panel stays readable when zoomed out.
 */
function ElkSideHoverPanel({
    visible,
    borderRadius,
    text,
    panelRef,
    onPanelMouseLeave,
    flowLeft,
    flowTop,
    portalLayer,
    zoom = 1,
}) {
    const z = zoom > 0 ? zoom : 1;
    const panelW = RF_HOVER_DETAIL_PANEL_WIDTH / z;
    const pad = 8 / z;
    const fontSize = 11 / z;
    const maxH = rfHoverPanelMaxHeightFlow(z);
    const [layout, setLayout] = useState({ height: null, scroll: false });

    useLayoutEffect(
        function () {
            if (!visible) {
                setLayout({ height: null, scroll: false });
                return;
            }
            const el = panelRef && panelRef.current;
            if (!el) return;
            el.style.height = 'auto';
            el.style.maxHeight = 'none';
            el.style.overflowY = 'visible';
            const natural = el.scrollHeight;
            if (natural <= maxH) {
                setLayout({ height: natural, scroll: false });
            } else {
                setLayout({ height: maxH, scroll: true });
            }
        },
        [visible, text, maxH, z, panelRef]
    );

    if (!visible) return null;
    const usePortal =
        portalLayer &&
        typeof flowLeft === 'number' &&
        typeof flowTop === 'number';
    const panelEl = React.createElement(
        'div',
        {
            ref: panelRef,
            'data-testid': 'atelier-rf-hover-panel',
            onMouseLeave: onPanelMouseLeave,
            style: {
                position: 'absolute',
                left: usePortal ? flowLeft : 'calc(100% + ' + NODE_HOVER_SIDE_GAP_PX / z + 'px)',
                top: usePortal ? flowTop : 0,
                width: panelW,
                height: layout.height != null ? layout.height : 'auto',
                maxHeight: layout.scroll ? maxH : undefined,
                overflowY: layout.scroll ? 'auto' : 'visible',
                overflowX: 'hidden',
                boxSizing: 'border-box',
                padding: pad + 'px',
                fontSize: fontSize,
                lineHeight: 1.35,
                color: '#0f172a',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                overflowWrap: 'break-word',
                background: '#fff',
                border: '1px solid #475569',
                borderRadius: borderRadius / z,
                boxShadow: '0 4px 14px rgba(15,23,42,0.14)',
                zIndex: usePortal ? RF_HOVER_ABOVE_PILL_Z_INDEX : RF_PILL_LAYER_Z_INDEX,
                pointerEvents: 'auto',
                textAlign: 'left',
            },
        },
        text || ''
    );
    if (usePortal) {
        return createPortal(panelEl, portalLayer);
    }
    return panelEl;
}

function containsNode(ancestor, node) {
    if (!ancestor || !node) return false;
    if (typeof Node !== 'undefined' && !(node instanceof Node)) return false;
    return ancestor === node || ancestor.contains(node);
}

/**
 * True if the pointer stack includes a non-group React Flow node other than selfId.
 * Clears expanded-group hover when moving onto a leaf, even if the group hover panel
 * overlaps the leaf in paint order (elementsFromPoint would hit the panel first).
 */
function rfPointerOverForeignLeafNode(clientX, clientY, selfId) {
    if (typeof document === 'undefined' || typeof document.elementsFromPoint !== 'function') return false;
    const sid = String(selfId || '');
    try {
        const stack = document.elementsFromPoint(clientX, clientY);
        if (!stack || !stack.length) return false;
        const seen = new WeakSet();
        for (let i = 0; i < stack.length; i++) {
            const el = stack[i];
            if (!el || typeof el.closest !== 'function') continue;
            const wrap = el.closest('.react-flow__node[data-id]');
            if (!wrap || seen.has(wrap)) continue;
            seen.add(wrap);
            const nid = wrap.getAttribute('data-id');
            if (!nid || nid === sid) continue;
            if (!wrap.classList.contains('react-flow__node-group')) {
                return true;
            }
        }
        return false;
    } catch (_) {
        return false;
    }
}

/**
 * Portaled “?” sits outside the node DOM; moving across the gap fires mouseleave on the root with
 * relatedTarget not yet on the button. A transparent bridge keeps hover until the pointer hits the pill or leaves both.
 */
function rfHelpHoverLeaveOutside(setHovered, rootRef, panelRef, pillRef, bridgeRef, e) {
    var rel = e.relatedTarget;
    if (containsNode(rootRef.current, rel)) return;
    if (containsNode(panelRef.current, rel)) return;
    if (containsNode(pillRef.current, rel)) return;
    if (containsNode(bridgeRef.current, rel)) return;
    setHovered(false);
}

function rfCollapseExpandedNodeId(nodeId) {
    const id = String(nodeId || '');
    const baseId = id.endsWith('_sub') ? id.slice(0, -'_sub'.length) : id.replace(/_collapse$/, '');
    if (!baseId || typeof window.atelierRfHandleNodeClick !== 'function') return;
    window.atelierRfHandleNodeClick({
        nodeId: baseId + '_collapse',
        nodeType: 'custom',
        event: null,
        label: 'Collapse',
        expandable: false,
        targetModuleId: null,
        isCollapse: true,
    });
}

function rfClientPointInElement(ref, clientX, clientY) {
    const el = ref && ref.current ? ref.current : null;
    if (!el || typeof el.getBoundingClientRect !== 'function') return false;
    const rect = el.getBoundingClientRect();
    return clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom;
}

/**
 * Leaf node: handles centered on the node bbox edge (matches xyflow .react-flow__handle-* and ELK port coords).
 * Do not use negative left/right/top/bottom offsets — those move the connection point outside the ELK rectangle
 * so edges no longer meet the visible border.
 */
/** RF v12 passes width/height from node.{width,height}; prefer those over data so boxes stay ELK-sized. */
function ElkCustomNode({
    id,
    data,
    width: rw,
    height: rh,
    selected: rfSelected,
    positionAbsoluteX,
    positionAbsoluteY,
    position,
}) {
    const [hovered, setHovered] = useState(false);
    const rootRef = useRef(null);
    const panelRef = useRef(null);
    const helpBridgeRef = useRef(null);
    const helpPillRef = useRef(null);

    const zoom = useStore((s) => {
        const t = s.transform;
        const tz = t && typeof t[2] === 'number' && t[2] > 0 ? t[2] : 1;
        return tz;
    });
    const pillLayer = usePillLayer();

    const label = data.label || '';
    const detail = data.hoverDetail != null ? String(data.hoverDetail).trim() : '';
    const expandable = !!(data && data.expandable);
    const collapseBtn = !!(data && data.rfIsCollapse);
    const leafInteractive = expandable || collapseBtn;
    const selected = !!rfSelected;
    const semanticStyle = data && data.rfSemanticStyle ? data.rfSemanticStyle : null;
    const semanticBorder = semanticStyle && semanticStyle.border ? semanticStyle.border : '#475569';
    const semanticBackground = semanticStyle && semanticStyle.background ? semanticStyle.background : '#fff';
    const semanticNodeMode = data && data.rfSemanticNodeMode ? data.rfSemanticNodeMode : 'none';
    const colorNodeFill = semanticNodeMode === 'fill';
    const colorNodeBorder = semanticNodeMode === 'fill' || semanticNodeMode === 'border';
    /** Match hover chrome (blue when expandable/collapse + hover); selected uses the same border, no extra outline */
    const chromeAccent = (hovered && leafInteractive) || selected;
    const showHoverPanel = hovered && detail.length > 0;
    const w = rw ?? data.width ?? 80;
    const h = rh ?? data.height ?? 40;
    const leftHandles = data.leftHandles || [];
    const rightHandles = data.rightHandles || [];
    const topHandles = data.topHandles || [];
    const bottomHandles = data.bottomHandles || [];

    if (collapseBtn) {
        return React.createElement('div', {
            'data-atelier-rf-node-kind': 'collapse-placeholder',
            style: {
                width: w,
                height: h,
                opacity: 0,
                pointerEvents: 'none',
            },
        });
    }

    const morphProgress = typeof data.rfMorphProgress === 'number' ? data.rfMorphProgress : null;
    const morphIsCollapse = !!(data.rfMorphIsCollapse);
    if (morphIsCollapse && morphProgress != null && morphProgress < 1) {
        return React.createElement(
            'div',
            {
                'data-atelier-rf-node-kind': 'collapse-morph',
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
                    pointerEvents: 'none',
                },
            },
            React.createElement('div', {
                key: 'group-ghost',
                style: {
                    position: 'absolute',
                    inset: 0,
                    boxSizing: 'border-box',
                    border: '1px dashed #64748b',
                    borderRadius: GROUP_NODE_BORDER_RADIUS,
                    backgroundColor: 'transparent',
                    pointerEvents: 'none',
                },
            })
        );
    }

    const expandingParent = !!(data && data.rfExpandingParent);
    const hideLeafHandles = expandingParent && morphProgress != null && morphProgress < 1;
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
        if (containsNode(helpPillRef.current, rel)) return;
        if (containsNode(helpBridgeRef.current, rel)) return;
        setHovered(false);
    };
    const onPanelLeave = function (e) {
        var rel = e.relatedTarget;
        if (containsNode(rootRef.current, rel)) return;
        if (containsNode(helpPillRef.current, rel)) return;
        if (containsNode(helpBridgeRef.current, rel)) return;
        setHovered(false);
    };

    const z = zoom > 0 ? zoom : 1;
    /** Gap outside the node’s right edge (screen-constant). */
    const helpSideGapFlow = 6 / z;
    /** Compact “?” — padding + auto height (not full node height). */
    const helpPadY = 3 / z;
    const helpPadX = 6 / z;
    const helpFontPx = Math.max(9 / z, 11 / z);
    const nodeX =
        typeof positionAbsoluteX === 'number'
            ? positionAbsoluteX
            : position && typeof position.x === 'number'
              ? position.x
              : 0;
    const nodeY =
        typeof positionAbsoluteY === 'number'
            ? positionAbsoluteY
            : position && typeof position.y === 'number'
              ? position.y
              : 0;

    const helpBridgeOverlap = 4 / z;
    const helpPillHitW = helpFontPx + 2 * helpPadX + 14 / z;
    const helpBridgeLeft = nodeX + w - helpBridgeOverlap;
    const helpBridgeWidth = helpBridgeOverlap + helpSideGapFlow + helpPillHitW + helpBridgeOverlap;

    /** Hide “?” when the side hover snippet panel has text (avoid stacking two aids). */
    const showHelpPill = hovered && pillLayer && rfChatEnabled();
    const helpPillPortal =
        showHelpPill &&
        createPortal(
            React.createElement(
                Fragment,
                null,
                React.createElement('div', {
                    ref: helpBridgeRef,
                    key: 'help-bridge-' + id,
                    className: 'atelier-rf-help-hover-bridge nodrag nopan',
                    style: {
                        position: 'absolute',
                        left: helpBridgeLeft,
                        top: nodeY,
                        width: helpBridgeWidth,
                        height: h,
                        zIndex: GROUP_LABEL_Z_INDEX + 9,
                        pointerEvents: 'auto',
                        background: 'transparent',
                    },
                    onPointerDown: rfHelpPillStopPropagation,
                    onMouseDown: rfHelpPillStopPropagation,
                    onMouseEnter: function () {
                        setHovered(true);
                    },
                    onMouseLeave: function (e) {
                        rfHelpHoverLeaveOutside(setHovered, rootRef, panelRef, helpPillRef, helpBridgeRef, e);
                    },
                }),
                React.createElement(
                    'button',
                    {
                        ref: helpPillRef,
                        key: 'help-' + id,
                        type: 'button',
                        className: 'atelier-rf-help-pill nodrag nopan',
                        'data-testid': 'atelier-rf-leaf-help',
                        'data-node-id': id,
                        title: 'Ask for a brief explanation (Architectural Agent)',
                        'aria-label': 'Brief explanation for this diagram element',
                        style: {
                            position: 'absolute',
                            left: nodeX + w + helpSideGapFlow,
                            top: nodeY,
                            width: 'auto',
                            height: 'auto',
                            minWidth: helpFontPx + 2 * helpPadX,
                            boxSizing: 'border-box',
                            padding: helpPadY + 'px ' + helpPadX + 'px',
                            borderRadius: 9999,
                            zIndex: GROUP_LABEL_Z_INDEX + 10,
                            fontSize: helpFontPx,
                        },
                        onPointerDown: rfHelpPillStopPropagation,
                        onMouseDown: rfHelpPillStopPropagation,
                        onMouseEnter: function () {
                            setHovered(true);
                        },
                        onMouseLeave: function (e) {
                            rfHelpHoverLeaveOutside(setHovered, rootRef, panelRef, helpPillRef, helpBridgeRef, e);
                        },
                        onClick: function (e) {
                            e.preventDefault();
                            e.stopPropagation();
                            rfTriggerBriefExplanation(id, label, 'node');
                        },
                    },
                    '?'
                )
            ),
            pillLayer
        );

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
                    background: colorNodeFill ? semanticBackground : '#fff',
                    border: chromeAccent
                        ? '2px solid #3b82f6'
                        : colorNodeBorder
                          ? '1.5px solid ' + semanticBorder
                          : '1px solid #475569',
                    borderRadius: LEAF_NODE_BORDER_RADIUS,
                    boxShadow: '0 1px 3px rgba(15,23,42,0.12)',
                    overflow: 'hidden',
                    zIndex: 0,
                },
            },
            labelEl
        ),
        ...(!hideLeafHandles ? handleEls : []),
        helpPillPortal,
        React.createElement(ElkSideHoverPanel, {
            visible: showHoverPanel,
            borderRadius: LEAF_NODE_BORDER_RADIUS,
            text: detail,
            panelRef: panelRef,
            onPanelMouseLeave: onPanelLeave,
            flowLeft: nodeX + w + NODE_HOVER_SIDE_GAP_PX / z,
            flowTop: nodeY,
            portalLayer: pillLayer,
            zoom: z,
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
    const helpBridgeRef = useRef(null);
    const helpPillRef = useRef(null);

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
    const semanticStyle = data && data.rfSemanticStyle ? data.rfSemanticStyle : null;
    const semanticGroupStyle = data && data.rfSemanticGroupStyle ? data.rfSemanticGroupStyle : null;
    const colorGroup = !!semanticGroupStyle;
    const groupBorder = colorGroup && semanticStyle && semanticStyle.border ? semanticStyle.border : '#64748b';
    const groupFillAlpha =
        colorGroup && typeof semanticGroupStyle.groupFill === 'number' ? semanticGroupStyle.groupFill : 0;
    const groupBackground =
        colorGroup && semanticStyle && semanticStyle.background
            ? rfColorWithAlpha(semanticStyle.background, groupFillAlpha)
            : 'transparent';
    const groupBorderEnabled = colorGroup && semanticGroupStyle.groupBorder !== false;
    const groupBorderWidth =
        groupBorderEnabled && typeof semanticGroupStyle.borderWidth === 'number'
            ? semanticGroupStyle.borderWidth
            : 1;
    const groupBorderStyle =
        groupBorderEnabled && semanticGroupStyle.borderStyle ? semanticGroupStyle.borderStyle : 'dashed';
    const showHoverPanel = hovered && detail.length > 0;
    const { fontPx, thresh } = readGroupLabelViewTune();
    const z = zoom > 0 ? zoom : 1;
    const inside = z <= thresh;
    /** 6 screen px → flow units (viewport scales by zoom; pill rides that scale via its container). */
    const padFlow = 6 / z;
    const helpSideGapFlow = 6 / z;
    const helpPadY = 3 / z;
    const helpPadX = 6 / z;
    const helpFontPx = Math.max(9 / z, 11 / z);

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
        zIndex: GROUP_LABEL_Z_INDEX,
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

    const groupMorphProgress = typeof data.rfMorphProgress === 'number' ? data.rfMorphProgress : null;
    const hideGroupHandles = groupMorphProgress != null && groupMorphProgress < 1;

    const parts = [];

    const pointerInsideGroupControls = useCallback(
        function (clientX, clientY) {
            if (rfPointerOverForeignLeafNode(clientX, clientY, id)) {
                return false;
            }
            return (
                rfClientPointInElement(rootRef, clientX, clientY) ||
                rfClientPointInElement(panelRef, clientX, clientY) ||
                rfClientPointInElement(helpPillRef, clientX, clientY) ||
                rfClientPointInElement(helpBridgeRef, clientX, clientY)
            );
        },
        [id]
    );

    useEffect(() => {
        if (!(data && data.rfExpandedSubgraph)) return;
        function onPointerMove(e) {
            setHovered(pointerInsideGroupControls(e.clientX, e.clientY));
        }
        function onWindowBlur() {
            setHovered(false);
        }
        document.addEventListener('pointermove', onPointerMove, true);
        window.addEventListener('blur', onWindowBlur);
        return () => {
            document.removeEventListener('pointermove', onPointerMove, true);
            window.removeEventListener('blur', onWindowBlur);
        };
    }, [data, pointerInsideGroupControls]);

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

    if (!hideGroupHandles) {
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
    }

    const labelPill =
        pillLayer && !showHoverPanel
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
        if (typeof e.clientX === 'number' && pointerInsideGroupControls(e.clientX, e.clientY)) return;
        var rel = e.relatedTarget;
        if (containsNode(panelRef.current, rel)) return;
        if (containsNode(helpPillRef.current, rel)) return;
        if (containsNode(helpBridgeRef.current, rel)) return;
        setHovered(false);
    };
    const onPanelLeave = function (e) {
        if (typeof e.clientX === 'number' && pointerInsideGroupControls(e.clientX, e.clientY)) return;
        var rel = e.relatedTarget;
        if (containsNode(rootRef.current, rel)) return;
        if (containsNode(helpPillRef.current, rel)) return;
        if (containsNode(helpBridgeRef.current, rel)) return;
        setHovered(false);
    };

    const helpBridgeOverlap = 4 / z;
    const helpPillHitW = helpFontPx + 2 * helpPadX + 14 / z;
    const helpBridgeLeft = nodeX + gw - helpBridgeOverlap;
    const helpBridgeWidth = helpBridgeOverlap + helpSideGapFlow + helpPillHitW + helpBridgeOverlap;

    const showCollapsePill = hovered && pillLayer && !!(data && data.rfExpandedSubgraph);
    const showHelpPill = hovered && pillLayer && rfChatEnabled();
    const showControlPills = showCollapsePill || showHelpPill;
    const controlGapFlow = 4 / z;
    const controlPillStyle = {
        width: 'auto',
        height: 'auto',
        minWidth: helpFontPx + 2 * helpPadX,
        boxSizing: 'border-box',
        padding: helpPadY + 'px ' + helpPadX + 'px',
        borderRadius: 9999,
        fontSize: helpFontPx,
        lineHeight: 1,
    };
    const helpPillPortal = showControlPills
        ? createPortal(
              React.createElement(
                  Fragment,
                  null,
                  React.createElement('div', {
                      ref: helpBridgeRef,
                      key: 'help-bridge-' + id,
                      className: 'atelier-rf-help-hover-bridge nodrag nopan',
                      style: {
                          position: 'absolute',
                          left: helpBridgeLeft,
                          top: nodeY,
                          width: helpBridgeWidth,
                          height: gh,
                          zIndex: GROUP_LABEL_Z_INDEX + 1,
                          pointerEvents: 'auto',
                          background: 'transparent',
                      },
                      onPointerDown: rfHelpPillStopPropagation,
                      onMouseDown: rfHelpPillStopPropagation,
                      onMouseEnter: function () {
                          setHovered(true);
                      },
                      onMouseLeave: function (e) {
                          rfHelpHoverLeaveOutside(setHovered, rootRef, panelRef, helpPillRef, helpBridgeRef, e);
                      },
                  }),
                  React.createElement(
                      'div',
                      {
                          ref: helpPillRef,
                          key: 'control-column-' + id,
                          className: 'atelier-rf-control-column nodrag nopan',
                          'data-group-id': id,
                          style: {
                              position: 'absolute',
                              left: nodeX + gw + helpSideGapFlow,
                              top: nodeY,
                              zIndex: GROUP_LABEL_Z_INDEX + 2,
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'flex-start',
                              gap: controlGapFlow,
                          },
                          onPointerDown: rfHelpPillStopPropagation,
                          onMouseDown: rfHelpPillStopPropagation,
                          onMouseEnter: function () {
                              setHovered(true);
                          },
                          onMouseLeave: function (e) {
                              rfHelpHoverLeaveOutside(setHovered, rootRef, panelRef, helpPillRef, helpBridgeRef, e);
                          },
                      },
                      showCollapsePill
                          ? React.createElement(
                                'button',
                                {
                                    key: 'collapse-' + id,
                                    type: 'button',
                                    className: 'atelier-rf-help-pill atelier-rf-collapse-pill nodrag nopan',
                                    'data-testid': 'atelier-rf-group-collapse',
                                    'data-group-id': id,
                                    title: 'Collapse expanded group',
                                    'aria-label': 'Collapse this expanded group',
                                    style: controlPillStyle,
                                    onPointerDown: rfHelpPillStopPropagation,
                                    onMouseDown: rfHelpPillStopPropagation,
                                    onClick: function (e) {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        rfCollapseExpandedNodeId(id);
                                    },
                                },
                                '×'
                            )
                          : null,
                      showHelpPill
                          ? React.createElement(
                                'button',
                                {
                                    key: 'help-' + id,
                                    type: 'button',
                                    className: 'atelier-rf-help-pill nodrag nopan',
                                    'data-testid': 'atelier-rf-group-help',
                                    'data-group-id': id,
                                    title: 'Ask for a brief explanation (Architectural Agent)',
                                    'aria-label': 'Brief explanation for this diagram element',
                                    style: controlPillStyle,
                                    onPointerDown: rfHelpPillStopPropagation,
                                    onMouseDown: rfHelpPillStopPropagation,
                                    onClick: function (e) {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        rfTriggerBriefExplanation(id, label, 'cluster');
                                    },
                                },
                                '?'
                            )
                          : null
                  )
              ),
              pillLayer
          )
        : null;

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
                /** Was `none`, which prevented hover for portaled help pill + hover panel over the frame. */
                pointerEvents: 'auto',
            },
        },
        /**
         * Dashed frame drawn as an inner div so the xyflow wrapper has no border —
         * keeps handle positions (left:0 / top:0) exactly on the wrapper outer edge
         * (= ELK boundary). Border-box + inset:0 draws the 1px border INSIDE the outer edge.
         */
        React.createElement('div', {
            key: 'group-frame',
            className: 'atelier-rf-group-frame',
            style: {
                position: 'absolute',
                inset: 0,
                boxSizing: 'border-box',
                border: groupBorderEnabled
                    ? groupBorderWidth + 'px ' + groupBorderStyle + ' ' + groupBorder
                    : '1px dashed #64748b',
                borderRadius: GROUP_NODE_BORDER_RADIUS,
                pointerEvents: 'none',
                backgroundColor: groupBackground,
            },
        }),
        labelPill,
        helpPillPortal,
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
            borderRadius: GROUP_NODE_BORDER_RADIUS,
            text: detail,
            panelRef: panelRef,
            onPanelMouseLeave: onPanelLeave,
            flowLeft: nodeX + gw + NODE_HOVER_SIDE_GAP_PX / z,
            flowTop: nodeY,
            portalLayer: pillLayer,
            zoom: z,
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
                        'position:absolute;left:0;top:0;width:0;height:0;overflow:visible;' +
                        'pointer-events:none;z-index:' +
                        RF_PILL_LAYER_Z_INDEX +
                        ';';
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

function rfSemanticLegendEnabled(diagram) {
    if (!diagram || typeof diagram !== 'object') return false;
    if (diagram.legend === true) return true;
    if (diagram.legend && diagram.legend.enabled === true) return true;
    return false;
}

function rfNodeMetaById(diagram) {
    var out = Object.create(null);
    var nodes = diagram && Array.isArray(diagram.nodes) ? diagram.nodes : [];
    for (var i = 0; i < nodes.length; i++) {
        var n = nodes[i];
        if (n && n.id != null) out[String(n.id)] = n;
    }
    return out;
}

function rfGroupPresentation(diagram) {
    var groups = diagram && Array.isArray(diagram.groups) ? diagram.groups : [];
    var legend = diagram && diagram.legend && typeof diagram.legend === 'object' ? diagram.legend : {};
    var groupModes = legend.groupModes && typeof legend.groupModes === 'object' ? legend.groupModes : {};
    var groupRoles = legend.groupRoles && typeof legend.groupRoles === 'object' ? legend.groupRoles : {};
    var groupTint = legend.groupTint && typeof legend.groupTint === 'object' ? legend.groupTint : {};
    var groupById = Object.create(null);
    var memberToGroup = Object.create(null);
    var groupOrder = Object.create(null);
    for (var i = 0; i < groups.length; i++) {
        var g = groups[i];
        if (!g || g.id == null) continue;
        var id = String(g.id);
        groupById[id] = g;
        groupOrder[id] = i;
        var members = Array.isArray(g.nodes) ? g.nodes : [];
        for (var j = 0; j < members.length; j++) {
            memberToGroup[String(members[j])] = id;
        }
    }
    return {
        groupById: groupById,
        memberToGroup: memberToGroup,
        groupModes: groupModes,
        groupRoles: groupRoles,
        groupTint: groupTint,
        groupOrder: groupOrder,
    };
}

function rfLegendLabels(diagram) {
    var out = Object.create(null);
    var legend = diagram && diagram.legend && typeof diagram.legend === 'object' ? diagram.legend : {};
    var roles = legend.roles && typeof legend.roles === 'object' ? legend.roles : {};
    Object.keys(roles).forEach(function (rawRole) {
        var role = rfNormaliseSemanticRole(rawRole);
        var label = roles[rawRole];
        if (role && typeof label === 'string' && label.trim()) out[role] = label.trim();
    });
    return out;
}

function rfLegendAllowsRole(role, legendLabels) {
    if (!role) return false;
    var keys = legendLabels && typeof legendLabels === 'object' ? Object.keys(legendLabels) : [];
    if (!keys.length) return true;
    return !!legendLabels[role];
}

function rfNormaliseSemanticRole(role) {
    if (role == null) return null;
    var r = String(role).trim().toLowerCase();
    if (!r) return null;
    if (r === 'stakeholder' || r === 'stakeholders' || r === 'stakeholder_surface' || r === 'stakeholder-surface') {
        return 'stakeholder_surface';
    }
    if (
        r === 'data_source' ||
        r === 'data-source' ||
        r === 'external_data' ||
        r === 'external-data' ||
        r === 'external_data_source' ||
        r === 'external-data-source'
    ) {
        return 'external_data_source';
    }
    if (r === 'control' || r === 'control_spine' || r === 'control-spine' || r === 'governance_spine') {
        return 'control_spine';
    }
    if (r === 'gray' || r === 'grey' || r === 'neutral_gray' || r === 'neutral-grey') return 'neutral';
    if (r === 'persona' || r === 'role' || r === 'human') return 'user';
    if (r === 'external_system' || r === 'vendor' || r === 'integration') return 'external';
    if (r === 'service' || r === 'ai_agent' || r === 'system_agent') return 'agent';
    if (r === 'workbench' || r === 'view' || r === 'task') return 'component';
    return RF_SEMANTIC_NODE_STYLES[r] ? r : null;
}

function rfNormaliseGroupMode(mode) {
    if (mode == null) return null;
    var m = String(mode).trim().toLowerCase();
    if (m === 'group' || m === 'group-color' || m === 'group_color') return 'group-only';
    if (m === 'border' || m === 'node-borders' || m === 'node_border') return 'node-border';
    if (m === 'group-border' || m === 'group-node-borders' || m === 'group_node_border') return 'group-node-border';
    if (m === 'outline' || m === 'no-fill' || m === 'no_fill') return 'group-node-border-outline';
    if (m === 'soft' || m === 'soft-fill' || m === 'soft_fill') return 'group-node-border-soft';
    if (m === 'medium' || m === 'medium-fill' || m === 'medium_fill') return 'group-node-border-medium';
    if (m === 'strong' || m === 'strong-fill' || m === 'strong_fill') return 'group-node-border-strong';
    if (m === 'full' || m === 'fill' || m === 'everything') return 'all';
    return RF_GROUP_VARIATION_LABELS[m] ? m : null;
}

function rfInferSemanticRole(nodeId, raw) {
    var explicit =
        raw &&
        (raw.semanticRole != null
            ? raw.semanticRole
            : raw.role != null
              ? raw.role
              : raw.kind != null
                ? raw.kind
                : raw.category);
    var role = rfNormaliseSemanticRole(explicit);
    if (role) return role;

    var id = String(nodeId || '').toLowerCase();
    var type = raw && raw.type != null ? String(raw.type).toLowerCase() : '';
    if (type === 'external' || id.indexOf('ext_') === 0) return 'external';
    if (type === 'module') return 'module';
    if (id.indexOf('role_') === 0 || id.indexOf('user_') === 0) return 'user';
    if (id.indexOf('entry_') === 0 || id.indexOf('tile_wb_') === 0) return 'entry';
    if (id.indexOf('agent') >= 0 || id.indexOf('orchestrator') >= 0 || id.indexOf('sentinel') >= 0) return 'agent';
    return 'component';
}

function rfGroupRole(groupId, raw, groupRoles) {
    var explicit =
        raw &&
        (raw.semanticRole != null
            ? raw.semanticRole
            : raw.role != null
              ? raw.role
              : raw.kind != null
                ? raw.kind
                : raw.category);
    return (
        rfNormaliseSemanticRole(explicit) ||
        rfNormaliseSemanticRole(groupRoles && groupRoles[groupId]) ||
        'component'
    );
}

function rfResolveGroupTintAlpha(groupId, raw, groupPresentation, variationStyle) {
    var tint = groupPresentation && groupPresentation.groupTint ? groupPresentation.groupTint : {};
    var byGroup = tint.byGroup && typeof tint.byGroup === 'object' ? tint.byGroup : {};
    if (raw && raw.tintAlpha != null) return rfClampAlpha(raw.tintAlpha, variationStyle.groupFill);
    if (byGroup && byGroup[groupId] != null) return rfClampAlpha(byGroup[groupId], variationStyle.groupFill);
    var base = rfClampAlpha(tint.baseAlpha, variationStyle.groupFill);
    var step = Number(tint.alphaStep);
    if (!Number.isFinite(step)) step = 0;
    var maxAlpha = rfClampAlpha(tint.maxAlpha, 0.26);
    var index =
        groupPresentation && groupPresentation.groupOrder && groupPresentation.groupOrder[groupId] != null
            ? groupPresentation.groupOrder[groupId]
            : 0;
    return rfClampAlpha(Math.min(maxAlpha, base + step * index), variationStyle.groupFill);
}

/** Hover / expandable metadata merged onto ELK→RF nodes (shared mount + in-place refresh). */
function enrichRfNodesFromDiagram(diagram, nodes) {
    var hoverFn = window.atelierRfHoverDetailByNodeId;
    var hoverMap = typeof hoverFn === 'function' ? hoverFn(diagram) : Object.create(null);
    var expandFn = window.atelierRfExpandableByNodeId;
    var expandMap = typeof expandFn === 'function' ? expandFn(diagram) : Object.create(null);
    var legendEnabled = rfSemanticLegendEnabled(diagram);
    var metaById = legendEnabled ? rfNodeMetaById(diagram) : Object.create(null);
    var groupPresentation = legendEnabled ? rfGroupPresentation(diagram) : null;
    var legendLabels = legendEnabled ? rfLegendLabels(diagram) : Object.create(null);
    return nodes.map(function (n) {
        var hid = hoverMap[n.id];
        var idStr = String(n.id);
        var isCollapse = idStr.endsWith('_collapse');
        var targetMod = expandMap[idStr];
        var groupId =
            n.type === 'group'
                ? idStr
                : n.parentId != null
                  ? String(n.parentId)
                  : groupPresentation && groupPresentation.memberToGroup[idStr];
        var rawGroup = groupPresentation && groupId ? groupPresentation.groupById[groupId] : null;
        var groupMode =
            groupPresentation && groupId
                ? rfNormaliseGroupMode(
                      rawGroup && rawGroup.visualMode != null
                          ? rawGroup.visualMode
                          : groupPresentation.groupModes[groupId]
                  )
                : null;
        if (!groupMode && legendEnabled) groupMode = 'group-node-border-medium';
        var variationStyle = RF_GROUP_VARIATION_STYLES[groupMode] || RF_GROUP_VARIATION_STYLES.all;
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
        if (legendEnabled && n.type === 'group' && !isCollapse) {
            var groupRole = rfGroupRole(idStr, rawGroup, groupPresentation.groupRoles);
            if (rfLegendAllowsRole(groupRole, legendLabels)) {
                dataExtra.rfSemanticRole = groupRole;
                dataExtra.rfSemanticStyle = RF_SEMANTIC_NODE_STYLES[groupRole] || RF_SEMANTIC_NODE_STYLES.component;
                dataExtra.rfSemanticLabel = legendLabels[groupRole] || dataExtra.rfSemanticStyle.label;
                dataExtra.rfSemanticGroupStyle = Object.assign({}, variationStyle, {
                    groupFill: rfResolveGroupTintAlpha(idStr, rawGroup, groupPresentation, variationStyle),
                });
                dataExtra.rfSemanticGroupMode = groupMode;
            }
        }
        if (legendEnabled && n.type === 'custom' && !isCollapse) {
            var semanticRole = rfInferSemanticRole(idStr, metaById[idStr]);
            if (rfLegendAllowsRole(semanticRole, legendLabels)) {
                dataExtra.rfSemanticRole = semanticRole;
                dataExtra.rfSemanticStyle = RF_SEMANTIC_NODE_STYLES[semanticRole] || RF_SEMANTIC_NODE_STYLES.component;
                dataExtra.rfSemanticLabel = legendLabels[semanticRole] || dataExtra.rfSemanticStyle.label;
                dataExtra.rfSemanticNodeMode = variationStyle.node || 'none';
            }
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
    var enteringIsCollapse = new Set();
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
            if (!sid.endsWith('_sub')) {
                enteringIsCollapse.add(sid);
            }
        }
    }

    var collapseChildExitIds = new Set();
    if (enteringIsCollapse.size > 0) {
        for (var cci = 0; cci < exitingIds.length; cci++) {
            var ceid = exitingIds[cci];
            if (anchoredExitIds.has(ceid)) continue;
            var cGhost = oldById.get(ceid);
            if (cGhost && cGhost.parentId && anchoredExitIds.has(String(cGhost.parentId))) {
                collapseChildExitIds.add(ceid);
            }
        }
    }

    var expandingGroupIds = new Set();
    for (var egi = 0; egi < targetNodes.length; egi++) {
        var egn = targetNodes[egi];
        var egid = String(egn.id);
        if (enteringAnchor.has(egid) && !enteringIsCollapse.has(egid)) {
            expandingGroupIds.add(egid);
        }
    }
    var expandChildIds = new Set();
    if (expandingGroupIds.size > 0) {
        for (var eci = 0; eci < targetNodes.length; eci++) {
            var ecn = targetNodes[eci];
            if (ecn.parentId && expandingGroupIds.has(String(ecn.parentId))) {
                expandChildIds.add(String(ecn.id));
            }
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
            var isAnchored = !oid && enteringAnchor.has(tid);
            if (tweenW != null || tweenH != null || isAnchored) {
                frameNode.width = tweenW != null ? tweenW : tn.width;
                frameNode.height = tweenH != null ? tweenH : tn.height;
                frameNode.data = Object.assign({}, tn.data || {}, {
                    width: tweenW != null ? tweenW : (tn.data && tn.data.width),
                    height: tweenH != null ? tweenH : (tn.data && tn.data.height),
                    rfMorphProgress: easedPos,
                    rfMorphIsCollapse: enteringIsCollapse.has(tid),
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
            if (expandChildIds.has(tid) && tPos < 1) {
                frameNode.data = Object.assign({}, frameNode.data || tn.data || {}, {
                    rfExpandingParent: true,
                    rfMorphProgress: easedPos,
                });
            }
            frameNodes.push(frameNode);
        }

        for (var ex = 0; ex < exitingIds.length; ex++) {
            var eid = exitingIds[ex];
            if (exitAlpha <= 0) continue;
            if (anchoredExitIds.has(eid)) continue;
            if (collapseChildExitIds.has(eid)) continue;
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

function SemanticLegend({ nodes }) {
    var present = new Set();
    var modePresent = new Set();
    var roleLabels = Object.create(null);
    var nds = Array.isArray(nodes) ? nodes : [];
    for (var i = 0; i < nds.length; i++) {
        var n = nds[i];
        var role = n && n.data && n.data.rfSemanticRole;
        if (role && RF_SEMANTIC_NODE_STYLES[role]) {
            present.add(role);
            if (!roleLabels[role] && n.data.rfSemanticLabel) roleLabels[role] = n.data.rfSemanticLabel;
        }
        var mode = n && n.data && n.data.rfSemanticGroupMode;
        if (mode && RF_GROUP_VARIATION_LABELS[mode]) modePresent.add(mode);
    }
    if (!present.size) return null;
    // Expandable module tiles are navigation affordances, not architecture categories.
    // Keep them out of the legend so the key explains only meaningful node types.
    present.delete('module');
    if (present.has('neutral')) {
        present.delete('component');
    }
    var rows = RF_SEMANTIC_LEGEND_ORDER.filter(function (role) {
        return present.has(role);
    });
    present.forEach(function (role) {
        if (rows.indexOf(role) < 0) rows.push(role);
    });
    if (!rows.length) return null;
    var modeRows = [];
    return React.createElement(
        'div',
        {
            className: 'atelier-rf-semantic-legend',
            'data-testid': 'atelier-rf-semantic-legend',
            style: {
                position: 'absolute',
                top: 12,
                right: 12,
                zIndex: 20,
                padding: '10px 12px',
                borderRadius: 10,
                border: '1px solid rgba(148, 163, 184, 0.55)',
                background: 'rgba(255,255,255,0.94)',
                boxShadow: '0 8px 24px rgba(15,23,42,0.12)',
                fontSize: 11,
                lineHeight: 1.25,
                color: '#334155',
                pointerEvents: 'none',
            },
        },
        React.createElement(
            'div',
            {
                style: {
                    fontWeight: 700,
                    color: '#0f172a',
                    marginBottom: 6,
                },
            },
            'Legend'
        ),
        ...rows.map(function (role) {
            var style = RF_SEMANTIC_NODE_STYLES[role];
            var label = roleLabels[role] || style.label;
            return React.createElement(
                'div',
                {
                    key: role,
                    style: {
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        marginTop: 4,
                        whiteSpace: 'nowrap',
                    },
                },
                React.createElement('span', {
                    style: {
                        width: 12,
                        height: 12,
                        borderRadius: 3,
                        background: style.background,
                        border: '1.5px solid ' + style.border,
                        boxSizing: 'border-box',
                    },
                }),
                React.createElement('span', null, label)
            );
        }),
        modeRows.length
            ? React.createElement(
                  'div',
                  {
                      style: {
                          marginTop: 8,
                          paddingTop: 7,
                          borderTop: '1px solid rgba(148, 163, 184, 0.35)',
                          fontWeight: 700,
                          color: '#0f172a',
                      },
                  },
                  'Variations'
              )
            : null,
        ...modeRows.map(function (mode) {
            return React.createElement(
                'div',
                {
                    key: mode,
                    style: {
                        marginTop: 4,
                        whiteSpace: 'nowrap',
                    },
                },
                RF_GROUP_VARIATION_LABELS[mode]
            );
        })
    );
}

function Inner(props) {
    const initialNodes = props.initialNodes || [];
    const initialEdges = props.initialEdges || [];
    const [nodes, setNodes] = useNodesState(initialNodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
    const [hoveredNodeId, setHoveredNodeId] = useState(null);
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
                label: node.data && node.data.label != null ? String(node.data.label) : '',
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

    const onSelectionChange = useCallback(function (params) {
        var sel = params && params.nodes ? params.nodes : [];
        if (typeof window.atelierRfOnNativeSelectionChange === 'function') {
            window.atelierRfOnNativeSelectionChange(sel);
        }
    }, []);

    const onNodeMouseEnter = useCallback(function (_ev, node) {
        setHoveredNodeId(node && node.id != null ? String(node.id) : null);
    }, []);

    const onNodeMouseLeave = useCallback(function () {
        setHoveredNodeId(null);
    }, []);

    const renderedEdges = useMemo(
        function () {
            if (!hoveredNodeId) return edges;
            return edges.map(function (edge) {
                var connected =
                    String(edge.source) === hoveredNodeId ||
                    String(edge.target) === hoveredNodeId;
                if (!connected) return edge;
                return Object.assign({}, edge, {
                    animated: true,
                    style: Object.assign({}, edge.style || {}, NODE_HOVER_EDGE_STYLE),
                });
            });
        },
        [edges, hoveredNodeId]
    );

    useEffect(
        function () {
            setNodes(clampElkCustomNodeDimensions(initialNodes));
            setEdges(initialEdges);
            setHoveredNodeId(null);
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
            edges: renderedEdges,
            onNodesChange,
            onEdgesChange,
            onNodeClick,
            onNodeMouseEnter,
            onNodeMouseLeave,
            onPaneClick,
            onSelectionChange,
            nodeTypes,
            edgeTypes,
            fitView: true,
            fitViewOptions: { padding: 0.15 },
            nodesDraggable: false,
            nodesConnectable: false,
            elementsSelectable: true,
            /** Box-select with primary button on empty pane; pan with middle/right drag or scroll (no hand cursor on pane). */
            selectionOnDrag: true,
            selectionMode: 'partial',
            panOnDrag: [1, 2],
            selectNodesOnDrag: false,
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
        React.createElement(Controls, { showInteractive: false }),
        React.createElement(SemanticLegend, { nodes })
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
