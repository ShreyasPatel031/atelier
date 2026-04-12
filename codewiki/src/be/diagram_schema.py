"""
Diagram IR Schema - Renderer-agnostic diagram format
Supports: Mermaid, ELK.js (future)

Each module's diagram is stored in module_tree.json under "diagram" key
"""

from dataclasses import dataclass, field, asdict
from typing import List, Dict, Optional, Any
from enum import Enum
import json


class NodeType(Enum):
    MODULE = "module"      # Links to child module (clickable, blue)
    COMPONENT = "component"  # Internal component (not clickable)
    EXTERNAL = "external"    # External dependency


@dataclass
class DiagramNode:
    """A node in the diagram"""
    id: str                          # Unique node ID (lowercase_with_underscores)
    label: str                       # Display label (can have spaces)
    type: NodeType = NodeType.COMPONENT
    link: Optional[str] = None       # Link to .md file (for MODULE type)
    
    def to_dict(self) -> Dict:
        return {
            "id": self.id,
            "label": self.label,
            "type": self.type.value,
            "link": self.link
        }


@dataclass
class DiagramEdge:
    """An edge between nodes"""
    source: str      # Source node ID
    target: str      # Target node ID
    label: Optional[str] = None  # Optional edge label
    
    def to_dict(self) -> Dict:
        d = {"source": self.source, "target": self.target}
        if self.label:
            d["label"] = self.label
        return d


@dataclass
class DiagramGroup:
    """A group/subgraph containing nodes"""
    id: str
    label: str
    nodes: List[str] = field(default_factory=list)  # Node IDs in this group
    
    def to_dict(self) -> Dict:
        return {
            "id": self.id,
            "label": self.label,
            "nodes": self.nodes
        }


@dataclass
class Diagram:
    """Complete diagram structure"""
    nodes: List[DiagramNode] = field(default_factory=list)
    edges: List[DiagramEdge] = field(default_factory=list)
    groups: List[DiagramGroup] = field(default_factory=list)
    direction: str = "TD"  # TD, LR, etc.
    
    def to_dict(self) -> Dict:
        return {
            "direction": self.direction,
            "nodes": [n.to_dict() for n in self.nodes],
            "edges": [e.to_dict() for e in self.edges],
            "groups": [g.to_dict() for g in self.groups]
        }
    
    @classmethod
    def from_dict(cls, data: Dict) -> 'Diagram':
        """Parse diagram from dict"""
        nodes = [
            DiagramNode(
                id=n["id"],
                label=n["label"],
                type=NodeType(n.get("type", "component")),
                link=n.get("link")
            )
            for n in data.get("nodes", [])
        ]
        edges = [
            DiagramEdge(
                source=e["source"],
                target=e["target"],
                label=e.get("label")
            )
            for e in data.get("edges", [])
        ]
        groups = [
            DiagramGroup(
                id=g["id"],
                label=g["label"],
                nodes=g.get("nodes", [])
            )
            for g in data.get("groups", [])
        ]
        return cls(
            nodes=nodes,
            edges=edges,
            groups=groups,
            direction=data.get("direction", "TD")
        )
    
    def to_mermaid(self) -> str:
        """Convert to Mermaid syntax"""
        lines = [f"graph {self.direction}"]
        
        # Add groups first
        for group in self.groups:
            lines.append(f"    subgraph {group.id}[{group.label}]")
            for node_id in group.nodes:
                node = next((n for n in self.nodes if n.id == node_id), None)
                if node:
                    lines.append(f"        {node.id}[{node.label}]")
            lines.append("    end")
        
        # Add ungrouped nodes
        grouped_ids = set()
        for g in self.groups:
            grouped_ids.update(g.nodes)
        
        for node in self.nodes:
            if node.id not in grouped_ids:
                lines.append(f"    {node.id}[{node.label}]")
        
        # Add edges
        for edge in self.edges:
            if edge.label:
                lines.append(f"    {edge.source} -->|{edge.label}| {edge.target}")
            else:
                lines.append(f"    {edge.source} --> {edge.target}")
        
        # Add click handlers for MODULE type nodes
        for node in self.nodes:
            if node.type == NodeType.MODULE and node.link:
                lines.append(f"    click {node.id} \"{node.link}\" \"View {node.label}\"")
        
        return "\n".join(lines)
    
    def validate_children(self, children: Dict[str, Any]) -> List[str]:
        """Check that all children are present as nodes. Returns missing child names."""
        node_ids = {n.id.lower() for n in self.nodes}
        missing = []
        for child_name in children.keys():
            child_lower = child_name.lower()
            if child_lower not in node_ids:
                missing.append(child_name)
        return missing


# ============================================================
# MODULE TREE SCHEMA WITH DIAGRAM
# ============================================================

"""
New module_tree.json structure:

{
    "module_name": {
        "path": "string",
        "title": "Short Title",
        "description": "~200 char summary for tree / hover (1-2 sentences)",
        "components": ["component.id.1", "component.id.2"],
        "diagram": {                          # NEW: Structured diagram
            "direction": "TD",
            "nodes": [
                {"id": "auth", "label": "Authentication", "type": "module", "link": "auth.md"},
                {"id": "db", "label": "Database", "type": "module", "link": "db.md"},
                {"id": "utils", "label": "Utilities", "type": "component", "link": null}
            ],
            "edges": [
                {"source": "auth", "target": "db"},
                {"source": "auth", "target": "utils"}
            ],
            "groups": [
                {"id": "core", "label": "Core Services", "nodes": ["auth", "db"]}
            ]
        },
        "children": {
            "auth": { ... },
            "db": { ... }
        }
    }
}
"""


def create_module_diagram(
    module_name: str,
    children: Dict[str, Any],
    additional_nodes: List[DiagramNode] = None,
    edges: List[DiagramEdge] = None
) -> Diagram:
    """
    Create a diagram for a module ensuring all children are nodes.
    
    Args:
        module_name: Name of the parent module
        children: Dict of child modules from module_tree
        additional_nodes: Extra nodes beyond children
        edges: Edges between nodes
    
    Returns:
        Diagram with all children as MODULE type nodes
    """
    nodes = []
    
    # Add all children as MODULE nodes (clickable)
    for child_name, child_data in children.items():
        title = child_data.get("title", child_name.replace("_", " ").title())
        nodes.append(DiagramNode(
            id=child_name,
            label=title,
            type=NodeType.MODULE,
            link=f"{child_name}.md"
        ))
    
    # Add any additional nodes
    if additional_nodes:
        nodes.extend(additional_nodes)
    
    return Diagram(
        nodes=nodes,
        edges=edges or [],
        groups=[],
        direction="TD"
    )
