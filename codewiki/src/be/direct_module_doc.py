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
