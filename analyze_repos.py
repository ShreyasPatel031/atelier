#!/usr/bin/env python3
"""Detailed repo analysis for Agent 3 handoff."""

import json
from pathlib import Path

def analyze_all():
    repos = ["flask", "fastapi", "httpx", "rich", "typer"]
    
    print("=" * 80)
    print("DETAILED REPO ANALYSIS")
    print("=" * 80)
    
    for repo in repos:
        docs_path = Path(f"test_repos/{repo}/docs")
        module_tree_path = docs_path / "module_tree.json"
        
        if not module_tree_path.exists():
            print(f"\n{repo}: No module_tree.json")
            continue
        
        with open(module_tree_path) as f:
            tree = json.load(f)
        
        stats = {
            "total": 0, "with_title": 0, "with_desc": 0,
            "with_diagram": 0, "missing_child": 0, "desc_long": 0,
            "max_depth": 0, "by_depth": {}
        }
        
        def walk(node, depth=0):
            for name, data in node.items():
                if not isinstance(data, dict):
                    continue
                stats["total"] += 1
                stats["max_depth"] = max(stats["max_depth"], depth)
                stats["by_depth"][depth] = stats["by_depth"].get(depth, 0) + 1
                
                if data.get("title"): stats["with_title"] += 1
                if data.get("description"):
                    stats["with_desc"] += 1
                    if len(data["description"]) > 200:
                        stats["desc_long"] += 1
                
                md = docs_path / f"{name}.md"
                if md.exists():
                    content = md.read_text()
                    if "```mermaid" in content or "graph TD" in content:
                        stats["with_diagram"] += 1
                    for child in data.get("children", {}).keys():
                        if child not in content:
                            stats["missing_child"] += 1
                
                if "children" in data:
                    walk(data["children"], depth + 1)
        
        walk(tree)
        t = stats["total"]
        
        print(f"\n{'='*40}")
        print(f"📦 {repo.upper()}")
        print(f"{'='*40}")
        print(f"Depth: {stats['max_depth']} | Modules by depth: {stats['by_depth']}")
        print(f"Total: {t} | Title: {stats['with_title']}/{t} ({100*stats['with_title']//t}%)")
        print(f"Description: {stats['with_desc']}/{t} ({100*stats['with_desc']//t}%) | Too long: {stats['desc_long']}")
        print(f"Has diagram: {stats['with_diagram']}/{t} ({100*stats['with_diagram']//t}%)")
        print(f"Missing child in diagram: {stats['missing_child']}")

if __name__ == "__main__":
    analyze_all()
