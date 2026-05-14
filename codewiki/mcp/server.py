"""
Stdio MCP server that exposes a minimal set of tools for an LLM (e.g. Cursor)
to render diagrams of the current repo via the existing ReactFlow viewer in
``demo/``.

This server does NO repo analysis itself. The LLM emits the Diagram IR and
calls the tools below to persist + serve it.

Layout written to disk (consumed by ``demo/index.html``):

    demo/repos/index.json                      ← list of {id,label,description}
    demo/repos/<repo_id>/overview.md           ← markdown + <!-- DIAGRAM_JSON -->
    demo/repos/<repo_id>/module_tree.json      ← hierarchical modules + diagrams
    demo/repos/<repo_id>/<module_id>.md        ← optional drill-down pages
    demo/repos/<repo_id>/viewer_epoch.json    ← bump so browser viewer hot-reloads
    demo/repos/<repo_id>/viewer_state.json    ← viewer POSTs selection + tab + optional last_diagram_ask (MCP reads)

Granular mutation:
    apply_repo_bundle replaces full-repo snapshots in one validated write.
    get_diagram / patch_diagram let an IDE LLM read and modify diagrams without
    filesystem access. State is cached in memory so back-to-back patches don't
    re-parse from disk. Optional perf JSON-lines logging via ``CODEWIKI_PERF_LOG``
    (see :mod:`codewiki.mcp.timing`).
"""

from __future__ import annotations

import json
import os
import re
import time
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any, Optional, Tuple

from mcp.server.fastmcp import FastMCP

from codewiki.mcp.models import DiagramModel, ModuleDocPayload, ModuleNodeModel
from codewiki.mcp.patch import PatchOp, apply_operations
from codewiki.mcp.state import DiagramCache
from codewiki.mcp.static_server import make_static_server
from codewiki.mcp.timing import span, timed

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------

# This file lives at <repo>/codewiki/mcp/server.py — demo/ is two parents up.
_REPO_ROOT = Path(__file__).resolve().parents[2]
_DEMO_ROOT = _REPO_ROOT / "demo"
_REPOS_ROOT = _DEMO_ROOT / "repos"
_INDEX_FILE = _REPOS_ROOT / "index.json"
_VIEWER_STATE_FILE = "viewer_state.json"

# Reserved ``get_diagram`` target: full repo inventory + viewer (replaces list_diagrams).
_INVENTORY_TARGET = "__inventory__"

_DEFAULT_PORT = int(os.environ.get("CODEWIKI_MCP_PORT", "8765"))

_STATIC = make_static_server(_DEMO_ROOT, _DEFAULT_PORT)
_CACHE = DiagramCache(_REPOS_ROOT)

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _reuse_viewer_url(port: int, repo_id: str) -> Optional[str]:
    """If an HTTP server on ``port`` already serves ``demo/repos`` and lists ``repo_id``, return viewer URL."""
    try:
        req = urllib.request.Request(
            f"http://127.0.0.1:{port}/repos/index.json",
            headers={"User-Agent": "atelier-mcp/1.0"},
            method="GET",
        )
        with urllib.request.urlopen(req, timeout=2) as resp:
            raw = resp.read().decode()
        data = json.loads(raw)
    except (urllib.error.URLError, urllib.error.HTTPError, TimeoutError, json.JSONDecodeError):
        return None
    except Exception:
        return None
    if not isinstance(data, list):
        return None
    if not any(isinstance(e, dict) and e.get("id") == repo_id for e in data):
        return None
    return f"http://127.0.0.1:{port}/?repo={repo_id}"


def _find_existing_viewer_url(repo_id: str) -> Optional[Tuple[str, int]]:
    """Scan a few localhost ports for an already-running CodeWiki demo static server."""
    base = int(os.environ.get("CODEWIKI_MCP_PORT", "8765"))
    for port in range(base, base + 16):
        url = _reuse_viewer_url(port, repo_id)
        if url:
            return url, port
    return None


# ---------------------------------------------------------------------------
# Repo IDs and paths
# ---------------------------------------------------------------------------

_REPO_ID_RE = re.compile(r"^[a-zA-Z0-9][a-zA-Z0-9._-]{0,63}$")
_MODULE_ID_RE = re.compile(r"^[a-zA-Z0-9][a-zA-Z0-9._-]{0,127}$")


def _validate_repo_id(repo_id: str) -> str:
    if not _REPO_ID_RE.match(repo_id):
        raise ValueError(
            f"Invalid repo_id {repo_id!r}: must match {_REPO_ID_RE.pattern}"
        )
    return repo_id


def _validate_module_id(module_id: str) -> str:
    if not _MODULE_ID_RE.match(module_id):
        raise ValueError(
            f"Invalid module_id {module_id!r}: must match {_MODULE_ID_RE.pattern}"
        )
    return module_id


def _repo_dir(repo_id: str) -> Path:
    _validate_repo_id(repo_id)
    return _REPOS_ROOT / repo_id


def _ensure_repo_dir(repo_id: str) -> Path:
    path = _repo_dir(repo_id)
    path.mkdir(parents=True, exist_ok=True)
    return path


def _viewer_state_path(repo_id: str) -> Path:
    return _repo_dir(repo_id) / _VIEWER_STATE_FILE


def _read_viewer_state(repo_id: str) -> dict[str, Any]:
    """Latest canvas/UI state written by ``demo/index.html`` (POST to static server)."""
    path = _viewer_state_path(repo_id)
    if not path.is_file():
        return {
            "synced": False,
            "path": str(path.relative_to(_REPO_ROOT)),
            "selections": [],
            "primary": None,
            "last_diagram_ask": None,
            "current_module_id": None,
            "selected_module_id": None,
            "diagram_tab": None,
            "opened_modules": [],
        }
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return {
            "synced": False,
            "error": "invalid_or_unreadable",
            "path": str(path.relative_to(_REPO_ROOT)),
            "selections": [],
            "primary": None,
            "last_diagram_ask": None,
        }
    if not isinstance(data, dict):
        return {
            "synced": False,
            "error": "not_an_object",
            "path": str(path.relative_to(_REPO_ROOT)),
            "selections": [],
            "primary": None,
            "last_diagram_ask": None,
        }
    out = dict(data)
    out["synced"] = True
    out["path"] = str(path.relative_to(_REPO_ROOT))
    out.setdefault("selections", [])
    out.setdefault("primary", None)
    out.setdefault("last_diagram_ask", None)
    return out


def _inventory_payload(repo_id: str) -> dict[str, Any]:
    """Build list-diagrams-style summary; caller must ensure repo dir exists."""
    state = _CACHE.get(repo_id)
    modules: list[dict[str, Any]] = []
    for mod_id, mod in state.modules.items():
        d = mod.diagram
        modules.append(
            {
                "id": mod_id,
                "title": mod.raw.get("title", mod_id),
                "has_diagram": d is not None,
                "nodes": len(d.nodes) if d else 0,
                "edges": len(d.edges) if d else 0,
                "groups": len(d.groups) if d else 0,
                "children": list((mod.raw.get("children") or {}).keys()),
            }
        )
    ov = state.overview
    return {
        "ok": True,
        "exists": True,
        "repo_id": repo_id,
        "target": _INVENTORY_TARGET,
        "overview": {
            "title": ov.title,
            "description": ov.description,
            "direction": ov.diagram.direction,
            "nodes": len(ov.diagram.nodes),
            "edges": len(ov.diagram.edges),
            "groups": len(ov.diagram.groups),
        },
        "modules": modules,
        "viewer": _read_viewer_state(repo_id),
    }


def _bump_viewer_epoch(repo_id: str) -> None:
    """Write monotonic ms timestamp so ``demo/index.html`` can poll and reload."""
    with span("epoch_bump", repo=repo_id):
        path = _repo_dir(repo_id) / "viewer_epoch.json"
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps({"epoch": int(time.time() * 1000)}) + "\n")


def _load_index() -> list[dict]:
    if not _INDEX_FILE.exists():
        return []
    try:
        data = json.loads(_INDEX_FILE.read_text())
    except json.JSONDecodeError:
        return []
    return data if isinstance(data, list) else []


def _upsert_index(repo_id: str, label: str, description: str) -> None:
    with span("index_upsert", repo=repo_id):
        _REPOS_ROOT.mkdir(parents=True, exist_ok=True)
        entries = _load_index()
        new_entry = {"id": repo_id, "label": label, "description": description}
        for i, entry in enumerate(entries):
            if isinstance(entry, dict) and entry.get("id") == repo_id:
                entries[i] = new_entry
                break
        else:
            entries.append(new_entry)
        _INDEX_FILE.write_text(json.dumps(entries, indent=2) + "\n")


def _remove_from_index(repo_id: str) -> None:
    with span("index_remove", repo=repo_id):
        if not _INDEX_FILE.exists():
            return
        entries = [
            e for e in _load_index()
            if not (isinstance(e, dict) and e.get("id") == repo_id)
        ]
        _INDEX_FILE.write_text(json.dumps(entries, indent=2) + "\n")


def _format_overview_md(title: str, description: str, diagram: DiagramModel) -> str:
    diagram_json = json.dumps(diagram.to_diagram_dict(), indent=2)
    body = description.strip()
    body_block = f"\n\n{body}\n" if body else "\n"
    return (
        f"# {title}\n"
        f"{body_block}"
        f"\n<!-- DIAGRAM_JSON\n{diagram_json}\n-->\n"
    )


def _format_module_md(
    title: str,
    description: str,
    body_md: str,
    diagram: Optional[DiagramModel],
) -> str:
    parts = [f"# {title}\n"]
    if description.strip():
        parts.append(f"\n{description.strip()}\n")
    if body_md.strip():
        parts.append(f"\n{body_md.strip()}\n")
    if diagram is not None:
        diagram_json = json.dumps(diagram.to_diagram_dict(), indent=2)
        parts.append(f"\n<!-- DIAGRAM_JSON\n{diagram_json}\n-->\n")
    return "".join(parts)


def _write_overview(repo_id: str, title: str, description: str, diagram: DiagramModel) -> Path:
    overview_path = _repo_dir(repo_id) / "overview.md"
    with span("file_write", file="overview.md", repo=repo_id):
        overview_path.write_text(_format_overview_md(title, description, diagram))
    return overview_path


def _write_module_tree(repo_id: str, raw: dict[str, dict]) -> Path:
    """Persist module_tree.json given a dict of ``{module_id: full_module_dict}``."""
    path = _repo_dir(repo_id) / "module_tree.json"
    with span("file_write", file="module_tree.json", repo=repo_id):
        path.write_text(json.dumps(raw, indent=2) + "\n")
    return path


def _module_tree_dict_from_state(repo_id: str) -> dict[str, dict]:
    """Build the module_tree.json payload from the in-memory cache.

    Each module's ``raw`` dict is overlaid with the latest parsed diagram (if
    any) so a patch on a module's inline diagram round-trips to disk cleanly.
    """
    state = _CACHE.get(repo_id)
    out: dict[str, dict] = {}
    for mod_id, mod in state.modules.items():
        raw = dict(mod.raw)
        if mod.diagram is not None:
            raw["diagram"] = mod.diagram.to_diagram_dict()
        else:
            raw.pop("diagram", None)
        out[mod_id] = raw
    return out


def _atomic_write_utf8(path: Path, text: str) -> None:
    """Write ``text`` to ``path`` via a same-directory temp file + ``os.replace``."""
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_name(path.name + ".mcp.tmp")
    try:
        tmp.write_text(text, encoding="utf-8")
        os.replace(tmp, path)
    except BaseException:
        if tmp.exists():
            try:
                tmp.unlink()
            except OSError:
                pass
        raise


def _validate_diagram_refs(ctx: str, diagram: DiagramModel) -> None:
    """Ensure edges and group membership reference existing node ids."""
    node_ids = {n.id for n in diagram.nodes}
    for i, e in enumerate(diagram.edges):
        if e.source not in node_ids:
            raise ValueError(f"{ctx}: edge {i} source {e.source!r} not in nodes")
        if e.target not in node_ids:
            raise ValueError(f"{ctx}: edge {i} target {e.target!r} not in nodes")
    for g in diagram.groups:
        for nid in g.nodes:
            if nid not in node_ids:
                raise ValueError(
                    f"{ctx}: group {g.id!r} references unknown node {nid!r}"
                )


def _walk_tree_diagrams(
    tree: dict[str, ModuleNodeModel],
) -> list[tuple[str, DiagramModel]]:
    """Yield ``(context, diagram)`` for every inline diagram in the module tree."""

    out: list[tuple[str, DiagramModel]] = []

    def walk(prefix: str, nodes: dict[str, ModuleNodeModel]) -> None:
        for mid, node in nodes.items():
            ctx = f"{prefix}/{mid}" if prefix else mid
            if node.diagram is not None:
                out.append((f"module_tree[{ctx}].diagram", node.diagram))
            walk(ctx, node.children)

    walk("", tree)
    return out


def _index_entries_after_upsert(
    repo_id: str, label: str, description: str
) -> list[dict]:
    """Full ``index.json`` payload after upserting one repo entry."""
    entries = list(_load_index())
    new_entry = {"id": repo_id, "label": label, "description": description}
    for i, entry in enumerate(entries):
        if isinstance(entry, dict) and entry.get("id") == repo_id:
            entries[i] = new_entry
            break
    else:
        entries.append(new_entry)
    return entries


# ---------------------------------------------------------------------------
# MCP server
# ---------------------------------------------------------------------------

_INSTRUCTIONS = (
    "Render diagrams of a repo into the CodeWiki ReactFlow viewer.\n"
    "\n"
    "Bootstrap (first time on a repo):\n"
    "  1. Pick a stable repo_id (kebab-case basename of the repo).\n"
    "  2. Inspect the repo with your own file tools to identify top-level modules.\n"
    "  3. Prefer apply_repo_bundle: overview + module_tree + optional module_docs\n"
    "     in one call (single viewer_epoch bump, validation before writes).\n"
    "     Or use set_module_tree then set_overview then set_module_doc when you\n"
    "     need separate steps.\n"
    "  4. Top-level 'module' nodes should link to <module_id>.md for drill-down.\n"
    "  5. Call open_viewer(repo_id) and return the URL to the user.\n"
    "\n"
    "Iterative edits (preferred for any IDE — no file access needed):\n"
    "  • get_diagram(repo_id, target='overview' | <module_id> | '__inventory__')\n"
    "    — full diagram IR plus viewer canvas state (selection, tab,\n"
    "    last_diagram_ask from the “?” pill). Use target='__inventory__' for a\n"
    "    compact repo-wide summary (overview + module counts) with the same viewer\n"
    "    block; no full diagram JSON in that mode.\n"
    "  • patch_diagram(repo_id, target?, operations=[...]) — atomic batch of\n"
    "    fine-grained mutations: add_node, remove_node, update_node,\n"
    "    add_edge, remove_edge, update_edge, add_group, remove_group,\n"
    "    update_group, merge_groups, move_nodes, set_direction, set_title,\n"
    "    set_description.\n"
    "\n"
    "Each write bumps demo/repos/<repo_id>/viewer_epoch.json; an open viewer "
    "polls that file and reloads the repo without a manual refresh.\n"
    "\n"
    "Diagram IR: { direction: 'TD'|'LR'|..., nodes: [{id,label,type,link}],\n"
    "  edges: [{source,target,label?}], groups: [{id,label,nodes:[...ids]}] }.\n"
    "Use type='module' + link='<id>.md' for clickable drill-down nodes."
)


def build_server() -> FastMCP:
    mcp = FastMCP(
        name="atelier",
        instructions=_INSTRUCTIONS,
    )

    # -- bootstrap / replacement tools --------------------------------------

    @mcp.tool(
        title="Set repo overview",
        description=(
            "Write demo/repos/<repo_id>/overview.md with the top-level diagram "
            "and upsert demo/repos/index.json so the viewer's repo dropdown "
            "lists this repo. Replaces any existing overview."
        ),
    )
    @timed("tool_call", tool="set_overview")
    def set_overview(
        repo_id: str,
        title: str,
        description: str,
        diagram: DiagramModel,
    ) -> dict:
        _ensure_repo_dir(repo_id)
        overview_path = _write_overview(repo_id, title, description, diagram)
        _upsert_index(repo_id, label=title, description=description)
        _bump_viewer_epoch(repo_id)
        _CACHE.invalidate(repo_id)
        return {
            "ok": True,
            "wrote": str(overview_path.relative_to(_REPO_ROOT)),
            "indexed": True,
            "node_count": len(diagram.nodes),
            "edge_count": len(diagram.edges),
        }

    @mcp.tool(
        title="Set module tree",
        description=(
            "Write demo/repos/<repo_id>/module_tree.json with the hierarchical "
            "module structure. Each module may carry an inline 'diagram' that "
            "the viewer expands when the user clicks the corresponding node. "
            "Replaces the entire tree."
        ),
    )
    @timed("tool_call", tool="set_module_tree")
    def set_module_tree(
        repo_id: str,
        tree: dict[str, ModuleNodeModel],
    ) -> dict:
        _ensure_repo_dir(repo_id)
        out = {key: node.to_tree_dict() for key, node in tree.items()}
        path = _write_module_tree(repo_id, out)
        _bump_viewer_epoch(repo_id)
        _CACHE.invalidate(repo_id)
        return {
            "ok": True,
            "wrote": str(path.relative_to(_REPO_ROOT)),
            "top_level_modules": list(out.keys()),
        }

    @mcp.tool(
        title="Apply repo bundle",
        description=(
            "Validate then atomically write overview.md, module_tree.json, "
            "optional drill-down ``module_docs`` (.md files), and upsert "
            "demo/repos/index.json — bump viewer_epoch once at the end. "
            "Checks diagram edge/group node references before any disk write; "
            "each file is written via a temp file + os.replace. Use instead of "
            "chaining set_overview + set_module_tree + many set_module_doc calls."
        ),
    )
    @timed("tool_call", tool="apply_repo_bundle")
    def apply_repo_bundle(
        repo_id: str,
        overview_title: str,
        overview_description: str,
        overview_diagram: DiagramModel,
        tree: dict[str, ModuleNodeModel],
        module_docs: Optional[list[ModuleDocPayload]] = None,
    ) -> dict[str, Any]:
        _validate_repo_id(repo_id)
        docs = list(module_docs) if module_docs is not None else []

        seen: set[str] = set()
        for d in docs:
            _validate_module_id(d.module_id)
            if d.module_id in seen:
                raise ValueError(f"Duplicate module_docs entry for {d.module_id!r}")
            seen.add(d.module_id)

        _validate_diagram_refs("overview", overview_diagram)
        for ctx, diag in _walk_tree_diagrams(tree):
            _validate_diagram_refs(ctx, diag)
        for d in docs:
            if d.diagram is not None:
                _validate_diagram_refs(f"module_docs[{d.module_id}].diagram", d.diagram)

        _ensure_repo_dir(repo_id)
        tree_out = {key: node.to_tree_dict() for key, node in tree.items()}
        tree_text = json.dumps(tree_out, indent=2) + "\n"
        overview_text = _format_overview_md(
            overview_title, overview_description, overview_diagram
        )

        overview_path = _repo_dir(repo_id) / "overview.md"
        tree_path = _repo_dir(repo_id) / "module_tree.json"

        with span("bundle_write", repo=repo_id, module_docs=len(docs)):
            _atomic_write_utf8(overview_path, overview_text)
            _atomic_write_utf8(tree_path, tree_text)
            written_docs: list[str] = []
            for d in docs:
                doc_path = _repo_dir(repo_id) / f"{d.module_id}.md"
                doc_body = _format_module_md(
                    d.title, d.description, d.body_md, d.diagram
                )
                _atomic_write_utf8(doc_path, doc_body)
                written_docs.append(str(doc_path.relative_to(_REPO_ROOT)))

            with span("index_upsert", repo=repo_id):
                index_entries = _index_entries_after_upsert(
                    repo_id,
                    label=overview_title,
                    description=overview_description,
                )
                _atomic_write_utf8(
                    _INDEX_FILE, json.dumps(index_entries, indent=2) + "\n"
                )

        _bump_viewer_epoch(repo_id)
        _CACHE.invalidate(repo_id)

        return {
            "ok": True,
            "repo_id": repo_id,
            "wrote": {
                "overview": str(overview_path.relative_to(_REPO_ROOT)),
                "module_tree": str(tree_path.relative_to(_REPO_ROOT)),
                "module_docs": written_docs,
                "index": str(_INDEX_FILE.relative_to(_REPO_ROOT)),
            },
            "module_doc_count": len(written_docs),
            "top_level_modules": list(tree_out.keys()),
        }

    @mcp.tool(
        title="Set module doc",
        description=(
            "Write demo/repos/<repo_id>/<module_id>.md for a drill-down page. "
            "Optional — only needed if you want prose beyond what's in "
            "module_tree.json. Pass an optional diagram to embed a "
            "DIAGRAM_JSON block into the page."
        ),
    )
    @timed("tool_call", tool="set_module_doc")
    def set_module_doc(
        repo_id: str,
        module_id: str,
        title: str,
        description: str = "",
        body_md: str = "",
        diagram: Optional[DiagramModel] = None,
    ) -> dict:
        _validate_module_id(module_id)
        _ensure_repo_dir(repo_id)
        path = _repo_dir(repo_id) / f"{module_id}.md"
        with span("file_write", file=f"{module_id}.md", repo=repo_id):
            path.write_text(_format_module_md(title, description, body_md, diagram))
        _bump_viewer_epoch(repo_id)
        return {"ok": True, "wrote": str(path.relative_to(_REPO_ROOT))}

    # -- inspection ---------------------------------------------------------

    @mcp.tool(
        title="Get diagram",
        description=(
            "Return diagram data for a repo. Always includes `viewer` (canvas "
            "selection, tab, optional last_diagram_ask from the “?” pill) from "
            "demo/repos/<repo_id>/viewer_state.json.\n"
            "Modes:\n"
            "  • target='overview' (default): full overview Diagram IR + title/description.\n"
            "  • target='<module_id>': full inline module Diagram IR.\n"
            "  • target='__inventory__': compact summary — overview counts, each "
            "top-level module's counts/children — no `diagram` field (use a second "
            "call with the module id when you need IR).\n"
            "Diagram IR JSON Schema (not an MCP resource): docs/diagram-ir.schema.json"
        ),
    )
    @timed("tool_call", tool="get_diagram")
    def get_diagram(repo_id: str, target: str = "overview") -> dict[str, Any]:
        _validate_repo_id(repo_id)
        viewer = _read_viewer_state(repo_id)

        if target == _INVENTORY_TARGET:
            if not _repo_dir(repo_id).exists():
                return {
                    "ok": False,
                    "exists": False,
                    "repo_id": repo_id,
                    "target": _INVENTORY_TARGET,
                    "viewer": viewer,
                }
            return _inventory_payload(repo_id)

        if not _repo_dir(repo_id).exists():
            return {
                "ok": False,
                "exists": False,
                "repo_id": repo_id,
                "target": target,
                "viewer": viewer,
            }

        diagram, title, description = _resolve_target_for_read(repo_id, target)
        return {
            "ok": True,
            "exists": True,
            "repo_id": repo_id,
            "target": target,
            "title": title,
            "description": description,
            "diagram": diagram.to_diagram_dict(),
            "viewer": viewer,
        }

    # -- mutation -----------------------------------------------------------

    @mcp.tool(
        title="Patch diagram",
        description=(
            "Apply an ordered batch of fine-grained mutations to a diagram "
            "(target='overview' or a module id). Operations validate as a "
            "group; if any one fails, none are applied. Each operation has "
            "an 'op' field: add_node, remove_node, update_node, add_edge, "
            "remove_edge, update_edge, add_group, remove_group, update_group, "
            "merge_groups, move_nodes, set_direction, set_title, "
            "set_description. Use this instead of set_overview when you only "
            "need to change part of an existing diagram."
        ),
    )
    @timed("tool_call", tool="patch_diagram")
    def patch_diagram(
        repo_id: str,
        operations: list[PatchOp],
        target: str = "overview",
    ) -> dict:
        _validate_repo_id(repo_id)
        if not operations:
            raise ValueError("operations: at least one operation is required")

        if target == "overview":
            return _patch_overview(repo_id, operations)
        return _patch_module(repo_id, target, operations)

    # -- viewer / repo housekeeping -----------------------------------------

    @mcp.tool(
        title="Open viewer",
        description=(
            "Ensure the local static viewer is running and return a URL the "
            "user can click to view the rendered diagrams. Idempotent."
        ),
    )
    @timed("tool_call", tool="open_viewer")
    def open_viewer(repo_id: str) -> dict:
        _validate_repo_id(repo_id)
        repo_path = _repo_dir(repo_id)
        if not repo_path.exists():
            raise ValueError(
                f"No diagrams written yet for {repo_id!r}. "
                f"Call apply_repo_bundle or set_overview / set_module_tree first."
            )
        # Always ensure the MCP POST-capable static server is running (for viewer_state sync).
        with span("static_server_start"):
            _STATIC.ensure_running()
        mcp_url = _STATIC.url_for(repo_id)

        existing = _find_existing_viewer_url(repo_id)
        if existing is not None:
            url, port = existing
            return {
                "ok": True,
                "url": url,
                "port": port,
                "mcp_server_port": _STATIC.port,
                "reused_existing_server": True,
                "repo_dir": str(repo_path.relative_to(_REPO_ROOT)),
            }
        return {
            "ok": True,
            "url": mcp_url,
            "port": _STATIC.port,
            "mcp_server_port": _STATIC.port,
            "reused_existing_server": False,
            "repo_dir": str(repo_path.relative_to(_REPO_ROOT)),
        }

    return mcp


# ---------------------------------------------------------------------------
# Patch orchestration helpers
# ---------------------------------------------------------------------------


def _resolve_target_for_read(
    repo_id: str, target: str
) -> tuple[DiagramModel, Optional[str], Optional[str]]:
    """Return (diagram, title, description) for ``target``.

    Title/description are only meaningful for ``overview``. Modules carry
    their own ``title``/``description`` in the tree dict, but those aren't
    mutated by patch ops today (we only mutate the inline diagram).
    """
    state = _CACHE.get(repo_id)
    if target == "overview":
        return state.overview.diagram, state.overview.title, state.overview.description
    mod = state.modules.get(target)
    if mod is None:
        raise ValueError(
            f"Unknown target {target!r}. Use 'overview' or one of: "
            f"{list(state.modules.keys())!r}"
        )
    if mod.diagram is None:
        return DiagramModel(), mod.raw.get("title"), mod.raw.get("description")
    return mod.diagram, mod.raw.get("title"), mod.raw.get("description")


def _patch_overview(repo_id: str, operations: list[PatchOp]) -> dict:
    if not _repo_dir(repo_id).exists():
        raise ValueError(
            f"Repo {repo_id!r} not found. Call set_overview first to bootstrap."
        )
    state = _CACHE.get(repo_id)
    new_diagram, result, meta = apply_operations(
        state.overview.diagram,
        operations,
        title=state.overview.title,
        description=state.overview.description,
    )
    new_title = meta.get("title", state.overview.title)
    new_description = meta.get("description", state.overview.description)

    _CACHE.replace_overview(repo_id, new_title, new_description, new_diagram)
    _write_overview(repo_id, new_title, new_description, new_diagram)
    _upsert_index(repo_id, label=new_title or repo_id, description=new_description or "")
    _bump_viewer_epoch(repo_id)

    return {
        "ok": True,
        "target": "overview",
        "applied": result.applied,
        "operations": result.operations,
        "counts_before": result.counts_before,
        "counts_after": result.counts_after,
        "title": new_title,
        "description": new_description,
    }


def _patch_module(repo_id: str, module_id: str, operations: list[PatchOp]) -> dict:
    _validate_module_id(module_id)
    state = _CACHE.get(repo_id)
    mod = state.modules.get(module_id)
    if mod is None:
        raise ValueError(
            f"Module {module_id!r} not in module_tree.json for {repo_id!r}. "
            f"Available: {list(state.modules.keys())!r}"
        )
    base = mod.diagram if mod.diagram is not None else DiagramModel()
    new_diagram, result, _meta = apply_operations(base, operations)

    _CACHE.replace_module_diagram(repo_id, module_id, new_diagram)
    _write_module_tree(repo_id, _module_tree_dict_from_state(repo_id))
    _bump_viewer_epoch(repo_id)

    return {
        "ok": True,
        "target": module_id,
        "applied": result.applied,
        "operations": result.operations,
        "counts_before": result.counts_before,
        "counts_after": result.counts_after,
    }


def main() -> None:
    """Run the MCP over stdio. Invoked by ``python -m codewiki.mcp``."""
    build_server().run(transport="stdio")


if __name__ == "__main__":
    main()
