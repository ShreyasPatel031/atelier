#!/usr/bin/env node
/**
 * Detached Atelier viewer HTTP server (repo cache + SSE + UI proxy).
 * Spawned by MCP on boot; also runnable via `npm run demo:mcp-viewer`.
 */
process.env.ATELIER_VIEWER_DAEMON = "1";

import { ensureLocalServer, getLocalOrigin } from "./local-server.js";

const port = await ensureLocalServer();
const origin = getLocalOrigin() || `http://127.0.0.1:${port}`;
console.error(`[atelier-viewer] ${origin}/`);

process.on("SIGINT", () => process.exit(0));
process.on("SIGTERM", () => process.exit(0));
setInterval(() => {}, 60_000);
