#!/usr/bin/env node
/**
 * Cursor sessionStart hook — return the viewer URL INSTANTLY from the
 * cached runtime file, then kick off daemon boot in the background.
 *
 * Priority: speed. The user should see the viewer tab within the first
 * agent turn, not after a multi-second daemon boot.
 */
import { join } from "node:path";
import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { spawn } from "node:child_process";
import { pathToFileURL } from "node:url";

const CACHE = join(homedir(), ".cache", "atelier-mcp");
const VIEWER_RT = join(CACHE, "viewer-runtime.json");
const repoRoot = join(import.meta.dirname, "../..");

// Drain stdin (sessionStart sends a JSON payload).
await new Promise((resolve) => {
  let d = "";
  process.stdin.setEncoding("utf8");
  process.stdin.on("data", (c) => (d += c));
  process.stdin.on("end", () => resolve(d));
  process.stdin.resume();
});

// ── 1. Try to get a URL instantly from cached runtime ──────────────
let viewerUrl = null;
let needsBoot = true;

try {
  const rt = JSON.parse(await readFile(VIEWER_RT, "utf8"));
  if (rt.port && rt.pid) {
    // Check if the daemon process is still alive (signal 0 = existence check)
    try { process.kill(rt.pid, 0); } catch { throw new Error("pid dead"); }

    let repoId = "dspy";
    if (rt.lastUrl) {
      try {
        const r = new URL(rt.lastUrl).searchParams.get("repo");
        if (r) repoId = r;
      } catch { /* use default */ }
    }
    viewerUrl = `http://127.0.0.1:${rt.port}/?repo=${encodeURIComponent(repoId)}`;
    needsBoot = false;
  }
} catch {
  // No runtime file or dead PID — need a full boot.
}

// ── 2. If no cached URL, do a fast boot (blocking but only once) ───
if (!viewerUrl) {
  try {
    if (!process.env.ATELIER_LOCAL_REPO_ROOT) {
      process.env.ATELIER_LOCAL_REPO_ROOT = join(repoRoot, "demo/repos");
    }
    const mod = pathToFileURL(
      join(repoRoot, "packages/atelier-mcp/dist/local-server.js")
    ).href;
    const { bootAtelierStack, viewerUrlFor } = await import(mod);
    const stack = await bootAtelierStack();
    viewerUrl = viewerUrlFor(stack.viewerPort, "dspy");
    needsBoot = false;
  } catch (err) {
    process.stderr.write(
      `[atelier-hook] boot failed: ${err instanceof Error ? err.message : String(err)}\n`
    );
  }
}

// ── 3. Fire-and-forget background refresh if daemons need a health check
if (needsBoot) {
  try {
    const bootScript = join(repoRoot, "packages/atelier-mcp/dist/local-server.js");
    const child = spawn(process.execPath, [
      "-e",
      `process.env.ATELIER_LOCAL_REPO_ROOT=${JSON.stringify(join(repoRoot,"demo/repos"))};` +
      `import(${JSON.stringify(pathToFileURL(bootScript).href)}).then(m=>m.bootAtelierStack()).catch(()=>{})`,
    ], { detached: true, stdio: "ignore" });
    child.unref();
  } catch { /* best effort */ }
}

// ── 4. Return result — agent should browser_navigate IMMEDIATELY ───
const result = {};
if (viewerUrl) {
  result.additional_context =
    `[atelier-viewer] Open the viewer NOW — this is the first thing to do:\n` +
    `browser_navigate(url="${viewerUrl}", position="active", newTab=true)\n` +
    `Do NOT call open_viewer first. Do NOT check config first. Just navigate.`;
}

process.stdout.write(JSON.stringify(result));
process.exit(0);
