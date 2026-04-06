#!/usr/bin/env python3
"""
Batch metrics for Stage 4.5 (doc sync) vs Stage 3 output.

Default: read-only presync audit for each repo folder under --base (no file changes).

With --run-sync: runs run_full_sync (mutates module_tree.json, creates placeholders, etc.).

With --deep-mermaid: sets CODEWIKI_SYNC_DEEP_MERMAID=1 for full sync so mermaid_validator runs per block.

Example (local demo bundles, no API calls):

  python scripts/batch_sync_metrics.py --base demo/repos \\
    crewai dspy ollama transformers langchain pydantic-ai

After a full codewiki generate into e.g. tmp/myrepo/docs:

  python scripts/batch_sync_metrics.py --run-sync --deep-mermaid --base tmp/myrepo_parent myrepo
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path
from typing import Any, Dict, List


def _repo_root() -> Path:
    return Path(__file__).resolve().parents[1]


def main() -> int:
    ap = argparse.ArgumentParser(description="Batch presync/sync metrics for CodeWiki docs dirs")
    ap.add_argument(
        "--base",
        type=Path,
        default=_repo_root() / "demo" / "repos",
        help="Directory containing one folder per repo (each with module_tree.json)",
    )
    ap.add_argument(
        "slugs",
        nargs="*",
        default=["crewai", "dspy", "ollama", "transformers", "langchain", "pydantic-ai"],
        help="Subfolder names under --base",
    )
    ap.add_argument(
        "--run-sync",
        action="store_true",
        help="Run full run_full_sync (writes files; use on a copy if experimenting)",
    )
    ap.add_argument(
        "--deep-mermaid",
        action="store_true",
        help="Enable deep mermaid validation (slower; export CODEWIKI_SYNC_DEEP_MERMAID=1)",
    )
    ap.add_argument(
        "-o",
        "--output",
        type=Path,
        default=None,
        help="Write JSON summary to this path (default: batch_sync_metrics.json in cwd)",
    )
    ap.add_argument(
        "--mermaid-bench",
        action="store_true",
        help="Run mermaid heuristic+deep validation only (no tree mutation); pairs with --deep-mermaid",
    )
    args = ap.parse_args()

    if args.deep_mermaid:
        os.environ["CODEWIKI_SYNC_DEEP_MERMAID"] = "1"

    sys.path.insert(0, str(_repo_root()))

    from datetime import datetime

    from codewiki.src.be.doc_file_sync import (
        SyncReport,
        audit_docs_state,
        run_full_sync,
        validate_mermaid_diagrams,
    )

    base: Path = args.base
    out_rows: List[Dict[str, Any]] = []

    for slug in args.slugs:
        docs_dir = base / slug
        row: Dict[str, Any] = {"slug": slug, "docs_dir": str(docs_dir)}
        if not (docs_dir / "module_tree.json").exists():
            row["error"] = "no module_tree.json"
            out_rows.append(row)
            continue

        row["presync_audit"] = audit_docs_state(str(docs_dir))

        if args.mermaid_bench:
            bench_report = SyncReport(
                docs_dir=str(docs_dir),
                timestamp=datetime.now().isoformat(),
            )
            row["mermaid_bench"] = validate_mermaid_diagrams(
                str(docs_dir),
                bench_report,
                deep_validate=args.deep_mermaid or None,
            )

        if args.run_sync:
            row["sync_result"] = run_full_sync(str(docs_dir), components=None, repo_name=slug)
        out_rows.append(row)

    summary_path = args.output or Path("batch_sync_metrics.json")
    summary_path.write_text(json.dumps(out_rows, indent=2), encoding="utf-8")
    print(f"Wrote {summary_path} ({len(out_rows)} entries)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
