import { createServer, type Server } from "node:http";
import { readFile, stat, mkdir, writeFile, unlink } from "node:fs/promises";
import { join, extname } from "node:path";

import { CACHE_BASE, getDemoRoot } from "./paths.js";

export const DEMO_RUNTIME_FILE = join(CACHE_BASE, "demo-runtime.json");

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
};

function contentType(path: string): string {
  return MIME[extname(path).toLowerCase()] || "application/octet-stream";
}

export async function writeDemoRuntime(port: number, pid: number): Promise<void> {
  await mkdir(CACHE_BASE, { recursive: true });
  await writeFile(
    DEMO_RUNTIME_FILE,
    JSON.stringify({
      port,
      pid,
      demoRoot: getDemoRoot(),
      startedAt: new Date().toISOString(),
    }),
    "utf8"
  );
}

export async function clearDemoRuntime(): Promise<void> {
  try {
    await unlink(DEMO_RUNTIME_FILE);
  } catch {
    /* ignore */
  }
}

export async function readDemoRuntime(): Promise<{
  port: number;
  pid: number;
  demoRoot: string;
  startedAt: string;
} | null> {
  try {
    const raw = await readFile(DEMO_RUNTIME_FILE, "utf8");
    const data = JSON.parse(raw);
    if (typeof data.port !== "number" || typeof data.pid !== "number")
      return null;
    return data;
  } catch {
    return null;
  }
}

export async function isAtelierDemoPort(port: number): Promise<boolean> {
  try {
    const res = await fetch(`http://127.0.0.1:${port}/__atelier/demo-health`, {
      signal: AbortSignal.timeout(600),
    });
    if (!res.ok) return false;
    const body = (await res.json()) as { ok?: boolean; kind?: string };
    return body && body.ok === true && body.kind === "atelier-demo";
  } catch {
    return false;
  }
}

function startDemoHttpServer(
  demoRoot: string
): Promise<{ srv: Server; port: number }> {
  const root = demoRoot.replace(/\/+$/, "");
  return new Promise((resolve, reject) => {
    const srv = createServer(async (req, res) => {
      const boundPort = (srv.address() as { port: number } | null)?.port ?? 0;
      try {
        const url = new URL(req.url || "/", `http://127.0.0.1:${boundPort}`);
        let pathname = decodeURIComponent(url.pathname);

        if (pathname === "/__atelier/demo-health") {
          res.writeHead(200, {
            "Content-Type": "application/json; charset=utf-8",
            "Cache-Control": "no-store",
            "Access-Control-Allow-Origin": "*",
          });
          res.end(
            JSON.stringify({
              ok: true,
              kind: "atelier-demo",
              port: boundPort,
              demoRoot: root,
            })
          );
          return;
        }

        if (pathname.endsWith("/")) pathname += "index.html";
        const filePath = join(root, pathname);
        if (!filePath.startsWith(root)) {
          res.writeHead(403);
          res.end("Forbidden");
          return;
        }

        const info = await stat(filePath);
        if (!info.isFile()) {
          res.writeHead(404);
          res.end("Not Found");
          return;
        }

        const data = await readFile(filePath);
        res.writeHead(200, {
          "Content-Type": contentType(filePath),
          "Cache-Control": "no-store, max-age=0",
          "Access-Control-Allow-Origin": "*",
        });
        res.end(data);
      } catch {
        res.writeHead(404);
        res.end("Not Found");
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

let demoServerInstance: Server | null = null;
let demoServerPort: number | null = null;

/** In-process demo daemon (ATELIER_DEMO_DAEMON=1). */
export async function startDemoDaemonInProcess(): Promise<number> {
  if (demoServerInstance && demoServerPort != null) return demoServerPort;

  const { srv, port } = await startDemoHttpServer(getDemoRoot());
  demoServerInstance = srv;
  demoServerPort = port;
  await writeDemoRuntime(port, process.pid);

  const shutdown = async () => {
    try {
      srv.close();
    } catch {
      /* ignore */
    }
    await clearDemoRuntime();
  };

  process.on("SIGINT", () => {
    void shutdown().finally(() => process.exit(0));
  });
  process.on("SIGTERM", () => {
    void shutdown().finally(() => process.exit(0));
  });
  process.on("exit", () => {
    void clearDemoRuntime();
  });

  return port;
}
