/**
 * R1: Convert overview ```mermaid``` (narrow subset) to renderer-agnostic DIAGRAM_JSON shape.
 * Supports: flowchart|graph + direction, subgraph/end, nodes ([] () (()), edges -->, ==>, -.-> with optional |"label"|,
 * click id "file.md". Ignores classDef/class/style lines.
 *
 * Exposes window.overviewMermaidToDiagramJson(text) → { ok, diagram?, warnings?, unsupportedLines?, reason? }
 */
(function (global) {
    'use strict';

    function overviewMermaidToDiagramJson(text) {
        const warnings = [];
        const unsupportedLines = [];
        if (!text || typeof text !== 'string' || !text.trim()) {
            return { ok: false, reason: 'empty_mermaid', warnings, unsupportedLines };
        }

        const nodesMap = new Map();
        const edges = [];
        const groupsMap = new Map();
        const clickMap = new Map();
        let direction = 'TD';
        const subgraphStack = [];

        function ensureNode(id, label, extra) {
            if (!id) return;
            const prev = nodesMap.get(id);
            const lab = (label != null ? String(label) : id).trim();
            if (prev) {
                if (lab && prev.label === id && lab !== id) prev.label = lab;
                Object.assign(prev, extra || {});
                return;
            }
            nodesMap.set(id, {
                id,
                label: lab || id,
                type: 'component',
                ...(extra || {}),
            });
        }

        function addNodeToCurrentGroups(nodeId) {
            if (!subgraphStack.length) return;
            const gid = subgraphStack[subgraphStack.length - 1];
            const g = groupsMap.get(gid);
            if (g && !g.nodes.includes(nodeId)) g.nodes.push(nodeId);
        }

        const rawLines = text.split(/\r?\n/);
        const lines = [];
        for (let raw of rawLines) {
            const line = raw.trim();
            if (!line || line.startsWith('%%')) continue;
            lines.push(line);
        }

        for (const line of lines) {
            if (/^classDef\s/i.test(line) || /^class\s+/i.test(line) || /^style\s+/i.test(line)) {
                continue;
            }

            const clickM = line.match(/^click\s+(\w+)\s+"([^"]+)"/);
            if (clickM) {
                clickMap.set(clickM[1], clickM[2].replace(/\.md$/i, '') + '.md');
                continue;
            }

            const subOpen = line.match(/^subgraph\s+(\w+)(?:\["([^"]*)"\])?/i);
            if (subOpen) {
                const gid = subOpen[1];
                const glabel = subOpen[2] != null ? subOpen[2] : gid;
                if (!groupsMap.has(gid)) {
                    groupsMap.set(gid, { id: gid, label: glabel, nodes: [] });
                }
                subgraphStack.push(gid);
                continue;
            }

            if (/^end\s*$/i.test(line)) {
                if (!subgraphStack.length) {
                    warnings.push('unmatched_end');
                } else {
                    subgraphStack.pop();
                }
                continue;
            }

            const hdr = line.match(/^(flowchart|graph)\s+(\w+)\s*$/i);
            if (hdr) {
                direction = hdr[2].toUpperCase();
                continue;
            }

            const edgeLabeled = line.match(
                /^(\w+)\s*(-->|==>|-\.->)\s*\|\s*"([^"]*)"\s*\|\s*(\w+)\s*$/
            );
            if (edgeLabeled) {
                edges.push({
                    source: edgeLabeled[1],
                    target: edgeLabeled[4],
                    label: edgeLabeled[3],
                });
                ensureNode(edgeLabeled[1], edgeLabeled[1]);
                ensureNode(edgeLabeled[4], edgeLabeled[4]);
                continue;
            }

            const edgePlain = line.match(/^(\w+)\s*(-->|==>|-\.->)\s*(\w+)\s*$/);
            if (edgePlain) {
                edges.push({ source: edgePlain[1], target: edgePlain[3], label: '' });
                ensureNode(edgePlain[1], edgePlain[1]);
                ensureNode(edgePlain[3], edgePlain[3]);
                continue;
            }

            let nodeMatch = line.match(/^(\w+)\s*\[\s*"([^"]*)"\s*\]\s*$/);
            if (nodeMatch) {
                ensureNode(nodeMatch[1], nodeMatch[2]);
                addNodeToCurrentGroups(nodeMatch[1]);
                continue;
            }

            nodeMatch = line.match(/^(\w+)\s*\[\s*([^\]]+?)\s*\]\s*$/);
            if (nodeMatch) {
                ensureNode(nodeMatch[1], nodeMatch[2].replace(/^["']|["']$/g, '').trim());
                addNodeToCurrentGroups(nodeMatch[1]);
                continue;
            }

            nodeMatch = line.match(/^(\w+)\s*\(\s*"([^"]*)"\s*\)\s*$/);
            if (nodeMatch) {
                ensureNode(nodeMatch[1], nodeMatch[2]);
                addNodeToCurrentGroups(nodeMatch[1]);
                continue;
            }

            nodeMatch = line.match(/^(\w+)\s*\(\(\s*"([^"]*)"\s*\)\)\s*$/);
            if (nodeMatch) {
                ensureNode(nodeMatch[1], nodeMatch[2]);
                addNodeToCurrentGroups(nodeMatch[1]);
                continue;
            }

            nodeMatch = line.match(/^(\w+)\s*\(\(\s*([^)]+?)\s*\)\)\s*$/);
            if (nodeMatch) {
                ensureNode(nodeMatch[1], nodeMatch[2].replace(/^["']|["']$/g, '').trim());
                addNodeToCurrentGroups(nodeMatch[1]);
                continue;
            }

            unsupportedLines.push(line);
        }

        if (subgraphStack.length) {
            warnings.push('unclosed_subgraph:' + subgraphStack.join(','));
        }

        for (const [nid, mdPath] of clickMap.entries()) {
            const n = nodesMap.get(nid);
            if (n) {
                n.type = 'module';
                n.link = mdPath;
            } else {
                ensureNode(nid, nid, { type: 'module', link: mdPath });
            }
        }

        const nodes = Array.from(nodesMap.values()).sort((a, b) => a.id.localeCompare(b.id));
        const groups = Array.from(groupsMap.values()).map((g) => ({
            id: g.id,
            label: g.label,
            nodes: [...g.nodes],
        }));

        const diagram = {
            direction,
            nodes,
            edges,
            groups,
        };

        const ok =
            unsupportedLines.length === 0 ||
            unsupportedLines.length <= Math.max(3, Math.floor(lines.length * 0.15));

        if (!ok) {
            return {
                ok: false,
                reason: 'too_many_unsupported_lines',
                diagram,
                warnings,
                unsupportedLines,
                unsupportedLineCount: unsupportedLines.length,
            };
        }

        return {
            ok: true,
            diagram,
            warnings,
            unsupportedLines,
            unsupportedLineCount: unsupportedLines.length,
            counts: {
                nodes: nodes.length,
                edges: edges.length,
                groups: groups.length,
            },
        };
    }

    /**
     * Shape labels as authored in Mermaid (node id → raw bracket text / subgraph title).
     * Matches the subset parsed by overviewMermaidToDiagramJson.
     */
    function extractMermaidShapeLabels(text) {
        const map = Object.create(null);
        if (!text || typeof text !== 'string') return map;

        const rawLines = text.split(/\r?\n/);
        const lines = [];
        for (const raw of rawLines) {
            const line = raw.trim();
            if (!line || line.startsWith('%%')) continue;
            lines.push(line);
        }

        for (const line of lines) {
            if (/^classDef\s/i.test(line) || /^class\s+/i.test(line) || /^style\s+/i.test(line)) {
                continue;
            }
            if (/^click\s+/i.test(line)) continue;

            const subOpen = line.match(/^subgraph\s+(\w+)(?:\["([^"]*)"\])?/i);
            if (subOpen) {
                const gid = subOpen[1];
                map[gid] = subOpen[2] != null ? subOpen[2] : gid;
                continue;
            }
            if (/^end\s*$/i.test(line)) continue;

            const hdr = line.match(/^(flowchart|graph)\s+(\w+)\s*$/i);
            if (hdr) continue;

            const edgeLabeled = line.match(
                /^(\w+)\s*(-->|==>|-\.->)\s*\|\s*"([^"]*)"\s*\|\s*(\w+)\s*$/
            );
            if (edgeLabeled) continue;

            const edgePlain = line.match(/^(\w+)\s*(-->|==>|-\.->)\s*(\w+)\s*$/);
            if (edgePlain) continue;

            let nodeMatch = line.match(/^(\w+)\s*\[\s*"([^"]*)"\s*\]\s*$/);
            if (nodeMatch) {
                map[nodeMatch[1]] = nodeMatch[2];
                continue;
            }
            nodeMatch = line.match(/^(\w+)\s*\[\s*([^\]]+?)\s*\]\s*$/);
            if (nodeMatch) {
                map[nodeMatch[1]] = nodeMatch[2].replace(/^["']|["']$/g, '').trim();
                continue;
            }
            nodeMatch = line.match(/^(\w+)\s*\(\s*"([^"]*)"\s*\)\s*$/);
            if (nodeMatch) {
                map[nodeMatch[1]] = nodeMatch[2];
                continue;
            }
            nodeMatch = line.match(/^(\w+)\s*\(\(\s*"([^"]*)"\s*\)\)\s*$/);
            if (nodeMatch) {
                map[nodeMatch[1]] = nodeMatch[2];
                continue;
            }
            nodeMatch = line.match(/^(\w+)\s*\(\(\s*([^)]+?)\s*\)\)\s*$/);
            if (nodeMatch) {
                map[nodeMatch[1]] = nodeMatch[2].replace(/^["']|["']$/g, '').trim();
                continue;
            }
        }
        return map;
    }

    global.extractMermaidShapeLabels = extractMermaidShapeLabels;
    global.overviewMermaidToDiagramJson = overviewMermaidToDiagramJson;

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = { overviewMermaidToDiagramJson, extractMermaidShapeLabels };
    }
})(typeof window !== 'undefined' ? window : globalThis);
