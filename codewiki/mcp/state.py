"""
In-memory state for codewiki MCP diagrams.

Holds parsed ``DiagramModel`` for ``overview`` and each top-level module from
``module_tree.json`` so ``patch_diagram`` can mutate without re-reading from
disk every call. Lazy-load on first access; write-through on every patch.

Cache key: ``repo_id``. ``set_overview``, ``set_module_tree``, and
``clear_repo`` flush the entry so the next read re-parses from disk.
"""

from __future__ import annotations

import json
import re
import threading
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional

from codewiki.mcp.models import DiagramModel, ModuleNodeModel
from codewiki.mcp.timing import span


_DIAGRAM_JSON_RE = re.compile(r"<!--\s*DIAGRAM_JSON\s*\n([\s\S]*?)\n\s*-->")
_TITLE_RE = re.compile(r"^#\s+(.+?)\s*$", re.MULTILINE)


# ---------------------------------------------------------------------------
# Per-repo state
# ---------------------------------------------------------------------------


@dataclass
class _OverviewState:
    title: str = ""
    description: str = ""
    diagram: DiagramModel = field(default_factory=DiagramModel)


@dataclass
class _ModuleState:
    """A single top-level module from module_tree.json + parsed diagram."""

    raw: dict  # full module_tree dict for this module (excluding 'diagram')
    diagram: Optional[DiagramModel] = None  # parsed inline diagram, if any


@dataclass
class RepoState:
    repo_id: str
    overview: _OverviewState = field(default_factory=_OverviewState)
    modules: dict[str, _ModuleState] = field(default_factory=dict)
    loaded_at_ms: float = 0.0


# ---------------------------------------------------------------------------
# Cache
# ---------------------------------------------------------------------------


class DiagramCache:
    """Thread-safe lazy-load + write-through cache for repo diagrams."""

    def __init__(self, repos_root: Path) -> None:
        self._repos_root = repos_root
        self._states: dict[str, RepoState] = {}
        self._lock = threading.RLock()

    # -- lifecycle ----------------------------------------------------------

    def invalidate(self, repo_id: str) -> None:
        with self._lock:
            self._states.pop(repo_id, None)

    def invalidate_all(self) -> None:
        with self._lock:
            self._states.clear()

    # -- access -------------------------------------------------------------

    def get(self, repo_id: str) -> RepoState:
        """Return cached state; lazy-load from disk on first access."""
        with self._lock:
            cached = self._states.get(repo_id)
            if cached is not None:
                with span("cache_hit", repo=repo_id):
                    return cached
            with span("cache_load", repo=repo_id) as ctx:
                state = self._load_from_disk(repo_id)
                ctx["modules"] = len(state.modules)
                ctx["overview_nodes"] = len(state.overview.diagram.nodes)
            self._states[repo_id] = state
            return state

    # -- read helpers -------------------------------------------------------

    def overview_diagram(self, repo_id: str) -> DiagramModel:
        return self.get(repo_id).overview.diagram

    def module_diagram(self, repo_id: str, module_id: str) -> Optional[DiagramModel]:
        mod = self.get(repo_id).modules.get(module_id)
        if mod is None:
            return None
        return mod.diagram

    def list_modules(self, repo_id: str) -> list[str]:
        return list(self.get(repo_id).modules.keys())

    # -- mutation / persist -------------------------------------------------

    def replace_overview(
        self,
        repo_id: str,
        title: str,
        description: str,
        diagram: DiagramModel,
    ) -> None:
        """Update the in-memory overview without writing to disk."""
        with self._lock:
            state = self.get(repo_id)
            state.overview.title = title
            state.overview.description = description
            state.overview.diagram = diagram

    def replace_module_diagram(
        self, repo_id: str, module_id: str, diagram: DiagramModel
    ) -> None:
        """Update a single module's inline diagram in memory."""
        with self._lock:
            state = self.get(repo_id)
            mod = state.modules.get(module_id)
            if mod is None:
                raise KeyError(
                    f"module {module_id!r} not present in module_tree.json for "
                    f"repo {repo_id!r}; add it via set_module_tree first"
                )
            mod.diagram = diagram

    # -- disk loaders -------------------------------------------------------

    def _load_from_disk(self, repo_id: str) -> RepoState:
        repo_dir = self._repos_root / repo_id
        state = RepoState(repo_id=repo_id, loaded_at_ms=time.time() * 1000.0)

        overview_path = repo_dir / "overview.md"
        if overview_path.exists():
            with span("parse_overview_md", repo=repo_id):
                state.overview = self._parse_overview(overview_path.read_text())

        tree_path = repo_dir / "module_tree.json"
        if tree_path.exists():
            with span("parse_module_tree", repo=repo_id) as ctx:
                state.modules = self._parse_module_tree(tree_path.read_text())
                ctx["modules"] = len(state.modules)
        return state

    @staticmethod
    def _parse_overview(text: str) -> _OverviewState:
        out = _OverviewState()
        m = _TITLE_RE.search(text)
        if m:
            out.title = m.group(1).strip()

        # description = body between heading and DIAGRAM_JSON marker
        title_end = m.end() if m else 0
        json_match = _DIAGRAM_JSON_RE.search(text)
        body_end = json_match.start() if json_match else len(text)
        body = text[title_end:body_end].strip()
        out.description = body

        if json_match:
            try:
                data = json.loads(json_match.group(1))
                out.diagram = DiagramModel.model_validate(_normalise_diagram(data))
            except (json.JSONDecodeError, ValueError):
                out.diagram = DiagramModel()
        return out

    @staticmethod
    def _parse_module_tree(text: str) -> dict[str, _ModuleState]:
        try:
            data = json.loads(text)
        except json.JSONDecodeError:
            return {}
        if not isinstance(data, dict):
            return {}

        out: dict[str, _ModuleState] = {}
        for key, raw in data.items():
            if not isinstance(raw, dict):
                continue
            diagram_raw = raw.get("diagram")
            parsed: Optional[DiagramModel] = None
            if isinstance(diagram_raw, dict):
                try:
                    parsed = DiagramModel.model_validate(_normalise_diagram(diagram_raw))
                except ValueError:
                    parsed = None
            out[key] = _ModuleState(raw=raw, diagram=parsed)
        return out


def _normalise_diagram(data: dict) -> dict:
    """Coerce on-disk diagram dict to the shape DiagramModel expects.

    On-disk edges drop ``label`` when None; nodes always carry ``link`` (may
    be None). DiagramModel accepts both, this just guards against quirks.
    """
    if not isinstance(data, dict):
        return data
    out = dict(data)
    nodes = out.get("nodes") or []
    out["nodes"] = [n for n in nodes if isinstance(n, dict)]
    edges = out.get("edges") or []
    out["edges"] = [e for e in edges if isinstance(e, dict)]
    groups = out.get("groups") or []
    out["groups"] = [g for g in groups if isinstance(g, dict)]
    return out


__all__ = [
    "DiagramCache",
    "RepoState",
    "_OverviewState",
    "_ModuleState",
]
