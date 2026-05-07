#!/usr/bin/env bash
# Launch codewiki MCP using this repo's .venv (Python >= 3.12).
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# Keep MCP stderr clean (some transitive imports emit FutureWarning noise).
export PYTHONWARNINGS="${PYTHONWARNINGS:-ignore::FutureWarning}"
exec "${ROOT}/.venv/bin/python" -m codewiki.mcp "$@"
