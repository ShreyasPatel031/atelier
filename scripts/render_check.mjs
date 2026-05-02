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

const dir = process.argv[2];
const files = fs.readdirSync(dir).filter(f => f.endsWith(".md"));
const RE = /```mermaid\s*([\s\S]*?)```/gi;
let total = 0, parseFail = 0, renderFail = 0;
const renderFails = [];
for (const f of files) {
  const content = fs.readFileSync(path.join(dir, f), "utf8");
  let m, bi = 0;
  const re = new RegExp(RE.source, RE.flags);
  while ((m = re.exec(content)) !== null) {
    bi++; total++;
    const diag = m[1].trim();
    try { await mermaid.parse(diag); }
    catch (e) { parseFail++; continue; }
    try {
      const id = `m_${Date.now()}_${total}`;
      await mermaid.render(id, diag);
    } catch (e) {
      renderFail++;
      const msg = (e?.message || String(e)).split("\n")[0].slice(0, 200);
      renderFails.push({ file: f, block: bi, error: msg, diagram_head: diag.slice(0, 240) });
    }
  }
}
console.log(JSON.stringify({ total, parseFail, renderFail, sampleRenderFails: renderFails.slice(0, 10) }, null, 2));
