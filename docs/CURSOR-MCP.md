# Cursor + Atelier diagram MCP

The Python module is still **`codewiki.mcp`** (package name `codewiki`). In Cursor, the MCP server entry is **`atelier`** — that is the name you see under **Settings → MCP** and in tool routing.

## Use this repo as the Cursor workspace

The checked-in **`.cursor/mcp.json`** is meant for when **this repository root** is **File → Open Folder** in Cursor.

- **`args`** uses **`${workspaceFolder}/scripts/run_codewiki_mcp.sh`** so the launcher path is always tied to the opened folder. (Using `./scripts/...` can fail: some Cursor builds resolve that path relative to a different root than `cwd`, which produces “No such file or directory” under the wrong tree.)

## Python environment (required)

From the repo root:

```bash
uv venv .venv && uv sync
# or: python3.12 -m venv .venv && .venv/bin/pip install -e .
```

The `mcp` PyPI dependency is part of the **default** package dependencies, so a plain `uv sync` / `pip install -e .` installs everything needed for `python -m codewiki.mcp`.

If MCP still fails, run (stderr is shown in Cursor’s MCP log):

```bash
./scripts/run_codewiki_mcp.sh
```

You should **not** see the diagnostic errors; if the process waits on stdio, that is normal for MCP (interrupt with Ctrl+C).

## Diagram MCP from another project’s workspace

If your **workspace root** is a **different** repo (e.g. `agentic-clinical-control-tower`) but you want the **atelier** checkout’s MCP:

1. Clone **atelier** somewhere stable, e.g. `~/src/atelier`.
2. In that clone: create `.venv` and `uv sync` (or `pip install -e .`) as above.
3. In the **other** project’s **`.cursor/mcp.json`** (or Cursor global MCP settings), add a server entry whose **`args`** point at the **absolute** launcher path, for example:

```json
{
  "mcpServers": {
    "atelier": {
      "type": "stdio",
      "command": "/bin/bash",
      "args": ["/ABSOLUTE/PATH/TO/atelier/scripts/run_codewiki_mcp.sh"],
      "cwd": "/ABSOLUTE/PATH/TO/atelier",
      "env": {
        "CODEWIKI_MCP_PORT": "18765",
        "PYTHONWARNINGS": "ignore::FutureWarning"
      }
    }
  }
}
```

Replace `/ABSOLUTE/PATH/TO/atelier` with the real path. **`cwd` must be the atelier repo root** so the script’s `ROOT` and `.venv` resolve correctly.

4. Reload MCP / restart Cursor.

## Reload after changes

After editing `.cursor/mcp.json` or reinstalling Python deps: **disable and re-enable** the server in **Settings → MCP**, or **Developer: Reload Window**.
