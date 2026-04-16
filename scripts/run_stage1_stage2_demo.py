#!/usr/bin/env python3
"""
Run Stage 1 (dependency analysis) + Stage 2 (one-shot clustering) only — no documentation (Stage 3).

Requires GEMINI_API_KEY for default Gemini cluster model.

Example:
  export GEMINI_API_KEY=...
  python scripts/run_stage1_stage2_demo.py crewai \\
    --repo /path/to/crewai/checkout \\
    --out /tmp/crewai-stage12
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import time

# Repo root on PYTHONPATH
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from codewiki.src.config import Config, OUTPUT_BASE_DIR, DEPENDENCY_GRAPHS_DIR, MAIN_MODEL, CLUSTER_MODEL
from codewiki.src.be.dependency_analyzer.dependency_graphs_builder import DependencyGraphBuilder
from codewiki.src.be.cluster_modules import cluster_modules


def main() -> int:
    p = argparse.ArgumentParser(description="Stage 1 + 2 only (clustering)")
    p.add_argument("name", help="Label for logging")
    p.add_argument("--repo", required=True, help="Path to cloned repository")
    p.add_argument("--out", required=True, help="Output directory for first_module_tree.json")
    args = p.parse_args()

    repo_path = os.path.abspath(args.repo)
    out_dir = os.path.abspath(args.out)
    os.makedirs(out_dir, exist_ok=True)

    if not os.getenv("GEMINI_API_KEY") and not os.getenv("LLM_API_KEY"):
        print("Warning: GEMINI_API_KEY or LLM_API_KEY not set; Gemini clustering may fail.", file=sys.stderr)

    config = Config(
        repo_path=repo_path,
        output_dir=OUTPUT_BASE_DIR,
        dependency_graph_dir=os.path.join(OUTPUT_BASE_DIR, DEPENDENCY_GRAPHS_DIR),
        docs_dir=out_dir,
        max_depth=10,
        llm_base_url=os.getenv("LLM_BASE_URL", "http://0.0.0.0:4000/"),
        llm_api_key=os.getenv("LLM_API_KEY") or os.getenv("OPENAI_API_KEY") or "",
        main_model=os.getenv("MAIN_MODEL", MAIN_MODEL),
        cluster_model=os.getenv("CLUSTER_MODEL", CLUSTER_MODEL),
    )

    print(f"[{args.name}] Stage 1: dependency graph…")
    t0 = time.time()
    builder = DependencyGraphBuilder(config)
    components, leaf_nodes, reachability = builder.build_dependency_graph()
    t1 = time.time()
    print(f"  components: {len(components)}, entry points: {len(leaf_nodes)} ({t1 - t0:.1f}s)")

    ep_path = os.path.join(out_dir, "entry_points.json")
    with open(ep_path, "w") as f:
        json.dump(
            [{"rank": i + 1, "id": ep, "reachability": reachability.get(ep, 0)} for i, ep in enumerate(leaf_nodes)],
            f,
            indent=2,
        )
    print(f"  wrote {ep_path}")

    print(f"[{args.name}] Stage 2: one-shot clustering (model={config.cluster_model})…")
    t2 = time.time()
    module_tree = cluster_modules(leaf_nodes, components, config)
    t3 = time.time()
    print(f"  top-level modules: {len(module_tree)} ({t3 - t2:.1f}s)")

    tree_path = os.path.join(out_dir, "first_module_tree.json")
    with open(tree_path, "w") as f:
        json.dump(module_tree, f, indent=2)
    print(f"  wrote {tree_path}")

    # Quick stats
    def count_leaves(tree: dict, depth: int = 0) -> int:
        n = 0
        for _k, info in tree.items():
            ch = info.get("children") or {}
            if ch:
                n += count_leaves(ch, depth + 1)
            else:
                n += 1
        return n

    leaves = count_leaves(module_tree)
    print(f"  leaf modules (approx doc slots): {leaves}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
