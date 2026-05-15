#!/usr/bin/env bash
# Run codewiki generate for all demo repos, N at a time, with per-repo logs.
# Usage: bash benchmarking/run_all_repos.sh [PARALLELISM] [REPO1 REPO2 ...]
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(dirname "$SCRIPT_DIR")"
TMP_DIR="$REPO_ROOT/.tmp/demo_regen"
LOG_DIR="$REPO_ROOT/.tmp/demo_regen_logs"
CODEWIKI_EXE="${CODEWIKI_EXE:-$(which codewiki 2>/dev/null || echo "")}"
if [ -z "$CODEWIKI_EXE" ]; then
  CODEWIKI_EXE="/Users/shreyaspatel/.local/pipx/venvs/codewiki/bin/python3.14 -m codewiki"
fi
PARALLELISM="${1:-2}"
shift 2>/dev/null || true

declare -A REPOS=(
  [crewai]="https://github.com/crewAIInc/crewAI.git"
  [dspy]="https://github.com/stanfordnlp/dspy.git"
  [langchain]="https://github.com/langchain-ai/langchain.git"
  [ollama]="https://github.com/ollama/ollama.git"
  [pydantic-ai]="https://github.com/pydantic/pydantic-ai.git"
  [transformers]="https://github.com/huggingface/transformers.git"
)

SELECTED_REPOS=("$@")
if [ ${#SELECTED_REPOS[@]} -eq 0 ]; then
  SELECTED_REPOS=(crewai dspy langchain ollama pydantic-ai transformers)
fi

mkdir -p "$LOG_DIR" "$TMP_DIR"

clone_repo() {
  local name="$1" url="$2" dest="$TMP_DIR/$name"
  if [ -d "$dest/.git" ]; then
    echo "[$name] Already cloned, pulling..."
    git -C "$dest" pull --ff-only 2>/dev/null || true
  else
    echo "[$name] Cloning $url..."
    mkdir -p "$(dirname "$dest")"
    git clone --depth 1 "$url" "$dest"
  fi
}

generate_repo() {
  local name="$1"
  local clone_path="$TMP_DIR/$name"
  local log="$LOG_DIR/${name}.log"
  local start_time

  echo "[$name] Starting generation -> $log"
  start_time=$(date +%s)

  cd "$clone_path"
  PYTHONPATH="$REPO_ROOT" $CODEWIKI_EXE generate \
    --output docs --force --no-cache \
    --demo-slug "$name" --verbose \
    > "$log" 2>&1 \
    && echo "[$name] SUCCESS ($(( $(date +%s) - start_time ))s)" \
    || echo "[$name] FAILED exit=$? ($(( $(date +%s) - start_time ))s) — see $log"
}

echo "=== Cloning repos ==="
for name in "${SELECTED_REPOS[@]}"; do
  url="${REPOS[$name]}"
  clone_repo "$name" "$url"
done

echo ""
echo "=== Generating docs (parallelism=$PARALLELISM) ==="
echo "Repos: ${SELECTED_REPOS[*]}"
echo "Logs: $LOG_DIR/"
echo ""

running=0
declare -a pids=()
declare -a pnames=()

for name in "${SELECTED_REPOS[@]}"; do
  generate_repo "$name" &
  pids+=($!)
  pnames+=("$name")
  running=$((running + 1))

  if [ "$running" -ge "$PARALLELISM" ]; then
    wait -n 2>/dev/null || wait "${pids[0]}" 2>/dev/null || true
    new_pids=()
    new_pnames=()
    for i in "${!pids[@]}"; do
      if kill -0 "${pids[$i]}" 2>/dev/null; then
        new_pids+=("${pids[$i]}")
        new_pnames+=("${pnames[$i]}")
      fi
    done
    pids=("${new_pids[@]+"${new_pids[@]}"}")
    pnames=("${new_pnames[@]+"${new_pnames[@]}"}")
    running=${#pids[@]}
  fi
done

for pid in "${pids[@]+"${pids[@]}"}"; do
  wait "$pid" 2>/dev/null || true
done

echo ""
echo "=== Results ==="
for name in "${SELECTED_REPOS[@]}"; do
  log="$LOG_DIR/${name}.log"
  docs_dir="$TMP_DIR/$name/docs"
  md_count=$(ls "$docs_dir"/*.md 2>/dev/null | wc -l | tr -d ' ')
  has_tree="no"
  [ -f "$docs_dir/module_tree.json" ] && has_tree="yes"
  has_overview="no"
  [ -f "$docs_dir/overview.md" ] && has_overview="yes"

  if grep -q "Unexpected error" "$log" 2>/dev/null; then
    status="FAILED"
    error=$(grep -A2 "Unexpected error" "$log" | tail -1)
    echo "  $name: $status — $error (${md_count} md)"
  elif [ "$md_count" -gt 5 ] && [ "$has_tree" = "yes" ]; then
    status="OK"
    echo "  $name: $status — ${md_count} md, tree=$has_tree, overview=$has_overview"
  else
    status="UNKNOWN"
    echo "  $name: $status — ${md_count} md (check $log)"
  fi
done

echo ""
echo "=== Demo sync check ==="
for name in "${SELECTED_REPOS[@]}"; do
  demo_dir="$REPO_ROOT/demo/repos/$name"
  if [ -d "$demo_dir" ] && [ -f "$demo_dir/module_tree.json" ]; then
    echo "  $name: synced ($(ls "$demo_dir"/*.md 2>/dev/null | wc -l | tr -d ' ') md)"
  else
    echo "  $name: NOT synced"
  fi
done
