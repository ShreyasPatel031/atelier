#!/usr/bin/env python3
"""
Benchmark 5 repos and measure diagram coverage rates.
"""
import subprocess
import json
import time
import os
from pathlib import Path

REPOS = [
    ("KubeElasti", "https://github.com/truefoundry/KubeElasti.git"),
    ("typer", "https://github.com/tiangolo/typer.git"),
    ("httpx", "https://github.com/encode/httpx.git"),
    ("rich", "https://github.com/Textualize/rich.git"),
    ("fastapi", "https://github.com/tiangolo/fastapi.git"),
]

BENCH_DIR = Path(__file__).parent
BASE_DIR = BENCH_DIR.parent
REPOS_DIR = BENCH_DIR / "repos"
VENV_ACTIVATE = f"source {BASE_DIR}/.venv/bin/activate"

def clone_repo(name: str, url: str) -> bool:
    """Clone repo if not exists."""
    repo_path = REPOS_DIR / name
    if repo_path.exists():
        print(f"  ✓ {name} already exists")
        return True
    
    print(f"  Cloning {name}...")
    result = subprocess.run(
        ["git", "clone", "--depth", "1", url, str(repo_path)],
        capture_output=True, text=True
    )
    if result.returncode != 0:
        print(f"  ✗ Failed to clone {name}: {result.stderr}")
        return False
    return True

def run_generation(name: str) -> tuple[float, bool, str]:
    """Run codewiki generate and return (time, success, error)."""
    repo_path = REPOS_DIR / name
    docs_path = repo_path / "docs"
    
    # Clean docs
    if docs_path.exists():
        subprocess.run(["rm", "-rf", str(docs_path)])
    
    # No timeout - let it run (macOS doesn't have timeout by default)
    cmd = f"{VENV_ACTIVATE} && cd {repo_path} && codewiki generate --output docs 2>&1"
    
    start = time.time()
    result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
    duration = time.time() - start
    
    if result.returncode != 0:
        error = result.stderr[-500:] if result.stderr else result.stdout[-500:]
        return duration, False, error
    
    return duration, True, ""

def analyze_coverage(name: str) -> dict:
    """Analyze diagram coverage for a repo."""
    docs_path = REPOS_DIR / name / "docs"
    tree_path = docs_path / "module_tree.json"
    
    if not tree_path.exists():
        return {"error": "No module_tree.json"}
    
    with open(tree_path) as f:
        tree = json.load(f)
    
    stats = {
        "total_modules": 0,
        "with_diagram": 0,
        "with_title": 0,
        "with_description": 0,
        "parent_no_diagram": 0,
        "leaf_no_diagram": 0,
        "md_files": len(list(docs_path.glob("*.md"))),
    }
    
    def analyze(t):
        for name, data in t.items():
            stats["total_modules"] += 1
            has_children = bool(data.get("children", {}))
            
            if data.get("diagram"):
                stats["with_diagram"] += 1
            elif has_children:
                stats["parent_no_diagram"] += 1
            else:
                stats["leaf_no_diagram"] += 1
            
            if data.get("title"):
                stats["with_title"] += 1
            if data.get("description"):
                stats["with_description"] += 1
            
            if data.get("children"):
                analyze(data["children"])
    
    analyze(tree)
    return stats

def main():
    print("=" * 70)
    print("  5-REPO BENCHMARK: Diagram Coverage Analysis")
    print("=" * 70)
    
    results = []
    
    for name, url in REPOS:
        print(f"\n{'='*70}")
        print(f"  {name}")
        print(f"{'='*70}")
        
        # Clone
        if not clone_repo(name, url):
            results.append({"repo": name, "error": "Clone failed"})
            continue
        
        # Generate
        print(f"  Generating docs...")
        duration, success, error = run_generation(name)
        
        if not success:
            print(f"  ✗ Generation failed after {duration:.0f}s")
            results.append({
                "repo": name,
                "time_s": duration,
                "error": error[:200]
            })
            continue
        
        print(f"  ✓ Generated in {duration:.0f}s")
        
        # Analyze
        stats = analyze_coverage(name)
        if "error" in stats:
            results.append({"repo": name, "time_s": duration, **stats})
            continue
        
        coverage = 100 * stats["with_diagram"] / stats["total_modules"] if stats["total_modules"] else 0
        
        results.append({
            "repo": name,
            "time_s": duration,
            "total_modules": stats["total_modules"],
            "md_files": stats["md_files"],
            "with_diagram": stats["with_diagram"],
            "diagram_coverage": f"{coverage:.0f}%",
            "parent_no_diagram": stats["parent_no_diagram"],
            "leaf_no_diagram": stats["leaf_no_diagram"],
            "with_title": stats["with_title"],
            "with_description": stats["with_description"],
        })
        
        print(f"  Modules: {stats['total_modules']}, Diagrams: {stats['with_diagram']} ({coverage:.0f}%)")
    
    # Summary
    print("\n" + "=" * 70)
    print("  SUMMARY")
    print("=" * 70)
    print(f"\n{'Repo':<15} {'Time':<10} {'Modules':<10} {'Diagrams':<12} {'Coverage':<10} {'Errors'}")
    print("-" * 70)
    
    for r in results:
        if "error" in r and "total_modules" not in r:
            print(f"{r['repo']:<15} {r.get('time_s', 0):.0f}s{'':>5} {'FAILED':<10} {'-':<12} {'-':<10} {r.get('error', '')[:30]}")
        else:
            errors = r.get("parent_no_diagram", 0) + r.get("leaf_no_diagram", 0)
            print(f"{r['repo']:<15} {r.get('time_s', 0):.0f}s{'':>5} {r.get('total_modules', '-'):<10} {r.get('with_diagram', '-'):<12} {r.get('diagram_coverage', '-'):<10} {errors}")
    
    # Save results
    with open("/Users/shreyaspatel/atelier/benchmark_results.json", "w") as f:
        json.dump(results, f, indent=2)
    
    print("\nResults saved to benchmark_results.json")

if __name__ == "__main__":
    main()
