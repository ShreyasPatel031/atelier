#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

import { listRepos, listReposSchema } from "./tools/list-repos.js";
import { getDiagram, getDiagramSchema } from "./tools/get-diagram.js";
import { openViewer } from "./local-server.js";
import { VIEWER_UI_HTML, VIEWER_UI_URI } from "./ui/viewer.html.js";

const server = new McpServer({
  name: "codewiki-diagram",
  version: "0.3.0",
});

server.registerResource(
  "viewer-ui",
  VIEWER_UI_URI,
  {
    description: "Embedded architecture diagram viewer (MCP Apps UI)",
    mimeType: "text/html",
  },
  async () => ({
    contents: [
      {
        uri: VIEWER_UI_URI,
        mimeType: "text/html",
        text: VIEWER_UI_HTML,
      },
    ],
  })
);

server.tool(
  "list_repos",
  "List all available architecture diagram repositories. Returns id, label, description, and viewer URL for each.",
  listReposSchema.shape,
  async () => listRepos()
);

server.tool(
  "get_diagram",
  [
    "Read architecture diagram data for a repository.",
    "Modes:",
    "  target='overview' (default) — full top-level diagram IR with title, description, nodes, edges, groups.",
    "  target='__inventory__' — compact summary of all modules with their counts.",
    "  target='{module_id}' — full diagram + description for one module (drill-down).",
  ].join("\n"),
  getDiagramSchema.shape,
  async (args) => getDiagram(args)
);

server.registerTool(
  "open_viewer",
  {
    description: [
      "Download repo diagram data, start a local viewer server, and open the diagram.",
      "Returns a viewer URL and attempts to open it in Cursor automatically.",
      "Also renders an embedded diagram panel when the host supports MCP Apps UI.",
    ].join("\n"),
    inputSchema: {
      repo_id: z.string().describe("Repository id (e.g. 'crewai', 'persona-selection-model')"),
    },
    _meta: {
      ui: { resourceUri: VIEWER_UI_URI },
      "ui/resourceUri": VIEWER_UI_URI,
    },
  },
  async ({ repo_id }) => {
    const result = await openViewer(repo_id);
    const payload = {
      ok: true,
      ...result,
      hint: result.browser?.ok
        ? "Viewer opened in Cursor."
        : "Viewer is running locally. If it did not open automatically, use the URL below in Simple Browser.",
    };

    const html = `<!DOCTYPE html><html><body style="margin:0"><iframe src="${result.url}" style="width:100%;height:80vh;border:0"></iframe></body></html>`;

    return {
      content: [
        { type: "text" as const, text: JSON.stringify(payload, null, 2) },
        {
          type: "resource" as const,
          resource: {
            uri: `${VIEWER_UI_URI}?repo=${encodeURIComponent(repo_id)}`,
            mimeType: "text/html",
            text: html,
          },
        },
      ],
    };
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
