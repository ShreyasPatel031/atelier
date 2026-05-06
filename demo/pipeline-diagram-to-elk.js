/**
 * R4: Diagram IR → ELK extended JSON graph for layout.
 *
 * Default export targets **ELK Live JSON editor** (strict importer: every element needs `id`, including labels):
 * @see https://rtsys.informatik.uni-kiel.de/elklive/json.html
 *
 * Official graph JSON shape:
 * @see https://eclipse.dev/elk/documentation/tooldevelopers/graphdatastructure/jsonformat.html
 *
 * Options:
 *   diagramToElkInput(diagram, { target: 'elklive' | 'elkjs' })
 *   - elklive (default): short layout keys (`algorithm`, `direction`), label ids on every label, minimal nesting options.
 *   - elkjs: `elk.algorithm`, `elk.direction`, extra spacing (previous behavior).
 *
 * Exposes:
 *   window.diagramToElkInput(diagram, options?)
 *   window.validateElkInputIdentifiers(elkGraph)
 *
 * Depends on demo/elk-node-dimensions.js (ELK leaf sizing + RF dimension profile).
 */
(function (global) {
    'use strict';

    function getDimApi() {
        var D = global.atelierElkNodeDimensions;
        if (!D && typeof require !== 'undefined') {
            try {
                D = require('./elk-node-dimensions.js');
            } catch (e) {
                D = null;
            }
        }
        if (!D) {
            throw new Error(
                'atelier: load elk-node-dimensions.js before pipeline-diagram-to-elk.js'
            );
        }
        return D;
    }

    function estimateLeafSize(label, options) {
        return getDimApi().estimateElkLeafSize(label, options);
    }

    function estimateGroupLabelSize(label, options) {
        return getDimApi().estimateElkGroupLabelSize(label, options);
    }

    function mapDirection(diagramDirection) {
        var d = String(diagramDirection || 'TD').toUpperCase();
        if (d === 'LR' || d === 'RL') return d === 'RL' ? 'LEFT' : 'RIGHT';
        if (d === 'BT') return 'UP';
        return 'DOWN';
    }

    /** ELK Live importer requires an id on labels (stricter than prose docs). */
    function elkLabel(parentId, index, text, w, h) {
        return {
            id: String(parentId) + '__label_' + index,
            text: String(text != null ? text : ''),
            width: w,
            height: h,
        };
    }

    function collectElkNodeIds(node, out) {
        if (!node || node.id == null) return;
        out.add(String(node.id));
        var ch = node.children;
        if (!ch) return;
        for (var i = 0; i < ch.length; i++) collectElkNodeIds(ch[i], out);
    }

    function collectAllElkEdges(node, out) {
        if (!node) return;
        if (Array.isArray(node.edges)) {
            for (var i = 0; i < node.edges.length; i++) out.push(node.edges[i]);
        }
        if (Array.isArray(node.children)) {
            for (var j = 0; j < node.children.length; j++) collectAllElkEdges(node.children[j], out);
        }
    }

    function validateElkInputIdentifiers(elkGraph) {
        var missing = [];
        if (!elkGraph || elkGraph.id == null) {
            return { ok: false, missingEndpoints: ['root'], edgeIds: [] };
        }
        var ids = new Set();
        collectElkNodeIds(elkGraph, ids);
        var edgesAll = [];
        collectAllElkEdges(elkGraph, edgesAll);
        for (var i = 0; i < edgesAll.length; i++) {
            var e = edgesAll[i];
            if (!e) continue;
            var srcs = e.sources || [];
            var tgts = e.targets || [];
            for (var s = 0; s < srcs.length; s++) {
                if (!ids.has(String(srcs[s]))) missing.push({ edgeId: e.id, role: 'source', id: srcs[s] });
            }
            for (var t = 0; t < tgts.length; t++) {
                if (!ids.has(String(tgts[t]))) missing.push({ edgeId: e.id, role: 'target', id: tgts[t] });
            }
        }
        return { ok: missing.length === 0, missingEndpoints: missing, edgeIds: edgesAll.map(function (e) { return e && e.id; }) };
    }

    /**
     * Verifies every ELK edge sits in its endpoints' lowest common ancestor.
     * ELK requires this; otherwise edge routing crosses hierarchy boundaries
     * unnecessarily and produces visually wrong (but syntactically valid) layouts.
     * @see https://eclipse.dev/elk/documentation/tooldevelopers/graphdatastructure/coordinatesystem.html
     */
    function validateElkEdgePlacement(elkGraph) {
        if (!elkGraph || elkGraph.id == null) {
            return { ok: false, violations: [{ reason: 'no_root_id' }] };
        }
        var parentById = new Map();
        (function walk(parentId, node) {
            if (!node || node.id == null) return;
            if (parentId != null) parentById.set(String(node.id), String(parentId));
            if (Array.isArray(node.children)) {
                for (var i = 0; i < node.children.length; i++) walk(node.id, node.children[i]);
            }
        })(null, elkGraph);

        function ancestorsOf(id) {
            var chain = [];
            var cur = id == null ? null : String(id);
            var seen = new Set();
            while (cur != null && !seen.has(cur)) {
                seen.add(cur);
                chain.push(cur);
                cur = parentById.get(cur) || null;
            }
            return chain;
        }
        function lcaOf(a, b) {
            var aChain = ancestorsOf(a);
            var bSet = new Set(ancestorsOf(b));
            for (var i = 0; i < aChain.length; i++) {
                if (bSet.has(aChain[i])) return aChain[i];
            }
            return null;
        }

        var violations = [];
        (function walkEdges(node) {
            if (!node) return;
            var hereId = node.id != null ? String(node.id) : null;
            if (Array.isArray(node.edges)) {
                for (var i = 0; i < node.edges.length; i++) {
                    var e = node.edges[i];
                    if (!e) continue;
                    var srcs = e.sources || [];
                    var tgts = e.targets || [];
                    for (var s = 0; s < srcs.length; s++) {
                        for (var t = 0; t < tgts.length; t++) {
                            var lca = lcaOf(srcs[s], tgts[t]);
                            if (lca !== hereId) {
                                violations.push({
                                    edgeId: e.id,
                                    placedIn: hereId,
                                    expectedLca: lca,
                                    source: srcs[s],
                                    target: tgts[t],
                                });
                            }
                        }
                    }
                }
            }
            if (Array.isArray(node.children)) {
                for (var c = 0; c < node.children.length; c++) walkEdges(node.children[c]);
            }
        })(elkGraph);

        return { ok: violations.length === 0, violations: violations };
    }

    function rootLayoutOptions(elkDirection, target) {
        if (target === 'elkjs') {
            // INCLUDE_CHILDREN: edges cross compound boundaries (common in diagram IR).
            return {
                'elk.algorithm': 'layered',
                'elk.direction': elkDirection,
                'elk.hierarchyHandling': 'INCLUDE_CHILDREN',
                'elk.spacing.nodeNode': '48',
                'elk.layered.spacing.nodeNodeBetweenLayers': '56',
                'elk.padding': '[top=20,left=20,bottom=20,right=20]',
            };
        }
        /** Matches ELK Live examples; see https://rtsys.informatik.uni-kiel.de/elklive/json.html */
        return {
            algorithm: 'layered',
            direction: elkDirection,
            hierarchyHandling: 'INCLUDE_CHILDREN',
        };
    }

    function compoundLayoutOptions(target, padPx) {
        var P = Math.round(Number(padPx));
        if (!isFinite(P)) {
            P = 14;
        }
        P = Math.max(4, Math.min(48, P));
        if (target === 'elkjs') {
            return {
                'elk.hierarchyHandling': 'INCLUDE_CHILDREN',
                'elk.padding': '[top=' + P + ',left=' + P + ',bottom=' + P + ',right=' + P + ']',
                'elk.spacing.nodeNode': '28',
            };
        }
        return {
            algorithm: 'layered',
            direction: 'DOWN',
            hierarchyHandling: 'INCLUDE_CHILDREN',
        };
    }

    /**
     * @param {object|null} diagram
     * @param {object} [options]
     * @param {string} [options.target] - 'elklive' (default) | 'elkjs'
     */
    function diagramToElkInput(diagram, options) {
        var warnings = [];
        var merged = Object.assign({}, options || {});
        var DIM = getDimApi();
        if (merged.leafNodeWidth == null) {
            merged.leafNodeWidth = DIM.resolveLeafNodeWidthPx(global);
        }
        var target = merged.target === 'elkjs' ? 'elkjs' : 'elklive';
        var compoundPadPx =
            typeof DIM.getElkCompoundPaddingPx === 'function'
                ? DIM.getElkCompoundPaddingPx(global)
                : 14;

        if (!diagram || typeof diagram !== 'object') {
            return { ok: false, reason: 'no_diagram', elkGraph: null, warnings: warnings, validate: null, summary: null };
        }

        var nodes = Array.isArray(diagram.nodes) ? diagram.nodes : [];
        var edges = Array.isArray(diagram.edges) ? diagram.edges : [];
        var groups = Array.isArray(diagram.groups) ? diagram.groups : [];

        var nodeById = new Map();
        for (var i = 0; i < nodes.length; i++) {
            var n = nodes[i];
            if (n && n.id != null) nodeById.set(String(n.id), n);
        }

        var groupDefById = new Map();
        var groupIdsSet = new Set();
        for (var gx = 0; gx < groups.length; gx++) {
            var gr0 = groups[gx];
            if (!gr0 || gr0.id == null) continue;
            var gId0 = String(gr0.id);
            groupIdsSet.add(gId0);
            groupDefById.set(gId0, gr0);
        }

        var parentOf = new Map();
        for (var g = 0; g < groups.length; g++) {
            var gr = groups[g];
            if (!gr || gr.id == null) continue;
            var gid = String(gr.id);
            var members = Array.isArray(gr.nodes) ? gr.nodes : [];
            for (var m = 0; m < members.length; m++) {
                var nid = String(members[m]);
                if (!parentOf.has(nid)) parentOf.set(nid, gid);
            }
        }

        var rootChildren = [];
        var elkDirection = mapDirection(diagram.direction);

        /** Same initial width for every non-root node (leaves + compounds). ELK auto-grows compounds to fit children.
         *  Mirrors openai-realtime-elkjs-tool ensureIds: node.width ??= NON_ROOT_DEFAULT_OPTIONS.width.
         *  Group label text contributes to width via labels[].width so ELK reserves room for the title bar. */
        var defaultNonRootWidth = merged.leafNodeWidth;

        function makeLeafElkNode(mid) {
            var raw = nodeById.get(mid);
            var lab = raw && raw.label != null ? raw.label : mid;
            var sz = estimateLeafSize(lab, merged);
            return {
                id: mid,
                width: sz.width,
                height: sz.height,
                labels: [elkLabel(mid, 0, sz.text, sz.width, sz.height)],
            };
        }

        var buildingCompounds = new Set();
        function buildGroupCompound(gId) {
            if (buildingCompounds.has(gId)) {
                warnings.push({ code: 'r4_group_cycle', id: gId });
                return makeLeafElkNode(gId);
            }
            var gg = groupDefById.get(gId);
            if (!gg) {
                warnings.push({ code: 'r4_missing_group_def', id: gId });
                return makeLeafElkNode(gId);
            }
            buildingCompounds.add(gId);
            var gLabel = gg.label != null ? String(gg.label) : gId;
            var ls = estimateGroupLabelSize(gLabel, merged);
            var memberIds = Array.isArray(gg.nodes) ? gg.nodes.map(String) : [];
            var compoundChildren = [];
            for (var mi = 0; mi < memberIds.length; mi++) {
                var mid = memberIds[mi];
                if (groupDefById.has(mid)) {
                    compoundChildren.push(buildGroupCompound(mid));
                } else {
                    if (!nodeById.has(mid)) {
                        warnings.push({ code: 'r4_member_not_in_nodes', groupId: gId, member: mid });
                    }
                    compoundChildren.push(makeLeafElkNode(mid));
                }
            }
            buildingCompounds.delete(gId);
            return {
                id: gId,
                width: defaultNonRootWidth,
                height: ls.height,
                labels: [elkLabel(gId, 0, ls.text, ls.width, ls.height)],
                layoutOptions: compoundLayoutOptions(target, compoundPadPx),
                children: compoundChildren,
            };
        }

        var inAnyGroup = new Set(parentOf.keys());
        for (var ni = 0; ni < nodes.length; ni++) {
            var node = nodes[ni];
            if (!node || node.id == null) continue;
            var idStr = String(node.id);
            if (groupIdsSet.has(idStr)) {
                warnings.push({ code: 'r4_node_id_collides_with_group', id: idStr });
                continue;
            }
            if (inAnyGroup.has(idStr)) continue;
            rootChildren.push(makeLeafElkNode(idStr));
        }

        for (var gi = 0; gi < groups.length; gi++) {
            var ggR = groups[gi];
            if (!ggR || ggR.id == null) continue;
            var rootGid = String(ggR.id);
            if (parentOf.has(rootGid)) continue;
            rootChildren.push(buildGroupCompound(rootGid));
        }

        var rootId =
            merged.rootId != null ? String(merged.rootId) : DIM.DEFAULTS.rootId;

        var elkGraph = {
            id: rootId,
            layoutOptions: rootLayoutOptions(elkDirection, target),
            children: rootChildren,
            edges: [],
        };

        // ELK requires each edge to live in its endpoints' LCA. Index parents
        // and ELK nodes so we can attach each edge to the right container.
        var parentById = new Map();
        var elkNodeById = new Map();
        (function indexElk(parentId, node) {
            if (!node || node.id == null) return;
            elkNodeById.set(String(node.id), node);
            if (parentId != null) parentById.set(String(node.id), String(parentId));
            if (Array.isArray(node.children)) {
                for (var i = 0; i < node.children.length; i++) indexElk(node.id, node.children[i]);
            }
        })(null, elkGraph);

        function ancestorsOf(id) {
            var chain = [];
            var cur = id == null ? null : String(id);
            var seen = new Set();
            while (cur != null && !seen.has(cur)) {
                seen.add(cur);
                chain.push(cur);
                cur = parentById.get(cur) || null;
            }
            return chain;
        }
        function lcaContainerId(srcId, tgtId) {
            var a = ancestorsOf(srcId);
            var bSet = new Set(ancestorsOf(tgtId));
            for (var i = 0; i < a.length; i++) {
                if (bSet.has(a[i])) return a[i];
            }
            return rootId;
        }

        var totalEdges = 0;
        var hierarchyEdgeCount = 0;
        for (var ei = 0; ei < edges.length; ei++) {
            var ed = edges[ei];
            if (!ed || ed.source == null || ed.target == null) {
                warnings.push({ code: 'r4_skip_edge_missing_endpoint', index: ei });
                continue;
            }
            var sid = String(ed.source);
            var tid = String(ed.target);
            if (!elkNodeById.has(sid)) {
                warnings.push({ code: 'r4_edge_unknown_source', index: ei, source: sid, target: tid });
                continue;
            }
            if (!elkNodeById.has(tid)) {
                warnings.push({ code: 'r4_edge_unknown_target', index: ei, source: sid, target: tid });
                continue;
            }
            var elkEdge = {
                id: 'e_' + sid + '_' + tid + '_' + ei,
                sources: [sid],
                targets: [tid],
            };
            var containerId = lcaContainerId(sid, tid);
            var container = elkNodeById.get(containerId) || elkGraph;
            if (!Array.isArray(container.edges)) container.edges = [];
            container.edges.push(elkEdge);
            if (containerId !== rootId) hierarchyEdgeCount++;
            totalEdges++;
        }

        var validate = validateElkInputIdentifiers(elkGraph);
        if (!validate.ok) {
            warnings.push({ code: 'r4_validate_failed', missing: validate.missingEndpoints });
        }
        var placement = validateElkEdgePlacement(elkGraph);
        if (!placement.ok) {
            warnings.push({ code: 'r4_edge_placement_violations', violations: placement.violations });
        }

        return {
            ok: true,
            elkGraph: elkGraph,
            elkTarget: target,
            warnings: warnings,
            validate: validate,
            placement: placement,
            summary: {
                elkDirection: elkDirection,
                rootChildCount: rootChildren.length,
                edgeCount: totalEdges,
                edgesInsideCompound: hierarchyEdgeCount,
                groupCompoundCount: groups.length,
                leafCountUnderGroups: inAnyGroup.size,
                ungroupedLeafCount: nodes.length - inAnyGroup.size,
            },
        };
    }

    global.diagramToElkInput = diagramToElkInput;
    global.validateElkInputIdentifiers = validateElkInputIdentifiers;
    global.validateElkEdgePlacement = validateElkEdgePlacement;

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = {
            diagramToElkInput,
            validateElkInputIdentifiers,
            validateElkEdgePlacement,
            mapDirection,
        };
    }
})(typeof window !== 'undefined' ? window : globalThis);
