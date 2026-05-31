"""
Configuration management with environment variable support and validation.
"""
from __future__ import annotations
import os
import json
import logging
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)

DEFAULT_CONFIG_PATH = Path.home() / ".minipipe" / "config.json"

DEFAULTS: Dict[str, Any] = {
    "batch_size": 50,
    "max_retries": 3,
    "timeout_seconds": 30,
    "log_level": "INFO",
    "max_workers": 4,
    "queue_capacity": 1000,
    "flush_interval_seconds": 5,
    "enable_metrics": True,
}


@dataclass
class RetryConfig:
    max_attempts: int = 3
    base_delay_seconds: float = 1.0
    max_delay_seconds: float = 30.0
    exponential_base: float = 2.0

    def delay_for_attempt(self, attempt: int) -> float:
        delay = self.base_delay_seconds * (self.exponential_base ** attempt)
        return min(delay, self.max_delay_seconds)


@dataclass
class ConnectionConfig:
    host: str = "localhost"
    port: int = 8080
    use_tls: bool = False
    connect_timeout: float = 5.0
    read_timeout: float = 30.0

    @property
    def base_url(self) -> str:
        scheme = "https" if self.use_tls else "http"
        return f"{scheme}://{self.host}:{self.port}"


@dataclass
class Config:
    batch_size: int = DEFAULTS["batch_size"]
    max_retries: int = DEFAULTS["max_retries"]
    timeout_seconds: float = DEFAULTS["timeout_seconds"]
    log_level: str = DEFAULTS["log_level"]
    max_workers: int = DEFAULTS["max_workers"]
    queue_capacity: int = DEFAULTS["queue_capacity"]
    flush_interval_seconds: float = DEFAULTS["flush_interval_seconds"]
    enable_metrics: bool = DEFAULTS["enable_metrics"]
    connection: ConnectionConfig = field(default_factory=ConnectionConfig)
    retry: RetryConfig = field(default_factory=RetryConfig)
    extra: Dict[str, Any] = field(default_factory=dict)

    @classmethod
    def from_env(cls) -> Config:
        cfg = cls()
        cfg.batch_size = int(os.getenv("MINI_BATCH_SIZE", cfg.batch_size))
        cfg.max_workers = int(os.getenv("MINI_MAX_WORKERS", cfg.max_workers))
        cfg.timeout_seconds = float(os.getenv("MINI_TIMEOUT", cfg.timeout_seconds))
        cfg.log_level = os.getenv("MINI_LOG_LEVEL", cfg.log_level)
        level = getattr(logging, cfg.log_level.upper(), logging.INFO)
        logging.basicConfig(level=level)
        return cfg

    @classmethod
    def from_file(cls, path: Path = DEFAULT_CONFIG_PATH) -> Config:
        if not path.exists():
            logger.warning("Config file not found at %s, using defaults", path)
            return cls.from_env()
        try:
            data = json.loads(path.read_text())
            cfg = cls.from_env()
            for key, val in data.items():
                if hasattr(cfg, key):
                    setattr(cfg, key, val)
                else:
                    cfg.extra[key] = val
            return cfg
        except (json.JSONDecodeError, OSError) as exc:
            logger.error("Failed to load config from %s: %s", path, exc)
            return cls.from_env()

    def validate(self) -> List[str]:
        errors: List[str] = []
        if self.batch_size <= 0:
            errors.append(f"batch_size must be positive, got {self.batch_size}")
        if self.max_workers <= 0:
            errors.append(f"max_workers must be positive, got {self.max_workers}")
        if self.timeout_seconds <= 0:
            errors.append(f"timeout_seconds must be positive, got {self.timeout_seconds}")
        return errors
