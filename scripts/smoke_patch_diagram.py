#!/usr/bin/env python3
"""
End-to-end smoke test for the new MCP mutation tools.

Exercises ``get_diagram`` (inventory + overview) -> ``patch_diagram`` against the
live atelier-tdc8 repo, then reverts the change so re-running this script is
idempotent. Captures server-side per-phase timing logs to
``/tmp/codewiki-mcp-perf.jsonl`` for inspection.

Usage (from repo root):
    .venv/bin/python scripts/smoke_patch_diagram.py
"""
from __future__ import annotations

import asyncio
import json
import os
import sys
import time
from pathlib import Path
from statistics import mean, median

from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client

ROOT = Path(__file__).resolve().parents[1]
REPO_ID = "atelier-tdc8"
PERF_LOG = "/tmp/codewiki-mcp-perf.jsonl"


def server_params() -> StdioServerParameters:
    env = {
        **os.environ,
        "CODEWIKI_MCP_PORT": os.environ.get("CODEWIKI_MCP_PORT", "18765"),
        "CODEWIKI_PERF_LOG": PERF_LOG,
    }
    return StdioServerParameters(
        command=str(ROOT / "scripts" / "run_codewiki_mcp.sh"),
        args=[],
        cwd=str(ROOT),
        env=env,
    )


async def call_tool(session: ClientSession, name: str, args: dict) -> dict:
    started = time.perf_counter()
    result = await session.call_tool(name, args)
    elapsed_ms = (time.perf_counter() - started) * 1000
    text = ""
    for c in result.content:
        if getattr(c, "type", None) == "text":
            text = c.text
            break
    parsed: dict = {}
    if text:
        try:
            parsed = json.loads(text)
        except json.JSONDecodeError:
            parsed = {"_raw": text}
    parsed["_client_elapsed_ms"] = round(elapsed_ms, 3)
    return parsed


async def run() -> None:
    Path(PERF_LOG).write_text("")  # truncate

    print(f"-> connecting MCP via stdio (perf log: {PERF_LOG})")
    async with stdio_client(server_params()) as (read, write):
        async with ClientSession(read, write) as session:
            await session.initialize()

            print("\n[1] get_diagram (inventory)")
            inv = await call_tool(
                session, "get_diagram", {"repo_id": REPO_ID, "target": "__inventory__"}
            )
            print(json.dumps(inv, indent=2))
            assert inv.get("ok"), "get_diagram inventory failed"
            assert inv.get("exists"), f"repo {REPO_ID!r} missing on disk"

            print("\n[2] get_diagram (overview)")
            ov = await call_tool(session, "get_diagram", {"repo_id": REPO_ID, "target": "overview"})
            assert ov.get("ok")
            d = ov["diagram"]
            print(
                f"  current: {len(d['nodes'])} nodes, {len(d['edges'])} edges, "
                f"{len(d['groups'])} groups, direction={d['direction']!r}"
            )
            existing_group_ids = {g["id"] for g in d["groups"]}
            merge_buddy = d["groups"][0]["id"]
            merge_label = d["groups"][0]["label"]

            print(
                f"\n[3] patch_diagram: add temporary 'g_smoke' group + node (merge target will be {merge_buddy!r})"
            )
            patch_args = {
                "repo_id": REPO_ID,
                "target": "overview",
                "operations": [
                    {
                        "op": "add_node",
                        "id": "smoke_marker",
                        "label": "smoke",
                        "type": "external",
                    },
                    {
                        "op": "add_group",
                        "id": "g_smoke",
                        "label": "Smoke",
                        "node_ids": ["smoke_marker"],
                    },
                ],
            }
            patched = await call_tool(session, "patch_diagram", patch_args)
            print(json.dumps(patched, indent=2))
            assert patched.get("ok"), patched

            print(
                f"\n[4] patch_diagram: merge g_smoke into existing group {merge_buddy!r}, then drop the marker node"
            )
            cleanup = {
                "repo_id": REPO_ID,
                "target": "overview",
                "operations": [
                    {
                        "op": "merge_groups",
                        "group_ids": ["g_smoke", merge_buddy],
                        "new_id": merge_buddy,
                        "new_label": merge_label,
                    },
                    {"op": "remove_node", "id": "smoke_marker", "cascade": True},
                ],
            }
            cleaned = await call_tool(session, "patch_diagram", cleanup)
            print(json.dumps(cleaned, indent=2))
            assert cleaned.get("ok"), cleaned

            print("\n[5] verify: counts back to original")
            ov2 = await call_tool(session, "get_diagram", {"repo_id": REPO_ID})
            d2 = ov2["diagram"]
            assert len(d2["nodes"]) == len(d["nodes"]), (
                f"node count drift: {len(d['nodes'])} -> {len(d2['nodes'])}"
            )
            assert {g["id"] for g in d2["groups"]} == existing_group_ids, (
                f"group set drift: {existing_group_ids} vs {[g['id'] for g in d2['groups']]}"
            )
            print(f"  OK: {len(d2['nodes'])} nodes, {len(d2['groups'])} groups (unchanged)")

    print("\n[6] per-phase JSON-line log analysis")
    summarize_perf_log(PERF_LOG)
    print("\nDONE")


def summarize_perf_log(path: str) -> None:
    if not Path(path).exists():
        print(f"  (no log at {path})")
        return
    by_phase: dict[str, list[float]] = {}
    with open(path) as fh:
        for line in fh:
            line = line.strip()
            if not line:
                continue
            try:
                ev = json.loads(line)
            except json.JSONDecodeError:
                continue
            phase = ev.get("phase")
            ms = ev.get("elapsed_ms")
            if phase and isinstance(ms, (int, float)):
                by_phase.setdefault(phase, []).append(float(ms))
    if not by_phase:
        print("  (log empty)")
        return
    rows = sorted(by_phase.items(), key=lambda kv: -sum(kv[1]))
    print(f"  {'phase':<22} {'count':>5} {'mean':>9} {'median':>9} {'p99':>9} {'total':>9}")
    for phase, samples in rows:
        s = sorted(samples)
        n = len(s)
        p99 = s[min(n - 1, int(n * 0.99))]
        print(
            f"  {phase:<22} {n:>5} {mean(s):>8.3f}ms {median(s):>8.3f}ms "
            f"{p99:>8.3f}ms {sum(s):>8.3f}ms"
        )


if __name__ == "__main__":
    try:
        asyncio.run(run())
    except AssertionError as exc:
        print(f"ASSERTION FAILED: {exc}", file=sys.stderr)
        sys.exit(1)
