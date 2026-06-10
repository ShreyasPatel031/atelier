"""
Structural validation for diagram IR before it is stored on module_tree.

Generation (`documentation_generator._extract_all_diagrams`) must pass these checks.
Sync (`doc_file_sync.audit_diagram_ir_state`) reports the same rules — no repair layer.

Reserved root keys in module_tree.json (e.g. overview snapshot): see MODULE_TREE_OVERVIEW_KEY.
"""

from __future__ import annotations

import json
import re
from typing import Any, Dict, List, Optional

# Persisted under module_tree.json at generation time (Stage 3.5).
MODULE_TREE_OVERVIEW_KEY = "__overview__"

_DIAGRAM_JSON_BLOCK_RE = re.compile(
    r"<!--\s*DIAGRAM_JSON\s*\n([\s\S]*?)\n\s*-->", re.IGNORECASE
)


def is_reserved_module_tree_key(key: str) -> bool:
    k = str(key)
    return k.startswith("__") and k.endswith("__")


RULES_FOR_PROMPT = """
<DIAGRAM_JSON_VALIDATION_RULES>
These rules are enforced when DIAGRAM_JSON is extracted into module_tree.json — invalid diagrams are rejected (not auto-repaired).

1. Top-level JSON object with arrays: "nodes", "edges", "groups" (groups may be omitted → treated as []).
2. Every nodes[i] is an object with string id; node ids must be unique.
3. Every groups[j] has string id and non-empty "nodes" array of strings; each string must equal some nodes[k].id.
4. No entry in groups[j].nodes may be a non-string or an embedded object.
5. groups[j].id must not equal any nodes[k].id; group ids must be unique.
6. Every edges[e].source and edges[e].target must be non-empty strings equal to some nodes[k].id — never a group id.
7. Omit a group entirely rather than using "nodes": [].
8. Every nodes[i].label MUST be human-readable prose (short phrase with spaces — what appears on-screen when rendering from DIAGRAM_JSON). NEVER use a CamelCase class/type name, a raw snake_case id copy-pasted from nodes[i].id, or a file/path as label; those belong only in id (and link targets).
9. Every nodes[i].title MUST be a non-empty string — short tooltip heading; **≤56 characters** recommended (avoid much beyond ~72).
10. Every nodes[i].description MUST be a non-empty string — **target ~120–320 characters (~2–4 tight sentences), hard cap ~400**; prose only (no lists, fences, stack traces, or long paths); deeper detail belongs in the markdown body, not in JSON.
11. For every groups[j] when "groups" is non-empty: groups[j].title MUST be a non-empty string — same length guidance as nodes[i].title.
12. For every groups[j] when "groups" is non-empty: groups[j].description MUST be a non-empty string — same length guidance as nodes[i].description.
</DIAGRAM_JSON_VALIDATION_RULES>
""".strip()


def _nonempty_str(val: Any) -> bool:
    return val is not None and str(val).strip() != ""


def fill_missing_diagram_tooltip_fields(diagram: Optional[Dict[str, Any]]) -> None:
    """
    Ensure every node and group has non-empty title and description (viewer tooltips).

    Mutates *diagram* in place. Used after deterministic Mermaid→IR conversion or IR repair
    so pipelines pass validation when the source had no tooltip fields.
    """
    if not diagram or not isinstance(diagram, dict):
        return
    nodes = diagram.get("nodes")
    if isinstance(nodes, list):
        for n in nodes:
            if not isinstance(n, dict):
                continue
            lab = str(n.get("label") or "").strip() or str(n.get("id") or "").strip() or "node"
            if not _nonempty_str(n.get("title")):
                n["title"] = lab
            if not _nonempty_str(n.get("description")):
                n["description"] = f"How this piece fits the diagram: {lab}."
    groups = diagram.get("groups")
    if not isinstance(groups, list):
        return
    for g in groups:
        if not isinstance(g, dict):
            continue
        glab = str(g.get("label") or "").strip() or str(g.get("id") or "").strip() or "group"
        if not _nonempty_str(g.get("title")):
            g["title"] = glab
        if not _nonempty_str(g.get("description")):
            g["description"] = (
                f"Subgraph {glab}: nodes inside this frame belong to one functional area in the diagram."
            )


def validate_diagram_ir(diagram: Optional[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Return a list of issues: { "code": str, "severity": "error", "details": dict }.
    Empty list means the diagram is structurally valid for ELK/React Flow ingestion.
    """
    issues: List[Dict[str, Any]] = []
    if not diagram or not isinstance(diagram, dict):
        issues.append(
            {"code": "diagram_not_object", "severity": "error", "details": {"reason": "null_or_not_dict"}}
        )
        return issues

    nodes = diagram.get("nodes")
    edges = diagram.get("edges")
    groups = diagram.get("groups")

    if not isinstance(nodes, list):
        issues.append(
            {"code": "diagram_missing_nodes", "severity": "error", "details": {"type": type(nodes).__name__}}
        )
        return issues
    if not isinstance(edges, list):
        issues.append(
            {"code": "diagram_missing_edges", "severity": "error", "details": {"type": type(edges).__name__}}
        )
        return issues
    if groups is None:
        groups = []
    elif not isinstance(groups, list):
        issues.append(
            {"code": "diagram_invalid_groups", "severity": "error", "details": {"type": type(groups).__name__}}
        )
        return issues

    node_ids: List[str] = []
    seen_nodes: Dict[str, int] = {}
    for i, n in enumerate(nodes):
        if not isinstance(n, dict):
            issues.append(
                {
                    "code": "node_not_object",
                    "severity": "error",
                    "details": {"index": i, "type": type(n).__name__},
                }
            )
            continue
        nid = n.get("id")
        if nid is None or str(nid).strip() == "":
            issues.append({"code": "node_missing_id", "severity": "error", "details": {"index": i}})
            continue
        sid = str(nid)
        node_ids.append(sid)
        seen_nodes[sid] = seen_nodes.get(sid, 0) + 1

        if not _nonempty_str(n.get("title")):
            issues.append(
                {
                    "code": "node_missing_title",
                    "severity": "error",
                    "details": {"index": i, "id": sid},
                }
            )
        if not _nonempty_str(n.get("description")):
            issues.append(
                {
                    "code": "node_missing_description",
                    "severity": "error",
                    "details": {"index": i, "id": sid},
                }
            )

    for nid, count in seen_nodes.items():
        if count > 1:
            issues.append(
                {"code": "duplicate_node_id", "severity": "error", "details": {"id": nid, "count": count}}
            )

    group_ids: List[str] = []
    seen_groups: Dict[str, int] = {}
    node_id_set = set(node_ids)

    for j, g in enumerate(groups):
        if not isinstance(g, dict):
            issues.append(
                {
                    "code": "group_not_object",
                    "severity": "error",
                    "details": {"index": j, "type": type(g).__name__},
                }
            )
            continue
        gid = g.get("id")
        if gid is None or str(gid).strip() == "":
            issues.append({"code": "group_missing_id", "severity": "error", "details": {"index": j}})
            continue
        sgid = str(gid)
        group_ids.append(sgid)
        seen_groups[sgid] = seen_groups.get(sgid, 0) + 1

        members = g.get("nodes")
        if not isinstance(members, list):
            issues.append(
                {
                    "code": "group_nodes_not_array",
                    "severity": "error",
                    "details": {"groupId": sgid},
                }
            )
            continue
        if len(members) == 0:
            issues.append({"code": "group_empty", "severity": "error", "details": {"groupId": sgid}})
        for mi, m in enumerate(members):
            if not isinstance(m, str):
                issues.append(
                    {
                        "code": "group_member_not_string",
                        "severity": "error",
                        "details": {"groupId": sgid, "index": mi, "type": type(m).__name__},
                    }
                )
            elif m not in node_id_set:
                issues.append(
                    {
                        "code": "group_member_unknown",
                        "severity": "error",
                        "details": {"groupId": sgid, "memberId": m},
                    }
                )

        if not _nonempty_str(g.get("title")):
            issues.append(
                {
                    "code": "group_missing_title",
                    "severity": "error",
                    "details": {"groupId": sgid},
                }
            )
        if not _nonempty_str(g.get("description")):
            issues.append(
                {
                    "code": "group_missing_description",
                    "severity": "error",
                    "details": {"groupId": sgid},
                }
            )

    for sgid, count in seen_groups.items():
        if count > 1:
            issues.append(
                {
                    "code": "duplicate_group_id",
                    "severity": "error",
                    "details": {"id": sgid, "count": count},
                }
            )

    group_id_set = set(group_ids)
    for nid in node_id_set:
        if nid in group_id_set:
            issues.append(
                {
                    "code": "node_id_collides_with_group_id",
                    "severity": "error",
                    "details": {"id": nid},
                }
            )

    for ei, e in enumerate(edges):
        if not isinstance(e, dict):
            issues.append(
                {
                    "code": "edge_not_object",
                    "severity": "error",
                    "details": {"index": ei, "type": type(e).__name__},
                }
            )
            continue
        src = e.get("source")
        tgt = e.get("target")
        s_src = str(src).strip() if src is not None else ""
        s_tgt = str(tgt).strip() if tgt is not None else ""
        if not s_src or not s_tgt:
            issues.append(
                {
                    "code": "edge_missing_endpoint",
                    "severity": "error",
                    "details": {"index": ei, "source": src, "target": tgt},
                }
            )
            continue
        if s_src in group_id_set:
            issues.append(
                {
                    "code": "edge_endpoint_is_group_id",
                    "severity": "error",
                    "details": {"index": ei, "role": "source", "id": s_src},
                }
            )
        elif s_src not in node_id_set:
            issues.append(
                {
                    "code": "edge_endpoint_unknown",
                    "severity": "error",
                    "details": {"index": ei, "role": "source", "id": s_src},
                }
            )
        if s_tgt in group_id_set:
            issues.append(
                {
                    "code": "edge_endpoint_is_group_id",
                    "severity": "error",
                    "details": {"index": ei, "role": "target", "id": s_tgt},
                }
            )
        elif s_tgt not in node_id_set:
            issues.append(
                {
                    "code": "edge_endpoint_unknown",
                    "severity": "error",
                    "details": {"index": ei, "role": "target", "id": s_tgt},
                }
            )

    return issues


def drop_invalid_diagram_edges(diagram: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Remove edges whose source/target are not node ids (or use a group id).

    Mutates *diagram* in place. Stage 4.5 safety net for LLM diagrams that reference
    class names in edges without adding matching nodes[] entries.

    Returns:
        {"dropped": int, "dropped_edges": [{"index", "source", "target", "reason"}, ...]}
    """
    result: Dict[str, Any] = {"dropped": 0, "dropped_edges": []}
    if not diagram or not isinstance(diagram, dict):
        return result

    nodes = diagram.get("nodes")
    edges = diagram.get("edges")
    groups = diagram.get("groups")
    if not isinstance(nodes, list) or not isinstance(edges, list):
        return result
    if groups is None:
        groups = []
    elif not isinstance(groups, list):
        groups = []

    node_id_set = {
        str(n["id"])
        for n in nodes
        if isinstance(n, dict) and n.get("id") is not None and str(n.get("id")).strip()
    }
    group_id_set = {
        str(g["id"])
        for g in groups
        if isinstance(g, dict) and g.get("id") is not None and str(g.get("id")).strip()
    }

    kept: List[Dict[str, Any]] = []
    for ei, e in enumerate(edges):
        if not isinstance(e, dict):
            result["dropped"] += 1
            result["dropped_edges"].append(
                {"index": ei, "source": None, "target": None, "reason": "edge_not_object"}
            )
            continue
        src = e.get("source")
        tgt = e.get("target")
        s_src = str(src).strip() if src is not None else ""
        s_tgt = str(tgt).strip() if tgt is not None else ""
        if not s_src or not s_tgt:
            result["dropped"] += 1
            result["dropped_edges"].append(
                {"index": ei, "source": src, "target": tgt, "reason": "missing_endpoint"}
            )
            continue
        if s_src in group_id_set:
            result["dropped"] += 1
            result["dropped_edges"].append(
                {"index": ei, "source": s_src, "target": s_tgt, "reason": "source_is_group_id"}
            )
            continue
        if s_tgt in group_id_set:
            result["dropped"] += 1
            result["dropped_edges"].append(
                {"index": ei, "source": s_src, "target": s_tgt, "reason": "target_is_group_id"}
            )
            continue
        if s_src not in node_id_set:
            result["dropped"] += 1
            result["dropped_edges"].append(
                {"index": ei, "source": s_src, "target": s_tgt, "reason": "unknown_source"}
            )
            continue
        if s_tgt not in node_id_set:
            result["dropped"] += 1
            result["dropped_edges"].append(
                {"index": ei, "source": s_src, "target": s_tgt, "reason": "unknown_target"}
            )
            continue
        kept.append(e)

    if result["dropped"]:
        diagram["edges"] = kept
    return result


def extract_diagram_json_from_markdown(content: str) -> Optional[Dict[str, Any]]:
    m = _DIAGRAM_JSON_BLOCK_RE.search(content or "")
    if not m:
        return None
    try:
        return json.loads(m.group(1).strip())
    except json.JSONDecodeError:
        return None


def validate_diagram_in_markdown(content: str) -> List[Dict[str, Any]]:
    d = extract_diagram_json_from_markdown(content)
    if d is None:
        return [{"code": "diagram_json_missing_or_invalid_parse", "severity": "error", "details": {}}]
    return validate_diagram_ir(d)
