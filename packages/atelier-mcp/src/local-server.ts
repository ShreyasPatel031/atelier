import { createServer, type Server } from "node:http";
import { readdir, mkdir, readFile, writeFile, unlink } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

import { CACHE_BASE, getHostedOrigin, repoDir, getDemoRoot } from "./paths.js";
import { ensureRepoInCache } from "./repo-sources.js";
import { subscribeRepoEvents } from "./repo-events.js";
import { ensureEpochWatcher } from "./epoch-watcher.js";
import {
  isAtelierDemoPort,
  readDemoRuntime,
  clearDemoRuntime,
  startDemoDaemonInProcess,
} from "./demo-server.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const VIEWER_DAEMON = join(__dirname, "viewer-daemon.js");
const DEMO_DAEMON = join(__dirname, "demo-daemon.js");
const RUNTIME_FILE = join(CACHE_BASE, "viewer-runtime.json");

let serverInstance: Server | null = null;
let serverPort: number | null = null;
let bootPromise: Promise<number> | null = null;
let demoBootPromise: Promise<number> | null = null;
let stackBootPromise: Promise<{ demoPort: number; viewerPort: number; viewerAlreadyUp: boolean }> | null = null;
let demoServerPort: number | null = null;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isPidAlive(pid: number): boolean {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function mimeForPath(path: string): string {
  if (path.endsWith(".json")) return "application/json; charset=utf-8";
  if (path.endsWith(".html")) return "text/html; charset=utf-8";
  if (path.endsWith(".mjs") || path.endsWith(".js"))
    return "application/javascript; charset=utf-8";
  if (path.endsWith(".css")) return "text/css; charset=utf-8";
  if (path.endsWith(".svg")) return "image/svg+xml";
  if (path.endsWith(".png")) return "image/png";
  return "application/octet-stream";
}

async function writeRuntime(
  port: number,
  pid: number,
  extra?: Record<string, unknown>
): Promise<void> {
  await mkdir(CACHE_BASE, { recursive: true });
  await writeFile(
    RUNTIME_FILE,
    JSON.stringify({
      port,
      pid,
      demoPort: demoServerPort,
      startedAt: new Date().toISOString(),
      ...(extra || {}),
    }),
    "utf8"
  );
}

async function clearRuntime(): Promise<void> {
  try {
    await unlink(RUNTIME_FILE);
  } catch {
    /* ignore */
  }
}

async function readRuntime(): Promise<{
  port: number;
  pid: number;
  demoPort?: number;
  startedAt?: string;
  lastUrl?: string;
  lastOpenedAt?: string;
} | null> {
  try {
    const raw = await readFile(RUNTIME_FILE, "utf8");
    const data = JSON.parse(raw);
    if (typeof data.port !== "number" || typeof data.pid !== "number")
      return null;
    return data;
  } catch {
    return null;
  }
}

async function isAtelierViewerPort(port: number): Promise<boolean> {
  try {
    const health = await fetch(`http://127.0.0.1:${port}/__atelier/health`, {
      signal: AbortSignal.timeout(600),
    });
    if (!health.ok) return false;
    const body = (await health.json()) as { ok?: boolean; kind?: string };
    return body && body.ok === true && body.kind === "atelier-viewer";
  } catch {
    return false;
  }
}

async function findExistingDemoPort(): Promise<number | null> {
  const runtime = await readDemoRuntime();
  if (
    runtime &&
    isPidAlive(runtime.pid) &&
    (await isAtelierDemoPort(runtime.port))
  ) {
    return runtime.port;
  }
  if (runtime && !isPidAlive(runtime.pid)) {
    await clearDemoRuntime();
  }
  return null;
}

async function findExistingViewerPort(): Promise<number | null> {
  const runtime = await readRuntime();
  if (
    runtime &&
    isPidAlive(runtime.pid) &&
    (await isAtelierViewerPort(runtime.port))
  ) {
    return runtime.port;
  }
  if (runtime && !isPidAlive(runtime.pid)) {
    await clearRuntime();
  }
  return null;
}

function demoOriginForPort(port: number): string {
  return `http://127.0.0.1:${port}`;
}

async function getDefaultRepoId(): Promise<string> {
  const fromEnv = process.env.ATELIER_DEFAULT_REPO?.trim();
  if (fromEnv) return fromEnv;

  for (const indexPath of [
    join(CACHE_BASE, "repos", "index.json"),
    join(getDemoRoot(), "repos", "index.json"),
  ]) {
    try {
      const raw = await readFile(indexPath, "utf8");
      const list = JSON.parse(raw) as unknown[];
      if (Array.isArray(list)) {
        const first = list.find(
          (e): e is { id: string } =>
            e != null && typeof (e as { id?: unknown }).id === "string"
        );
        if (first?.id) return first.id;
      }
    } catch {
      /* try next */
    }
  }
  return "dspy";
}

export function viewerUrlFor(port: number, repoId: string): string {
  return `http://127.0.0.1:${port}/#${encodeURIComponent(repoId)}`;
}

async function applyDemoOrigin(port: number): Promise<void> {
  demoServerPort = port;
  process.env.ATELIER_DATA_ORIGIN = demoOriginForPort(port);
}

/** Boot detached demo UI server (first free localhost port). */
export async function bootDemoServer(): Promise<number> {
  if (process.env.ATELIER_DEMO_DAEMON === "1") {
    const port = await startDemoDaemonInProcess();
    await applyDemoOrigin(port);
    return port;
  }

  if (demoBootPromise) return demoBootPromise;

  demoBootPromise = (async () => {
    const existing = await findExistingDemoPort();
    if (existing != null) {
      await applyDemoOrigin(existing);
      return existing;
    }

    const child = spawn(process.execPath, [DEMO_DAEMON], {
      detached: true,
      stdio: "ignore",
      env: { ...process.env, ATELIER_DEMO_DAEMON: "1" },
    });
    child.unref();

    for (let i = 0; i < 80; i++) {
      await sleep(100);
      const port = await findExistingDemoPort();
      if (port != null) {
        await applyDemoOrigin(port);
        return port;
      }
    }
    throw new Error("Atelier demo daemon did not become ready within 8s");
  })();

  try {
    return await demoBootPromise;
  } catch (err) {
    demoBootPromise = null;
    throw err;
  }
}

function startViewerServer(): Promise<{ srv: Server; port: number }> {
  return new Promise((resolve, reject) => {
    const srv = createServer(async (req, res) => {
      const boundPort =
        (srv.address() as { port: number } | null)?.port ?? serverPort ?? 0;
      const url = new URL(req.url || "/", `http://127.0.0.1:${boundPort}`);
      const pathname = url.pathname;

      if (pathname === "/__atelier/health") {
        res.writeHead(200, {
          "Content-Type": "application/json; charset=utf-8",
          "Cache-Control": "no-store",
          "Access-Control-Allow-Origin": "*",
        });
        res.end(
          JSON.stringify({
            ok: true,
            kind: "atelier-viewer",
            port: boundPort,
            demoPort: demoServerPort,
          })
        );
        return;
      }

      const viewerEventsMatch = pathname.match(
        /^\/repos\/([^/]+)\/viewer-events$/
      );
      if (viewerEventsMatch && req.method === "GET") {
        const repoId = decodeURIComponent(viewerEventsMatch[1]!);
        ensureEpochWatcher(repoId);
        res.writeHead(200, {
          "Content-Type": "text/event-stream; charset=utf-8",
          "Cache-Control": "no-cache, no-transform",
          Connection: "keep-alive",
          "Access-Control-Allow-Origin": "*",
        });
        res.write(": connected\n\n");
        const unsubscribe = subscribeRepoEvents(repoId, res);
        req.on("close", unsubscribe);
        return;
      }

      if (pathname.startsWith("/repos/")) {
        const relative = pathname.slice("/repos/".length);
        const filePath = join(CACHE_BASE, "repos", relative);
        try {
          const data = await readFile(filePath);
          res.writeHead(200, {
            "Content-Type": mimeForPath(filePath),
            "Access-Control-Allow-Origin": "*",
            "Cache-Control": "no-store, max-age=0",
          });
          res.end(data);
          return;
        } catch {
          // fall through to proxy
        }
      }

      try {
        const proxyUrl = `${getHostedOrigin()}${pathname}${url.search}`;
        const proxyRes = await fetch(proxyUrl);
        const body = Buffer.from(await proxyRes.arrayBuffer());
        const headers: Record<string, string> = {
          "Access-Control-Allow-Origin": "*",
        };
        const forced = mimeForPath(pathname);
        const ct = proxyRes.headers.get("content-type");
        headers["Content-Type"] =
          forced !== "application/octet-stream" ? forced : ct || forced;
        res.writeHead(proxyRes.status, headers);
        res.end(body);
      } catch {
        res.writeHead(502, { "Content-Type": "text/plain" });
        res.end(
          "Bad Gateway — could not proxy demo UI (demo server may still be starting)"
        );
      }
    });

    srv.on("error", reject);
    srv.listen(0, "127.0.0.1", () => {
      const addr = srv.address();
      const port = typeof addr === "object" && addr ? addr.port : 0;
      resolve({ srv, port });
    });
  });
}

async function startViewerDaemonInProcess(): Promise<number> {
  if (serverInstance && serverPort != null) return serverPort;

  const existing = await findExistingViewerPort();
  if (existing != null) {
    serverPort = existing;
    return existing;
  }

  if (!process.env.ATELIER_DATA_ORIGIN) {
    await bootDemoServer();
  }

  const { srv, port } = await startViewerServer();
  serverInstance = srv;
  serverPort = port;
  await writeRuntime(port, process.pid);

  const shutdown = async () => {
    try {
      srv.close();
    } catch {
      /* ignore */
    }
    await clearRuntime();
  };

  process.on("SIGINT", () => {
    void shutdown().finally(() => process.exit(0));
  });
  process.on("SIGTERM", () => {
    void shutdown().finally(() => process.exit(0));
  });
  process.on("exit", () => {
    void clearRuntime();
  });

  try {
    const entries = await readdir(join(CACHE_BASE, "repos"), {
      withFileTypes: true,
    });
    for (const entry of entries) {
      if (entry.isDirectory()) ensureEpochWatcher(entry.name);
    }
  } catch {
    /* no repos dir yet */
  }

  return port;
}

/** Spawn detached viewer if needed; demo must be up first. */
export async function bootViewer(): Promise<number> {
  if (bootPromise) return bootPromise;

  bootPromise = (async () => {
    const demoPort = await bootDemoServer();
    const demoOrigin = demoOriginForPort(demoPort);

    const existing = await findExistingViewerPort();
    if (existing != null) {
      serverPort = existing;
      return existing;
    }

    const child = spawn(process.execPath, [VIEWER_DAEMON], {
      detached: true,
      stdio: "ignore",
      env: {
        ...process.env,
        ATELIER_VIEWER_DAEMON: "1",
        ATELIER_DATA_ORIGIN: demoOrigin,
      },
    });
    child.unref();

    for (let i = 0; i < 80; i++) {
      await sleep(100);
      const port = await findExistingViewerPort();
      if (port != null) {
        serverPort = port;
        return port;
      }
    }
    throw new Error("Atelier viewer daemon did not become ready within 8s");
  })();

  try {
    return await bootPromise;
  } catch (err) {
    bootPromise = null;
    throw err;
  }
}

/** Boot demo UI + viewer proxy. Zero manual steps — called on every MCP connect. */
export async function bootAtelierStack(): Promise<{
  demoPort: number;
  viewerPort: number;
  viewerAlreadyUp: boolean;
}> {
  if (stackBootPromise) return stackBootPromise;

  stackBootPromise = (async () => {
    const viewerAlreadyUp = (await findExistingViewerPort()) != null;
    const demoPort = await bootDemoServer();
    const viewerPort = await bootViewer();
    return { demoPort, viewerPort, viewerAlreadyUp };
  })();

  try {
    return await stackBootPromise;
  } catch (err) {
    stackBootPromise = null;
    throw err;
  }
}

/** Ensure full stack is reachable. */
export async function ensureLocalServer(): Promise<number> {
  if (process.env.ATELIER_VIEWER_DAEMON === "1") {
    return startViewerDaemonInProcess();
  }
  const { viewerPort } = await bootAtelierStack();
  return viewerPort;
}

export async function openViewer(
  repoId: string,
  options: { refresh?: boolean } = {}
): Promise<{
  url: string;
  port: number;
  downloaded: string[];
  source: string;
  cached_at: string;
}> {
  const { downloaded, source } = await ensureRepoInCache(repoId, options);
  const port = await ensureLocalServer();
  ensureEpochWatcher(repoId);
  const url = viewerUrlFor(port, repoId);
  return {
    url,
    port,
    downloaded,
    source,
    cached_at: repoDir(repoId),
  };
}

export function getLocalPort(): number | null {
  return serverPort;
}

export function getLocalOrigin(): string | null {
  return serverPort ? `http://127.0.0.1:${serverPort}` : null;
}

export async function getViewerOrigin(): Promise<string | null> {
  if (serverPort != null) return `http://127.0.0.1:${serverPort}`;
  const port = await findExistingViewerPort();
  if (port != null) {
    serverPort = port;
    return `http://127.0.0.1:${port}`;
  }
  return null;
}

export async function getDemoServerPort(): Promise<number | null> {
  if (demoServerPort != null) return demoServerPort;
  const port = await findExistingDemoPort();
  if (port != null) demoServerPort = port;
  return port;
}
