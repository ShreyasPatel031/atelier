"""
Web-only: run the same generation stages as CLIDocumentationGenerator._run_backend_generation.

Does NOT call DocumentationGenerator.run() — avoids quick overview + run_full_sync so output
matches `codewiki generate` without editing shared overview logic in documentation_generator.py.

IMPORTANT: Do not use the stdlib ``signal`` module here (handlers/alarm). The web app runs
this coroutine from a background worker thread; those APIs only work on the main thread. The
CLI adapter still applies a Stage 1 wall-clock timeout when running on the main thread.
"""

from __future__ import annotations

import logging
import os
from typing import TYPE_CHECKING

from codewiki.src.be.cluster_modules import cluster_modules
from codewiki.src.config import FIRST_MODULE_TREE_FILENAME, MODULE_TREE_FILENAME
from codewiki.src.file_manager import file_manager
from codewiki.src.be.llm_services import get_token_tracker

if TYPE_CHECKING:
    from codewiki.src.be.documentation_generator import DocumentationGenerator

logger = logging.getLogger(__name__)


async def run_cli_equivalent_generation(doc_generator: DocumentationGenerator) -> None:
    """Dependency graph → clustering → generate_module_documentation → metadata (CLI parity)."""
    working_dir = os.path.abspath(doc_generator.config.docs_dir)
    file_manager.ensure_directory(working_dir)
    first_module_tree_path = os.path.join(working_dir, FIRST_MODULE_TREE_FILENAME)
    module_tree_path = os.path.join(working_dir, MODULE_TREE_FILENAME)

    tracker = get_token_tracker()
    tracker.set_stage("Stage 1: Dependency Analysis")

    components, leaf_nodes = doc_generator.graph_builder.build_dependency_graph()
    doc_generator._emit_stage(1)

    tracker.set_stage("Stage 2: Module Clustering")
    if os.path.exists(first_module_tree_path):
        try:
            module_tree = file_manager.load_json(first_module_tree_path)
            logger.info(
                "[WEB_PIPELINE] Loaded cached first_module_tree from %s", first_module_tree_path
            )
        except Exception as e:
            logger.error("[WEB_PIPELINE] Failed to load cached module tree: %s", e)
            module_tree = None
    else:
        module_tree = None

    if module_tree is None:
        module_tree = cluster_modules(leaf_nodes, components, doc_generator.config)
        if len(module_tree) == 0:
            raise RuntimeError(
                f"Module clustering failed — 0 modules from {len(leaf_nodes)} leaf nodes"
            )
        file_manager.save_json(module_tree, first_module_tree_path)

    file_manager.save_json(module_tree, module_tree_path)
    doc_generator._emit_stage(2)

    tracker.set_stage("Stage 3: Module Documentation")
    await doc_generator.generate_module_documentation(components, leaf_nodes)
    doc_generator.create_documentation_metadata(working_dir, components, len(leaf_nodes))
    doc_generator._emit_stage(3)
