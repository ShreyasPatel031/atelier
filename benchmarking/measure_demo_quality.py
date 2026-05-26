#!/usr/bin/env python3
"""
Aggregate validation + sync_issues quality metrics for demo/repos/*.

Usage (from repo root):
  python benchmarking/measure_demo_quality.py
  python benchmarking/measure_demo_quality.py --json benchmarking/demo_quality_report.json
"""
from __future__ import annotations

import argparse
import json
import sys
from collections import Counter
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO_ROOT))

from codewiki.src.be.validation import validate_docs  # noqa: E402

DEMO_REPOS = REPO_ROOT / "demo" / "repos"

# Repos in demo viewer index (include minirepo if present)
DEFAULT_REPOS = [
    "crewai",
    "dspy",
    "langchain",
    "minirepo",
    "ollama",
    "persona-selection-model",
    "pydantic-ai",
    "transformers",
]


def _load_sync_issues(docs_path: Path) -> dict | None:
    p = docs_path / "sync_issues.json"
    if not p.is_file():
        return None
    return json.loads(p.read_text(encoding="utf-8"))


def measure_repo(name: str) -> dict:
    docs_path = DEMO_REPOS / name
    out: dict = {"repo": name, "docs_exist": docs_path.is_dir()}

    if not docs_path.is_dir():
        out["status"] = "missing"
        return out

    mt = docs_path / "module_tree.json"
    if not mt.is_file():
        out["status"] = "no_module_tree"
        return out

    vr = validate_docs(docs_path)
    out["validation_passed"] = vr.passed
    out["validation_errors"] = len(vr.errors)
    out["validation_warnings"] = len(vr.warnings)

    si = _load_sync_issues(docs_path)
    if not si:
        out["sync_issues"] = None
        out["status"] = "no_sync_issues"
        return out

    summary = si.get("summary", {})
    out["sync_total_issues"] = summary.get("total_issues", 0)
    out["sync_errors"] = summary.get("errors", 0)
    out["sync_warnings"] = summary.get("warnings", 0)
    out["metadata_added"] = summary.get("metadata_added", 0)
    out["files_created"] = summary.get("files_created", 0)

    presync = si.get("metrics", {}).get("presync_audit", {})
    out["presync_missing_title"] = presync.get("missing_title", 0)
    out["presync_missing_description"] = presync.get("missing_description", 0)
    out["presync_invalid_json"] = presync.get("invalid_module_json_parse", 0)

    ir = si.get("metrics", {}).get("diagram_ir_audit", {})
    out["diagram_ir_by_code"] = ir.get("by_code", {})

    issues = si.get("issues", [])
    by_type = Counter(i.get("issue_type") for i in issues)
    out["issues_by_type"] = dict(by_type.most_common())
    auto_fixed = sum(1 for i in issues if i.get("auto_fixed"))
    not_fixed = len(issues) - auto_fixed
    out["issues_auto_fixed"] = auto_fixed
    out["issues_not_auto_fixed"] = not_fixed

    out["status"] = "ok" if vr.passed and summary.get("errors", 0) == 0 else "problems"
    return out


def main() -> int:
    p = argparse.ArgumentParser()
    p.add_argument("--json", type=str, default=None, help="Write full report JSON here")
    p.add_argument("--only", nargs="*", default=None)
    args = p.parse_args()

    names = DEFAULT_REPOS
    if args.only:
        names = [n for n in names if n in set(args.only)]

    rows = [measure_repo(n) for n in names]
    report = {"repos": rows}

    # Console table
    print(f"\n{'Repo':<26} {'Val':^5} {'Sync':>5} {'Err':>4} {'Warn':>5} {'Meta+':>6} {'JSON':>4} {'Title':>5} {'Desc':>5} {'IR issues'}")
    print("-" * 100)
    for r in rows:
        if r.get("status") in ("missing", "no_module_tree", "no_sync_issues"):
            print(f"{r['repo']:<26} {r.get('status', '?'):<40}")
            continue
        ir = r.get("diagram_ir_by_code") or {}
        ir_str = ", ".join(f"{k}:{v}" for k, v in sorted(ir.items())[:4]) or "-"
        print(
            f"{r['repo']:<26} "
            f"{'✓' if r.get('validation_passed') else '✗':^5} "
            f"{r.get('sync_total_issues', 0):>5} "
            f"{r.get('sync_errors', 0):>4} "
            f"{r.get('sync_warnings', 0):>5} "
            f"{r.get('metadata_added', 0):>6} "
            f"{r.get('presync_invalid_json', 0):>4} "
            f"{r.get('presync_missing_title', 0):>5} "
            f"{r.get('presync_missing_description', 0):>5} "
            f"{ir_str}"
        )

    problems = [r for r in rows if r.get("status") == "problems" or not r.get("validation_passed", True)]
    print(f"\n{len(rows) - len(problems)}/{len(rows)} repos clean (validation pass + 0 sync errors)")
    if problems:
        print("Needs attention:")
        for r in problems:
            print(f"  - {r['repo']}: val_err={r.get('validation_errors')} sync_err={r.get('sync_errors')} "
                  f"not_fixed={r.get('issues_not_auto_fixed')}")

    if args.json:
        Path(args.json).write_text(json.dumps(report, indent=2), encoding="utf-8")
        print(f"\nWrote {args.json}")

    return 1 if problems else 0


if __name__ == "__main__":
    raise SystemExit(main())
