#!/usr/bin/env node
/**
 * Static server for demo/ with correct ES module MIME types (python http.server serves .mjs as octet-stream).
 */
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { join, extname } from "node:path";
import { fileURLToPath } from "node:url";

const PORT = Number.parseInt(process.env.ATELIER_DEMO_PORT || "9891", 10);
const DEMO_ROOT = join(fileURLToPath(new URL("../", import.meta.url)));

const MIME = {
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

function contentType(path) {
  return MIME[extname(path).toLowerCase()] || "application/octet-stream";
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url || "/", `http://127.0.0.1:${PORT}`);
    let pathname = decodeURIComponent(url.pathname);
    if (pathname.endsWith("/")) pathname += "index.html";
    const filePath = join(DEMO_ROOT, pathname);
    if (!filePath.startsWith(DEMO_ROOT)) {
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

server.listen(PORT, "127.0.0.1", () => {
  console.log(`Atelier demo viewer: http://127.0.0.1:${PORT}/`);
});
