#!/usr/bin/env python3
"""
Test different node limits to find the breaking point.
"""

import subprocess
import time
import os
from pathlib import Path

# Test these output token limits (nodes = limit * 0.9 / 40)
TEST_LIMITS = [
    2_000,   # ~45 nodes
    4_000,   # ~90 nodes
    8_000,   # ~180 nodes
    16_000,  # ~360 nodes
    32_000,  # ~720 nodes
    48_000,  # ~1080 nodes
    65_536,  # ~1475 nodes (full Gemini limit)
]

BENCH_DIR = Path(__file__).parent
BASE_DIR = BENCH_DIR.parent
CONFIG_PATH = BASE_DIR / "codewiki" / "src" / "config.py"
REPO_PATH = BENCH_DIR / "repos" / "kubecost"

def set_output_limit(limit: int):
    """Update the config with new output limit."""
    with open(str(CONFIG_PATH), 'r') as f:
        content = f.read()
    
    # Replace the gemini-2.5-flash limit
    import re
    content = re.sub(
        r"'gemini-2\.5-flash': \d+",
        f"'gemini-2.5-flash': {limit}",
        content
    )
    
    with open(str(CONFIG_PATH), 'w') as f:
        f.write(content)
    
    # Calculate expected nodes
    nodes = int(limit * 0.9 / 40)
    print(f"Set limit to {limit} tokens (~{nodes} nodes)")

def run_test(limit: int, timeout_minutes: int = 10) -> dict:
    """Run codewiki generate with given limit."""
    set_output_limit(limit)
    
    # Clean docs
    subprocess.run(["rm", "-rf", str(REPO_PATH / "docs")], capture_output=True)
    
    start = time.time()
    expected_nodes = int(limit * 0.9 / 40)
    
    try:
        result = subprocess.run(
            ["codewiki", "generate", "--output", "docs"],
            cwd=str(REPO_PATH),
            capture_output=True,
            text=True,
            timeout=timeout_minutes * 60,
            env={**os.environ, "PYTHONUNBUFFERED": "1"}
        )
        duration = time.time() - start
        
        # Check for success
        output = result.stdout + result.stderr
        success = "ALL STAGES COMPLETE" in output or result.returncode == 0
        
        # Extract actual nodes from output
        actual_nodes = expected_nodes
        for line in output.split('\n'):
            if 'leaf nodes' in line.lower():
                import re
                nums = re.findall(r'\d+', line)
                if nums:
                    actual_nodes = int(nums[-1])
                    break
        
        # Count generated files
        md_count = 0
        docs_dir = str(REPO_PATH / "docs")
        if os.path.exists(docs_dir):
            for root, dirs, files in os.walk(docs_dir):
                md_count += len([f for f in files if f.endswith('.md')])
        
        return {
            "limit": limit,
            "expected_nodes": expected_nodes,
            "actual_nodes": actual_nodes,
            "duration": round(duration, 1),
            "success": success,
            "md_files": md_count,
            "error": None if success else output[-500:]
        }
        
    except subprocess.TimeoutExpired:
        return {
            "limit": limit,
            "expected_nodes": expected_nodes,
            "actual_nodes": expected_nodes,
            "duration": timeout_minutes * 60,
            "success": False,
            "md_files": 0,
            "error": f"TIMEOUT after {timeout_minutes}min"
        }
    except Exception as e:
        return {
            "limit": limit,
            "expected_nodes": expected_nodes,
            "actual_nodes": expected_nodes,
            "duration": time.time() - start,
            "success": False,
            "md_files": 0,
            "error": str(e)
        }

def main():
    print("=" * 70)
    print("NODE LIMIT EXPERIMENT")
    print("=" * 70)
    
    results = []
    
    for limit in TEST_LIMITS:
        print(f"\n{'='*70}")
        print(f"Testing: {limit} tokens (~{int(limit * 0.9 / 40)} nodes)")
        print(f"{'='*70}")
        
        result = run_test(limit)
        results.append(result)
        
        status = "✅" if result["success"] else "❌"
        print(f"{status} Duration: {result['duration']}s, Nodes: {result['actual_nodes']}, Files: {result['md_files']}")
        
        if not result["success"]:
            print(f"   Error: {result['error'][:200] if result['error'] else 'Unknown'}...")
            # Stop on first failure
            print("\n⚠️ Stopping at first failure to save time")
            break
    
    # Summary
    print("\n" + "=" * 70)
    print("SUMMARY")
    print("=" * 70)
    print(f"{'Limit':>8} {'Nodes':>6} {'Time':>8} {'Files':>6} {'Status':<8}")
    print("-" * 70)
    for r in results:
        status = "✅" if r["success"] else "❌"
        print(f"{r['limit']:>8} {r['actual_nodes']:>6} {r['duration']:>7}s {r['md_files']:>6} {status:<8}")
    
    # Find max working limit
    working = [r for r in results if r["success"]]
    if working:
        max_working = max(working, key=lambda x: x["limit"])
        print(f"\n✅ MAX WORKING: {max_working['limit']} tokens (~{max_working['actual_nodes']} nodes)")
    
    # Reset to working limit
    if working:
        set_output_limit(max_working["limit"])
        print(f"Reset config to {max_working['limit']} tokens")

if __name__ == "__main__":
    main()
