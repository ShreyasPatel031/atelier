#!/usr/bin/env python3
"""
Run documentation generation on 10 fresh repos with full tracking.
"""

import json
import subprocess
import os
import sys
import time
from pathlib import Path
from datetime import datetime

REPOS = [
    "werkzeug",
    "jinja", 
    "starlette",
    "sqlmodel",
    "fastapi",
    "typer",
    "rich",
    "requests",
    "pydantic",
    "click",
]

BASE_DIR = Path("/Users/shreyaspatel/atelier")
REPOS_DIR = BASE_DIR / "fresh_repos"

def get_repo_size(path):
    try:
        result = subprocess.run(f"du -sm {path}", shell=True, capture_output=True, text=True)
        return int(result.stdout.split()[0])
    except:
        return 0

def count_source_files(path):
    count = 0
    for ext in ['.py', '.js', '.ts', '.go']:
        try:
            result = subprocess.run(
                f"find {path} -name '*{ext}' -type f 2>/dev/null | wc -l",
                shell=True, capture_output=True, text=True
            )
            count += int(result.stdout.strip())
        except:
            pass
    return count

def run_generation(repo_name):
    """Run codewiki generate on a repo."""
    repo_path = REPOS_DIR / repo_name
    docs_path = repo_path / "docs"
    
    # Clean previous docs
    if docs_path.exists():
        subprocess.run(f"rm -rf {docs_path}", shell=True)
    
    # Run generation
    env = os.environ.copy()
    cmd = f"source {BASE_DIR}/.venv/bin/activate && cd {repo_path} && codewiki generate --output docs 2>&1"
    
    start = time.time()
    result = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=900)
    duration = time.time() - start
    
    success = result.returncode == 0 and docs_path.exists()
    
    return {
        "success": success,
        "duration": duration,
        "output": result.stdout[-2000:] if result.stdout else "",
        "error": result.stderr[-500:] if result.stderr else ""
    }

def run_validation(docs_path):
    """Run validation on docs."""
    cmd = f"source {BASE_DIR}/.venv/bin/activate && python {BASE_DIR}/codewiki/src/be/validation.py {docs_path} 2>&1"
    result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
    
    passed = "PASSED" in result.stdout
    errors = 0
    warnings = 0
    
    for line in result.stdout.split("\n"):
        if "Errors:" in line:
            try:
                errors = int(line.split("Errors:")[1].split(",")[0].strip())
            except: pass
        if "Warnings:" in line:
            try:
                warnings = int(line.split("Warnings:")[1].split()[0].strip())
            except: pass
    
    return {"passed": passed, "errors": errors, "warnings": warnings}

def run_sync(docs_path):
    """Run doc sync."""
    cmd = f"source {BASE_DIR}/.venv/bin/activate && python {BASE_DIR}/codewiki/src/be/doc_file_sync.py {docs_path} 2>&1"
    subprocess.run(cmd, shell=True, capture_output=True)

def count_modules(docs_path):
    """Count modules in tree."""
    tree_path = docs_path / "module_tree.json"
    if not tree_path.exists():
        return 0
    
    try:
        with open(tree_path) as f:
            tree = json.load(f)
        
        def count(t):
            return len(t) + sum(count(v.get("children", {})) for v in t.values())
        return count(tree)
    except:
        return 0

def main():
    print("\n" + "="*90)
    print("           FRESH 10-REPO BENCHMARK WITH GENERATION + VALIDATION")
    print("="*90)
    print(f"\nStarted at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"Repos: {', '.join(REPOS)}\n")
    
    results = []
    total_start = time.time()
    
    for i, repo_name in enumerate(REPOS, 1):
        repo_path = REPOS_DIR / repo_name
        docs_path = repo_path / "docs"
        
        print(f"\n[{i}/10] {repo_name}")
        print("-" * 50)
        
        # Get repo stats
        size_mb = get_repo_size(repo_path)
        source_files = count_source_files(repo_path)
        print(f"  Size: {size_mb} MB, Source files: {source_files}")
        
        # Run generation
        print(f"  Generating documentation...")
        gen_result = run_generation(repo_name)
        print(f"  Generation: {'✓' if gen_result['success'] else '✗'} ({gen_result['duration']:.0f}s)")
        
        if not gen_result['success']:
            print(f"  ERROR: {gen_result['error'][:200]}")
            results.append({
                "repo": repo_name,
                "size_mb": size_mb,
                "source_files": source_files,
                "gen_success": False,
                "gen_time": gen_result['duration'],
                "modules": 0,
                "errors": -1,
                "warnings": -1,
                "passed": False
            })
            continue
        
        # Run sync
        print(f"  Running sync...")
        run_sync(docs_path)
        
        # Run validation
        print(f"  Validating...")
        val_result = run_validation(docs_path)
        
        modules = count_modules(docs_path)
        
        status = "✅ PASS" if val_result['passed'] else "❌ FAIL"
        print(f"  Result: {status} (errors={val_result['errors']}, warnings={val_result['warnings']})")
        print(f"  Modules: {modules}")
        
        results.append({
            "repo": repo_name,
            "size_mb": size_mb,
            "source_files": source_files,
            "gen_success": True,
            "gen_time": gen_result['duration'],
            "modules": modules,
            "errors": val_result['errors'],
            "warnings": val_result['warnings'],
            "passed": val_result['passed']
        })
    
    total_time = time.time() - total_start
    
    # Print summary
    print("\n\n" + "="*90)
    print("                            FINAL RESULTS")
    print("="*90 + "\n")
    
    print(f"{'Repo':<15} {'Size':<8} {'Files':<8} {'Time':<10} {'Modules':<10} {'Errors':<8} {'Warns':<8} {'Status':<10}")
    print("-"*90)
    
    for r in results:
        if r['gen_success']:
            status = "✅ PASS" if r['passed'] else "❌ FAIL"
            print(f"{r['repo']:<15} {r['size_mb']:<8} {r['source_files']:<8} {r['gen_time']:<10.0f} {r['modules']:<10} {r['errors']:<8} {r['warnings']:<8} {status}")
        else:
            print(f"{r['repo']:<15} {r['size_mb']:<8} {r['source_files']:<8} {r['gen_time']:<10.0f} {'N/A':<10} {'GEN FAIL':<8} {'':<8} {'❌ FAIL'}")
    
    print("-"*90)
    
    # Summary stats
    passed = sum(1 for r in results if r['passed'])
    gen_success = sum(1 for r in results if r['gen_success'])
    total_modules = sum(r['modules'] for r in results)
    total_errors = sum(r['errors'] for r in results if r['errors'] >= 0)
    total_warnings = sum(r['warnings'] for r in results if r['warnings'] >= 0)
    total_gen_time = sum(r['gen_time'] for r in results)
    
    print(f"\n📊 SUMMARY:")
    print(f"   Total time: {total_time/60:.1f} minutes")
    print(f"   Generation success: {gen_success}/10")
    print(f"   Validation pass: {passed}/10 ({passed*10}%)")
    print(f"   Total modules: {total_modules}")
    print(f"   Total errors: {total_errors}")
    print(f"   Total warnings: {total_warnings}")
    
    # Save results
    with open(BASE_DIR / "fresh_benchmark_results.json", "w") as f:
        json.dump({
            "timestamp": datetime.now().isoformat(),
            "total_time_s": total_time,
            "results": results,
            "summary": {
                "gen_success": gen_success,
                "passed": passed,
                "total_modules": total_modules,
                "total_errors": total_errors,
                "total_warnings": total_warnings
            }
        }, f, indent=2)
    
    print(f"\nResults saved to: {BASE_DIR}/fresh_benchmark_results.json")
    print("="*90)

if __name__ == "__main__":
    main()
