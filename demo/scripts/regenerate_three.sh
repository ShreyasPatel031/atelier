#!/usr/bin/env bash
# Sequential full regen for langchain, ollama, pydantic-ai (same flags as regenerate_big_six.sh).
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
export PYTHONPATH="${REPO_ROOT}${PYTHONPATH:+:${PYTHONPATH}}"
export CODEWIKI_DEMO_REPOS="${REPO_ROOT}/demo/repos"
LOG="${LOG:-${REPO_ROOT}/.tmp/regenerate_three.log}"
mkdir -p "$(dirname "${LOG}")"

{
  echo "[$(date -Iseconds)] regenerate_three: starting (langchain -> ollama -> pydantic-ai)"
  for ONLY_SLUG in langchain ollama pydantic-ai; do
    export ONLY_SLUG
    echo ""
    echo "========== ONLY_SLUG=${ONLY_SLUG} =========="
    "${REPO_ROOT}/demo/scripts/regenerate_big_six.sh"
  done
  echo "[$(date -Iseconds)] regenerate_three: all done"
} 2>&1 | tee -a "${LOG}"
