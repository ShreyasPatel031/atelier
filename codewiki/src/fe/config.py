#!/usr/bin/env python3
"""
Configuration settings for the CodeWiki web application.
"""

import os
from pathlib import Path

from dotenv import load_dotenv

# `fe/config.py` -> repo root is four levels up. Web app imports this before LLM code runs,
# so GEMINI_API_KEY in `<repo>/.env` is always applied (stale shell exports get overridden).
_FE_DIR = Path(__file__).resolve().parent
_REPO_ROOT = _FE_DIR.parent.parent.parent
load_dotenv(_REPO_ROOT / ".env", override=True)
load_dotenv()


class WebAppConfig:
    """Configuration class for web application settings.

    Documentation jobs run ``codewiki generate`` in a subprocess. On each host,
    run once: ``codewiki config set --base-url ... --main-model ...
    --cluster-model ...`` so ``~/.codewiki/config.json`` exists (API key may
    still come from ``GEMINI_API_KEY`` / ``LLM_API_KEY``). See
    ``codewiki.src.fe.background_worker`` module docstring.
    """

    # Directories
    CACHE_DIR = "./output/cache"
    TEMP_DIR = "./output/temp"
    OUTPUT_DIR = "./output"
    
    # Queue settings
    QUEUE_SIZE = 100
    
    # Cache settings
    CACHE_EXPIRY_DAYS = 365
    
    # Job cleanup settings
    JOB_CLEANUP_HOURS = 24000
    RETRY_COOLDOWN_MINUTES = 3
    
    # Server settings
    DEFAULT_HOST = "127.0.0.1"
    DEFAULT_PORT = 8000
    
    # Git settings (clone uses subprocess timeout; large repos need higher than 300s)
    CLONE_TIMEOUT = int(os.environ.get("CODEWIKI_CLONE_TIMEOUT", "300"))
    CLONE_DEPTH = int(os.environ.get("CODEWIKI_CLONE_DEPTH", "1"))
    # If false (default), keep ./output/temp/<job_id> after success so "Regenerate" can git fetch instead of cloning.
    DELETE_TEMP_REPO_AFTER_SUCCESS = os.environ.get(
        "CODEWIKI_DELETE_TEMP_REPO_AFTER_SUCCESS", ""
    ).lower() in ("1", "true", "yes")
    
    @classmethod
    def ensure_directories(cls):
        """Ensure all required directories exist."""
        directories = [
            cls.CACHE_DIR,
            cls.TEMP_DIR,
            cls.OUTPUT_DIR
        ]
        
        for directory in directories:
            Path(directory).mkdir(parents=True, exist_ok=True)
    
    @classmethod
    def get_absolute_path(cls, path: str) -> str:
        """Get absolute path for a given relative path."""
        return os.path.abspath(path)