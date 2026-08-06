"""
Single-shot LLM documentation generation using Gemini JSON mode.

Returns structured {title, summary, diagram} and writes ``{module_id}.json``.
No tools, no agents, no markdown serialization.
"""
from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import Any, Dict, List, Union

from codewiki.src.config import Config, module_doc_path
from codewiki.src.be.doc_schema import ModuleDoc, validate_module_doc
from codewiki.src.be.llm_services import call_llm
from codewiki.src.be.prompt_template import (
    LEAF_JSON_SYSTEM_PROMPT,
    format_user_prompt,
)

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Auto-split reduce helpers
# ---------------------------------------------------------------------------


def generate_digest_doc_json(
    *,
    module_name: str,
    core_component_ids: List[str],
    components: Dict[str, Any],
    module_tree: Dict[str, Any],
    config: Config,
) -> Dict[str, Any]:
    """
    Like ``generate_leaf_doc_json`` but returns only nodes + summary — the "map" step.

    Used internally by auto-split so each chunk digests its source code into a compact
    node list that the reduce step can recombine without re-reading raw source.
    """
    from codewiki.src.be.prompt_template import format_user_prompt
    full_user = format_user_prompt(
        module_name=module_name,
        core_component_ids=core_component_ids,
        components=components,
        module_tree=module_tree if isinstance(module_tree, dict) else {},
    )
    user = (
        f"Analyze the {module_name} module and return a JSON object with "
        f'"title", "summary", and "diagram".\n\n{full_user}'
    )
    raw = call_llm(
        user,
        config,
        system_prompt=LEAF_JSON_SYSTEM_PROMPT,
        json_mode=True,
    )
    doc = validate_module_doc(json.loads(raw))
    return doc.to_dict()


def generate_merged_doc_json(
    *,
    module_name: str,
    chunk_docs: List[Dict[str, Any]],
    module_tree: Dict[str, Any],
    config: Config,
) -> Dict[str, Any]:
    """
    "Reduce" step: given digested chunk docs, produce one unified {title, summary, diagram}.

    The prompt feeds only the pre-digested node labels + descriptions (no raw source),
    so the combined input is small even for very large modules.  The existing
    LEAF_JSON_SYSTEM_PROMPT rules (grouping, edge integrity, etc.) apply verbatim.
    """
    # Build a compact text representation of all digested nodes across all chunks.
    digest_lines: List[str] = []
    for chunk_doc in chunk_docs:
        chunk_summary = chunk_doc.get("summary", "")
        for node in chunk_doc.get("diagram", {}).get("nodes", []):
            nid = node.get("id", "")
            label = node.get("label", "")
            title = node.get("title", "")
            desc = node.get("description", "")
            digest_lines.append(
                f'- id="{nid}" label="{label}" title="{title}" description="{desc}"'
            )
        if chunk_summary:
            digest_lines.append(f'  [chunk summary: {chunk_summary}]')

    digests_text = "\n".join(digest_lines) if digest_lines else "(no components)"

    import json as _json
    module_tree_text = _json.dumps(
        {k: {"title": v.get("title", k)} for k, v in (module_tree or {}).items()},
        indent=2,
    )

    user = (
        f'Analyze the {module_name} module and return a JSON object with '
        f'"title", "summary", and "diagram".\n\n'
        f"This module was too large to process in one pass, so it has been "
        f"pre-digested into component summaries below. Synthesize a high-level "
        f"overview diagram with at most 15 logical-area nodes (not individual "
        f"components), 3-5 groups, and link=null on every node.\n\n"
        f"<COMPONENT_DIGESTS>\n{digests_text}\n</COMPONENT_DIGESTS>\n\n"
        f"<MODULE_TREE>\n{module_tree_text}\n</MODULE_TREE>"
    )

    raw = call_llm(
        user,
        config,
        system_prompt=LEAF_JSON_SYSTEM_PROMPT,
        json_mode=True,
    )
    doc = validate_module_doc(json.loads(raw))
    result = doc.to_dict()

    # Sanitize: strip edges and group-node refs that reference nonexistent node ids.
    diagram = result.get("diagram", {})
    node_ids = {n["id"] for n in diagram.get("nodes", []) if "id" in n}
    if diagram.get("edges"):
        valid_edges = [
            e for e in diagram["edges"]
            if e.get("source") in node_ids and e.get("target") in node_ids
        ]
        stripped_edges = len(diagram["edges"]) - len(valid_edges)
        if stripped_edges:
            logger.warning(
                "[AUTO-SPLIT reduce] %s: stripped %d edges with unknown node refs",
                module_name, stripped_edges,
            )
        diagram["edges"] = valid_edges
    if diagram.get("groups"):
        for g in diagram["groups"]:
            orig = g.get("nodes", [])
            g["nodes"] = [nid for nid in orig if nid in node_ids]
        diagram["groups"] = [g for g in diagram["groups"] if g.get("nodes")]

    # Log how many source node ids survived into the merged diagram.
    source_ids = {
        node.get("id")
        for chunk_doc in chunk_docs
        for node in chunk_doc.get("diagram", {}).get("nodes", [])
    }
    merged_ids = node_ids
    dropped = source_ids - merged_ids
    if dropped:
        logger.warning(
            "[AUTO-SPLIT reduce] %s: %d/%d source node ids not present in merged diagram: %s",
            module_name, len(dropped), len(source_ids), sorted(dropped)[:10],
        )

    return result


def generate_leaf_doc_json(
    *,
    module_name: str,
    core_component_ids: List[str],
    components: Dict[str, Any],
    module_tree: Dict[str, Any],
    config: Config,
) -> Dict[str, Any]:
    """
    One-shot JSON-mode call. Returns validated ``{title, summary, diagram}`` dict.
    Raises on parse/validation failure.
    """
    full_user = format_user_prompt(
        module_name=module_name,
        core_component_ids=core_component_ids,
        components=components,
        module_tree=module_tree if isinstance(module_tree, dict) else {},
    )
    user = (
        f"Analyze the {module_name} module and return a JSON object with "
        f'"title", "summary", and "diagram".\n\n{full_user}'
    )

    raw = call_llm(
        user,
        config,
        system_prompt=LEAF_JSON_SYSTEM_PROMPT,
        json_mode=True,
    )
    doc = validate_module_doc(json.loads(raw))
    return doc.to_dict()


def write_module_doc_json(
    docs_dir: Union[str, Path],
    stem: str,
    doc: Union[Dict[str, Any], ModuleDoc],
    *,
    indent: int = 2,
) -> Path:
    """
    Validate *doc* and write ``{docs_dir}/{stem}.json``.

    Returns the path written.
    """
    validated = doc if isinstance(doc, ModuleDoc) else validate_module_doc(doc)
    path = module_doc_path(docs_dir, stem)
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(validated.to_dict(), f, indent=indent)
        f.write("\n")
    logger.info("Wrote module doc JSON: %s", path)
    return path
