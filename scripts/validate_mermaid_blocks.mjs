#!/usr/bin/env node
/**
 * Validate ```mermaid blocks in *.md using Mermaid.js 11.9.0 (aligned with demo/index.html CDN).
 *
 * Usage:
 *   node scripts/validate_mermaid_blocks.mjs [options] <slug> [<slug> ...]
 *
 * Options:
 *   --base <dir>   Parent of repo folders (default: <repo-root>/demo/repos)
 *   -o <file>      Write JSON report to this path (default: <repo-root>/tmp/mermaid_js_validation_report.json)
 *
 * Example:
 *   node scripts/validate_mermaid_blocks.mjs pydantic-ai-regen-promptfix pydantic-ai-diag swift
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { Window } from "happy-dom";

/**
 * Install globals before any `import("mermaid")`.
 *
 * Do NOT add a static `import "dompurify"` in this file: imports are hoisted, so
 * DOMPurify would initialize before `window` exists and Node would cache a factory
 * without `.sanitize`, causing `DOMPurify.sanitize is not a function` for all diagrams.
 */
function installBrowserPolyfills() {
  const window = new Window({ url: "https://localhost/" });
  globalThis.window = window;
  globalThis.document = window.document;
  globalThis.navigator = window.navigator;
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");

const BLOCK_RE = /```mermaid\s*([\s\S]*?)```/gi;

function parseArgs(argv) {
  const slugs = [];
  let base = path.join(REPO_ROOT, "demo", "repos");
  let out = path.join(REPO_ROOT, "tmp", "mermaid_js_validation_report.json");
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--base" && argv[i + 1]) {
      base = path.resolve(argv[++i]);
      continue;
    }
    if (a === "-o" && argv[i + 1]) {
      out = path.resolve(argv[++i]);
      continue;
    }
    if (a.startsWith("-")) {
      console.error("Unknown option:", a);
      process.exit(1);
    }
    slugs.push(a);
  }
  return { base, out, slugs };
}

function extractBlocks(md) {
  const blocks = [];
  let m;
  const re = new RegExp(BLOCK_RE.source, BLOCK_RE.flags);
  while ((m = re.exec(md)) !== null) {
    blocks.push(m[1].trim());
  }
  return blocks;
}

async function main() {
  installBrowserPolyfills();
  const { default: mermaid } = await import("mermaid");

  async function validateDiagram(code) {
    try {
      await mermaid.parse(code);
      return { ok: true, error: null };
    } catch (e) {
      const msg = e?.message || String(e);
      return { ok: false, error: msg };
    }
  }

  const { base, out, slugs } = parseArgs(process.argv);
  if (slugs.length === 0) {
    console.error("Usage: node scripts/validate_mermaid_blocks.mjs [--base DIR] [-o OUT.json] <slug> ...");
    process.exit(1);
  }

  mermaid.initialize({
    startOnLoad: false,
    securityLevel: "loose",
    theme: "default",
  });

  const report = {
    mermaid_version: "11.9.0",
    viewer_alignment: "Same major.minor as demo/index.html (cdn.jsdelivr mermaid@11.9.0)",
    base,
    generated_at: new Date().toISOString(),
    repos: [],
    summary: {
      total_files: 0,
      total_blocks: 0,
      ok_blocks: 0,
      fail_blocks: 0,
      error_histogram: {},
    },
  };

  for (const slug of slugs) {
    const dir = path.join(base, slug);
    const repoRow = {
      slug,
      docs_dir: dir,
      exists: fs.existsSync(dir),
      files_scanned: 0,
      blocks_total: 0,
      blocks_ok: 0,
      blocks_fail: 0,
      results: [],
    };

    if (!repoRow.exists) {
      repoRow.error = "directory not found";
      report.repos.push(repoRow);
      continue;
    }

    const mdFiles = fs
      .readdirSync(dir)
      .filter((f) => f.endsWith(".md"))
      .map((f) => path.join(dir, f));

    for (const filePath of mdFiles) {
      const rel = path.relative(REPO_ROOT, filePath);
      let content;
      try {
        content = fs.readFileSync(filePath, "utf8");
      } catch {
        continue;
      }
      const blocks = extractBlocks(content);
      if (blocks.length === 0) continue;

      repoRow.files_scanned += 1;
      report.summary.total_files += 1;

      let bi = 0;
      for (const diagram of blocks) {
        bi += 1;
        report.summary.total_blocks += 1;
        repoRow.blocks_total += 1;

        const { ok, error } = await validateDiagram(diagram);
        if (ok) {
          report.summary.ok_blocks += 1;
          repoRow.blocks_ok += 1;
        } else {
          report.summary.fail_blocks += 1;
          repoRow.blocks_fail += 1;
          const key = error.split("\n")[0].slice(0, 200);
          report.summary.error_histogram[key] = (report.summary.error_histogram[key] || 0) + 1;

          const snippet = diagram.length > 400 ? diagram.slice(0, 400) + "..." : diagram;
          repoRow.results.push({
            file: rel,
            block_index: bi,
            ok: false,
            error_message: error,
            diagram_snippet: snippet,
          });
        }
      }
    }

    report.repos.push(repoRow);
  }

  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, JSON.stringify(report, null, 2), "utf8");
  console.log(JSON.stringify({ written: out, ...report.summary }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
