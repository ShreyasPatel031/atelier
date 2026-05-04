/**
 * R2: Deterministic repair of renderer-agnostic diagram IR before ELK / React Flow.
 *
 * - G2: edge source/target not in nodes[] → inject { id, label, type: "external" }
 *       (skip if endpoint equals a group id — emit warning g2_endpoint_is_group_id instead)
 * - G3: groups[].nodes[] — lift inline node-shaped objects into nodes[]; drop non-strings;
 *       drop member ids not present in nodes[]
 * - Drop groups with zero members after cleanup (warning g3_dropped_empty_group)
 *
 * window.repairDiagramIR(diagram) → { ok, diagram?, warnings[], summary? }
 */
(function (global) {
    'use strict';

    /**
     * @param {object|null} diagram - { direction?, nodes[], edges[], groups[] }
     */
    function repairDiagramIR(diagram) {
        const warnings = [];
        const summary = {
            g2Injected: [],
            g2EndpointIsGroupId: [],
            g3Lifted: [],
            g3DroppedNonString: [],
            g3DroppedUnknownMember: [],
            g3DroppedEmptyGroups: [],
            before: { nodeCount: 0, edgeCount: 0, groupCount: 0 },
            after: { nodeCount: 0, edgeCount: 0, groupCount: 0 },
        };

        if (!diagram || typeof diagram !== 'object') {
            return { ok: false, reason: 'no_diagram', diagram: null, warnings, summary };
        }

        let data;
        try {
            data = JSON.parse(JSON.stringify(diagram));
        } catch (e) {
            return { ok: false, reason: 'clone_failed', diagram: null, warnings: [{ code: 'clone_error', detail: String(e) }], summary };
        }

        if (!Array.isArray(data.nodes)) data.nodes = [];
        if (!Array.isArray(data.edges)) data.edges = [];
        if (!Array.isArray(data.groups)) data.groups = [];

        summary.before = {
            nodeCount: data.nodes.length,
            edgeCount: data.edges.length,
            groupCount: data.groups.length,
        };

        function collectNodeIds() {
            const ids = new Set();
            for (const n of data.nodes) {
                if (n && n.id != null) ids.add(String(n.id));
            }
            return ids;
        }

        function collectGroupIds() {
            const ids = new Set();
            for (const g of data.groups) {
                if (g && g.id != null) ids.add(String(g.id));
            }
            return ids;
        }

        /** --- G3: normalize group member lists --- */
        const groupIds = collectGroupIds();

        for (const g of data.groups) {
            if (!g || g.id == null) continue;
            const gid = String(g.id);
            if (!Array.isArray(g.nodes)) g.nodes = [];

            const nextMembers = [];
            for (let i = 0; i < g.nodes.length; i++) {
                const entry = g.nodes[i];
                if (entry && typeof entry === 'object' && !Array.isArray(entry) && entry.id != null) {
                    const nid = String(entry.id);
                    const label = entry.label != null ? String(entry.label) : nid;
                    const type = entry.type != null ? String(entry.type) : 'component';
                    const link = entry.link != null ? entry.link : undefined;
                    const existing = data.nodes.find((x) => x && String(x.id) === nid);
                    if (!existing) {
                        data.nodes.push({
                            id: nid,
                            label,
                            type,
                            ...(link !== undefined ? { link } : {}),
                            _repaired: 'g3_lifted_from_group',
                        });
                    } else {
                        if (label && existing.label === existing.id) existing.label = label;
                        if (type && !existing.type) existing.type = type;
                    }
                    summary.g3Lifted.push({ groupId: gid, nodeId: nid });
                    warnings.push({ code: 'g3_lift_inline_node', groupId: gid, nodeId: nid });
                    nextMembers.push(nid);
                    continue;
                }
                if (typeof entry !== 'string') {
                    summary.g3DroppedNonString.push({ groupId: gid, index: i, entryType: typeof entry });
                    warnings.push({ code: 'g3_drop_non_string_member', groupId: gid, index: i });
                    continue;
                }
                nextMembers.push(entry);
            }
            g.nodes = nextMembers;
        }

        let nodeIds = collectNodeIds();

        for (const g of data.groups) {
            if (!g || g.id == null) continue;
            const gid = String(g.id);
            const kept = [];
            for (const mid of g.nodes) {
                const sid = String(mid);
                if (!nodeIds.has(sid)) {
                    summary.g3DroppedUnknownMember.push({ groupId: gid, memberId: sid });
                    warnings.push({ code: 'g3_drop_unknown_member', groupId: gid, memberId: sid });
                    continue;
                }
                kept.push(sid);
            }
            g.nodes = kept;
        }

        /** Drop empty groups */
        const keptGroups = [];
        for (const g of data.groups) {
            if (!g || g.id == null) continue;
            if (!Array.isArray(g.nodes) || g.nodes.length === 0) {
                summary.g3DroppedEmptyGroups.push(String(g.id));
                warnings.push({ code: 'g3_dropped_empty_group', groupId: String(g.id) });
                continue;
            }
            keptGroups.push(g);
        }
        data.groups = keptGroups;
        groupIds.clear();
        for (const g of data.groups) groupIds.add(String(g.id));

        nodeIds = collectNodeIds();

        /** --- G2: inject external nodes for unknown edge endpoints --- */
        function ensureExternalNode(id) {
            const sid = String(id);
            if (nodeIds.has(sid)) return;
            if (groupIds.has(sid)) return;
            data.nodes.push({
                id: sid,
                label: sid,
                type: 'external',
                _repaired: 'g2_injected_endpoint',
            });
            nodeIds.add(sid);
            summary.g2Injected.push(sid);
            warnings.push({ code: 'g2_injected_external', nodeId: sid });
            return true;
        }

        for (const e of data.edges) {
            if (!e) continue;
            const src = e.source != null ? String(e.source) : '';
            const tgt = e.target != null ? String(e.target) : '';
            if (!src || !tgt) {
                warnings.push({ code: 'g2_skip_edge_missing_endpoint', edge: e });
                continue;
            }
            if (groupIds.has(src)) {
                summary.g2EndpointIsGroupId.push({ role: 'source', id: src });
                warnings.push({ code: 'g2_endpoint_is_group_id', role: 'source', id: src });
            } else if (!nodeIds.has(src)) {
                ensureExternalNode(src);
            }
            if (groupIds.has(tgt)) {
                summary.g2EndpointIsGroupId.push({ role: 'target', id: tgt });
                warnings.push({ code: 'g2_endpoint_is_group_id', role: 'target', id: tgt });
            } else if (!nodeIds.has(tgt)) {
                ensureExternalNode(tgt);
            }
        }

        summary.after = {
            nodeCount: data.nodes.length,
            edgeCount: data.edges.length,
            groupCount: data.groups.length,
        };

        return {
            ok: true,
            diagram: data,
            warnings,
            summary,
        };
    }

    global.repairDiagramIR = repairDiagramIR;

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = { repairDiagramIR };
    }
})(typeof window !== 'undefined' ? window : globalThis);
