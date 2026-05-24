#!/usr/bin/env python3
"""Entry: exercise API server routes."""
from core.config import Config
from api.server import AppServer


def run_api() -> int:
    cfg = Config.from_env()
    server = AppServer(cfg)
    health = server.handle("GET", "/health", {})
    records = server.handle("GET", "/records", {"limit": "5"})
    return 0 if health.get("status") == "ok" and "records" in records else 1


if __name__ == "__main__":
    raise SystemExit(run_api())
