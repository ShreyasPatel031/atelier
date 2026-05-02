"""
CLI adapter for documentation generator backend.

This adapter wraps the existing backend documentation_generator.py
and provides CLI-specific functionality like progress reporting.
"""

from pathlib import Path
from typing import Any, Dict, Optional
import time
import asyncio
import os
import logging
import sys
import json
import click

from codewiki.cli.utils.progress import ProgressTracker
from codewiki.cli.models.job import DocumentationJob, LLMConfig
from codewiki.cli.utils.errors import APIError

# Import backend modules
from codewiki.src.be.documentation_generator import DocumentationGenerator
from codewiki.src.config import Config as BackendConfig, set_cli_context

_log = logging.getLogger(__name__)


class CLIDocumentationGenerator:
    """
    CLI adapter for documentation generation with progress reporting.
    
    This class wraps the backend documentation generator and adds
    CLI-specific features like progress tracking and error handling.
    """
    
    def __init__(
        self,
        repo_path: Path,
        output_dir: Path,
        config: Dict[str, Any],
        verbose: bool = False,
        generate_html: bool = False,
        demo_slug: Optional[str] = None,
    ):
        """
        Initialize the CLI documentation generator.
        
        Args:
            repo_path: Repository path
            output_dir: Output directory
            config: LLM configuration
            verbose: Enable verbose output
            generate_html: Whether to generate HTML viewer
            demo_slug: If set, sync static demo viewer to demo/repos/<slug>/
        """
        self.repo_path = repo_path
        self.output_dir = output_dir
        self.config = config
        self.verbose = verbose
        self.generate_html = generate_html
        self.demo_slug = (demo_slug.strip() if demo_slug else None) or None
        self.progress_tracker = ProgressTracker(total_stages=5, verbose=verbose)
        self.job = DocumentationJob()
        
        # Setup job metadata
        self.job.repository_path = str(repo_path)
        self.job.repository_name = repo_path.name
        self.job.output_directory = str(output_dir)
        self.job.llm_config = LLMConfig(
            main_model=config.get('main_model', ''),
            cluster_model=config.get('cluster_model', ''),
            base_url=config.get('base_url', '')
        )
        
        # Configure backend logging
        self._configure_backend_logging()
    
    def _configure_backend_logging(self):
        """Configure backend logger for CLI use with colored output."""
        from codewiki.src.be.dependency_analyzer.utils.logging_config import ColoredFormatter
        
        # Get backend logger (parent of all backend modules)
        backend_logger = logging.getLogger('codewiki.src.be')
        
        # Get CLI logger (for html_generator and other CLI modules)
        cli_logger = logging.getLogger('codewiki.cli')
        
        # Remove existing handlers to avoid duplicates
        backend_logger.handlers.clear()
        cli_logger.handlers.clear()
        
        if self.verbose:
            # In verbose mode, show INFO and above
            backend_logger.setLevel(logging.INFO)
            cli_logger.setLevel(logging.INFO)
            
            # Create console handler with formatting
            console_handler = logging.StreamHandler(sys.stdout)
            console_handler.setLevel(logging.INFO)
            
            # Use colored formatter for better readability
            colored_formatter = ColoredFormatter()
            console_handler.setFormatter(colored_formatter)
            
            # Add handler to both loggers
            backend_logger.addHandler(console_handler)
            cli_logger.addHandler(console_handler)
        else:
            # In non-verbose mode, suppress backend logs (use WARNING level to hide INFO/DEBUG)
            backend_logger.setLevel(logging.WARNING)
            cli_logger.setLevel(logging.WARNING)
            
            # Create console handler for warnings and errors only
            console_handler = logging.StreamHandler(sys.stderr)
            console_handler.setLevel(logging.WARNING)
            
            # Use colored formatter even for warnings/errors
            colored_formatter = ColoredFormatter()
            console_handler.setFormatter(colored_formatter)
            
            backend_logger.addHandler(console_handler)
            cli_logger.addHandler(console_handler)
        
        # Prevent propagation to root logger to avoid duplicate messages
        backend_logger.propagate = False
        cli_logger.propagate = False
    
    def generate(self) -> DocumentationJob:
        """
        Generate documentation with progress tracking.
        
        Returns:
            Completed DocumentationJob
            
        Raises:
            APIError: If LLM API call fails
        """
        self.job.start()
        start_time = time.time()
        
        try:
            # Set CLI context for backend
            set_cli_context(True)
            
            # Create backend config with CLI settings
            # Use main_model as fallback_model for OpenAI compatibility
            main_model = self.config.get('main_model')
            backend_config = BackendConfig.from_cli(
                repo_path=str(self.repo_path),
                output_dir=str(self.output_dir),
                llm_base_url=self.config.get('base_url'),
                llm_api_key=self.config.get('api_key'),
                main_model=main_model,
                cluster_model=self.config.get('cluster_model'),
                fallback_model=main_model  # Use same model for fallback
            )
            
            # Run backend documentation generation
            asyncio.run(self._run_backend_generation(backend_config))
            
            # Stage 4: HTML Generation (optional)
            if self.generate_html:
                self._run_html_generation()
            
            # Stage 5: Finalization (metadata already created by backend)
            self._finalize_job()
            
            # Complete job
            generation_time = time.time() - start_time
            self.job.complete()

            try:
                from codewiki.cli.utils.demo_viewer_sync import (
                    sync_generated_docs_to_demo_viewer,
                )

                sync_generated_docs_to_demo_viewer(
                    self.output_dir, self.demo_slug or self.repo_path.name
                )
            except Exception as e:
                _log.warning("Demo viewer sync failed (non-fatal): %s", e)

            return self.job
            
        except APIError as e:
            self.job.fail(str(e))
            raise
        except Exception as e:
            self.job.fail(str(e))
            raise
    
    async def _run_backend_generation(self, backend_config: BackendConfig):
        """Run the backend documentation generation with progress tracking."""
        import time
        stage_start = time.time()
        
        # Initialize metrics tracking
        from codewiki.src.utils.metrics import get_metrics_collector
        metrics_collector = get_metrics_collector()
        repo_name = os.path.basename(os.path.normpath(self.repo_path))
        metrics = metrics_collector.start_repo(repo_name, str(self.repo_path))
        
        # Calculate repo size and file count
        try:
            import shutil
            total_size = shutil.disk_usage(str(self.repo_path)).used
            metrics.repo_size_mb = total_size / (1024 * 1024)
            # Count code files
            code_files = []
            for ext in ['.py', '.js', '.ts', '.java', '.cpp', '.c', '.h', '.go', '.rs', '.rb', '.php', '.swift', '.kt']:
                code_files.extend(list(Path(self.repo_path).rglob(f"*{ext}")))
            code_files = [f for f in code_files if 'node_modules' not in str(f) and '.git' not in str(f)]
            metrics.total_code_files = len(code_files)
            click.echo(f"[DEBUG] Repo: {repo_name}, {len(code_files)} code files, {metrics.repo_size_mb:.2f} MB", err=True)
        except Exception as e:
            click.echo(f"[DEBUG] Error calculating repo stats: {e}", err=True)
        
        # Stage 1: Dependency Analysis
        click.echo(f"[DEBUG] [{time.time() - stage_start:.1f}s] Starting Stage 1: Dependency Analysis", err=True)
        stage_metrics = metrics.start_stage("Dependency Analysis")
        stage_1_start = time.time()
        self.progress_tracker.start_stage(1, "Dependency Analysis")
        if self.verbose:
            self.progress_tracker.update_stage(0.2, "Initializing dependency analyzer...")
        
        # Create documentation generator
        doc_generator = DocumentationGenerator(backend_config)
        
        if self.verbose:
            self.progress_tracker.update_stage(0.5, "Parsing source files...")
        click.echo(f"[DEBUG] [{time.time() - stage_1_start:.1f}s] Parsing source files...", err=True)
        
        # Build dependency graph with HARD TIMEOUT
        # TODO: Make timeout dynamic based on repo size once we have benchmark data
        # for now using 300s (5 min) to support large repos like tensorflow/pytorch
        import signal
        STAGE_1_TIMEOUT = 300  # 5 minutes - adjust based on benchmark results
        def timeout_handler(signum, frame):
            raise TimeoutError(f"Stage 1 (Dependency Analysis) timed out after {STAGE_1_TIMEOUT} seconds")
        
        signal.signal(signal.SIGALRM, timeout_handler)
        signal.alarm(STAGE_1_TIMEOUT)
        try:
            components, leaf_nodes, _reachability = doc_generator.graph_builder.build_dependency_graph()
            signal.alarm(0)  # Cancel timeout
            stage_1_duration = time.time() - stage_1_start
            self.job.statistics.total_files_analyzed = len(components)
            self.job.statistics.leaf_nodes = len(leaf_nodes)
            
            click.echo(f"[DEBUG] [{stage_1_duration:.1f}s] Stage 1 complete: {len(components)} components, {len(leaf_nodes)} leaf nodes", err=True)
            if self.verbose:
                self.progress_tracker.update_stage(1.0, f"Found {len(leaf_nodes)} leaf nodes")
        except TimeoutError as e:
            signal.alarm(0)
            stage_1_duration = time.time() - stage_1_start
            click.echo(f"[DEBUG] [{stage_1_duration:.1f}s] Stage 1 TIMEOUT: {e}", err=True)
            raise APIError(f"Dependency analysis timed out after {STAGE_1_TIMEOUT}s: {e}")
        except Exception as e:
            signal.alarm(0)
            stage_1_duration = time.time() - stage_1_start
            click.echo(f"[DEBUG] [{stage_1_duration:.1f}s] Stage 1 FAILED: {e}", err=True)
            raise APIError(f"Dependency analysis failed: {e}")
        
        self.progress_tracker.complete_stage()
        metrics.complete_stage("Dependency Analysis")
        
        # Stage 2: Module Clustering
        click.echo(f"[DEBUG] [{time.time() - stage_start:.1f}s] Starting Stage 2: Module Clustering", err=True)
        stage_metrics = metrics.start_stage("Module Clustering")
        stage_2_start = time.time()
        self.progress_tracker.start_stage(2, "Module Clustering")
        if self.verbose:
            self.progress_tracker.update_stage(0.5, "Clustering modules with LLM...")
        click.echo(f"[DEBUG] [{time.time() - stage_2_start:.1f}s] Clustering {len(leaf_nodes)} leaf nodes...", err=True)
        
        # Import clustering function
        from codewiki.src.be.cluster_modules import cluster_modules
        from codewiki.src.file_manager import file_manager
        from codewiki.src.config import FIRST_MODULE_TREE_FILENAME, MODULE_TREE_FILENAME
        
        working_dir = str(self.output_dir.absolute())
        file_manager.ensure_directory(working_dir)
        first_module_tree_path = os.path.join(working_dir, FIRST_MODULE_TREE_FILENAME)
        module_tree_path = os.path.join(working_dir, MODULE_TREE_FILENAME)
        
        try:
            if os.path.exists(first_module_tree_path):
                click.echo(f"[DEBUG] [{time.time() - stage_2_start:.1f}s] Using cached module tree", err=True)
                module_tree = file_manager.load_json(first_module_tree_path)
            else:
                click.echo(f"[DEBUG] [{time.time() - stage_2_start:.1f}s] Calling cluster_modules (this may take a while)...", err=True)
                click.echo(f"[DEBUG] Input: {len(leaf_nodes)} leaf nodes, {len(components)} total components", err=True)
                # No artificial timeout - let clustering complete based on context window
                # The dynamic algorithm fits nodes to context window, LLM determines processing time
                module_tree = cluster_modules(leaf_nodes, components, backend_config)
                file_manager.save_json(module_tree, first_module_tree_path)
            
            stage_2_duration = time.time() - stage_2_start
            file_manager.save_json(module_tree, module_tree_path)
            self.job.module_count = len(module_tree)
            
            click.echo(f"[DEBUG] [{stage_2_duration:.1f}s] Stage 2 complete: {len(module_tree)} modules created", err=True)
            if self.verbose:
                self.progress_tracker.update_stage(1.0, f"Created {len(module_tree)} modules")
        except Exception as e:
            stage_2_duration = time.time() - stage_2_start
            click.echo(f"[DEBUG] [{stage_2_duration:.1f}s] Stage 2 FAILED: {e}", err=True)
            import traceback
            click.echo(f"[DEBUG] Traceback: {traceback.format_exc()}", err=True)
            raise APIError(f"Module clustering failed: {e}")
        
        self.progress_tracker.complete_stage()
        metrics.complete_stage("Module Clustering")
        
        # Track first overview generation (low latency)
        overview_path = os.path.join(working_dir, "overview.md")
        if os.path.exists(overview_path):
            metrics.record_first_overview(overview_path)
        
        # DEBUG: Show Stage 2 summary (but continue to Stage 3)
        click.echo(f"\n[DEBUG] ===== STAGE 2 COMPLETE =====", err=True)
        click.echo(f"[DEBUG] Module count: {len(module_tree)}", err=True)
        click.echo(f"[DEBUG] Total duration so far: {time.time() - stage_start:.1f}s", err=True)
        if len(module_tree) > 0:
            click.echo(f"[DEBUG] Module names: {list(module_tree.keys())[:10]}", err=True)
        click.echo(f"[DEBUG] Continuing to Stage 3: Documentation Generation...", err=True)
        
        # Stage 3: Documentation Generation
        click.echo(f"[DEBUG] [{time.time() - stage_start:.1f}s] Starting Stage 3: Documentation Generation", err=True)
        stage_metrics = metrics.start_stage("Documentation Generation")
        stage_3_start = time.time()
        self.progress_tracker.start_stage(3, "Documentation Generation")
        if self.verbose:
            self.progress_tracker.update_stage(0.1, "Generating module documentation...")
        click.echo(f"[DEBUG] [{time.time() - stage_3_start:.1f}s] Generating docs for {len(module_tree)} modules...", err=True)
        
        try:
            # Run the actual documentation generation
            click.echo(f"[DEBUG] [{time.time() - stage_3_start:.1f}s] Calling generate_module_documentation...", err=True)
            await doc_generator.generate_module_documentation(components, leaf_nodes)
            
            stage_3_duration = time.time() - stage_3_start
            click.echo(f"[DEBUG] [{stage_3_duration:.1f}s] Module documentation complete", err=True)
            
            if self.verbose:
                self.progress_tracker.update_stage(0.9, "Creating repository overview...")
            
            # Create metadata
            doc_generator.create_documentation_metadata(working_dir, components, len(leaf_nodes))

            # Stage 4.5: same as DocumentationGenerator.run — sync_issues.json + measurement_summary
            try:
                from codewiki.src.be.doc_file_sync import run_full_sync

                repo_name = os.path.basename(os.path.normpath(self.repo_path))
                sync_result = run_full_sync(
                    working_dir, components, repo_name=repo_name, config=backend_config
                )
                click.echo(
                    f"[DEBUG] Doc sync wrote sync_issues.json (issues={sync_result.get('issues', 0)})",
                    err=True,
                )
            except Exception as sync_err:
                _log.warning("Doc sync failed (non-critical): %s", sync_err)
            
            # Collect generated files (after sync may add placeholders)
            md_files = []
            for file_path in os.listdir(working_dir):
                if file_path.endswith('.md') or file_path.endswith('.json'):
                    self.job.files_generated.append(file_path)
                    if file_path.endswith('.md'):
                        stage_metrics.files_created += 1
                        stage_metrics.files_created_list.append(file_path)
                        md_files.append(file_path)
            
            click.echo(f"[DEBUG] [{time.time() - stage_3_start:.1f}s] Generated {len(md_files)} markdown files: {', '.join(md_files[:5])}{'...' if len(md_files) > 5 else ''}", err=True)
            
            # Track first overview if created
            overview_path = os.path.join(working_dir, "overview.md")
            if os.path.exists(overview_path) and metrics.time_to_first_overview is None:
                metrics.record_first_overview(overview_path)
                click.echo(f"[DEBUG] First overview created at {metrics.time_to_first_overview:.1f}s", err=True)
            
        except Exception as e:
            stage_3_duration = time.time() - stage_3_start
            click.echo(f"[DEBUG] [{stage_3_duration:.1f}s] Stage 3 FAILED: {e}", err=True)
            import traceback
            click.echo(f"[DEBUG] Traceback: {traceback.format_exc()}", err=True)
            raise APIError(f"Documentation generation failed: {e}")
        
        total_duration = time.time() - stage_start
        click.echo(f"[DEBUG] [{total_duration:.1f}s] ALL STAGES COMPLETE", err=True)
        self.progress_tracker.complete_stage()
        metrics.complete_stage("Documentation Generation")
        
        # Finalize metrics
        metrics.finalize()
        
        # Save metrics
        metrics_output = Path(working_dir) / "metrics.json"
        metrics.save(metrics_output)
    
    def _run_html_generation(self):
        """Run HTML generation stage."""
        logger = logging.getLogger(__name__)
        stage_start = time.time()
        
        logger.info(f"[STAGE 5: HTML GENERATION] Starting HTML generation")
        logger.info(f"[STAGE 5] Output directory: {self.output_dir}")
        logger.info(f"[STAGE 5] Repository path: {self.repo_path}")
        
        self.progress_tracker.start_stage(4, "HTML Generation")
        
        try:
            from codewiki.cli.html_generator import HTMLGenerator
            
            logger.info(f"[STAGE 5] Creating HTMLGenerator...")
            html_generator_start = time.time()
            html_generator = HTMLGenerator()
            html_generator_duration = time.time() - html_generator_start
            logger.info(f"[STAGE 5] HTMLGenerator created in {html_generator_duration:.3f}s")
            logger.info(f"[STAGE 5] Template directory: {html_generator.template_dir}")
            
            if self.verbose:
                self.progress_tracker.update_stage(0.3, "Loading module tree and metadata...")
            
            logger.info(f"[STAGE 5] Detecting repository info...")
            repo_info_start = time.time()
            try:
                repo_info = html_generator.detect_repository_info(self.repo_path)
                repo_info_duration = time.time() - repo_info_start
                logger.info(f"[STAGE 5] Repository info detected in {repo_info_duration:.3f}s")
                logger.info(f"[STAGE 5]   - Name: {repo_info.get('name', 'N/A')}")
                logger.info(f"[STAGE 5]   - URL: {repo_info.get('url', 'N/A')}")
                logger.info(f"[STAGE 5]   - GitHub Pages URL: {repo_info.get('github_pages_url', 'N/A')}")
            except Exception as e:
                repo_info_duration = time.time() - repo_info_start
                logger.error(f"[STAGE 5] Repository info detection FAILED after {repo_info_duration:.3f}s: {type(e).__name__}: {str(e)}")
                import traceback
                logger.error(f"[STAGE 5] Traceback: {traceback.format_exc()}")
                raise
            
            # Generate HTML with auto-loading of module_tree and metadata from docs_dir
            output_path = self.output_dir / "index.html"
            logger.info(f"[STAGE 5] Starting HTML generation...")
            logger.info(f"[STAGE 5]   - Output path: {output_path}")
            logger.info(f"[STAGE 5]   - Title: {repo_info.get('name', 'N/A')}")
            logger.info(f"[STAGE 5]   - Docs directory: {self.output_dir}")
            
            html_gen_start = time.time()
            try:
                html_generator.generate(
                    output_path=output_path,
                    title=repo_info['name'],
                    repository_url=repo_info['url'],
                    github_pages_url=repo_info['github_pages_url'],
                    docs_dir=self.output_dir  # Auto-load module_tree and metadata from here
                )
                html_gen_duration = time.time() - html_gen_start
                logger.info(f"[STAGE 5] HTML generation completed in {html_gen_duration:.1f}s")
                
                # Verify output file was created
                if output_path.exists():
                    file_size = output_path.stat().st_size
                    logger.info(f"[STAGE 5] index.html created successfully: {file_size} bytes")
                else:
                    logger.error(f"[STAGE 5] CRITICAL: index.html was not created at {output_path}")
                    raise FileNotFoundError(f"HTML file was not created: {output_path}")
                
            except Exception as e:
                import traceback
                html_gen_duration = time.time() - html_gen_start
                exc_traceback = traceback.format_exc()
                logger.error(f"[STAGE 5] HTML generation FAILED after {html_gen_duration:.1f}s: {type(e).__name__}: {str(e)}")
                logger.error(f"[STAGE 5]   - Output path: {output_path}")
                logger.error(f"[STAGE 5]   - Docs directory: {self.output_dir}")
                logger.error(f"[STAGE 5] Traceback: {exc_traceback}")
                raise
            
            self.job.files_generated.append("index.html")
            
            if self.verbose:
                self.progress_tracker.update_stage(1.0, "Generated index.html")
            
            stage_duration = time.time() - stage_start
            logger.info(f"[STAGE 5: HTML GENERATION] COMPLETE in {stage_duration:.1f}s")
            self.progress_tracker.complete_stage()
            
        except Exception as e:
            import traceback
            stage_duration = time.time() - stage_start
            exc_traceback = traceback.format_exc()
            logger.error(f"[STAGE 5: HTML GENERATION] FAILED after {stage_duration:.1f}s: {type(e).__name__}: {str(e)}")
            logger.error(f"[STAGE 5] Output directory: {self.output_dir}")
            logger.error(f"[STAGE 5] Repository path: {self.repo_path}")
            logger.error(f"[STAGE 5] Full traceback:\n{exc_traceback}")
            click.echo(f"[ERROR] HTML generation failed: {e}", err=True)
            raise
    
    def _finalize_job(self):
        """Finalize the job (metadata already created by backend)."""
        # Just verify metadata exists
        metadata_path = self.output_dir / "metadata.json"
        if not metadata_path.exists():
            # Create our own if backend didn't
            with open(metadata_path, 'w') as f:
                f.write(self.job.to_json())

