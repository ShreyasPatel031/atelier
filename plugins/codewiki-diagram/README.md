# CodeWiki Diagram — Cursor Plugin

Browse and query architecture diagrams for open-source repositories directly from Cursor.

## What it does

This plugin installs a local MCP server that gives your Cursor AI agent access to pre-generated architecture diagrams. Ask questions like:

- "Show me the architecture of CrewAI"
- "How does the core framework module connect to the CLI tools?"
- "What modules does the pydantic-ai repo have?"

The agent can read diagram data (nodes, edges, groups, module drill-downs) and open an interactive React Flow viewer in Cursor's Simple Browser.

## Tools

| Tool | Description |
|------|-------------|
| `list_repos` | List all available architecture diagram repositories |
| `get_diagram` | Read overview, inventory, or module-level diagram data |

## Requirements

- Node.js 18+ (for the `npx`-based MCP server)
- No API keys or local repository clones needed

## How it works

The MCP server fetches diagram data from `https://app.atelier-inc.net/repos/` — the same data that powers the hosted viewer. Everything is read-only and requires zero setup beyond installing the plugin.
