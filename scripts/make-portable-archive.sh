#!/usr/bin/env bash
# Create a zip of tracked files only (good for moving to another laptop).
# Usage: ./scripts/make-portable-archive.sh [output.zip]
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT="${1:-$ROOT/../atelier-portable.zip}"
cd "$ROOT"
if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "error: not a git repository" >&2
  exit 1
fi
git archive --format=zip -o "$OUT" HEAD
echo "Wrote: $OUT"
echo "Note: reinstall node_modules and .venv on the other machine (npm install; uv sync or pip install -e .)."
echo "Note: copy scripts/cursor-sdk.env manually if you use diagram:watch (file is gitignored)."
