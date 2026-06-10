#!/usr/bin/env python3
"""
Post-generation quality audit for all demo repos.

Measures diagram IR quality beyond pass/fail validation:
  - First-pass rate (modules with valid doc on first generation attempt)
  - Tooltip completeness (title / description on nodes and groups)
  - Grouping quality (ungrouped nodes, oversized groups)
  - Edge integrity (dangling endpoints, edges to group ids)
  - Structural issues (empty groups, duplicate ids, id/group collisions)
  - Label quality (CamelCase or id-as-label violations)

Usage:
    python benchmarking/quality_audit.py                     # all repos
    python benchmarking/quality_audit.py --only dspy crewai  # subset
    python benchmarking/quality_audit.py --json               # machine-readable
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from collections import Counter
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
DEMO_REPOS = REPO_ROOT / "demo" / "repos"

_CAMEL_RE = re.compile(r"^[A-Z][a-z]+(?:[A-Z][a-z]+)+$")


def _is_bad_label(label: str, node_id: str) -> str | None:
    s = (label or "").strip()
    if not s:
        return "empty"
    if s == node_id:
        return "id_as_label"
    if _CAMEL_RE.match(s):
        return "camelcase"
    if "_" in s and " " not in s and len(s) > 3:
        return "snake_case"
    return None


def audit_diagram(diagram: dict, module_name: str) -> dict:
    """Audit a single diagram IR dict. Returns a flat metrics dict."""
    m: dict = {
        "module": module_name,
        "nodes": 0,
        "edges": 0,
        "groups": 0,
        "nodes_missing_title": 0,
        "nodes_missing_description": 0,
        "nodes_bad_label": [],
        "groups_missing_title": 0,
        "groups_missing_description": 0,
        "ungrouped_nodes": 0,
        "oversized_groups": [],
        "empty_groups": 0,
        "dangling_edge_sources": 0,
        "dangling_edge_targets": 0,
        "edge_to_group_id": 0,
        "edges_missing_label": 0,
        "duplicate_node_ids": 0,
        "duplicate_group_ids": 0,
        "node_group_id_collisions": 0,
        "intra_group_edges": 0,
        "cross_group_edges": 0,
    }

    if not diagram or not isinstance(diagram, dict):
        return m

    nodes = diagram.get("nodes") or []
    edges = diagram.get("edges") or []
    groups = diagram.get("groups") or []

    m["nodes"] = len(nodes)
    m["edges"] = len(edges)
    m["groups"] = len(groups)

    node_ids = set()
    node_id_counts: Counter = Counter()
    for n in nodes:
        if not isinstance(n, dict):
            continue
        nid = str(n.get("id", ""))
        node_ids.add(nid)
        node_id_counts[nid] += 1
        if not (n.get("title") or "").strip():
            m["nodes_missing_title"] += 1
        if not (n.get("description") or "").strip():
            m["nodes_missing_description"] += 1
        bad = _is_bad_label(n.get("label", ""), nid)
        if bad:
            m["nodes_bad_label"].append({"id": nid, "label": n.get("label", ""), "reason": bad})

    m["duplicate_node_ids"] = sum(1 for c in node_id_counts.values() if c > 1)

    group_ids = set()
    group_id_counts: Counter = Counter()
    grouped_nodes: set = set()
    for g in groups:
        if not isinstance(g, dict):
            continue
        gid = str(g.get("id", ""))
        group_ids.add(gid)
        group_id_counts[gid] += 1
        members = g.get("nodes") or []
        if not members:
            m["empty_groups"] += 1
        if len(members) > 5:
            m["oversized_groups"].append({"group": gid, "count": len(members)})
        for mid in members:
            grouped_nodes.add(str(mid))
        if not (g.get("title") or "").strip():
            m["groups_missing_title"] += 1
        if not (g.get("description") or "").strip():
            m["groups_missing_description"] += 1

    m["duplicate_group_ids"] = sum(1 for c in group_id_counts.values() if c > 1)
    m["node_group_id_collisions"] = len(node_ids & group_ids)

    internal_nodes = {nid for nid in node_ids if any(
        isinstance(n, dict) and str(n.get("id", "")) == nid and n.get("type") != "external"
        for n in nodes
    )}
    ungrouped = internal_nodes - grouped_nodes
    m["ungrouped_nodes"] = len(ungrouped)

    member_to_group: dict[str, str] = {}
    for g in groups:
        if not isinstance(g, dict):
            continue
        gid = str(g.get("id", ""))
        for mid in (g.get("nodes") or []):
            member_to_group[str(mid)] = gid

    for e in edges:
        if not isinstance(e, dict):
            continue
        src = str(e.get("source", "")).strip()
        tgt = str(e.get("target", "")).strip()
        if not (e.get("label") or "").strip():
            m["edges_missing_label"] += 1
        if src and src not in node_ids:
            if src in group_ids:
                m["edge_to_group_id"] += 1
            else:
                m["dangling_edge_sources"] += 1
        if tgt and tgt not in node_ids:
            if tgt in group_ids:
                m["edge_to_group_id"] += 1
            else:
                m["dangling_edge_targets"] += 1
        gs = member_to_group.get(src)
        gt = member_to_group.get(tgt)
        if gs and gt:
            if gs == gt:
                m["intra_group_edges"] += 1
            else:
                m["cross_group_edges"] += 1

    return m


def audit_repo(repo_name: str) -> dict:
    """Audit all diagrams in a demo repo. Returns repo-level metrics."""
    repo_path = DEMO_REPOS / repo_name
    tree_path = repo_path / "module_tree.json"

    result = {
        "repo": repo_name,
        "has_module_tree": tree_path.exists(),
        "has_overview": False,
        "total_modules": 0,
        "modules_with_doc": 0,
        "modules_missing_doc": 0,
        "modules_with_diagram": 0,
        "modules_missing_diagram": 0,
        "first_pass_rate": 0.0,
        "diagrams": [],
        "aggregate": {},
    }

    if not tree_path.exists():
        return result

    tree = json.loads(tree_path.read_text())

    overview_path = repo_path / "overview.json"
    if overview_path.exists():
        result["has_overview"] = True
        try:
            ov = json.loads(overview_path.read_text())
            diag = ov.get("diagram", {})
            result["diagrams"].append(audit_diagram(diag, "__overview__"))
        except Exception:
            pass

    def walk_tree(subtree: dict, path: str = ""):
        for name, data in subtree.items():
            if name.startswith("__") and name.endswith("__"):
                continue
            full = f"{path}.{name}" if path else name
            result["total_modules"] += 1

            doc_path = repo_path / f"{name}.json"
            md_path = repo_path / f"{name}.md"
            has_doc = doc_path.exists() or md_path.exists()
            if has_doc:
                result["modules_with_doc"] += 1
            else:
                result["modules_missing_doc"] += 1

            diag = data.get("diagram")
            if diag:
                result["modules_with_diagram"] += 1
                result["diagrams"].append(audit_diagram(diag, name))
            else:
                result["modules_missing_diagram"] += 1

            children = data.get("children", {})
            if children:
                walk_tree(children, full)

    walk_tree(tree)

    if result["total_modules"] > 0:
        result["first_pass_rate"] = round(
            result["modules_with_doc"] / result["total_modules"] * 100, 1
        )

    agg_keys = [
        "nodes", "edges", "groups",
        "nodes_missing_title", "nodes_missing_description",
        "groups_missing_title", "groups_missing_description",
        "ungrouped_nodes", "empty_groups",
        "dangling_edge_sources", "dangling_edge_targets",
        "edge_to_group_id", "edges_missing_label",
        "duplicate_node_ids", "duplicate_group_ids",
        "node_group_id_collisions",
        "intra_group_edges", "cross_group_edges",
    ]
    agg: dict = {k: 0 for k in agg_keys}
    oversized_total = 0
    bad_labels_total = 0
    for d in result["diagrams"]:
        for k in agg_keys:
            agg[k] += d.get(k, 0)
        oversized_total += len(d.get("oversized_groups", []))
        bad_labels_total += len(d.get("nodes_bad_label", []))
    agg["oversized_groups"] = oversized_total
    agg["bad_labels"] = bad_labels_total
    result["aggregate"] = agg

    return result


def print_report(results: list[dict]):
    divider = "=" * 80

    print(f"\n{divider}")
    print("  QUALITY AUDIT — ALL DEMO REPOS")
    print(divider)

    summary_rows = []
    for r in results:
        a = r["aggregate"]
        errors = (
            a.get("dangling_edge_sources", 0) +
            a.get("dangling_edge_targets", 0) +
            a.get("edge_to_group_id", 0) +
            a.get("duplicate_node_ids", 0) +
            a.get("duplicate_group_ids", 0) +
            a.get("node_group_id_collisions", 0) +
            a.get("empty_groups", 0)
        )
        summary_rows.append({
            "repo": r["repo"],
            "modules": r["total_modules"],
            "with_doc": r["modules_with_doc"],
            "first_pass": f'{r["first_pass_rate"]}%',
            "diagrams": len(r["diagrams"]),
            "nodes": a.get("nodes", 0),
            "edges": a.get("edges", 0),
            "groups": a.get("groups", 0),
            "errors": errors,
        })

    headers = ["repo", "modules", "with_doc", "first_pass", "diagrams", "nodes", "edges", "groups", "errors"]
    widths = {h: max(len(h), max((len(str(row[h])) for row in summary_rows), default=0)) for h in headers}
    hdr = " | ".join(h.ljust(widths[h]) for h in headers)
    sep = "-+-".join("-" * widths[h] for h in headers)
    print(f"\n{hdr}")
    print(sep)
    for row in summary_rows:
        print(" | ".join(str(row[h]).ljust(widths[h]) for h in headers))

    print(f"\n{divider}")
    print("  DETAILED QUALITY METRICS PER REPO")
    print(divider)

    for r in results:
        a = r["aggregate"]
        print(f"\n--- {r['repo']} ---")
        print(f"  Modules: {r['total_modules']}  |  With doc: {r['modules_with_doc']}  |  Missing doc: {r['modules_missing_doc']}")
        print(f"  First-pass rate: {r['first_pass_rate']}%")
        print(f"  Has overview: {r['has_overview']}  |  Has module_tree: {r['has_module_tree']}")

        print(f"\n  TOOLTIP COMPLETENESS:")
        print(f"    Nodes missing title:       {a.get('nodes_missing_title', 0)}")
        print(f"    Nodes missing description: {a.get('nodes_missing_description', 0)}")
        print(f"    Groups missing title:      {a.get('groups_missing_title', 0)}")
        print(f"    Groups missing description:{a.get('groups_missing_description', 0)}")

        print(f"\n  GROUPING QUALITY:")
        print(f"    Total ungrouped nodes:     {a.get('ungrouped_nodes', 0)}")
        print(f"    Oversized groups (>5):     {a.get('oversized_groups', 0)}")
        print(f"    Empty groups:              {a.get('empty_groups', 0)}")

        print(f"\n  EDGE INTEGRITY:")
        print(f"    Dangling sources:          {a.get('dangling_edge_sources', 0)}")
        print(f"    Dangling targets:          {a.get('dangling_edge_targets', 0)}")
        print(f"    Edges to group IDs:        {a.get('edge_to_group_id', 0)}")
        print(f"    Edges missing label:       {a.get('edges_missing_label', 0)}")
        print(f"    Intra-group edges:         {a.get('intra_group_edges', 0)}")
        print(f"    Cross-group edges:         {a.get('cross_group_edges', 0)}")

        print(f"\n  STRUCTURAL:")
        print(f"    Duplicate node IDs:        {a.get('duplicate_node_ids', 0)}")
        print(f"    Duplicate group IDs:       {a.get('duplicate_group_ids', 0)}")
        print(f"    Node/group ID collisions:  {a.get('node_group_id_collisions', 0)}")
        print(f"    Bad labels (CamelCase/id): {a.get('bad_labels', 0)}")

        worst = sorted(
            r["diagrams"],
            key=lambda d: d.get("ungrouped_nodes", 0),
            reverse=True,
        )[:3]
        if worst and worst[0].get("ungrouped_nodes", 0) > 0:
            print(f"\n  WORST UNGROUPED:")
            for d in worst:
                if d["ungrouped_nodes"] > 0:
                    print(f"    {d['module']}: {d['ungrouped_nodes']} ungrouped / {d['nodes']} nodes")

        worst_oversized = [
            d for d in r["diagrams"]
            if d.get("oversized_groups")
        ]
        if worst_oversized:
            print(f"\n  WORST OVERSIZED GROUPS:")
            for d in worst_oversized[:3]:
                for og in d["oversized_groups"]:
                    print(f"    {d['module']}.{og['group']}: {og['count']} nodes")

    print(f"\n{divider}")
    all_agg = {k: sum(r["aggregate"].get(k, 0) for r in results) for k in [
        "nodes", "edges", "groups",
        "nodes_missing_title", "nodes_missing_description",
        "groups_missing_title", "groups_missing_description",
        "ungrouped_nodes", "oversized_groups", "empty_groups",
        "dangling_edge_sources", "dangling_edge_targets",
        "edge_to_group_id", "edges_missing_label",
        "duplicate_node_ids", "duplicate_group_ids",
        "node_group_id_collisions", "bad_labels",
        "intra_group_edges", "cross_group_edges",
    ]}
    total_modules = sum(r["total_modules"] for r in results)
    total_with_doc = sum(r["modules_with_doc"] for r in results)
    overall_fpr = round(total_with_doc / total_modules * 100, 1) if total_modules else 0

    print(f"  GRAND TOTALS ({len(results)} repos)")
    print(f"  Modules: {total_modules}  |  With doc: {total_with_doc}  |  First-pass: {overall_fpr}%")
    print(f"  Nodes: {all_agg['nodes']}  |  Edges: {all_agg['edges']}  |  Groups: {all_agg['groups']}")
    structural_errors = (
        all_agg["dangling_edge_sources"] + all_agg["dangling_edge_targets"] +
        all_agg["edge_to_group_id"] + all_agg["duplicate_node_ids"] +
        all_agg["duplicate_group_ids"] + all_agg["node_group_id_collisions"] +
        all_agg["empty_groups"]
    )
    print(f"  Structural errors: {structural_errors}")
    print(f"  Tooltip gaps: {all_agg['nodes_missing_title'] + all_agg['nodes_missing_description'] + all_agg['groups_missing_title'] + all_agg['groups_missing_description']}")
    print(f"  Ungrouped nodes: {all_agg['ungrouped_nodes']}  |  Oversized groups: {all_agg['oversized_groups']}")
    print(f"  Bad labels: {all_agg['bad_labels']}  |  Edges missing label: {all_agg['edges_missing_label']}")
    print(divider)


def main():
    parser = argparse.ArgumentParser(description="Quality audit for demo repo documentation")
    parser.add_argument("--only", nargs="+", help="Repos to audit")
    parser.add_argument("--json", action="store_true", help="JSON output")
    args = parser.parse_args()

    repos = args.only
    if not repos:
        index_path = DEMO_REPOS / "index.json"
        if index_path.exists():
            repos = [e["id"] for e in json.loads(index_path.read_text()) if "id" in e]
        else:
            repos = sorted(
                d.name for d in DEMO_REPOS.iterdir()
                if d.is_dir() and (d / "module_tree.json").exists()
            )

    results = [audit_repo(r) for r in repos]

    if args.json:
        for r in results:
            for d in r.get("diagrams", []):
                d.pop("nodes_bad_label", None)
                d.pop("oversized_groups", None)
        print(json.dumps(results, indent=2))
    else:
        print_report(results)


if __name__ == "__main__":
    main()
