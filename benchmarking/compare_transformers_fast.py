#!/usr/bin/env python3
"""Compare agent vs 4-FAST module doc quality for transformers megamodules."""
from __future__ import annotations

import json
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO_ROOT))

from codewiki.src.be.diagram_ir_validator import validate_diagram_ir


def score_doc(path: Path) -> dict:
    data = json.loads(path.read_text())
    diag = data.get("diagram") or {}
    nodes = diag.get("nodes") or []
    edges = diag.get("edges") or []
    groups = diag.get("groups") or []
    ir = validate_diagram_ir(diag)
    labeled = sum(1 for n in nodes if (n.get("label") or "").strip())
    titled = sum(1 for n in nodes if (n.get("title") or "").strip())
    described = sum(1 for n in nodes if (n.get("description") or "").strip())
    return {
        "title": data.get("title"),
        "summary_len": len((data.get("summary") or "")),
        "nodes": len(nodes),
        "edges": len(edges),
        "groups": len(groups),
        "labeled_nodes": labeled,
        "titled_nodes": titled,
        "described_nodes": described,
        "ir_errors": len(ir.errors),
        "ir_warnings": len(ir.warnings),
        "ir_codes": [e.code for e in ir.errors[:5]],
        "file_bytes": path.stat().st_size,
    }


def main() -> int:
    baseline = REPO_ROOT / "benchmarking/transformers_agent_baseline"
    fast_dir = REPO_ROOT / "demo/repos/transformers-fast"
    modules = ["core_implementations", "model_conversion"]
    print("=== transformers agent (baseline) vs 4-FAST (transformers-fast) ===\n")
    for mod in modules:
        agent_p = baseline / f"{mod}.json"
        fast_p = fast_dir / f"{mod}.json"
        print(f"## {mod}")
        if not agent_p.is_file():
            print("  agent baseline: MISSING")
        else:
            a = score_doc(agent_p)
            print(f"  agent:  nodes={a['nodes']} edges={a['edges']} groups={a['groups']} "
                  f"summary={a['summary_len']}c ir_err={a['ir_errors']} bytes={a['file_bytes']}")
        if not fast_p.is_file():
            print("  fast:     MISSING (regen not done?)")
        else:
            f = score_doc(fast_p)
            print(f"  fast:   nodes={f['nodes']} edges={f['edges']} groups={f['groups']} "
                  f"summary={f['summary_len']}c ir_err={f['ir_errors']} bytes={f['file_bytes']}")
            if agent_p.is_file():
                a = score_doc(agent_p)
                print(f"  delta:  nodes {f['nodes']-a['nodes']:+d} edges {f['edges']-a['edges']:+d} "
                      f"summary {f['summary_len']-a['summary_len']:+d}c bytes {f['file_bytes']-a['file_bytes']:+d}")
        print()
    gm = fast_dir / "generation_metrics.json"
    if gm.is_file():
        m = json.loads(gm.read_text())
        print(f"fast run total_duration: {m.get('total_duration')}s doc_gen: "
              f"{(m.get('stages') or {}).get('Documentation Generation', {}).get('duration')}s")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
