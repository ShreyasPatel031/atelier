"""
Pydantic mirrors of the Diagram IR defined in
``codewiki/src/be/diagram_schema.py``.

These exist purely so that the MCP tool interface gets typed/validated input
straight from the LLM. ``Diagram.to_ir()`` converts back to the canonical
dataclass-based ``Diagram`` for serialization to disk.
"""

from __future__ import annotations

from typing import Literal, Optional

from pydantic import BaseModel, Field

from codewiki.src.be.diagram_schema import (
    Diagram as IRDiagram,
    DiagramEdge as IRDiagramEdge,
    DiagramGroup as IRDiagramGroup,
    DiagramNode as IRDiagramNode,
    NodeType,
)

NodeTypeLiteral = Literal["module", "component", "external"]


class DiagramNodeModel(BaseModel):
    """A node in a diagram. ``type=module`` makes it clickable in the viewer."""

    id: str = Field(description="Unique node id (lowercase_with_underscores).")
    label: str = Field(description="Human-readable label shown on the node.")
    type: NodeTypeLiteral = Field(
        default="component",
        description="'module' = clickable drill-down, 'component' = leaf, 'external' = external dep.",
    )
    link: Optional[str] = Field(
        default=None,
        description="Relative .md filename to open on click (only used when type='module').",
    )

    def to_ir(self) -> IRDiagramNode:
        return IRDiagramNode(
            id=self.id,
            label=self.label,
            type=NodeType(self.type),
            link=self.link,
        )


class DiagramEdgeModel(BaseModel):
    source: str = Field(description="Source node id.")
    target: str = Field(description="Target node id.")
    label: Optional[str] = Field(default=None, description="Optional edge label.")

    def to_ir(self) -> IRDiagramEdge:
        return IRDiagramEdge(source=self.source, target=self.target, label=self.label)


class DiagramGroupModel(BaseModel):
    id: str = Field(description="Unique group id.")
    label: str = Field(description="Human-readable group label.")
    nodes: list[str] = Field(
        default_factory=list, description="Node ids contained in this group."
    )

    def to_ir(self) -> IRDiagramGroup:
        return IRDiagramGroup(id=self.id, label=self.label, nodes=list(self.nodes))


class DiagramModel(BaseModel):
    """Renderer-agnostic diagram. Matches the IR consumed by the ReactFlow viewer."""

    direction: Literal["TD", "LR", "BT", "RL"] = Field(
        default="TD", description="Layout direction (TD = top-down, LR = left-right)."
    )
    nodes: list[DiagramNodeModel] = Field(default_factory=list)
    edges: list[DiagramEdgeModel] = Field(default_factory=list)
    groups: list[DiagramGroupModel] = Field(default_factory=list)

    def to_ir(self) -> IRDiagram:
        return IRDiagram(
            nodes=[n.to_ir() for n in self.nodes],
            edges=[e.to_ir() for e in self.edges],
            groups=[g.to_ir() for g in self.groups],
            direction=self.direction,
        )

    def to_diagram_dict(self) -> dict:
        """Plain dict in the exact shape stored on disk (overview DIAGRAM_JSON / module_tree.diagram)."""
        return self.to_ir().to_dict()


class ModuleNodeModel(BaseModel):
    """One node in module_tree.json. Children are nested under ``children``."""

    path: str = Field(default="", description="Filesystem path the module represents (informational).")
    title: str = Field(description="Short module title.")
    description: str = Field(
        default="",
        description="~200 char hover/tree description (1-2 sentences).",
    )
    components: list[str] = Field(default_factory=list)
    diagram: Optional[DiagramModel] = Field(
        default=None,
        description="Optional inline diagram for this module (inline-expanded in the viewer).",
    )
    children: dict[str, "ModuleNodeModel"] = Field(default_factory=dict)

    def to_tree_dict(self) -> dict:
        out: dict = {
            "path": self.path,
            "title": self.title,
            "description": self.description,
            "components": list(self.components),
            "children": {k: v.to_tree_dict() for k, v in self.children.items()},
        }
        if self.diagram is not None:
            out["diagram"] = self.diagram.to_diagram_dict()
        return out


class ModuleDocPayload(BaseModel):
    """One drill-down page written as ``<module_id>.md`` under ``demo/repos/<repo_id>/``."""

    module_id: str = Field(description="File basename without ``.md`` (e.g. ``orders``).")
    title: str = Field(description="Markdown H1 title.")
    description: str = Field(default="", description="Short prose under the title.")
    body_md: str = Field(default="", description="Optional Markdown body.")
    diagram: Optional[DiagramModel] = Field(
        default=None,
        description="Optional embedded DIAGRAM_JSON block.",
    )


ModuleNodeModel.model_rebuild()
