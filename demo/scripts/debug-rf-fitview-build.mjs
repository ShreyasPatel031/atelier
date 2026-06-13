import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const repo = process.argv[2] || 'dspy';
const mcpDir = join(dirname(fileURLToPath(import.meta.url)), '../../packages/atelier-mcp');

async function resolveViewerUrl(repoId) {
  if (process.argv[3]) return process.argv[3];
  try {
    const raw = await readFile(join(homedir(), '.cache/atelier-mcp/viewer-runtime.json'), 'utf8');
    const { port } = JSON.parse(raw);
    if (typeof port === 'number') return `http://127.0.0.1:${port}/?repo=${repoId}`;
  } catch {
    /* boot via first patch */
  }
  return null;
}

function patch(operations) {
  return new Promise((resolve, reject) => {
    const ops = JSON.stringify(operations);
    const child = spawn(
      'node',
      [
        '--input-type=module',
        '-e',
        `import { patchDiagram } from './dist/tools/patch-diagram.js';
         import { ensureLocalServer } from './dist/local-server.js';
         process.env.ATELIER_DATA_ORIGIN='http://127.0.0.1:9891';
         await ensureLocalServer();
         const r = await patchDiagram({ repo_id:'dspy', target:'overview', operations:${ops} });
         console.log(JSON.stringify(JSON.parse(r.content[0].text)));`,
      ],
      { cwd: mcpDir, env: { ...process.env, ATELIER_DATA_ORIGIN: 'http://127.0.0.1:9891' } }
    );
    let out = '';
    child.stdout.on('data', (d) => (out += d));
    child.on('exit', (code) =>
      code === 0 ? resolve(JSON.parse(out.trim())) : reject(new Error(out || `exit ${code}`))
    );
  });
}

async function measureCenter(page) {
  return page.evaluate(() => {
    const api = window.__atelierR6ViewportApi;
    const root = document.getElementById('reactflowRoot');
    const vpEl = root?.querySelector('.react-flow__viewport');
    const paneEl = root?.querySelector('.react-flow');
    if (!api || !vpEl) return { ok: false, reason: 'no api or viewport' };
    const nodes = api.getNodes().filter((n) => n.width && n.height);
    const edges = api.getEdges();
    if (!nodes.length) return { ok: false, reason: 'no sized nodes', nodeCount: api.getNodes().length };
    const vp = api.getViewport();
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;
    const include = (x, y) => {
      if (!Number.isFinite(x) || !Number.isFinite(y)) return;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    };
    const nb =
      typeof api.getNodesBounds === 'function' ? api.getNodesBounds(api.getNodes()) : null;
    if (nb) {
      minX = nb.x;
      minY = nb.y;
      maxX = nb.x + nb.width;
      maxY = nb.y + nb.height;
    } else {
      for (const n of nodes) {
        include(n.position.x, n.position.y);
        include(n.position.x + (n.width || 0), n.position.y + (n.height || 0));
      }
    }
    for (const e of edges) {
      const pts = e.data?.routePoints || [];
      for (const p of pts) include(Number(p.x), Number(p.y));
    }
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    const screenCx = cx * vp.zoom + vp.x;
    const screenCy = cy * vp.zoom + vp.y;
    const rect = (paneEl || vpEl).getBoundingClientRect();
    const viewCx = rect.width / 2;
    const viewCy = rect.height / 2;
    const offsetX = Math.abs(screenCx - viewCx) / Math.max(rect.width, 1);
    const offsetY = Math.abs(screenCy - viewCy) / Math.max(rect.height, 1);
    const pad = 0.14;
    const inView =
      minX * vp.zoom + vp.x >= -rect.width * pad &&
      minY * vp.zoom + vp.y >= -rect.height * pad &&
      maxX * vp.zoom + vp.x <= rect.width * (1 + pad) &&
      maxY * vp.zoom + vp.y <= rect.height * (1 + pad);
    return {
      ok: true,
      nodes: nodes.length,
      edges: edges.length,
      offsetX: +offsetX.toFixed(3),
      offsetY: +offsetY.toFixed(3),
      centered: offsetX < 0.12 && offsetY < 0.12,
      edgesInView: inView,
      zoom: +vp.zoom.toFixed(3),
    };
  });
}

async function waitReload(page, prevEpoch) {
  for (let i = 0; i < 30; i++) {
    const ep = await page.evaluate(() => window.__atelierViewerEpoch);
    if (typeof ep === 'number' && ep > prevEpoch) {
      await page.waitForTimeout(1200);
      return ep;
    }
    await page.waitForTimeout(200);
  }
  throw new Error('epoch did not advance');
}

const steps = [
  {
    name: 'clear+user',
    ops: [
      { op: 'remove_group', id: 'developer_workflow' },
      { op: 'remove_group', id: 'program_core' },
      { op: 'remove_group', id: 'model_integration' },
      { op: 'remove_group', id: 'optimization_support' },
      { op: 'remove_node', id: 'user', cascade: true },
      { op: 'remove_node', id: 'core_primitives', cascade: true },
      { op: 'remove_node', id: 'program_execution', cascade: true },
      { op: 'remove_node', id: 'lm_integration', cascade: true },
      { op: 'remove_node', id: 'optimization_evaluation', cascade: true },
      { op: 'remove_node', id: 'data_utilities', cascade: true },
      { op: 'set_direction', direction: 'LR' },
      { op: 'add_node', id: 'user', label: 'Developer / User', type: 'external' },
    ],
  },
  {
    name: 'group+core+program',
    ops: [
      { op: 'add_group', id: 'developer_workflow', label: 'Developer Workflow', node_ids: ['user'] },
      { op: 'add_node', id: 'core_primitives', label: 'Core Building Blocks', type: 'module', link: 'core_primitives' },
      { op: 'add_edge', source: 'user', target: 'core_primitives', label: 'defines programs using' },
      { op: 'add_node', id: 'program_execution', label: 'Program Logic & Flow', type: 'module', link: 'program_execution' },
      { op: 'add_edge', source: 'core_primitives', target: 'program_execution', label: 'provides building blocks for' },
      { op: 'add_group', id: 'program_core', label: 'Program Definition & Execution', node_ids: ['core_primitives', 'program_execution'] },
    ],
  },
  {
    name: 'lm+optimization',
    ops: [
      { op: 'add_node', id: 'lm_integration', label: 'LM & API Clients', type: 'module', link: 'lm_integration' },
      { op: 'add_edge', source: 'user', target: 'lm_integration', label: 'configures LMs/RMs via' },
      { op: 'add_edge', source: 'program_execution', target: 'lm_integration', label: 'makes calls through' },
      { op: 'add_edge', source: 'lm_integration', target: 'program_execution', label: 'serves LM/RM responses to' },
      { op: 'add_group', id: 'model_integration', label: 'External Model Integration', node_ids: ['lm_integration'] },
      { op: 'add_node', id: 'optimization_evaluation', label: 'Program Optimization & Evaluation', type: 'module', link: 'optimization_evaluation' },
      { op: 'add_edge', source: 'user', target: 'optimization_evaluation', label: 'optimizes and evaluates' },
      { op: 'add_edge', source: 'program_execution', target: 'optimization_evaluation', label: 'is optimized and evaluated by' },
      { op: 'add_edge', source: 'lm_integration', target: 'optimization_evaluation', label: 'provides LM access for meta-reasoning' },
    ],
  },
  {
    name: 'data+final-group',
    ops: [
      { op: 'add_node', id: 'data_utilities', label: 'Data & General Utilities', type: 'module', link: 'data_utilities' },
      { op: 'add_edge', source: 'program_execution', target: 'data_utilities', label: 'processes data from' },
      { op: 'add_edge', source: 'data_utilities', target: 'program_execution', label: 'supplies data to' },
      { op: 'add_edge', source: 'data_utilities', target: 'lm_integration', label: 'caches/streams data for' },
      { op: 'add_edge', source: 'optimization_evaluation', target: 'program_execution', label: 'refines program logic in' },
      { op: 'add_group', id: 'optimization_support', label: 'Optimization, Evaluation & Utilities', node_ids: ['optimization_evaluation', 'data_utilities'] },
    ],
  },
];

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });

let url = await resolveViewerUrl(repo);
let ranFirstPatch = false;
if (!url) {
  await patch(steps[0].ops);
  ranFirstPatch = true;
  url = await resolveViewerUrl(repo);
  if (!url) {
    const boot = spawn('node', ['--input-type=module', '-e', `import { bootViewer } from './dist/local-server.js'; console.log(await bootViewer());`], { cwd: mcpDir, env: { ...process.env, ATELIER_DATA_ORIGIN: 'http://127.0.0.1:9891' } });
    let bootOut = '';
    boot.stdout.on('data', (d) => (bootOut += d));
    await new Promise((r) => boot.on('exit', r));
    const port = Number.parseInt(bootOut.trim(), 10);
    url = Number.isFinite(port) ? `http://127.0.0.1:${port}/?repo=${repo}` : `http://127.0.0.1:9891/?repo=${repo}`;
  }
}

await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
for (let i = 0; i < 24; i++) {
  const ready = await page.evaluate(() => !!window.__atelierR6ViewportApi?.fitView);
  if (ready) break;
  await page.waitForTimeout(500);
}

const results = [];
let epoch = (await page.evaluate(() => window.__atelierViewerEpoch)) || 0;

for (const step of steps) {
  if (ranFirstPatch && step === steps[0]) continue;
  await patch(step.ops);
  epoch = await waitReload(page, epoch);
  const m = await measureCenter(page);
  results.push({ step: step.name, ...m });
}

console.log(JSON.stringify({ allCentered: results.every((r) => r.centered && r.edgesInView !== false), results }, null, 2));
await browser.close();
process.exit(results.every((r) => r.centered && r.edgesInView !== false) ? 0 : 1);
