#!/usr/bin/env python3
"""
CodeWiki Frontend Module

Web interface components for the documentation generation service.

``app`` and ``main`` are loaded lazily so importing submodules
does not import the full FastAPI stack or trigger import-time side effects.
"""

from __future__ import annotations

from typing import Any

from .models import JobStatus, JobStatusResponse, RepositorySubmission, CacheEntry
from .cache_manager import CacheManager
from .background_worker import BackgroundWorker
from .github_processor import GitHubRepoProcessor
from .routes import WebRoutes

__all__ = [
    "app",
    "main",
    "JobStatus",
    "JobStatusResponse",
    "RepositorySubmission",
    "CacheEntry",
    "CacheManager",
    "BackgroundWorker",
    "GitHubRepoProcessor",
    "WebRoutes",
]


def __getattr__(name: str) -> Any:
    if name == "app":
        from .web_app import app as _app

        return _app
    if name == "main":
        from .web_app import main as _main

        return _main
    raise AttributeError(f"module {__name__!r} has no attribute {name!r}")
