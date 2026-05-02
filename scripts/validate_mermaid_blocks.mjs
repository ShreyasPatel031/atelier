#!/usr/bin/env node
/**
 * Validate ```mermaid blocks in *.md using Mermaid.js 11.9.0 (aligned with demo/index.html CDN).
 *
 * Speedups (same process — mermaid.initialize still runs once):
 * - Content-hash cache — skip mermaid.parse when diagram text unchanged since last run (--cache-file).
 *   (Heuristic checks are not used to skip parse; failures are always from mermaid.parse.)
 *
 * Usage:
 *   node scripts/validate_mermaid_blocks.mjs [options] <slug> [<slug> ...]
 *
 * Options:
 *   --base <dir>       Parent of repo folders (default: <repo-root>/demo/repos)
 *   -o <file>          Write JSON report (default: <repo-root>/tmp/mermaid_js_validation_report.json)
 *   --cache-file <f>   Parse result cache (default: <repo-root>/tmp/mermaid_parse_cache.json); use --no-cache to disable
 *   --no-cache         Do not read or write the parse cache
 *
 * Example:
 *   node scripts/validate_mermaid_blocks.mjs crewai pydantic-ai dspy ollama langchain transformers
 */

import fs from "fs";
import path from "path";
import crypto from "crypto";
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

const MERMAID_VERSION = "11.9.0";
const BLOCK_RE = /```mermaid\s*([\s\S]*?)```/gi;

function parseArgs(argv) {
  const slugs = [];
  let base = path.join(REPO_ROOT, "demo", "repos");
  let out = path.join(REPO_ROOT, "tmp", "mermaid_js_validation_report.json");
  let cacheFile = path.join(REPO_ROOT, "tmp", "mermaid_parse_cache.json");
  let useCache = true;
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
    if (a === "--cache-file" && argv[i + 1]) {
      cacheFile = path.resolve(argv[++i]);
      continue;
    }
    if (a === "--no-cache") {
      useCache = false;
      continue;
    }
    if (a.startsWith("-")) {
      console.error("Unknown option:", a);
      process.exit(1);
    }
    slugs.push(a);
  }
  return { base, out, slugs, cacheFile, useCache };
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

function sha256Hex(s) {
  return crypto.createHash("sha256").update(s, "utf8").digest("hex");
}

function loadCache(cachePath, mermaidVersion) {
  try {
    if (!fs.existsSync(cachePath)) return { entries: {} };
    const raw = JSON.parse(fs.readFileSync(cachePath, "utf8"));
    if (raw.mermaid_version !== mermaidVersion) return { entries: {} };
    return { entries: raw.entries && typeof raw.entries === "object" ? raw.entries : {} };
  } catch {
    return { entries: {} };
  }

}

function saveCache(cachePath, mermaidVersion, entries) {
  const payload = {
    mermaid_version: mermaidVersion,
    updated_at: new Date().toISOString(),
    entries,
  };
  fs.mkdirSync(path.dirname(cachePath), { recursive: true });
  fs.writeFileSync(cachePath, JSON.stringify(payload, null, 2), "utf8");
}

async function main() {
  const t0 = Date.now();
  installBrowserPolyfills();
  const { default: mermaid } = await import("mermaid");

  const { base, out, slugs, cacheFile, useCache } = parseArgs(process.argv);
  if (slugs.length === 0) {
    console.error(
      "Usage: node scripts/validate_mermaid_blocks.mjs [--base DIR] [-o OUT.json] [--cache-file PATH] [--no-cache] <slug> ..."
    );
    process.exit(1);
  }

  let cacheEntries = useCache ? loadCache(cacheFile, MERMAID_VERSION).entries : {};
  const stats = {
    parse_calls: 0,
    cache_hits: 0,
    mermaid_parse_failures: 0,
  };

  mermaid.initialize({
    startOnLoad: false,
    securityLevel: "loose",
    theme: "default",
  });

  async function validateDiagram(diagram) {
    const hash = sha256Hex(diagram);
    if (useCache && cacheEntries[hash] != null) {
      const c = cacheEntries[hash];
      stats.cache_hits += 1;
      if (c.ok) return { ok: true, error: null, via: "cache" };
      return { ok: false, error: c.error || "cached failure", via: "cache" };
    }

    stats.parse_calls += 1;
    try {
      await mermaid.parse(diagram);
      if (useCache) {
        cacheEntries[hash] = { ok: true };
      }
      return { ok: true, error: null, via: "parse" };
    } catch (e) {
      stats.mermaid_parse_failures += 1;
      const msg = e?.message || String(e);
      if (useCache) {
        cacheEntries[hash] = { ok: false, error: msg };
      }
      return { ok: false, error: msg, via: "parse" };
    }
  }

  const report = {
    mermaid_version: MERMAID_VERSION,
    viewer_alignment: "Same major.minor as demo/index.html (cdn.jsdelivr mermaid@11.9.0)",
    base,
    generated_at: new Date().toISOString(),
    speedup: {
      cache_file: useCache ? cacheFile : null,
      cache_enabled: useCache,
      wall_time_ms: 0,
      stats: {},
    },
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

        const { ok, error, via } = await validateDiagram(diagram);
        if (ok) {
          report.summary.ok_blocks += 1;
          repoRow.blocks_ok += 1;
        } else {
          report.summary.fail_blocks += 1;
          repoRow.blocks_fail += 1;
          const key = (error || "").split("\n")[0].slice(0, 200);
          report.summary.error_histogram[key] = (report.summary.error_histogram[key] || 0) + 1;

          const snippet = diagram.length > 400 ? diagram.slice(0, 400) + "..." : diagram;
          repoRow.results.push({
            file: rel,
            block_index: bi,
            ok: false,
            validated_via: via || "unknown",
            error_message: error,
            diagram_snippet: snippet,
          });
        }
      }
    }

    report.repos.push(repoRow);
  }

  report.speedup.wall_time_ms = Date.now() - t0;
  report.speedup.stats = { ...stats };

  if (useCache) {
    saveCache(cacheFile, MERMAID_VERSION, cacheEntries);
  }

  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, JSON.stringify(report, null, 2), "utf8");
  console.log(JSON.stringify({ written: out, cache: useCache ? cacheFile : null, ...report.summary, speedup: report.speedup }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
