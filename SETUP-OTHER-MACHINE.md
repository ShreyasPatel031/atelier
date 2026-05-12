# Continue work on another machine (Cursor)

Use this when you **zip or copy this repo** and open it in Cursor on a different laptop.

## 1. Make a portable archive (recommended)

From the **repository root** on the machine that has your latest work:

```bash
./scripts/make-portable-archive.sh
```

That writes `../atelier-portable.zip` containing **only git-tracked files** (same as a clean checkout).

**If you have uncommitted or untracked changes you need**, either commit them first, or zip manually and include those paths.

**Do not zip** `node_modules/`, `.venv/`, or `__pycache__/` — reinstall them on the new machine (smaller zip, fewer surprises).

## 2. Copy these by hand (usually not in git)

Bring these on a USB stick / secure channel if you use them:

| File | Why |
|------|-----|
| `scripts/cursor-sdk.env` | `CURSOR_API_KEY` for `npm run diagram:watch` (gitignored) |
| Any local `.env` at repo root | If you use one for secrets |
| Custom `.cursor/mcp.json` | Only if yours differs from the repo’s tracked copy |

The repo includes **`.cursor/mcp.json`** for the diagram MCP. It uses **`${workspaceFolder}/scripts/run_codewiki_mcp.sh`** (not `./scripts/...`) so Cursor resolves the script under the folder you opened. **Open this repo as the workspace root**, or see **[docs/CURSOR-MCP.md](docs/CURSOR-MCP.md)** for wiring MCP from another project’s workspace.

## 3. On the new laptop

### Prerequisites

- **Node.js** — project lists `24.x` in `package.json` engines; use 22+ if 24 is unavailable and adjust if needed.
- **Python 3.12+** — required for `codewiki` and the MCP server (`pyproject.toml`).
- **Cursor** — latest stable.

### Unpack and open in Cursor

1. Unzip to a folder (e.g. `~/work/atelier-tdc8`).
2. **File → Open Folder** and select that folder (must be the **workspace root** so `${workspaceFolder}` in MCP resolves correctly).

### Install JavaScript dependencies

```bash
cd /path/to/unzipped/repo
npm install
```

### Install Python + MCP (`.venv` is required)

The MCP launcher uses **`.venv/bin/python`** at the repo root. If the venv is missing or `codewiki` is not installed, **`scripts/run_codewiki_mcp.sh` prints a short error to stderr** (visible in Cursor’s MCP log) instead of a raw `ModuleNotFoundError`.

**Option A — uv (recommended):**

```bash
cd /path/to/unzipped/repo
uv venv .venv
uv sync
```

**Option B — venv + pip:**

```bash
cd /path/to/unzipped/repo
python3.12 -m venv .venv
.venv/bin/pip install -e .
```

Smoke-test:

```bash
.venv/bin/python -c "import codewiki.mcp; print('ok')"
```

### Cursor MCP

1. Confirm **`.cursor/mcp.json`** exists at the workspace root (it should if you used `git archive` or cloned).
2. **Cursor → Settings → MCP** (or Features → Model Context Protocol): ensure **codewiki-diagram** is listed and enabled.
3. **Developer: Reload Window** (or restart Cursor) after changing `mcp.json` or `.venv`.

### Demo viewer (optional)

Static viewer for `demo/`:

```bash
npm run demo
```

Open: `http://127.0.0.1:9891/?repo=atelier-tdc8` (change `repo=` to match `demo/repos/`).

### Diagram “?” + SDK watcher (optional)

1. Copy `scripts/cursor-sdk.env.example` → `scripts/cursor-sdk.env` and set `CURSOR_API_KEY`.
2. From repo root:

```bash
npm run diagram:watch
```

Companion URL (default): `http://127.0.0.1:9878/?repo=atelier-tdc8` — same port as `DIAGRAM_SSE_PORT` if you override it.

## 4. OS notes

- **macOS / Linux:** current MCP config uses **`/bin/bash`** and `scripts/run_codewiki_mcp.sh` — works as-is.
- **Windows:** Cursor MCP with bash paths may require **Git Bash** or **WSL**, or you’ll need to adjust `.cursor/mcp.json` to a Windows-friendly `command` (e.g. `wsl.exe` / full path to bash). If you hit errors, open an issue with the exact Cursor + OS version.

## 5. Quick verification

In Cursor chat (Agent with MCP enabled), you should be able to use the diagram MCP tools (e.g. list/get diagram, `open_viewer`) once the server starts.

If MCP fails to start, check **Cursor MCP logs** for:

- Missing `.venv` → recreate venv and `uv sync` / `pip install -e .`
- Wrong Python version → use 3.12+
- `Permission denied` on `run_codewiki_mcp.sh` → `chmod +x scripts/run_codewiki_mcp.sh`

---

More project context: [README.md](README.md) · Deep docs: [docs/README.md](docs/README.md) · **Cursor MCP:** [docs/CURSOR-MCP.md](docs/CURSOR-MCP.md)
