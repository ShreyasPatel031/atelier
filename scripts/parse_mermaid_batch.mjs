#!/usr/bin/env node
/**
 * Long-running Mermaid.js parse + render driver for Python Stage 4.6.
 *
 * Protocol (NDJSON, one JSON object per line, UTF-8):
 *   stdin:  {"id": "file.md#1", "diagram": "flowchart TD\\n  A-->B"}
 *   stdout: {"id": "file.md#1", "ok": true}
 *        or {"id": "file.md#1", "ok": false, "error": "Parse error on line ..."}
 *        or {"id": "file.md#1", "ok": false, "stage": "render", "error": "..."}
 *
 * Why parse+render: the viewer (demo/index.html) calls `mermaid.render(id, code)`,
 * not `mermaid.parse(code)`. Render goes much further than parse — it instantiates
 * node shapes, runs layout, and emits SVG. A diagram can pass parse and still throw
 * during render (classic case: "Cannot read properties of undefined (reading 'shape')"
 * for unknown node-shape syntax or undefined classDef). To match what the viewer sees
 * we drive both phases here.
 *
 * Happy-dom caveats: render relies on getBBox/getComputedTextLength which happy-dom
 * stubs imperfectly. Some diagrams therefore fail render in this harness with errors
 * that are real-browser non-issues (e.g. "Could not find a suitable point for the
 * given distance" — a d3 edge-routing edge case caused by zero-width text bboxes).
 * We classify these as RENDER_BENIGN_PATTERNS and treat them as ok so Stage 4.6
 * doesn't burn LLM calls "fixing" diagrams that already render in the browser.
 */
import readline from "node:readline";
import { Window } from "happy-dom";

function installBrowserPolyfills() {
  const window = new Window({ url: "https://localhost/" });
  globalThis.window = window;
  globalThis.document = window.document;
  globalThis.navigator = window.navigator;
}

// Errors that ONLY happen in headless happy-dom render and are non-issues in the
// real browser. Match against the first line of error.message.
const RENDER_BENIGN_PATTERNS = [
  /Could not find a suitable point for the given distance/i,
  /getBBox is not a function/i,
  /getComputedTextLength is not a function/i,
  /getScreenCTM is not a function/i,
];

function isBenignRenderError(msg) {
  if (!msg) return false;
  const head = String(msg).split("\n", 1)[0];
  return RENDER_BENIGN_PATTERNS.some((re) => re.test(head));
}

async function main() {
  installBrowserPolyfills();
  const { default: mermaid } = await import("mermaid");
  mermaid.initialize({
    startOnLoad: false,
    securityLevel: "loose",
    theme: "default",
  });

  let renderSeq = 0;

  async function checkOne(diagram) {
    try {
      await mermaid.parse(diagram);
    } catch (e) {
      return { ok: false, stage: "parse", error: e?.message || String(e) };
    }
    try {
      renderSeq += 1;
      const id = `m_${process.pid}_${renderSeq}`;
      await mermaid.render(id, diagram);
      return { ok: true };
    } catch (e) {
      const msg = e?.message || String(e);
      if (isBenignRenderError(msg)) {
        return { ok: true, note: "happy-dom-render-benign", stage_skipped: "render" };
      }
      return { ok: false, stage: "render", error: msg };
    }
  }

  const rl = readline.createInterface({
    input: process.stdin,
    crlfDelay: Infinity,
  });

  for await (const line of rl) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    let req;
    try {
      req = JSON.parse(trimmed);
    } catch {
      process.stdout.write(
        JSON.stringify({
          id: null,
          ok: false,
          error: "invalid JSON line",
        }) + "\n"
      );
      continue;
    }
    const id = req.id ?? null;
    const diagram = typeof req.diagram === "string" ? req.diagram : "";
    if (!diagram.trim()) {
      process.stdout.write(
        JSON.stringify({
          id,
          ok: false,
          error: "empty diagram",
        }) + "\n"
      );
      continue;
    }
    const result = await checkOne(diagram);
    process.stdout.write(JSON.stringify({ id, ...result }) + "\n");
  }
  process.exit(0);
}

main().catch((e) => {
  process.stderr.write(String(e) + "\n");
  process.exit(1);
});
