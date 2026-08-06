#!/usr/bin/env python3
"""
Repair auto-split modules in demo/repos/.

For each module whose module_tree.json children are all part_N keys:
  1. Collect the already-generated part_N.json files as digests (map output).
  2. Run the reduce step (generate_merged_doc_json) to produce a unified diagram.
  3. Overwrite the parent {module_name}.json as a single leaf.
  4. Strip the part_N children from module_tree.json.
  5. Delete the part_N.json files.
  6. Sync the repo directory to the MCP cache.

Usage:
    python scripts/repair_auto_split_diagrams.py [--dry-run] [--repo REPO] [--env .env.local]

Requires the same API keys as the main pipeline (GOOGLE_API_KEY / LLM_API_KEY).
"""
from __future__ import annotations

import argparse
import asyncio
import json
import logging
import os
import re
import shutil
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)
logger = logging.getLogger("repair_auto_split")

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
DEMO_REPOS = Path(__file__).parent.parent / "demo" / "repos"
MCP_REPOS  = Path.home() / ".cache" / "atelier-mcp" / "repos"

_PART_RE = re.compile(r"^part_\d+$")


def _is_part_key(key: str) -> bool:
    return bool(_PART_RE.match(key))


def _find_auto_split_parents(tree: Dict[str, Any], path: List[str]) -> List[List[str]]:
    """Return module paths (list of keys) whose children are all part_N."""
    results = []
    for key, node in tree.items():
        if not isinstance(node, dict):
            continue
        children = node.get("children") or {}
        if children and all(_is_part_key(k) for k in children):
            results.append(path + [key])
        results.extend(_find_auto_split_parents(children, path + [key]))
    return results


def _navigate_tree(tree: Dict[str, Any], module_path: List[str]) -> Optional[Dict[str, Any]]:
    node = tree
    for key in module_path:
        if not isinstance(node, dict):
            return None
        node = node.get(key) or node.get("children", {}).get(key)
        if node is None:
            return None
    return node


def _navigate_to_parent_children(tree: Dict[str, Any], module_path: List[str]) -> Optional[Dict[str, Any]]:
    """Return the dict that contains module_path[-1] as a key."""
    if len(module_path) == 1:
        return tree
    parent_node = _navigate_tree(tree, module_path[:-1])
    if parent_node is None:
        return None
    return parent_node.get("children", parent_node)


# ---------------------------------------------------------------------------
# Repair one module
# ---------------------------------------------------------------------------

def repair_module(
    docs_dir: Path,
    module_path: List[str],
    module_name: str,
    config,
    *,
    dry_run: bool,
) -> bool:
    mt_path = docs_dir / "module_tree.json"
    if not mt_path.exists():
        logger.error("module_tree.json not found: %s", mt_path)
        return False

    tree = json.loads(mt_path.read_text())
    node = _navigate_tree(tree, module_path)
    if node is None:
        logger.error("Module path %s not found in tree", module_path)
        return False

    part_keys = sorted(
        (k for k in (node.get("children") or {}) if _is_part_key(k)),
        key=lambda k: int(k.split("_")[1]),
    )
    if not part_keys:
        logger.info("No part_N children for %s — skipping", module_path)
        return True

    # Collect digests from on-disk part_N.json files
    chunk_docs: List[Dict[str, Any]] = []
    for pk in part_keys:
        part_path = docs_dir / f"{pk}.json"
        if not part_path.exists():
            logger.warning("Missing %s — will use empty digest", part_path)
            chunk_docs.append({"title": pk, "summary": "", "diagram": {"nodes": [], "edges": [], "groups": []}})
        else:
            try:
                chunk_docs.append(json.loads(part_path.read_text()))
            except Exception as e:
                logger.warning("Could not read %s: %s", part_path, e)
                chunk_docs.append({"title": pk, "summary": "", "diagram": {"nodes": [], "edges": [], "groups": []}})

    total_nodes = sum(len(d.get("diagram", {}).get("nodes", [])) for d in chunk_docs)
    logger.info(
        "[%s] Found %d part chunks, %d total digested nodes",
        "/".join(module_path), len(chunk_docs), total_nodes,
    )

    if dry_run:
        logger.info("[DRY RUN] Would repair %s (%d chunks)", module_path, len(chunk_docs))
        return True

    # REDUCE
    from codewiki.src.be.direct_module_doc import generate_merged_doc_json
    try:
        doc = generate_merged_doc_json(
            module_name=module_name,
            chunk_docs=chunk_docs,
            module_tree=tree,
            config=config,
        )
    except Exception as e:
        logger.error("[%s] reduce failed: %s", "/".join(module_path), e)
        return False

    # Write unified parent doc
    parent_json = docs_dir / f"{module_name}.json"
    parent_json.write_text(json.dumps(doc, indent=2))
    logger.info("[%s] Wrote unified parent doc: %s", "/".join(module_path), parent_json)

    # Update module_tree: set title/summary/diagram, clear part_N children
    container = _navigate_to_parent_children(tree, module_path)
    if container is not None and module_name in container:
        container[module_name]["title"] = doc["title"]
        container[module_name]["description"] = doc["summary"]
        container[module_name]["diagram"] = doc["diagram"]
        container[module_name]["children"] = {}
    else:
        logger.warning("[%s] Could not locate node in tree to update", "/".join(module_path))

    mt_path.write_text(json.dumps(tree, indent=2))
    logger.info("[%s] Updated module_tree.json", "/".join(module_path))

    # Delete part_N.json files
    for pk in part_keys:
        part_file = docs_dir / f"{pk}.json"
        if part_file.exists():
            part_file.unlink()
            logger.info("[%s] Deleted %s", "/".join(module_path), part_file.name)

    return True


# ---------------------------------------------------------------------------
# Sync repo to MCP cache
# ---------------------------------------------------------------------------

def sync_to_mcp(repo_name: str, docs_dir: Path) -> None:
    dest = MCP_REPOS / repo_name
    if not dest.exists():
        logger.info("MCP cache dir %s does not exist — skipping sync", dest)
        return
    # Copy changed files
    for src_file in docs_dir.rglob("*"):
        if src_file.is_dir():
            continue
        rel = src_file.relative_to(docs_dir)
        dst_file = dest / rel
        dst_file.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(src_file, dst_file)
    logger.info("Synced %s -> %s", docs_dir, dest)


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def load_env(env_file: Optional[str]) -> None:
    if not env_file:
        return
    p = Path(env_file)
    if not p.exists():
        return
    for line in p.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))


def main() -> None:
    parser = argparse.ArgumentParser(description="Repair auto-split part_N diagrams")
    parser.add_argument("--dry-run", action="store_true", help="Print what would be done, no writes")
    parser.add_argument("--repo", help="Only process this repo (default: all repos in demo/repos/)")
    parser.add_argument("--env", default=".env", help="Path to .env file for API keys")
    parser.add_argument("--no-sync", action="store_true", help="Skip syncing to MCP cache")
    args = parser.parse_args()

    load_env(args.env)

    # Ensure we can import codewiki
    root = Path(__file__).parent.parent
    sys.path.insert(0, str(root))

    from codewiki.src.config import MAIN_MODEL, FALLBACK_MODEL_1

    # Build a minimal Config for the reduce call
    api_key = (
        os.environ.get("GEMINI_API_KEY")
        or os.environ.get("GOOGLE_API_KEY")
        or os.environ.get("LLM_API_KEY", "")
    )
    if not api_key and not args.dry_run:
        logger.error("No API key found. Set GEMINI_API_KEY, GOOGLE_API_KEY, or LLM_API_KEY.")
        sys.exit(1)

    class _MinimalConfig:
        main_model = MAIN_MODEL
        fallback_model = FALLBACK_MODEL_1
        llm_api_key = api_key or ""
        llm_base_url = None
        thinking_budget = 0

    config = _MinimalConfig()

    repos = sorted(DEMO_REPOS.iterdir()) if not args.repo else [DEMO_REPOS / args.repo]

    total_repaired = 0
    total_failed = 0

    for repo_dir in repos:
        if not repo_dir.is_dir():
            continue
        repo_name = repo_dir.name
        mt_path = repo_dir / "module_tree.json"
        if not mt_path.exists():
            continue

        try:
            tree = json.loads(mt_path.read_text())
        except Exception as e:
            logger.error("Could not read %s: %s", mt_path, e)
            continue

        auto_split_paths = _find_auto_split_parents(tree, [])
        if not auto_split_paths:
            logger.info("[%s] No auto-split parents found", repo_name)
            continue

        logger.info("[%s] Found %d auto-split parent(s):", repo_name, len(auto_split_paths))
        for p in auto_split_paths:
            logger.info("  %s", "/".join(p))

        for module_path in auto_split_paths:
            module_name = module_path[-1]
            ok = repair_module(
                repo_dir,
                module_path,
                module_name,
                config,
                dry_run=args.dry_run,
            )
            if ok:
                total_repaired += 1
            else:
                total_failed += 1

        if not args.dry_run and not args.no_sync:
            sync_to_mcp(repo_name, repo_dir)

    logger.info("Done. Repaired: %d, Failed: %d", total_repaired, total_failed)
    if total_failed:
        sys.exit(1)


if __name__ == "__main__":
    main()
