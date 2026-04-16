"""
Sync generated documentation into demo/repos/<repo>/ for the static viewer.

After each successful generation, copies the output tree to the demo viewer data
directory (when discoverable) and refreshes demo/repos/index.json (same merge
logic as demo/scripts/generate-repos-index.js: preserve id/label/description).

Discovery order:
  1. CODEWIKI_DEMO_REPOS — absolute path to the .../demo/repos directory
  2. Walk parents from cwd for a .../demo/repos directory
  3. Walk parents from the codewiki package root (editable install) for demo/repos

Disable with CODEWIKI_SKIP_DEMO_SYNC=1.
"""

from __future__ import annotations

import json
import logging
import os
import re
import shutil
from pathlib import Path
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)


def repo_slug_from_url(repo_url: str) -> str:
    """Last path segment of a git URL, suitable for demo/repos/<slug>/."""
    s = (repo_url or "").strip().rstrip("/")
    if not s:
        return "repo"
    part = s.split("/")[-1]
    if part.endswith(".git"):
        part = part[:-4]
    safe = re.sub(r"[^a-zA-Z0-9._-]", "_", part)
    return safe or "repo"


def _discover_demo_repos_dir() -> Optional[Path]:
    skip = os.environ.get("CODEWIKI_SKIP_DEMO_SYNC", "").strip().lower()
    if skip in ("1", "true", "yes"):
        return None

    env = os.environ.get("CODEWIKI_DEMO_REPOS", "").strip()
    if env:
        p = Path(env).expanduser().resolve()
        if p.is_dir():
            return p
        logger.warning("CODEWIKI_DEMO_REPOS is set but not a directory: %s", p)
        return None

    # codewiki/cli/utils/demo_viewer_sync.py -> parents[3] = repo root (e.g. atelier/)
    pkg_ancestor = Path(__file__).resolve().parents[3]

    for start in (Path.cwd().resolve(), pkg_ancestor):
        for parent in [start, *start.parents]:
            cand = (parent / "demo" / "repos").resolve()
            if cand.is_dir():
                return cand
    return None


def _humanize_slug(name: str) -> str:
    parts = re.split(r"[_-]+", name.strip())
    return " ".join(p[:1].upper() + p[1:].lower() if p else "" for p in parts if p) or name


def _load_repos_index_by_id(index_path: Path) -> Dict[str, Dict[str, str]]:
    if not index_path.is_file():
        return {}
    try:
        raw: Any = json.loads(index_path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return {}
    if not isinstance(raw, list):
        return {}
    out: Dict[str, Dict[str, str]] = {}
    for item in raw:
        if isinstance(item, str):
            out[item] = {"id": item, "label": _humanize_slug(item), "description": ""}
        elif isinstance(item, dict) and isinstance(item.get("id"), str):
            rid = item["id"]
            label = item.get("label") if isinstance(item.get("label"), str) else _humanize_slug(rid)
            desc = item.get("description") if isinstance(item.get("description"), str) else ""
            out[rid] = {"id": rid, "label": label, "description": desc}
    return out


def _regenerate_repos_index(demo_repos: Path) -> None:
    names = sorted(
        p.name
        for p in demo_repos.iterdir()
        if p.is_dir() and not p.name.startswith(".")
    )
    index_path = demo_repos / "index.json"
    by_id = _load_repos_index_by_id(index_path)
    rows: List[Dict[str, str]] = []
    for name in names:
        if name in by_id:
            rows.append(by_id[name])
        else:
            rows.append({"id": name, "label": _humanize_slug(name), "description": ""})
    index_path.write_text(json.dumps(rows, indent=2) + "\n", encoding="utf-8")


def sync_generated_docs_to_demo_viewer(
    output_dir: Path,
    repo_slug: str,
) -> Optional[Path]:
    """
    Copy generated docs into demo/repos/<repo_slug>/ and refresh index.json.

    Returns the destination directory if sync ran, or None if skipped
    (no demo root found, or output already equals destination).
    """
    demo_repos = _discover_demo_repos_dir()
    if not demo_repos:
        logger.debug("Demo viewer sync skipped: no demo/repos directory found")
        return None

    output_dir = output_dir.resolve()
    if not output_dir.is_dir():
        logger.warning("Demo viewer sync skipped: output is not a directory: %s", output_dir)
        return None

    slug = repo_slug.strip() or "repo"
    dest = (demo_repos / slug).resolve()

    try:
        if output_dir == dest:
            _regenerate_repos_index(demo_repos)
            logger.info("Demo viewer: output already at %s; refreshed index.json", dest)
            return dest
    except OSError:
        pass

    try:
        if dest.exists():
            shutil.rmtree(dest)
        shutil.copytree(output_dir, dest)
        _regenerate_repos_index(demo_repos)
        logger.info("Demo viewer: synced docs to %s and updated index.json", dest)
        return dest
    except OSError as e:
        logger.warning("Demo viewer sync failed: %s", e)
        return None
