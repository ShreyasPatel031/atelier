#!/usr/bin/env node
/**
 * Boot full Atelier stack (demo UI + MCP viewer). Normally automatic via Cursor MCP.
 * Port numbers: ~/.cache/atelier-mcp/demo-runtime.json and viewer-runtime.json
 */
import { bootAtelierStack, getViewerOrigin } from "../../packages/atelier-mcp/dist/local-server.js";

const { demoPort, viewerPort } = await bootAtelierStack();
const origin = (await getViewerOrigin()) || `http://127.0.0.1:${viewerPort}`;
console.log(`Demo UI:  http://127.0.0.1:${demoPort}/`);
console.log(`Viewer:   ${origin}/`);
console.log(`Example:  ${origin}/?repo=dspy`);
