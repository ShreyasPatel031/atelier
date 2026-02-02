#!/usr/bin/env python3
"""
Benchmark documentation generation across multiple repos.
Collects: time, nodes, files, codebase size, success/failure.
"""

import subprocess
import time
import os
import json
from pathlib import Path

REPOS = [
    ("typer", "https://github.com/tiangolo/typer", "small"),
    ("fastapi", "https://github.com/tiangolo/fastapi", "medium"),
    ("flask", "https://github.com/pallets/flask", "medium"),
    ("httpx", "https://github.com/encode/httpx", "medium"),
    ("rich", "https://github.com/Textualize/rich", "medium"),
    ("KubeElasti", "https://github.com/truefoundry/KubeElasti", "medium-go"),
    ("CruiseKube", "https://github.com/truefoundry/CruiseKube", "medium-go"),
    ("kubecost", "https://github.com/kubecost/kubecost", "large-go"),
]

TEST_REPOS_DIR = Path("/Users/shreyaspatel/atelier/test_repos")
RESULTS_FILE = Path("/Users/shreyaspatel/atelier/benchmark_timing_results.json")

def get_repo_stats(repo_path: Path) -> dict:
    """Get stats about a repo."""
    stats = {
        "files": 0,
        "size_mb": 0,
        "py_files": 0,
        "go_files": 0,
        "ts_files": 0,
    }
    
    try:
        # Count files
        for ext in ["*.py", "*.go", "*.ts", "*.tsx", "*.js", "*.jsx"]:
            result = subprocess.run(
                f"find {repo_path} -name '{ext}' -type f | wc -l",
                shell=True, capture_output=True, text=True
            )
            count = int(result.stdout.strip())
            stats["files"] += count
            if ext == "*.py":
                stats["py_files"] = count
            elif ext == "*.go":
                stats["go_files"] = count
            elif ext in ["*.ts", "*.tsx"]:
                stats["ts_files"] += count
        
        # Get size
        result = subprocess.run(
            f"du -sm {repo_path} | cut -f1",
            shell=True, capture_output=True, text=True
        )
        stats["size_mb"] = int(result.stdout.strip())
    except Exception as e:
        print(f"Error getting stats: {e}")
    
    return stats

def clone_repo(name: str, url: str) -> Path:
    """Clone repo if not exists."""
    repo_path = TEST_REPOS_DIR / name
    if repo_path.exists():
        print(f"  {name} already exists")
        return repo_path
    
    print(f"  Cloning {name}...")
    subprocess.run(
        ["git", "clone", "--depth", "1", url, str(repo_path)],
        capture_output=True
    )
    return repo_path

def run_generation(repo_path: Path, timeout_minutes: int = 60) -> dict:
    """Run codewiki generate and capture metrics."""
    docs_path = repo_path / "docs"
    
    # Clean previous docs
    if docs_path.exists():
        subprocess.run(["rm", "-rf", str(docs_path)])
    
    start_time = time.time()
    
    try:
        result = subprocess.run(
            ["codewiki", "generate", "--output", "docs"],
            cwd=str(repo_path),
            capture_output=True,
            text=True,
            timeout=timeout_minutes * 60,
            env={**os.environ, "PYTHONUNBUFFERED": "1"}
        )
        duration = time.time() - start_time
        
        # Parse output for metrics
        output = result.stderr + result.stdout
        
        # Extract entry points
        entry_points = 0
        for line in output.split('\n'):
            if 'leaf nodes' in line.lower() or 'entry points' in line.lower():
                import re
                nums = re.findall(r'\d+', line)
                if nums:
                    entry_points = max(entry_points, int(nums[0]))
        
        # Count generated files
        md_files = 0
        if docs_path.exists():
            md_files = len(list(docs_path.rglob("*.md")))
        
        success = result.returncode == 0
        
        return {
            "success": success,
            "duration_seconds": round(duration, 1),
            "entry_points": entry_points,
            "md_files_generated": md_files,
            "error": None if success else output[-500:] if len(output) > 500 else output
        }
        
    except subprocess.TimeoutExpired:
        duration = time.time() - start_time
        return {
            "success": False,
            "duration_seconds": round(duration, 1),
            "entry_points": 0,
            "md_files_generated": 0,
            "error": f"TIMEOUT after {timeout_minutes} minutes"
        }
    except Exception as e:
        duration = time.time() - start_time
        return {
            "success": False,
            "duration_seconds": round(duration, 1),
            "entry_points": 0,
            "md_files_generated": 0,
            "error": str(e)
        }

def main():
    print("=" * 70)
    print("BENCHMARK: Documentation Generation Timing Analysis")
    print("=" * 70)
    
    results = []
    
    for name, url, size_category in REPOS:
        print(f"\n{'='*70}")
        print(f"Processing: {name} ({size_category})")
        print(f"{'='*70}")
        
        # Clone if needed
        repo_path = clone_repo(name, url)
        
        # Get stats
        stats = get_repo_stats(repo_path)
        print(f"  Files: {stats['files']} (py:{stats['py_files']}, go:{stats['go_files']}, ts:{stats['ts_files']})")
        print(f"  Size: {stats['size_mb']} MB")
        
        # Run generation
        print(f"  Running codewiki generate...")
        gen_result = run_generation(repo_path, timeout_minutes=30)
        
        result = {
            "repo": name,
            "category": size_category,
            **stats,
            **gen_result
        }
        results.append(result)
        
        status = "✅" if gen_result["success"] else "❌"
        print(f"  {status} Duration: {gen_result['duration_seconds']}s, Entry points: {gen_result['entry_points']}, MD files: {gen_result['md_files_generated']}")
        if gen_result["error"]:
            print(f"  Error: {gen_result['error'][:200]}...")
        
        # Save intermediate results
        with open(RESULTS_FILE, 'w') as f:
            json.dump(results, f, indent=2)
    
    # Print summary
    print("\n" + "=" * 70)
    print("SUMMARY")
    print("=" * 70)
    print(f"{'Repo':<15} {'Files':>6} {'Size':>6} {'Nodes':>6} {'Time':>8} {'Status':<8}")
    print("-" * 70)
    for r in results:
        status = "✅" if r["success"] else "❌"
        time_str = f"{r['duration_seconds']:.0f}s"
        print(f"{r['repo']:<15} {r['files']:>6} {r['size_mb']:>5}MB {r['entry_points']:>6} {time_str:>8} {status:<8}")
    
    print(f"\nResults saved to: {RESULTS_FILE}")

if __name__ == "__main__":
    main()
