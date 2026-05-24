import { createServer, type IncomingMessage, type ServerResponse, type Server } from "node:http";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { tryOpenInCursor } from "./open-browser.js";
import { CACHE_BASE, getHostedOrigin, repoDir } from "./paths.js";
import { ensureRepoInCache } from "./repo-sources.js";

const START_PORT = 9891;
const MAX_PORT_SCAN = 16;

let serverInstance: Server | null = null;
let serverPort: number | null = null;

function mimeForPath(path: string): string {
  if (path.endsWith(".json")) return "application/json";
  if (path.endsWith(".html")) return "text/html";
  if (path.endsWith(".js")) return "application/javascript";
  if (path.endsWith(".svg")) return "image/svg+xml";
  if (path.endsWith(".png")) return "image/png";
  return "application/octet-stream";
}

function startServer(port: number): Promise<Server> {
  const hostedOrigin = getHostedOrigin();
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

      try {
        const proxyUrl = `${hostedOrigin}${pathname}${url.search}`;
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
      await fetch(`http://127.0.0.1:${port}/repos/index.json`, {
        signal: AbortSignal.timeout(500),
      });
      continue;
    } catch {
      return port;
    }
  }
  return START_PORT + MAX_PORT_SCAN;
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
  browser?: { attempted: boolean; method?: string; ok: boolean; error?: string };
}> {
  const { downloaded, source } = await ensureRepoInCache(repoId, options);

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
    source,
    cached_at: repoDir(repoId),
    browser,
  };
}

export function getLocalPort(): number | null {
  return serverPort;
}

export function getLocalOrigin(): string | null {
  return serverPort ? `http://127.0.0.1:${serverPort}` : null;
}
