/**
 * R5: ELK laid-out graph → SVG (preview before React Flow).
 * Depends on global ELK (elk.bundled.js), diagramToElkInput, repairDiagramIR.
 */
(function (global) {
    'use strict';

    function escapeXml(s) {
        return String(s == null ? '' : s)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function sectionToPathD(section, ox, oy) {
        if (!section) return '';
        var pts = [];
        if (section.startPoint) {
            pts.push({
                x: section.startPoint.x + ox,
                y: section.startPoint.y + oy,
            });
        }
        var bends = section.bendPoints || [];
        for (var b = 0; b < bends.length; b++) {
            var bp = bends[b];
            pts.push({ x: bp.x + ox, y: bp.y + oy });
        }
        if (section.endPoint) {
            pts.push({
                x: section.endPoint.x + ox,
                y: section.endPoint.y + oy,
            });
        }
        if (pts.length < 2) return '';
        var d = 'M ' + pts[0].x + ' ' + pts[0].y;
        for (var i = 1; i < pts.length; i++) {
            d += ' L ' + pts[i].x + ' ' + pts[i].y;
        }
        return d;
    }

    /**
     * @param {object} laidOutGraph - output of elk.layout (mutated graph with x,y,width,height,sections)
     */
    function elkLaidOutGraphToSvgMarkup(laidOutGraph) {
        var acc = { nodes: [], edgePlacements: [] };

        function walk(node, parentId, px, py) {
            if (!node) return;
            var ax = px + (node.x || 0);
            var ay = py + (node.y || 0);
            if (parentId != null && node.width != null && node.height != null) {
                acc.nodes.push({
                    id: String(node.id),
                    x: ax,
                    y: ay,
                    w: node.width,
                    h: node.height,
                    labels: node.labels || [],
                    compound: !!(node.children && node.children.length),
                });
            }
            var edges = node.edges || [];
            for (var e = 0; e < edges.length; e++) {
                acc.edgePlacements.push({ edge: edges[e], ox: ax, oy: ay });
            }
            var ch = node.children || [];
            for (var c = 0; c < ch.length; c++) walk(ch[c], node.id, ax, ay);
        }

        walk(laidOutGraph, null, 0, 0);

        acc.nodes.sort(function (a, b) {
            return b.w * b.h - a.w * a.h;
        });

        var gw = laidOutGraph.width || 400;
        var gh = laidOutGraph.height || 300;
        var pad = 16;

        var edgePaths = '';
        for (var i = 0; i < acc.edgePlacements.length; i++) {
            var ep = acc.edgePlacements[i];
            var edge = ep.edge;
            if (!edge) continue;
            var secs = edge.sections || [];
            for (var s = 0; s < secs.length; s++) {
                var d = sectionToPathD(secs[s], ep.ox, ep.oy);
                if (!d) continue;
                edgePaths +=
                    '<path d="' +
                    d +
                    '" fill="none" stroke="#64748b" stroke-width="1.25" stroke-linejoin="round"/>';
            }
        }

        var nodeMarkup = '';
        for (var n = 0; n < acc.nodes.length; n++) {
            var nn = acc.nodes[n];
            var fill = nn.compound ? '#f1f5f9' : '#ffffff';
            var stroke = '#475569';
            var lab =
                nn.labels[0] && nn.labels[0].text != null
                    ? String(nn.labels[0].text)
                    : nn.id;
            var ty = nn.y + Math.min(16, nn.h / 2 + 4);
            nodeMarkup +=
                '<g class="elk-node" data-elk-id="' +
                escapeXml(nn.id) +
                '">' +
                '<rect x="' +
                nn.x +
                '" y="' +
                nn.y +
                '" width="' +
                nn.w +
                '" height="' +
                nn.h +
                '" rx="4" fill="' +
                fill +
                '" stroke="' +
                stroke +
                '" stroke-width="1"/>' +
                '<text x="' +
                (nn.x + 8) +
                '" y="' +
                ty +
                '" font-family="system-ui,-apple-system,sans-serif" font-size="11" fill="#0f172a">' +
                escapeXml(lab) +
                '</text>' +
                '</g>';
        }

        var vbW = gw + pad * 2;
        var vbH = gh + pad * 2;

        return (
            '<svg xmlns="http://www.w3.org/2000/svg" width="' +
            vbW +
            '" height="' +
            vbH +
            '" viewBox="' +
            -pad +
            ' ' +
            -pad +
            ' ' +
            vbW +
            ' ' +
            vbH +
            '">' +
            '<rect class="elk-svg-bg" x="' +
            -pad +
            '" y="' +
            -pad +
            '" width="' +
            vbW +
            '" height="' +
            vbH +
            '" fill="#fafafa"/>' +
            /** Nodes first, edges last — SVG paint order so paths are not buried under rects. */
            '<g class="elk-layer-nodes">' +
            nodeMarkup +
            '</g><g class="elk-layer-edges" fill="none" stroke-linecap="round">' +
            edgePaths +
            '</g></svg>'
        );
    }

    /**
     * Repair → diagramToElkInput (elkjs) → elk.layout. Shared by R5 SVG and R6 React Flow.
     * @param {object|null} diagram
     * @returns {Promise<{ ok: boolean, laidOut?: object, error?: string, warnings?: object[] }>}
     */
    async function runElkLayoutPipeline(diagram) {
        var mergedWarnings = [];
        if (!diagram || typeof diagram !== 'object') {
            return { ok: false, error: 'no_diagram', warnings: mergedWarnings };
        }
        var d = diagram;
        if (typeof global.repairDiagramIR === 'function') {
            var rep = global.repairDiagramIR(diagram);
            if (rep.warnings && rep.warnings.length) mergedWarnings = mergedWarnings.concat(rep.warnings);
            if (rep.ok && rep.diagram) d = rep.diagram;
        }
        if (typeof global.diagramToElkInput !== 'function') {
            return { ok: false, error: 'diagramToElkInput missing', warnings: mergedWarnings };
        }
        var pack = global.diagramToElkInput(d, { target: 'elkjs' });
        if (pack.warnings && pack.warnings.length) mergedWarnings = mergedWarnings.concat(pack.warnings);
        if (!pack.ok || !pack.elkGraph) {
            return {
                ok: false,
                error: pack.reason || 'diagramToElkInput failed',
                warnings: mergedWarnings,
            };
        }
        var ELKCtor = global.ELK;
        if (!ELKCtor) {
            return { ok: false, error: 'ELK not loaded (include elk.bundled.js)', warnings: mergedWarnings };
        }
        var elkGraph;
        try {
            elkGraph = JSON.parse(JSON.stringify(pack.elkGraph));
        } catch (e) {
            return { ok: false, error: 'clone failed: ' + String(e), warnings: mergedWarnings };
        }
        var elk = new ELKCtor();
        var laidOut;
        try {
            laidOut = await elk.layout(elkGraph);
        } catch (err) {
            return {
                ok: false,
                error: err && err.message ? err.message : String(err),
                warnings: mergedWarnings,
            };
        }
        return { ok: true, laidOut: laidOut, warnings: mergedWarnings };
    }

    /**
     * @param {object|null} diagram - diagram IR (nodes, edges, groups)
     * @returns {Promise<{ ok: boolean, svg?: string, error?: string, warnings?: object[] }>}
     */
    async function runElkLayoutSvgPipeline(diagram) {
        var r = await runElkLayoutPipeline(diagram);
        if (!r.ok) {
            return { ok: false, error: r.error || 'layout failed', svg: '', warnings: r.warnings || [] };
        }
        var svg = elkLaidOutGraphToSvgMarkup(r.laidOut);
        return { ok: true, svg: svg, warnings: r.warnings || [] };
    }

    global.elkLaidOutGraphToSvgMarkup = elkLaidOutGraphToSvgMarkup;
    global.runElkLayoutPipeline = runElkLayoutPipeline;
    global.runElkLayoutSvgPipeline = runElkLayoutSvgPipeline;

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = {
            elkLaidOutGraphToSvgMarkup,
            runElkLayoutPipeline,
            runElkLayoutSvgPipeline,
        };
    }
})(typeof window !== 'undefined' ? window : globalThis);
