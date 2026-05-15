"""
codewiki.mcp — Minimal stdio MCP server that lets an LLM emit Diagram IR for a
repo and renders it via the existing ReactFlow viewer in ``demo/``.

Tools:
    apply_repo_bundle, get_diagram, patch_diagram, open_viewer

Run with::

    python -m codewiki.mcp
"""

from codewiki.mcp.server import build_server, main

__all__ = ["build_server", "main"]
