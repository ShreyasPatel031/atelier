---
name: atelier-viewer
description: Use Atelier MCP tools to browse, query, and live-edit architecture diagrams. Covers open_viewer, get_diagram, patch_diagram, and the viewer hot-reload workflow.
---

# Atelier Architecture Diagram Viewer

## When to use

- User asks to view, explore, or edit an architecture diagram
- User mentions a repository and wants to understand its structure
- User wants to patch, add, or remove nodes/edges/groups in a diagram
- User says "open the viewer" or "show the architecture"

## Tools

| Tool | Purpose |
|------|---------|
| `open_viewer` | Download repo data, boot local viewer, return URL |
| `get_diagram` | Read overview, inventory, or module-level diagram IR |
| `patch_diagram` | Fine-grained mutations (add/remove/update nodes, edges, groups) |
| `write_module_doc` | Create drill-down module pages |
| `list_repos` | List all available repos |

## Workflow

1. Call `open_viewer(repo_id)` — this boots the demo UI + viewer proxy daemons and returns a localhost URL.
2. Open the URL with `browser_navigate(url=..., position="active", newTab=true)`.
3. To edit the diagram, use `patch_diagram(repo_id, operations=[...])` — the viewer hot-reloads automatically via SSE + `viewer_epoch.json`.
4. When done, put the viewer URL on its own last line.

## Key concepts

- **Repo data** lives in `~/.cache/atelier-mcp/repos/{repo_id}/` (cache) and optionally `ATELIER_LOCAL_REPO_ROOT/{repo_id}/` (local source).
- **Hot reload**: `patch_diagram` bumps `viewer_epoch.json`, the viewer listens via SSE and re-renders.
- **Dynamic ports**: The viewer and demo UI use OS-assigned ports. Runtime files in `~/.cache/atelier-mcp/` track them.
- **Any `repo_id` works**: hosted repos load from `app.atelier-inc.net`, local repos from `ATELIER_LOCAL_REPO_ROOT`.

## Common patterns

```
# View a repo
open_viewer(repo_id="dspy")

# Read overview diagram data
get_diagram(repo_id="dspy", target="overview")

# Add a node
patch_diagram(repo_id="dspy", target="overview", operations=[
  { "op": "add_node", "id": "new-service", "label": "New Service", "group": "core" }
])

# Remove an edge
patch_diagram(repo_id="dspy", target="overview", operations=[
  { "op": "remove_edge", "source": "a", "target": "b" }
])
```
