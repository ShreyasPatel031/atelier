#!/usr/bin/env python3
"""Persistent chat API server for the Atelier MCP viewer stack."""
from __future__ import annotations

import json
import os
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from codewiki.mcp.static_server import make_static_server  # noqa: E402

CACHE = Path.home() / ".cache" / "atelier-mcp"
RUNTIME = CACHE / "chat-runtime.json"


def main() -> None:
    port = int(os.environ["ATELIER_CHAT_PORT"])
    demo_root = Path(os.environ.get("ATELIER_DEMO_ROOT", ROOT / "demo"))
    server = make_static_server(demo_root, port)
    server.ensure_running()

    CACHE.mkdir(parents=True, exist_ok=True)
    RUNTIME.write_text(
        json.dumps({"port": server.port, "pid": os.getpid()}),
        encoding="utf-8",
    )
    print(f"[atelier-chat] ready http://127.0.0.1:{server.port}", flush=True)

    try:
        while True:
            time.sleep(3600)
    finally:
        try:
            RUNTIME.unlink(missing_ok=True)
        except OSError:
            pass


if __name__ == "__main__":
    main()
