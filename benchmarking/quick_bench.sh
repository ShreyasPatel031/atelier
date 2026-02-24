#!/bin/bash
# Quick parallel benchmark - runs all repos simultaneously

BENCH_DIR="$(cd "$(dirname "$0")" && pwd)"
BASE_DIR="$(cd "$BENCH_DIR/.." && pwd)"
source "$BASE_DIR/.venv/bin/activate"

run_repo() {
    repo=$1
    REPO_PATH="$BENCH_DIR/repos/$repo"
    rm -rf "$REPO_PATH/docs"
    cd "$REPO_PATH"
    
    START=$(date +%s)
    codewiki generate --output docs 2>&1 > "/tmp/${repo}_quick.log"
    END=$(date +%s)
    
    DURATION=$((END - START))
    MD_FILES=$(find "$REPO_PATH/docs" -name "*.md" 2>/dev/null | wc -l | tr -d ' ')
    SIZE=$(du -sh "$REPO_PATH" | cut -f1)
    
    echo "$repo|$SIZE|${DURATION}s|$MD_FILES files"
}

echo "Starting parallel benchmark with 10 concurrent..."
echo "Repo|Size|Time|Files"
echo "---|---|---|---"

# Run all in parallel
run_repo "flask" &
run_repo "httpx" &
run_repo "typer" &
run_repo "KubeElasti" &
run_repo "fastapi" &

wait
echo "Done!"
