"""
Canonical JSON documentation schema for module and overview artifacts.

All generated docs are ``{module_id}.json`` with shape::

    { "title": str, "summary": str, "diagram": { direction, nodes, edges, groups? } }

Diagram ``link`` fields are module ids (no ``.md`` / ``.json`` suffix).
"""

from __future__ import annotations

import re
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field, field_validator

_LINK_SUFFIX_RE = re.compile(r"\.(md|json)$", re.IGNORECASE)


class DiagramNodeDoc(BaseModel):
    id: str
    label: str
    type: str = "component"
    link: Optional[str] = None
    title: Optional[str] = None
    description: Optional[str] = None


class DiagramEdgeDoc(BaseModel):
    source: str
    target: str
    label: Optional[str] = None
    title: Optional[str] = None
    description: Optional[str] = None


class DiagramGroupDoc(BaseModel):
    id: str
    label: str
    nodes: List[str] = Field(default_factory=list)
    title: Optional[str] = None
    description: Optional[str] = None
    role: Optional[str] = None


class DiagramDoc(BaseModel):
    direction: str = "TD"
    nodes: List[DiagramNodeDoc] = Field(default_factory=list)
    edges: List[DiagramEdgeDoc] = Field(default_factory=list)
    groups: List[DiagramGroupDoc] = Field(default_factory=list)

    @field_validator("direction")
    @classmethod
    def direction_non_empty(cls, v: str) -> str:
        if not (v or "").strip():
            return "TD"
        return v.strip()


class ModuleDoc(BaseModel):
    """Single module or overview documentation object."""

    title: str
    summary: str
    diagram: DiagramDoc

    def to_dict(self) -> Dict[str, Any]:
        return self.model_dump(mode="json")


def _normalize_link(value: Any) -> Any:
    if value is None:
        return None
    if not isinstance(value, str):
        return value
    s = value.strip()
    if not s:
        return None
    return _LINK_SUFFIX_RE.sub("", s)


def normalize_diagram_links(diagram: Dict[str, Any]) -> Dict[str, Any]:
    """
    Return a copy of *diagram* with ``link`` fields normalized to bare module ids.
    """
    if not isinstance(diagram, dict):
        return diagram
    out = dict(diagram)
    nodes = out.get("nodes")
    if isinstance(nodes, list):
        new_nodes = []
        for n in nodes:
            if isinstance(n, dict):
                nn = dict(n)
                if "link" in nn:
                    nn["link"] = _normalize_link(nn.get("link"))
                new_nodes.append(nn)
            else:
                new_nodes.append(n)
        out["nodes"] = new_nodes
    return out


def validate_module_doc(data: Dict[str, Any]) -> ModuleDoc:
    """
    Parse and validate a module/overview JSON object.

    Normalizes diagram links before validation.
    """
    if not isinstance(data, dict):
        raise TypeError(f"module doc must be a dict, got {type(data).__name__}")
    payload = dict(data)
    if "diagram" in payload and isinstance(payload["diagram"], dict):
        payload["diagram"] = normalize_diagram_links(payload["diagram"])
    doc = ModuleDoc.model_validate(payload)
    return doc


def module_doc_to_tree_fields(doc: ModuleDoc) -> tuple[str, str, Dict[str, Any]]:
    """Map a validated doc to module_tree title, description, diagram."""
    return doc.title, doc.summary, doc.diagram.model_dump(mode="json")
