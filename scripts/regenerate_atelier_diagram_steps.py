#!/usr/bin/env python3
"""
Drive codewiki MCP through incremental diagram updates with pauses so the
browser viewer (polling viewer_epoch.json) can show each step.

Usage (from repo root):
  .venv/bin/python scripts/regenerate_atelier_diagram_steps.py --clear
  .venv/bin/python scripts/regenerate_atelier_diagram_steps.py --clear --pause 2
  .venv/bin/python scripts/regenerate_atelier_diagram_steps.py --from-step 3 --to-step 5

Requires: mcp package, same env as ``python -m codewiki.mcp``.
"""
from __future__ import annotations

import argparse
import asyncio
import json
import os
import sys
from pathlib import Path

from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client

ROOT = Path(__file__).resolve().parents[1]
REPO_ID = "atelier-tdc8"
DEFAULT_PAUSE_SEC = 3.0


def params() -> StdioServerParameters:
    return StdioServerParameters(
        command=str(ROOT / "scripts" / "run_codewiki_mcp.sh"),
        args=[],
        cwd=str(ROOT),
        env={**os.environ, "CODEWIKI_MCP_PORT": os.environ.get("CODEWIKI_MCP_PORT", "18765")},
    )


async def call(
    session: ClientSession,
    name: str,
    arguments: dict,
    step: str,
    pause_sec: float,
) -> None:
    print(f"\n=== Step: {step} ===", flush=True)
    r = await session.call_tool(name, arguments)
    text = ""
    for c in r.content:
        if getattr(c, "type", None) == "text":
            text = c.text
            break
    if text:
        print(text, flush=True)
    else:
        print(r.structuredContent or r, flush=True)
    if pause_sec > 0:
        print(f"(pause {pause_sec}s — check viewer)\n", flush=True)
        await asyncio.sleep(pause_sec)
    else:
        print("(no pause)\n", flush=True)


def diagram_steps() -> list[tuple[str, dict, str]]:
    """Ordered MCP calls: (tool_name, arguments, human label)."""
    return [
        (
            "set_overview",
            {
                "repo_id": REPO_ID,
                "title": "[Step 1/7] Core only",
                "description": "Two-node overview: CLI → Backend.",
                "diagram": {
                    "direction": "LR",
                    "nodes": [
                        {
                            "id": "cli",
                            "label": "CLI",
                            "type": "module",
                            "link": "cli.md",
                        },
                        {
                            "id": "backend",
                            "label": "Backend",
                            "type": "module",
                            "link": "backend.md",
                        },
                    ],
                    "edges": [{"source": "cli", "target": "backend", "label": "generate"}],
                    "groups": [],
                },
            },
            "1 — Overview: CLI + Backend only",
        ),
        (
            "set_overview",
            {
                "repo_id": REPO_ID,
                "title": "[Step 2/7] + FE + Demo",
                "description": "Add FastAPI frontend and demo viewer; edges for jobs and doc IR.",
                "diagram": {
                    "direction": "LR",
                    "nodes": [
                        {
                            "id": "cli",
                            "label": "CLI",
                            "type": "module",
                            "link": "cli.md",
                        },
                        {
                            "id": "backend",
                            "label": "Backend",
                            "type": "module",
                            "link": "backend.md",
                        },
                        {
                            "id": "frontend",
                            "label": "FastAPI",
                            "type": "module",
                            "link": "frontend.md",
                        },
                        {
                            "id": "demo",
                            "label": "Demo viewer",
                            "type": "module",
                            "link": "demo.md",
                        },
                    ],
                    "edges": [
                        {"source": "cli", "target": "backend", "label": "generate"},
                        {"source": "frontend", "target": "backend", "label": "jobs"},
                        {"source": "backend", "target": "demo", "label": "IR"},
                    ],
                    "groups": [],
                },
            },
            "2 — Overview: add Frontend + Demo",
        ),
        (
            "set_overview",
            {
                "repo_id": REPO_ID,
                "title": "[Step 3/7] + MCP + groups",
                "description": "Add MCP → demo, templates, and grouped regions.",
                "diagram": {
                    "direction": "LR",
                    "nodes": [
                        {
                            "id": "cli",
                            "label": "CLI",
                            "type": "module",
                            "link": "cli.md",
                        },
                        {
                            "id": "backend",
                            "label": "Backend",
                            "type": "module",
                            "link": "backend.md",
                        },
                        {
                            "id": "frontend",
                            "label": "FastAPI",
                            "type": "module",
                            "link": "frontend.md",
                        },
                        {
                            "id": "templates",
                            "label": "Templates",
                            "type": "module",
                            "link": "templates.md",
                        },
                        {
                            "id": "mcp",
                            "label": "MCP",
                            "type": "module",
                            "link": "mcp.md",
                        },
                        {
                            "id": "demo",
                            "label": "Demo viewer",
                            "type": "module",
                            "link": "demo.md",
                        },
                    ],
                    "edges": [
                        {"source": "cli", "target": "backend", "label": "generate"},
                        {"source": "frontend", "target": "backend", "label": "jobs"},
                        {"source": "backend", "target": "templates", "label": "render"},
                        {"source": "backend", "target": "demo", "label": "IR"},
                        {"source": "mcp", "target": "demo", "label": "repos/"},
                    ],
                    "groups": [
                        {
                            "id": "g_py",
                            "label": "Python package",
                            "nodes": ["cli", "backend", "frontend", "templates", "mcp"],
                        },
                        {"id": "g_ui", "label": "Viewer", "nodes": ["demo"]},
                    ],
                },
            },
            "3 — Overview: MCP, templates, subgraphs",
        ),
        (
            "set_module_tree",
            {
                "repo_id": REPO_ID,
                "tree": {
                    "backend": {
                        "path": "codewiki/src/be",
                        "title": "Backend",
                        "description": "[Step 4] Backend only in tree — expand this node in RF.",
                        "components": ["documentation_generator.py"],
                        "diagram": {
                            "direction": "LR",
                            "nodes": [
                                {"id": "agent", "label": "agent"},
                                {"id": "docs", "label": "doc_gen"},
                            ],
                            "edges": [{"source": "agent", "target": "docs"}],
                            "groups": [],
                        },
                        "children": {},
                    },
                },
            },
            "4 — module_tree: backend only (minimal subgraph)",
        ),
        (
            "set_module_tree",
            {
                "repo_id": REPO_ID,
                "tree": {
                    "backend": {
                        "path": "codewiki/src/be",
                        "title": "Backend",
                        "description": "[Step 5] Full backend subgraph.",
                        "components": [
                            "documentation_generator.py",
                            "dependency_analyzer/",
                        ],
                        "diagram": {
                            "direction": "LR",
                            "nodes": [
                                {"id": "agent", "label": "architectural_agent"},
                                {"id": "cluster", "label": "cluster_modules"},
                                {"id": "deps", "label": "dependency_analyzer"},
                                {"id": "docs", "label": "documentation_generator"},
                            ],
                            "edges": [
                                {"source": "agent", "target": "docs"},
                                {"source": "cluster", "target": "docs"},
                                {"source": "deps", "target": "docs"},
                            ],
                            "groups": [],
                        },
                        "children": {},
                    },
                    "cli": {
                        "path": "codewiki/cli",
                        "title": "CLI",
                        "description": "[Step 5] CLI added.",
                        "components": ["main.py"],
                        "diagram": {
                            "direction": "LR",
                            "nodes": [
                                {"id": "gen", "label": "generate"},
                                {"id": "main", "label": "main"},
                            ],
                            "edges": [{"source": "gen", "target": "main"}],
                            "groups": [],
                        },
                        "children": {},
                    },
                },
            },
            "5 — module_tree: backend full IR + CLI",
        ),
        (
            "set_module_tree",
            {
                "repo_id": REPO_ID,
                "tree": {
                    "cli": {
                        "path": "codewiki/cli",
                        "title": "CLI",
                        "description": "Commands and HTML export.",
                        "components": ["main.py", "commands/"],
                        "diagram": {
                            "direction": "LR",
                            "nodes": [
                                {"id": "gen", "label": "generate"},
                                {"id": "cfg", "label": "config"},
                                {"id": "main", "label": "main"},
                            ],
                            "edges": [
                                {"source": "gen", "target": "main"},
                                {"source": "cfg", "target": "main"},
                            ],
                            "groups": [],
                        },
                        "children": {},
                    },
                    "backend": {
                        "path": "codewiki/src/be",
                        "title": "Backend",
                        "description": "Pipeline + analyzer.",
                        "components": ["documentation_generator.py", "dependency_analyzer/"],
                        "diagram": {
                            "direction": "LR",
                            "nodes": [
                                {"id": "agent", "label": "architectural_agent"},
                                {"id": "cluster", "label": "cluster_modules"},
                                {"id": "deps", "label": "dependency_analyzer"},
                                {"id": "docs", "label": "documentation_generator"},
                            ],
                            "edges": [
                                {"source": "agent", "target": "docs"},
                                {"source": "cluster", "target": "docs"},
                                {"source": "deps", "target": "docs"},
                            ],
                            "groups": [],
                        },
                        "children": {},
                    },
                    "frontend": {
                        "path": "codewiki/src/fe",
                        "title": "FastAPI",
                        "description": "Web app surface.",
                        "components": ["web_app.py", "routes.py"],
                        "diagram": {
                            "direction": "LR",
                            "nodes": [
                                {"id": "app", "label": "web_app"},
                                {"id": "routes", "label": "routes"},
                            ],
                            "edges": [{"source": "app", "target": "routes"}],
                            "groups": [],
                        },
                        "children": {},
                    },
                    "mcp": {
                        "path": "codewiki/mcp",
                        "title": "MCP",
                        "description": "Cursor integration.",
                        "components": ["server.py"],
                        "diagram": {
                            "direction": "LR",
                            "nodes": [
                                {"id": "srv", "label": "server"},
                                {"id": "st", "label": "static_server"},
                            ],
                            "edges": [{"source": "srv", "target": "st"}],
                            "groups": [],
                        },
                        "children": {},
                    },
                    "demo": {
                        "path": "demo",
                        "title": "Demo",
                        "description": "Static viewer.",
                        "components": ["index.html"],
                        "diagram": {
                            "direction": "LR",
                            "nodes": [
                                {"id": "html", "label": "index.html"},
                                {"id": "rf", "label": "reactflow"},
                            ],
                            "edges": [{"source": "html", "target": "rf"}],
                            "groups": [],
                        },
                        "children": {},
                    },
                },
            },
            "6 — module_tree: cli, backend, frontend, mcp, demo",
        ),
        (
            "set_overview",
            {
                "repo_id": REPO_ID,
                "title": "[Step 7/7] Full overview track",
                "description": "Final overview matching the module_tree track; tests and pyproject share one QA & Ops group.",
                "diagram": {
                    "direction": "LR",
                    "nodes": [
                        {
                            "id": "cli",
                            "label": "CLI",
                            "type": "module",
                            "link": "cli.md",
                        },
                        {
                            "id": "backend",
                            "label": "Backend",
                            "type": "module",
                            "link": "backend.md",
                        },
                        {
                            "id": "frontend",
                            "label": "FastAPI",
                            "type": "module",
                            "link": "frontend.md",
                        },
                        {
                            "id": "templates",
                            "label": "Templates",
                            "type": "module",
                            "link": "templates.md",
                        },
                        {
                            "id": "mcp",
                            "label": "MCP",
                            "type": "module",
                            "link": "mcp.md",
                        },
                        {
                            "id": "demo",
                            "label": "Demo",
                            "type": "module",
                            "link": "demo.md",
                        },
                        {
                            "id": "api_vercel",
                            "label": "Vercel /api",
                            "type": "module",
                            "link": "api_vercel.md",
                        },
                        {
                            "id": "tests",
                            "label": "tests",
                            "type": "module",
                            "link": "tests.md",
                        },
                        {
                            "id": "pkg",
                            "label": "pyproject",
                            "type": "external",
                        },
                    ],
                    "edges": [
                        {"source": "cli", "target": "backend"},
                        {"source": "frontend", "target": "backend"},
                        {"source": "backend", "target": "templates"},
                        {"source": "backend", "target": "demo"},
                        {"source": "mcp", "target": "demo"},
                        {"source": "api_vercel", "target": "demo"},
                        {"source": "api_vercel", "target": "backend"},
                        {"source": "tests", "target": "backend"},
                        {"source": "pkg", "target": "cli"},
                    ],
                    "groups": [
                        {
                            "id": "g_py",
                            "label": "Package",
                            "nodes": ["cli", "backend", "frontend", "templates", "mcp"],
                        },
                        {
                            "id": "g_ui",
                            "label": "Viewer/API",
                            "nodes": ["demo", "api_vercel"],
                        },
                        {
                            "id": "g_qa_ops",
                            "label": "QA & Ops",
                            "nodes": ["tests", "pkg"],
                        },
                    ],
                },
            },
            "7 — Overview: full track + QA/Ops group",
        ),
    ]


# Minimal drill-down pages for overview node links (clear_repo removes prior *.md).
def stub_module_doc_calls() -> list[tuple[str, dict, str]]:
    stubs: list[tuple[str, str, str]] = [
        ("cli", "CLI", "Codewiki CLI entrypoints and commands."),
        ("backend", "Backend", "Documentation generator and dependency analysis."),
        ("frontend", "FastAPI", "Web UI for jobs and assets."),
        ("templates", "Templates", "HTML / prompt templates for output."),
        ("mcp", "MCP", "Cursor MCP server and demo static hosting."),
        ("demo", "Demo viewer", "React Flow viewer and repo samples."),
        ("api_vercel", "Vercel /api", "Serverless API routes for the demo."),
        ("tests", "Tests", "Pytest and Playwright coverage."),
        ("scripts", "Scripts", "Repo maintenance and MCP helper scripts."),
        ("docker", "Docker", "Container images for runs."),
        ("benchmarking", "Benchmarking", "Performance harnesses."),
    ]
    out: list[tuple[str, dict, str]] = []
    for module_id, title, description in stubs:
        out.append(
            (
                "set_module_doc",
                {
                    "repo_id": REPO_ID,
                    "module_id": module_id,
                    "title": title,
                    "description": description,
                    "body_md": "",
                },
                f"stub — {module_id}.md",
            )
        )
    return out


async def run(args: argparse.Namespace) -> None:
    steps = diagram_steps()
    lo, hi = args.from_step, args.to_step
    if lo < 1 or hi > len(steps) or lo > hi:
        print(f"--from-step/--to-step must satisfy 1 <= from <= to <= {len(steps)}", file=sys.stderr)
        raise SystemExit(2)

    async with stdio_client(params()) as (read, write):
        async with ClientSession(read, write) as session:
            await session.initialize()

            if args.clear:
                await call(
                    session,
                    "clear_repo",
                    {"repo_id": REPO_ID},
                    "0 — Clear demo/repos/atelier-tdc8 (fresh)",
                    pause_sec=0.0,
                )

            for i in range(lo - 1, hi):
                tool, arguments, label = steps[i]
                await call(session, tool, arguments, label, pause_sec=args.pause)

            if args.stub_docs and hi >= len(steps):
                for tool, arguments, label in stub_module_doc_calls():
                    await call(session, tool, arguments, label, pause_sec=0.0)

            if args.open_viewer:
                await call(
                    session,
                    "open_viewer",
                    {"repo_id": REPO_ID},
                    "Done — open_viewer URL",
                    pause_sec=0.0,
                )

    print("Finished.", flush=True)


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Regenerate atelier-tdc8 demo diagrams via MCP (stepwise).")
    p.add_argument(
        "--clear",
        action="store_true",
        help="Delete demo/repos/atelier-tdc8 and remove index entry before steps.",
    )
    p.add_argument(
        "--pause",
        type=float,
        default=DEFAULT_PAUSE_SEC,
        metavar="SEC",
        help=f"Seconds between diagram steps (default {DEFAULT_PAUSE_SEC}). Use 0 for no pause.",
    )
    p.add_argument("--from-step", type=int, default=1, metavar="N", help="First step number (1–7).")
    p.add_argument("--to-step", type=int, default=7, metavar="N", help="Last step number (1–7).")
    p.add_argument(
        "--no-open-viewer",
        action="store_true",
        help="Skip open_viewer at the end.",
    )
    p.add_argument(
        "--no-stub-docs",
        action="store_false",
        dest="stub_docs",
        help="Skip stub *.md pages after step 7 (default writes stubs so overview links load).",
    )
    p.set_defaults(stub_docs=True)
    ns = p.parse_args(argv)
    ns.open_viewer = not ns.no_open_viewer
    return ns


def main() -> None:
    asyncio.run(run(parse_args()))


if __name__ == "__main__":
    main()
