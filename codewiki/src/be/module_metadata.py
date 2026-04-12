"""
Extract title, description, and DIAGRAM_JSON from generated module markdown.

Shared by AgentOrchestrator (leaf agents) and DocumentationGenerator (parent/overview docs).

Module-level title/description come from each ``*.md`` (``#`` heading + first paragraph, ~200 chars)
and are written into ``module_tree`` via ``apply_metadata_to_tree_path``. Per–diagram-node tooltip
text for the viewer lives under ``<!-- DIAGRAM_JSON -->`` → ``nodes[]`` with ``id``, ``title``, and
``description`` (required for every shape, including non-module nodes); module links are optional.

See ``codewiki/docs/diagram-and-module-metadata.md`` for the full pipeline.
"""

from __future__ import annotations

import json
import logging
import os
import re
from typing import Any, Dict, List, Optional, Tuple

logger = logging.getLogger(__name__)

# Stored on module_tree / metadata.json for navigation and viewer tooltips. Prompts ask the model
# to write ~this much in the opening paragraph; we still cap when ingesting older or runaway text.
MODULE_DESCRIPTION_MAX_CHARS = 200


def _collect_opening_prose_lines(lines: List[str]) -> List[str]:
    """
    Lines of opening prose: after ``# Title`` until the next ATX heading; if there is no ``# `` line,
    from the first line until the first ATX heading (docs that start with backticks or plain text).
    Skips fenced code blocks.
    """
    in_code = False
    past_h1 = False
    out: List[str] = []
    for line in lines:
        if line.strip().startswith("```"):
            in_code = not in_code
            continue
        if in_code:
            continue
        if not past_h1:
            if line.startswith("# "):
                past_h1 = True
            continue
        if re.match(r"^#{1,6}\s", line):
            break
        out.append(line.rstrip("\n"))
    if out:
        while out and not out[0].strip():
            out.pop(0)
        while out and not out[-1].strip():
            out.pop()
        return out
    in_code = False
    for line in lines:
        if line.strip().startswith("```"):
            in_code = not in_code
            continue
        if in_code:
            continue
        if re.match(r"^#{1,6}\s", line):
            break
        out.append(line.rstrip("\n"))
    while out and not out[0].strip():
        out.pop(0)
    while out and not out[-1].strip():
        out.pop()
    return out


def extract_diagram_json_from_markdown(content: str) -> Optional[Dict[str, Any]]:
    """
    Extract structured diagram JSON from markdown <!-- DIAGRAM_JSON ... --> block.

    For viewer tooltips, each entry in ``nodes`` should include ``id`` (Mermaid node id),
    ``title``, and ``description``. ``label`` is optional; module ``link`` / click targets
    are separate and optional.
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

    ``description`` is the opening prose (after ``# Title`` if present, otherwise from the file start),
    until the first ATX heading, capped at ``MODULE_DESCRIPTION_MAX_CHARS`` for JSON storage.

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
    opening_lines = _collect_opening_prose_lines(lines)
    if opening_lines:
        description = re.sub(r"\s+", " ", "\n".join(opening_lines).strip())
        if len(description) > MODULE_DESCRIPTION_MAX_CHARS:
            description = description[: MODULE_DESCRIPTION_MAX_CHARS - 3] + "..."
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
