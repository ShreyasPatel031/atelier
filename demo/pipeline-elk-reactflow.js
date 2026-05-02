/**
 * R6: ELK laid-out graph → @xyflow/react elements with ELK-accurate handles.
 * Ported from openai-realtime-elkjs-tool: absPositions + edgePoints + toReactFlow wiring.
 */
(function (global) {
    'use strict';

    /** @typedef {Record<string, { x: number; y: number; width: number; height: number }>} AbsMap */

    function computeAbsolutePositions(root) {
        /** @type {AbsMap} */
        var map = {};
        function recurse(node, parentX, parentY) {
            if (!node) return;
            var absX = (node.x || 0) + parentX;
            var absY = (node.y || 0) + parentY;
            map[node.id] = {
                x: absX,
                y: absY,
                width: node.width != null ? node.width : 80,
                height: node.height != null ? node.height : 40,
            };
            var ch = node.children || [];
            for (var i = 0; i < ch.length; i++) recurse(ch[i], absX, absY);
        }
        recurse(root, 0, 0);
        return map;
    }

    function determineConnectionSide(nodePosition, nodeWidth, nodeHeight, connectionPoint) {
        var distToLeft = Math.abs(connectionPoint.x - nodePosition.x);
        var distToRight = Math.abs(connectionPoint.x - (nodePosition.x + nodeWidth));
        var distToTop = Math.abs(connectionPoint.y - nodePosition.y);
        var distToBottom = Math.abs(connectionPoint.y - (nodePosition.y + nodeHeight));
        var minDist = Math.min(distToLeft, distToRight, distToTop, distToBottom);
        var tied = [];
        if (minDist === distToLeft) tied.push('left');
        if (minDist === distToRight) tied.push('right');
        if (minDist === distToTop) tied.push('top');
        if (minDist === distToBottom) tied.push('bottom');
        if (tied.length === 1) return tied[0];
        var centerX = nodePosition.x + nodeWidth / 2;
        var centerY = nodePosition.y + nodeHeight / 2;
        var deltaX = connectionPoint.x - centerX;
        var deltaY = connectionPoint.y - centerY;
        if (tied.indexOf('bottom') >= 0 && tied.indexOf('right') >= 0 && deltaY > 0 && deltaX > 0) {
            return Math.abs(deltaY) > Math.abs(deltaX) ? 'bottom' : 'right';
        }
        if (tied.indexOf('bottom') >= 0 && tied.indexOf('left') >= 0 && deltaY > 0 && deltaX < 0) {
            return Math.abs(deltaY) > Math.abs(deltaX) ? 'bottom' : 'left';
        }
        if (tied.indexOf('top') >= 0 && tied.indexOf('right') >= 0 && deltaY < 0 && deltaX > 0) {
            return Math.abs(deltaY) > Math.abs(deltaX) ? 'top' : 'right';
        }
        if (tied.indexOf('top') >= 0 && tied.indexOf('left') >= 0 && deltaY < 0 && deltaX < 0) {
            return Math.abs(deltaY) > Math.abs(deltaX) ? 'top' : 'left';
        }
        return tied[0];
    }

    /**
     * Mutates edges on graph: sets absoluteBendPoints (container-relative → absolute coords).
     * @returns {Record<string, { left: any[]; right: any[]; top: any[]; bottom: any[] }>}
     */
    function buildNodeEdgePoints(graph, abs) {
        /** @type {Record<string, { left: any[]; right: any[]; top: any[]; bottom: any[] }>} */
        var map = {};
        var nodeDimensions = new Map();

        function collectDims(node) {
            if (!node) return;
            nodeDimensions.set(node.id, {
                width: node.width != null ? node.width : 80,
                height: node.height != null ? node.height : 40,
            });
            var ch = node.children || [];
            for (var i = 0; i < ch.length; i++) collectDims(ch[i]);
        }
        collectDims(graph);

        function add(nodeId, side, entry) {
            if (!map[nodeId]) {
                map[nodeId] = { left: [], right: [], top: [], bottom: [] };
            }
            map[nodeId][side].push(entry);
        }

        function visitContainer(container) {
            var edges = container.edges || [];
            for (var ei = 0; ei < edges.length; ei++) {
                var e = edges[ei];
                var sec = e.sections && e.sections[0];
                if (!sec) continue;

                var ox = (abs[container.id] && abs[container.id].x) || 0;
                var oy = (abs[container.id] && abs[container.id].y) || 0;

                if (e.sources && e.sources[0] && sec.startPoint) {
                    var sourceNodeId = e.sources[0];
                    var startPointX = ox + sec.startPoint.x;
                    var startPointY = oy + sec.startPoint.y;
                    var sourceNodePos = abs[sourceNodeId] || { x: 0, y: 0 };
                    var sourceNodeDim = nodeDimensions.get(sourceNodeId) || { width: 80, height: 40 };
                    var sourceSide = determineConnectionSide(
                        { x: sourceNodePos.x, y: sourceNodePos.y },
                        sourceNodeDim.width,
                        sourceNodeDim.height,
                        { x: startPointX, y: startPointY }
                    );
                    add(sourceNodeId, sourceSide, {
                        edgeId: e.id,
                        x: startPointX,
                        y: startPointY,
                        side: sourceSide,
                    });
                }

                if (e.targets && e.targets[0] && sec.endPoint) {
                    var targetNodeId = e.targets[0];
                    var endPointX = ox + sec.endPoint.x;
                    var endPointY = oy + sec.endPoint.y;
                    var targetNodePos = abs[targetNodeId] || { x: 0, y: 0 };
                    var targetNodeDim = nodeDimensions.get(targetNodeId) || { width: 80, height: 40 };
                    var targetSide = determineConnectionSide(
                        { x: targetNodePos.x, y: targetNodePos.y },
                        targetNodeDim.width,
                        targetNodeDim.height,
                        { x: endPointX, y: endPointY }
                    );
                    add(targetNodeId, targetSide, {
                        edgeId: e.id,
                        x: endPointX,
                        y: endPointY,
                        side: targetSide,
                    });
                }

                if (sec.bendPoints && sec.bendPoints.length) {
                    e.absoluteBendPoints = sec.bendPoints.map(function (p) {
                        return { x: ox + p.x, y: oy + p.y };
                    });
                }
            }
            var ch = container.children || [];
            for (var c = 0; c < ch.length; c++) visitContainer(ch[c]);
        }

        visitContainer(graph);
        return map;
    }

    function labelFor(node) {
        var L = node.labels && node.labels[0];
        return L && L.text != null ? String(L.text) : String(node.id);
    }

    /**
     * @param {object} laidOutGraph - elk.layout result
     * @returns {{ nodes: object[], edges: object[] }}
     */
    function elkLaidOutToReactFlowElements(laidOutGraph) {
        var absolutePositions = computeAbsolutePositions(laidOutGraph);
        var edgeConnectionPoints = buildNodeEdgePoints(laidOutGraph, absolutePositions);
        var nodes = [];
        var edges = [];
        var processedEdgeIds = new Set();
        var rootId = laidOutGraph.id != null ? String(laidOutGraph.id) : 'root';

        function createRfNode(node, parentId) {
            var absPos = absolutePositions[node.id];
            var isGraphRoot = String(node.id) === rootId && parentId == null;
            if (isGraphRoot) {
                var rc = node.children || [];
                for (var i = 0; i < rc.length; i++) createRfNode(rc[i], null);
                return;
            }

            var hasChildren = !!(node.children && node.children.length);
            var ep = edgeConnectionPoints[node.id] || { left: [], right: [], top: [], bottom: [] };

            var rf = {
                id: String(node.id),
                type: hasChildren ? 'group' : 'custom',
                position: parentId
                    ? { x: node.x || 0, y: node.y || 0 }
                    : { x: absPos.x, y: absPos.y },
                parentId: parentId || undefined,
                extent: parentId ? 'parent' : undefined,
                zIndex: hasChildren ? 5 : 50,
                selectable: true,
                draggable: false,
                data: {
                    label: labelFor(node),
                    width: node.width,
                    height: node.height,
                    leftHandles: ep.left.map(function (cp) {
                        return cp.y - absPos.y;
                    }),
                    rightHandles: ep.right.map(function (cp) {
                        return cp.y - absPos.y;
                    }),
                    topHandles: ep.top.map(function (cp) {
                        return cp.x - absPos.x;
                    }),
                    bottomHandles: ep.bottom.map(function (cp) {
                        return cp.x - absPos.x;
                    }),
                },
                style: hasChildren
                    ? {
                          width: node.width,
                          height: node.height,
                          backgroundColor: 'rgba(241,245,249,0.4)',
                          border: '1px dashed #64748b',
                          borderRadius: 8,
                      }
                    : {
                          width: node.width,
                          height: node.height,
                      },
            };
            nodes.push(rf);
            var ch = node.children || [];
            for (var j = 0; j < ch.length; j++) createRfNode(ch[j], node.id);
        }

        createRfNode(laidOutGraph, null);

        var sourceSides = ['right', 'left', 'top', 'bottom'];
        var targetSides = ['left', 'right', 'top', 'bottom'];

        function createEdge(edge, containerAbs) {
            var srcs = edge.sources || [];
            var tgts = edge.targets || [];
            for (var s = 0; s < srcs.length; s++) {
                for (var t = 0; t < tgts.length; t++) {
                    var sourceNodeId = srcs[s];
                    var targetNodeId = tgts[t];
                    var edgeId =
                        edge.id != null
                            ? String(edge.id)
                            : sourceNodeId + '-' + targetNodeId + '-' + Math.random().toString(36).slice(2, 9);
                    if (processedEdgeIds.has(edgeId)) continue;
                    processedEdgeIds.add(edgeId);

                    var sourceHandleIndex = -1;
                    var sourceHandleSide = 'right';
                    var targetHandleIndex = -1;
                    var targetHandleSide = 'left';

                    var si, idx, connectionPoints;

                    for (si = 0; si < sourceSides.length; si++) {
                        connectionPoints = edgeConnectionPoints[sourceNodeId]
                            ? edgeConnectionPoints[sourceNodeId][sourceSides[si]]
                            : [];
                        idx = -1;
                        for (var k = 0; k < connectionPoints.length; k++) {
                            if (connectionPoints[k].edgeId === edge.id) {
                                idx = k;
                                break;
                            }
                        }
                        if (idx >= 0) {
                            sourceHandleIndex = idx;
                            sourceHandleSide = sourceSides[si];
                            break;
                        }
                    }

                    for (si = 0; si < targetSides.length; si++) {
                        connectionPoints = edgeConnectionPoints[targetNodeId]
                            ? edgeConnectionPoints[targetNodeId][targetSides[si]]
                            : [];
                        idx = -1;
                        for (var k2 = 0; k2 < connectionPoints.length; k2++) {
                            if (connectionPoints[k2].edgeId === edge.id) {
                                idx = k2;
                                break;
                            }
                        }
                        if (idx >= 0) {
                            targetHandleIndex = idx;
                            targetHandleSide = targetSides[si];
                            break;
                        }
                    }

                    var sourceHandle =
                        sourceHandleIndex >= 0
                            ? sourceHandleSide + '-' + sourceHandleIndex + '-source'
                            : undefined;
                    var targetHandle =
                        targetHandleIndex >= 0
                            ? targetHandleSide + '-' + targetHandleIndex + '-target'
                            : undefined;

                    if (!sourceHandle || !targetHandle) continue;

                    var bends = edge.absoluteBendPoints || [];
                    var edgeType =
                        bends.length >= 2 ? 'elkOrthogonal' : 'smoothstep';

                    edges.push({
                        id: edgeId,
                        source: String(sourceNodeId),
                        target: String(targetNodeId),
                        type: edgeType,
                        sourceHandle: sourceHandle,
                        targetHandle: targetHandle,
                        zIndex: 100,
                        style: { stroke: '#64748b', strokeWidth: 1.25 },
                        data: {
                            bendPoints: bends,
                            labelPos:
                                edge.labels && edge.labels[0]
                                    ? {
                                          x: edge.labels[0].x + containerAbs.x,
                                          y: edge.labels[0].y + containerAbs.y,
                                      }
                                    : undefined,
                        },
                    });
                }
            }
        }

        function processEdges(node) {
            var abs = absolutePositions[node.id];
            var eds = node.edges || [];
            for (var i = 0; i < eds.length; i++) createEdge(eds[i], abs);
            var ch = node.children || [];
            for (var c = 0; c < ch.length; c++) processEdges(ch[c]);
        }

        processEdges(laidOutGraph);

        return { nodes: nodes, edges: edges };
    }

    global.computeAbsolutePositions = computeAbsolutePositions;
    global.buildNodeEdgePoints = buildNodeEdgePoints;
    global.elkLaidOutToReactFlowElements = elkLaidOutToReactFlowElements;

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = {
            computeAbsolutePositions,
            buildNodeEdgePoints,
            elkLaidOutToReactFlowElements,
        };
    }
})(typeof window !== 'undefined' ? window : globalThis);
