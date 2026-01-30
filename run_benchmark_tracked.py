#!/usr/bin/env python3
"""
Tracked Benchmark - Run documentation generation with comprehensive error tracking.

This script generates documentation for multiple repos and produces detailed
reports showing exactly why any failures occurred.

Usage:
    python run_benchmark_tracked.py [--repos repo1,repo2,...] [--limit N]
"""

import argparse
import json
import subprocess
import time
import os
import sys
from pathlib import Path
from dataclasses import dataclass, field, asdict
from typing import List, Dict, Any, Optional

# Repos to benchmark (small to medium size for reasonable run times)
DEFAULT_REPOS = [
    # Already generated - validate only
    ("KubeElasti", "https://github.com/truefoundry/KubeElasti.git", True),
    ("typer", "https://github.com/tiangolo/typer.git", True),
    ("httpx", "https://github.com/encode/httpx.git", True),
    ("rich", "https://github.com/Textualize/rich.git", True),
    ("fastapi", "https://github.com/tiangolo/fastapi.git", True),
    # Generate fresh
    ("flask", "https://github.com/pallets/flask.git", False),
    ("openai-realtime", None, False),  # Already cloned locally
    # Additional small repos for testing
    ("click", "https://github.com/pallets/click.git", False),
    ("pydantic", "https://github.com/pydantic/pydantic.git", False),
    ("requests", "https://github.com/psf/requests.git", False),
]

BASE_DIR = Path("/Users/shreyaspatel/atelier")
TEST_REPOS_DIR = BASE_DIR / "test_repos"
DEMO_REPOS_DIR = BASE_DIR / "demo" / "repos"
CODEWIKI_TEST_DIR = Path("/Users/shreyaspatel/CodeWiki/test_repos")


@dataclass
class RepoResult:
    """Result for a single repo benchmark."""
    repo_name: str
    success: bool = False
    
    # Timing
    generation_time_s: float = 0.0
    validation_time_s: float = 0.0
    
    # File stats
    repo_size_mb: float = 0.0
    source_files: int = 0
    
    # Module stats
    total_modules: int = 0
    modules_with_diagram: int = 0
    modules_with_title: int = 0
    modules_with_description: int = 0
    diagram_coverage_pct: float = 0.0
    
    # Validation
    validation_errors: int = 0
    validation_warnings: int = 0
    errors_by_type: Dict[str, int] = field(default_factory=dict)
    
    # Generation tracking
    llm_calls: int = 0
    llm_failures: int = 0
    total_tokens: int = 0
    estimated_cost: float = 0.0
    rate_limit_errors: int = 0
    context_exceeded: int = 0
    timeout_errors: int = 0
    
    # Files
    md_files_created: int = 0
    md_files_missing: int = 0
    missing_files: List[str] = field(default_factory=list)
    
    error_message: Optional[str] = None


def get_repo_size(path: Path) -> tuple:
    """Get repo size and source file count."""
    try:
        result = subprocess.run(
            ["du", "-sm", str(path)],
            capture_output=True, text=True, timeout=30
        )
        size_mb = float(result.stdout.split()[0]) if result.returncode == 0 else 0
    except:
        size_mb = 0
    
    # Count source files
    source_files = 0
    for ext in ['.py', '.js', '.ts', '.go', '.rs', '.java']:
        try:
            result = subprocess.run(
                f"find {path} -name '*{ext}' -type f 2>/dev/null | wc -l",
                shell=True, capture_output=True, text=True, timeout=60
            )
            source_files += int(result.stdout.strip())
        except:
            pass
    
    return size_mb, source_files


def clone_repo(name: str, url: str) -> bool:
    """Clone repo if needed."""
    repo_path = TEST_REPOS_DIR / name
    if repo_path.exists():
        print(f"  ✓ {name} already exists")
        return True
    
    # Check CodeWiki test_repos
    alt_path = CODEWIKI_TEST_DIR / name
    if alt_path.exists():
        print(f"  ✓ {name} found in CodeWiki test_repos")
        return True
    
    if not url:
        print(f"  ✗ {name} not found and no URL provided")
        return False
    
    print(f"  Cloning {name}...")
    result = subprocess.run(
        ["git", "clone", "--depth", "1", url, str(repo_path)],
        capture_output=True, text=True
    )
    return result.returncode == 0


def run_generation(name: str) -> tuple:
    """Run codewiki generate and return (time, success, error)."""
    # Find repo path
    repo_path = TEST_REPOS_DIR / name
    if not repo_path.exists():
        repo_path = CODEWIKI_TEST_DIR / name
    
    if not repo_path.exists():
        return 0, False, f"Repo not found: {name}"
    
    docs_path = repo_path / "docs"
    
    # Clean previous docs
    if docs_path.exists():
        subprocess.run(["rm", "-rf", str(docs_path)], capture_output=True)
    
    # Run generation
    cmd = f"source {BASE_DIR}/.venv/bin/activate && cd {repo_path} && codewiki generate --output docs 2>&1"
    
    print(f"  Running generation...")
    start = time.time()
    result = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=600)
    duration = time.time() - start
    
    if result.returncode != 0:
        error = result.stderr[-500:] if result.stderr else result.stdout[-500:]
        return duration, False, error
    
    return duration, True, ""


def run_validation(docs_path: Path) -> Dict:
    """Run validation and return results."""
    cmd = f"source {BASE_DIR}/.venv/bin/activate && python {BASE_DIR}/codewiki/src/be/validation.py {docs_path} 2>&1"
    
    result = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=60)
    
    # Parse output
    errors = 0
    warnings = 0
    errors_by_type = {}
    
    for line in result.stdout.split('\n'):
        if 'Errors:' in line:
            try:
                errors = int(line.split('Errors:')[1].split(',')[0].strip())
            except:
                pass
        if 'Warnings:' in line:
            try:
                warnings = int(line.split('Warnings:')[1].strip())
            except:
                pass
        
        # Parse error types
        for error_type in ['MISSING_DOCUMENTATION', 'MISSING_TITLE', 'MISSING_DESCRIPTION',
                          'MISSING_LEAF_DIAGRAM', 'MISSING_STRUCTURED_DIAGRAM', 'MISSING_OVERVIEW',
                          'MISSING_CHILD_NODE']:
            if error_type in line:
                errors_by_type[error_type] = errors_by_type.get(error_type, 0) + 1
    
    return {
        "errors": errors,
        "warnings": warnings,
        "errors_by_type": errors_by_type,
        "passed": errors == 0
    }


def load_generation_report(docs_path: Path) -> Optional[Dict]:
    """Load generation_report.json if exists."""
    report_path = docs_path / "generation_report.json"
    if report_path.exists():
        try:
            with open(report_path) as f:
                return json.load(f)
        except:
            pass
    return None


def analyze_module_tree(docs_path: Path) -> Dict:
    """Analyze module_tree.json for coverage stats."""
    tree_path = docs_path / "module_tree.json"
    if not tree_path.exists():
        return {}
    
    try:
        with open(tree_path) as f:
            tree = json.load(f)
    except:
        return {}
    
    stats = {
        "total": 0,
        "with_diagram": 0,
        "with_title": 0,
        "with_description": 0
    }
    
    def traverse(node):
        for key, data in node.items():
            stats["total"] += 1
            if data.get("diagram"):
                stats["with_diagram"] += 1
            if data.get("title"):
                stats["with_title"] += 1
            if data.get("description"):
                stats["with_description"] += 1
            if data.get("children"):
                traverse(data["children"])
    
    traverse(tree)
    
    stats["diagram_coverage_pct"] = (stats["with_diagram"] / max(stats["total"], 1)) * 100
    
    # Find missing md files
    md_files = {f.stem for f in docs_path.glob("*.md")}
    
    def collect_modules(node, modules=None):
        if modules is None:
            modules = set()
        for key in node.keys():
            modules.add(key)
            if node[key].get("children"):
                collect_modules(node[key]["children"], modules)
        return modules
    
    all_modules = collect_modules(tree)
    missing = all_modules - md_files - {"overview"}
    stats["missing_files"] = list(missing)
    
    return stats


def benchmark_repo(name: str, url: str, skip_generation: bool = False) -> RepoResult:
    """Benchmark a single repo."""
    result = RepoResult(repo_name=name)
    
    print(f"\n{'='*60}")
    print(f"Benchmarking: {name}")
    print(f"{'='*60}")
    
    # Find repo path
    repo_path = TEST_REPOS_DIR / name
    if not repo_path.exists():
        repo_path = CODEWIKI_TEST_DIR / name
    
    # Get repo stats
    if repo_path.exists():
        result.repo_size_mb, result.source_files = get_repo_size(repo_path)
        print(f"  Size: {result.repo_size_mb:.1f} MB, Files: {result.source_files}")
    
    # Determine docs path
    docs_path = repo_path / "docs" if repo_path.exists() else DEMO_REPOS_DIR / name
    
    # Run generation if needed
    if not skip_generation:
        if not clone_repo(name, url):
            result.error_message = "Failed to clone repo"
            return result
        
        gen_time, success, error = run_generation(name)
        result.generation_time_s = gen_time
        
        if not success:
            result.error_message = error
            print(f"  ✗ Generation failed: {error[:100]}...")
    else:
        # Use existing docs in demo/repos
        if (DEMO_REPOS_DIR / name).exists():
            docs_path = DEMO_REPOS_DIR / name
        print(f"  Using existing docs at {docs_path}")
    
    # Load generation report if exists
    gen_report = load_generation_report(docs_path)
    if gen_report:
        result.llm_calls = gen_report.get("summary", {}).get("total_llm_calls", 0)
        result.llm_failures = gen_report.get("summary", {}).get("failed_llm_calls", 0)
        result.total_tokens = gen_report.get("summary", {}).get("total_tokens", 0)
        result.estimated_cost = gen_report.get("summary", {}).get("estimated_cost_usd", 0)
        
        errors = gen_report.get("errors", {})
        result.rate_limit_errors = errors.get("rate_limit_count", 0)
        result.context_exceeded = errors.get("context_exceeded_count", 0)
        result.timeout_errors = errors.get("timeout_count", 0)
        
        files = gen_report.get("files", {})
        result.md_files_created = files.get("created", 0)
        result.md_files_missing = files.get("missing", 0)
        result.missing_files = files.get("missing_list", [])
    
    # Analyze module tree
    tree_stats = analyze_module_tree(docs_path)
    if tree_stats:
        result.total_modules = tree_stats.get("total", 0)
        result.modules_with_diagram = tree_stats.get("with_diagram", 0)
        result.modules_with_title = tree_stats.get("with_title", 0)
        result.modules_with_description = tree_stats.get("with_description", 0)
        result.diagram_coverage_pct = tree_stats.get("diagram_coverage_pct", 0)
        
        if not result.missing_files:
            result.missing_files = tree_stats.get("missing_files", [])
            result.md_files_missing = len(result.missing_files)
    
    # Run validation
    if docs_path.exists():
        print(f"  Running validation...")
        start = time.time()
        val_results = run_validation(docs_path)
        result.validation_time_s = time.time() - start
        
        result.validation_errors = val_results.get("errors", 0)
        result.validation_warnings = val_results.get("warnings", 0)
        result.errors_by_type = val_results.get("errors_by_type", {})
        result.success = val_results.get("passed", False)
    
    # Print summary
    status = "✓ PASSED" if result.success else "✗ FAILED"
    print(f"\n  {status}")
    print(f"  Modules: {result.total_modules}")
    print(f"  Diagram coverage: {result.diagram_coverage_pct:.1f}%")
    print(f"  Validation: {result.validation_errors} errors, {result.validation_warnings} warnings")
    if result.missing_files:
        print(f"  Missing files: {result.md_files_missing}")
    if result.rate_limit_errors:
        print(f"  ⚠ Rate limit errors: {result.rate_limit_errors}")
    if result.context_exceeded:
        print(f"  ⚠ Context exceeded: {result.context_exceeded}")
    
    return result


def print_final_report(results: List[RepoResult]):
    """Print comprehensive final report."""
    print("\n")
    print("=" * 100)
    print("                         COMPREHENSIVE BENCHMARK REPORT")
    print("=" * 100)
    
    # Summary table
    print("\n## Summary Table\n")
    header = f"{'Repo':<15} {'Size':<8} {'Modules':<8} {'Diag%':<8} {'Errors':<8} {'Warns':<8} {'Time':<10} {'Cost':<8} {'Status':<8}"
    print(header)
    print("-" * 100)
    
    total_errors = 0
    total_warnings = 0
    total_modules = 0
    total_cost = 0
    passed = 0
    
    for r in results:
        status = "PASS" if r.success else "FAIL"
        time_str = f"{r.generation_time_s:.0f}s" if r.generation_time_s else "N/A"
        cost_str = f"${r.estimated_cost:.2f}" if r.estimated_cost else "N/A"
        
        print(f"{r.repo_name:<15} {r.repo_size_mb:<8.1f} {r.total_modules:<8} {r.diagram_coverage_pct:<8.1f} "
              f"{r.validation_errors:<8} {r.validation_warnings:<8} {time_str:<10} {cost_str:<8} {status:<8}")
        
        total_errors += r.validation_errors
        total_warnings += r.validation_warnings
        total_modules += r.total_modules
        total_cost += r.estimated_cost
        if r.success:
            passed += 1
    
    print("-" * 100)
    print(f"{'TOTAL':<15} {'':<8} {total_modules:<8} {'':<8} {total_errors:<8} {total_warnings:<8} {'':<10} ${total_cost:<7.2f} {passed}/{len(results)}")
    
    # Error analysis
    print("\n\n## Error Analysis\n")
    
    all_errors = {}
    for r in results:
        for error_type, count in r.errors_by_type.items():
            all_errors[error_type] = all_errors.get(error_type, 0) + count
    
    if all_errors:
        print(f"{'Error Type':<40} {'Count':<10} {'% of Total':<15}")
        print("-" * 65)
        for error_type, count in sorted(all_errors.items(), key=lambda x: -x[1]):
            pct = count / max(total_errors, 1) * 100
            print(f"{error_type:<40} {count:<10} {pct:.1f}%")
    
    # LLM failures
    print("\n\n## LLM Failure Analysis\n")
    total_rate_limit = sum(r.rate_limit_errors for r in results)
    total_context = sum(r.context_exceeded for r in results)
    total_timeout = sum(r.timeout_errors for r in results)
    total_llm_failures = sum(r.llm_failures for r in results)
    
    print(f"Total LLM failures: {total_llm_failures}")
    print(f"  - Rate limit errors: {total_rate_limit}")
    print(f"  - Context exceeded: {total_context}")
    print(f"  - Timeout errors: {total_timeout}")
    
    # Missing files
    print("\n\n## Missing Documentation Files\n")
    all_missing = []
    for r in results:
        for f in r.missing_files[:5]:
            all_missing.append(f"{r.repo_name}: {f}")
    
    if all_missing:
        for m in all_missing[:20]:
            print(f"  - {m}")
        if len(all_missing) > 20:
            print(f"  ... and {len(all_missing) - 20} more")
    else:
        print("  None")
    
    # Recommendations
    print("\n\n## Recommendations\n")
    if total_rate_limit > 0:
        print("1. RATE LIMITS: Add exponential backoff and retry logic")
    if total_context > 0:
        print("2. CONTEXT EXCEEDED: Improve auto-splitting for large modules")
    if all_errors.get("MISSING_DOCUMENTATION", 0) > 10:
        print("3. MISSING DOCS: Fix module tree / file sync issue")
    if all_errors.get("MISSING_LEAF_DIAGRAM", 0) > 5:
        print("4. MISSING DIAGRAMS: Enforce diagram generation for all modules")
    
    print("\n" + "=" * 100)


def main():
    parser = argparse.ArgumentParser(description="Run tracked benchmark")
    parser.add_argument("--repos", type=str, help="Comma-separated list of repos")
    parser.add_argument("--limit", type=int, default=10, help="Limit number of repos")
    parser.add_argument("--skip-generation", action="store_true", help="Skip generation, validate only")
    args = parser.parse_args()
    
    # Determine repos to benchmark
    if args.repos:
        repo_names = args.repos.split(",")
        repos = [(name.strip(), None, True) for name in repo_names]
    else:
        repos = DEFAULT_REPOS[:args.limit]
    
    print(f"Benchmarking {len(repos)} repos...")
    
    results = []
    for name, url, skip_gen in repos:
        skip = args.skip_generation or skip_gen
        result = benchmark_repo(name, url, skip_generation=skip)
        results.append(result)
    
    # Print final report
    print_final_report(results)
    
    # Save results
    output_path = BASE_DIR / "benchmark_results_tracked.json"
    with open(output_path, 'w') as f:
        json.dump([asdict(r) for r in results], f, indent=2)
    print(f"\nResults saved to: {output_path}")


if __name__ == "__main__":
    main()
