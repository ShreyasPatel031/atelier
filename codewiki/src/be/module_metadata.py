"""
Extract title, description, and DIAGRAM_JSON from generated module markdown.

Shared by AgentOrchestrator (leaf agents) and DocumentationGenerator (parent/overview docs).
"""

from __future__ import annotations

import json
import logging
import os
import re
from typing import Any, Dict, List, Optional, Tuple

logger = logging.getLogger(__name__)


def extract_diagram_json_from_markdown(content: str) -> Optional[Dict[str, Any]]:
    """
    Extract structured diagram JSON from markdown <!-- DIAGRAM_JSON ... --> block.
    """
    pattern = r"<!--\s*DIAGRAM_JSON\s*\n([\s\S]*?)\n\s*-->"
    match = re.search(pattern, content)
    if match:
        try:
            return json.loads(match.group(1))
        except json.JSONDecodeError as e:
            logger.warning("Failed to parse DIAGRAM_JSON: %s", e)
            return None
    return None


def extract_module_metadata_from_markdown(
    content: str, *, fallback_title: Optional[str] = None
) -> Tuple[str, str, Optional[Dict[str, Any]]]:
    """
    Extract title, description, and diagram from markdown string.

    Args:
        content: Full markdown body.
        fallback_title: If no # heading, use this (e.g. stem from filename).

    Returns:
        (title, description, diagram_dict_or_none)
    """
    diagram = extract_diagram_json_from_markdown(content)

    title_match = re.search(
        r"^#\s+(.+?)(?:\s+Module)?(?:\s+Documentation)?\s*$",
        content,
        re.MULTILINE,
    )
    if title_match:
        title = title_match.group(1).strip()
        words = title.split()[:5]
        title = " ".join(words)
    elif fallback_title:
        title = fallback_title
    else:
        title = ""

    lines = content.split("\n")
    description_lines: List[str] = []
    in_code_block = False
    past_title = False

    for line in lines:
        if line.strip().startswith("```"):
            in_code_block = not in_code_block
            continue

        if in_code_block:
            continue

        if not past_title and line.startswith("# "):
            past_title = True
            continue

        if line.startswith("#"):
            continue

        if not description_lines and not line.strip():
            continue

        if line.strip():
            description_lines.append(line.strip())
            if len(description_lines) >= 2:
                break
        elif description_lines:
            break

    if description_lines:
        description = " ".join(description_lines)
        sentences = re.split(r"(?<=[.!?])\s+", description)
        description = " ".join(sentences[:2])
        if len(description) > 200:
            description = description[:197] + "..."
    else:
        description = f"Documentation for the {title} module." if title else ""

    return title, description, diagram


def extract_module_metadata_from_file(md_path: str) -> Tuple[str, str, Optional[Dict[str, Any]]]:
    """
    Read a markdown file and extract title, description, diagram.
    """
    with open(md_path, "r", encoding="utf-8", errors="replace") as f:
        content = f.read()
    stem = os.path.basename(md_path).replace(".md", "").replace("_", " ").title()
    return extract_module_metadata_from_markdown(content, fallback_title=stem)


def apply_metadata_to_tree_path(
    tree: Dict[str, Any],
    path: List[str],
    title: str,
    desc: str,
    diagram: Optional[Dict[str, Any]],
) -> bool:
    """
    Navigate tree by path segments and set title, description, optional diagram on the leaf node.

    Returns True if the node was found and updated.
    """
    if not path:
        return False

    current = tree
    for i, part in enumerate(path):
        if part not in current:
            logger.warning(
                "apply_metadata_to_tree_path: segment %r not in tree at index %s",
                part,
                i,
            )
            return False
        if i == len(path) - 1:
            node = current[part]
            node["title"] = title
            node["description"] = desc
            if diagram:
                node["diagram"] = diagram
            return True
        child = current[part].get("children")
        if not child:
            logger.warning(
                "apply_metadata_to_tree_path: no children under %r for deeper path",
                part,
            )
            return False
        current = child
    return False
