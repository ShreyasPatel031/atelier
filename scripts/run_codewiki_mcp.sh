#!/usr/bin/env bash
# Launch codewiki MCP using this repo's .venv (Python >= 3.12).
# Prefer invoking via absolute path in .cursor/mcp.json (${workspaceFolder}/scripts/...) so Cursor
# never resolves ./scripts/... against the wrong workspace when cwd and argv disagree.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
export PYTHONWARNINGS="${PYTHONWARNINGS:-ignore::FutureWarning}"

PY="${ROOT}/.venv/bin/python"
if [[ ! -x "$PY" ]]; then
    echo "codewiki-diagram MCP: no Python at ${PY}" >&2
    echo "  Create a venv in the repo root and install this package, e.g.:" >&2
    echo "    cd \"${ROOT}\" && uv venv .venv && uv sync" >&2
    echo "    # or: python3.12 -m venv .venv && .venv/bin/pip install -e ." >&2
    exit 1
fi

if ! "$PY" -c "import codewiki.mcp" 2>/dev/null; then
    echo "codewiki-diagram MCP: '${PY}' cannot import codewiki.mcp (package not installed in this venv)." >&2
    echo "  From repo root:" >&2
    echo "    cd \"${ROOT}\" && uv sync" >&2
    echo "    # or: .venv/bin/pip install -e ." >&2
    exit 1
fi

exec "$PY" -m codewiki.mcp "$@"
