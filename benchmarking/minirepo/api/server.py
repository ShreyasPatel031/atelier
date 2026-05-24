"""Minimal HTTP server stub."""
from __future__ import annotations
import json
import logging
from typing import Any, Callable, Dict, List, Optional, Tuple

from core.config import Config
from api.routes import register_routes

logger = logging.getLogger(__name__)

Route = Tuple[str, str, Callable[[Dict[str, Any]], Dict[str, Any]]]


class AppServer:
    def __init__(self, config: Config):
        self.config = config
        self._routes: List[Route] = []
        register_routes(self)

    def add_route(self, method: str, path: str, handler: Callable) -> None:
        self._routes.append((method.upper(), path, handler))

    def handle(self, method: str, path: str, params: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        params = params or {}
        for route_method, route_path, handler in self._routes:
            if route_method == method.upper() and route_path == path:
                return handler(params)
        return {"error": "not_found", "path": path}

    def start(self) -> None:
        logger.info("Starting server on %s", self.config.connection.base_url)

    def stop(self) -> None:
        logger.info("Server stopped")
