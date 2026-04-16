from pydantic_ai import RunContext, Tool, Agent

from codewiki.src.be.agent_tools.deps import CodeWikiDeps
from codewiki.src.be.agent_tools.read_code_components import read_code_components_tool
from codewiki.src.be.agent_tools.str_replace_editor import str_replace_editor_tool
from codewiki.src.be.llm_services import create_fallback_models
from codewiki.src.be.prompt_template import SYSTEM_PROMPT, LEAF_SYSTEM_PROMPT, format_user_prompt
from codewiki.src.be.utils import is_complex_module, count_module_tokens
from codewiki.src.config import MAX_TOKEN_PER_LEAF_MODULE, MIN_DEPTH, MODULE_TREE_FILENAME
from codewiki.src.file_manager import file_manager
import asyncio
import copy
import logging
import os
from collections import defaultdict
from typing import Dict, List, Any

logger = logging.getLogger(__name__)


def _auto_split_by_directory(
    component_ids: List[str],
    components: Dict[str, Any],
    current_depth: int
) -> Dict[str, List[str]]:
    """
    Auto-split components by directory path at the appropriate depth level.
    Returns a dict mapping sub-module names to their component IDs.
    """
    # Group by directory component at current_depth level
    groups = defaultdict(list)
    
    for comp_id in component_ids:
        if comp_id not in components:
            continue
        
        component = components[comp_id]
        path = component.relative_path
        parts = path.split(os.sep)
        
        # Use directory at current_depth + 1 level (since we're creating children)
        depth_for_split = current_depth
        if len(parts) > depth_for_split:
            key = parts[depth_for_split]
            # Clean the key for module naming
            key = key.lower().replace("-", "_").replace(".", "_").replace(" ", "_")
            if not key:
                key = "other"
        else:
            key = "other"
        
        groups[key].append(comp_id)
    
    # Filter out groups with only 1 component (not worth splitting)
    result = {k: v for k, v in groups.items() if len(v) >= 1}
    
    # Only return if we have more than 1 group (actual split happened)
    if len(result) <= 1:
        return {}
    
    return result



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
    
    for sub_module_name, spec in parsed_specs.items():
        core_component_ids = spec["components"]

        indent = "  " * deps.current_depth
        arrow = "└─" if deps.current_depth > 0 else "→"

        logger.info(f"{indent}{arrow} Generating documentation for sub-module: {sub_module_name}")

        num_tokens = count_module_tokens(core_component_ids, ctx.deps.components)
        
        force_subagent = ctx.deps.current_depth < MIN_DEPTH and len(core_component_ids) >= 2
        normal_criteria = (
            is_complex_module(ctx.deps.components, core_component_ids) and 
            ctx.deps.current_depth < ctx.deps.max_depth and 
            num_tokens >= MAX_TOKEN_PER_LEAF_MODULE
        )
        
        if force_subagent or normal_criteria:
            logger.info(f"{indent}  Using complex agent (force={force_subagent}, normal={normal_criteria}, depth={ctx.deps.current_depth}, min_depth={MIN_DEPTH})")
            sub_agent = Agent(
                model=fallback_models,
                name=sub_module_name,
                deps_type=CodeWikiDeps,
                system_prompt=SYSTEM_PROMPT.format(module_name=sub_module_name),
                tools=[read_code_components_tool, str_replace_editor_tool, generate_sub_module_documentation_tool],
            )
        else:
            logger.info(f"{indent}  Using leaf agent (depth={ctx.deps.current_depth}, tokens={num_tokens})")
            sub_agent = Agent(
                model=fallback_models,
                name=sub_module_name,
                deps_type=CodeWikiDeps,
                system_prompt=LEAF_SYSTEM_PROMPT.format(module_name=sub_module_name),
                tools=[read_code_components_tool, str_replace_editor_tool],
            )
        deps.current_module_name = sub_module_name
        deps.path_to_current_module.append(sub_module_name)
        deps.current_depth += 1

        result = await sub_agent.run(
            format_user_prompt(
                module_name=deps.current_module_name,
                core_component_ids=core_component_ids,
                components=ctx.deps.components,
                module_tree=ctx.deps.module_tree,
            ),
            deps=ctx.deps
        )

        sub_md_path = os.path.join(deps.absolute_docs_path, f"{sub_module_name}.md")
        if not os.path.exists(sub_md_path):
            logger.warning(f"{indent}  Sub-agent did not create {sub_module_name}.md — running direct LLM fallback")
            try:
                from codewiki.src.be.llm_services import call_llm
                code_snippets = []
                for cid in core_component_ids[:10]:
                    comp = ctx.deps.components.get(cid)
                    if comp and hasattr(comp, 'source_code'):
                        snippet = comp.source_code[:3000]
                        code_snippets.append(f"### {cid}\n```python\n{snippet}\n```")
                source_block = "\n\n".join(code_snippets) if code_snippets else "(no source available)"
                fallback_prompt = (
                    f"Generate a minimal markdown file for a code module called **{sub_module_name}**.\n\n"
                    f"The module contains {len(core_component_ids)} component(s).\n\n"
                    f"Source code:\n{source_block}\n\n"
                    "Requirements:\n"
                    "1. Start with `# <Title>` then a 1-2 sentence summary (~200 chars).\n"
                    "2. Include a <!-- DIAGRAM_JSON --> block with nodes, edges, and groups.\n"
                    "3. Include a matching ```mermaid flowchart TD``` diagram.\n"
                    "4. Do NOT add ## sections, narrative, or code examples.\n"
                    "Return ONLY the markdown content, no wrapping fences."
                )
                content = call_llm(fallback_prompt, deps.config)
                if content and len(content.strip()) > 50:
                    with open(sub_md_path, 'w') as f:
                        f.write(content)
                    logger.info(f"{indent}  Fallback wrote {sub_module_name}.md ({len(content)} chars)")
                else:
                    logger.error(f"{indent}  Fallback LLM returned insufficient content for {sub_module_name}")
            except Exception as fallback_err:
                logger.error(f"{indent}  Fallback LLM call failed for {sub_module_name}: {fallback_err}")

        # FORCE sub-module creation if depth < MIN_DEPTH and agent didn't create any
        current_module_children = value[sub_module_name].get("children", {})
        if force_subagent and len(current_module_children) == 0 and len(core_component_ids) >= 2:
            logger.info(f"{indent}  Agent did not create sub-modules, forcing directory-based split at depth {deps.current_depth}")
            auto_split = _auto_split_by_directory(core_component_ids, ctx.deps.components, deps.current_depth)
            if auto_split and len(auto_split) > 1:
                logger.info(f"{indent}  Auto-split created {len(auto_split)} sub-modules: {list(auto_split.keys())}")
                await generate_sub_module_documentation(ctx, auto_split)

        deps.path_to_current_module.pop()
        deps.current_depth -= 1

    deps.current_module_name = previous_module_name

    return f"Generate successfully. Documentations: {', '.join([key + '.md' for key in sub_module_specs.keys()])} are saved in the working directory."


generate_sub_module_documentation_tool = Tool(function=generate_sub_module_documentation, name="generate_sub_module_documentation", description="Generate detailed description of a given sub-module specs to the sub-agents", takes_ctx=True)