from pydantic_ai import Agent
# import logfire
import asyncio
import logging
import os
import time
from typing import Dict, List, Any, Optional

# Configure logging and monitoring

logger = logging.getLogger(__name__)

# Global LLM concurrency limiter. Bounds total in-flight LLM calls across the entire
# doc-gen tree (top-level modules AND auto-split sub-tasks, which otherwise bypass the
# per-batch module semaphore). Created lazily on the running event loop.
_llm_semaphore: Optional[asyncio.Semaphore] = None


def _get_llm_semaphore() -> asyncio.Semaphore:
    """Return the process-wide LLM semaphore, creating it on first use."""
    global _llm_semaphore
    if _llm_semaphore is None:
        _llm_semaphore = asyncio.Semaphore(MAX_CONCURRENT_LLM_CALLS)
    return _llm_semaphore


async def generate_leaf_doc_json_throttled(**kwargs) -> Dict[str, Any]:
    """Run generate_leaf_doc_json in a worker thread under the global LLM semaphore.

    Centralizes throttling so every leaf JSON call (direct 4-FAST, forced 4-FAST, and
    auto-split sub-modules) shares one concurrency budget instead of overwhelming the
    thread pool.
    """
    from codewiki.src.be.direct_module_doc import generate_leaf_doc_json

    async with _get_llm_semaphore():
        return await asyncio.to_thread(generate_leaf_doc_json, **kwargs)

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
    MAX_CONCURRENT_LLM_CALLS,
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
        Split a large module into balanced token-budget chunks.
        Each chunk targets AUTO_SPLIT_TOKEN_THRESHOLD tokens so no single
        MAP call overwhelms the LLM.
        """
        from collections import OrderedDict
        from codewiki.src.be.utils import count_module_tokens
        from codewiki.src.config import AUTO_SPLIT_TOKEN_THRESHOLD

        TARGET_TOKENS_PER_CHUNK = AUTO_SPLIT_TOKEN_THRESHOLD

        logger.info(f"[AUTO-SPLIT] Splitting {len(core_component_ids)} components by token budget")

        # Group components by file path to avoid double-counting.
        file_groups: OrderedDict[str, list[str]] = OrderedDict()
        for comp_id in core_component_ids:
            if comp_id not in components:
                continue
            fpath = components[comp_id].relative_path
            file_groups.setdefault(fpath, []).append(comp_id)

        file_tokens: dict[str, int] = {}
        for fpath, comp_ids in file_groups.items():
            file_tokens[fpath] = count_module_tokens(comp_ids, components)

        total_tokens = sum(file_tokens.values())
        logger.info(f"[AUTO-SPLIT] {len(file_groups)} unique files, "
                    f"total deduplicated tokens: {total_tokens:,}")

        sub_modules: Dict[str, Any] = {}
        current_chunk: list[str] = []
        current_chunk_tokens = 0
        chunk_idx = 0

        for fpath, comp_ids in file_groups.items():
            ft = file_tokens[fpath]
            if current_chunk and (current_chunk_tokens + ft > TARGET_TOKENS_PER_CHUNK):
                chunk_idx += 1
                sub_modules[f"part_{chunk_idx}"] = {
                    "path": f"chunk_{chunk_idx}",
                    "components": current_chunk,
                }
                logger.info(f"[AUTO-SPLIT] Chunk {chunk_idx}: "
                            f"{len(current_chunk)} components, {current_chunk_tokens:,} tokens")
                current_chunk = []
                current_chunk_tokens = 0

            current_chunk.extend(comp_ids)
            current_chunk_tokens += ft

        if current_chunk:
            chunk_idx += 1
            sub_modules[f"part_{chunk_idx}"] = {
                "path": f"chunk_{chunk_idx}",
                "components": current_chunk,
            }
            logger.info(f"[AUTO-SPLIT] Chunk {chunk_idx}: "
                        f"{len(current_chunk)} components, {current_chunk_tokens:,} tokens")

        logger.info(f"[AUTO-SPLIT] Created {len(sub_modules)} chunks")
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
                "[STAGE 4] module_name=%r differs from module_path[-1]=%r; using path tail for .json file",
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
        json_docs_path = os.path.join(working_dir, f"{doc_stem}.json")
        
        logger.info(f"[STAGE 4.2: DOCS CHECK] Checking for existing documentation...")
        logger.info(f"[STAGE 4.2] Overview docs path: {overview_docs_path} (exists: {os.path.exists(overview_docs_path)})")
        logger.info(f"[STAGE 4.2] Module docs path: {json_docs_path} (exists: {os.path.exists(json_docs_path)})")
        
        if os.path.exists(overview_docs_path):
            file_size = os.path.getsize(overview_docs_path)
            logger.info(f"[STAGE 4.2] Overview docs already exists at {overview_docs_path} ({file_size} bytes)")
            logger.info(f"[STAGE 4.2] Skipping module processing")
            return module_tree

        if os.path.exists(json_docs_path):
            file_size = os.path.getsize(json_docs_path)
            logger.info(f"[STAGE 4.2] Module docs already exists at {json_docs_path} ({file_size} bytes)")
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

        # STAGE 4-FAST / AUTO-SPLIT: Token-based routing
        # - Modules with prompt_tokens <= AUTO_SPLIT_TOKEN_THRESHOLD → direct JSON mode (4-FAST)
        # - Modules exceeding the threshold → parallel auto-split by directory (no depth guard)
        # Replaces the old component-count threshold (SMALL_MODULE_THRESHOLD=60) and the
        # hardcoded MAX_LLM_CONTEXT=100K guard. Token count is always a better proxy than
        # component count since file sizes vary widely.
        from codewiki.src.be.utils import count_module_tokens
        from codewiki.src.config import AUTO_SPLIT_TOKEN_THRESHOLD
        prompt_tokens = count_module_tokens(core_component_ids, components)
        logger.info(
            f"[STAGE 4] Module token count: {prompt_tokens:,} "
            f"(threshold: {AUTO_SPLIT_TOKEN_THRESHOLD:,}, components: {len(core_component_ids)})"
        )

        force_fast = os.environ.get("CODEWIKI_FORCE_FAST_LEAF", "").strip().lower() in (
            "1",
            "true",
            "yes",
        )

        if force_fast or prompt_tokens <= AUTO_SPLIT_TOKEN_THRESHOLD:
            if force_fast:
                logger.info(
                    f"[STAGE 4-FAST] CODEWIKI_FORCE_FAST_LEAF — forcing direct JSON mode "
                    f"for {module_name} ({len(core_component_ids)} components, {prompt_tokens:,} tokens)"
                )
            else:
                logger.info(
                    f"[STAGE 4-FAST] Module fits threshold ({prompt_tokens:,} <= {AUTO_SPLIT_TOKEN_THRESHOLD:,} tokens)"
                    f" — using direct JSON mode for {module_name}"
                )
            try:
                import json as _json

                doc = await generate_leaf_doc_json_throttled(
                    module_name=module_name,
                    core_component_ids=core_component_ids,
                    components=components,
                    module_tree=module_tree,
                    config=self.config,
                )
                json_path = os.path.join(working_dir, f"{doc_stem}.json")
                with open(json_path, "w") as f:
                    _json.dump(doc, f, indent=2)
                logger.info(f"[STAGE 4-FAST] Wrote {json_path}")

                # Update module tree (navigate via "children" like apply_metadata_to_tree_path)
                if module_tree_lock:
                    with module_tree_lock:
                        current_tree = file_manager.load_json(module_tree_path)
                        apply_metadata_to_tree_path(
                            current_tree, module_path,
                            doc["title"], doc["summary"], doc["diagram"],
                        )
                        file_manager.save_json(current_tree, module_tree_path)
                        deps.module_tree = current_tree
                else:
                    apply_metadata_to_tree_path(
                        deps.module_tree, module_path,
                        doc["title"], doc["summary"], doc["diagram"],
                    )
                    file_manager.save_json(deps.module_tree, module_tree_path)

                logger.info(
                    f"[STAGE 4-FAST] COMPLETE for {module_name} in "
                    f"{time.time() - module_start:.1f}s"
                )
                return deps.module_tree
            except Exception as fast_err:
                logger.warning(
                    f"[STAGE 4-FAST] JSON mode failed for {module_name}: {fast_err} "
                    f"— falling through to auto-split"
                )

        # STAGE 4.5.5: AUTO-SPLIT — module exceeds AUTO_SPLIT_TOKEN_THRESHOLD
        # Split by directory into parallel sub-modules. No depth guard: auto-split is purely
        # a context-reduction step, not agent delegation, so tree depth is irrelevant.
        logger.warning(
            f"[STAGE 4.5.5: AUTO-SPLIT] {module_name} has {prompt_tokens:,} tokens "
            f"> {AUTO_SPLIT_TOKEN_THRESHOLD:,} threshold — splitting"
        )

        sub_modules = self._auto_split_module(core_component_ids, components)
        logger.info(f"[STAGE 4.5.5] Split into {len(sub_modules)} sub-modules")
        for sub_name, sub_info in sub_modules.items():
            logger.info(f"[STAGE 4.5.5]   - {sub_name}: {len(sub_info['components'])} components")

        # Guard against infinite recursion: if split produced one group with the same
        # components, token chunking couldn't reduce further — fall back to 4-FAST.
        if len(sub_modules) == 1:
            only_info = next(iter(sub_modules.values()))
            if set(only_info["components"]) == set(core_component_ids):
                logger.warning(
                    f"[STAGE 4.5.5] Auto-split could not reduce {module_name} "
                    f"({prompt_tokens:,} tokens) — forcing 4-FAST"
                )
                try:
                    import json as _json

                    doc = await generate_leaf_doc_json_throttled(
                        module_name=module_name,
                        core_component_ids=core_component_ids,
                        components=components,
                        module_tree=module_tree,
                        config=self.config,
                    )
                    json_path = os.path.join(working_dir, f"{doc_stem}.json")
                    with open(json_path, "w") as f:
                        _json.dump(doc, f, indent=2)
                    if module_tree_lock:
                        with module_tree_lock:
                            current_tree = file_manager.load_json(module_tree_path)
                            apply_metadata_to_tree_path(
                                current_tree, module_path,
                                doc["title"], doc["summary"], doc["diagram"],
                            )
                            file_manager.save_json(current_tree, module_tree_path)
                            deps.module_tree = current_tree
                    else:
                        apply_metadata_to_tree_path(
                            deps.module_tree, module_path,
                            doc["title"], doc["summary"], doc["diagram"],
                        )
                        file_manager.save_json(deps.module_tree, module_tree_path)
                    logger.info(
                        f"[STAGE 4-FAST] COMPLETE (forced after unsplittable module) "
                        f"for {module_name} in {time.time() - module_start:.1f}s"
                    )
                    return deps.module_tree
                except Exception as fast_err:
                    logger.error(
                        f"[STAGE 4.5.5] Forced 4-FAST also failed for {module_name}: {fast_err}"
                    )
                    raise

        # MAP: digest each chunk in parallel (ephemeral — chunks never enter the tree).
        # Each call compresses raw source → node list + summary so the reduce step
        # can reason over compact digests rather than raw code.
        import json as _json
        from codewiki.src.be.direct_module_doc import generate_digest_doc_json, generate_merged_doc_json

        async def _digest_chunk(sub_name: str, sub_info: Dict[str, Any]) -> Dict[str, Any]:
            logger.info(f"[STAGE 4.5.5 MAP] Digesting chunk '{sub_name}' ({len(sub_info['components'])} components)")
            try:
                return await generate_leaf_doc_json_throttled(
                    module_name=sub_name,
                    core_component_ids=sub_info["components"],
                    components=components,
                    module_tree=module_tree,
                    config=self.config,
                )
            except Exception as e:
                logger.error(f"[STAGE 4.5.5 MAP] Chunk '{sub_name}' digest failed: {e}")
                return {"title": sub_name, "summary": "", "diagram": {"nodes": [], "edges": [], "groups": []}}

        chunk_docs: List[Dict[str, Any]] = await asyncio.gather(
            *[_digest_chunk(name, info) for name, info in sub_modules.items()]
        )
        logger.info(f"[STAGE 4.5.5 MAP] All {len(chunk_docs)} chunks digested")

        # REDUCE: one LLM call over node digests → final unified {title, summary, diagram}.
        # No raw source in the prompt — just the compact node representations.
        logger.info(f"[STAGE 4.5.5 REDUCE] Building unified diagram for {module_name}")
        try:
            async with _get_llm_semaphore():
                doc = await asyncio.to_thread(
                    generate_merged_doc_json,
                    module_name=module_name,
                    chunk_docs=chunk_docs,
                    module_tree=module_tree,
                    config=self.config,
                )
        except Exception as reduce_err:
            logger.error(f"[STAGE 4.5.5 REDUCE] Merge failed ({reduce_err}); falling back to first chunk doc")
            doc = chunk_docs[0] if chunk_docs else {
                "title": module_name.replace("_", " ").title(),
                "summary": f"Documentation for {module_name}.",
                "diagram": {"direction": "TD", "nodes": [], "edges": [], "groups": []},
            }

        # Write the module as a single leaf — no part_N children in the tree.
        json_path = os.path.join(working_dir, f"{doc_stem}.json")
        with open(json_path, "w", encoding="utf-8") as f:
            _json.dump(doc, f, indent=2)
        logger.info(f"[STAGE 4.5.5] Wrote unified doc: {json_path}")

        if module_tree_lock:
            with module_tree_lock:
                current_tree = file_manager.load_json(module_tree_path)
                apply_metadata_to_tree_path(
                    current_tree, module_path,
                    doc["title"], doc["summary"], doc["diagram"],
                )
                file_manager.save_json(current_tree, module_tree_path)
                deps.module_tree = current_tree
        else:
            apply_metadata_to_tree_path(
                deps.module_tree, module_path,
                doc["title"], doc["summary"], doc["diagram"],
            )
            file_manager.save_json(deps.module_tree, module_tree_path)

        module_duration = time.time() - module_start
        logger.info(
            f"[STAGE 4: AGENT MODULE PROCESSING] COMPLETE in {module_duration:.1f}s "
            f"(auto-split map+reduce) for module: {module_name}"
        )
        return deps.module_tree