#!/usr/bin/env python3
"""
CodeWiki Web Application

A web interface for users to submit GitHub repositories for documentation generation.
Features:
- Simple web form for GitHub repo URL input
- Background processing queue
- Cache system for generated documentation
- Job status tracking
"""

import argparse
import logging
import os
import subprocess
import time
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request, Form, HTTPException
from fastapi.responses import HTMLResponse, FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List, Any, Dict

from .cache_manager import CacheManager
from .background_worker import BackgroundWorker, resolve_codewiki_cli
from .routes import WebRoutes
from .config import WebAppConfig

# atelier/demo — interactive viewer (index.html, viewer-debug.js)
_DEMO_ROOT = Path(__file__).resolve().parent.parent.parent.parent / "demo"


# Shared app components (must exist before FastAPI so lifespan can start the worker)
cache_manager = CacheManager(
    cache_dir=WebAppConfig.CACHE_DIR,
    cache_expiry_days=WebAppConfig.CACHE_EXPIRY_DAYS,
)
background_worker = BackgroundWorker(
    cache_manager=cache_manager,
    temp_dir=WebAppConfig.TEMP_DIR,
)
web_routes = WebRoutes(background_worker=background_worker, cache_manager=cache_manager)

_log = logging.getLogger(__name__)

# Short-lived cache so page refreshes do not hammer the LLM API.
_llm_health_cache: Dict[str, Any] = {"ts": 0.0, "payload": None}
_LLM_HEALTH_TTL_SEC = 120.0


@asynccontextmanager
async def _lifespan(app: FastAPI):
    """Start queue worker in the same OS process that serves HTTP.

    Without this, ``uvicorn codewiki.src.fe.web_app:app`` (and the child process used by
    ``--reload``) never runs ``main()``, so ``background_worker.start()`` is
    never called and jobs stay ``queued`` forever.
    """
    background_worker.start()
    try:
        yield
    finally:
        background_worker.stop()


# Initialize FastAPI app
app = FastAPI(
    title="CodeWiki",
    description="Generate comprehensive documentation for any GitHub repository",
    lifespan=_lifespan,
)

# CORS: static demo on 8080 / npm run demo (9891); web app on 8000/8001
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:8080",
        "http://127.0.0.1:8080",
        "http://localhost:9891",
        "http://127.0.0.1:9891",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
        "http://localhost:8001",
        "http://127.0.0.1:8001",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routes
@app.get("/", response_class=HTMLResponse)
async def index_get(request: Request):
    """Main page with form for submitting GitHub repositories."""
    return await web_routes.index_get(request)


@app.post("/", response_class=HTMLResponse)
async def index_post(
    request: Request,
    repo_url: str = Form(...),
    commit_id: str = Form(""),
    force_regenerate: Optional[str] = Form(None),
):
    """Handle repository submission."""
    return await web_routes.index_post(request, repo_url, commit_id, force_regenerate)


@app.get("/api/job/{job_id}")
async def get_job_status(job_id: str):
    """API endpoint to get job status."""
    return await web_routes.get_job_status(job_id)


@app.get("/api/jobs")
async def list_jobs():
    """All tracked jobs (for E2E: wait until worker has no queued/processing work)."""
    return await web_routes.list_jobs()


@app.get("/api/llm-health")
def llm_health():
    """
    Same config surface the CLI uses: ``codewiki config validate --quick``
    (no backend Config / call_llm). Surfaces missing ~/.codewiki/config.json, etc.
    """
    global _llm_health_cache
    now = time.time()
    if (
        _llm_health_cache["payload"] is not None
        and now - _llm_health_cache["ts"] < _LLM_HEALTH_TTL_SEC
    ):
        return JSONResponse(_llm_health_cache["payload"])

    cmd = resolve_codewiki_cli() + ["config", "validate", "--quick"]
    try:
        p = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            env=os.environ.copy(),
            timeout=30,
        )
    except (subprocess.TimeoutExpired, OSError) as e:
        msg = str(e).strip().split("\n")[0][:400]
        _log.warning("config validate (quick) failed: %s", msg)
        payload = {
            "ok": False,
            "detail": msg or "codewiki config validate could not run.",
        }
    else:
        if p.returncode == 0:
            payload = {"ok": True, "detail": None}
        else:
            tail = (p.stdout or p.stderr or "").strip()
            lines = [ln for ln in tail.splitlines() if ln.strip()]
            last = (lines[-1] if lines else tail)[:400]
            _log.warning("config validate (quick) exit %s: %s", p.returncode, last)
            payload = {
                "ok": False,
                "detail": last
                or f"Run: codewiki config set (exit {p.returncode})",
            }

    _llm_health_cache["ts"] = now
    _llm_health_cache["payload"] = payload
    return JSONResponse(payload)


@app.get("/docs/{job_id}")
async def view_docs(job_id: str):
    """View generated documentation."""
    return await web_routes.view_docs(job_id)


@app.get("/static-docs/{job_id}/")
@app.get("/static-docs/{job_id}/{filename:path}")
async def serve_generated_docs(job_id: str, filename: str = "overview.md"):
    """Serve generated documentation files."""
    if not filename: 
        filename = "overview.md"
    return await web_routes.serve_generated_docs(job_id, filename)


@app.get("/viewer")
async def viewer_interactive():
    """Same demo viewer as localhost:8080 (interactive Mermaid, chat). Query: ?repo=<job_id>."""
    idx = _DEMO_ROOT / "index.html"
    if not idx.is_file():
        raise HTTPException(status_code=404, detail="demo/index.html not found")
    return FileResponse(idx, media_type="text/html")


@app.get("/viewer-debug.js")
async def viewer_debug_script():
    """Loaded by demo/index.html when served from /viewer."""
    p = _DEMO_ROOT / "viewer-debug.js"
    if not p.is_file():
        raise HTTPException(status_code=404, detail="viewer-debug.js not found")
    return FileResponse(p, media_type="application/javascript")


@app.get("/repos/index.json")
async def repos_index_for_viewer():
    """Dropdown list for demo viewer (completed web jobs)."""
    return await web_routes.serve_repos_index_json()


@app.get("/repos/{job_id}/{filename:path}")
async def serve_repo_raw_file(job_id: str, filename: str):
    """Raw module_tree.json / overview.md / *.md for the interactive viewer."""
    return await web_routes.serve_repo_file(job_id, filename)


# Chat API models
class DiagramSelectionPayload(BaseModel):
    """Interactive Mermaid diagram selection (data-logical-id from viewer registry), or omit for none."""

    kind: str = "none"
    logical_id: Optional[str] = None
    label: Optional[str] = None
    module_id: Optional[str] = None
    dom_ref: Optional[str] = None
    edge: Optional[Dict[str, Any]] = None


class ArchAgentChatRequest(BaseModel):
    job_id: str
    message: str
    opened_modules: Optional[List[str]] = None
    # Highlighted node/cluster/edge on the interactive diagram.
    diagram_selection: Optional[DiagramSelectionPayload] = None
    # Multi-select (⌘/Ctrl+click); when set, takes precedence over a single diagram_selection for the agent.
    diagram_selections: Optional[List[DiagramSelectionPayload]] = None
    # Message history from previous turns (returned as `history` in response). Send it back on the next request for multi-turn conversation.
    history: Optional[List[Any]] = None


class ArchAgentChatResponse(BaseModel):
    response: str
    # Full conversation history after this turn. Store and send as `history` in the next request.
    history: Optional[List[Any]] = None


@app.post("/api/arch-agent/chat", response_model=ArchAgentChatResponse)
async def arch_agent_chat(request: ArchAgentChatRequest) -> ArchAgentChatResponse:
    """Chat endpoint for the architectural agent."""
    from codewiki.src.be.architectural_agent import ArchitecturalAgentRunner

    # 1. Completed web job (authoritative docs_path on the worker)
    job = background_worker.get_job_status(request.job_id)
    if job and job.docs_path:
        wp = Path(job.docs_path)
        if wp.exists() and (wp / "module_tree.json").exists():
            docs_path = wp
        else:
            docs_path = None
    else:
        docs_path = None

    # 2. Static demo repos (e.g. crewai) — same as http.server 8080
    if docs_path is None:
        demo_docs_path = Path(__file__).resolve().parent.parent.parent.parent / "demo" / "repos" / request.job_id
        if demo_docs_path.exists() and (demo_docs_path / "module_tree.json").exists():
            docs_path = demo_docs_path

    # 3. Cache index (docs_path is full path to .../job_id-docs)
    if docs_path is None:
        try:
            repo_full = request.job_id.replace("--", "/")
            url = f"https://github.com/{repo_full}"
            cached = cache_manager.get_cached_docs(url)
            if cached:
                cp = Path(cached)
                if cp.exists() and (cp / "module_tree.json").exists():
                    docs_path = cp
        except Exception:
            pass

    if docs_path is None:
        raise HTTPException(
            status_code=404,
            detail=f"Documentation not found for job_id: {request.job_id}",
        )
    
    # Create agent runner (uses env vars for LLM config)
    agent_runner = ArchitecturalAgentRunner(str(docs_path))
    
    # Process chat message
    try:
        # Ensure 'overview' is always in opened_modules if provided
        opened_modules = request.opened_modules or ['overview']
        if 'overview' not in opened_modules:
            opened_modules = ['overview'] + opened_modules
        
        dss = None
        if request.diagram_selections:
            dss = [x.model_dump() for x in request.diagram_selections]

        # Await chat_async on the FastAPI event loop — do not use asyncio.to_thread(agent_runner.chat):
        # nested asyncio.run / thread pools break Google GenAI ("Event loop is closed").
        response, updated_history = await agent_runner.chat_async(
            message=request.message,
            opened_modules=opened_modules,
            message_history=request.history,
            diagram_selection=request.diagram_selection.model_dump() if request.diagram_selection else None,
            diagram_selections=dss,
        )

        return ArchAgentChatResponse(response=response, history=updated_history)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Agent error: {str(e)}")


def main():
    """Main function to run the web application."""
    import uvicorn
    
    parser = argparse.ArgumentParser(
        description="CodeWiki Web Application - Generate documentation for GitHub repositories"
    )
    parser.add_argument(
        "--host",
        type=str,
        default=WebAppConfig.DEFAULT_HOST,
        help=f"Host to bind the server to (default: {WebAppConfig.DEFAULT_HOST})"
    )
    parser.add_argument(
        "--port",
        type=int,
        default=WebAppConfig.DEFAULT_PORT,
        help=f"Port to run the server on (default: {WebAppConfig.DEFAULT_PORT})"
    )
    parser.add_argument(
        "--debug",
        action="store_true",
        help="Run the server in debug mode"
    )
    parser.add_argument(
        "--reload",
        action="store_true",
        help="Enable auto-reload for development"
    )
    
    args = parser.parse_args()
    
    # Ensure required directories exist
    WebAppConfig.ensure_directories()

    print("🚀 CodeWiki Web Application starting…")
    print(f"📁 Cache directory: {WebAppConfig.get_absolute_path(WebAppConfig.CACHE_DIR)}")
    print(f"🗂️  Temp directory: {WebAppConfig.get_absolute_path(WebAppConfig.TEMP_DIR)}")
    print(
        f"🌐 Binding http://{args.host}:{args.port} — "
        "if you see 'address already in use', stop the other process or run with "
        f"`--port` (e.g. `python -m codewiki.run_web_app --port 8001`)."
    )
    print("Press Ctrl+C to stop the server\n")

    try:
        uvicorn.run(
            "codewiki.src.fe.web_app:app",
            host=args.host,
            port=args.port,
            reload=args.reload,
            log_level="debug" if args.debug else "info"
        )
    except KeyboardInterrupt:
        print("\n👋 Server stopped")


if __name__ == "__main__":
    main()