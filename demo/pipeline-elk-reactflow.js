/**
 * R6: ELK laid-out graph → @xyflow/react node/edge payloads (absolute positions, parentId for compounds).
 */
(function (global) {
    'use strict';

    function labelText(node) {
        var L = node.labels && node.labels[0];
        return L && L.text != null ? String(L.text) : String(node.id);
    }

    /**
     * @param {object} laidOutGraph - elk.layout result
     * @returns {{ nodes: object[], edges: object[] }}
     */
    function elkLaidOutToReactFlowElements(laidOutGraph) {
        var nodes = [];
        var edges = [];
        var rootId = laidOutGraph && laidOutGraph.id != null ? String(laidOutGraph.id) : 'root';

        function walk(node, parentRfId, absX, absY, depth) {
            if (!node) return;
            var ax = absX + (node.x || 0);
            var ay = absY + (node.y || 0);
            var isGraphRoot = depth === 0 && String(node.id) === rootId;

            if (!isGraphRoot && node.width != null && node.height != null) {
                var hasChildren = !!(node.children && node.children.length);
                var rf = {
                    id: String(node.id),
                    position: parentRfId
                        ? { x: node.x || 0, y: node.y || 0 }
                        : { x: ax, y: ay },
                    data: { label: labelText(node) },
                    style: {
                        width: node.width,
                        height: node.height,
                    },
                };
                if (hasChildren) rf.type = 'group';
                if (parentRfId) {
                    rf.parentId = parentRfId;
                    rf.extent = 'parent';
                }
                nodes.push(rf);
            }

            var myRfId = isGraphRoot ? null : String(node.id);
            var nextParent = isGraphRoot ? null : myRfId;

            var ch = node.children || [];
            for (var c = 0; c < ch.length; c++) {
                walk(ch[c], nextParent, ax, ay, depth + 1);
            }

            var eds = node.edges || [];
            for (var e = 0; e < eds.length; e++) {
                var ed = eds[e];
                if (!ed || !ed.sources || !ed.targets) continue;
                edges.push({
                    id: ed.id != null ? String(ed.id) : 'e_' + nodes.length + '_' + e,
                    source: String(ed.sources[0]),
                    target: String(ed.targets[0]),
                });
            }
        }

        walk(laidOutGraph, null, 0, 0, 0);
        return { nodes: nodes, edges: edges };
    }

    global.elkLaidOutToReactFlowElements = elkLaidOutToReactFlowElements;

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = { elkLaidOutToReactFlowElements };
    }
})(typeof window !== 'undefined' ? window : globalThis);
