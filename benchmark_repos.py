#!/usr/bin/env python3
"""
Benchmark script for CodeWiki documentation generation.
Clones 5 repos, runs generation, logs problems/time/cost.
"""

import subprocess
import time
import json
import os
import sys
from pathlib import Path
from datetime import datetime

# Repos to benchmark (name, git_url, branch)
REPOS = [
    ("flask", "https://github.com/pallets/flask.git", "main"),
    ("fastapi", "https://github.com/tiangolo/fastapi.git", "master"),
    ("httpx", "https://github.com/encode/httpx.git", "master"),
    ("rich", "https://github.com/Textualize/rich.git", "master"),
    ("typer", "https://github.com/tiangolo/typer.git", "master"),
]

TEST_REPOS_DIR = Path(__file__).parent / "test_repos"
RESULTS_FILE = Path(__file__).parent / "benchmark_results.json"

def run_cmd(cmd: list, cwd: str = None, timeout: int = 1800) -> tuple[int, str, float]:
    """Run command and return (exit_code, output, duration_seconds)."""
    start = time.time()
    try:
        result = subprocess.run(
            cmd,
            cwd=cwd,
            capture_output=True,
            text=True,
            timeout=timeout
        )
        duration = time.time() - start
        output = result.stdout + result.stderr
        return result.returncode, output, duration
    except subprocess.TimeoutExpired:
        return -1, "TIMEOUT", time.time() - start
    except Exception as e:
        return -1, str(e), time.time() - start

def clone_repo(name: str, url: str, branch: str) -> bool:
    """Clone repo if not exists, return success."""
    repo_path = TEST_REPOS_DIR / name
    
    if repo_path.exists() and (repo_path / ".git").exists():
        print(f"  ✓ {name} already cloned")
        return True
    
    # Remove if exists but incomplete
    if repo_path.exists():
        subprocess.run(["rm", "-rf", str(repo_path)])
    
    print(f"  Cloning {name}...")
    code, output, duration = run_cmd(
        ["git", "clone", "--depth", "1", "--branch", branch, url, str(repo_path)],
        timeout=300
    )
    
    if code == 0:
        print(f"  ✓ Cloned in {duration:.1f}s")
        return True
    else:
        print(f"  ✗ Failed: {output[:200]}")
        return False

def run_generation(name: str) -> dict:
    """Run codewiki generate and return results."""
    repo_path = TEST_REPOS_DIR / name
    docs_path = repo_path / "docs"
    
    # Clean previous docs
    if docs_path.exists():
        subprocess.run(["rm", "-rf", str(docs_path)])
    
    print(f"  Generating docs for {name}...")
    start = time.time()
    
    code, output, duration = run_cmd(
        ["codewiki", "generate", "--output", "docs", "--verbose"],
        cwd=str(repo_path),
        timeout=1800  # 30 min timeout
    )
    
    result = {
        "repo": name,
        "exit_code": code,
        "duration_seconds": duration,
        "duration_human": f"{int(duration // 60)}m {int(duration % 60)}s",
        "output_lines": len(output.split('\n')),
        "errors": [],
        "warnings": [],
        "files_generated": 0,
        "modules_count": 0,
    }
    
    # Count generated files
    if docs_path.exists():
        md_files = list(docs_path.rglob("*.md"))
        result["files_generated"] = len(md_files)
        
        # Check for module_tree.json
        module_tree_path = docs_path / "module_tree.json"
        if module_tree_path.exists():
            try:
                with open(module_tree_path) as f:
                    tree = json.load(f)
                result["modules_count"] = count_modules(tree)
            except:
                pass
    
    # Extract errors from output
    for line in output.split('\n'):
        if 'error' in line.lower() or 'Error' in line:
            result["errors"].append(line.strip()[:200])
        elif 'warning' in line.lower() or 'Warning' in line:
            result["warnings"].append(line.strip()[:200])
    
    # Limit error/warning lists
    result["errors"] = result["errors"][:20]
    result["warnings"] = result["warnings"][:20]
    
    return result

def run_validation(name: str) -> dict:
    """Run validation script and return results."""
    repo_path = TEST_REPOS_DIR / name
    docs_path = repo_path / "docs"
    validation_script = Path(__file__).parent / "codewiki" / "src" / "be" / "validation.py"
    
    if not docs_path.exists():
        return {"validation_ran": False, "reason": "no docs folder"}
    
    if not validation_script.exists():
        return {"validation_ran": False, "reason": "validation.py not found"}
    
    print(f"  Validating {name}...")
    code, output, duration = run_cmd(
        ["python", str(validation_script), str(docs_path)],
        timeout=120
    )
    
    # Parse validation output
    validation_result = {
        "validation_ran": True,
        "exit_code": code,
        "duration_seconds": duration,
        "error_count": 0,
        "warning_count": 0,
        "issues": []
    }
    
    for line in output.split('\n'):
        if '❌' in line or 'ERROR' in line:
            validation_result["error_count"] += 1
            validation_result["issues"].append({"type": "error", "message": line.strip()[:200]})
        elif '⚠️' in line or 'WARNING' in line:
            validation_result["warning_count"] += 1
            validation_result["issues"].append({"type": "warning", "message": line.strip()[:200]})
    
    # Limit issues list
    validation_result["issues"] = validation_result["issues"][:30]
    
    return validation_result

def count_modules(tree: dict, depth: int = 0) -> int:
    """Count total modules in tree."""
    count = 0
    for key, value in tree.items():
        if isinstance(value, dict):
            count += 1
            if "children" in value and isinstance(value["children"], dict):
                count += count_modules(value["children"], depth + 1)
    return count

def main():
    print("=" * 60)
    print("CodeWiki Benchmark - 5 Repos")
    print(f"Started: {datetime.now().isoformat()}")
    print("=" * 60)
    
    results = {
        "started": datetime.now().isoformat(),
        "repos": []
    }
    
    # Step 1: Clone repos
    print("\n[1/3] Cloning repositories...")
    for name, url, branch in REPOS:
        success = clone_repo(name, url, branch)
        if not success:
            results["repos"].append({
                "repo": name,
                "status": "clone_failed"
            })
    
    # Step 2: Generate docs for each
    print("\n[2/3] Generating documentation...")
    for name, _, _ in REPOS:
        repo_path = TEST_REPOS_DIR / name
        if not repo_path.exists():
            continue
        
        gen_result = run_generation(name)
        
        # Step 3: Validate
        val_result = run_validation(name)
        gen_result["validation"] = val_result
        
        results["repos"].append(gen_result)
        
        # Print summary for this repo
        print(f"\n  {name}: {gen_result['duration_human']}, "
              f"{gen_result['files_generated']} files, "
              f"{len(gen_result['errors'])} errors, "
              f"{val_result.get('error_count', '?')} validation errors")
    
    results["completed"] = datetime.now().isoformat()
    
    # Calculate totals
    total_time = sum(r.get("duration_seconds", 0) for r in results["repos"])
    total_files = sum(r.get("files_generated", 0) for r in results["repos"])
    total_errors = sum(len(r.get("errors", [])) for r in results["repos"])
    total_val_errors = sum(r.get("validation", {}).get("error_count", 0) for r in results["repos"])
    
    results["summary"] = {
        "total_repos": len(REPOS),
        "successful_repos": len([r for r in results["repos"] if r.get("exit_code") == 0]),
        "total_time_seconds": total_time,
        "total_time_human": f"{int(total_time // 60)}m {int(total_time % 60)}s",
        "total_files_generated": total_files,
        "total_generation_errors": total_errors,
        "total_validation_errors": total_val_errors,
    }
    
    # Save results
    with open(RESULTS_FILE, "w") as f:
        json.dump(results, f, indent=2)
    
    # Print final summary
    print("\n" + "=" * 60)
    print("BENCHMARK COMPLETE")
    print("=" * 60)
    print(f"Total time: {results['summary']['total_time_human']}")
    print(f"Repos processed: {results['summary']['successful_repos']}/{results['summary']['total_repos']}")
    print(f"Files generated: {results['summary']['total_files_generated']}")
    print(f"Generation errors: {results['summary']['total_generation_errors']}")
    print(f"Validation errors: {results['summary']['total_validation_errors']}")
    print(f"\nFull results saved to: {RESULTS_FILE}")
    
    return 0 if results['summary']['successful_repos'] == len(REPOS) else 1

if __name__ == "__main__":
    sys.exit(main())
