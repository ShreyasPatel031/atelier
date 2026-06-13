#!/usr/bin/env node
/**
 * Local demo viewer with integrated architectural-agent chat on the same origin.
 *
 * Uses Python static_server (codewiki.mcp.chat_sidecar) so /api/arch-agent/chat works
 * at http://127.0.0.1:9891 — matching the MCP open_viewer stack from the generation branch.
 * The previous Node-only static server returned HTTP 404 for chat routes.
 */
import { spawn } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const PORT = Number.parseInt(process.env.ATELIER_DEMO_PORT || "9891", 10);
const DEMO_ROOT = join(fileURLToPath(new URL("../", import.meta.url)));
const REPO_ROOT = join(DEMO_ROOT, "..");
const PYTHON = process.env.PYTHON || "python3";

const child = spawn(PYTHON, ["-m", "codewiki.mcp.chat_sidecar"], {
  cwd: REPO_ROOT,
  env: {
    ...process.env,
    ATELIER_CHAT_PORT: String(PORT),
    ATELIER_DEMO_ROOT: DEMO_ROOT,
  },
  stdio: ["ignore", "pipe", "inherit"],
});

child.stdout.on("data", (chunk) => {
  const text = chunk.toString();
  process.stdout.write(text);
  if (text.includes("[atelier-chat] ready")) {
    console.log(`Atelier demo viewer: http://127.0.0.1:${PORT}/  (chat API on same origin)`);
  }
});

function shutdown() {
  child.kill("SIGTERM");
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
child.on("exit", (code, signal) => {
  if (signal === "SIGTERM" || signal === "SIGINT") {
    process.exit(0);
  }
  process.exit(code ?? 1);
});
