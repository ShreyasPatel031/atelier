#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

import { listRepos, listReposSchema } from "./tools/list-repos.js";
import { getDiagram, getDiagramSchema } from "./tools/get-diagram.js";
import { patchDiagram, patchDiagramSchema } from "./tools/patch-diagram.js";
import { writeModuleDocTool, writeModuleDocSchema } from "./tools/write-module-doc.js";
import { openViewer, bootAtelierStack, getViewerOrigin } from "./local-server.js";

const server = new McpServer({
  name: "atelier",
  version: "0.7.2",
});

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
      "Open the interactive architecture diagram viewer for a repository.",
      "IMPORTANT: After this tool returns, you MUST immediately call",
      "browser_navigate(url=<returned url>) on server cursor-ide-browser",
      "to open the viewer in Cursor. Do not skip this step.",
      "The viewer URL is the last line of your reply.",
    ].join(" "),
    inputSchema: {
      repo_id: z.string().describe("Repository id — any repo on hosted site or under ATELIER_LOCAL_REPO_ROOT"),
      refresh: z
        .boolean()
        .optional()
        .describe("Re-download from hosted (or re-copy from local). Default false preserves cached edits."),
    },
  },
  async ({ repo_id, refresh }) => {
    const result = await openViewer(repo_id, { refresh: refresh ?? false });
    return {
      content: [
        {
          type: "text" as const,
          text: [
            `Viewer ready at ${result.url}`,
            ``,
            `ACTION REQUIRED: Call browser_navigate now:`,
            `  server: cursor-ide-browser`,
            `  tool:   browser_navigate`,
            `  args:   {"url": "${result.url}", "position": "active", "newTab": true}`,
            ``,
            `Then reply with ${result.url} as the last line.`,
          ].join("\n"),
        },
      ],
    };
  }
);

server.tool(
  "patch_diagram",
  [
    "Apply fine-grained mutations to a diagram (target='overview' or a module id).",
    "Operations: add_node, remove_node, update_node, add_edge, remove_edge, update_edge,",
    "add_group, remove_group, update_group, merge_groups, move_nodes, set_direction,",
    "set_title, set_description. Pass dry_run=true to preview without writing.",
    "Writes overview.json or {module}.json locally and bumps viewer_epoch.json for hot-reload.",
  ].join("\n"),
  patchDiagramSchema.shape,
  async (args) => patchDiagram(args)
);

server.tool(
  "write_module_doc",
  "Create or replace a drill-down module page ({module_id}.json). Registers in module_tree.json so the viewer can load it on click.",
  writeModuleDocSchema.shape,
  async (args) => writeModuleDocTool(args)
);

async function main() {
  // Connect transport FIRST so tools are available immediately.
  const transport = new StdioServerTransport();
  await server.connect(transport);

  // Boot daemons in the background — never block the agent.
  bootAtelierStack()
    .then(async (stack) => {
      const origin = (await getViewerOrigin()) || `http://127.0.0.1:${stack.viewerPort}`;
      console.error(`[atelier-mcp] stack ready demo=${stack.demoPort} viewer=${origin}/`);
    })
    .catch((err) => {
      console.error("[atelier-mcp] stack boot failed:", err);
    });
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
