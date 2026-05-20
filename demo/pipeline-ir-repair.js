/**
 * R2: Diagram IR repair — normalises and fixes known issues before ELK input.
 *
 * Exposes:
 *   window.repairDiagramIR(diagram) → { ok, diagram, summary, warnings }
 */
(function (global) {
    'use strict';

    /**
     * @param {object|null} diagram  Deep-cloned diagram IR (mutated in place).
     * @returns {{ ok: boolean, reason?: string, diagram: object|null, summary: object, warnings: any[] }}
     */
    function repairDiagramIR(diagram) {
        var warnings = [];
        var stats = {
            renamedIdentityGroups: 0,
        };

        if (!diagram || typeof diagram !== 'object') {
            return { ok: false, reason: 'no_diagram', diagram: null, summary: stats, warnings: warnings };
        }

        var d = diagram;
        if (!Array.isArray(d.nodes)) d.nodes = [];
        if (!Array.isArray(d.edges)) d.edges = [];
        if (!Array.isArray(d.groups)) d.groups = [];

        var nodeIdSet = new Set();
        for (var ni = 0; ni < d.nodes.length; ni++) {
            var n = d.nodes[ni];
            if (n && n.id != null) nodeIdSet.add(String(n.id));
        }

        // Collect all group IDs and node IDs to avoid creating new collisions.
        var allIds = new Set(nodeIdSet);
        for (var gi0 = 0; gi0 < d.groups.length; gi0++) {
            var g0 = d.groups[gi0];
            if (g0 && g0.id != null) allIds.add(String(g0.id));
        }

        // Fix "identity groups": a group whose only member is a node with the
        // same ID.  This 1:1 wrapper shares the node's ID, causing ELK to
        // confuse the compound node with the leaf and misroute edges.
        //
        // Resolution: rename the GROUP to a unique ID (e.g. `<id>_grp`) and
        // update all parent groups that reference it.  The node keeps its
        // original ID, so edges are unaffected.

        var renamedMap = new Map(); // oldGroupId → newGroupId

        for (var gi = 0; gi < d.groups.length; gi++) {
            var gr = d.groups[gi];
            if (!gr || gr.id == null || !Array.isArray(gr.nodes)) continue;
            var gId = String(gr.id);
            var members = gr.nodes.map(String);

            if (members.length === 1 && members[0] === gId && nodeIdSet.has(gId)) {
                var newId = gId + '_grp';
                var suffix = 2;
                while (allIds.has(newId)) {
                    newId = gId + '_grp' + suffix;
                    suffix++;
                }
                allIds.add(newId);
                renamedMap.set(gId, newId);
                gr.id = newId;
                stats.renamedIdentityGroups++;
                warnings.push({
                    code: 'r2_renamed_identity_group',
                    oldId: gId,
                    newId: newId,
                });
            }
        }

        // Update parent groups that reference a renamed group as a member.
        // Skip the renamed group itself — its member list still holds the
        // original node ID, which is correct (the node was NOT renamed).
        if (renamedMap.size > 0) {
            var renamedNewIds = new Set(renamedMap.values());
            for (var gi2 = 0; gi2 < d.groups.length; gi2++) {
                var gr2 = d.groups[gi2];
                if (!gr2 || !Array.isArray(gr2.nodes)) continue;
                if (renamedNewIds.has(String(gr2.id))) continue;
                for (var mi = 0; mi < gr2.nodes.length; mi++) {
                    var mid = String(gr2.nodes[mi]);
                    if (renamedMap.has(mid)) {
                        gr2.nodes[mi] = renamedMap.get(mid);
                    }
                }
            }
        }

        return {
            ok: true,
            diagram: d,
            summary: stats,
            warnings: warnings,
        };
    }

    global.repairDiagramIR = repairDiagramIR;

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = { repairDiagramIR: repairDiagramIR };
    }
})(typeof window !== 'undefined' ? window : globalThis);
