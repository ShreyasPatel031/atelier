import { createServer, type IncomingMessage, type ServerResponse, type Server } from "node:http";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { homedir } from "node:os";

import { tryOpenInCursor } from "./open-browser.js";

const HOSTED_ORIGIN = "https://app.atelier-inc.net";
const CACHE_BASE = join(homedir(), ".cache", "codewiki-diagram-mcp");
const START_PORT = 9891;
const MAX_PORT_SCAN = 16;

let serverInstance: Server | null = null;
let serverPort: number | null = null;

function cacheDir(repoId: string): string {
  return join(CACHE_BASE, "repos", repoId);
}

async function downloadRepoFiles(repoId: string): Promise<string[]> {
  const dir = cacheDir(repoId);
  await mkdir(dir, { recursive: true });

  const indexUrl = `${HOSTED_ORIGIN}/repos/index.json`;
  const indexRes = await fetch(indexUrl);
  if (indexRes.ok) {
    const indexData = await indexRes.text();
    await mkdir(join(CACHE_BASE, "repos"), { recursive: true });
    await writeFile(join(CACHE_BASE, "repos", "index.json"), indexData);
  }

  const overviewUrl = `${HOSTED_ORIGIN}/repos/${repoId}/overview.json`;
  const overviewRes = await fetch(overviewUrl);
  if (!overviewRes.ok) {
    throw new Error(`Repo '${repoId}' not found at ${overviewUrl} (${overviewRes.status})`);
  }
  const overviewData = await overviewRes.text();
  await writeFile(join(dir, "overview.json"), overviewData);

  const downloaded: string[] = ["overview.json"];

  const filesToTry = ["module_tree.json", "metadata.json"];
  for (const file of filesToTry) {
    const url = `${HOSTED_ORIGIN}/repos/${repoId}/${file}`;
    const res = await fetch(url);
    if (res.ok) {
      await writeFile(join(dir, file), await res.text());
      downloaded.push(file);
    }
  }

  const treeUrl = `${HOSTED_ORIGIN}/repos/${repoId}/module_tree.json`;
  const treeRes = await fetch(treeUrl);
  if (treeRes.ok) {
    const tree = JSON.parse(await treeRes.text()) as Record<string, unknown>;
    for (const moduleId of Object.keys(tree)) {
      const moduleUrl = `${HOSTED_ORIGIN}/repos/${repoId}/${moduleId}.json`;
      const moduleRes = await fetch(moduleUrl);
      if (moduleRes.ok) {
        await writeFile(join(dir, `${moduleId}.json`), await moduleRes.text());
        downloaded.push(`${moduleId}.json`);
      }
    }
  }

  return downloaded;
}

function mimeForPath(path: string): string {
  if (path.endsWith(".json")) return "application/json";
  if (path.endsWith(".html")) return "text/html";
  if (path.endsWith(".js")) return "application/javascript";
  if (path.endsWith(".svg")) return "image/svg+xml";
  if (path.endsWith(".png")) return "image/png";
  return "application/octet-stream";
}

function startServer(port: number): Promise<Server> {
  return new Promise((resolve, reject) => {
    const srv = createServer(async (req: IncomingMessage, res: ServerResponse) => {
      const url = new URL(req.url || "/", `http://127.0.0.1:${port}`);
      const pathname = url.pathname;

      if (pathname.startsWith("/repos/")) {
        const relative = pathname.slice("/repos/".length);
        const filePath = join(CACHE_BASE, "repos", relative);
        try {
          const data = await readFile(filePath);
          res.writeHead(200, {
            "Content-Type": mimeForPath(filePath),
            "Access-Control-Allow-Origin": "*",
          });
          res.end(data);
          return;
        } catch {
          // fall through to proxy
        }
      }

      // Proxy everything else to hosted viewer
      try {
        const proxyUrl = `${HOSTED_ORIGIN}${pathname}${url.search}`;
        const proxyRes = await fetch(proxyUrl);
        const body = Buffer.from(await proxyRes.arrayBuffer());
        const headers: Record<string, string> = {
          "Access-Control-Allow-Origin": "*",
        };
        const ct = proxyRes.headers.get("content-type");
        if (ct) headers["Content-Type"] = ct;
        res.writeHead(proxyRes.status, headers);
        res.end(body);
      } catch {
        res.writeHead(502, { "Content-Type": "text/plain" });
        res.end("Bad Gateway — could not proxy to hosted viewer");
      }
    });

    srv.on("error", reject);
    srv.listen(port, "127.0.0.1", () => resolve(srv));
  });
}

async function findFreePort(): Promise<number> {
  for (let port = START_PORT; port < START_PORT + MAX_PORT_SCAN; port++) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/repos/index.json`, {
        signal: AbortSignal.timeout(500),
      });
      // Port in use — skip
      continue;
    } catch {
      // Port likely free — try binding
      return port;
    }
  }
  return START_PORT + MAX_PORT_SCAN;
}

export async function openViewer(repoId: string): Promise<{
  url: string;
  port: number;
  downloaded: string[];
  cached_at: string;
  browser?: { attempted: boolean; method?: string; ok: boolean; error?: string };
}> {
  const downloaded = await downloadRepoFiles(repoId);

  if (!serverInstance) {
    const port = await findFreePort();
    serverInstance = await startServer(port);
    serverPort = port;
  }

  const url = `http://127.0.0.1:${serverPort}/?repo=${repoId}`;
  const browser = await tryOpenInCursor(url);

  return {
    url,
    port: serverPort!,
    downloaded,
    cached_at: cacheDir(repoId),
    browser,
  };
}

export function getLocalPort(): number | null {
  return serverPort;
}

export function getLocalOrigin(): string | null {
  return serverPort ? `http://127.0.0.1:${serverPort}` : null;
}
