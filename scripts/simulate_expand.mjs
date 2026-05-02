/**
 * Simulate the viewer's applyExpansionToDiagram() and call mermaid.parse + render
 * on every (overview, child) pair in a repo. This reproduces what the user sees
 * when they click a node to expand it inline.
 */
import fs from "fs";
import path from "path";
import { Window } from "happy-dom";

function installBrowserPolyfills() {
  const w = new Window({ url: "https://localhost/" });
  globalThis.window = w;
  globalThis.document = w.document;
  globalThis.navigator = w.navigator;
}
installBrowserPolyfills();
const { default: mermaid } = await import("mermaid");
mermaid.initialize({ startOnLoad: false, securityLevel: "loose", theme: "default" });

const RENDER_BENIGN = [
  /Could not find a suitable point for the given distance/i,
  /getBBox is not a function/i,
  /getComputedTextLength is not a function/i,
  /getScreenCTM is not a function/i,
];
const isBenign = (m) => m && RENDER_BENIGN.some((re) => re.test(String(m).split("\n", 1)[0]));

function applyExpansionToDiagram(diagram, nodeId, childDiagram, fallbackLabel) {
  if (!childDiagram || !childDiagram.trim()) return diagram;

  const subgraphName = `${nodeId}_sub`;
  const prefix = `${nodeId}_`;
  const collapseNodeId = `${prefix}collapse`;

  const labelPattern = new RegExp(`${nodeId}\\["?([^"\\]]+)"?\\]`);
  const labelMatch = diagram.match(labelPattern);
  const nodeLabel = labelMatch ? labelMatch[1] : fallbackLabel;

  let subgraphContent = childDiagram.trim().replace(/^(graph|flowchart)\s+\w+\s*\n?/, "");
  subgraphContent = subgraphContent.replace(/^\s*classDef\s+.+$/gm, "");
  subgraphContent = subgraphContent.replace(/^\s*class\s+.+$/gm, "");
  subgraphContent = subgraphContent.replace(/^\s*style\s+.+$/gm, "");

  const nodeIdMatches = [...subgraphContent.matchAll(/\b([A-Za-z][A-Za-z0-9_]*)\b(?=\s*\[|-->|--)/g)];
  const uniqueIds = [...new Set(nodeIdMatches.map((m) => m[1]))].filter(
    (id) => !["subgraph", "end", "graph", "flowchart", "direction", "style", "classDef", "class"].includes(id.toLowerCase())
  );
  for (const oldId of uniqueIds) {
    const newId = prefix + oldId;
    subgraphContent = subgraphContent.replace(new RegExp(`\\b${oldId}\\b`, "g"), newId);
  }

  const subgraphLines = subgraphContent.split("\n").filter((l) => l.trim());
  const indentedContent = subgraphLines.map((l) => "        " + l.trim()).join("\n");
  const subgraphDef = `subgraph ${subgraphName} ["${nodeLabel}"]\n${indentedContent}\n        ${collapseNodeId}["[-] Collapse"]\n    end`;

  let normalizedDiagram = diagram;
  normalizedDiagram = normalizedDiagram.replace(
    new RegExp(`(\\s+)${nodeId}\\[[^\\]]+\\](\\s*)(-->|--[^>])`, "g"),
    `$1${nodeId}$2$3`
  );
  normalizedDiagram = normalizedDiagram.replace(
    new RegExp(`(-->|\\|[^|]*\\|)\\s*${nodeId}\\[[^\\]]+\\]`, "g"),
    `$1 ${nodeId}`
  );
  // Insert subgraph after first directive line
  const lines = normalizedDiagram.split("\n");
  const insertIdx = 1;
  lines.splice(insertIdx, 0, subgraphDef);
  return lines.join("\n");
}

function loadDiagrams(dir) {
  const RE = /```mermaid\s*([\s\S]*?)```/i;
  const out = {};
  for (const f of fs.readdirSync(dir).filter((f) => f.endsWith(".md"))) {
    const md = fs.readFileSync(path.join(dir, f), "utf8");
    const m = md.match(RE);
    if (m) out[f.replace(/\.md$/, "")] = m[1].trim();
  }
  return out;
}

const dir = process.argv[2];
const diags = loadDiagrams(dir);
// Use the largest diagram as "overview" if no overview.md
const overviewKey = Object.keys(diags).find((k) => /overview/i.test(k)) || Object.keys(diags)[0];
const overview = diags[overviewKey];
console.error(`overview = ${overviewKey}, ${Object.keys(diags).length - 1} child candidates`);

const results = [];
let parseFails = 0, renderFails = 0, ok = 0;
const candidateNodeIds = [...overview.matchAll(/\b([a-z][a-z0-9_]*)\b(?=\s*\[|\s*-->)/g)].map((m) => m[1]);
const uniqueCandidates = [...new Set(candidateNodeIds)].filter(
  (id) => !["subgraph", "end", "graph", "flowchart", "direction", "style", "classDef", "class"].includes(id)
);
console.error(`unique candidate node ids in overview: ${uniqueCandidates.length}`);

let seq = 0;
const childKeys = Object.keys(diags).filter((k) => k !== overviewKey).slice(0, 20);
for (const childKey of childKeys) {
  const childDiag = diags[childKey];
  for (const nodeId of uniqueCandidates.slice(0, 4)) {
    const merged = applyExpansionToDiagram(overview, nodeId, childDiag, childKey);
    if (merged === overview) continue;
    seq += 1;
    let stage = null, err = null;
    try { await mermaid.parse(merged); }
    catch (e) { stage = "parse"; err = (e.message || String(e)).split("\n", 1)[0]; }
    if (!stage) {
      try {
        await mermaid.render(`expand_${seq}`, merged);
      } catch (e) {
        const m = e.message || String(e);
        if (!isBenign(m)) {
          stage = "render"; err = m.split("\n", 1)[0];
        }
      }
    }
    if (stage === "parse") parseFails += 1;
    else if (stage === "render") {
      renderFails += 1;
      if (renderFails <= 5) {
        results.push({ nodeId, child: childKey, error: err.slice(0, 200), merged_head: merged.slice(0, 400) });
      }
    } else ok += 1;
  }
}
console.log(JSON.stringify({ tested: seq, ok, parseFails, renderFails, examples: results }, null, 2));
