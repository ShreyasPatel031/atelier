#!/usr/bin/env python3
"""Parallel scan of demo/repos/*/ — metrics, metadata, module_tree quality. No LLM."""

from __future__ import annotations

import argparse
import json
import re
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from typing import Any, Dict, List, Optional

ROOT = Path(__file__).resolve().parents[1]
DEMO_REPOS = ROOT / "demo" / "repos"
INDEX_JSON = DEMO_REPOS / "index.json"


def _extract_diagram_json(md_text: str) -> Optional[dict]:
    m = re.search(r"<!--\s*DIAGRAM_JSON\s*([\s\S]*?)-->", md_text or "")
    if not m:
        return None
    try:
        return json.loads(m.group(1))
    except json.JSONDecodeError:
        return None


def _count_modules(tree: dict) -> int:
    n = 0
    for _k, v in tree.items():
        if not isinstance(v, dict):
            continue
        n += 1
        ch = v.get("children")
        if isinstance(ch, dict):
            n += _count_modules(ch)
    return n


def _module_keys(tree: dict, out: Optional[set] = None) -> set:
    out = out if out is not None else set()
    for k, v in tree.items():
        if not isinstance(v, dict):
            continue
        out.add(k)
        ch = v.get("children")
        if isinstance(ch, dict):
            _module_keys(ch, out)
    return out


def analyze_slug(slug: str, repo_root: Path) -> Dict[str, Any]:
    t0 = time.perf_counter()
    row: Dict[str, Any] = {
        "slug": slug,
        "scan_seconds": 0.0,
        "error": None,
        "md_documents": 0,
        "overview_diagram_json": False,
        "overview_nodes": None,
        "module_tree_modules": None,
        "diagram_coverage_pct": None,
        "missing_md_vs_tree": None,
        "metrics_present": False,
        "generation_stages_seconds": {},
        "documentation_generation_seconds": None,
        "total_pipeline_seconds": None,
        "generation_timestamp": None,
        "main_model": None,
    }
    try:
        if not repo_root.is_dir():
            row["error"] = "not_a_directory"
            return row
        md_files = list(repo_root.glob("*.md"))
        row["md_documents"] = len(md_files)
        ov = repo_root / "overview.md"
        if ov.is_file():
            dj = _extract_diagram_json(ov.read_text(encoding="utf8", errors="replace"))
            if dj:
                row["overview_diagram_json"] = True
                row["overview_nodes"] = len(dj.get("nodes") or [])
        mt_path = repo_root / "module_tree.json"
        if mt_path.is_file():
            tree = json.loads(mt_path.read_text(encoding="utf8"))
            row["module_tree_modules"] = _count_modules(tree)
            with_diag = 0
            stack: List[dict] = [tree]
            while stack:
                node = stack.pop()
                for _k, v in node.items():
                    if not isinstance(v, dict):
                        continue
                    dig = v.get("diagram")
                    if isinstance(dig, dict) and isinstance(dig.get("nodes"), list):
                        with_diag += 1
                    ch = v.get("children")
                    if isinstance(ch, dict):
                        stack.append(ch)
            total_mod = row["module_tree_modules"] or 0
            row["diagram_coverage_pct"] = round(
                (with_diag / total_mod * 100.0) if total_mod else 0.0, 2
            )
            stems = {p.stem for p in md_files}
            missing = len(sorted(_module_keys(tree) - stems - {"overview"}))
            row["missing_md_vs_tree"] = missing
        mp = repo_root / "metrics.json"
        if mp.is_file():
            row["metrics_present"] = True
            met = json.loads(mp.read_text(encoding="utf8"))
            stages = met.get("stages") or {}
            if isinstance(stages, dict):
                for name, info in stages.items():
                    if isinstance(info, dict) and info.get("duration") is not None:
                        row["generation_stages_seconds"][name] = round(float(info["duration"]), 3)
                dg = stages.get("Documentation Generation") or {}
                if isinstance(dg, dict) and dg.get("duration") is not None:
                    row["documentation_generation_seconds"] = round(float(dg["duration"]), 3)
            if met.get("total_duration") is not None:
                row["total_pipeline_seconds"] = round(float(met["total_duration"]), 3)
        meta = repo_root / "metadata.json"
        if meta.is_file():
            m = json.loads(meta.read_text(encoding="utf8"))
            gi = m.get("generation_info") or {}
            row["generation_timestamp"] = gi.get("timestamp")
            row["main_model"] = gi.get("main_model")
    except Exception as e:
        row["error"] = f"{type(e).__name__}: {e}"
    finally:
        row["scan_seconds"] = round(time.perf_counter() - t0, 4)
    return row


def quality_score(r: Dict[str, Any]) -> float:
    if r.get("error"):
        return 0.0
    s = 0.0
    if r.get("overview_diagram_json"):
        s += 25
    if r.get("diagram_coverage_pct") is not None:
        s += min(50.0, float(r["diagram_coverage_pct"]) * 0.5)
    m = r.get("missing_md_vs_tree")
    if m == 0:
        s += 15
    elif isinstance(m, int):
        s += max(0.0, 15.0 - min(15.0, m * 0.5))
    if r.get("metrics_present"):
        s += 10
    return round(min(100.0, s), 1)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--workers", type=int, default=8)
    ap.add_argument("--include-fixture", action="store_true")
    args = ap.parse_args()

    if INDEX_JSON.is_file():
        slugs = [e["id"] for e in json.loads(INDEX_JSON.read_text(encoding="utf8"))]
    else:
        slugs = sorted(p.name for p in DEMO_REPOS.iterdir() if p.is_dir())
    if not args.include_fixture:
        slugs = [s for s in slugs if s != "rf-expand-fixture"]

    t_wall = time.perf_counter()
    results: List[Dict[str, Any]] = []
    with ThreadPoolExecutor(max_workers=max(1, args.workers)) as ex:
        futs = {ex.submit(analyze_slug, s, DEMO_REPOS / s): s for s in slugs}
        for fut in as_completed(futs):
            results.append(fut.result())
    results.sort(key=lambda r: r["slug"])
    wall = time.perf_counter() - t_wall
    for r in results:
        r["quality_score_heuristic"] = quality_score(r)

    out = Path(__file__).parent / "demo_repos_parallel_scan.json"
    summary = {
        "parallel_wall_seconds": round(wall, 4),
        "workers": args.workers,
        "repo_count": len(results),
        "total_md_documents": sum(r.get("md_documents") or 0 for r in results),
        "total_pipeline_seconds_sum": sum(
            r.get("total_pipeline_seconds") or 0 for r in results if r.get("total_pipeline_seconds")
        ),
        "repos": results,
    }
    out.write_text(json.dumps(summary, indent=2), encoding="utf8")

    print("demo/repos parallel scan")
    print(f"Repos: {len(results)}  workers: {args.workers}  scan wall: {wall:.3f}s")
    print(f"Total .md files: {summary['total_md_documents']}")
    tp = summary["total_pipeline_seconds_sum"]
    print(f"Sum metrics total_duration: {tp:.0f}s ({tp/3600:.2f} h) — historical per-repo generation, not scan time")
    print(f"Wrote {out}\n")
    hdr = f"{'slug':<16} {'md':>5} {'mods':>5} {'diag%':>7} {'miss':>5} {'pipe(s)':>9} {'docGen':>9} {'Q':>5}"
    print(hdr)
    print("-" * len(hdr))
    for r in results:
        print(
            f"{r['slug']:<16} {r.get('md_documents') or 0:>5} "
            f"{r.get('module_tree_modules') or 0:>5} "
            f"{(r.get('diagram_coverage_pct') or 0):>7.1f} "
            f"{(r.get('missing_md_vs_tree') if r.get('missing_md_vs_tree') is not None else -1):>5} "
            f"{(r.get('total_pipeline_seconds') or -1):>9} "
            f"{(r.get('documentation_generation_seconds') or -1):>9} "
            f"{r.get('quality_score_heuristic', 0):>5.1f}"
        )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
