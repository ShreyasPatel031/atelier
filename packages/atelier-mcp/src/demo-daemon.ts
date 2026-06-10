#!/usr/bin/env node
/** Detached static demo UI server (demo/index.html, JS, CSS). */
process.env.ATELIER_DEMO_DAEMON = "1";

import { startDemoDaemonInProcess } from "./demo-server.js";

const port = await startDemoDaemonInProcess();
console.error(`[atelier-demo] http://127.0.0.1:${port}/`);
setInterval(() => {}, 60_000);
