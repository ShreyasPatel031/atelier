/**
 * Walks each demo/repos/<name>/module_tree.json: R4 diagramToElkInput (elkjs),
 * then elk.layout. Exits 1 on any layout failure. Hardens the converter, not fixture JSON.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const ELK = require('elkjs');
const {
    diagramToElkInput,
    validateElkEdgePlacement,
} = require('../pipeline-diagram-to-elk.js');

const elk = new ELK();

function walkModuleTreeForDiagrams(obj, pathParts, out) {
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return;
    if (
        obj.diagram &&
        typeof obj.diagram === 'object' &&
        Array.isArray(obj.diagram.nodes)
    ) {
        out.push({
            path: pathParts.length ? pathParts.join('/') : 'root',
            diagram: obj.diagram,
        });
    }
    for (const k of Object.keys(obj)) {
        if (k === 'diagram') continue;
        const v = obj[k];
        if (v && typeof v === 'object' && !Array.isArray(v)) {
            walkModuleTreeForDiagrams(v, pathParts.concat(k), out);
        }
    }
}

async function layoutOne(elkGraph, meta) {
    try {
        await elk.layout(elkGraph);
        return { ok: true };
    } catch (err) {
        return {
            ok: false,
            error: err && err.message ? err.message : String(err),
            stack: err && err.stack ? err.stack : '',
            meta,
        };
    }
}

async function main() {
    const reposDir = path.join(__dirname, '..', 'repos');
    const repoFilter = process.env.ELK_VALIDATE_REPO;
    const repoNames = fs.readdirSync(reposDir).filter((n) => {
        if (repoFilter && n !== repoFilter) return false;
        const p = path.join(reposDir, n, 'module_tree.json');
        return fs.existsSync(p);
    });

    /** @type {{ repo: string, modulePath: string, phase: string, error: string }[]} */
    const failures = [];
    let tested = 0;

    for (const repo of repoNames) {
        const mtPath = path.join(reposDir, repo, 'module_tree.json');
        const tree = JSON.parse(fs.readFileSync(mtPath, 'utf8'));
        const items = [];
        walkModuleTreeForDiagrams(tree, [], items);

        for (const { path: modulePath, diagram } of items) {
            tested++;
            for (const target of ['elkjs', 'elklive']) {
                const r4t = diagramToElkInput(diagram, { target });
                if (!r4t.ok || !r4t.elkGraph || !r4t.validate.ok) {
                    failures.push({
                        repo,
                        modulePath,
                        phase: 'diagramToElkInput:' + target,
                        error: r4t.reason || 'validate_' + JSON.stringify(r4t.validate),
                    });
                    continue;
                }
                const placement =
                    r4t.placement || validateElkEdgePlacement(r4t.elkGraph);
                if (!placement.ok) {
                    failures.push({
                        repo,
                        modulePath,
                        phase: 'edgePlacement:' + target,
                        error:
                            'edges_not_in_lca:' +
                            placement.violations.length +
                            ' first=' +
                            JSON.stringify(placement.violations[0]),
                    });
                    continue;
                }
                const lay = await layoutOne(r4t.elkGraph, { repo, modulePath, target });
                if (!lay.ok) {
                    failures.push({
                        repo,
                        modulePath,
                        phase: 'elk.layout:' + target,
                        error: lay.error,
                    });
                }
            }
        }
    }

    console.log(
        JSON.stringify(
            { tested, layoutsPerDiagram: 2, failures: failures.length, samples: failures.slice(0, 50) },
            null,
            2
        )
    );
    if (failures.length) {
        const fullPath = path.join(__dirname, '..', '..', 'tmp', 'elk_layout_failures.json');
        try {
            fs.mkdirSync(path.dirname(fullPath), { recursive: true });
            fs.writeFileSync(fullPath, JSON.stringify(failures, null, 2));
            console.error('Wrote', fullPath);
        } catch (_) {}
        process.exit(1);
    }
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
