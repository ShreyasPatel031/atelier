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
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request, Form, HTTPException
from fastapi.responses import HTMLResponse, FileResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List, Any

from .cache_manager import CacheManager
from .background_worker import BackgroundWorker
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

# CORS: static demo on 8080; web app on 8000/8001
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:8080",
        "http://127.0.0.1:8080",
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
async def index_post(request: Request, repo_url: str = Form(...), commit_id: str = Form("")):
    """Handle repository submission."""
    return await web_routes.index_post(request, repo_url, commit_id)


@app.get("/api/job/{job_id}")
async def get_job_status(job_id: str):
    """API endpoint to get job status."""
    return await web_routes.get_job_status(job_id)


@app.get("/api/jobs")
async def list_jobs():
    """All tracked jobs (for E2E: wait until worker has no queued/processing work)."""
    return await web_routes.list_jobs()


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
class ArchitectureGroupSelection(BaseModel):
    """Optional focus for the architectural agent: a diagram subgraph / group, or omit for none."""

    id: str
    label: str
    module_ids: Optional[List[str]] = None


class ArchAgentChatRequest(BaseModel):
    job_id: str
    message: str
    current_module: Optional[str] = None
    current_page: Optional[str] = None
    opened_modules: Optional[List[str]] = None
    # When set, the agent prioritizes this overview diagram group (subgraph).
    architecture_group: Optional[ArchitectureGroupSelection] = None
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
        
        response, updated_history = await agent_runner.chat(
            message=request.message,
            current_module=request.current_module,
            current_page=request.current_page,
            opened_modules=opened_modules,
            message_history=request.history,
            architecture_group=request.architecture_group.model_dump() if request.architecture_group else None,
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

    print(f"🚀 CodeWiki Web Application starting...")
    print(f"🌐 Server running at: http://{args.host}:{args.port}")
    print(f"📁 Cache directory: {WebAppConfig.get_absolute_path(WebAppConfig.CACHE_DIR)}")
    print(f"🗂️  Temp directory: {WebAppConfig.get_absolute_path(WebAppConfig.TEMP_DIR)}")
    print("\nPress Ctrl+C to stop the server")
    
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