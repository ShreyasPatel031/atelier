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
from fastapi import FastAPI, Request, Form
from fastapi.responses import HTMLResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List, Any

from .cache_manager import CacheManager
from .background_worker import BackgroundWorker
from .routes import WebRoutes
from .config import WebAppConfig


# Initialize FastAPI app
app = FastAPI(
    title="CodeWiki", 
    description="Generate comprehensive documentation for any GitHub repository"
)

# CORS for demo viewer on port 8080 calling API on 8001
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8080", "http://127.0.0.1:8080", "http://localhost:8001", "http://127.0.0.1:8001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize components
cache_manager = CacheManager(
    cache_dir=WebAppConfig.CACHE_DIR, 
    cache_expiry_days=WebAppConfig.CACHE_EXPIRY_DAYS
)
background_worker = BackgroundWorker(
    cache_manager=cache_manager, 
    temp_dir=WebAppConfig.TEMP_DIR
)
web_routes = WebRoutes(background_worker=background_worker, cache_manager=cache_manager)


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


# Chat API models
class ArchAgentChatRequest(BaseModel):
    job_id: str
    message: str
    current_module: Optional[str] = None
    current_page: Optional[str] = None
    opened_modules: Optional[List[str]] = None
    # Message history from previous turns (returned as `history` in response). Send it back on the next request for multi-turn conversation.
    history: Optional[List[Any]] = None


class ArchAgentChatResponse(BaseModel):
    response: str
    # Full conversation history after this turn. Store and send as `history` in the next request.
    history: Optional[List[Any]] = None


@app.post("/api/arch-agent/chat", response_model=ArchAgentChatResponse)
async def arch_agent_chat(request: ArchAgentChatRequest) -> ArchAgentChatResponse:
    """Chat endpoint for the architectural agent."""
    from pathlib import Path
    from codewiki.src.be.architectural_agent import ArchitecturalAgentRunner
    
    # Try to find docs directory for the job_id
    # 1. Check demo repos first (for demo viewer)
    demo_docs_path = Path(__file__).resolve().parent.parent.parent.parent / "demo" / "repos" / request.job_id
    if demo_docs_path.exists() and (demo_docs_path / "module_tree.json").exists():
        docs_path = demo_docs_path
    else:
        # 2. Try output/cache (for generated jobs)
        cache_docs_path = Path(WebAppConfig.get_absolute_path(WebAppConfig.CACHE_DIR)) / request.job_id
        if cache_docs_path.exists() and (cache_docs_path / "module_tree.json").exists():
            docs_path = cache_docs_path
        else:
            # 3. Try demo repos (for demo viewer: job_id = repo name like "flask", "KubeElasti")
            raise HTTPException(status_code=404, detail=f"Documentation not found for job_id: {request.job_id}")
    
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
    
    # Start background worker
    background_worker.start()
    
    print(f"🚀 CodeWiki Web Application starting...")
    print(f"🌐 Server running at: http://{args.host}:{args.port}")
    print(f"📁 Cache directory: {WebAppConfig.get_absolute_path(WebAppConfig.CACHE_DIR)}")
    print(f"🗂️  Temp directory: {WebAppConfig.get_absolute_path(WebAppConfig.TEMP_DIR)}")
    print("\nPress Ctrl+C to stop the server")
    
    try:
        uvicorn.run(
            "fe.web_app:app",
            host=args.host,
            port=args.port,
            reload=args.reload,
            log_level="debug" if args.debug else "info"
        )
    except KeyboardInterrupt:
        print("\n👋 Server stopped")
        background_worker.stop()


if __name__ == "__main__":
    main()