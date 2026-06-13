import asyncio
import logging
import os
import json
import time
import threading
from pathlib import Path
from typing import Dict, List, Any, Optional, Callable
from copy import deepcopy
import traceback

# Configure logging and monitoring
logger = logging.getLogger(__name__)

# Local imports
from codewiki.src.be.dependency_analyzer import DependencyGraphBuilder
from codewiki.src.be.llm_services import call_llm, get_token_tracker
from codewiki.src.be.prompt_template import (
    REPO_OVERVIEW_PROMPT,
    MODULE_OVERVIEW_PROMPT,
)
from codewiki.src.be.cluster_modules import cluster_modules
from codewiki.src.config import (
    Config,
    FIRST_MODULE_TREE_FILENAME,
    MODULE_TREE_FILENAME,
    MODULE_DOC_EXT,
    OVERVIEW_FILENAME,
    module_doc_path,
)
from codewiki.src.file_manager import file_manager
from codewiki.src.be.agent_orchestrator import AgentOrchestrator
from codewiki.src.be.doc_schema import validate_module_doc
from codewiki.src.be.module_metadata import (
    apply_metadata_to_tree_path,
    extract_module_metadata_from_file,
    extract_module_metadata_from_markdown,
)


def _llm_markdown_overview_to_module_doc_payload(content: str, fallback_title: str) -> Dict[str, Any]:
    """Parse LLM output (JSON preferred, markdown fallback) into a validated module/overview JSON dict."""
    import json as _json
    # Try direct JSON parse first (new JSON-only pipeline)
    try:
        raw = _json.loads(content)
        if isinstance(raw, dict) and ("title" in raw or "summary" in raw or "diagram" in raw):
            t = (raw.get("title") or fallback_title or "Module").strip()
            s = (raw.get("summary") or "").strip()
            diagram = raw.get("diagram")
            if not (isinstance(diagram, dict) and isinstance(diagram.get("nodes"), list)):
                diagram = None
            if diagram is None:
                diagram = {
                    "direction": "TD",
                    "nodes": [{"id": "root", "label": t, "type": "module", "title": t, "description": (s[:200] if s else t)}],
                    "edges": [],
                    "groups": [],
                }
            doc = validate_module_doc({"title": t, "summary": s or f"Documentation for {t}.", "diagram": diagram})
            return doc.model_dump(mode="json")
    except (ValueError, _json.JSONDecodeError):
        pass

    # Fallback: markdown extraction (legacy LLM responses)
    title, summary, diagram = extract_module_metadata_from_markdown(
        content, fallback_title=fallback_title
    )
    t = (title or fallback_title or "Module").strip()
    s = (summary or "").strip()
    if diagram is None:
        diagram = {
            "direction": "TD",
            "nodes": [{"id": "root", "label": t, "type": "module", "title": t, "description": (s[:200] if s else t)}],
            "edges": [],
            "groups": [],
        }
    doc = validate_module_doc({"title": t, "summary": s or f"Documentation for {t}.", "diagram": diagram})
    return doc.model_dump(mode="json")


class DocumentationGenerator:
    """Main documentation generation orchestrator."""
    
    def __init__(
        self,
        config: Config,
        commit_id: str = None,
        progress_callback: Optional[Callable[[int], None]] = None,
    ):
        self.config = config
        self.commit_id = commit_id
        self._progress_callback = progress_callback
        self.graph_builder = DependencyGraphBuilder(config)
        self.agent_orchestrator = AgentOrchestrator(config)

    def _emit_stage(self, stage: int) -> None:
        if not self._progress_callback:
            return
        try:
            self._progress_callback(stage)
        except Exception as e:
            logger.warning(f"progress_callback failed: {e}")
    
    def create_documentation_metadata(self, working_dir: str, components: Dict[str, Any], num_leaf_nodes: int):
        """Create a metadata file with documentation generation information."""
        from datetime import datetime
        
        metadata = {
            "generation_info": {
                "timestamp": datetime.now().isoformat(),
                "main_model": self.config.main_model,
                "generator_version": "1.0.0",
                "repo_path": self.config.repo_path,
                "commit_id": self.commit_id
            },
            "statistics": {
                "total_components": len(components),
                "leaf_nodes": num_leaf_nodes,
                "max_depth": self.config.max_depth
            },
            "files_generated": [
                OVERVIEW_FILENAME,
                MODULE_TREE_FILENAME,
                FIRST_MODULE_TREE_FILENAME,
            ]
        }
        
        # Add generated per-module JSON (and any legacy markdown) to the metadata
        try:
            for file_path in os.listdir(working_dir):
                if file_path.endswith(MODULE_DOC_EXT) and file_path not in metadata["files_generated"]:
                    metadata["files_generated"].append(file_path)

        except Exception as e:
            logger.warning(f"Could not list generated files: {e}")
        
        metadata_path = os.path.join(working_dir, "metadata.json")
        file_manager.save_json(metadata, metadata_path)

    
    def get_processing_order(self, module_tree: Dict[str, Any], parent_path: List[str] = []) -> List[tuple[List[str], str]]:
        """Get the processing order using topological sort (leaf modules first)."""
        processing_order = []
        
        def collect_modules(tree: Dict[str, Any], path: List[str]):
            for module_name, module_info in tree.items():
                current_path = path + [module_name]
                
                # If this module has children, process them first
                if module_info.get("children") and isinstance(module_info["children"], dict) and module_info["children"]:
                    collect_modules(module_info["children"], current_path)
                    # Add this parent module after its children
                    processing_order.append((current_path, module_name))
                else:
                    # This is a leaf module, add it immediately
                    processing_order.append((current_path, module_name))
        
        collect_modules(module_tree, parent_path)
        return processing_order
    
    def get_parallel_processing_order(self, module_tree: Dict[str, Any]) -> List[List[tuple[List[str], str, Dict]]]:
        """
        Get processing order grouped by depth for parallel execution.
        Returns: List of batches, where each batch contains modules that can run in parallel.
        Batches are ordered from deepest (leaves) to shallowest (roots).
        """
        from collections import defaultdict
        
        depth_groups = defaultdict(list)
        
        def collect_by_depth(tree: Dict[str, Any], path: List[str], depth: int):
            for module_name, module_info in tree.items():
                current_path = path + [module_name]
                depth_groups[depth].append((current_path, module_name, module_info))
                
                # Recurse into children
                if module_info.get("children") and isinstance(module_info["children"], dict):
                    collect_by_depth(module_info["children"], current_path, depth + 1)
        
        collect_by_depth(module_tree, [], 0)
        
        # Return batches from deepest to shallowest (leaves first, then parents)
        max_depth = max(depth_groups.keys()) if depth_groups else 0
        batches = []
        for depth in range(max_depth, -1, -1):
            if depth in depth_groups:
                batches.append(depth_groups[depth])
        
        return batches

    def is_leaf_module(self, module_info: Dict[str, Any]) -> bool:
        """Check if a module is a leaf module (has no children or empty children)."""
        children = module_info.get("children", {})
        return not children or (isinstance(children, dict) and len(children) == 0)
    
    def _build_quick_overview_doc_dict(
        self, module_tree: Dict[str, Any], components: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Build validated overview JSON from module tree only (low latency)."""
        repo_name = os.path.basename(os.path.normpath(self.config.repo_path))

        root_id = repo_name.replace("-", "_").lower()
        nodes = [{"id": root_id, "label": repo_name, "type": "module"}]
        edges = []
        for module_name in module_tree.keys():
            mid = module_name.replace(" ", "_").lower()
            nodes.append(
                {
                    "id": mid,
                    "label": module_name.replace("_", " ").title(),
                    "type": "module",
                    "link": module_name,
                }
            )
            edges.append({"source": root_id, "target": mid, "label": "contains"})
        diagram_obj = {"direction": "TD", "nodes": nodes, "edges": edges, "groups": []}

        summary_parts = [
            f"This repository contains {len(module_tree)} main modules with a total of "
            f"{len(components)} components."
        ]
        for module_name, module_info in module_tree.items():
            component_count = len(module_info.get("components", []))
            path = module_info.get("path", "")
            line = f"**{module_name}**: path `{path}`, {component_count} components"
            if module_info.get("children"):
                line += f", {len(module_info['children'])} sub-modules"
            summary_parts.append(line)
        summary = "\n\n".join(summary_parts)

        doc = validate_module_doc(
            {
                "title": f"{repo_name} — Repository overview",
                "summary": summary,
                "diagram": diagram_obj,
            }
        )
        return doc.model_dump(mode="json")

    def build_overview_structure(self, module_tree: Dict[str, Any], module_path: List[str],
                                 working_dir: str) -> Dict[str, Any]:
        """Build structure for overview generation with 1-depth children docs and target indicator."""
        
        processed_module_tree = deepcopy(module_tree)
        module_info: Any = processed_module_tree
        for path_part in module_path:
            if not isinstance(module_info, dict) or path_part not in module_info:
                logger.warning(
                    "build_overview_structure: missing segment %r for path %s",
                    path_part,
                    module_path,
                )
                return processed_module_tree
            module_info = module_info[path_part]
            if path_part != module_path[-1]:
                module_info = module_info.get("children") or {}
            else:
                module_info["is_target_for_overview_generation"] = True

        if not isinstance(module_info, dict):
            logger.warning("build_overview_structure: target node is not a dict for path %s", module_path)
            return processed_module_tree

        if "children" in module_info:
            module_info = module_info["children"]
        else:
            module_info = {}

        for child_name, child_info in module_info.items():
            json_path = module_doc_path(working_dir, child_name)
            if json_path.exists():
                child_info["docs"] = json_path.read_text(encoding="utf-8", errors="replace")
            else:
                logger.warning("Module docs not found at %s", json_path)
                child_info["docs"] = ""

        return processed_module_tree

    async def generate_module_documentation(self, components: Dict[str, Any], leaf_nodes: List[str]) -> str:
        """Generate documentation for all modules using dynamic programming approach."""
        import time
        stage_start = time.time()
        logger.info(f"[STAGE 3: DOCUMENTATION GENERATION] Starting at {time.strftime('%Y-%m-%d %H:%M:%S')}")
        logger.info(f"[STAGE 3] Input: {len(components)} components, {len(leaf_nodes)} leaf nodes")
        
        # Prepare output directory
        working_dir = os.path.abspath(self.config.docs_dir)
        logger.info(f"[STAGE 3] Working directory: {working_dir}")
        try:
            file_manager.ensure_directory(working_dir)
            logger.info(f"[STAGE 3] Created/verified working directory")
        except Exception as e:
            logger.error(f"[STAGE 3] Failed to create working directory: {e}")
            raise

        module_tree_path = os.path.join(working_dir, MODULE_TREE_FILENAME)
        first_module_tree_path = os.path.join(working_dir, FIRST_MODULE_TREE_FILENAME)
        logger.info(f"[STAGE 3] Loading module trees...")
        logger.info(f"[STAGE 3]   - Module tree path: {module_tree_path}")
        logger.info(f"[STAGE 3]   - First module tree path: {first_module_tree_path}")
        
        try:
            module_tree = file_manager.load_json(module_tree_path)
            logger.info(f"[STAGE 3] Loaded module_tree.json: {len(module_tree)} modules")
        except Exception as e:
            logger.error(f"[STAGE 3] Failed to load module_tree.json: {e}")
            raise
        
        try:
            first_module_tree = file_manager.load_json(first_module_tree_path)
            logger.info(f"[STAGE 3] Loaded first_module_tree.json: {len(first_module_tree)} modules")
        except Exception as e:
            logger.error(f"[STAGE 3] Failed to load first_module_tree.json: {e}")
            raise
        
        # Get processing order (leaf modules first)
        logger.info(f"[STAGE 3] Determining processing order...")
        processing_order = self.get_processing_order(first_module_tree)
        logger.info(f"[STAGE 3] Processing order: {len(processing_order)} modules to process")
        logger.info(f"[STAGE 3] Processing order preview: {[name for _, name in processing_order[:5]]}{'...' if len(processing_order) > 5 else ''}")

        
        # Process modules in dependency order WITH PARALLELIZATION
        import asyncio
        
        final_module_tree = module_tree
        processed_modules = set()
        failed_modules = []
        successful_modules = []
        
        # Check for parallel mode (can be disabled via config if needed)
        use_parallel = getattr(self.config, 'parallel_processing', True)
        max_concurrent = getattr(self.config, 'max_concurrent_modules', 16)

        if len(module_tree) > 0:
            if use_parallel:
                # The asyncio default thread pool is only min(32, cpu+4) (~14 on a 10-core
                # box). Every leaf LLM call runs via asyncio.to_thread, so a starved pool
                # serializes "parallel" work ~14-at-a-time. Size the pool to comfortably
                # exceed the global LLM semaphore (MAX_CONCURRENT_LLM_CALLS) so threads are
                # never the bottleneck; the semaphore — not the pool — bounds API concurrency.
                import concurrent.futures
                from codewiki.src.config import MAX_CONCURRENT_LLM_CALLS
                loop = asyncio.get_running_loop()
                pool_size = max(max_concurrent, MAX_CONCURRENT_LLM_CALLS) + 8
                loop.set_default_executor(
                    concurrent.futures.ThreadPoolExecutor(max_workers=pool_size)
                )
                logger.info(f"[STAGE 3] Thread pool sized to {pool_size} workers (LLM semaphore={MAX_CONCURRENT_LLM_CALLS})")

                # PARALLEL PROCESSING: Group by depth, process each depth level in parallel
                batches = self.get_parallel_processing_order(first_module_tree)
                total_modules = sum(len(batch) for batch in batches)
                logger.info(f"[STAGE 3] 🚀 PARALLEL MODE: {len(batches)} depth levels, {total_modules} total modules")
                logger.info(f"[STAGE 3] Max concurrent: {max_concurrent}")
                
                # threading.Lock so it protects both asyncio coroutines and
                # asyncio.to_thread workers that run sync call_llm.
                module_tree_lock = threading.Lock()
                
                processed_count = 0
                for batch_idx, batch in enumerate(batches):
                    batch_start = time.time()
                    depth = len(batches) - batch_idx - 1  # Reverse since we go deepest first
                    logger.info(f"[STAGE 3] === Batch {batch_idx + 1}/{len(batches)} (depth {depth}): {len(batch)} modules ===")
                    
                    # Create semaphore to limit concurrent tasks
                    semaphore = asyncio.Semaphore(max_concurrent)
                    
                    async def process_single_module(module_path, module_name, module_info, lock):
                        async with semaphore:
                            module_key = "/".join(module_path)
                            module_start = time.time()
                            
                            if module_key in processed_modules:
                                return ("skipped", module_key, 0, None)
                            
                            try:
                                if self.is_leaf_module(module_info):
                                    logger.info(f"[STAGE 3] 📄 Processing leaf: {module_key}")
                                    # Pass the lock to process_module for thread-safe file access
                                    result_tree = await self.agent_orchestrator.process_module(
                                        module_name, components, module_info.get("components", []), module_path, working_dir,
                                        module_tree_lock=lock
                                    )
                                else:
                                    logger.info(f"[STAGE 3] 📁 Processing parent: {module_key}")
                                    await self.generate_parent_module_docs(module_path, working_dir, module_tree_lock=lock)
                                    result_tree = None
                                
                                duration = time.time() - module_start
                                return ("success", module_key, duration, result_tree)
                            except Exception as e:
                                duration = time.time() - module_start
                                logger.error(f"[STAGE 3] ✗ Failed {module_key}: {e}")
                                return ("failed", module_key, duration, str(e))
                    
                    # Run all modules in this batch in parallel
                    tasks = [process_single_module(path, name, info, module_tree_lock) for path, name, info in batch]
                    results = await asyncio.gather(*tasks, return_exceptions=True)
                    
                    # Process results
                    for result in results:
                        if isinstance(result, Exception):
                            failed_modules.append(("unknown", str(result)))
                        elif result[0] == "success":
                            processed_modules.add(result[1])
                            successful_modules.append(result[1])
                            processed_count += 1
                        elif result[0] == "failed":
                            failed_modules.append((result[1], result[3]))
                            processed_count += 1
                    
                    batch_duration = time.time() - batch_start
                    logger.info(f"[STAGE 3] Batch {batch_idx + 1} complete in {batch_duration:.1f}s ({processed_count}/{total_modules} done)")
                
                # Reload module tree after parallel processing
                final_module_tree = file_manager.load_json(module_tree_path)
            
            else:
                # SEQUENTIAL PROCESSING (original behavior)
                logger.info(f"[STAGE 3] Starting SEQUENTIAL module processing for {len(processing_order)} modules...")
                for idx, (module_path, module_name) in enumerate(processing_order, 1):
                    module_key = "/".join(module_path)
                    logger.info(f"[STAGE 3] [{idx}/{len(processing_order)}] Processing module: {module_key}")
                    module_start = time.time()
                    
                    try:
                        # Get the module info from the tree
                        module_info = module_tree
                        for path_part in module_path:
                            if path_part not in module_info:
                                logger.error(f"[STAGE 3] Module path part '{path_part}' not found in module tree")
                                raise KeyError(f"Module path part '{path_part}' not found")
                            module_info = module_info[path_part]
                            if path_part != module_path[-1]:  # Not the last part
                                module_info = module_info.get("children", {})
                        
                        # Skip if already processed
                        if module_key in processed_modules:
                            logger.info(f"[STAGE 3] Module {module_key} already processed, skipping")
                            continue
                        
                        # Process the module
                        if self.is_leaf_module(module_info):
                            logger.info(f"[STAGE 3] 📄 Processing leaf module: {module_key}")
                            logger.info(f"[STAGE 3]   - Components: {len(module_info.get('components', []))}")
                            final_module_tree = await self.agent_orchestrator.process_module(
                                module_name, components, module_info["components"], module_path, working_dir
                            )
                        else:
                            logger.info(f"[STAGE 3] 📁 Processing parent module: {module_key}")
                            logger.info(f"[STAGE 3]   - Children: {len(module_info.get('children', {}))}")
                            final_module_tree = await self.generate_parent_module_docs(
                                module_path, working_dir
                            )
                        
                        processed_modules.add(module_key)
                        successful_modules.append(module_key)
                        module_duration = time.time() - module_start
                        logger.info(f"[STAGE 3] ✓ Module {module_key} processed successfully in {module_duration:.1f}s")
                        
                    except Exception as e:
                        module_duration = time.time() - module_start
                        logger.error(f"[STAGE 3] ✗ Failed to process module {module_key} after {module_duration:.1f}s: {type(e).__name__}: {str(e)}")
                        failed_modules.append((module_key, str(e)))
                        import traceback
                        logger.error(f"[STAGE 3] Traceback: {traceback.format_exc()}")
                        continue
            
            logger.info(f"[STAGE 3] Module processing complete:")
            logger.info(f"[STAGE 3]   - Successful: {len(successful_modules)}")
            logger.info(f"[STAGE 3]   - Failed: {len(failed_modules)}")
            if failed_modules:
                logger.warning(
                    f"[STAGE 3] Failed module summary ({len(failed_modules)} total):"
                )
                for name, err in failed_modules:
                    err_one_line = (err or "").replace("\n", " ")[:500]
                    logger.warning(f"[STAGE 3]   - {name}: {err_one_line}")

            # Generate repo overview
            logger.info(f"📚 Generating repository overview")
            final_module_tree = await self.generate_parent_module_docs(
                [], working_dir
            )
            
            # POST-PROCESSING: copy diagrams from per-module *.json into module_tree
            self._extract_all_diagrams(working_dir, module_tree_path)
        else:
            # No modules in tree - this should be rare after the clustering fixes
            # Create a fallback single-module structure to ensure downstream processing works
            logger.warning(f"[STAGE 3] No modules in tree - creating fallback single-module structure")
            
            repo_name = os.path.basename(os.path.normpath(self.config.repo_path))
            logger.info(f"[STAGE 3] Creating fallback module structure for {repo_name}")
            
            # Create minimal module tree with all leaf nodes as a single module
            fallback_module_tree = {
                repo_name: {
                    "path": "",
                    "components": leaf_nodes,
                    "children": {}
                }
            }
            
            # Save the fallback module tree so other parts of the system can use it
            file_manager.save_json(fallback_module_tree, os.path.join(working_dir, MODULE_TREE_FILENAME))
            logger.info(f"[STAGE 3] Saved fallback module tree with 1 module containing {len(leaf_nodes)} components")
            
            # Process the single module
            logger.info(f"[STAGE 3] Processing fallback single module: {repo_name}")
            try:
                final_module_tree = await self.agent_orchestrator.process_module(
                    repo_name, components, leaf_nodes, [], working_dir
                )
                logger.info(f"[STAGE 3] Fallback module processing complete")
            except Exception as e:
                logger.error(f"[STAGE 3] Failed to process fallback module: {type(e).__name__}: {str(e)}")
                # Even if processing fails, we have a valid module tree structure
                final_module_tree = fallback_module_tree
                logger.warning(f"[STAGE 3] Using fallback module tree without full documentation")

            # If the LLM wrote repo_name.{json,md}, normalize to overview.json / overview.md
            repo_base = os.path.join(working_dir, repo_name)
            repo_json = repo_base + ".json"
            if os.path.exists(repo_json):
                dest = os.path.join(working_dir, OVERVIEW_FILENAME)
                if os.path.abspath(repo_json) != os.path.abspath(dest):
                    os.rename(repo_json, dest)
                    logger.info("[STAGE 3] Renamed %s to %s", os.path.basename(repo_json), OVERVIEW_FILENAME)
            
            # POST-PROCESSING: copy diagrams from per-module *.json into module_tree
            self._extract_all_diagrams(working_dir, module_tree_path)
        
        return working_dir
    
    def _extract_all_diagrams(self, docs_dir: str, module_tree_path: str) -> None:
        """
        Post-process: copy diagrams from per-module ``*.json``
        into module_tree nodes.
        """
        logger.info("[STAGE 3.5] Post-processing: extracting diagrams from module docs")

        module_tree = file_manager.load_json(module_tree_path)
        diagrams_found = 0

        skip_json_stems = {
            "module_tree",
            "first_module_tree",
            "metadata",
            "entry_points",
            "generation_report",
            "generation_metrics",
            "viewer_epoch",
            "sync_issues",
            "overview",
            "README",
        }

        for json_file in Path(docs_dir).glob("*.json"):
            stem = json_file.stem
            if stem in skip_json_stems:
                continue
            try:
                raw = json_file.read_text(encoding="utf-8", errors="replace")
                data = json.loads(raw)
            except Exception as e:
                logger.warning("[STAGE 3.5] Skip %s: %s", json_file.name, e)
                continue
            if not isinstance(data, dict):
                continue
            diagram = data.get("diagram")
            if isinstance(diagram, dict) and isinstance(diagram.get("nodes"), list):
                if self._apply_diagram_to_tree(module_tree, stem, diagram):
                    diagrams_found += 1


        file_manager.save_json(module_tree, module_tree_path)
        logger.info("[STAGE 3.5] Extracted %s diagrams into module_tree", diagrams_found)
    
    def _apply_diagram_to_tree(self, tree: Dict, module_name: str, diagram: Dict) -> bool:
        """Recursively find module by name and apply diagram. Returns True if found."""
        for name, data in tree.items():
            if name == module_name:
                data["diagram"] = diagram
                return True
            if "children" in data and data["children"]:
                if self._apply_diagram_to_tree(data["children"], module_name, diagram):
                    return True
        return False

    async def generate_parent_module_docs(self, module_path: List[str], 
                                        working_dir: str,
                                        module_tree_lock: Optional[threading.Lock] = None) -> Dict[str, Any]:
        """Generate documentation for a parent module based on its children's documentation."""
        module_name = module_path[-1] if len(module_path) >= 1 else os.path.basename(os.path.normpath(self.config.repo_path))

        logger.info(f"Generating parent documentation for: {module_name}")
        
        # Load module tree
        module_tree_path = os.path.join(working_dir, MODULE_TREE_FILENAME)
        module_tree = file_manager.load_json(module_tree_path)

        overview_docs_path = os.path.join(working_dir, OVERVIEW_FILENAME)
        if len(module_path) == 0:
            if os.path.exists(overview_docs_path):
                logger.info("✓ Overview docs already exists at %s", overview_docs_path)
                return module_tree
            parent_docs_path = overview_docs_path
        else:
            parent_docs_path = str(module_doc_path(working_dir, module_name))
            if os.path.exists(parent_docs_path):
                logger.info("✓ Parent docs already exists at %s", parent_docs_path)
                return module_tree

        # Create repo structure with 1-depth children docs and target indicator
        repo_structure = self.build_overview_structure(module_tree, module_path, working_dir)

        # Build list of available modules from the module tree
        # This prevents the LLM from creating links to non-existent modules
        def collect_module_keys(tree, prefix=""):
            keys = []
            for key, data in tree.items():
                full_key = f"{prefix}/{key}" if prefix else key
                keys.append(key)  # tree key → ``{key}.json`` module doc
                if data.get("children"):
                    keys.extend(collect_module_keys(data["children"], full_key))
            return keys
        
        available_modules = collect_module_keys(module_tree)
        available_modules_str = ", ".join([f'"{m}"' for m in available_modules]) if available_modules else "(no sub-modules)"
        logger.info(f"[STAGE 3] Available modules for linking: {available_modules_str}")

        prompt = MODULE_OVERVIEW_PROMPT.format(
            module_name=module_name,
            repo_structure=json.dumps(repo_structure, indent=4)
        ) if len(module_path) >= 1 else REPO_OVERVIEW_PROMPT.format(
            repo_name=module_name,
            repo_structure=json.dumps(repo_structure, indent=4),
            available_modules=available_modules_str
        )
        
        try:
            logger.info(f"[STAGE 3] Generating parent documentation for '{module_name}'...")
            logger.info(f"[STAGE 3] Prompt size: {len(prompt)} chars")
            parent_docs_start = time.time()
            parent_docs = await asyncio.to_thread(
                call_llm, prompt, self.config, thinking_budget=0
            )
            parent_docs_duration = time.time() - parent_docs_start
            logger.info(f"[STAGE 3] LLM call completed in {parent_docs_duration:.1f}s, response length: {len(parent_docs)} chars")
            
            parent_content = parent_docs.strip()

            # Remove markdown code block wrapper if present (e.g., ```markdown ... ```)
            # but only if it's a simple outer wrapper — not if the content has inner fenced blocks
            if parent_content.startswith("```") and parent_content.count("```") == 2:
                logger.debug(f"[STAGE 3] Removing markdown code block wrapper")
                lines = parent_content.split("\n")
                if len(lines) > 1 and lines[0].startswith("```"):
                    lines = lines[1:]
                    if lines and lines[-1].strip() == "```":
                        lines = lines[:-1]
                    parent_content = "\n".join(lines).strip()
            
            try:
                payload = _llm_markdown_overview_to_module_doc_payload(parent_content, module_name)
                file_manager.save_json(payload, parent_docs_path)
                logger.info(
                    "[STAGE 3] Successfully saved parent documentation to %s",
                    parent_docs_path,
                )
            except Exception as e:
                logger.error(f"[STAGE 3] Failed to save parent documentation: {e}")
                raise

            # Write title/description/diagram from parent JSON into module_tree (same as leaf path)
            if len(module_path) >= 1:
                try:
                    ext_title, ext_desc, ext_diagram = extract_module_metadata_from_file(
                        parent_docs_path
                    )
                    if ext_title:
                        def _apply_parent_metadata():
                            fresh_tree = file_manager.load_json(module_tree_path)
                            ok = apply_metadata_to_tree_path(
                                fresh_tree, module_path,
                                ext_title, ext_desc, ext_diagram,
                            )
                            if ok:
                                file_manager.save_json(fresh_tree, module_tree_path)
                            return ok, fresh_tree

                        if module_tree_lock:
                            with module_tree_lock:
                                applied, fresh_tree = _apply_parent_metadata()
                        else:
                            applied, fresh_tree = _apply_parent_metadata()

                        if applied:
                            module_tree = fresh_tree
                            logger.info(
                                "[STAGE 3] Applied parent metadata to tree for path %s: title=%r",
                                module_path,
                                ext_title,
                            )
                        else:
                            logger.warning(
                                "[STAGE 3] Could not apply parent metadata to tree for path %s",
                                module_path,
                            )
                except Exception as meta_err:
                    logger.warning(
                        "[STAGE 3] Parent metadata extraction failed (non-fatal): %s",
                        meta_err,
                    )
            
            logger.info(f"[STAGE 3] Successfully generated parent documentation for: {module_name}")
            return module_tree
            
        except Exception as e:
            logger.error(f"[STAGE 3] Error generating parent documentation for {module_name}: {type(e).__name__}: {str(e)}")
            logger.error(f"[STAGE 3] Module path: {module_path}, Module name: {module_name}")
            import traceback
            logger.error(f"[STAGE 3] Traceback: {traceback.format_exc()}")
            raise
    
    async def run(self) -> None:
        """Run the complete documentation generation process using dynamic programming."""
        # Initialize generation tracker
        try:
            from codewiki.src.be.generation_tracker import get_generation_tracker, reset_generation_tracker
            reset_generation_tracker()
            gen_tracker = get_generation_tracker()
            repo_name = os.path.basename(os.path.normpath(self.config.repo_path))
            gen_tracker.start_generation(repo_name)
        except Exception as e:
            logger.warning(f"[STAGE 0] Failed to initialize generation tracker: {e}")
        
        try:
            # Build dependency graph
            components, leaf_nodes, reachability = self.graph_builder.build_dependency_graph()
            self._emit_stage(1)

            logger.debug(f"Found {len(leaf_nodes)} leaf nodes")
            
            # Persist ranked entry points for analysis
            working_dir = os.path.abspath(self.config.docs_dir)
            file_manager.ensure_directory(working_dir)
            entry_points_path = os.path.join(working_dir, "entry_points.json")
            entry_points_data = [
                {"rank": i + 1, "id": ep, "reachability": reachability.get(ep, 0)}
                for i, ep in enumerate(leaf_nodes)
            ]
            try:
                file_manager.save_json(entry_points_data, entry_points_path)
                logger.info(f"[STAGE 1] Saved {len(entry_points_data)} ranked entry points to {entry_points_path}")
            except Exception as e:
                logger.warning(f"[STAGE 1] Failed to save entry_points.json: {e}")
            
            # Cluster modules
            first_module_tree_path = os.path.join(working_dir, FIRST_MODULE_TREE_FILENAME)
            module_tree_path = os.path.join(working_dir, MODULE_TREE_FILENAME)
            
            # Check if module tree exists
            # Set token tracker stage for cost tracking
            tracker = get_token_tracker()
            tracker.set_stage("Stage 2: Module Clustering")
            
            logger.info(f"[STAGE 2: MODULE CLUSTERING] Checking for cached module tree...")
            if os.path.exists(first_module_tree_path):
                logger.info(f"[STAGE 2] Module tree found at {first_module_tree_path}")
                try:
                    module_tree = file_manager.load_json(first_module_tree_path)
                    logger.info(f"[STAGE 2] Loaded cached module tree: {len(module_tree)} modules")
                except Exception as e:
                    logger.error(f"[STAGE 2] Failed to load cached module tree: {e}")
                    logger.info(f"[STAGE 2] Will regenerate...")
                    module_tree = None
            else:
                logger.info(f"[STAGE 2] Module tree not found at {first_module_tree_path}, clustering modules")
                module_tree = None
            
            if module_tree is None:
                logger.info(f"[STAGE 2] Starting module clustering...")
                try:
                    module_tree = cluster_modules(leaf_nodes, components, self.config)
                    logger.info(f"[STAGE 2] Clustering complete: {len(module_tree)} modules created")
                    
                    if len(module_tree) == 0:
                        logger.error(f"[STAGE 2] CRITICAL: Clustering returned 0 modules!")
                        logger.error(f"[STAGE 2] Input: {len(leaf_nodes)} leaf nodes, {len(components)} components")
                        logger.error(f"[STAGE 2] This will cause module viewer to fail")
                        logger.error(f"[STAGE 2] Module tree content: {module_tree}")
                        raise RuntimeError(f"Module clustering failed - 0 modules created from {len(leaf_nodes)} leaf nodes")
                    
                    try:
                        file_manager.save_json(module_tree, first_module_tree_path)
                        logger.info(f"[STAGE 2] Saved module tree to {first_module_tree_path}")
                    except Exception as e:
                        logger.error(f"[STAGE 2] Failed to save module tree: {e}")
                        raise
                except Exception as e:
                    logger.error(f"[STAGE 2] Clustering FAILED: {type(e).__name__}: {str(e)}")
                    import traceback
                    logger.error(f"[STAGE 2] Traceback: {traceback.format_exc()}")
                    raise
            
            try:
                file_manager.save_json(module_tree, module_tree_path)
                logger.info(f"[STAGE 2] Saved module tree to {module_tree_path}")
            except Exception as e:
                logger.error(f"[STAGE 2] Failed to save module tree to {module_tree_path}: {e}")
                raise

            self._emit_stage(2)
            
            logger.info(f"[STAGE 2: MODULE CLUSTERING] COMPLETE - Grouped components into {len(module_tree)} modules")
            if len(module_tree) > 0:
                logger.info(f"[STAGE 2] Module names: {list(module_tree.keys())[:10]}{'...' if len(module_tree) > 10 else ''}")
            
            # LOW-LATENCY: Generate initial overview immediately after clustering
            # This provides fast feedback while modules are still being processed
            working_dir = os.path.abspath(self.config.docs_dir)
            overview_path = os.path.join(working_dir, OVERVIEW_FILENAME)
            
            if not os.path.exists(overview_path) and len(module_tree) > 0:
                try:
                    logger.info("🚀 Generating low-latency overview (top-level structure only)...")
                    # Generate a quick overview based on module tree structure only
                    quick = self._build_quick_overview_doc_dict(module_tree, components)
                    file_manager.save_json(quick, overview_path)
                    logger.info(f"✓ Quick overview generated at {overview_path}")
                    
                    # Track first overview for metrics
                    try:
                        from codewiki.src.utils.metrics import get_metrics_collector
                        metrics = get_metrics_collector().get_current()
                        if metrics:
                            metrics.record_first_overview(overview_path)
                    except:
                        pass
                except Exception as e:
                    logger.warning(f"Failed to generate quick overview: {e}")
            
            # Set stage for cost tracking
            tracker.set_stage("Stage 4: Module Documentation")
            
            # Generate module documentation using dynamic programming approach
            # This processes leaf modules first, then parent modules
            working_dir = await self.generate_module_documentation(components, leaf_nodes)
            
            # Create documentation metadata
            self.create_documentation_metadata(working_dir, components, len(leaf_nodes))
            
            # POST-PROCESSING: Sync files with module tree
            # This ensures all modules in tree have corresponding JSON docs
            try:
                from codewiki.src.be.doc_file_sync import run_full_sync
                sync_result = run_full_sync(working_dir, components, config=self.config)
                if sync_result['files_created'] > 0:
                    logger.info(f"[STAGE 4.5] Doc sync created {sync_result['files_created']} missing files")
                if sync_result['diagrams_updated'] > 0:
                    logger.info(f"[STAGE 4.5] Doc sync updated {sync_result['diagrams_updated']} diagram references")
            except Exception as sync_err:
                logger.warning(f"[STAGE 4.5] Doc sync failed (non-critical): {sync_err}")

            self._emit_stage(3)
            
            logger.debug(f"Documentation generation completed successfully using dynamic programming!")
            logger.debug(f"Processing order: leaf modules → parent modules → repository overview")
            logger.debug(f"Documentation saved to: {working_dir}")
            
            # Print final token usage summary
            tracker.set_stage("Complete")
            logger.info("\n" + tracker.get_summary())
            
            # Complete generation tracking and save report
            try:
                from codewiki.src.be.generation_tracker import get_generation_tracker
                gen_tracker = get_generation_tracker()
                gen_tracker.complete_generation(working_dir)
                
                # Save generation report
                report_path = os.path.join(working_dir, "generation_report.json")
                gen_tracker.save_report(report_path)
                
                # Print summary
                gen_tracker.print_report()
            except Exception as track_err:
                logger.warning(f"[STAGE 5] Failed to save generation report: {track_err}")
            
        except Exception as e:
            logger.error(f"Documentation generation failed: {str(e)}")
            logger.error(f"Traceback: {traceback.format_exc()}")
            
            # Track failure in generation tracker
            try:
                from codewiki.src.be.generation_tracker import get_generation_tracker
                gen_tracker = get_generation_tracker()
                gen_tracker.track_error("root", type(e).__name__, str(e)[:500])
                gen_tracker.complete_generation(self.config.docs_dir if hasattr(self.config, 'docs_dir') else None)
                gen_tracker.print_report()
            except Exception:
                pass
            
            raise