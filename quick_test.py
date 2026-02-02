#!/usr/bin/env python3
"""Quick test of different node limits."""
import subprocess
import time
import os

REPO = "/Users/shreyaspatel/atelier/test_repos/kubecost"
CONFIG = "/Users/shreyaspatel/atelier/codewiki/src/config.py"

# Test: output_tokens -> expected nodes
TESTS = [
    (20_000, 450),
    (24_000, 540),
    (28_000, 630),
]

def set_limit(limit):
    with open(CONFIG, 'r') as f:
        content = f.read()
    import re
    content = re.sub(
        r"'gemini-2\.5-flash': \d+_?\d*,  # TEMP",
        f"'gemini-2.5-flash': {limit},  # TEMP",
        content
    )
    with open(CONFIG, 'w') as f:
        f.write(content)

def run_test(limit, expected_nodes, timeout=300):
    set_limit(limit)
    subprocess.run(["rm", "-rf", f"{REPO}/docs"], capture_output=True)
    
    print(f"\n{'='*60}")
    print(f"Testing: {limit} tokens (~{expected_nodes} nodes)")
    print(f"{'='*60}")
    
    start = time.time()
    try:
        result = subprocess.run(
            ["codewiki", "generate", "--output", "docs"],
            cwd=REPO,
            capture_output=True,
            text=True,
            timeout=timeout,
            env={**os.environ}
        )
        duration = time.time() - start
        
        output = result.stdout + result.stderr
        
        # Find actual nodes
        actual_nodes = expected_nodes
        for line in output.split('\n'):
            if 'leaf nodes' in line.lower():
                import re
                nums = re.findall(r'\d+', line)
                if nums:
                    actual_nodes = int(nums[-1])
        
        # Check success
        success = "ALL STAGES COMPLETE" in output
        
        # Count files
        md_count = 0
        for root, dirs, files in os.walk(f"{REPO}/docs"):
            md_count += len([f for f in files if f.endswith('.md')])
        
        status = "✅" if success else "❌"
        print(f"{status} Nodes: {actual_nodes}, Time: {duration:.0f}s, Files: {md_count}")
        
        if not success:
            # Show last error
            for line in output.split('\n')[-30:]:
                if 'error' in line.lower() or 'failed' in line.lower():
                    print(f"   {line[:100]}")
        
        return {"success": success, "nodes": actual_nodes, "time": duration, "files": md_count}
        
    except subprocess.TimeoutExpired:
        print(f"❌ TIMEOUT after {timeout}s")
        return {"success": False, "nodes": expected_nodes, "time": timeout, "files": 0}

if __name__ == "__main__":
    results = []
    for limit, nodes in TESTS:
        r = run_test(limit, nodes)
        results.append((limit, nodes, r))
        if not r["success"]:
            print("\n⚠️ Stopping at first failure")
            break
    
    print("\n" + "="*60)
    print("SUMMARY")
    print("="*60)
    for limit, exp_nodes, r in results:
        status = "✅" if r["success"] else "❌"
        print(f"{limit:>6} tokens → {r['nodes']:>4} nodes → {r['time']:>5.0f}s → {r['files']:>3} files {status}")
