#!/bin/bash

# Benchmark script for CodeWiki documentation generation
# Tests 5 repos of varying sizes

BENCH_DIR="$(cd "$(dirname "$0")" && pwd)"
BASE_DIR="$(cd "$BENCH_DIR/.." && pwd)"
source "$BASE_DIR/.venv/bin/activate"

REPOS=("flask" "httpx" "typer" "KubeElasti" "fastapi")
RESULTS_FILE="/tmp/benchmark_results.txt"

echo "=== CodeWiki Benchmark ===" > $RESULTS_FILE
echo "Date: $(date)" >> $RESULTS_FILE
echo "" >> $RESULTS_FILE

for repo in "${REPOS[@]}"; do
    echo "========================================" | tee -a $RESULTS_FILE
    echo "Processing: $repo" | tee -a $RESULTS_FILE
    echo "========================================" | tee -a $RESULTS_FILE
    
    REPO_PATH="$BENCH_DIR/repos/$repo"

    # Get repo size
    SIZE=$(du -sh "$REPO_PATH" | cut -f1)
    echo "Size: $SIZE" | tee -a $RESULTS_FILE
    
    # Count code files
    CODE_FILES=$(find "$REPO_PATH" -type f \( -name "*.py" -o -name "*.go" -o -name "*.js" -o -name "*.ts" \) | wc -l | tr -d ' ')
    echo "Code files: $CODE_FILES" | tee -a $RESULTS_FILE
    
    # Clean docs
    rm -rf "$REPO_PATH/docs"
    
    # CD INTO THE REPO and run generation
    cd "$REPO_PATH"
    
    START=$(date +%s)
    codewiki generate --output docs 2>&1 | tee "/tmp/${repo}_bench.log"
    END=$(date +%s)
    
    DURATION=$((END - START))
    MINUTES=$((DURATION / 60))
    SECONDS=$((DURATION % 60))
    echo "Time: ${MINUTES}m ${SECONDS}s" | tee -a $RESULTS_FILE
    
    # Count generated files
    MD_FILES=$(find "$REPO_PATH/docs" -name "*.md" 2>/dev/null | wc -l | tr -d ' ')
    echo "Generated MD files: $MD_FILES" | tee -a $RESULTS_FILE
    
    # Get depth from module_tree
    if [ -f "$REPO_PATH/docs/module_tree.json" ]; then
        DEPTH=$(python3 -c "
import json
def get_depth(tree, d=0):
    if not tree: return d
    max_d = d
    for k, v in tree.items():
        if isinstance(v, dict) and 'children' in v:
            max_d = max(max_d, get_depth(v.get('children', {}), d+1))
    return max_d
with open('$REPO_PATH/docs/module_tree.json') as f:
    print(get_depth(json.load(f)))
" 2>/dev/null || echo "N/A")
        echo "Depth: $DEPTH" | tee -a $RESULTS_FILE
    fi
    
    # Run validation
    echo "Validation:" | tee -a $RESULTS_FILE
    python "$BASE_DIR/codewiki/src/be/validation.py" "$REPO_PATH/docs" 2>&1 | grep -E "PASSED|FAILED|ERRORS|WARNINGS" | head -3 | tee -a $RESULTS_FILE
    
    echo "" >> $RESULTS_FILE
done

echo "========================================" | tee -a $RESULTS_FILE
echo "Benchmark complete!" | tee -a $RESULTS_FILE
cat $RESULTS_FILE
