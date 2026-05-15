"""
Granular patch operations for codewiki diagrams.

Each ``patch_diagram`` call carries an ordered list of ``PatchOp`` objects.
The engine validates referential integrity for the whole batch before
applying anything; on validation failure no mutation occurs (the cached
``DiagramModel`` is rebuilt from a deep-copy snapshot to guarantee no partial
state if a per-op apply somehow throws).

Operations are a discriminated union on the ``op`` field. Adding a new op:
  1. Add a new ``BaseModel`` subclass with ``op: Literal["..."]``.
  2. Append it to ``PatchOp = Union[...]``.
  3. Add an ``elif isinstance(op, NewOp)`` branch in ``_apply_one``.
"""

from __future__ import annotations

import copy
from typing import Annotated, Literal, Optional, Union

from pydantic import BaseModel, Field

from codewiki.mcp.models import (
    DiagramEdgeModel,
    DiagramGroupModel,
    DiagramModel,
    DiagramNodeModel,
    NodeTypeLiteral,
)
from codewiki.mcp.timing import span


# ---------------------------------------------------------------------------
# Operation models (discriminated union)
# ---------------------------------------------------------------------------


class _Base(BaseModel):
    pass


# --- node ops --------------------------------------------------------------


class AddNode(_Base):
    op: Literal["add_node"]
    id: str
    label: str
    type: NodeTypeLiteral = "component"
    link: Optional[str] = None


class RemoveNode(_Base):
    op: Literal["remove_node"]
    id: str
    cascade: bool = Field(
        default=True,
        description="Also drop edges referencing this node and remove from groups.",
    )


class UpdateNode(_Base):
    op: Literal["update_node"]
    id: str
    label: Optional[str] = None
    type: Optional[NodeTypeLiteral] = None
    link: Optional[str] = None
    new_id: Optional[str] = Field(
        default=None,
        description="Rename the node id; rewires edges and group memberships.",
    )


# --- edge ops --------------------------------------------------------------


class AddEdge(_Base):
    op: Literal["add_edge"]
    source: str
    target: str
    label: Optional[str] = None


class RemoveEdge(_Base):
    op: Literal["remove_edge"]
    source: str
    target: str
    label: Optional[str] = Field(
        default=None,
        description="If set, only remove the edge with this label; else remove first match.",
    )


class UpdateEdge(_Base):
    op: Literal["update_edge"]
    source: str
    target: str
    label: Optional[str] = None  # new label; pass empty string to clear
    match_label: Optional[str] = Field(
        default=None,
        description="If multiple edges share source/target, only update the one with this label.",
    )


# --- group ops -------------------------------------------------------------


class AddGroup(_Base):
    op: Literal["add_group"]
    id: str
    label: str
    node_ids: list[str] = Field(default_factory=list)


class RemoveGroup(_Base):
    op: Literal["remove_group"]
    id: str


class UpdateGroup(_Base):
    op: Literal["update_group"]
    id: str
    label: Optional[str] = None
    new_id: Optional[str] = None


class MergeGroups(_Base):
    op: Literal["merge_groups"]
    group_ids: list[str] = Field(min_length=2)
    new_id: str
    new_label: str


class MoveNodes(_Base):
    op: Literal["move_nodes"]
    node_ids: list[str] = Field(min_length=1)
    to_group: Optional[str] = Field(
        default=None,
        description="Target group id; pass null to remove nodes from any group (ungroup).",
    )


# --- metadata ops ----------------------------------------------------------


class SetDirection(_Base):
    op: Literal["set_direction"]
    direction: Literal["TD", "LR", "BT", "RL"]


class SetTitle(_Base):
    op: Literal["set_title"]
    title: str


class SetDescription(_Base):
    op: Literal["set_description"]
    description: str


# Discriminated union --------------------------------------------------------

PatchOp = Annotated[
    Union[
        AddNode,
        RemoveNode,
        UpdateNode,
        AddEdge,
        RemoveEdge,
        UpdateEdge,
        AddGroup,
        RemoveGroup,
        UpdateGroup,
        MergeGroups,
        MoveNodes,
        SetDirection,
        SetTitle,
        SetDescription,
    ],
    Field(discriminator="op"),
]


# ---------------------------------------------------------------------------
# Result
# ---------------------------------------------------------------------------


class PatchResult(BaseModel):
    applied: int
    operations: list[str]
    counts_before: dict[str, int]
    counts_after: dict[str, int]
    title: Optional[str] = None
    description: Optional[str] = None


# ---------------------------------------------------------------------------
# Engine
# ---------------------------------------------------------------------------


def _diagram_counts(d: DiagramModel) -> dict[str, int]:
    return {"nodes": len(d.nodes), "edges": len(d.edges), "groups": len(d.groups)}


def apply_operations(
    diagram: DiagramModel,
    operations: list[PatchOp],
    *,
    title: Optional[str] = None,
    description: Optional[str] = None,
) -> tuple[DiagramModel, PatchResult, dict]:
    """Validate and apply ``operations`` to ``diagram``.

    Returns ``(new_diagram, result, meta)`` where ``meta`` contains updated
    ``title`` / ``description`` if set_title / set_description were applied
    (only relevant for the overview target). The original ``diagram`` is not
    mutated; the returned one is a deep copy with operations applied.
    """
    counts_before = _diagram_counts(diagram)

    with span("patch_validate", ops=len(operations)):
        _validate_all(diagram, operations)

    with span("patch_apply", ops=len(operations)):
        working = diagram.model_copy(deep=True)
        meta: dict = {}
        for op in operations:
            _apply_one(working, op, meta)

    new_title = meta.get("title") if "title" in meta else title
    new_description = meta.get("description") if "description" in meta else description

    result = PatchResult(
        applied=len(operations),
        operations=[op.op for op in operations],
        counts_before=counts_before,
        counts_after=_diagram_counts(working),
        title=new_title,
        description=new_description,
    )
    return working, result, meta


# ---------------------------------------------------------------------------
# Validation
# ---------------------------------------------------------------------------


def _validate_all(diagram: DiagramModel, operations: list[PatchOp]) -> None:
    """Simulate operations against an index of node/group ids; raise if invalid.

    We don't apply mutations during validation; we maintain shadow sets that
    track adds/removes so chained ops (add a, then edge a->b) work.
    """
    node_ids = {n.id for n in diagram.nodes}
    group_ids = {g.id for g in diagram.groups}
    edges = {(e.source, e.target, e.label) for e in diagram.edges}

    for i, op in enumerate(operations):
        prefix = f"op[{i}] {op.op}"
        if isinstance(op, AddNode):
            if op.id in node_ids:
                raise ValueError(f"{prefix}: node id {op.id!r} already exists")
            node_ids.add(op.id)
        elif isinstance(op, RemoveNode):
            if op.id not in node_ids:
                raise ValueError(f"{prefix}: node id {op.id!r} not found")
            node_ids.discard(op.id)
            if op.cascade:
                edges = {e for e in edges if e[0] != op.id and e[1] != op.id}
        elif isinstance(op, UpdateNode):
            if op.id not in node_ids:
                raise ValueError(f"{prefix}: node id {op.id!r} not found")
            if op.new_id and op.new_id != op.id:
                if op.new_id in node_ids:
                    raise ValueError(
                        f"{prefix}: rename target {op.new_id!r} already exists"
                    )
                node_ids.discard(op.id)
                node_ids.add(op.new_id)
                edges = {
                    (
                        op.new_id if e[0] == op.id else e[0],
                        op.new_id if e[1] == op.id else e[1],
                        e[2],
                    )
                    for e in edges
                }
        elif isinstance(op, AddEdge):
            if op.source not in node_ids:
                raise ValueError(f"{prefix}: source {op.source!r} not in nodes")
            if op.target not in node_ids:
                raise ValueError(f"{prefix}: target {op.target!r} not in nodes")
            edges.add((op.source, op.target, op.label))
        elif isinstance(op, RemoveEdge):
            match = next(
                (
                    e
                    for e in edges
                    if e[0] == op.source
                    and e[1] == op.target
                    and (op.label is None or e[2] == op.label)
                ),
                None,
            )
            if match is None:
                raise ValueError(
                    f"{prefix}: no edge {op.source}->{op.target}"
                    + (f" with label {op.label!r}" if op.label else "")
                )
            edges.discard(match)
        elif isinstance(op, UpdateEdge):
            match = next(
                (
                    e
                    for e in edges
                    if e[0] == op.source
                    and e[1] == op.target
                    and (op.match_label is None or e[2] == op.match_label)
                ),
                None,
            )
            if match is None:
                raise ValueError(f"{prefix}: no edge {op.source}->{op.target} to update")
        elif isinstance(op, AddGroup):
            if op.id in group_ids:
                raise ValueError(f"{prefix}: group id {op.id!r} already exists")
            for nid in op.node_ids:
                if nid not in node_ids:
                    raise ValueError(f"{prefix}: group node {nid!r} not in nodes")
            group_ids.add(op.id)
        elif isinstance(op, RemoveGroup):
            if op.id not in group_ids:
                raise ValueError(f"{prefix}: group id {op.id!r} not found")
            group_ids.discard(op.id)
        elif isinstance(op, UpdateGroup):
            if op.id not in group_ids:
                raise ValueError(f"{prefix}: group id {op.id!r} not found")
            if op.new_id and op.new_id != op.id:
                if op.new_id in group_ids:
                    raise ValueError(
                        f"{prefix}: rename target {op.new_id!r} already exists"
                    )
                group_ids.discard(op.id)
                group_ids.add(op.new_id)
        elif isinstance(op, MergeGroups):
            missing = [g for g in op.group_ids if g not in group_ids]
            if missing:
                raise ValueError(f"{prefix}: groups not found: {missing!r}")
            for g in op.group_ids:
                group_ids.discard(g)
            if op.new_id in group_ids:
                raise ValueError(f"{prefix}: new_id {op.new_id!r} already exists")
            group_ids.add(op.new_id)
        elif isinstance(op, MoveNodes):
            for nid in op.node_ids:
                if nid not in node_ids:
                    raise ValueError(f"{prefix}: node {nid!r} not in nodes")
            if op.to_group is not None and op.to_group not in group_ids:
                raise ValueError(f"{prefix}: target group {op.to_group!r} not found")
        # set_direction / set_title / set_description need no validation


# ---------------------------------------------------------------------------
# Apply (one op against a working diagram)
# ---------------------------------------------------------------------------


def _apply_one(d: DiagramModel, op: PatchOp, meta: dict) -> None:  # noqa: C901
    if isinstance(op, AddNode):
        d.nodes.append(
            DiagramNodeModel(id=op.id, label=op.label, type=op.type, link=op.link)
        )

    elif isinstance(op, RemoveNode):
        d.nodes = [n for n in d.nodes if n.id != op.id]
        if op.cascade:
            d.edges = [e for e in d.edges if e.source != op.id and e.target != op.id]
            for g in d.groups:
                g.nodes = [n for n in g.nodes if n != op.id]

    elif isinstance(op, UpdateNode):
        node = next((n for n in d.nodes if n.id == op.id), None)
        if node is None:
            return
        if op.label is not None:
            node.label = op.label
        if op.type is not None:
            node.type = op.type
        if op.link is not None:
            node.link = op.link or None
        if op.new_id and op.new_id != op.id:
            old = node.id
            node.id = op.new_id
            for e in d.edges:
                if e.source == old:
                    e.source = op.new_id
                if e.target == old:
                    e.target = op.new_id
            for g in d.groups:
                g.nodes = [op.new_id if n == old else n for n in g.nodes]

    elif isinstance(op, AddEdge):
        d.edges.append(DiagramEdgeModel(source=op.source, target=op.target, label=op.label))

    elif isinstance(op, RemoveEdge):
        kept: list[DiagramEdgeModel] = []
        removed = False
        for e in d.edges:
            if (
                not removed
                and e.source == op.source
                and e.target == op.target
                and (op.label is None or e.label == op.label)
            ):
                removed = True
                continue
            kept.append(e)
        d.edges = kept

    elif isinstance(op, UpdateEdge):
        for e in d.edges:
            if (
                e.source == op.source
                and e.target == op.target
                and (op.match_label is None or e.label == op.match_label)
            ):
                e.label = op.label or None
                break

    elif isinstance(op, AddGroup):
        d.groups.append(
            DiagramGroupModel(id=op.id, label=op.label, nodes=list(op.node_ids))
        )

    elif isinstance(op, RemoveGroup):
        d.groups = [g for g in d.groups if g.id != op.id]

    elif isinstance(op, UpdateGroup):
        g = next((x for x in d.groups if x.id == op.id), None)
        if g is None:
            return
        if op.label is not None:
            g.label = op.label
        if op.new_id and op.new_id != op.id:
            g.id = op.new_id

    elif isinstance(op, MergeGroups):
        merged_nodes: list[str] = []
        seen: set[str] = set()
        kept: list[DiagramGroupModel] = []
        target_set = set(op.group_ids)
        for g in d.groups:
            if g.id in target_set:
                for n in g.nodes:
                    if n not in seen:
                        seen.add(n)
                        merged_nodes.append(n)
            else:
                kept.append(g)
        kept.append(
            DiagramGroupModel(id=op.new_id, label=op.new_label, nodes=merged_nodes)
        )
        d.groups = kept

    elif isinstance(op, MoveNodes):
        moving = set(op.node_ids)
        for g in d.groups:
            g.nodes = [n for n in g.nodes if n not in moving]
        if op.to_group is not None:
            target = next((x for x in d.groups if x.id == op.to_group), None)
            if target is not None:
                # preserve incoming order; skip any already present
                existing = set(target.nodes)
                for nid in op.node_ids:
                    if nid not in existing:
                        target.nodes.append(nid)
                        existing.add(nid)

    elif isinstance(op, SetDirection):
        d.direction = op.direction

    elif isinstance(op, SetTitle):
        meta["title"] = op.title

    elif isinstance(op, SetDescription):
        meta["description"] = op.description


__all__ = [
    "PatchOp",
    "PatchResult",
    "apply_operations",
    "AddNode",
    "RemoveNode",
    "UpdateNode",
    "AddEdge",
    "RemoveEdge",
    "UpdateEdge",
    "AddGroup",
    "RemoveGroup",
    "UpdateGroup",
    "MergeGroups",
    "MoveNodes",
    "SetDirection",
    "SetTitle",
    "SetDescription",
]
