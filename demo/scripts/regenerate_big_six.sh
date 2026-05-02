#!/usr/bin/env bash
# Regenerate static demo bundles for the six flagship repos (current CodeWiki prompts).
# React / Swift bundles under demo/repos are left untouched.
#
# Prerequisites: codewiki CLI configured (codewiki config), network, API keys.
# Large clones: export CODEWIKI_CLONE_TIMEOUT=7200 (or higher) before running.
#
# Usage:
#   ./demo/scripts/regenerate_big_six.sh
#   ONLY_SLUG=dspy ./demo/scripts/regenerate_big_six.sh   # single repo
#   DRY_RUN=1 ./demo/scripts/regenerate_big_six.sh          # print steps only
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
CLONE_ROOT="${REPO_ROOT}/.tmp/demo_regen_big_six"
DEMO_REPOS="${REPO_ROOT}/demo/repos"
LOG="${LOG:-${REPO_ROOT}/.tmp/regenerate_big_six.log}"

export CODEWIKI_DEMO_REPOS="${DEMO_REPOS}"
# Always use the CodeWiki package from this checkout (global `codewiki` on PATH may be stale).
export PYTHONPATH="${REPO_ROOT}${PYTHONPATH:+:${PYTHONPATH}}"
PY="${PYTHON:-python3}"
CW=("${PY}" -m codewiki.cli.main)

mkdir -p "$(dirname "${LOG}")"
mkdir -p "${CLONE_ROOT}"

# slug|git_url
REPOS_LINES=(
  'crewai|https://github.com/crewaiinc/crewai.git'
  'dspy|https://github.com/stanfordnlp/dspy.git'
  'ollama|https://github.com/ollama/ollama.git'
  'transformers|https://github.com/huggingface/transformers.git'
  'langchain|https://github.com/langchain-ai/langchain.git'
  'pydantic-ai|https://github.com/pydantic/pydantic-ai.git'
)

log() { echo "[$(date -Iseconds)] $*" | tee -a "${LOG}"; }

run_one() {
  local slug="$1"
  local url="$2"
  local out="${DEMO_REPOS}/${slug}"
  local work="${CLONE_ROOT}/${slug}"

  if [[ -n "${ONLY_SLUG:-}" && "${ONLY_SLUG}" != "${slug}" ]]; then
    return 0
  fi

  log "=== ${slug} ==="
  if [[ "${DRY_RUN:-0}" == "1" ]]; then
    log "DRY_RUN: would clone ${url} -> ${work}"
    log "DRY_RUN: would run: (cd ${work} && ${CW[*]} generate -o ${out} --force --no-cache --demo-slug ${slug} -v)"
    return 0
  fi

  rm -rf "${work}"
  log "Cloning ${url} ..."
  git clone --depth 1 "${url}" "${work}"

  log "Generating into ${out} ..."
  (
    cd "${work}"
    "${CW[@]}" generate \
      -o "${out}" \
      --force \
      --no-cache \
      --demo-slug "${slug}" \
      -v
  )
  log "Finished ${slug}"
}

main() {
  log "Starting big-six regen; log=${LOG}; CLONE_ROOT=${CLONE_ROOT}"
  if [[ "${DRY_RUN:-0}" != "1" ]]; then
    "${CW[@]}" --help >/dev/null 2>&1 || {
      log "CodeWiki CLI failed (${PY} -m codewiki.cli.main). Set PYTHON=/path/to/python if needed."
      exit 1
    }
  fi
  local line
  for line in "${REPOS_LINES[@]}"; do
    IFS='|' read -r slug url <<< "${line}"
    run_one "${slug}" "${url}"
  done
  log "All requested repos complete."
}

main "$@"
