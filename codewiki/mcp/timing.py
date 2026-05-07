"""
Sub-millisecond timing instrumentation for the codewiki MCP.

Every tool handler, cache operation, file I/O, and patch operation should be
wrapped so we can see exactly where time is spent and optimize it.

Output goes to stderr as one JSON line per event (MCP stdio transport reserves
stdout). Capture with ``2>/tmp/codewiki-mcp-perf.jsonl`` for offline analysis.

Usage:
    @timed("set_overview", phase="tool_call")
    def set_overview(...):
        with span("file_write", repo=repo_id):
            ...

    timing_summary() -> {phase: {count, total_ms, p50, p99}}
"""

from __future__ import annotations

import functools
import json
import os
import sys
import threading
import time
from contextlib import contextmanager
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Callable, Iterator, Optional, TypeVar

F = TypeVar("F", bound=Callable[..., Any])


# Disable logging entirely with CODEWIKI_PERF_LOG=0; route to file with =/path/file.jsonl
_PERF_LOG_TARGET = os.environ.get("CODEWIKI_PERF_LOG", "stderr")


@dataclass
class _Sample:
    count: int = 0
    total_ms: float = 0.0
    samples: list[float] = field(default_factory=list)  # capped (see _MAX_SAMPLES)


_MAX_SAMPLES = 1000
_samples: dict[str, _Sample] = {}
_samples_lock = threading.Lock()


def _emit(event: dict[str, Any]) -> None:
    """Write one JSON-line event. Cheap; no allocation outside json.dumps."""
    if _PERF_LOG_TARGET == "0" or _PERF_LOG_TARGET == "":
        return
    line = json.dumps(event, separators=(",", ":"))
    if _PERF_LOG_TARGET == "stderr":
        print(line, file=sys.stderr, flush=False)
        return
    try:
        with open(_PERF_LOG_TARGET, "a", encoding="utf-8") as fh:
            fh.write(line + "\n")
    except OSError:
        print(line, file=sys.stderr, flush=False)


def _record(phase: str, elapsed_ms: float) -> None:
    with _samples_lock:
        s = _samples.setdefault(phase, _Sample())
        s.count += 1
        s.total_ms += elapsed_ms
        if len(s.samples) < _MAX_SAMPLES:
            s.samples.append(elapsed_ms)


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="microseconds")


@contextmanager
def span(phase: str, **fields: Any) -> Iterator[dict[str, Any]]:
    """Time a code block and emit a single event when it exits.

    The yielded dict is mutable; mutate it to attach metadata discovered
    during execution (e.g. ``ctx['ops']=len(operations)``).
    """
    started_ns = time.perf_counter_ns()
    started_at = _now_iso()
    ctx: dict[str, Any] = dict(fields)
    success = True
    error: Optional[str] = None
    try:
        yield ctx
    except BaseException as exc:  # noqa: BLE001 - we re-raise after logging
        success = False
        error = f"{type(exc).__name__}: {exc}"
        raise
    finally:
        elapsed_ms = (time.perf_counter_ns() - started_ns) / 1_000_000.0
        event: dict[str, Any] = {
            "ts": started_at,
            "phase": phase,
            "elapsed_ms": round(elapsed_ms, 4),
            "success": success,
        }
        if error is not None:
            event["error"] = error
        for k, v in ctx.items():
            if v is not None:
                event[k] = v
        _emit(event)
        _record(phase, elapsed_ms)


def timed(phase: str, **default_fields: Any) -> Callable[[F], F]:
    """Decorator: wrap a function so each call is timed under ``phase``.

    Extra metadata is built from positional/keyword args via ``default_fields``
    (static) or by passing ``__timing_extra__=lambda *a, **k: dict(...)`` as a
    keyword to the decorator (dynamic). Most callers should just rely on inner
    ``span`` calls for richer context.
    """
    extractor = default_fields.pop("__timing_extra__", None)

    def decorator(fn: F) -> F:
        @functools.wraps(fn)
        def wrapper(*args: Any, **kwargs: Any) -> Any:
            extra: dict[str, Any] = dict(default_fields)
            if extractor is not None:
                try:
                    extra.update(extractor(*args, **kwargs) or {})
                except Exception:  # noqa: BLE001 - never let metadata break a tool
                    pass
            with span(phase, **extra) as ctx:
                result = fn(*args, **kwargs)
                # Allow the function to attach more metadata via ctx if we ever
                # pass it as a kwarg; today result-only is fine.
                return result

        return wrapper  # type: ignore[return-value]

    return decorator


def timing_summary() -> dict[str, dict[str, float]]:
    """Return per-phase aggregates: count, total_ms, mean_ms, p50_ms, p99_ms."""
    out: dict[str, dict[str, float]] = {}
    with _samples_lock:
        for phase, s in _samples.items():
            samples = sorted(s.samples)
            n = len(samples)
            mean = s.total_ms / s.count if s.count else 0.0
            p50 = samples[n // 2] if n else 0.0
            p99 = samples[min(n - 1, int(n * 0.99))] if n else 0.0
            out[phase] = {
                "count": s.count,
                "total_ms": round(s.total_ms, 3),
                "mean_ms": round(mean, 3),
                "p50_ms": round(p50, 3),
                "p99_ms": round(p99, 3),
            }
    return out


def reset_timing() -> None:
    with _samples_lock:
        _samples.clear()


__all__ = ["span", "timed", "timing_summary", "reset_timing"]
