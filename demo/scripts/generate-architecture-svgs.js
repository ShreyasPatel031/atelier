#!/usr/bin/env node
/**
 * Pre-render overview architecture SVGs (+ optional PNG) for README embeds.
 * Output: demo/repos/<id>/architecture.svg and architecture.png (no legend).
 * Optional sidecar legend.json → architecture-legend.svg (+ architecture-legend.png with --png).
 *
 * SVG matches React Flow export: dashed group frames + label pills above groups.
 *
 *   node demo/scripts/generate-architecture-svgs.js
 *   node demo/scripts/generate-architecture-svgs.js --repo persona-selection-model --png
 */
'use strict';

const fs = require('fs');
const path = require('path');
const ELK = require('elkjs');
const { diagramToElkInput } = require('../pipeline-diagram-to-elk.js');
const { elkLaidOutGraphToSvgMarkup } = require('../pipeline-elk-svg.js');

const elk = new ELK();
const reposDir = path.join(__dirname, '..', 'repos');

/** Playwright canvas for accurate group-pill widths (optional; falls back to heuristic in pipeline-elk-svg.js). */
let pillMeasurePage = null;
let pillMeasureBrowser = null;

const SVG_GROUP_LABEL_FONT_PX = 14;

async function ensurePillTextMeasurer() {
    if (pillMeasurePage) return;
    const { chromium } = require('playwright');
    pillMeasureBrowser = await chromium.launch({ headless: true });
    pillMeasurePage = await pillMeasureBrowser.newPage();
    await pillMeasurePage.setContent(
        '<!DOCTYPE html><body style="margin:0"><canvas id="m" width="2400" height="64"></canvas></body>'
    );
}

async function measurePillLabelWidthPx(text) {
    await ensurePillTextMeasurer();
    return pillMeasurePage.evaluate(
        function (args) {
            var ctx = document.getElementById('m').getContext('2d');
            ctx.font =
                '600 ' +
                args.fontPx +
                'px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
            return ctx.measureText(args.text).width;
        },
        { text: String(text), fontPx: SVG_GROUP_LABEL_FONT_PX }
    );
}

async function primePillWidthsForDiagram(diagram) {
    global.atelierPillWidthByLabel = Object.create(null);
    const groups = diagram && Array.isArray(diagram.groups) ? diagram.groups : [];
    for (const g of groups) {
        const lab = g && (g.label != null ? String(g.label) : g.id != null ? String(g.id) : '');
        if (!lab) continue;
        global.atelierPillWidthByLabel[lab] = await measurePillLabelWidthPx(lab);
    }
}

async function closePillTextMeasurer() {
    if (pillMeasureBrowser) {
        await pillMeasureBrowser.close();
        pillMeasureBrowser = null;
        pillMeasurePage = null;
    }
    delete global.atelierPillWidthByLabel;
}

function parseArgs(argv) {
    const out = { repo: null, png: false, scale: 2 };
    for (let i = 2; i < argv.length; i++) {
        const a = argv[i];
        if (a === '--png') out.png = true;
        else if (a.startsWith('--repo=')) out.repo = a.slice('--repo='.length);
        else if (a === '--repo' && argv[i + 1]) out.repo = argv[++i];
        else if (a.startsWith('--scale=')) out.scale = Math.max(1, Number(a.slice(8)) || 2);
    }
    return out;
}

function cloneDiagram(diagram) {
    return JSON.parse(JSON.stringify(diagram));
}

/** README embed: neutral groups + white leaf nodes (viewer legend is a separate export). */
function diagramForBaseExport(diagram) {
    const d = cloneDiagram(diagram);
    delete d.legend;
    return d;
}

function diagramForLegendExport(diagram, legendBlock) {
    const d = diagramForBaseExport(diagram);
    if (legendBlock && typeof legendBlock === 'object') {
        d.legend = cloneDiagram(legendBlock);
    }
    return d;
}

function readLegendSidecar(repoDir) {
    const p = path.join(repoDir, 'legend.json');
    if (!fs.existsSync(p)) return null;
    try {
        const raw = JSON.parse(fs.readFileSync(p, 'utf8'));
        if (raw && raw.enabled === true) return raw;
        if (raw && raw.legend && raw.legend.enabled === true) return raw.legend;
        return null;
    } catch {
        return null;
    }
}

async function layoutOverviewSvg(diagram) {
    await primePillWidthsForDiagram(diagram);
    const pack = diagramToElkInput(diagram, { target: 'elkjs' });
    if (!pack.ok || !pack.elkGraph) {
        throw new Error(pack.reason || 'diagramToElkInput failed');
    }
    const elkGraph = JSON.parse(JSON.stringify(pack.elkGraph));
    const laidOut = await elk.layout(elkGraph);
    return elkLaidOutGraphToSvgMarkup(laidOut, { groupLabelsOutside: true, diagram: diagram });
}

async function svgFileToPng(svgPath, pngPath, scale) {
    const { chromium } = require('playwright');
    const svg = fs.readFileSync(svgPath, 'utf8');
    const browser = await chromium.launch({ headless: true });
    try {
        const page = await browser.newPage({
            viewport: { width: 1400, height: 900 },
            deviceScaleFactor: scale,
        });
        await page.setContent(
            `<!DOCTYPE html><html><head><meta charset="utf-8"/></head>` +
                `<body style="margin:0;background:#fafafa;display:inline-block">` +
                svg +
                `</body></html>`,
            { waitUntil: 'networkidle' }
        );
        const box = await page.locator('svg').boundingBox();
        if (!box) throw new Error('svg bounding box missing');
        await page.screenshot({
            path: pngPath,
            clip: {
                x: box.x,
                y: box.y,
                width: box.width,
                height: box.height,
            },
            omitBackground: false,
        });
    } finally {
        await browser.close();
    }
}

async function main() {
    const args = parseArgs(process.argv);
    const indexPath = path.join(reposDir, 'index.json');
    let repoIds = [];
    if (args.repo) {
        repoIds = [args.repo];
    } else if (fs.existsSync(indexPath)) {
        const index = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
        repoIds = index
            .map((e) => (typeof e === 'string' ? e : e && e.id))
            .filter(Boolean);
    }
    if (!repoIds.length) {
        repoIds = fs
            .readdirSync(reposDir, { withFileTypes: true })
            .filter((e) => e.isDirectory() && !e.name.startsWith('.'))
            .map((e) => e.name)
            .sort();
    }

    let wrote = 0;
    let wroteLegend = 0;
    let wrotePng = 0;
    let wroteLegendPng = 0;
    let skipped = 0;
    const failures = [];

    for (const id of repoIds) {
        const repoDir = path.join(reposDir, id);
        const overviewPath = path.join(repoDir, 'overview.json');
        if (!fs.existsSync(overviewPath)) {
            skipped++;
            continue;
        }
        let overview;
        try {
            overview = JSON.parse(fs.readFileSync(overviewPath, 'utf8'));
        } catch (err) {
            failures.push({ id, error: 'overview.json parse: ' + err.message });
            continue;
        }
        const diagram = overview && overview.diagram;
        if (!diagram || !Array.isArray(diagram.nodes) || !diagram.nodes.length) {
            skipped++;
            continue;
        }
        try {
            const baseDiagram = diagramForBaseExport(diagram);
            const svg = await layoutOverviewSvg(baseDiagram);
            const svgPath = path.join(repoDir, 'architecture.svg');
            fs.writeFileSync(svgPath, svg, 'utf8');
            wrote++;
            if (args.png) {
                const pngPath = path.join(repoDir, 'architecture.png');
                await svgFileToPng(svgPath, pngPath, args.scale);
                wrotePng++;
            }

            const legendBlock = readLegendSidecar(repoDir);
            if (legendBlock) {
                const legendDiagram = diagramForLegendExport(diagram, legendBlock);
                const legendSvg = await layoutOverviewSvg(legendDiagram);
                const legendSvgPath = path.join(repoDir, 'architecture-legend.svg');
                fs.writeFileSync(legendSvgPath, legendSvg, 'utf8');
                wroteLegend++;
                if (args.png) {
                    const legendPngPath = path.join(repoDir, 'architecture-legend.png');
                    await svgFileToPng(legendSvgPath, legendPngPath, args.scale);
                    wroteLegendPng++;
                }
            }
        } catch (err) {
            failures.push({
                id,
                error: err && err.message ? err.message : String(err),
            });
        }
    }

    console.log(
        JSON.stringify(
            {
                wrote,
                wroteLegend,
                wrotePng,
                wroteLegendPng,
                skipped,
                failures: failures.length,
                samples: failures.slice(0, 10),
            },
            null,
            2
        )
    );
    if (failures.length) process.exit(1);
}

main()
    .catch((err) => {
        console.error(err);
        process.exit(1);
    })
    .finally(() => closePillTextMeasurer());
