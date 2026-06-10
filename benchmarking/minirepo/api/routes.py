"""HTTP route registration."""
from __future__ import annotations
from typing import Any, Callable, Dict, List, Tuple

RouteHandler = Callable[[Dict[str, Any]], Dict[str, Any]]


def register_routes(app: Any) -> None:
    """Register default REST routes on the app."""
    app.add_route("GET", "/health", health_handler)
    app.add_route("GET", "/records", list_records_handler)
    app.add_route("POST", "/records", create_record_handler)


def health_handler(_params: Dict[str, Any]) -> Dict[str, Any]:
    return {"status": "ok"}


def list_records_handler(params: Dict[str, Any]) -> Dict[str, Any]:
    limit = int(params.get("limit", 10))
    return {"records": [], "limit": limit}


def create_record_handler(params: Dict[str, Any]) -> Dict[str, Any]:
    record_id = params.get("id", "unknown")
    return {"created": True, "id": record_id}
