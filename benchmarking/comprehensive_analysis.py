#!/usr/bin/env python3
"""
Comprehensive Repository Analysis
Agent 3 (Reliability) - Extended metrics collection

Collects: time, errors, warnings, file counts, repo size, module counts, diagram coverage
"""

import json
import subprocess
import time
from pathlib import Path
from dataclasses import dataclass, field, asdict
from typing import Optional, List, Dict, Any
import sys
import os

# Add codewiki to path
sys.path.insert(0, str(Path(__file__).parent))

from codewiki.src.be.validation import validate_docs, ValidationResult


@dataclass
class RepoMetrics:
    """Complete metrics for a repository."""
    repo_name: str
    repo_path: str
    docs_path: str
    
    # Size metrics
    repo_size_mb: float = 0.0
    docs_size_mb: float = 0.0
    source_file_count: int = 0
    doc_file_count: int = 0
    
    # Module metrics
    total_modules: int = 0
    modules_with_diagram: int = 0
    modules_with_title: int = 0
    modules_with_description: int = 0
    diagram_coverage_pct: float = 0.0
    
    # Validation metrics
    validation_time_ms: float = 0.0
    error_count: int = 0
    warning_count: int = 0
    errors_by_type: Dict[str, int] = field(default_factory=dict)
    warnings_by_type: Dict[str, int] = field(default_factory=dict)
    
    # Generation metrics (from benchmark if available)
    generation_time_s: Optional[float] = None
    estimated_cost_usd: Optional[float] = None
    
    # Status
    status: str = "unknown"
    error_message: Optional[str] = None


def get_dir_size_mb(path: Path) -> float:
    """Get directory size in MB."""
    try:
        result = subprocess.run(
            ["du", "-sm", str(path)],
            capture_output=True, text=True, timeout=30
        )
        if result.returncode == 0:
            return float(result.stdout.split()[0])
    except:
        pass
    return 0.0


def count_source_files(path: Path) -> int:
    """Count source code files in a repo."""
    extensions = ['.py', '.go', '.js', '.ts', '.tsx', '.jsx', '.rs', '.cpp', '.c', '.h', '.java']
    count = 0
    try:
        for ext in extensions:
            result = subprocess.run(
                f"find {path} -name '*{ext}' -type f 2>/dev/null | wc -l",
                shell=True, capture_output=True, text=True, timeout=60
            )
            if result.returncode == 0:
                count += int(result.stdout.strip())
    except:
        pass
    return count


def count_modules_in_tree(tree: Dict) -> Dict[str, int]:
    """Recursively count modules and their properties."""
    stats = {
        "total": 0,
        "with_diagram": 0,
        "with_title": 0,
        "with_description": 0,
    }
    
    def traverse(node: Dict):
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
    return stats


def analyze_repo(repo_name: str, docs_path: Path, repo_path: Optional[Path] = None) -> RepoMetrics:
    """Analyze a single repository."""
    metrics = RepoMetrics(
        repo_name=repo_name,
        repo_path=str(repo_path) if repo_path else "N/A",
        docs_path=str(docs_path)
    )
    
    # Check if docs exist
    if not docs_path.exists():
        metrics.status = "missing_docs"
        metrics.error_message = f"Docs path not found: {docs_path}"
        return metrics
    
    # Size metrics
    metrics.docs_size_mb = get_dir_size_mb(docs_path)
    if repo_path and repo_path.exists():
        metrics.repo_size_mb = get_dir_size_mb(repo_path)
        metrics.source_file_count = count_source_files(repo_path)
    
    # Count doc files
    metrics.doc_file_count = len(list(docs_path.glob("*.md")))
    
    # Load module tree
    tree_path = docs_path / "module_tree.json"
    if tree_path.exists():
        try:
            with open(tree_path) as f:
                tree = json.load(f)
            stats = count_modules_in_tree(tree)
            metrics.total_modules = stats["total"]
            metrics.modules_with_diagram = stats["with_diagram"]
            metrics.modules_with_title = stats["with_title"]
            metrics.modules_with_description = stats["with_description"]
            if stats["total"] > 0:
                metrics.diagram_coverage_pct = (stats["with_diagram"] / stats["total"]) * 100
        except Exception as e:
            metrics.error_message = f"Failed to parse module_tree.json: {e}"
    
    # Run validation
    start = time.time()
    try:
        result = validate_docs(docs_path)
        metrics.validation_time_ms = (time.time() - start) * 1000
        metrics.error_count = len(result.errors)
        metrics.warning_count = len(result.warnings)
        
        # Count by type
        for issue in result.errors:
            code = issue.code
            metrics.errors_by_type[code] = metrics.errors_by_type.get(code, 0) + 1
        for issue in result.warnings:
            code = issue.code
            metrics.warnings_by_type[code] = metrics.warnings_by_type.get(code, 0) + 1
        
        metrics.status = "passed" if result.passed else "failed"
    except Exception as e:
        metrics.validation_time_ms = (time.time() - start) * 1000
        metrics.status = "error"
        metrics.error_message = str(e)
    
    return metrics


def load_benchmark_data(benchmark_path: Path) -> Dict[str, Dict]:
    """Load benchmark results if available."""
    if not benchmark_path.exists():
        return {}
    try:
        with open(benchmark_path) as f:
            data = json.load(f)
        return {item["repo"]: item for item in data}
    except:
        return {}


def estimate_cost(generation_time_s: float, total_modules: int) -> float:
    """Estimate API cost based on generation time and module count.
    
    Rough estimate: ~$0.01 per module for Claude API calls
    """
    # Base cost per module (rough estimate)
    cost_per_module = 0.02  # $0.02 per module
    return total_modules * cost_per_module


def print_report(metrics_list: List[RepoMetrics], benchmark_data: Dict):
    """Print comprehensive report."""
    print("\n" + "=" * 100)
    print("                     CODEWIKI COMPREHENSIVE ANALYSIS REPORT")
    print("                     Agent 3 (Reliability) - Extended Metrics")
    print("=" * 100)
    
    # Summary table
    print("\n## Summary Table\n")
    print(f"{'Repo':<15} {'Size(MB)':<10} {'Files':<8} {'Modules':<10} {'Diagram%':<10} {'Errors':<8} {'Warns':<8} {'Time(s)':<10} {'Cost($)':<10} {'Status':<10}")
    print("-" * 100)
    
    total_errors = 0
    total_warnings = 0
    total_modules = 0
    
    for m in metrics_list:
        # Get benchmark data if available
        bench = benchmark_data.get(m.repo_name, {})
        gen_time = bench.get("time_s", m.generation_time_s)
        
        # Estimate cost
        cost = estimate_cost(gen_time or 0, m.total_modules) if gen_time else 0
        
        gen_time_str = f"{gen_time:.1f}" if gen_time else "N/A"
        cost_str = f"${cost:.2f}" if cost else "N/A"
        
        print(f"{m.repo_name:<15} {m.repo_size_mb:<10.1f} {m.source_file_count:<8} {m.total_modules:<10} {m.diagram_coverage_pct:<10.1f} {m.error_count:<8} {m.warning_count:<8} {gen_time_str:<10} {cost_str:<10} {m.status:<10}")
        
        total_errors += m.error_count
        total_warnings += m.warning_count
        total_modules += m.total_modules
    
    print("-" * 100)
    print(f"{'TOTAL':<15} {'':<10} {'':<8} {total_modules:<10} {'':<10} {total_errors:<8} {total_warnings:<8}")
    
    # Error breakdown
    print("\n\n## Error Breakdown by Type\n")
    all_error_types = {}
    for m in metrics_list:
        for code, count in m.errors_by_type.items():
            all_error_types[code] = all_error_types.get(code, 0) + count
    
    if all_error_types:
        print(f"{'Error Code':<35} {'Count':<10} {'% of Total':<15}")
        print("-" * 60)
        for code, count in sorted(all_error_types.items(), key=lambda x: -x[1]):
            pct = (count / total_errors * 100) if total_errors > 0 else 0
            print(f"{code:<35} {count:<10} {pct:.1f}%")
    
    # Warning breakdown
    print("\n\n## Warning Breakdown by Type\n")
    all_warning_types = {}
    for m in metrics_list:
        for code, count in m.warnings_by_type.items():
            all_warning_types[code] = all_warning_types.get(code, 0) + count
    
    if all_warning_types:
        print(f"{'Warning Code':<35} {'Count':<10} {'% of Total':<15}")
        print("-" * 60)
        for code, count in sorted(all_warning_types.items(), key=lambda x: -x[1]):
            pct = (count / total_warnings * 100) if total_warnings > 0 else 0
            print(f"{code:<35} {count:<10} {pct:.1f}%")
    
    # Detailed per-repo
    print("\n\n## Detailed Per-Repository Metrics\n")
    for m in metrics_list:
        bench = benchmark_data.get(m.repo_name, {})
        print(f"\n### {m.repo_name}")
        print(f"  - Repo Size: {m.repo_size_mb:.1f} MB")
        print(f"  - Source Files: {m.source_file_count}")
        print(f"  - Doc Files: {m.doc_file_count}")
        print(f"  - Total Modules: {m.total_modules}")
        print(f"  - Diagram Coverage: {m.diagram_coverage_pct:.1f}%")
        print(f"  - Title Coverage: {(m.modules_with_title / m.total_modules * 100):.1f}%" if m.total_modules > 0 else "  - Title Coverage: N/A")
        print(f"  - Description Coverage: {(m.modules_with_description / m.total_modules * 100):.1f}%" if m.total_modules > 0 else "  - Description Coverage: N/A")
        print(f"  - Validation Time: {m.validation_time_ms:.0f} ms")
        print(f"  - Errors: {m.error_count}")
        print(f"  - Warnings: {m.warning_count}")
        if bench:
            print(f"  - Generation Time: {bench.get('time_s', 'N/A'):.1f}s" if bench.get('time_s') else "  - Generation Time: N/A")
            est_cost = estimate_cost(bench.get('time_s', 0), m.total_modules)
            print(f"  - Estimated Cost: ${est_cost:.2f}")
        if m.error_message:
            print(f"  - Error: {m.error_message}")
    
    print("\n" + "=" * 100)
    
    return {
        "repos": [asdict(m) for m in metrics_list],
        "summary": {
            "total_repos": len(metrics_list),
            "total_modules": total_modules,
            "total_errors": total_errors,
            "total_warnings": total_warnings,
            "error_types": all_error_types,
            "warning_types": all_warning_types
        }
    }


def main():
    """Run comprehensive analysis."""
    base_path = Path(__file__).parent.parent
    bench_dir = Path(__file__).parent
    demo_repos = base_path / "demo" / "repos"
    repos_dir = bench_dir / "repos"
    benchmark_path = bench_dir / "benchmark_results.json"

    # Load benchmark data
    benchmark_data = load_benchmark_data(benchmark_path)

    # Define repos to analyze: demo repos (docs at root) + benchmarking/repos (docs in docs/)
    repos_to_analyze = []

    # Demo repos (docs at repo root)
    for repo_dir in demo_repos.iterdir():
        if repo_dir.is_dir():
            source_name = repo_dir.name
            if source_name == "flask-new":
                source_name = "flask"
            elif source_name == "flask":
                continue
            source_path = repos_dir / source_name
            repos_to_analyze.append({
                "name": repo_dir.name,
                "docs": repo_dir,
                "source": source_path if source_path.exists() else None
            })

    # Benchmarking repos (docs in <name>/docs)
    if repos_dir.exists():
        for repo_dir in repos_dir.iterdir():
            if repo_dir.is_dir():
                docs_path = repo_dir / "docs"
                if docs_path.exists() and (docs_path / "module_tree.json").exists():
                    if repo_dir.name not in [r["name"] for r in repos_to_analyze]:
                        repos_to_analyze.append({
                            "name": repo_dir.name,
                            "docs": docs_path,
                            "source": repo_dir
                        })
    
    print(f"Found {len(repos_to_analyze)} repos to analyze...")
    
    # Analyze each repo
    metrics_list = []
    for repo in repos_to_analyze:
        print(f"Analyzing {repo['name']}...")
        metrics = analyze_repo(repo['name'], repo['docs'], repo['source'])
        metrics_list.append(metrics)
    
    # Print report
    report = print_report(metrics_list, benchmark_data)
    
    # Save JSON report
    report_path = bench_dir / "comprehensive_analysis.json"
    with open(report_path, "w") as f:
        json.dump(report, f, indent=2)
    print(f"\nJSON report saved to: {report_path}")


if __name__ == "__main__":
    main()
