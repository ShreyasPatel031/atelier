from pydantic_ai import RunContext, Tool, Agent

from codewiki.src.be.agent_tools.deps import CodeWikiDeps
from codewiki.src.be.agent_tools.read_code_components import read_code_components_tool
from codewiki.src.be.agent_tools.str_replace_editor import str_replace_editor_tool
from codewiki.src.be.llm_services import create_fallback_models
from codewiki.src.be.prompt_template import SYSTEM_PROMPT, LEAF_SYSTEM_PROMPT, format_user_prompt
from codewiki.src.be.utils import count_module_tokens
from codewiki.src.config import MODULE_TREE_FILENAME
from codewiki.src.file_manager import file_manager
import asyncio
import copy
import logging
import os
from typing import Dict, List, Any, Optional

logger = logging.getLogger(__name__)


def _record_submodule_md_missing(
    deps: CodeWikiDeps,
    sub_module_name: str,
    reason: str,
    detail: Optional[str] = None,
    component_count: int = 0,
) -> None:
    """Persist structured failure for postmortem (submodule_md_failures.json + generation_report)."""
    try:
        from codewiki.src.be.generation_tracker import get_generation_tracker

        path_to = "/".join(deps.path_to_current_module + [sub_module_name])
        get_generation_tracker().track_submodule_md_failure(
            deps.absolute_docs_path,
            {
                "sub_module_name": sub_module_name,
                "path_to_submodule": path_to,
                "parent_module": deps.path_to_current_module[-1]
                if deps.path_to_current_module
                else "",
                "depth": deps.current_depth,
                "component_count": component_count,
                "reason": reason,
                "detail": (detail or "")[:4000],
            },
        )
    except Exception as ex:
        logger.warning("Could not record submodule_md_failure for %s: %s", sub_module_name, ex)


async def _process_one_sub_module(
    sub_module_name: str,
    spec: dict[str, Any],
    sub_deps: CodeWikiDeps,
    *,
    children_container: dict[str, Any],
    fallback_models,
) -> None:
    """Generate documentation for a single sub-module (parallel-safe with isolated sub_deps)."""
    core_component_ids = spec["components"]
    parent_depth = sub_deps.current_depth - 1
    indent = "  " * parent_depth
    arrow = "└─" if parent_depth > 0 else "→"

    logger.info(f"{indent}{arrow} Generating documentation for sub-module: {sub_module_name}")

    from codewiki.src.config import AUTO_SPLIT_TOKEN_THRESHOLD
    num_tokens = count_module_tokens(core_component_ids, sub_deps.components)
    sub_json_path = os.path.join(sub_deps.absolute_docs_path, f"{sub_module_name}.json")
    ncomp = len(core_component_ids)

    # Use the same token threshold as process_module: prefer 4-FAST for small modules,
    # agent path only for modules that genuinely need multi-turn reasoning.
    if num_tokens > AUTO_SPLIT_TOKEN_THRESHOLD:
        logger.info(
            f"{indent}  Complex agent (tokens={num_tokens:,} > {AUTO_SPLIT_TOKEN_THRESHOLD:,}, "
            f"depth={sub_deps.current_depth})"
        )
        sub_agent = Agent(
            model=fallback_models,
            retries=3,
            name=sub_module_name,
            deps_type=CodeWikiDeps,
            system_prompt=SYSTEM_PROMPT.format(module_name=sub_module_name),
            tools=[
                read_code_components_tool,
                str_replace_editor_tool,
                generate_sub_module_documentation_tool,
            ],
        )
        user_msg = format_user_prompt(
            module_name=sub_deps.current_module_name,
            core_component_ids=core_component_ids,
            components=sub_deps.components,
            module_tree=sub_deps.module_tree,
        )
        try:
            await sub_agent.run(user_msg, deps=sub_deps)
        except Exception as sub_err:
            logger.error(f"{indent}  Agent failed for {sub_module_name}: {sub_err}")
            _record_submodule_md_missing(
                sub_deps,
                sub_module_name,
                "agent_exception",
                detail=str(sub_err)[:4000],
                component_count=ncomp,
            )
    else:
        logger.info(
            f"{indent}  Leaf JSON mode (depth={sub_deps.current_depth}, tokens={num_tokens})"
        )
        try:
            from codewiki.src.be.agent_orchestrator import generate_leaf_doc_json_throttled
            import json as _json

            doc = await generate_leaf_doc_json_throttled(
                module_name=sub_module_name,
                core_component_ids=core_component_ids,
                components=sub_deps.components,
                module_tree=sub_deps.module_tree if isinstance(sub_deps.module_tree, dict) else {},
                config=sub_deps.config,
            )
            with open(sub_json_path, "w") as f:
                _json.dump(doc, f, indent=2)
            logger.info(f"{indent}  Wrote {sub_module_name}.json")

            tree_node = children_container.get(sub_module_name, {})
            tree_node["title"] = doc["title"]
            tree_node["description"] = doc["summary"]
            tree_node["diagram"] = doc["diagram"]
            children_container[sub_module_name] = tree_node

        except Exception as json_err:
            logger.error(f"{indent}  JSON mode failed for {sub_module_name}: {json_err}")
            _record_submodule_md_missing(
                sub_deps,
                sub_module_name,
                "json_mode_failed",
                detail=str(json_err)[:4000],
                component_count=ncomp,
            )


async def generate_sub_module_documentation(
    ctx: RunContext[CodeWikiDeps],
    sub_module_specs: dict[str, dict]
) -> str:
    """Generate detailed description of a given sub-module specs to the sub-agents

    Args:
        sub_module_specs: The specs of the sub-modules to generate documentation for. Each entry must include:
            - title: Short 2-4 word title for the module (shown on hover)
            - description: ~200 characters (about 1-2 sentences) for module tree and hover tooltips
            - components: List of component IDs belonging to this module
            
        Example format:
        {
            "user_auth": {
                "title": "User Authentication",
                "description": "Handles user login, logout, and session management.",
                "components": ["auth.login", "auth.logout", "auth.session"]
            },
            "database_layer": {
                "title": "Database Layer", 
                "description": "Manages database connections and query execution.",
                "components": ["db.connection", "db.query"]
            }
        }
    """

    deps = ctx.deps
    previous_module_name = deps.current_module_name
    
    # VALIDATION: Reject sub-modules with same name as parent (prevents infinite nesting)
    filtered_specs = {}
    for sub_module_name, spec in sub_module_specs.items():
        if sub_module_name == previous_module_name:
            logger.warning(f"Rejecting sub-module '{sub_module_name}' - same name as parent module. This would create infinite nesting.")
            continue
        filtered_specs[sub_module_name] = spec
    
    if not filtered_specs:
        return f"No valid sub-modules to create (all rejected due to duplicate naming with parent '{previous_module_name}')"
    
    sub_module_specs = filtered_specs
    
    # Create fallback models from config
    fallback_models = create_fallback_models(deps.config)

    # Reload module tree from disk so nested tools see merges from parallel Stage 3 workers.
    tree_path = os.path.join(deps.absolute_docs_path, MODULE_TREE_FILENAME)
    try:
        if os.path.exists(tree_path):
            loaded = file_manager.load_json(tree_path)
            if isinstance(loaded, dict):
                deps.module_tree = loaded
    except Exception as reload_err:
        logger.warning("Could not reload module tree from %s: %s", tree_path, reload_err)

    # add the sub-module to the module tree
    value = deps.module_tree
    for key in deps.path_to_current_module:
        if key not in value:
            logger.error(
                "module_tree missing key %r for path %s (available: %s)",
                key,
                deps.path_to_current_module,
                list(value.keys())[:40],
            )
            return (
                f"Error: module tree has no segment {key!r} for path {deps.path_to_current_module!r}; "
                "cannot attach sub-modules (tree may be out of sync)."
            )
        node = value[key]
        if not isinstance(node, dict):
            logger.error("module_tree[%r] is not a dict: %s", key, type(node).__name__)
            return f"Error: invalid module_tree node at {key!r}."
        if node.get("children") is None:
            node["children"] = {}
        value = node["children"]
    
    # Parse specs - support both old format (list) and new format (dict with title/description)
    parsed_specs = {}
    for sub_module_name, spec in sub_module_specs.items():
        if isinstance(spec, list):
            # Old format: just component list
            parsed_specs[sub_module_name] = {
                "title": sub_module_name.replace("_", " ").title(),
                "description": f"Documentation for {sub_module_name} module.",
                "components": spec
            }
        else:
            # New format: dict with title, description, components
            parsed_specs[sub_module_name] = {
                "title": spec.get("title", sub_module_name.replace("_", " ").title()),
                "description": spec.get("description", f"Documentation for {sub_module_name} module."),
                "components": spec.get("components", [])
            }
    
    # Add to module tree with title and description
    for sub_module_name, spec in parsed_specs.items():
        value[sub_module_name] = {
            "title": spec["title"],
            "description": spec["description"],
            "components": spec["components"], 
            "children": {}
        }
    
    sub_tasks = []
    for sub_module_name, spec in parsed_specs.items():
        sub_deps = copy.copy(deps)
        sub_deps.path_to_current_module = list(deps.path_to_current_module) + [sub_module_name]
        sub_deps.current_module_name = sub_module_name
        sub_deps.current_depth = deps.current_depth + 1
        sub_tasks.append(
            _process_one_sub_module(
                sub_module_name,
                spec,
                sub_deps,
                children_container=value,
                fallback_models=fallback_models,
            )
        )
    await asyncio.gather(*sub_tasks)

    deps.current_module_name = previous_module_name

    return f"Generated docs: {', '.join(sub_module_specs.keys())}"


generate_sub_module_documentation_tool = Tool(function=generate_sub_module_documentation, name="generate_sub_module_documentation", description="Generate detailed description of a given sub-module specs to the sub-agents", takes_ctx=True)