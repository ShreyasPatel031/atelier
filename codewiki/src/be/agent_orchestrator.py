from pydantic_ai import Agent
# import logfire
import logging
import os
import time
from typing import Dict, List, Any, Optional

# Configure logging and monitoring

logger = logging.getLogger(__name__)

# try:
#     # Configure logfire with environment variables for Docker compatibility
#     logfire_token = os.getenv('LOGFIRE_TOKEN')
#     logfire_project = os.getenv('LOGFIRE_PROJECT_NAME', 'default')
#     logfire_service = os.getenv('LOGFIRE_SERVICE_NAME', 'default')
    
#     if logfire_token:
#         # Configure with explicit token (for Docker)
#         logfire.configure(
#             token=logfire_token,
#             project_name=logfire_project,
#             service_name=logfire_service,
#         )
#     else:
#         # Use default configuration (for local development with logfire auth)
#         logfire.configure(
#             project_name=logfire_project,
#             service_name=logfire_service,
#         )
    
#     logfire.instrument_pydantic_ai()
#     logger.debug(f"Logfire configured successfully for project: {logfire_project}")
    
# except Exception as e:
#     logger.warning(f"Failed to configure logfire: {e}")

# Local imports
from codewiki.src.be.agent_tools.deps import CodeWikiDeps
from codewiki.src.be.agent_tools.read_code_components import read_code_components_tool
from codewiki.src.be.agent_tools.str_replace_editor import str_replace_editor_tool
from codewiki.src.be.agent_tools.generate_sub_module_documentations import generate_sub_module_documentation_tool
from codewiki.src.be.agent_tools.list_module_components import list_module_components_tool, get_module_summary_tool
from codewiki.src.be.llm_services import create_fallback_models
from codewiki.src.be.module_metadata import (
    apply_metadata_to_tree_path,
    extract_module_metadata_from_file,
)
from codewiki.src.be.prompt_template import (
    SYSTEM_PROMPT,
    LEAF_SYSTEM_PROMPT,
    format_user_prompt,
    _count_total_components,
)
from codewiki.src.be.utils import is_complex_module
from codewiki.src.config import (
    Config,
    MODULE_TREE_FILENAME,
    OVERVIEW_FILENAME,
    LARGE_REPO_COMPONENT_THRESHOLD,
    MIN_DEPTH,
)
from codewiki.src.file_manager import file_manager
from codewiki.src.be.dependency_analyzer.models.core import Node


def _log_pydantic_ai_failure_chain(exc: BaseException, log_prefix: str = "[STAGE 4.6] DIAG") -> None:
    """
    Walk the exception chain from pydantic-ai failures to find the actionable root cause.
    Handles BaseExceptionGroup (Python 3.11+) gracefully on older Pythons.
    """
    import sys
    _has_exception_group = sys.version_info >= (3, 11)

    seen: set[int] = set()

    def walk(ex: BaseException, label: str, depth: int) -> None:
        if depth > 25:
            return
        eid = id(ex)
        if eid in seen:
            return
        seen.add(eid)
        logger.error("%s %s %s: %s", log_prefix, label, type(ex).__name__, ex)
        tool_retry = getattr(ex, "tool_retry", None)
        if tool_retry is not None:
            content = getattr(tool_retry, "content", None)
            if content is not None:
                logger.error("%s   -> tool_retry.content: %s", log_prefix, repr(content)[:3000])
        if _has_exception_group and isinstance(ex, BaseExceptionGroup):
            for i, sub in enumerate(ex.exceptions):
                walk(sub, f"group[{i}]:", depth + 1)
            return
        if hasattr(ex, 'exceptions'):
            for i, sub in enumerate(ex.exceptions):
                walk(sub, f"group[{i}]:", depth + 1)
            return
        if ex.__cause__ is not None:
            walk(ex.__cause__, "cause:", depth + 1)

    walk(exc, "failure-chain root:", 0)


class AgentOrchestrator:
    """Orchestrates the AI agents for documentation generation."""
    
    def __init__(self, config: Config):
        self.config = config
        self.fallback_models = create_fallback_models(config)
    
    def _generate_fallback_doc(self, module_name: str, core_component_ids: List[str],
                               components: Dict[str, Any], md_path: str) -> None:
        """Direct LLM call to generate module docs when the agent didn't write the file."""
        from codewiki.src.be.llm_services import call_llm

        code_snippets = []
        for cid in core_component_ids[:10]:
            comp = components.get(cid)
            if comp and hasattr(comp, 'source_code'):
                snippet = comp.source_code[:3000]
                code_snippets.append(f"### {cid}\n```python\n{snippet}\n```")

        source_block = "\n\n".join(code_snippets) if code_snippets else "(no source available)"

        prompt = (
            f"Generate a minimal markdown file for a code module called **{module_name}**.\n\n"
            f"The module contains {len(core_component_ids)} component(s).\n\n"
            f"Source code:\n{source_block}\n\n"
            "Requirements:\n"
            "1. Start with `# <Title>` then a 1-2 sentence summary (~200 chars).\n"
            "2. Include a <!-- DIAGRAM_JSON --> block with nodes, edges, and groups.\n"
            "3. Include a matching ```mermaid flowchart TD``` diagram.\n"
            "4. Do NOT add ## sections, narrative, or code examples.\n"
            "Return ONLY the markdown content, no wrapping fences."
        )

        logger.info(f"[STAGE 4.7] Fallback LLM call for {module_name} ({len(prompt)} chars)")
        content = call_llm(prompt, self.config)
        if content and len(content.strip()) > 50:
            with open(md_path, 'w') as f:
                f.write(content)
            logger.info(f"[STAGE 4.7] Wrote fallback doc: {md_path} ({len(content)} chars)")
        else:
            logger.error(f"[STAGE 4.7] Fallback LLM returned insufficient content ({len(content or '')} chars)")

    def create_agent(
        self,
        module_name: str,
        components: Dict[str, Any],
        core_component_ids: List[str],
        module_tree: Dict[str, Any] = None,
        *,
        current_depth: int = 1,
    ) -> Agent:
        """Create an appropriate agent based on module complexity and repo size.

        ``current_depth`` is **agent delegation depth** (starts at 1 for each ``process_module``;
        sub-agents increment it). We omit ``generate_sub_module_documentation`` when
        ``current_depth >= max_depth`` so ``MAX_DEPTH`` caps delegation (previously
        ``force_complex = len(components)>=2`` ignored ``max_depth``).
        """
        logger.debug(f"[STAGE 4.3] Creating agent for module: {module_name}")
        logger.debug(f"[STAGE 4.3] Core component IDs: {len(core_component_ids)}")
        logger.debug(f"[STAGE 4.3] Total components: {len(components)}")
        
        is_complex = is_complex_module(components, core_component_ids)
        
        # Check if this is a large repo that needs on-demand component loading
        is_large_repo = False
        if module_tree:
            total_components = _count_total_components(module_tree)
            is_large_repo = total_components > LARGE_REPO_COMPONENT_THRESHOLD
            if is_large_repo:
                logger.info(f"[STAGE 4.3] Large repo detected ({total_components} components)")
                logger.info(f"[STAGE 4.3] Adding list_module_components and get_module_summary tools")
        
        # Build tool list
        base_tools = [read_code_components_tool, str_replace_editor_tool]
        
        # Add module exploration tools for large repos
        if is_large_repo:
            base_tools.extend([list_module_components_tool, get_module_summary_tool])
        
        can_delegate = current_depth < self.config.max_depth
        wants_split = is_complex or len(core_component_ids) >= 2
        use_submodule_tool = can_delegate and wants_split

        if use_submodule_tool:
            logger.debug(
                f"[STAGE 4.3] Complex agent with sub-module tool (depth={current_depth}, max_depth={self.config.max_depth}, "
                f"is_complex={is_complex})"
            )
            tools = base_tools + [generate_sub_module_documentation_tool]
            agent = Agent(
                self.fallback_models,
                retries=3,
                name=module_name,
                deps_type=CodeWikiDeps,
                tools=tools,
                system_prompt=SYSTEM_PROMPT.format(module_name=module_name),
            )
            logger.debug(f"[STAGE 4.3] Complex agent created with {len(tools)} tools")
        elif wants_split:
            logger.info(
                f"[STAGE 4.3] Leaf agent (no sub-module tool: depth {current_depth} >= max_depth {self.config.max_depth}); "
                f"single-pass doc for {module_name}"
            )
            agent = Agent(
                self.fallback_models,
                retries=3,
                name=module_name,
                deps_type=CodeWikiDeps,
                tools=base_tools,
                system_prompt=LEAF_SYSTEM_PROMPT.format(module_name=module_name),
            )
            logger.debug(f"[STAGE 4.3] Leaf agent created with {len(base_tools)} tools")
        else:
            logger.debug(f"[STAGE 4.3] Module is leaf - creating leaf agent without sub-module tool")
            agent = Agent(
                self.fallback_models,
                retries=3,
                name=module_name,
                deps_type=CodeWikiDeps,
                tools=base_tools,
                system_prompt=LEAF_SYSTEM_PROMPT.format(module_name=module_name),
            )
            logger.debug(f"[STAGE 4.3] Leaf agent created with {len(base_tools)} tools")
        
        return agent
    
    def _auto_split_module(self, core_component_ids: List[str], 
                           components: Dict[str, Node]) -> Dict[str, Any]:
        """
        Automatically split a large module into sub-modules based on directory structure.
        Used when prompt tokens exceed LLM context limits.
        """
        from collections import defaultdict
        
        logger.info(f"[AUTO-SPLIT] Splitting {len(core_component_ids)} components by directory")
        
        # Group components by their top-level directory
        dir_groups = defaultdict(list)
        
        for comp_id in core_component_ids:
            if comp_id not in components:
                continue
            
            component = components[comp_id]
            path = component.relative_path
            
            # Get directory path
            parts = path.split(os.sep)
            if len(parts) > 2:
                # Use first two directory levels for finer granularity
                key = f"{parts[0]}_{parts[1]}"
            elif len(parts) > 1:
                key = parts[0]
            else:
                key = "root"
            
            dir_groups[key].append(comp_id)
        
        # If still too few groups, try third level
        if len(dir_groups) <= 3:
            logger.info(f"[AUTO-SPLIT] Only {len(dir_groups)} groups, trying finer split")
            dir_groups = defaultdict(list)
            
            for comp_id in core_component_ids:
                if comp_id not in components:
                    continue
                
                component = components[comp_id]
                path = component.relative_path
                parts = path.split(os.sep)
                
                if len(parts) > 3:
                    key = f"{parts[0]}_{parts[1]}_{parts[2]}"
                elif len(parts) > 2:
                    key = f"{parts[0]}_{parts[1]}"
                elif len(parts) > 1:
                    key = parts[0]
                else:
                    key = "root"
                
                dir_groups[key].append(comp_id)
        
        # Convert to sub-module format
        sub_modules = {}
        for dir_name, comp_list in dir_groups.items():
            if not comp_list:
                continue
            
            # Create clean module name
            sub_name = dir_name.lower().replace("-", "_").replace(".", "_").replace(" ", "_")
            if not sub_name:
                sub_name = "other"
            
            sub_modules[sub_name] = {
                "path": dir_name,
                "components": comp_list
            }
        
        # CRITICAL: If directory-based splitting didn't help (only 1 group with same components),
        # fall back to token-budget based chunking
        if len(sub_modules) <= 1:
            logger.warning(f"[AUTO-SPLIT] Directory-based split created only {len(sub_modules)} group(s)")
            logger.warning(f"[AUTO-SPLIT] Falling back to token-budget chunked splitting")
            
            from codewiki.src.be.utils import count_module_tokens
            
            # Target: each chunk should fit in LLM context (~80k tokens to leave room for response)
            TARGET_TOKENS_PER_CHUNK = 80000
            
            sub_modules = {}
            current_chunk = []
            current_chunk_tokens = 0
            chunk_idx = 0
            
            for comp_id in core_component_ids:
                if comp_id not in components:
                    continue
                    
                # Estimate tokens for this component
                comp_tokens = count_module_tokens([comp_id], components)
                
                # If adding this component exceeds budget, start a new chunk
                if current_chunk and (current_chunk_tokens + comp_tokens > TARGET_TOKENS_PER_CHUNK):
                    chunk_idx += 1
                    sub_name = f"part_{chunk_idx}"
                    sub_modules[sub_name] = {
                        "path": f"chunk_{chunk_idx}",
                        "components": current_chunk
                    }
                    logger.info(f"[AUTO-SPLIT] Created chunk {chunk_idx}: {len(current_chunk)} components, {current_chunk_tokens} tokens")
                    current_chunk = []
                    current_chunk_tokens = 0
                
                current_chunk.append(comp_id)
                current_chunk_tokens += comp_tokens
            
            # Add the last chunk
            if current_chunk:
                chunk_idx += 1
                sub_name = f"part_{chunk_idx}"
                sub_modules[sub_name] = {
                    "path": f"chunk_{chunk_idx}",
                    "components": current_chunk
                }
                logger.info(f"[AUTO-SPLIT] Created chunk {chunk_idx}: {len(current_chunk)} components, {current_chunk_tokens} tokens")
            
            logger.info(f"[AUTO-SPLIT] Token-budget chunking created {len(sub_modules)} parts")
        
        logger.info(f"[AUTO-SPLIT] Created {len(sub_modules)} sub-modules")
        return sub_modules
    
    def _merge_module_tree(self, target: Dict[str, Any], source: Dict[str, Any]) -> None:
        """
        Merge source module tree into target, preserving all fields.
        Used during parallel processing to merge concurrent updates.
        """
        for key, value in source.items():
            if key not in target:
                target[key] = value
            elif isinstance(value, dict) and isinstance(target[key], dict):
                # Merge dict fields
                for field, field_val in value.items():
                    if field == "children" and isinstance(field_val, dict):
                        # Recursively merge children
                        if "children" not in target[key]:
                            target[key]["children"] = {}
                        self._merge_module_tree(target[key]["children"], field_val)
                    elif field_val is not None:
                        # Only overwrite if source has a value
                        target[key][field] = field_val
    
    async def _generate_parent_overview(self, module_name: str, sub_modules: Dict[str, Any],
                                        working_dir: str, deps: 'CodeWikiDeps') -> None:
        """
        Generate a simple overview document for a parent module after its sub-modules are processed.
        """
        docs_path = os.path.join(working_dir, f"{module_name}.md")
        
        # Build simple overview
        content = f"# {module_name.replace('_', ' ').title()}\n\n"
        content += f"This module contains {len(sub_modules)} sub-modules:\n\n"
        
        for sub_name, sub_info in sub_modules.items():
            component_count = len(sub_info.get("components", []))
            content += f"- [{sub_name}]({sub_name}.md) - {component_count} components\n"
        
        content += "\n## Architecture\n\n"
        content += "```mermaid\ngraph TD\n"
        
        # Create simple diagram showing sub-modules
        parent_id = module_name.replace("_", "").upper()[:3]
        for i, sub_name in enumerate(sub_modules.keys()):
            sub_id = chr(65 + i)  # A, B, C, ...
            content += f"    {parent_id} --> {sub_id}[{sub_name}]\n"
        
        content += "```\n"
        
        # Save the overview
        file_manager.save_text(content, docs_path)
        logger.info(f"[AUTO-SPLIT] Generated parent overview: {docs_path}")
    
    async def process_module(self, module_name: str, components: Dict[str, Node], 
                           core_component_ids: List[str], module_path: List[str], working_dir: str,
                           module_tree_lock=None) -> Dict[str, Any]:
        """Process a single module and generate its documentation."""
        module_start = time.time()
        logger.info(f"[STAGE 4: AGENT MODULE PROCESSING] Starting module: {module_name}")
        
        # Track module start in generation tracker
        try:
            from codewiki.src.be.generation_tracker import get_generation_tracker
            from codewiki.src.be.utils import count_module_tokens
            gen_tracker = get_generation_tracker()
            prompt_tokens_est = count_module_tokens(core_component_ids, components)
            gen_tracker.track_module_start(module_name, len(core_component_ids), prompt_tokens_est)
        except Exception:
            pass  # Non-critical
        logger.info(f"[STAGE 4] Module path: {'.'.join(module_path) if module_path else 'root'}")
        # On-disk doc filename must match tree leaf key (nested modules: path[-1], not ambiguous name)
        doc_stem = module_path[-1] if module_path else module_name
        if module_path and module_path[-1] != module_name:
            logger.warning(
                "[STAGE 4] module_name=%r differs from module_path[-1]=%r; using path tail for .md file",
                module_name,
                module_path[-1],
            )
        logger.info(f"[STAGE 4] Core component IDs: {len(core_component_ids)}")
        logger.info(f"[STAGE 4] Total components: {len(components)}")
        logger.info(f"[STAGE 4] Working directory: {working_dir}")
        
        # STAGE 4.1: Load module tree
        module_tree_path = os.path.join(working_dir, MODULE_TREE_FILENAME)
        logger.info(f"[STAGE 4.1: MODULE TREE LOAD] Loading module tree from {module_tree_path}")
        load_start = time.time()
        
        try:
            if not os.path.exists(module_tree_path):
                logger.warning(f"[STAGE 4.1] Module tree file does not exist: {module_tree_path}")
                logger.warning(f"[STAGE 4.1] Will create new module tree")
                module_tree = {}
            else:
                file_size = os.path.getsize(module_tree_path)
                logger.info(f"[STAGE 4.1] Module tree file exists: {file_size} bytes")
                module_tree = file_manager.load_json(module_tree_path)
                load_duration = time.time() - load_start
                
                if module_tree is None:
                    logger.warning(f"[STAGE 4.1] Module tree file loaded but returned None - using empty dict")
                    module_tree = {}
                else:
                    logger.info(f"[STAGE 4.1] Module tree loaded in {load_duration:.3f}s")
                    logger.info(f"[STAGE 4.1] Module tree type: {type(module_tree)}")
                    if isinstance(module_tree, dict):
                        logger.info(f"[STAGE 4.1] Module count: {len(module_tree)}")
                        logger.info(f"[STAGE 4.1] Module keys: {list(module_tree.keys())[:10]}")
                    else:
                        logger.warning(f"[STAGE 4.1] Module tree is not a dict: {type(module_tree)}")
                        module_tree = {}
        except Exception as e:
            load_duration = time.time() - load_start
            logger.error(f"[STAGE 4.1] Module tree load FAILED after {load_duration:.3f}s: {type(e).__name__}: {str(e)}")
            import traceback
            logger.error(f"[STAGE 4.1] Traceback: {traceback.format_exc()}")
            logger.warning(f"[STAGE 4.1] Using empty module tree as fallback")
            module_tree = {}
        
        # STAGE 4.2: Check if docs already exist
        overview_docs_path = os.path.join(working_dir, OVERVIEW_FILENAME)
        docs_path = os.path.join(working_dir, f"{doc_stem}.md")
        
        logger.info(f"[STAGE 4.2: DOCS CHECK] Checking for existing documentation...")
        logger.info(f"[STAGE 4.2] Overview docs path: {overview_docs_path} (exists: {os.path.exists(overview_docs_path)})")
        logger.info(f"[STAGE 4.2] Module docs path: {docs_path} (exists: {os.path.exists(docs_path)})")
        
        if os.path.exists(overview_docs_path):
            file_size = os.path.getsize(overview_docs_path)
            logger.info(f"[STAGE 4.2] Overview docs already exists at {overview_docs_path} ({file_size} bytes)")
            logger.info(f"[STAGE 4.2] Skipping module processing")
            return module_tree

        if os.path.exists(docs_path):
            file_size = os.path.getsize(docs_path)
            logger.info(f"[STAGE 4.2] Module docs already exists at {docs_path} ({file_size} bytes)")
            logger.info(f"[STAGE 4.2] Skipping module processing")
            return module_tree

        # Delegation depth for agents (not tree path length): each process_module starts at 1;
        # generate_sub_module_documentation increments when entering sub-agents.
        agent_depth = 1

        # STAGE 4.4: Create dependencies (before agent so MAX_DEPTH matches deps)
        logger.info(f"[STAGE 4.4: DEPENDENCIES] Creating dependencies...")
        try:
            deps = CodeWikiDeps(
                absolute_docs_path=working_dir,
                absolute_repo_path=str(os.path.abspath(self.config.repo_path)),
                registry={},
                components=components,
                path_to_current_module=module_path,
                current_module_name=module_name,
                module_tree=module_tree,
                max_depth=self.config.max_depth,
                current_depth=agent_depth,
                config=self.config
            )
            logger.info(f"[STAGE 4.4] Dependencies created successfully")
            logger.info(f"[STAGE 4.4]   - Docs path: {deps.absolute_docs_path}")
            logger.info(f"[STAGE 4.4]   - Repo path: {deps.absolute_repo_path}")
            logger.info(f"[STAGE 4.4]   - Component count: {len(deps.components)}")
            logger.info(f"[STAGE 4.4]   - Module tree size: {len(deps.module_tree) if isinstance(deps.module_tree, dict) else 'N/A'}")
            logger.info(f"[STAGE 4.4]   - Agent delegation depth (current_depth): {agent_depth}")
        except Exception as e:
            logger.error(f"[STAGE 4.4] Dependencies creation FAILED: {type(e).__name__}: {str(e)}")
            import traceback
            logger.error(f"[STAGE 4.4] Traceback: {traceback.format_exc()}")
            raise

        # STAGE 4.3: Create agent
        logger.info(f"[STAGE 4.3: AGENT CREATION] Creating agent for module: {module_name}")
        agent_start = time.time()
        
        try:
            from codewiki.src.be.utils import is_complex_module
            is_complex = is_complex_module(components, core_component_ids)
            logger.info(f"[STAGE 4.3] Module complexity: {'complex' if is_complex else 'leaf'}")
            logger.info(f"[STAGE 4.3] Config summary:")
            logger.info(f"[STAGE 4.3]   - Main model: {self.config.main_model}")
            logger.info(f"[STAGE 4.3]   - Cluster model: {self.config.cluster_model}")
            logger.info(f"[STAGE 4.3]   - Fallback model: {self.config.fallback_model}")
            logger.info(f"[STAGE 4.3]   - LLM base URL: {self.config.llm_base_url}")
            logger.info(f"[STAGE 4.3]   - Max depth: {self.config.max_depth}")
            logger.info(f"[STAGE 4.3]   - Current depth: {agent_depth}")
            
            agent = self.create_agent(
                module_name, components, core_component_ids, module_tree, current_depth=agent_depth
            )
            agent_duration = time.time() - agent_start
            
            agent_type = "complex" if is_complex else "leaf"
            tools_count = len(agent.tools) if hasattr(agent, 'tools') else 'unknown'
            logger.info(f"[STAGE 4.3] Agent created in {agent_duration:.3f}s")
            logger.info(f"[STAGE 4.3] Agent type: {agent_type}")
            logger.info(f"[STAGE 4.3] Tools count: {tools_count}")
        except Exception as e:
            agent_duration = time.time() - agent_start
            logger.error(f"[STAGE 4.3] Agent creation FAILED after {agent_duration:.3f}s: {type(e).__name__}: {str(e)}")
            import traceback
            logger.error(f"[STAGE 4.3] Traceback: {traceback.format_exc()}")
            raise
        
        # STAGE 4.5: Format user prompt
        logger.info(f"[STAGE 4.5: PROMPT FORMATTING] Formatting user prompt...")
        prompt_start = time.time()
        
        try:
            from codewiki.src.be.utils import count_module_tokens
            user_prompt = format_user_prompt(
                module_name=module_name,
                core_component_ids=core_component_ids,
                components=components,
                module_tree=deps.module_tree
            )
            prompt_tokens = count_module_tokens(core_component_ids, components)
            prompt_duration = time.time() - prompt_start
            
            logger.info(f"[STAGE 4.5] Prompt formatted in {prompt_duration:.3f}s")
            logger.info(f"[STAGE 4.5] Prompt size: {len(user_prompt)} chars")
            logger.info(f"[STAGE 4.5] Prompt tokens: {prompt_tokens}")
            logger.info(f"[STAGE 4.5] Core component IDs: {len(core_component_ids)}")
        except Exception as e:
            prompt_duration = time.time() - prompt_start
            logger.error(f"[STAGE 4.5] Prompt formatting FAILED after {prompt_duration:.3f}s: {type(e).__name__}: {str(e)}")
            import traceback
            logger.error(f"[STAGE 4.5] Traceback: {traceback.format_exc()}")
            raise
        
        # STAGE 4.5.5: PRE-FLIGHT CHECK - Auto-split if prompt exceeds LLM context
        MAX_LLM_CONTEXT = 100000  # Safety margin below GPT-4o's 128k context
        MAX_AUTO_SPLIT_DEPTH = 5  # Prevent infinite recursion
        
        current_depth = len(module_path)
        if prompt_tokens > MAX_LLM_CONTEXT and current_depth < MAX_AUTO_SPLIT_DEPTH:
            logger.warning(f"[STAGE 4.5.5: AUTO-SPLIT] Prompt too large ({prompt_tokens} tokens > {MAX_LLM_CONTEXT})")
            logger.warning(f"[STAGE 4.5.5] Automatically splitting module '{module_name}' before LLM call")
            
            # Split using directory-based approach
            sub_modules = self._auto_split_module(core_component_ids, components)
            logger.info(f"[STAGE 4.5.5] Split into {len(sub_modules)} sub-modules")
            
            for sub_name, sub_info in sub_modules.items():
                logger.info(f"[STAGE 4.5.5]   - {sub_name}: {len(sub_info['components'])} components")
            
            # Add sub-modules to module tree
            # FIX: Navigate to the parent container correctly, then update children
            if len(module_path) == 0:
                # Root level call - shouldn't happen but handle it
                target = deps.module_tree
            elif len(module_path) == 1:
                # Top-level module (e.g., "aten") - module is directly in module_tree
                target = deps.module_tree
            else:
                # Nested module - navigate to parent's children
                target = deps.module_tree
                for key in module_path[:-1]:  # All path parts except the last
                    if key in target:
                        target = target[key].get("children", {})
            
            # Now update the module's children
            if module_name in target:
                target[module_name]["children"] = {}
                for sub_name, sub_info in sub_modules.items():
                    target[module_name]["children"][sub_name] = {
                        "components": sub_info["components"],
                        "children": {}
                    }
                logger.info(f"[STAGE 4.5.5] Updated module tree: {module_name} now has {len(sub_modules)} children")
            else:
                logger.error(f"[STAGE 4.5.5] BUG: Module '{module_name}' not found in tree at path {module_path}")
                logger.error(f"[STAGE 4.5.5] Available keys in target: {list(target.keys())[:10]}")
            
            # Save updated module tree (with lock if provided)
            if module_tree_lock:
                async with module_tree_lock:
                    # Reload to get latest, merge our changes, save
                    current_tree = file_manager.load_json(module_tree_path)
                    self._merge_module_tree(current_tree, deps.module_tree)
                    file_manager.save_json(current_tree, module_tree_path)
                    deps.module_tree = current_tree
            else:
                file_manager.save_json(deps.module_tree, module_tree_path)
            
            # Recursively process each sub-module
            for sub_name, sub_info in sub_modules.items():
                sub_components = sub_info["components"]
                # Must append sub_name so doc_stem and tree path match the child module (not duplicate parent key).
                new_module_path = module_path + [sub_name]
                logger.info(f"[STAGE 4.5.5] Recursively processing sub-module: {sub_name}")
                await self.process_module(
                    sub_name, 
                    components, 
                    sub_components, 
                    new_module_path, 
                    working_dir,
                    module_tree_lock=module_tree_lock
                )
            
            # After processing sub-modules, generate parent overview
            logger.info(f"[STAGE 4.5.5] Sub-modules processed, generating parent overview for {module_name}")
            await self._generate_parent_overview(module_name, sub_modules, working_dir, deps)
            
            module_duration = time.time() - module_start
            logger.info(f"[STAGE 4: AGENT MODULE PROCESSING] COMPLETE in {module_duration:.1f}s (auto-split) for module: {module_name}")
            return deps.module_tree
        elif prompt_tokens > MAX_LLM_CONTEXT:
            # Hit depth limit but still too large - log warning but proceed anyway
            logger.warning(f"[STAGE 4.5.5] Module still too large ({prompt_tokens} tokens) but hit depth limit ({current_depth})")
            logger.warning(f"[STAGE 4.5.5] Proceeding with LLM call - expect possible failure")
        
        # STAGE 4.6: Run agent
        logger.info(f"[STAGE 4.6: AGENT EXECUTION] Running agent for module: {module_name}")
        logger.info(f"[STAGE 4.6] Model: {self.config.main_model}")
        logger.info(f"[STAGE 4.6] Prompt tokens: {prompt_tokens}")
        execution_start = time.time()
        
        try:
            result = await agent.run(
                user_prompt,
                deps=deps
            )
            execution_duration = time.time() - execution_start
            
            logger.info(f"[STAGE 4.6] Agent execution completed in {execution_duration:.1f}s")
            logger.info(f"[STAGE 4.6] Result type: {type(result)}")
            
            # Track token usage from pydantic-ai result
            try:
                from codewiki.src.be.llm_services import get_token_tracker, LLMCallStats
                tracker = get_token_tracker()
                
                # pydantic-ai stores usage in result._usage or result.usage()
                if hasattr(result, 'usage'):
                    usage = result.usage()
                    if usage:
                        stats = LLMCallStats(
                            model=self.config.main_model,
                            prompt_tokens=usage.request_tokens or 0,
                            completion_tokens=usage.response_tokens or 0,
                            duration_seconds=execution_duration,
                            success=True
                        )
                        tracker.add_call(stats)
                        logger.info(f"[STAGE 4.6] Token usage - Prompt: {stats.prompt_tokens:,}, Completion: {stats.completion_tokens:,}")
                elif hasattr(result, '_usage'):
                    usage = result._usage
                    stats = LLMCallStats(
                        model=self.config.main_model,
                        prompt_tokens=getattr(usage, 'request_tokens', prompt_tokens) or prompt_tokens,
                        completion_tokens=getattr(usage, 'response_tokens', 0) or 0,
                        duration_seconds=execution_duration,
                        success=True
                    )
                    tracker.add_call(stats)
                    logger.info(f"[STAGE 4.6] Token usage - Prompt: {stats.prompt_tokens:,}, Completion: {stats.completion_tokens:,}")
                else:
                    # Fallback: estimate from prompt tokens
                    stats = LLMCallStats(
                        model=self.config.main_model,
                        prompt_tokens=prompt_tokens,
                        completion_tokens=2000,  # Rough estimate for documentation output
                        duration_seconds=execution_duration,
                        success=True
                    )
                    tracker.add_call(stats)
                    logger.info(f"[STAGE 4.6] Token usage (estimated) - Prompt: {stats.prompt_tokens:,}, Completion: ~2000")
            except Exception as track_err:
                logger.debug(f"[STAGE 4.6] Token tracking failed (non-critical): {track_err}")
            
            # Extract title/description/diagram from generated markdown for top-level modules
            # Top-level modules have module_path of length 1 (e.g., ['operator'])
            # Extract metadata (title, description, diagram) from generated markdown
            # This runs for ALL modules, not just top-level - making it recursive
            extracted_title = None
            extracted_desc = None
            extracted_diagram = None
            md_path = os.path.join(working_dir, f"{doc_stem}.md")
            if not os.path.exists(md_path):
                logger.warning(f"[STAGE 4.7] Agent did not create {doc_stem}.md — running direct LLM fallback")
                try:
                    self._generate_fallback_doc(module_name, core_component_ids, components, md_path)
                except Exception as fallback_err:
                    logger.error(f"[STAGE 4.7] Fallback LLM call failed: {fallback_err}")
            if os.path.exists(md_path):
                try:
                    extracted_title, extracted_desc, extracted_diagram = extract_module_metadata_from_file(
                        md_path
                    )
                    logger.info(f"[STAGE 4.6] Extracted metadata for '{module_name}': title='{extracted_title}'"
                               f", diagram={'yes' if extracted_diagram else 'no'}")
                except Exception as meta_err:
                    logger.warning(f"[STAGE 4.6] Failed to extract metadata for '{module_name}': {meta_err}")
            
            # Save updated module tree (with lock if provided for parallel safety)
            save_start = time.time()
            if module_tree_lock:
                async with module_tree_lock:
                    # Reload to get latest changes from other parallel tasks
                    current_tree = file_manager.load_json(module_tree_path)
                    # Merge our changes
                    self._merge_module_tree(current_tree, deps.module_tree)
                    # Apply extracted metadata (title, description, diagram) to correct nested position
                    if extracted_title:
                        apply_metadata_to_tree_path(
                            current_tree,
                            module_path,
                            extracted_title,
                            extracted_desc,
                            extracted_diagram,
                        )
                    file_manager.save_json(current_tree, module_tree_path)
                    deps.module_tree = current_tree
            else:
                if extracted_title:
                    apply_metadata_to_tree_path(
                        deps.module_tree,
                        module_path,
                        extracted_title,
                        extracted_desc,
                        extracted_diagram,
                    )
                file_manager.save_json(deps.module_tree, module_tree_path)
            save_duration = time.time() - save_start
            
            module_duration = time.time() - module_start
            logger.info(f"[STAGE 4.6] Module tree saved in {save_duration:.3f}s")
            logger.info(f"[STAGE 4: AGENT MODULE PROCESSING] COMPLETE in {module_duration:.1f}s for module: {module_name}")
            
            # Track module completion in generation tracker
            try:
                from codewiki.src.be.generation_tracker import get_generation_tracker
                gen_tracker = get_generation_tracker()
                md_exists = os.path.exists(os.path.join(working_dir, f"{doc_stem}.md"))
                gen_tracker.track_module_complete(
                    module_name=module_name,
                    success=True,
                    md_file_created=md_exists,
                    in_module_tree=True,
                    has_diagram=extracted_diagram is not None,
                    has_title=extracted_title is not None,
                    has_description=extracted_desc is not None
                )
            except Exception:
                pass  # Non-critical
            
            return deps.module_tree
            
        except Exception as e:
            execution_duration = time.time() - execution_start
            module_duration = time.time() - module_start
            import sys
            import traceback
            
            logger.error(f"[STAGE 4.6] Agent execution FAILED after {execution_duration:.1f}s")
            logger.error(f"[STAGE 4.6] Module: {module_name}")
            logger.error(f"[STAGE 4.6] Component count: {len(core_component_ids)}")
            logger.error(f"[STAGE 4.6] Prompt tokens: {prompt_tokens}")
            logger.error(f"[STAGE 4.6] Error type: {type(e).__name__}")
            logger.error(f"[STAGE 4.6] Error message: {str(e)}")
            _log_pydantic_ai_failure_chain(e)
            # pydantic-ai raises UnexpectedModelBehavior with __cause__=None on the "empty model
            # response" path (_agent_graph.py ~1040: increment_retries without error=). Traceback
            # shows that line when the model returned an empty / non-actionable turn twice.
            if (
                type(e).__name__ == "UnexpectedModelBehavior"
                and "output validation" in str(e)
                and getattr(e, "__cause__", None) is None
            ):
                logger.error(
                    "[STAGE 4.6] DIAG NOTE: No __cause__ on this UnexpectedModelBehavior — in "
                    "pydantic-ai this matches the empty-response retry path (~1040 in "
                    "_agent_graph.py): the model returned an empty or stripped-to-empty turn; one "
                    "silent resubmit; still empty; retries exhausted (budget=1)."
                )
            if isinstance(e, AssertionError) and e.args and e.args[0] == (1, 0, 1):
                logger.error(
                    "[STAGE 4.6] DIAG NOTE: (1,0,1) is str_replace_editor.WindowExpander.expand_window "
                    "— invalid line window (stop < start) on a tiny/empty file; model str_replace "
                    "args did not match file contents. See str_replace_editor.py expand_window assert."
                )

            # Diagnostics: why the agent failed (no result object when run raises)
            fail_md = os.path.join(working_dir, f"{doc_stem}.md")
            logger.error(
                "[STAGE 4.6] DIAG: module_name=%r module_path=%r doc_stem=%r expected_md exists=%s path=%s",
                module_name,
                module_path,
                doc_stem,
                os.path.exists(fail_md),
                fail_md,
            )
            if os.path.exists(fail_md):
                try:
                    logger.error(
                        "[STAGE 4.6] DIAG: partial md file size=%d bytes (agent may have written before failure)",
                        os.path.getsize(fail_md),
                    )
                except OSError as ose:
                    logger.error("[STAGE 4.6] DIAG: could not stat md: %s", ose)
            try:
                import json as _json

                st = _json.dumps(deps.module_tree, default=str)
                logger.error(
                    "[STAGE 4.6] DIAG: deps.module_tree snapshot (truncated): %s%s",
                    st[:4000],
                    "..." if len(st) > 4000 else "",
                )
            except Exception as dump_err:
                logger.error("[STAGE 4.6] DIAG: could not serialize deps.module_tree: %s", dump_err)
            for attr in (
                "body",
                "messages",
                "message_history",
                "model_response",
                "response",
                "args",
            ):
                if hasattr(e, attr):
                    try:
                        val = getattr(e, attr)
                        logger.error(
                            "[STAGE 4.6] DIAG: exception.%s=%s",
                            attr,
                            repr(val)[:2500],
                        )
                    except Exception:
                        pass
            
            # Check for rate limiting
            error_str = str(e).lower()
            if "429" in str(e) or "rate limit" in error_str or "rate_limit" in error_str:
                logger.error(f"[STAGE 4.6] RATE LIMIT DETECTED")
                logger.error(f"[STAGE 4.6]   - Module: {module_name}")
                logger.error(f"[STAGE 4.6]   - Prompt tokens: {prompt_tokens}")
                logger.error(f"[STAGE 4.6]   - Model: {self.config.main_model}")
                logger.error(f"[STAGE 4.6]   - Duration before failure: {execution_duration:.1f}s")
            
            # Print detailed error info to stderr for debugging
            print(f"\n=== DETAILED ERROR INFO ===", file=sys.stderr)
            print(f"Exception type: {type(e)}", file=sys.stderr)
            print(f"Exception: {e}", file=sys.stderr)
            print(f"Exception args: {e.args}", file=sys.stderr)
            print(f"Exception attributes: {[x for x in dir(e) if not x.startswith('_')]}", file=sys.stderr)
            
            # Try to get sub-exceptions
            if hasattr(e, 'exceptions'):
                print(f"Found 'exceptions' attribute with {len(e.exceptions)} items", file=sys.stderr)
                for i, sub_exc in enumerate(e.exceptions):
                    print(f"\nSub-exception {i+1}:", file=sys.stderr)
                    print(f"  Type: {type(sub_exc)}", file=sys.stderr)
                    print(f"  Message: {sub_exc}", file=sys.stderr)
                    if hasattr(sub_exc, '__traceback__') and sub_exc.__traceback__:
                        print(f"  Traceback:", file=sys.stderr)
                        print(''.join(traceback.format_exception(type(sub_exc), sub_exc, sub_exc.__traceback__)), file=sys.stderr)
            
            full_tb = traceback.format_exc()
            logger.error(f"[STAGE 4.6] Full traceback:\n{full_tb}")
            logger.error(f"[STAGE 4: AGENT MODULE PROCESSING] FAILED in {module_duration:.1f}s for module: {module_name}")
            print(f"=== END ERROR INFO ===\n", file=sys.stderr)

            # Last-resort: direct LLM doc when agent.run crashed before writing {doc_stem}.md
            if not os.path.exists(fail_md):
                try:
                    logger.warning(
                        "[STAGE 4.6] Post-failure fallback: direct LLM for %s → %s",
                        module_name,
                        fail_md,
                    )
                    self._generate_fallback_doc(module_name, core_component_ids, components, fail_md)
                except Exception as fb_err:
                    logger.error("[STAGE 4.6] Post-failure fallback LLM failed: %s", fb_err)

            if os.path.exists(fail_md) and os.path.getsize(fail_md) > 50:
                try:
                    extracted_title, extracted_desc, extracted_diagram = extract_module_metadata_from_file(
                        fail_md
                    )
                    logger.info(
                        "[STAGE 4.6] Recovered via post-failure fallback for %r: title=%r diagram=%s",
                        module_name,
                        extracted_title,
                        "yes" if extracted_diagram else "no",
                    )
                    save_start = time.time()
                    if module_tree_lock:
                        async with module_tree_lock:
                            current_tree = file_manager.load_json(module_tree_path)
                            self._merge_module_tree(current_tree, deps.module_tree)
                            if extracted_title:
                                apply_metadata_to_tree_path(
                                    current_tree,
                                    module_path,
                                    extracted_title,
                                    extracted_desc,
                                    extracted_diagram,
                                )
                            file_manager.save_json(current_tree, module_tree_path)
                            deps.module_tree = current_tree
                    else:
                        if extracted_title:
                            apply_metadata_to_tree_path(
                                deps.module_tree,
                                module_path,
                                extracted_title,
                                extracted_desc,
                                extracted_diagram,
                            )
                        file_manager.save_json(deps.module_tree, module_tree_path)
                    logger.info(
                        "[STAGE 4.6] Module tree saved after recovery in %.3fs",
                        time.time() - save_start,
                    )
                    module_duration = time.time() - module_start
                    logger.info(
                        "[STAGE 4: AGENT MODULE PROCESSING] RECOVERED (post-failure fallback) in %.1fs for module: %s",
                        module_duration,
                        module_name,
                    )
                    try:
                        from codewiki.src.be.generation_tracker import get_generation_tracker

                        get_generation_tracker().track_module_complete(
                            module_name=module_name,
                            success=True,
                            md_file_created=True,
                            in_module_tree=True,
                            has_diagram=extracted_diagram is not None,
                            has_title=extracted_title is not None,
                            has_description=extracted_desc is not None,
                        )
                    except Exception:
                        pass
                    return deps.module_tree
                except Exception as recovery_err:
                    logger.error(
                        "[STAGE 4.6] Post-failure recovery (metadata/tree save) failed: %s",
                        recovery_err,
                    )

            # Track module failure in generation tracker
            try:
                from codewiki.src.be.generation_tracker import get_generation_tracker
                gen_tracker = get_generation_tracker()
                
                # Categorize the error
                error_str = str(e).lower()
                if "429" in str(e) or "rate limit" in error_str:
                    error_type = "rate_limit"
                elif "context" in error_str or "length" in error_str:
                    error_type = "context_length_exceeded"
                elif "timeout" in error_str:
                    error_type = "timeout"
                else:
                    error_type = type(e).__name__
                
                gen_tracker.track_module_complete(
                    module_name=module_name,
                    success=False,
                    md_file_created=False,
                    error_type=error_type,
                    error_message=str(e)[:200]
                )
            except Exception:
                pass  # Non-critical
            
            raise