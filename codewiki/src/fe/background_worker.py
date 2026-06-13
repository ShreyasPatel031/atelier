#!/usr/bin/env python3
"""
Background worker for processing documentation generation jobs.

Documentation is produced by invoking the same entry point as the terminal:
``codewiki generate`` (see ``codewiki.cli.commands.generate``). Requirements:

- ``codewiki`` on ``PATH`` (install the package), or the worker falls back to
  ``python -m codewiki.cli.main generate``.
- ``~/.codewiki/config.json`` populated at least once via
  ``codewiki config set --base-url ... --main-model ... --cluster-model ...``.
  The API key may still come from ``GEMINI_API_KEY`` / ``LLM_API_KEY`` in the
  process environment (see ``codewiki.cli.config_manager.ConfigManager``).
"""

import logging
import os
import shutil
import subprocess
import sys
import threading
import time
from datetime import datetime
from pathlib import Path
from queue import Empty, Queue
from typing import Dict

from codewiki.src.config import MAIN_MODEL
from .models import JobStatus
from .cache_manager import CacheManager
from .github_processor import GitHubRepoProcessor
from .config import WebAppConfig
from codewiki.src.file_manager import file_manager

logger = logging.getLogger(__name__)


def resolve_codewiki_cli() -> list:
    """
    How to invoke the CodeWiki CLI, matching what users run in a terminal.
    Returns a argv prefix, e.g. ['codewiki'] or [sys.executable, '-m', 'codewiki.cli.main'].
    """
    codewiki_exe = shutil.which("codewiki")
    if codewiki_exe:
        return [codewiki_exe]
    return [sys.executable, "-m", "codewiki.cli.main"]


def _read_log_tail(log_path: str, max_bytes: int = 4096) -> str:
    """Return the tail of a log file as text (best-effort)."""
    try:
        with open(log_path, "rb") as f:
            f.seek(0, os.SEEK_END)
            size = f.tell()
            if size <= max_bytes:
                f.seek(0)
            else:
                f.seek(-max_bytes, os.SEEK_END)
            raw = f.read()
        return raw.decode("utf-8", errors="replace").strip()
    except OSError:
        return ""


def _refresh_progress_from_artifacts(job: JobStatus, docs_dir: str, log_path: str) -> None:
    """Update job.generation_stage and job.progress from output dir + log tail."""
    has_module_tree = os.path.exists(os.path.join(docs_dir, "module_tree.json"))
    has_overview = os.path.exists(os.path.join(docs_dir, "overview.md"))
    has_report = os.path.exists(os.path.join(docs_dir, "generation_report.json"))
    has_metrics = os.path.exists(os.path.join(docs_dir, "generation_metrics.json")) or os.path.exists(
        os.path.join(docs_dir, "metrics.json")
    )
    if has_metrics or has_report:
        job.generation_stage = 3
    elif has_overview:
        job.generation_stage = 3
    elif has_module_tree:
        job.generation_stage = 2
    else:
        job.generation_stage = 1
    last = _read_log_tail(log_path, max_bytes=400)
    if last:
        lines = last.splitlines()
        if lines:
            job.progress = lines[-1][:200]


class BackgroundWorker:
    """Background worker for processing documentation generation jobs."""
    
    def __init__(self, cache_manager: CacheManager, temp_dir: str = None):
        self.cache_manager = cache_manager
        self.temp_dir = temp_dir or WebAppConfig.TEMP_DIR
        self.running = False
        self.processing_queue = Queue(maxsize=WebAppConfig.QUEUE_SIZE)
        self.job_status: Dict[str, JobStatus] = {}
        self.jobs_file = Path(WebAppConfig.CACHE_DIR) / "jobs.json"
        self.load_job_statuses()
    
    def start(self):
        """Start the background worker thread."""
        if not self.running:
            self.running = True
            thread = threading.Thread(target=self._worker_loop, daemon=True)
            thread.start()
            logger.info("Background worker started")
    
    def stop(self):
        """Stop the background worker."""
        self.running = False
    
    def add_job(self, job_id: str, job: JobStatus):
        """Add a job to the processing queue."""
        self.job_status[job_id] = job
        self.processing_queue.put(job_id)
    
    def get_job_status(self, job_id: str) -> JobStatus:
        """Get job status by ID."""
        return self.job_status.get(job_id)
    
    def get_all_jobs(self) -> Dict[str, JobStatus]:
        """Get all job statuses."""
        return self.job_status
    
    def load_job_statuses(self):
        """Load job statuses from disk."""
        if not self.jobs_file.exists():
            # Try to reconstruct from cache if no job file exists
            self._reconstruct_jobs_from_cache()
            return
        
        try:
            data = file_manager.load_json(self.jobs_file)
                
            for job_id, job_data in data.items():
                # Only load completed jobs to avoid inconsistent state
                if job_data.get('status') == 'completed':
                    self.job_status[job_id] = JobStatus(
                        job_id=job_data['job_id'],
                        repo_url=job_data['repo_url'],
                        status=job_data['status'],
                        created_at=datetime.fromisoformat(job_data['created_at']),
                        started_at=datetime.fromisoformat(job_data['started_at']) if job_data.get('started_at') else None,
                        completed_at=datetime.fromisoformat(job_data['completed_at']) if job_data.get('completed_at') else None,
                        error_message=job_data.get('error_message'),
                        progress=job_data.get('progress', ''),
                        docs_path=job_data.get('docs_path'),
                        main_model=job_data.get('main_model'),
                        commit_id=job_data.get('commit_id'),
                        generation_stage=job_data.get('generation_stage', 3),
                    )
            logger.info(
                "Loaded %s completed jobs from disk",
                len([j for j in self.job_status.values() if j.status == "completed"]),
            )
        except Exception as e:
            logger.warning("Error loading job statuses: %s", e)
    
    def _reconstruct_jobs_from_cache(self):
        """Reconstruct job statuses from cache entries for backward compatibility."""
        try:
            cache_entries = self.cache_manager.cache_index
            reconstructed_count = 0
            
            for repo_hash, cache_entry in cache_entries.items():
                # Extract repo info to create job_id
                from .github_processor import GitHubRepoProcessor
                try:
                    repo_info = GitHubRepoProcessor.get_repo_info(cache_entry.repo_url)
                    job_id = repo_info['full_name'].replace('/', '--')
                    
                    # Only add if job doesn't already exist
                    if job_id not in self.job_status:
                        self.job_status[job_id] = JobStatus(
                            job_id=job_id,
                            repo_url=cache_entry.repo_url,
                            status='completed',
                            created_at=cache_entry.created_at,
                            completed_at=cache_entry.created_at,
                            docs_path=cache_entry.docs_path,
                            progress="Reconstructed from cache",
                            generation_stage=3,
                        )
                        reconstructed_count += 1
                except Exception as e:
                    logger.warning("Failed to reconstruct job for %s: %s", cache_entry.repo_url, e)
            
            if reconstructed_count > 0:
                logger.info("Reconstructed %s job statuses from cache", reconstructed_count)
                self.save_job_statuses()
                
        except Exception as e:
            logger.warning("Error reconstructing jobs from cache: %s", e)
    
    def save_job_statuses(self):
        """Save job statuses to disk."""
        try:
            # Ensure cache directory exists
            self.jobs_file.parent.mkdir(parents=True, exist_ok=True)
            
            data = {}
            for job_id, job in self.job_status.items():
                data[job_id] = {
                    'job_id': job.job_id,
                    'repo_url': job.repo_url,
                    'status': job.status,
                    'created_at': job.created_at.isoformat(),
                    'started_at': job.started_at.isoformat() if job.started_at else None,
                    'completed_at': job.completed_at.isoformat() if job.completed_at else None,
                    'error_message': job.error_message,
                    'progress': job.progress,
                    'docs_path': job.docs_path,
                    'main_model': job.main_model,
                    'commit_id': job.commit_id,
                    'generation_stage': job.generation_stage,
                }
            
            file_manager.save_json(data, self.jobs_file)
        except Exception as e:
            logger.warning("Error saving job statuses: %s", e)
    
    def _worker_loop(self):
        """Main worker loop."""
        while self.running:
            try:
                # Block with timeout — do not use Queue.empty(); it is not reliable
                # across threads and can leave jobs stuck while the worker sleeps.
                job_id = self.processing_queue.get(timeout=1)
                self._process_job(job_id)
            except Empty:
                continue
            except Exception as e:
                logger.exception("Worker error: %s", e)
                time.sleep(1)
    
    def _process_job(self, job_id: str):
        """Process a single documentation generation job."""
        if job_id not in self.job_status:
            logger.warning(f"[STAGE 0] Job {job_id} not found in job_status")
            return
        
        job = self.job_status[job_id]
        stage_start = time.time()
        
        logger.info(f"[STAGE 0: REPOSITORY SETUP] Starting job {job_id}")
        logger.info(f"[STAGE 0] Job details: repo_url={job.repo_url}, commit_id={job.commit_id}")
        
        try:
            # Update job status (reset stage for UI pipeline; e.g. regenerate reuses same job_id)
            job.status = "processing"
            job.started_at = datetime.now()
            job.generation_stage = 0
            job.progress = "Starting repository clone..."
            job.error_message = None
            job.docs_path = None
            job.main_model = MAIN_MODEL
            
            # STAGE 0.1: Check cache first (skip when user requested full regeneration)
            skip_cache = getattr(job, "force_regenerate", False)
            logger.info(
                "[STAGE 0.1: CACHE CHECK] Checking cache for %s (force_regenerate=%s)",
                job.repo_url,
                skip_cache,
            )
            cache_check_start = time.time()
            try:
                cached_docs = (
                    None if skip_cache else self.cache_manager.get_cached_docs(job.repo_url)
                )
                if skip_cache:
                    logger.info("[STAGE 0.1] Cache lookup skipped (force_regenerate=True)")
                cache_check_duration = time.time() - cache_check_start
                
                if cached_docs:
                    cache_path = Path(cached_docs)
                    logger.info(f"[STAGE 0.1] Cache lookup completed in {cache_check_duration:.1f}s")
                    logger.info(f"[STAGE 0.1] Cache path: {cached_docs}")
                    logger.info(f"[STAGE 0.1] Cache path exists: {cache_path.exists()}")
                    
                    if cache_path.exists():
                        cache_size = sum(f.stat().st_size for f in cache_path.rglob('*') if f.is_file()) if cache_path.is_dir() else cache_path.stat().st_size if cache_path.is_file() else 0
                        logger.info(f"[STAGE 0.1] Cache size: {cache_size} bytes")
                        logger.info(f"[STAGE 0.1] Cache hit - using cached documentation")
                        
                        job.status = 'completed'
                        job.completed_at = datetime.now()
                        job.docs_path = cached_docs
                        job.progress = "Documentation retrieved from cache"
                        job.generation_stage = 3
                        if not job.main_model:
                            job.main_model = MAIN_MODEL

                        try:
                            from codewiki.cli.utils.demo_viewer_sync import (
                                repo_slug_from_url,
                                sync_generated_docs_to_demo_viewer,
                            )

                            sync_generated_docs_to_demo_viewer(
                                cache_path,
                                repo_slug_from_url(job.repo_url),
                            )
                        except Exception as e:
                            logger.warning("Demo viewer sync failed (non-fatal): %s", e)
                        
                        self.save_job_statuses()
                        logger.info(f"[STAGE 0.1] Job {job_id} completed from cache")
                        return
                    else:
                        logger.warning(f"[STAGE 0.1] Cache path exists but file/directory not found: {cached_docs}")
                else:
                    logger.info(f"[STAGE 0.1] Cache lookup completed in {cache_check_duration:.1f}s")
                    logger.info(f"[STAGE 0.1] Cache miss - no cached documentation found")
            except Exception as e:
                cache_check_duration = time.time() - cache_check_start
                logger.error(f"[STAGE 0.1] Cache check FAILED after {cache_check_duration:.1f}s: {type(e).__name__}: {str(e)}")
                import traceback
                logger.error(f"[STAGE 0.1] Traceback: {traceback.format_exc()}")
                raise
            
            # STAGE 0.2: Get repo info and parse URL
            logger.info(f"[STAGE 0.2: REPO INFO] Parsing repository URL: {job.repo_url}")
            repo_info_start = time.time()
            try:
                if not GitHubRepoProcessor.is_valid_github_url(job.repo_url):
                    logger.error(f"[STAGE 0.2] Invalid GitHub URL: {job.repo_url}")
                    raise ValueError(f"Invalid GitHub URL: {job.repo_url}")
                
                repo_info = GitHubRepoProcessor.get_repo_info(job.repo_url)
                repo_info_duration = time.time() - repo_info_start
                
                logger.info(f"[STAGE 0.2] Repo info parsed in {repo_info_duration:.1f}s")
                logger.info(f"[STAGE 0.2] Parsed URL components:")
                logger.info(f"[STAGE 0.2]   - Owner: {repo_info.get('owner', 'N/A')}")
                logger.info(f"[STAGE 0.2]   - Repo: {repo_info.get('repo', 'N/A')}")
                logger.info(f"[STAGE 0.2]   - Full name: {repo_info.get('full_name', 'N/A')}")
                logger.info(f"[STAGE 0.2]   - Clone URL: {repo_info.get('clone_url', 'N/A')}")
            except Exception as e:
                repo_info_duration = time.time() - repo_info_start
                logger.error(f"[STAGE 0.2] Repo info parsing FAILED after {repo_info_duration:.1f}s: {type(e).__name__}: {str(e)}")
                import traceback
                logger.error(f"[STAGE 0.2] Traceback: {traceback.format_exc()}")
                raise
            
            # STAGE 0.3: Clone repository or update an existing clone (see CODEWIKI_DELETE_TEMP_REPO_AFTER_SUCCESS)
            temp_repo_dir = os.path.join(self.temp_dir, job_id)
            has_git = os.path.isdir(os.path.join(temp_repo_dir, ".git"))
            logger.info(f"[STAGE 0.3: CLONE/UPDATE] {repo_info['clone_url']}")
            logger.info(f"[STAGE 0.3] Target directory: {temp_repo_dir}")
            logger.info(f"[STAGE 0.3] Reuse: existing .git = {has_git}, delete after success = {WebAppConfig.DELETE_TEMP_REPO_AFTER_SUCCESS}")
            logger.info(f"[STAGE 0.3] Commit ID: {job.commit_id if job.commit_id else 'HEAD (shallow clone)'}")
            logger.info(f"[STAGE 0.3] Clone timeout: {WebAppConfig.CLONE_TIMEOUT}s")
            logger.info(f"[STAGE 0.3] Clone depth: {WebAppConfig.CLONE_DEPTH if not job.commit_id else 'full'}")
            
            clone_start = time.time()
            clone_method = "clone"
            if has_git and GitHubRepoProcessor.sync_existing_clone(
                repo_info["clone_url"], temp_repo_dir, job.commit_id
            ):
                clone_method = "fetch"
                job.progress = f"Updated local copy (git fetch): {repo_info['full_name']}…"
                clone_success = True
            else:
                if has_git:
                    logger.info("[STAGE 0.3] Re-sync failed or no usable clone; removing and cloning fresh: %s", temp_repo_dir)
                    shutil.rmtree(temp_repo_dir, ignore_errors=True)
                job.progress = f"Cloning repository {repo_info['full_name']}…"
                clone_success = GitHubRepoProcessor.clone_repository(
                    repo_info["clone_url"], temp_repo_dir, job.commit_id
                )
            clone_duration = time.time() - clone_start
            self.save_job_statuses()

            if not clone_success:
                logger.error(
                    "[STAGE 0.3] %s FAILED after %.1fs",
                    clone_method,
                    clone_duration,
                )
                logger.error(f"[STAGE 0.3] Clone URL: {repo_info['clone_url']}")
                logger.error(f"[STAGE 0.3] Target directory: {temp_repo_dir}")
                logger.error(f"[STAGE 0.3] Commit ID: {job.commit_id}")
                raise Exception("Failed to clone or update repository")

            if not os.path.exists(temp_repo_dir):
                raise Exception("Repository path missing after clone or update")
            if not os.path.isdir(os.path.join(temp_repo_dir, ".git")):
                raise Exception("No .git after clone or update")

            repo_size = sum(
                f.stat().st_size for f in Path(temp_repo_dir).rglob("*") if f.is_file()
            )
            file_count = len(list(Path(temp_repo_dir).rglob("*")))
            logger.info(
                "[STAGE 0.3] %s complete in %.1fs (size=%s bytes, tree entries=%s)",
                clone_method,
                clone_duration,
                repo_size,
                file_count,
            )
            
            # STAGE 0.4: Invoke CLI (same pipeline as terminal `codewiki generate`)
            logger.info("[STAGE 0.4: CLI GENERATE] Invoking codewiki generate")
            logger.info("[STAGE 0.4] Repo path: %s", temp_repo_dir)
            if not os.path.isdir(temp_repo_dir):
                raise ValueError(f"Cloned repository path is not a directory: {temp_repo_dir}")

            docs_dir = os.path.abspath(os.path.join("output", "docs", f"{job_id}-docs"))
            # Wipe any prior run's artifacts so the poll loop cannot read stale module_tree
            # / metrics / overview before this CLI run writes fresh files (fixes "Regenerate"
            # still showing all steps as completed).
            if os.path.isdir(docs_dir):
                shutil.rmtree(docs_dir, ignore_errors=True)
            os.makedirs(docs_dir, exist_ok=True)
            log_path = os.path.join(docs_dir, "codewiki_generate.log")
            job.generation_stage = 1

            base = resolve_codewiki_cli()
            if len(base) > 1:
                logger.warning(
                    "codewiki executable not on PATH; using %s -m codewiki.cli.main",
                    sys.executable,
                )
            cmd = base + ["generate"]
            cmd.extend(
                [
                    "--output",
                    docs_dir,
                    "--force",
                    "--no-cache",
                    "-v",
                    "--demo-slug",
                    repo_info.get("repo") or "repo",
                ]
            )

            job.progress = "Running codewiki generate..."
            self.save_job_statuses()

            logger.info("[STAGE 0.4] Command: %s", " ".join(cmd))
            logger.info("[STAGE 0.4] cwd=%s log=%s", temp_repo_dir, log_path)
            logger.info("[STAGE 0] Commit ID: %s", job.commit_id)

            doc_gen_start = time.time()
            env = os.environ.copy()
            with open(log_path, "wb") as logf:
                proc = subprocess.Popen(
                    cmd,
                    cwd=temp_repo_dir,
                    env=env,
                    stdout=logf,
                    stderr=subprocess.STDOUT,
                    start_new_session=True,
                )
                while proc.poll() is None:
                    _refresh_progress_from_artifacts(job, docs_dir, log_path)
                    self.save_job_statuses()
                    time.sleep(2)
                rc = proc.returncode

            _refresh_progress_from_artifacts(job, docs_dir, log_path)
            self.save_job_statuses()

            if rc != 0:
                tail = _read_log_tail(log_path, max_bytes=4096)
                raise RuntimeError(
                    f"codewiki generate exited with code {rc}. Log: {log_path}\n--- log tail ---\n{tail}"
                )

            doc_gen_duration = time.time() - doc_gen_start
            logger.info(
                "[STAGE 0.4] Documentation generation (CLI) completed in %.1fs",
                doc_gen_duration,
            )
            phase_duration = time.time() - stage_start
            logger.info(
                "[STAGE 0] Clone + codewiki generate COMPLETE in %.1fs",
                phase_duration,
            )

            docs_path = docs_dir

            # Cache the results (demo viewer sync is done inside CLIDocumentationGenerator.generate)
            logger.info("[STAGE 0] Caching documentation results...")

            try:
                cache_start = time.time()
                self.cache_manager.add_to_cache(job.repo_url, docs_path)
                cache_duration = time.time() - cache_start
                logger.info("[STAGE 0] Results cached in %.3fs", cache_duration)
                logger.info("[STAGE 0] Cache path: %s", docs_path)
            except Exception as e:
                logger.error(
                    "[STAGE 0] Failed to cache results: %s: %s",
                    type(e).__name__,
                    str(e),
                )

            # Update job status
            job.status = 'completed'
            job.completed_at = datetime.now()
            job.docs_path = docs_path
            job.generation_stage = 3
            job.progress = "Documentation generation completed"
            
            # Save job status to disk
            try:
                self.save_job_statuses()
                logger.info(f"[STAGE 0] Job status saved to disk")
            except Exception as e:
                logger.error(f"[STAGE 0] Failed to save job status: {type(e).__name__}: {str(e)}")
                # Non-critical, continue
            
            total_duration = time.time() - stage_start
            logger.info(f"[STAGE 0] Job {job_id} COMPLETED successfully in {total_duration:.1f}s")
            logger.info("Job %s: Documentation generated successfully", job_id)
            
        except Exception as e:
            total_duration = time.time() - stage_start if 'stage_start' in locals() else 0
            error_type = type(e).__name__
            error_msg = str(e)
            
            # Update job status with error
            job.status = 'failed'
            job.completed_at = datetime.now()
            job.error_message = error_msg
            job.progress = f"Failed: {error_msg}"
            
            logger.error(f"[STAGE 0] Job {job_id} FAILED after {total_duration:.1f}s")
            logger.error(f"[STAGE 0] Error type: {error_type}")
            logger.error(f"[STAGE 0] Error message: {error_msg}")
            logger.error(f"[STAGE 0] Job status updated to 'failed'")
            
            # Try to save job status even on failure
            try:
                self.save_job_statuses()
                logger.info(f"[STAGE 0] Failed job status saved to disk")
            except Exception as save_error:
                logger.error(f"[STAGE 0] Failed to save failed job status: {type(save_error).__name__}: {str(save_error)}")
            
            import traceback
            logger.error(f"[STAGE 0] Full traceback:\n{traceback.format_exc()}")
            logger.error("Job %s: Failed with error: %s", job_id, e)
        
        finally:
            # Optional cleanup: default is to keep output/temp/<job_id> so the next run can
            # git fetch instead of cloning. Set CODEWIKI_DELETE_TEMP_REPO_AFTER_SUCCESS=1 to
            # remove the clone after a successful job to save disk.
            should_delete_temp = (
                "temp_repo_dir" in locals()
                and os.path.exists(temp_repo_dir)
                and WebAppConfig.DELETE_TEMP_REPO_AFTER_SUCCESS
                and job.status == "completed"
            )
            cleanup_start = time.time()
            if should_delete_temp:
                try:
                    logger.info("[STAGE 0] Deleting temp repository (CODEWIKI_DELETE_TEMP_REPO_AFTER_SUCCESS=1): %s", temp_repo_dir)
                    shutil.rmtree(temp_repo_dir, ignore_errors=True)
                    logger.info(
                        "[STAGE 0] Temp cleanup done in %.3fs",
                        time.time() - cleanup_start,
                    )
                except OSError as e:
                    logger.warning("Failed to remove temp directory: %s", e)
            elif "temp_repo_dir" in locals() and os.path.exists(temp_repo_dir):
                logger.info(
                    "[STAGE 0] Keeping temp clone for reuse: %s (set CODEWIKI_DELETE_TEMP_REPO_AFTER_SUCCESS=1 to delete after success)",
                    temp_repo_dir,
                )
            elif "temp_repo_dir" not in locals():
                logger.info("[STAGE 0] No temporary directory to clean up (not created)")
            else:
                logger.info(
                    "[STAGE 0] No temp directory to keep or delete (path missing): %s",
                    temp_repo_dir,
                )